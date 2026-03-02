# Copyright (c) Microsoft Corporation.
# Licensed under the MIT License.

# Executes tests from a JSON manifest via Invoke-WebRequest and writes a markdown report.
# The agent produces the manifest from .http files; this script just runs it.

param(
    [Parameter(Mandatory=$true)]
    [string]$ManifestFile,
    [Parameter(Mandatory=$true)]
    [string]$OutputFile,
    [string]$SettingsFile = ".vscode/settings.json",
    [int]$DelaySeconds = 10
)

# --- 1. Load settings and test manifest ---
$envVars = @{}
$envName = "(none)"

if (Test-Path $SettingsFile) {
    $settings = Get-Content $SettingsFile -Raw | ConvertFrom-Json
    $rcEnvs = $settings.'rest-client.environmentVariables'
    if ($rcEnvs) {
        $envProp = $rcEnvs.PSObject.Properties | Select-Object -First 1
        if ($envProp) {
            $envName = $envProp.Name
            foreach ($p in $envProp.Value.PSObject.Properties) {
                $envVars[$p.Name] = [string]$p.Value
            }
        }
    }
}

$tests = Get-Content $ManifestFile -Raw | ConvertFrom-Json

Write-Host "Environment: $envName ($($envVars.Count) variables)"
Write-Host "Tests: $($tests.Count)`n"

# --- 2. Variable resolution ---
$namedResponses = @{}

function Resolve-Vars([string]$text) {
    foreach ($key in $envVars.Keys) {
        $text = $text -replace [regex]::Escape("{{$key}}"), $envVars[$key]
    }

    # Resolve named response references: {{name.response.body.field}}
    $text = [regex]::Replace($text, '\{\{(\w+)\.response\.body\.(\w+)\}\}', {
        param($m)
        $rName = $m.Groups[1].Value
        $field = $m.Groups[2].Value
        if ($script:namedResponses.ContainsKey($rName)) {
            try {
                $obj = $script:namedResponses[$rName] | ConvertFrom-Json
                return [string]$obj.$field
            } catch { return $m.Value }
        }
        return $m.Value
    })

    return $text
}

# --- 3. Execute each test ---
$results = @()
$passCount = 0
$skipRemaining = $false

foreach ($test in $tests) {
    $validations = if ($test.validations) { $test.validations } else { "Status-only check" }

    if ($skipRemaining) {
        Write-Host "  [$($test.method)] $($test.name)... SKIPPED"
        $results += @{ name=$test.name; method=$test.method; status=0; pass=$false; checks=@(); error="Skipped (auth failed)"; validations=$validations }
        continue
    }

    $url = Resolve-Vars $test.url
    $body = if ($test.body) { Resolve-Vars $test.body } else { $null }

    # Build headers (separate Content-Type for Invoke-WebRequest)
    $headers = @{}
    $contentType = "application/json"
    foreach ($prop in $test.headers.PSObject.Properties) {
        $val = Resolve-Vars $prop.Value
        if ($prop.Name -eq "Content-Type") { $contentType = $val }
        else { $headers[$prop.Name] = $val }
    }

    if ($results.Count -gt 0) {
        Write-Host "    Waiting ${DelaySeconds}s..." -ForegroundColor DarkGray
        Start-Sleep -Seconds $DelaySeconds
    }

    Write-Host "  [$($test.method)] $($test.name)..." -NoNewline

    try {
        $params = @{ Uri=$url; Method=$test.method; Headers=$headers; ContentType=$contentType }
        if ($body -and $test.method -ne "GET") { $params.Body = $body }

        $resp = Invoke-WebRequest @params -ErrorAction Stop

        if ($test.namedId) { $script:namedResponses[$test.namedId] = $resp.Content }

        # Validate expected headers
        $checks = @()
        $allPass = $true
        if ($test.expectedHeaders) {
            foreach ($prop in $test.expectedHeaders.PSObject.Properties) {
                $actual = $resp.Headers[$prop.Name]
                if ($actual -is [array]) { $actual = $actual[0] }
                $pass = if ($prop.Value -eq "presence-only" -or $prop.Value -match '\{[^}]+\}') { $null -ne $actual }
                         else { $actual -eq $prop.Value }
                if (-not $pass) { $allPass = $false }
                $checks += @{ header=$prop.Name; expected=$prop.Value; actual=$actual; pass=$pass }
            }
        }

        if ($test.expectedStatus -and [int]$resp.StatusCode -ne [int]$test.expectedStatus) {
            $allPass = $false
            $checks += @{ header="Status Code"; expected=$test.expectedStatus; actual=[int]$resp.StatusCode; pass=$false }
        }

        if ($allPass) { $passCount++ }
        Write-Host " $($resp.StatusCode) $(if ($allPass) {'✅'} else {'❌'})"
        $results += @{ name=$test.name; method=$test.method; status=[int]$resp.StatusCode; pass=$allPass; checks=$checks; error=$null; validations=$validations }
    }
    catch {
        $s = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }

        $isExpectedError = $false
        $checks = @()
        if ($test.expectedStatus -and $s -eq [int]$test.expectedStatus) {
            $isExpectedError = $true
            $checks += @{ header="Status Code"; expected=$test.expectedStatus; actual=$s; pass=$true }
        }

        if ($isExpectedError) {
            $passCount++
            Write-Host " $s ✅ (expected error)"
            $results += @{ name=$test.name; method=$test.method; status=$s; pass=$true; checks=$checks; error=$null; validations=$validations }
        } else {
            Write-Host " $s ❌"
            $results += @{ name=$test.name; method=$test.method; status=$s; pass=$false; checks=@(); error=$_.Exception.Message; validations=$validations }
        }
        if ($test.isAuth -and -not $isExpectedError) { $skipRemaining = $true; Write-Host "    Auth failed — skipping remaining tests" -ForegroundColor Red }
    }
}

