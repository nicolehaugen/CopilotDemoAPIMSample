---
name: code-review-agent
description: >
  **WORKFLOW SKILL** - Reviews code files using the GPT-5.2 Codex model via the APIM gateway.
  Analyzes code for correctness, style, security issues, and best practices, then produces a
  structured markdown review report.
  USE FOR: review code, code review, analyze code, check code quality, review my file, review
  this code, find issues in code, code analysis, GPT-5.2 Codex review, codex model review.
  DO NOT USE FOR: APIM policy XML validation (use apim-policy-syntax-checker), running HTTP
  tests (use http-test-executor), or debugging APIM traces (use apim-debug-tracer).
---

# Code Review Agent

Reviews code files using the GPT-5.2 Codex model via the APIM gateway and produces a structured
markdown review report.

## Prerequisites

- `azd up` completed (generates `.vscode/settings.json` with `apim_gateway_url` and `apim_subscription_key`)
- PowerShell 7+ (`pwsh`)

## Workflow

### Step 1: Identify Files to Review

Ask the user which file(s) to review if not already provided. Accept file paths relative to the
workspace root.

### Step 2: Write the Review Request

Write a JSON request file to `Tests/Results/.review-request.json`:

```json
{
  "model": "gpt-5.2-codex",
  "files": [
    {
      "path": "relative/path/to/file",
      "content": "<file content here>"
    }
  ],
  "reviewFocus": "correctness, style, security, best practices"
}
```

Read each file using the `view` tool and populate the `content` field. Resolve any
`{{variable}}` placeholders using values from `.vscode/settings.json` under
`rest-client.environmentVariables`.

### Step 3: Run the Review Script

```powershell
pwsh -File .github/skills/code-review-agent/scripts/code-review.ps1 `
  -RequestFile "Tests/Results/.review-request.json" `
  -OutputFile "Tests/Results/code-review-results.md"
```

Optional: `-SettingsFile` (default `.vscode/settings.json`).

### Step 4: Display Review Results

Read `Tests/Results/code-review-results.md` and display the findings to the user. Summarize:

- **Issues found** — categorized by severity: ❌ Error, ⚠️ Warning, 💡 Suggestion
- **Files reviewed** — list each file with its issue count
- **Overall assessment** — brief summary of code quality

### Step 5: Offer Auto-Fix

If any ❌ errors or ⚠️ warnings were identified, prompt the user:

> "I found {N} error(s) and {M} warning(s) across {K} file(s). Would you like me to apply the
> suggested fixes automatically?"

Choices:
- `Yes, fix all automatically`
- `Errors only (skip warnings)`
- `Let me choose which to fix`
- `No, I'll fix manually`

### Step 6: Apply Fixes

For each issue being fixed:
1. Read the current file content
2. Apply the surgical edit using the `edit` tool
3. Update the results report status to `✅ Fixed`

### Step 7: Clean Up

Delete temp files after review is complete:

```powershell
Remove-Item "Tests/Results/.review-request.json" -ErrorAction SilentlyContinue
```

## Review Categories

The GPT-5.2 Codex model reviews code across these categories:

| Category | Description |
|----------|-------------|
| **Correctness** | Logic errors, null/undefined handling, type mismatches |
| **Security** | Injection risks, hardcoded secrets, insecure patterns |
| **Style** | Naming conventions, formatting, readability |
| **Best Practices** | Idiomatic patterns, error handling, performance |
| **Documentation** | Missing or outdated comments and docstrings |

## Report File

Results are written to `Tests/Results/code-review-results.md`. The `Tests/Results/` folder is
gitignored, so review reports are not committed.
