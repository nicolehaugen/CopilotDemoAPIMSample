---
name: apim-debug-tracer
description: Debug traces an APIM request to analyze policy execution flow. Use when the user wants to trace, debug, or diagnose an APIM API request to understand why it failed, how policies executed, or what happened during request processing. The user provides the full HTTP request to trace, and the skill automatically obtains Azure credentials, enables APIM debug tracing, sends the request, retrieves the trace, and analyzes results. Triggers on phrases like "trace this request", "debug this API call", "why did this request fail", "analyze APIM policy execution", or "debug tracing".
---

# APIM Debug Tracer

Sends an APIM request with debug tracing enabled, retrieves the full policy execution trace, and analyzes the results.

## Prerequisites

- `azd up` completed (generates `.vscode/settings.json` with `apim_resource_id`)
- Azure CLI logged in (`az login`)
- PowerShell 7+ (`pwsh`)

## Workflow

### Step 1: Get the Request from the User

Prompt the user to provide the full HTTP request to trace. The user should supply:

- HTTP method and URL
- Any required headers (e.g., `api-key`, `Authorization`)
- Request body (if applicable)

Resolve any `{{variable}}` placeholders using values from `.vscode/settings.json` under `rest-client.environmentVariables`. Common variables:

| Placeholder | Source |
|-------------|--------|
| `{{apim_gateway_url}}` | `.vscode/settings.json` |
| `{{apim_subscription_key}}` | `.vscode/settings.json` |

### Step 2: Write the Request File

Write a JSON file to `Tests/Results/.debug-request.json`:

```json
{
  "method": "POST",
  "url": "https://<resolved-apim-url>/unified-ai/openai/deployments/gpt-4.1-mini/chat/completions?api-version=2025-01-01-preview",
  "headers": {
    "api-key": "<resolved-subscription-key>",
    "Content-Type": "application/json"
  },
  "body": "{\"model\":\"gpt-4.1-mini\",\"messages\":[{\"role\":\"user\",\"content\":\"test\"}],\"max_tokens\":50}"
}
```

All `{{variable}}` placeholders must be resolved before writing the file. Read `.vscode/settings.json` to resolve them.

### Step 3: Run the Trace Script

```powershell
pwsh -File .github/skills/apim-debug-tracer/scripts/debug-trace.ps1 -RequestFile Tests/Results/.debug-request.json
```

The script automatically:
1. Gets a management token via `az account get-access-token` (current logged-in user)
2. Obtains APIM debug credentials from the management API
3. Sends the request with `Apim-Debug-Authorization` header for tracing
4. Extracts the `Apim-Trace-Id` from the response
5. Retrieves the full trace via the management API
6. Writes all output to `Tests/Results/.debug-trace-output.json`

### Step 4: Analyze the Trace

Read `Tests/Results/.debug-trace-output.json` and analyze the results.

**If the request succeeded** (2xx status):
- Summarize the policy execution flow (inbound → backend → outbound)
- Highlight key policy fragments that executed
- Report any interesting context variables or header transformations

**If the request failed** (4xx/5xx status):
- Identify the exact point of failure in the policy execution chain
- Look for error messages in trace entries (`source`, `message`, `data` fields)
- Check for:
  - Authentication failures (missing/invalid tokens, JWT validation errors)
  - Backend errors (circuit breaker tripped, backend timeout, connection refused)
  - Policy errors (variable not found, expression evaluation failures)
  - Rate limiting (429 responses, quota exceeded)
- Suggest specific fixes based on the failure, referencing policy fragments by name

**If no trace was returned:**
- Check if the debug token was obtained successfully
- Verify `apim_resource_id` is correct in settings
- Suggest running `az login` if token acquisition failed

### Step 5: Clean Up

Delete temp files after analysis:

```powershell
Remove-Item "Tests/Results/.debug-request.json" -ErrorAction SilentlyContinue
Remove-Item "Tests/Results/.debug-trace-output.json" -ErrorAction SilentlyContinue
```
