# Report Template

Use this exact template when creating `policy-syntax-report.md`.

## Template

```markdown
# APIM Policy Syntax Report

**Scanned:** {timestamp}
**File(s):** {comma-separated list of scanned file paths}

## Summary

| Category | Status | Count |
|----------|--------|-------|
| Syntax | ❌ Open | {n} |
| Syntax | ✅ Passed | {n} |
| Syntax | ✅ Fixed | {n} |
| Best Practice | ⚠️ Warning | {n} |
| Best Practice | ✅ Passed | {n} |
| Best Practice | ✅ Fixed | {n} |

## Syntax Findings

### [{filename}](vscode://file/{absolute-path-to-file})

| # | Check | Location | Status | Description |
|---|-------|----------|--------|-------------|
| 1 | XML Content | [Line 42](vscode://file/{absolute-path-to-file}:42:1) | ❌ Open | Unclosed `<set-header>` tag |
| 2 | C# Expression | [Line 58](vscode://file/{absolute-path-to-file}:58:1) | ❌ Open | C# 8 pattern matching not supported |
| 3 | Policy Structure | — | ✅ Passed | Valid `<fragment>` root element |

*(repeat table per scanned file)*

## Best Practice Findings

### [{filename}](vscode://file/{absolute-path-to-file})

| # | Check | Location | Status | Description |
|---|-------|----------|--------|-------------|
| 7 | Variable Mgmt | [Line 15](vscode://file/{absolute-path-to-file}:15:1) | ⚠️ Warning | Use `String.Empty` instead of `""` |
| 8 | Duplication | [Lines 22-28](vscode://file/{absolute-path-to-file}:22:1) | ⚠️ Warning | Block duplicated in [product-policy.xml lines 10-16](vscode://file/{absolute-path-to-other-file}:10:1) |
| 9 | Body Preserve | [Line 31](vscode://file/{absolute-path-to-file}:31:1) | ⚠️ Warning | `Body.As<string>()` missing `preserveContent: true` |
| 10 | Fragment Docs | [Line 1](vscode://file/{absolute-path-to-file}:1:1) | ⚠️ Warning | Missing `<!-- Requires: -->` for variable `auth-token` |
| 11 | Undefined Ref | [Line 110](vscode://file/{absolute-path-to-file}:110:1) | ⚠️ Warning | `is-model-inference-request` is read but never set in any scanned file |
| 12 | Dead Code | [Line 52](vscode://file/{absolute-path-to-file}:52:1) | ⚠️ Warning | Condition reads `global-trace-enabled` before `config-cache` fragment sets it |

*(repeat table per scanned file)*

## Fix Log

| # | File | Category | Status | Action Taken |
|---|------|----------|--------|--------------|
| 1 | [fragment.xml](vscode://file/{absolute-path-to-file}) | Syntax | ✅ Fixed | Added closing `</set-header>` at line 45 |
| 7 | [fragment.xml](vscode://file/{absolute-path-to-file}) | Best Practice | ✅ Fixed | Replaced `""` with `String.Empty` |

*(populated during fix phase; empty initially)*
```

## Status Values

- `❌ Open` — Error found, not yet addressed
- `⚠️ Warning` — Non-blocking issue (informational)
- `✅ Passed` — Check passed with no issues
- `🔧 Fixing` — Currently being fixed (transient, during fix phase)
- `✅ Fixed` — Error was found and successfully resolved
- `❌ Fix failed` — Attempted fix did not resolve the issue (include explanation)

## Rules

- Populate the **Findings** table at step 3 (Write Report)
- Update individual row statuses in-place via `edit` during step 5 (Fix & Track)
- Append to **Fix Log** after each successful or failed fix
- Update the **Summary** counts after all fixes complete
- On re-run, preserve `✅ Fixed` rows and refresh all other statuses

## File Link Format

Use `vscode://file/` URIs so links are clickable in VS Code and open directly to the
relevant line. Construct the absolute path from the git repository root (e.g.,
`Git repository root:` value in the environment context) using forward slashes.

**URI format:** `vscode://file/{absolute-path-to-file}:{line}:{column}`

- **Section headings**: `### [filename](vscode://file/{absolute-path-to-file})`
- **Location column**: `[Line N](vscode://file/{absolute-path-to-file}:N:1)` for single lines, `[Lines N-M](vscode://file/{absolute-path-to-file}:N:1)` for ranges
- **Cross-file references** in descriptions: `[filename:line](vscode://file/{absolute-path-to-file}:N:1)` when referencing other files
- **Fix Log File column**: `[filename](vscode://file/{absolute-path-to-file})` to link to the fixed file
- Use forward slashes in paths for cross-platform link compatibility
- Include the line number in display text (e.g., `Line 42`) — the `:line:column` suffix in the URI handles navigation
