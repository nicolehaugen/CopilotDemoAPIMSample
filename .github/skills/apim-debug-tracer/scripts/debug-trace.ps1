# Copyright (c) Microsoft Corporation.
# Licensed under the MIT License.

<#
.SYNOPSIS
    Sends an APIM request with debug tracing enabled and retrieves the full trace.
.DESCRIPTION
    Uses the current Azure CLI login to obtain a management token, retrieves APIM debug
    credentials, sends the user-provided request with tracing enabled, then retrieves
    and outputs the full policy execution trace.
.PARAMETER RequestFile
    Path to a JSON file describing the request to trace. Schema:
    {
      "method": "POST",
      "url": "https://...",
      "headers": { "header-name": "value" },
      "body": "request body string"
    }
.PARAMETER SettingsFile
    Path to VS Code settings with environment variables (default: .vscode/settings.json).
.EXAMPLE
    pwsh -File debug-trace.ps1 -RequestFile Tests/Results/.debug-request.json
#>

param(
    [Parameter(Mandatory)]
    [string]$RequestFile,
    [string]$SettingsFile = ".vscode/settings.json",
    [string]$OutputDir = "Tests/Results"
)

$ErrorActionPreference = "Stop"

# --- 1. Load settings and request ---
$settings = Get-Content $SettingsFile | ConvertFrom-Json
$envProp = $settings.'rest-client.environmentVariables'.PSObject.Properties | Select-Object -First 1
$vars = $envProp.Value
$request = Get-Content $RequestFile -Raw | ConvertFrom-Json

$apimResourceId = $vars.apim_resource_id

Write-Host "`n══════════════════════════════════════════════"
Write-Host "  APIM Debug Tracer"
Write-Host "══════════════════════════════════════════════"

# --- 2. Get Azure management token via az CLI ---
Write-Host "`n[1/4] Getting management token via Azure CLI..." -ForegroundColor Cyan

try {
    $tokenJson = az account get-access-token --resource https://management.azure.com/ 2>&1
    if ($LASTEXITCODE -ne 0) { throw "az CLI failed: $tokenJson" }
    $mgmtToken = ($tokenJson | ConvertFrom-Json).accessToken
    Write-Host "       ✅ Management token acquired"
} catch {
    Write-Host "       ❌ Failed to get management token. Ensure 'az login' has been run." -ForegroundColor Red
    Write-Host "       Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# --- 3. Get APIM debug credentials ---
Write-Host "[2/4] Getting APIM debug credentials..." -ForegroundColor Cyan

$debugCredUrl = "https://management.azure.com${apimResourceId}/gateways/managed/listDebugCredentials?api-version=2024-05-01"
$debugCredBody = @{
    apiId    = "${apimResourceId}/apis/gateway-wildcard"
    purposes = @("tracing")
} | ConvertTo-Json

try {
    $debugResp = Invoke-RestMethod -Uri $debugCredUrl -Method POST `
        -Headers @{ Authorization = "Bearer $mgmtToken" } `
        -ContentType "application/json" -Body $debugCredBody
    $debugToken = $debugResp.token
    Write-Host "       ✅ Debug token acquired"
} catch {
    $s = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    Write-Host "       ❌ Failed to get debug credentials (HTTP $s)" -ForegroundColor Red
    Write-Host "       Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "       Ensure the service principal has Contributor role on the APIM resource." -ForegroundColor Yellow
    exit 1
}

# --- 4. Send the request with debug tracing ---
Write-Host "[3/4] Sending traced request: [$($request.method)] $($request.url)..." -ForegroundColor Cyan

$reqHeaders = @{ "Apim-Debug-Authorization" = $debugToken }
$contentType = "application/json"
if ($request.headers) {
    foreach ($prop in $request.headers.PSObject.Properties) {
        if ($prop.Name -eq "Content-Type") { $contentType = $prop.Value }
        else { $reqHeaders[$prop.Name] = $prop.Value }
    }
}

$traceId = $null
$responseStatus = 0
$responseBody = $null
$responseHeaders = @{}

try {
    $params = @{
        Uri         = $request.url
        Method      = $request.method
        Headers     = $reqHeaders
        ContentType = $contentType
    }
    if ($request.body -and $request.method -ne "GET") { $params.Body = $request.body }

    $resp = Invoke-WebRequest @params -ErrorAction Stop
    $responseStatus = $resp.StatusCode
    $responseBody = $resp.Content
    $responseHeaders = $resp.Headers

    $traceId = if ($resp.Headers["Apim-Trace-Id"]) {
        $val = $resp.Headers["Apim-Trace-Id"]
        if ($val -is [array]) { $val[0] } else { $val }
    } else { $null }

    Write-Host "       ✅ Response: $responseStatus"
} catch {
    $responseStatus = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    $responseBody = try { $_.Exception.Response.Content.ReadAsStringAsync().Result } catch { $_.Exception.Message }

    # Try to extract trace ID even from error responses
    if ($_.Exception.Response -and $_.Exception.Response.Headers) {
        try {
            $traceId = $_.Exception.Response.Headers.GetValues("Apim-Trace-Id") | Select-Object -First 1
        } catch { }
    }

    Write-Host "       ⚠️ Response: $responseStatus" -ForegroundColor Yellow
}

if (-not $traceId) {
    Write-Host "       ❌ No Apim-Trace-Id header in response. Debug tracing may not be enabled." -ForegroundColor Red
    Write-Host "       Ensure the debug token is valid and the API supports tracing." -ForegroundColor Yellow
}

# --- 5. Retrieve the trace ---
$traceData = $null
if ($traceId) {
    Write-Host "[4/4] Retrieving trace (ID: $traceId)..." -ForegroundColor Cyan

    $traceUrl = "https://management.azure.com${apimResourceId}/gateways/managed/listTrace?api-version=2023-05-01-preview"
    $traceBody = @{ traceId = $traceId } | ConvertTo-Json

    try {
        $traceResp = Invoke-RestMethod -Uri $traceUrl -Method POST `
            -Headers @{ Authorization = "Bearer $mgmtToken" } `
            -ContentType "application/json" -Body $traceBody
        $traceData = $traceResp
        Write-Host "       ✅ Trace retrieved"
    } catch {
        Write-Host "       ❌ Failed to retrieve trace" -ForegroundColor Red
        Write-Host "       Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "[4/4] Skipping trace retrieval (no trace ID)" -ForegroundColor Yellow
}

# --- 6. Write output file ---
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null }

$output = @{
    request = @{
        method  = $request.method
        url     = $request.url
        headers = $request.headers
    }
    response = @{
        status  = $responseStatus
        body    = $responseBody
        headers = @{}
    }
    traceId = $traceId
    trace   = $traceData
}

# Convert response headers to simple dictionary
if ($responseHeaders) {
    foreach ($key in $responseHeaders.Keys) {
        $val = $responseHeaders[$key]
        if ($val -is [array]) { $val = $val[0] }
        $output.response.headers[$key] = $val
    }
}

$outputPath = Join-Path $OutputDir ".debug-trace-output.json"
$output | ConvertTo-Json -Depth 20 | Out-File -FilePath $outputPath -Encoding UTF8

Write-Host "`n══════════════════════════════════════════════"
Write-Host "  Trace output: $outputPath"
Write-Host "══════════════════════════════════════════════`n"