# --- 4. Write markdown report ---
$outDir = Split-Path $OutputFile
if ($outDir -and -not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$displayName = [System.IO.Path]::GetFileNameWithoutExtension($OutputFile) -replace '-results$', ''

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("# Test Results: $displayName`n")
[void]$sb.AppendLine("**Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$sb.AppendLine("**Environment:** $envName")
[void]$sb.AppendLine("**Overall Result:** $passCount/$($results.Count) tests passed`n---`n")
[void]$sb.AppendLine("## Summary`n")
[void]$sb.AppendLine("| # | Test Name | Method | Status | Result |")
[void]$sb.AppendLine("|---|-----------|--------|--------|--------|")
for ($i = 0; $i -lt $results.Count; $i++) {
    $r = $results[$i]
    [void]$sb.AppendLine("| $($i+1) | $($r.name) | $($r.method) | $($r.status) | $(if ($r.pass) {'✅'} else {'❌'}) |")
}
[void]$sb.AppendLine("`n---`n`n## Detailed Results")
for ($i = 0; $i -lt $results.Count; $i++) {
    $r = $results[$i]
    [void]$sb.AppendLine("`n### Test $($i+1): $($r.name)")
    [void]$sb.AppendLine("**Method:** $($r.method) | **Status:** $($r.status)")
    [void]$sb.AppendLine("**Validations:** $($r.validations)`n")
    if ($r.checks.Count -gt 0) {
        [void]$sb.AppendLine("| Header | Expected | Actual | Result |")
        [void]$sb.AppendLine("|--------|----------|--------|--------|")
        foreach ($c in $r.checks) { [void]$sb.AppendLine("| $($c.header) | $($c.expected) | $($c.actual) | $(if ($c.pass) {'✅'} else {'❌'}) |") }
        [void]$sb.AppendLine("")
    }
    if ($r.error) { [void]$sb.AppendLine("**Error:** $($r.error)`n") }
    [void]$sb.AppendLine("---")
}

$sb.ToString() | Out-File -FilePath $OutputFile -Encoding UTF8

# --- 5. Summary ---
$icon = if ($passCount -eq $results.Count) { "✅" } else { "❌" }
Write-Host "`n═══════════════════════════════════════════"
Write-Host "  HTTP Test Execution Summary"
Write-Host "═══════════════════════════════════════════"
Write-Host "  $displayName  $passCount/$($results.Count)  $icon"
Write-Host "═══════════════════════════════════════════"
Write-Host "`nReport: $OutputFile"

