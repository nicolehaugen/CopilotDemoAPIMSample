---
name: http-test-executor
description: "**WORKFLOW SKILL** - Executes VS Code REST Client .http test files via PowerShell. Discovers .http files, parses each into a JSON test manifest, runs requests via Invoke-WebRequest, validates response headers, and generates markdown reports. USE FOR: run tests, run .http tests, execute http file, test my API, run REST Client tests, or any request to execute .http test files. DO NOT USE FOR: testing non-.http file formats."
---

# HTTP Test Executor

Runs VS Code REST Client `.http` files by producing a JSON test manifest per file, then executing via PowerShell.

## Prerequisites

- `.vscode/settings.json` with REST Client environment variables
- PowerShell 7+ (`pwsh`)

## Workflow

### Step 1: Discover .http Files

Scan workspace for `.http` files:

```powershell
Get-ChildItem -Path . -Filter "*.http" -Recurse | Select-Object FullName
```

Ask which files to run (all or specific).

### Step 2: Parse .http → JSON Manifest

For each selected file, produce a JSON test manifest at `Tests/Results/.test-manifest.json`. See [manifest-format.md](references/manifest-format.md) for JSON schema, field rules, and variable resolution.

### Step 3: Execute Tests

Run the executor script:

```powershell
pwsh -File .github/skills/http-test-executor/scripts/run-tests.ps1 `
  -ManifestFile "Tests/Results/.test-manifest.json" `
  -OutputFile "Tests/Results/<source-filename>-results.md"
```

Optional: `-SettingsFile` (default `.vscode/settings.json`), `-DelaySeconds` (default `10`).

### Step 4: Review Results

Results written to output file. Manifest and reports in `Tests/Results/` are gitignored.

### Step 5: Repeat

If multiple `.http` files selected, repeat Steps 2–4 for each.

## 429 Retry Logic

After reviewing test results, if any tests received a **429 (Too Many Requests)** response:

1. **Identify retryable tests** — collect all tests from the results report that show status `429`.
2. **Wait before retrying** — pause for 60 seconds to allow rate limits to reset. If the test report or script output mentions a `Retry-After` header value, use that duration instead.
3. **Build a retry manifest** — create a new manifest JSON containing only the failed 429 tests (same format as the original manifest).
4. **Re-run the script** — execute `run-tests.ps1` with the retry manifest and a separate output file (e.g., `<source-filename>-retry-results.md`).
5. **Merge results** — report the final outcome by combining the original passing results with the retry results. A test that passes on retry should be reported as ✅ PASS with a note that it required a retry.
6. **Give up gracefully** — if a test still returns 429 after the retry, report it as ❌ FAIL with a note that rate limiting persisted.

## Error Handling

- Auth failure → remaining tests marked ⚠️ SKIPPED
- Expected error status (matching `expectedStatus`) → ✅ PASS
- HTTP errors → captured with status code and message
