# Copyright (c) Microsoft Corporation.
# Licensed under the MIT License.

<#
.SYNOPSIS
    Reviews code files using the GPT-5.2 Codex model via the APIM gateway.
.DESCRIPTION
    Reads a review request JSON file containing code content, sends it to the APIM gateway
    using the gpt-5.2-codex model, and writes a structured markdown report of review findings.
.PARAMETER RequestFile
    Path to a JSON file describing the review request. Schema:
    {
      "model": "gpt-5.2-codex",
      "files": [
        { "path": "relative/path/to/file", "content": "<file content>" }
      ],
      "reviewFocus": "correctness, style, security, best practices"
    }
.PARAMETER OutputFile
    Path to write the markdown review report.
.PARAMETER SettingsFile
    Path to VS Code settings with environment variables (default: .vscode/settings.json).
.EXAMPLE
    pwsh -File code-review.ps1 -RequestFile Tests/Results/.review-request.json -OutputFile Tests/Results/code-review-results.md
#>

param(
    [Parameter(Mandatory)]
    [string]$RequestFile,
    [Parameter(Mandatory)]
    [string]$OutputFile,
    [string]$SettingsFile = ".vscode/settings.json"
)

$ErrorActionPreference = "Stop"

Write-Host "`n══════════════════════════════════════════════"
Write-Host "  Code Review Agent (GPT-5.2 Codex)"
Write-Host "══════════════════════════════════════════════"

# --- 1. Load settings ---
Write-Host "`n[1/4] Loading settings from $SettingsFile..." -ForegroundColor Cyan

if (-not (Test-Path $SettingsFile)) {
    Write-Host "       ❌ Settings file not found: $SettingsFile" -ForegroundColor Red
    Write-Host "       Run 'azd up' to generate .vscode/settings.json" -ForegroundColor Yellow
    exit 1
}

$settings = Get-Content $SettingsFile -Raw | ConvertFrom-Json
$envProp = $settings.'rest-client.environmentVariables'.PSObject.Properties | Select-Object -First 1
$vars = $envProp.Value

$gatewayUrl = $vars.apim_gateway_url
$subscriptionKey = $vars.apim_subscription_key

if (-not $gatewayUrl) {
    Write-Host "       ❌ apim_gateway_url not found in settings" -ForegroundColor Red
    exit 1
}

Write-Host "       ✅ Settings loaded (gateway: $gatewayUrl)"

# --- 2. Load review request ---
Write-Host "[2/4] Loading review request from $RequestFile..." -ForegroundColor Cyan

if (-not (Test-Path $RequestFile)) {
    Write-Host "       ❌ Request file not found: $RequestFile" -ForegroundColor Red
    exit 1
}

$request = Get-Content $RequestFile -Raw | ConvertFrom-Json
$model = if ($request.model) { $request.model } else { "gpt-5.2-codex" }
$reviewFocus = if ($request.reviewFocus) { $request.reviewFocus } else { "correctness, style, security, best practices" }
$files = $request.files

Write-Host "       ✅ Request loaded (model: $model, files: $($files.Count))"

# --- 3. Build and send review request to APIM ---
Write-Host "[3/4] Sending code review request to APIM gateway..." -ForegroundColor Cyan

$fileContents = ($files | ForEach-Object {
    "### File: $($_.path)`n`n``````$([System.IO.Path]::GetExtension($_.path).TrimStart('.'))`n$($_.content)`n```````n"
}) -join "`n"

$systemPrompt = @"
You are an expert code reviewer. Review the provided code files and identify issues across these categories:
- Correctness: logic errors, null/undefined handling, type mismatches
- Security: injection risks, hardcoded secrets, insecure patterns
- Style: naming conventions, formatting, readability
- Best Practices: idiomatic patterns, error handling, performance
- Documentation: missing or outdated comments and docstrings

For each issue, provide:
1. Severity: ERROR, WARNING, or SUGGESTION
2. File path and approximate line reference
3. Description of the issue
4. Recommended fix

Format your response as a structured markdown report with sections per file.
"@

$userPrompt = "Please review the following code files with focus on: $reviewFocus`n`n$fileContents"

$requestBody = @{
    model    = $model
    messages = @(
        @{ role = "system"; content = $systemPrompt }
        @{ role = "user"; content = $userPrompt }
    )
    max_tokens  = 4096
    temperature = 0.1
} | ConvertTo-Json -Depth 10

$apiUrl = "$($gatewayUrl.TrimEnd('/'))/openai/deployments/$model/chat/completions?api-version=2024-02-15-preview"

$headers = @{ "Content-Type" = "application/json" }
if ($subscriptionKey) { $headers["api-key"] = $subscriptionKey }

$reviewContent = $null
$responseStatus = 0

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $requestBody -ErrorAction Stop
    $reviewContent = $response.choices[0].message.content
    $responseStatus = 200
    Write-Host "       ✅ Review completed (tokens used: $($response.usage.total_tokens))"
} catch {
    $responseStatus = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    $errorBody = try { $_.Exception.Response.Content.ReadAsStringAsync().Result } catch { $_.Exception.Message }
    Write-Host "       ❌ Review request failed (HTTP $responseStatus)" -ForegroundColor Red
    Write-Host "       Error: $errorBody" -ForegroundColor Red
    exit 1
}

# --- 4. Write review report ---
Write-Host "[4/4] Writing review report to $OutputFile..." -ForegroundColor Cyan

$outputDir = Split-Path $OutputFile -Parent
if ($outputDir -and -not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC"
$fileList = ($files | ForEach-Object { "- ``$($_.path)``" }) -join "`n"

$report = @"
# Code Review Report

**Model:** $model
**Reviewed:** $timestamp
**Files reviewed:**
$fileList

---

$reviewContent

---
*Generated by the Code Review Agent using the $model model via Azure API Management.*
"@

$report | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host "       ✅ Report written"

Write-Host "`n══════════════════════════════════════════════"
Write-Host "  Review report: $OutputFile"
Write-Host "══════════════════════════════════════════════`n"
