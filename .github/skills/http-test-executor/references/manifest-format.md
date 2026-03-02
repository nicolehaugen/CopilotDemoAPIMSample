# Test Manifest Format

The manifest is a JSON array of test objects. For each HTTP request found in the `.http` file, extract from the comments above it:

```json
[
  {
    "name": "test name derived from comments above the request",
    "method": "POST",
    "url": "the full URL with file-level @variables resolved, {{settings-variables}} preserved",
    "headers": {
      "header-name": "header-value with same variable resolution as URL"
    },
    "body": "request body as a string (join lines, strip newlines for form-encoded)",
    "namedId": "@name value if present, otherwise null",
    "isAuth": true,
    "expectedHeaders": {
      "X-Custom-Header": "expected-value",
      "X-Region": "presence-only"
    },
    "expectedStatus": null,
    "validations": "Status 200 + 2 header checks (1 exact, 1 presence-only)"
  }
]
```

## Field Extraction Rules

Use best judgment to extract metadata from whatever comment style exists above each request. Different `.http` files use different conventions — there is no single required format.

- **name**: Look for any descriptive comment above the request that names or describes it (e.g., `### Test: <name>`, `## 1a. First request`, `# Get Bearer Token`, or a plain description). If no descriptive comment exists, use `<METHOD> <url-path>` as the name.
- **url**: The URL from the HTTP method line. Resolve file-level `@variable` values (e.g., replace `{{gatewayEndpoint}}` with the value of `@gatewayEndpoint` from the file header). Keep `{{variable}}` placeholders that come from `.vscode/settings.json` as-is — the script resolves those at runtime.
- **headers**: Request headers between the method line and the blank line before the body. Apply the same variable resolution as URLs.
- **body**: Lines after the blank line until the next `###` separator. For `Content-Type: application/x-www-form-urlencoded`, join all body lines into a single string with no newlines. For JSON bodies, join with newlines.
- **namedId**: Value from `# @name <id>` comment. Null if absent.
- **isAuth**: True if the request has an `Authorization:` header. Also true if the URL pattern suggests an OAuth token endpoint or the `@name` indicates a token request.
- **expectedHeaders**: Look for any comment block that lists expected response headers as key-value pairs. Common patterns include `# Expected Debug Headers:`, `# Expected Headers:`, `# Expect:`, or similar. Strip parenthetical notes from values. For values that indicate variability (e.g., mentions "varies", "multiple", "presence", or contains a dynamic placeholder like `{variable}`), set the value to `"presence-only"` — this tells the script to check only that the header exists, not its exact value. If no expected headers are documented, set to `{}`.
- **expectedStatus**: Look for any comment indicating the expected HTTP status code (e.g., `# Expected Response: 401`, `# Returns 404`, `# Status: 200`). If present, set to the integer status code — this enables non-2xx error tests to pass when the actual status matches. If not documented, set to `null`.
- **validations**: A natural language summary of what this test will verify at runtime. Build this from the other fields. Examples:
  - `"Status 200 + 6 header checks (3 exact, 3 presence-only)"`
  - `"Expected status 401 (error test), no header checks"`
  - `"Status-only check — no expected headers or status documented"`

  This string appears in the test report so the user knows exactly what was tested.

## File-Level Variable Resolution

`.http` files declare variables at the top using `@variableName = value` syntax. These may reference REST Client environment variables (e.g., `@gatewayEndpoint = {{gateway_url}}/contoso`). When building the manifest:
1. Collect all `@variable = value` declarations from the file
2. Resolve any `{{variable}}` within those values that reference OTHER file-level `@variable` declarations
3. In URLs, headers, and body: replace `{{variableName}}` with the resolved file-level value
4. Leave `{{variable}}` placeholders that are NOT file-level declarations as-is — the PowerShell script resolves these from `.vscode/settings.json` at runtime

## Runtime Variable Resolution

The PowerShell script resolves these `{{variable}}` placeholders at runtime:

| Source | Resolution |
|--------|------------|
| `.vscode/settings.json` | All keys from `rest-client.environmentVariables.<envName>` are resolved dynamically — no hardcoded variable names |
| Named responses | `{{name.response.body.field}}` — captured from `@name` tagged request responses |
