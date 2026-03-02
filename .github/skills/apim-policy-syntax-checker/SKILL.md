---
name: apim-policy-syntax-checker
description: >
  **UTILITY SKILL** - Validate APIM policy XML syntax — well-formed XML, C# 7 expression
  correctness, allowed .NET types, context variable API usage, and structural completeness.
  USE FOR: check APIM policy, validate policy XML, lint policy, review syntax, syntax error,
  expression error, is this valid, check my policy, policy XML correctness, policy fragments,
  API policies, product policies.
  DO NOT USE FOR: validating or checking syntax of non-APIM policy files — this includes
  general XML, C# source code, configuration files, or any other file type that is not an
  APIM policy or policy fragment.
---

# APIM Policy Syntax Checker

Syntax-level validation and best practice analysis of APIM policy XML with persistent error
reporting and guided auto-fix.

## Workflow

1. **Fetch Reference (MANDATORY)** — If `references/fetched/policy-expressions-reference.md` is missing,
   fetch from URL in [checks.md](references/checks.md#auto-fetched-references). Then **always `view` the file**
   — even if already fetched. **Do not skip this step.** Required for checks 4 and 5.
2. **Read** — Use `view` to load the target XML file(s)
3. **Check** — Apply all syntax checks first, then best practice checks ([details](references/checks.md))
4. **Write Report** — Write findings to a `policy-syntax-report.md` file using the template in [references/report-template.md](references/report-template.md). Place the report in the session workspace `files/` folder. Syntax issues get `❌ Open`; best practice issues get `⚠️ Warning`; passing checks get `✅ Passed`
5. **Prompt Auto-Fix** — If any `❌ Open` errors or `⚠️ Warning` items exist, use `ask_user` to prompt: "I found {N} error(s) and {M} warning(s) in {file(s)}. Would you like me to automatically fix them?" with choices: `Yes, fix all automatically`, `Errors only (skip warnings)`, `Let me choose which to fix`, `No, I'll fix manually`
6. **Fix & Track** — For each error being fixed:
   - Update its status in the report to `🔧 Fixing`
   - Apply the fix to the source XML file using **surgical edits only** (see [Fix Rules](references/checks.md#fix-rules--surgical-edits-only))
   - Re-validate the specific check
   - Update status in the report to `✅ Fixed` (or `❌ Fix failed` with explanation)
7. **Final Summary** — After all fixes, update the report summary section and display a one-line result

For selective fix and re-run flows, see [references/checks.md](references/checks.md#alternative-workflows).

## Checks

- **Syntax checks (❌ errors):** checks 1–6 in [references/checks.md](references/checks.md)
- **Best practice checks (⚠️ warnings):** checks 7–12 in [references/best-practices.md](references/best-practices.md)

## Report File

The report file (`policy-syntax-report.md`) serves as both the error log and the progress tracker. See [references/report-template.md](references/report-template.md) for the exact template. Key rules:

- Create the file at step 3; update it in-place during fixes at step 5
- Use `edit` tool to update individual error statuses — do not rewrite the entire file
- Preserve the file across re-runs so users can see historical fix history
