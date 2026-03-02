# Best Practice Checks Reference

Best practice checks produce **⚠️ Warning** findings (not errors). They highlight improvements
that reduce bugs, improve maintainability, and follow Microsoft's recommended patterns.

## 7. Variable Management

Checks context variable usage against the rules in the
[apim-policy-fragments variable-management reference](../../apim-policy-fragments/references/variable-management.md).

### 7a. Use `String.Empty` instead of `""`

Flag any `set-variable` or expression that uses `""` (empty string literal) as a value or default.
Use `String.Empty` instead for clarity and consistency.

**Warn on:**
```xml
<set-variable name="user-id" value="@(context.Variables.GetValueOrDefault<string>("user-id", ""))" />
<set-variable name="name" value="@("")" />
```

**Recommend:**
```xml
<set-variable name="user-id" value="@(context.Variables.GetValueOrDefault<string>("user-id", String.Empty))" />
<set-variable name="name" value="@(String.Empty)" />
```

### 7b. Use typed booleans, not string booleans

Flag `set-variable` that sets a boolean as a string (`"true"` / `"false"`).

**Warn on:**
```xml
<set-variable name="is-authenticated" value="@("true")" />
```

**Recommend:**
```xml
<set-variable name="is-authenticated" value="@(true)" />
```

### 7c. Kebab-case variable names

Flag variable names that are not kebab-case (lowercase letters, digits, hyphens).

**Warn on:** `requestId`, `RequestId`, `request_id`, `REQUEST_ID`
**Recommend:** `request-id`

### 7d. Safe variable access

Flag direct dictionary access (`context.Variables["key"]`) which throws if the key is missing.

**Warn on:**
```xml
<set-variable name="val" value="@((string)context.Variables["some-key"])" />
```

**Recommend:** Use `GetValueOrDefault<T>` or `ContainsKey` check (see variable-management reference
for when to use each pattern).

## 8. Preserve Request Body

Flag any expression that reads `context.Request.Body.As<T>(...)` without `preserveContent: true`.
Without this flag, reading the body **consumes** it — downstream fragments and backend services
will receive an empty body.

**Warn on:**
```xml
<set-variable name="body" value="@(context.Request.Body.As<string>())" />
<set-variable name="data" value="@(context.Request.Body.As<JObject>())" />
<set-variable name="body" value="@(context.Request.Body.As<string>(preserveContent: false))" />
```

**Recommend:**
```xml
<set-variable name="body" value="@(context.Request.Body.As<string>(preserveContent: true))" />
<set-variable name="data" value="@(context.Request.Body.As<JObject>(preserveContent: true))" />
```

**Also check** `context.Response.Body.As<T>(...)` in outbound/on-error — same rule applies.

## 9. Fragment Dependency Documentation

Flag fragments that use `context.Variables.ContainsKey` or `GetValueOrDefault` for variables
they did not set — but lack dependency comments (`<!-- Dependencies: -->`, `<!-- Requires: -->`,
`<!-- Produces: -->`).

**Warn on:** A fragment that reads `auth-token` but has no `<!-- Requires: auth-token -->` comment.

**Recommend:** Add data contract comments at the top of the fragment:
```xml
<fragment>
  <!-- Dependencies: security-context -->
  <!-- Requires: auth-token, subscription-key -->
  <!-- Produces: rate-limit-remaining -->
  ...
</fragment>
```

## 10. Undefined Variable References

Flag variables that are **read** in expressions but never **set** by any file in the repository.
These always resolve to the default value, which may indicate dead code or a missing upstream fragment.

### Detection

1. **Collect "set" variables** — variable names from `<set-variable name="X">`,
   `variable-name="X"` on `<cache-lookup-value>`, `output-token-variable-name="X"`,
   `remaining-calls-variable-name="X"`
2. **Collect "read" variables** — variable names from `GetValueOrDefault("X"...)`,
   `ContainsKey("X")`, `context.Variables["X"]`
3. **Compare** — flag any read variable not in the set list

### Exclusions

Do **not** flag:
- Variables in `<!-- Requires: X -->` comments (documented external dependency)
- APIM named values (`{{named-value}}` syntax)

### Warn format

```
⚠️ Undefined variable: `is-model-inference-request` is read at line 110 of
   Path-Construction.xml but never set in any scanned file.
```

### Auto-fix

Not auto-fixable. Flag for manual review — the variable may be obsolete (remove the reference),
missing (add upstream `<set-variable>`), or external (document in `<!-- Requires: -->`).

## 11. Dead Code Conditions

Flag `<when condition="...">` blocks that reference context variables not yet available at that
point in the fragment execution pipeline. This catches variables that are either set by a
fragment that runs **later** in the pipeline, or never set at all — in both cases the condition
always evaluates against the default value.

### Detection

1. **Determine execution order** — read each parent API/product policy and extract the
   `<include-fragment fragment-id="...">` sequence per section (`<inbound>`, `<outbound>`,
   `<on-error>`). Also note any inline `<set-variable>` elements between fragments.
2. **Build cumulative available set** — walk the execution order. At each point, the
   available variables are:
   - Inline `<set-variable>` in the parent policy **before** this point
   - All `<set-variable>` elements from earlier fragments (scan XML or use
     `<!-- Produces: -->` comments)
   - `<set-variable>` elements earlier within the **current** fragment (before the condition)
3. **Scan conditions** — for each `<when condition="...">`, extract variable names referenced
   via `GetValueOrDefault("X"...)`, `ContainsKey("X")`, or `context.Variables["X"]`
4. **Compare** — if a referenced variable is not in the available set at that point, flag it

### Example

```
API policy inbound execution order:
  Line 48: set-variable "request-start-time"
  Line 49: set-variable "request-start-ticks"
  Line 52: condition reads "global-trace-enabled"  ← NOT YET SET → dead code
  Line 71: include-fragment "model-config"
  Line 72: include-fragment "config-cache"          → sets global-trace-enabled
  Line 89: condition reads "global-trace-enabled"  ← NOW SET → valid
```

### Exclusions

Do **not** flag:
- APIM built-in context properties (`context.Product`, `context.Subscription`,
  `context.Request.*`, `context.Response.*`, `context.RequestId`, `context.LastError.*`)
- Variables in `<!-- Requires: X -->` comments (documented external dependency)
- Conditions inside `<on-error>` that reference variables from `<inbound>` — APIM preserves
  variables across sections within the same request

### Warn format

```
⚠️ Dead code condition: `global-trace-enabled` is read at line 52 of
   unifiedaigateway-wildcard-api.xml but not set until `config-cache` fragment
   (included at line 72). The condition always evaluates against the default value.
```

### Auto-fix

Not auto-fixable. Flag for manual review. Options:
- Move the condition block after the fragment that sets the variable
- Remove the dead block if it serves no purpose with the default value
- If the default-value behavior is intentional, add a comment explaining why

## 12. Unnecessary Escape Characters

APIM handles XML escaping at deployment — escape entities in source XML reduce readability.

**Flag as ⚠️ warnings** in any C# expression context (`@()` or `@{}`):
`&lt;` → `<`, `&gt;` → `>`, `&amp;` → `&`, `&quot;` → `"`, `&apos;` → `'`

Scan: `value="..."`, `condition="..."` attributes and `<value>`, `<message>`, `<set-body>` element content.

**Fix:** Replace each entity with its raw character.

**Exclusions:**
- Escape entities outside C# expression context (plain XML attribute values not inside `@()` or `@{}`)
