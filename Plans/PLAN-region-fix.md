# Plan: Fix Region Showing as "Unknown"

## Root Cause

The frontend reads `UAIG-Region` from response headers in `Frontend/src/utils/overheadCalc.ts`,
defaulting to `'Unknown'` when the header is absent.
`Infra/Resources/Fragments/diagnostic-headers.xml` sets many `UAIG-*` headers but **never sets
`UAIG-Region`**, and no other policy fragment sets a region variable.

## Problem with `context.Deployment.Region`

`context.Deployment.Region` returns the region of the **APIM gateway instance** — always the same
value regardless of which backend pool member served the request. The premium and standard backend
pools each span **3 regions** (`foundry_premium_endpoints` / `foundry_standard_endpoints`
variables), so this property would be inaccurate when load balancing routes to different regions.

## Correct Fix

Use the **`x-ms-region` response header** returned by Azure OpenAI / Azure AI Foundry backends. It
contains the actual Azure region that processed the specific request, and changes dynamically as the
load balancer picks different pool members.

Value expression:

```csharp
context.Response.Headers.GetValueOrDefault("x-ms-region", context.Deployment.Region)
```

- **Primary:** `x-ms-region` from the backend response — reflects the actual region that served the AI call
- **Fallback:** `context.Deployment.Region` — covers Gemini and any non-Azure backend that doesn't return `x-ms-region`

## Steps

1. Edit `Infra/Resources/Fragments/diagnostic-headers.xml` — add a `<set-header name="UAIG-Region">` element in the backend selection section using the expression above
2. Update the INPUT VARIABLES comment block in the same file to document `context.Response.Headers["x-ms-region"]` as an input

## Relevant Files

| File | Change |
|------|--------|
| `Infra/Resources/Fragments/diagnostic-headers.xml` | Add `UAIG-Region` set-header (only file that needs changing) |
| `Frontend/src/utils/overheadCalc.ts` | Already reads `UAIG-Region` correctly — no change needed |

## Verification

1. Send two requests through the premium pool — `UAIG-Region` should potentially vary per call (e.g., `eastus`, `eastus2`) as the load balancer picks different backends
2. Send a Gemini request — `UAIG-Region` should fall back to the APIM deployment region (non-empty, not "Unknown")
3. Confirm the frontend "Region" badge shows a real region name instead of "Unknown"
