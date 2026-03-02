# Syntax Checks Reference

Detailed check descriptions for the APIM Policy Syntax Checker skill.

## 1. XML Content

- Verify all tags are properly opened and closed
- Verify correct nesting (no overlapping tags)
- Verify attributes are properly quoted
- Verify self-closing tags use ` />` syntax

## 2. Policy Structure

For **full policies** (API or product), verify the required skeleton:

```xml
<policies>
    <inbound> <base /> </inbound>
    <backend> <base /> </backend>
    <outbound> <base /> </outbound>
    <on-error> <base /> </on-error>
</policies>
```

For **fragments**, verify the root `<fragment>` element.

## 3. C# Expression Syntax

APIM policy expressions use `@()` (single expression) or `@{}` (statement block with `return`).
The runtime supports **C# 7 syntax only** — C# 8+ features are not supported and may cause
deployment or runtime failures.

- **Single-statement**: `@(expression)` — must be a valid C# expression
- **Multi-statement**: `@{statements}` — all code paths must end with `return`
- Verify matching parentheses and braces within expressions

## 4. Allowed .NET Types

Verify that types used in C# expressions are in the allowed list. **You MUST read
`references/fetched/policy-expressions-reference.md`** for the complete list of allowed types
and their supported members. Do not rely on internal knowledge — the allowed types list is
specific to APIM and changes over time. If the file does not exist, the mandatory fetch in
Step 1 of the workflow was skipped — go back and complete it before running this check.

## 5. Context Variable API

Verify that `context.*` property and method references match the actual API. **You MUST read
`references/fetched/policy-expressions-reference.md`** for the full context variable structure,
including nested properties, method signatures, and return types. Do not rely on internal
knowledge — the context API includes APIM-specific members (e.g., `context.Request.Foundry`,
`context.Deployment.SustainabilityInfo`) that may not be in training data. If the file does not
exist, the mandatory fetch in Step 1 of the workflow was skipped — go back and complete it
before running this check.

## 6. Fragment References

If the file contains `<include-fragment>` elements, verify each `fragment-id` matches a
fragment file in the repository. Use `glob` to scan for fragment XML files.

---

# Best Practice Checks Reference

Best practice checks produce **⚠️ Warning** findings (not ❌ errors). They are run after syntax
checks and flag improvements for maintainability and reliability.

See [references/best-practices.md](best-practices.md) for full details and examples.

## 7. Variable Management

Check context variable usage against safe access rules and naming conventions:
- **7a.** Use `String.Empty` instead of `""` (empty string literal)
- **7b.** Use typed booleans (`@(true)`) not string booleans (`@("true")`)
- **7c.** Kebab-case variable names (flag `camelCase`, `snake_case`, `UPPER_CASE`)
- **7d.** Safe variable access (`GetValueOrDefault<T>` or `ContainsKey`, not direct dictionary access)

## 8. Preserve Request Body

Flag `context.Request.Body.As<T>(...)` calls missing `preserveContent: true`. Without it,
the body is consumed and unavailable to downstream fragments or the backend.

## 9. Fragment Dependency Documentation

Flag fragments that read variables they did not set but lack `<!-- Dependencies: -->`,
`<!-- Requires: -->`, `<!-- Produces: -->` comments.

## 10. Undefined Variable References

Scan **all** policy and fragment XML files. Flag any variable that is **read** in
expressions but never **set** by any file in the repository. These always resolve to the
default value, which may indicate dead code or a missing upstream fragment.

## 11. Dead Code Conditions

Flag `<when condition="...">` blocks that reference variables not yet available at that
point in the fragment execution pipeline. Requires reading the `<include-fragment>` order
from parent API/product policies to determine execution sequence.

## 12. Unnecessary Escape Characters

Flag XML escape entities (`&lt;`, `&gt;`, `&amp;`, `&quot;`, `&apos;`) inside C# expression
context. APIM handles escaping at deployment — these reduce readability.

---

## Required References

- **Policy expressions reference** (`references/fetched/policy-expressions-reference.md`):
  Official Microsoft documentation for APIM policy expression syntax, allowed .NET types,
  `context` variable API, and helper methods (JWT, Basic Auth, encryption).
  Source: https://learn.microsoft.com/en-us/azure/api-management/api-management-policy-expressions

This file is fetched in **Step 1 (Fetch Reference)** of the main workflow in `SKILL.md`.
It must be loaded before performing checks 4 and 5. Do not skip this step.

## Alternative Workflows

### Selective Fix Flow

When the user chooses "Let me choose which to fix":
1. List all open errors with numeric IDs from the report
2. Use `ask_user` to let the user select which errors to fix (freeform input for comma-separated IDs or "all")
3. Fix only the selected errors, tracking progress in the report

### Re-Run Flow

If the user reports APIM validation errors after deployment, or asks to re-check:
1. Re-read the source XML file(s)
2. Re-run all checks
3. Update the existing report (preserve `✅ Fixed` entries, refresh all others)
4. Prompt auto-fix again if new errors are found

## Fix Rules — Surgical Edits Only

When fixing errors, change **only** the problematic token or expression. Never remove, truncate, or rewrite surrounding code that is unrelated to the error.

**Principle:** If an expression contains one invalid element among valid elements, replace only the invalid element. The rest of the expression must remain byte-for-byte identical.

**Examples:**

Bad fix (too aggressive — removes unrelated content):
```
# Error: System.Environment.MachineName not allowed
# Original:
"Backend {selected-backend} for model {model-id} on {System.Environment.MachineName}"
# ❌ Wrong — removed the entire tail instead of just the bad token:
"Backend {selected-backend} for model {model-id}"
```

Good fix (surgical — only the invalid token is replaced):
```
# ✅ Correct — only System.Environment.MachineName is removed/replaced:
"Backend {selected-backend} for model {model-id}"  # only if NOTHING else was after it
# Or if there was content after it, preserve that content too
```

**Rules:**
1. **Scope the `old_str`** in edits to the smallest unique block that contains the error
2. **Preserve all surrounding content** — other interpolated expressions, string literals, attributes, and elements adjacent to the fix must not change
3. **When removing a disallowed token from a string interpolation**, remove only the token and its enclosing `{...}` plus any directly associated label text (e.g., `" on {System.Environment.MachineName}"`) — leave all other interpolated segments intact
4. **When replacing a C# construct** (e.g., switch expression → ternary), the replacement must produce the same return values for the same inputs
5. **When removing a line/block** (e.g., dead code, missing fragment ref), do not alter adjacent lines — verify no whitespace or comment merging occurs
