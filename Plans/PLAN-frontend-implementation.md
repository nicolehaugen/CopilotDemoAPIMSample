# AI Gateway Pipeline Visualizer — Implementation Plan

## ⚠️ Critical Constraint: Purely Additive

**This frontend MUST NOT modify any existing files or infrastructure in the repository** except for the post-provision script integration:
- ✅ Add new files/folders only (the `Frontend/` directory)
- ✅ The post-provision script (`Scripts/set-environment-variables.ps1`) was extended to auto-generate `Frontend/.env`
- ❌ Do NOT change the deployment infrastructure or APIM configuration
- ❌ Do NOT alter any existing `.http` test files, `.tf` files, or PowerShell scripts (beyond the `.env` generation addition)
- The frontend connects to the already-deployed APIM gateway as a consumer — it does not change it

## Problem Statement

The Unified AI Gateway sample needs a visual, interactive demo that shows **how a request flows through an API gateway to reach an AI model and come back**. The audience is broad — not just APIM experts — so the visualization must tell a clear story in plain language:

> "Your request arrives → gets authenticated → the right AI model is selected → rate limits are checked → the AI responds → you see the result"

The frontend should:
1. **Tell the story of a request** flowing through pipeline stages using simple, jargon-free labels
2. **Show which AI model and region** handled the request
3. **Display real execution timing** so viewers can see where time is spent
4. Use **real tracing data** from live API calls (not simulated)

## Proposed Approach

Build a **React + Vite** single-page application with **react-flow** for the pipeline diagram and a lightweight **Express.js proxy server** for handling Azure Management API authentication and APIM debug tracing.

### Why a proxy server?

The APIM debug tracing flow requires 4 API calls:
1. **Get Management Token**: OAuth client credentials flow to Azure AD
2. **Get Debug Credentials**: POST to APIM Management API → returns debug token
3. **Send API Request**: POST to APIM with `Apim-Debug-Authorization` header → response includes `Apim-Trace-Id`
4. **Fetch Trace**: POST to APIM Management API with trace ID → returns full policy execution trace

Steps 1-2 and 4 hit the **Azure Management API** which has CORS restrictions and requires client secrets. These cannot safely run in the browser. A lightweight local Express proxy handles this.

### How debug tracing works (from the existing repo)

The repo's `debug-tracing-tests.http` demonstrates this exact flow. The proxy replicates it programmatically:
- Management token: `POST https://login.microsoftonline.com/{tenant}/oauth2/token` with client credentials
- Debug credentials: `POST https://management.azure.com{apim-resource-id}/gateways/managed/listDebugCredentials`
- The actual API call is sent to the APIM gateway endpoint with the debug token attached
- Trace retrieval: `POST https://management.azure.com{apim-resource-id}/gateways/managed/listTrace`

### Pipeline Stages — Simplified for General Audiences

The visualizer maps APIM policy fragments to **plain-language pipeline stages**:

| Stage Label (shown in UI) | What it does (tooltip) | APIM Fragment |
|---|---|---|
| 📋 **Load Config** | Loads gateway routing rules | metadata-config + central-cache-manager |
| 🔍 **Parse Request** | Identifies the AI model and API type | request-processor |
| 🔐 **Authenticate** | Verifies your identity (API key or token) | security-handler |
| 🎯 **Select Model** | Picks the right AI model and region | backend-selector |
| 🛤️ **Build Route** | Constructs the path to the AI service | path-builder |
| ⚖️ **Check Rate Limit** | Ensures you're within usage limits | token-limiter |
| 📊 **Log Usage** | Records token consumption metrics | token-logger |
| 🤖 **Call AI Model** | Sends your prompt to the AI service | forward-request |
| 🏷️ **Add Metadata** | Attaches diagnostic info to the response | diagnostic-headers |

Each stage shows:
- A **simple icon + label** (no APIM jargon visible by default)
- **Execution time** in milliseconds
- **Color animation** (grey → blue → green) as the request flows through
- **Expandable detail** (click to see the technical APIM fragment name and variables)

### Response Info (shown in plain language)

Instead of raw UAIG-* headers, the UI translates them:
- "**Model:** GPT-4.1-mini" (from UAIG-Model-ID)
- "**Region:** East US" (from backend routing trace)
- "**Tier:** Standard" (from UAIG-Model-Tier)  
- "**Auth:** API Key" (from UAIG-Auth-Type)
- "**Tokens:** 12 in → 38 out" (from X-Prompt-Tokens / X-Completion-Tokens)
- "**Total Time:** 258ms" (from trace timing)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser (React + Vite)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Pipeline Flow │  │  Execution   │  │  Backend  │ │
│  │   Diagram     │  │  Timeline    │  │   Map     │ │
│  │  (react-flow) │  │  (waterfall) │  │ (regions) │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         └─────────────┬────┘               │        │
│                       ▼                    │        │
│              useTraceRequest()  ◄───────────┘       │
└───────────────────────┬─────────────────────────────┘
                        │ POST /api/trace-request
                        ▼
┌─────────────────────────────────────────────────────┐
│  Express Proxy Server (localhost:3001)               │
│                                                     │
│  1. Get management token (Azure AD)                 │
│  2. Get debug credentials (APIM Management API)     │
│  3. Forward request to APIM + debug token           │
│  4. Fetch trace data (APIM Management API)          │
│  5. Return combined { response, trace, headers }    │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
            ┌─────────────────────┐
            │  APIM Gateway       │
            │  (deployed by azd)  │
            └─────────────────────┘
```

## Visual Design Philosophy

### Theme: "Packet Journey"

The core visual metaphor is a **glowing packet** (representing the user's request) traveling through a series of **checkpoint stations** (pipeline stages). Think of it like watching a package get scanned through airport security — each station lights up, processes, and passes it along.

**Dark theme** with vibrant accent colors:
- **Background**: Dark slate (#0f172a) — makes the glowing elements pop
- **Idle stations**: Soft grey outlines with subtle glow
- **Active station**: Bright cyan/blue pulse animation — "processing now"
- **Completed station**: Green glow with checkmark — "passed through"
- **The packet**: An animated glowing orb that visually moves between stations along the connecting edges
- **Edges/connections**: Subtle dotted lines that "light up" as the packet travels along them

### Animation Sequence

When the user sends a request:
1. The **packet orb** appears at the top of the pipeline
2. It **animates down** to the first station (Load Config), which pulses blue
3. After the station processes (real timing), it turns green ✓ and the packet moves to the next
4. This continues through all 9 stages — the viewer can **watch their request travel**
5. The longest pause is at "Call AI Model" — the orb waits there visibly while the AI thinks
6. On the return trip, the response flows back up, "Add Metadata" lights up, and the AI response appears

The animation speed is based on **real execution times** from the trace but with a minimum animation duration so very fast stages (~1ms) are still visible.

### UI Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🚀 AI Gateway Pipeline Explorer                       [? How it works]    │
│                                                                             │
│  ┌─ Ask an AI Model ──────────────────────────────────────────────────────┐ │
│  │  [GPT-4.1 ▾] [GPT-4.1-mini ▾] [Phi-4 ▾] [Gemini ▾]   [🏁 Race All] │ │
│  │  ┌──────────────────────────────────────────────────────┐  [Send ▶]   │ │
│  │  │ What is the meaning of life?                         │             │ │
│  │  └──────────────────────────────────────────────────────┘             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ Request Journey ────────────────────┬─ Results ────────────────────────┐│
│  │                                      │                                  ││
│  │    ╭──────────────╮                  │  ┌─ AI Response ──────────────┐  ││
│  │    │ 📋 Load       │                  │  │                            │  ││
│  │    │    Config  ✓  │ 3.2ms           │  │  "The meaning of life is   │  ││
│  │    ╰──────┬───────╯                  │  │   a philosophical question │  ││
│  │           │                          │  │   that has been..."        │  ││
│  │    ╭──────▼───────╮                  │  │                            │  ││
│  │    │ 🔍 Parse      │                  │  └────────────────────────────┘  ││
│  │    │    Request ✓  │ 4.5ms           │                                  ││
│  │    ╰──────┬───────╯                  │  ┌─ Journey Stats ────────────┐  ││
│  │           │                          │  │ 🤖 Model: GPT-4.1-mini     │  ││
│  │    ╭──────▼───────╮                  │  │ 🌍 Region: East US         │  ││
│  │    │ 🔐 Authen-    │                  │  │ ⭐ Tier: Standard          │  ││
│  │    │    ticate  ✓  │ 1.1ms           │  │ 🔑 Auth: API Key           │  ││
│  │    ╰──────┬───────╯                  │  │ 📊 Tokens: 12 → 38        │  ││
│  │           │                          │  │ ⏱️ Total: 258ms            │  ││
│  │    ╭──────▼───────╮                  │  └────────────────────────────┘  ││
│  │    │ 🎯 Select     │                  │                                  ││
│  │    │    Model   ●  │ ← processing    │  ┌─ Speed Breakdown ──────────┐  ││
│  │    ╰──────┬───────╯                  │  │ ▰▰ Load Config      3.2ms  │  ││
│  │           │                          │  │ ▰▰▰ Parse Request   4.5ms  │  ││
│  │    ╭──────▼───────╮                  │  │ ▰ Authenticate      1.1ms  │  ││
│  │    │ 🛤️ Build      │                  │  │ ▰ Select Model      0.8ms  │  ││
│  │    │    Route      │                  │  │ ▰ Build Route       0.5ms  │  ││
│  │    ╰──────┬───────╯                  │  │ ▰▰ Rate Limit       1.5ms  │  ││
│  │           │                          │  │ ▰▰▰▰▰▰▰▰▰▰▰▰ AI   245ms  │  ││
│  │    ╭──────▼───────╮                  │  │ ▰ Add Metadata      0.3ms  │  ││
│  │    │ ⚖️ Check      │                  │  │ ──────────────────────────  │  ││
│  │    │  Rate Limit   │                  │  │ Gateway overhead: 5% ✨     │  ││
│  │    ╰──────┬───────╯                  │  └────────────────────────────┘  ││
│  │           │                          │                                  ││
│  │    ╭──────▼───────╮                  │                                  ││
│  │    │ 🤖 Call AI    │                  │                                  ││
│  │    │    Model      │ ← 245ms         │                                  ││
│  │    ╰──────┬───────╯                  │                                  ││
│  │           │                          │                                  ││
│  │    ╭──────▼───────╮                  │                                  ││
│  │    │ 🏷️ Add        │                  │                                  ││
│  │    │  Metadata     │                  │                                  ││
│  │    ╰──────────────╯                  │                                  ││
│  │                                      │                                  ││
│  └──────────────────────────────────────┴──────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Gamification: Model Race Mode

The primary gamification feature. Click **"Race All"** to send the **same prompt** to all 4 models simultaneously. The UI shows 4 parallel pipeline visualizations racing side by side. Each model's packet races through the pipeline, and you see:

- Which model's pipeline completes first
- A "finish line" animation with 🥇🥈🥉 rankings
- Comparison card showing: speed, tokens used, response text side-by-side
- "Fastest Gateway Processing" vs "Fastest AI Response" — separating gateway overhead from model thinking time

This is the **demo showstopper** — it visually demonstrates that one gateway handles multiple AI providers simultaneously.

## File Structure

```
Frontend/
├── package.json                    # Dependencies: react, @xyflow/react, framer-motion, vite, express, etc.
├── vite.config.ts                  # Vite config with proxy to Express server
├── tsconfig.json                   # TypeScript configuration
├── .env.example                    # Template for required environment variables
├── .gitignore                      # Node modules, dist, .env
│
├── server/                         # Express proxy server
│   ├── index.ts                    # Server entry point (port 3001)
│   ├── routes/
│   │   └── trace.ts                # /api/trace-request endpoint
│   ├── services/
│   │   ├── auth.ts                 # Azure AD token acquisition
│   │   ├── debugTracing.ts         # Debug credential + trace retrieval
│   │   └── apimProxy.ts           # APIM request forwarding
│   └── types/
│       └── index.ts                # Server-side type definitions
│
├── src/                            # React frontend
│   ├── main.tsx                    # App entry point
│   ├── App.tsx                     # Main layout
│   ├── index.css                   # Global styles (dark theme, glow effects)
│   │
│   ├── components/
│   │   ├── PipelineFlow/
│   │   │   ├── PipelineFlow.tsx    # react-flow pipeline diagram
│   │   │   ├── StageNode.tsx       # Custom node with icon, label, status, timing
│   │   │   ├── PacketOrb.tsx       # Animated glowing orb that travels between nodes
│   │   │   └── pipelineConfig.ts   # Node/edge definitions + stage metadata
│   │   ├── RequestBar/
│   │   │   └── RequestBar.tsx      # Model selector chips + prompt input + Race All button
│   │   ├── ResponsePanel/
│   │   │   └── ResponsePanel.tsx   # AI response text
│   │   ├── JourneyStats/
│   │   │   └── JourneyStats.tsx    # Model, region, tier, auth, tokens, total time
│   │   ├── SpeedBreakdown/
│   │   │   └── SpeedBreakdown.tsx  # Horizontal bar chart + gateway overhead %
│   │   └── ModelRace/
│   │       ├── ModelRace.tsx       # 4 parallel mini-pipelines racing
│   │       └── RaceResults.tsx     # 🥇🥈🥉 rankings + comparison cards
│   │
│   ├── hooks/
│   │   └── useTraceRequest.ts      # Hook: send request → get response + trace
│   │
│   ├── types/
│   │   └── index.ts                # Frontend TypeScript types
│   │
│   └── utils/
│       ├── traceParser.ts          # Parse APIM trace JSON into visualization data
│       └── overheadCalc.ts         # Calculate gateway overhead % from trace timing
│
└── public/
    └── favicon.svg
```

## Environment Variables

The frontend reads from `Frontend/.env` using the standard `dotenv` package. This file is **auto-generated** by the `azd` post-provision hook (`Scripts/set-environment-variables.ps1`) — no manual setup is needed after `azd up`.

If the file is missing, copy `Frontend/.env.example` and fill in values manually from `.vscode/settings.json`.

```env
# Auto-generated by azd post-provision hook
VITE_APIM_GATEWAY_URL=https://{apim-name}.azure-api.net/unified-ai
APIM_SUBSCRIPTION_KEY={subscription-key}
APIM_RESOURCE_ID=/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ApiManagement/service/{name}
TENANT_ID={tenant-id}
ENTRA_APP_ID={client-id}
ENTRA_APP_CLIENT_SECRET={client-secret}
```

> **Security:** `Frontend/.env` is gitignored (root `.gitignore` + `Frontend/.gitignore`) — secrets are never committed. Only `VITE_*` prefixed vars are exposed to the browser. Server-side secrets are only accessed by the Express proxy.

## Todos

1. **project-scaffold** — Initialize React + Vite + TypeScript project in `Frontend/` with package.json, vite config, tsconfig, dark-theme CSS foundation
2. **express-proxy** — Build Express proxy server with routes for Azure AD auth, debug credentials, APIM request forwarding, and trace retrieval
3. **trace-parser** — Create utility to parse APIM debug trace JSON into structured pipeline execution data (stage names, timing, variables) + overhead calculator
4. **pipeline-flow** — Build react-flow pipeline diagram with custom StageNode components (icon, label, timing) and animated PacketOrb that travels between stages with glow effects
5. **request-bar** — Build top request bar with model selector chips (GPT-4.1, GPT-4.1-mini, Phi-4, Gemini), prompt input, Send button, and Race All button
6. **response-panel** — Build response display showing AI response text + Journey Stats (model, region, tier, auth, tokens, time) in plain language + speed breakdown chart with gateway overhead %
7. **model-race** — Build Race Mode: 4 parallel mini-pipeline animations racing side by side with 🥇🥈🥉 finish line rankings and comparison cards
8. **integration** — Wire all components together: useTraceRequest hook, state management, animation sequencing, race mode orchestration
9. **env-setup** — Create .env.example, .gitignore, README for the Frontend directory with setup instructions
10. **documentation** — Update root README.md to mention the Pipeline Explorer and link to Frontend/README.md

## Step-by-Step Implementation Plan

### Phase 1: Foundation (Todos 1-2)

**Step 1.1 — Project Scaffold**
- Create `Frontend/` directory
- Run `npm create vite@latest . -- --template react-ts` to scaffold React + TypeScript
- Install dependencies: `@xyflow/react`, `framer-motion`, `express`, `cors`, `tsx`, `dotenv`, `@types/express`, `@types/cors`
- Configure `vite.config.ts` with dev server proxy: `/api` → `http://localhost:3001`
- Set up `index.css` with dark theme base styles (slate background, font, glow CSS utilities)
- Add `package.json` scripts: `dev` (Vite), `server` (Express via tsx), `dev:all` (both concurrently)

**Step 1.2 — Express Proxy Server**
- Create `server/index.ts` — Express app on port 3001 with CORS enabled
- Create `server/services/auth.ts` — `getManagementToken()` function:
  - POST to `https://login.microsoftonline.com/{tenant}/oauth2/token`
  - Body: `grant_type=client_credentials&client_id={id}&client_secret={secret}&resource=https://management.azure.com/`
  - Cache token until expiry
- Create `server/services/debugTracing.ts` — `getDebugCredentials()` and `getTrace()` functions:
  - `getDebugCredentials()`: POST to `management.azure.com/.../listDebugCredentials`
  - `getTrace(traceId)`: POST to `management.azure.com/.../listTrace`
- Create `server/services/apimProxy.ts` — `sendTracedRequest()` function:
  - Constructs APIM request from model + prompt
  - Attaches `Apim-Debug-Authorization` header
  - Extracts `Apim-Trace-Id` from response headers
- Create `server/routes/trace.ts` — `POST /api/trace-request` endpoint:
  - Accepts: `{ model, prompt, maxTokens }`
  - Orchestrates: auth → debug creds → send request → fetch trace
  - Returns: `{ response, trace, headers }`

**🔍 Phase 1 Validation:**
- Run `npm run build` in Frontend/ — verify TypeScript compiles with zero errors
- Run `npm run dev` — verify Vite dev server starts and shows dark-themed page
- Start Express server — verify it starts on port 3001 without errors
- ⚠️ Note: Cannot test proxy against live APIM without .env credentials, but server should start and return appropriate "config missing" error for unconfigured requests

---

### Phase 2: Core Components (Todos 3-6, parallelizable)

**Step 2.1 — Trace Parser**
- Create `src/utils/traceParser.ts`
- Parse `traceEntries.inbound` array, looking for `include-fragment` entries with "Entering"/"Leaving" messages
- Calculate per-fragment duration from `elapsed` fields (format: `HH:MM:SS.nnnnnnn`)
- Map APIM fragment names to plain-language stage labels
- Parse `traceEntries.backend` for `forward-request` timing and backend pool selection
- Create `src/utils/overheadCalc.ts` — subtract AI call time from total time
- Output: `StageResult[]` with `{ id, label, icon, fragmentName, durationMs, status, details }`

**Step 2.2 — Pipeline Flow Diagram**
- Create `src/components/PipelineFlow/pipelineConfig.ts` — define 9 stage nodes with positions, labels, icons
- Create `src/components/PipelineFlow/StageNode.tsx` — custom react-flow node:
  - Shows icon + label + timing badge
  - Three visual states: `idle` (grey border), `active` (blue pulse + glow), `complete` (green + ✓)
  - Click to expand → shows APIM fragment name + context variables
  - Uses `framer-motion` for state transitions
- Create `src/components/PipelineFlow/PacketOrb.tsx` — animated glowing circle:
  - Positioned absolutely, animates between node positions using framer-motion `animate`
  - Glow effect via CSS `box-shadow` with cyan color
- Create `src/components/PipelineFlow/PipelineFlow.tsx` — react-flow canvas:
  - Renders nodes and edges
  - Accepts `stageResults` prop and animates through stages sequentially
  - Edge animation: dotted lines "light up" as packet passes

**Step 2.3 — Request Bar**
- Create `src/components/RequestBar/RequestBar.tsx`
- Model selector: 4 chip/pill buttons (GPT-4.1, GPT-4.1-mini, Phi-4, Gemini) — selected state = filled, others = outlined
- Prompt input: textarea with placeholder "Ask the AI anything..."
- Send button: ▶ icon, disabled during request
- Race All button: 🏁 icon, sends to all 4 models
- Props: `onSend(model, prompt)`, `onRaceAll(prompt)`, `isLoading`

**Step 2.4 — Response Panel + Journey Stats + Speed Breakdown**
- Create `src/components/ResponsePanel/ResponsePanel.tsx` — shows AI response text with typing effect
- Create `src/components/JourneyStats/JourneyStats.tsx` — card with:
  - 🤖 Model, 🌍 Region, ⭐ Tier, 🔑 Auth, 📊 Tokens (in → out), ⏱️ Total time
  - All from parsed UAIG-* headers and trace data
- Create `src/components/SpeedBreakdown/SpeedBreakdown.tsx`:
  - Horizontal bars for each stage, width proportional to duration
  - Animated expansion using framer-motion
  - "Gateway overhead: X% (Yms)" gauge at the bottom

**🔍 Phase 2 Validation:**
- Run `npm run build` — verify all new components compile with zero TypeScript errors
- Run `npm run dev` — verify app renders with all components visible (using mock/placeholder data)
- Visual check: pipeline diagram shows 9 stages, request bar shows model chips, response panel renders

---

### Phase 3: Model Race (Todo 7)

**Step 3.1 — Race Mode**
- Create `src/components/ModelRace/ModelRace.tsx`:
  - 4 column layout, each with a mini version of the pipeline flow
  - Each column has a model label at top + pipeline stages as compact nodes
  - Animated independently based on each model's trace data
  - "Finish line" at bottom — first model to complete gets 🥇
- Create `src/components/ModelRace/RaceResults.tsx`:
  - Rankings: 🥇🥈🥉 with model name + total time
  - Comparison table: model, gateway time, AI time, total time, tokens
  - Side-by-side response text
- Proxy handles 4 parallel `trace-request` calls
- Handle 429 errors: show "Rate Limited" state with explanation

**🔍 Phase 3 Validation:**
- Run `npm run build` — zero TypeScript errors
- Run `npm run dev` — race mode renders 4 columns with mini-pipelines

---

### Phase 4: Integration (Todo 8)

**Step 4.1 — Wire Everything Together**
- Create `src/hooks/useTraceRequest.ts`:
  - `sendRequest(model, prompt)` → calls proxy → returns `TraceResult`
  - `raceModels(prompt)` → calls proxy 4x in parallel → returns `TraceResult[]`
  - State: `isLoading`, `result`, `error`
- Build `App.tsx` layout:
  - Top: `RequestBar`
  - Middle-left: `PipelineFlow` (single mode) or `ModelRace` (race mode)
  - Middle-right: `ResponsePanel` + `JourneyStats` + `SpeedBreakdown`
- Animation sequencing:
  - Request sent → pipeline starts animating
  - Trace data returns → stages light up with real timing
  - AI response appears → response panel fills in

**🔍 Phase 4 Validation:**
- Run `npm run build` — zero TypeScript errors
- Run `npm run dev` — full app layout renders correctly, all components connected
- Verify: clicking Send with mock data triggers pipeline animation flow

---

### Phase 5: Polish (Todos 9-10)

**Step 5.1 — Environment + Config**
- Create `.env.example` with all required variables and comments
- Create `.gitignore` (node_modules, dist, .env)
- Create `Frontend/README.md` with: prerequisites, setup instructions, how to get env vars from azd, how to run

**Step 5.2 — Documentation**
- Update root `README.md` to mention the Pipeline Explorer
- Add section with screenshot placeholder
- Link to `Frontend/README.md` for detailed setup

**🔍 Phase 5 Validation:**
- Run `npm run build` — final clean build with zero errors/warnings
- Verify `.env.example` contains all required variables with descriptive comments
- Verify `Frontend/README.md` has complete setup instructions
- Verify NO existing files outside `Frontend/` were modified (except root README.md documentation update)

## Progress Tracker

Copilot will update this table after completing each phase during implementation. Each row shows the phase, its status, and the validation result.

| Phase | Status | Validation Result |
|---|---|---|
| Phase 1: Foundation | ✅ Complete | `npm run build` passes, Express server starts |
| Phase 2: Core Components | ✅ Complete | `tsc --noEmit` zero errors, all 16 source files created |
| Phase 3: Model Race | ✅ Complete | ModelRace.tsx + RaceResults.tsx compile clean |
| Phase 4: Integration | ✅ Complete | App.tsx wired, `npm run build` passes (601 modules, 2.93s) |
| Phase 5: Polish | ✅ Complete | .env.example, README.md, PLAN.md all created |

## Key Design Decisions

- **Purely additive** — ZERO changes to existing repo files. Only adds `Frontend/` directory + root README update.
- **"Packet Journey" visual metaphor** — a glowing orb traveling through checkpoint stations. Universally understandable, no domain knowledge required.
- **Plain-language labels** — "Authenticate" not "security-handler". Technical fragment names only on click/expand.
- **Dark theme with glow** — Makes the animation pop and looks modern/polished for demos.
- **Model Race as gamification feature** — Instantly engaging, demonstrates multi-model routing, and gives people a reason to keep interacting.
- **Gateway overhead score** — Prominently answers the #1 question: "does the gateway add much latency?"
- **Local dev tool only** (not deployed via azd) — keeps infrastructure simple for now; can add Azure Static Web Apps later
- **Express proxy** handles all Azure Management API calls — avoids CORS issues and keeps secrets server-side
- **react-flow** for the pipeline diagram — purpose-built for node/edge diagrams, supports custom nodes and animations
- **Debug tracing as primary data source** — provides real execution data including timing, not simulated
- **TypeScript throughout** — type safety for trace data structures which are complex

## Open Questions / Risks

- ~~**APIM debug trace format**~~: **RESOLVED** — Full trace sample saved to `files/sample-trace.json`. The trace parser can extract fragment timings by parsing `include-fragment` entries with "Entering"/"Leaving" messages and computing duration from `elapsed` fields.
- **Debug token lifetime**: Debug tokens have limited lifetime. The proxy should handle token refresh gracefully.
- **Streaming requests**: Debug tracing may not work with streaming (`"stream": true`). The visualizer may need to fall back to diagnostic headers only for streaming requests.
- **Race mode concurrency**: Sending 4 parallel traced requests may exceed rate limits. The proxy should handle 429 responses gracefully and show "rate limited" in the race UI as a teachable moment.

## Debug Trace Format Reference

The APIM debug trace JSON has this structure (from real trace data captured from the deployed sample):

```json
{
  "serviceName": "apim-service-name",
  "traceId": "8ba352d4-...",
  "traceEntries": {
    "inbound": [ ...entries... ],
    "backend": [ ...entries... ],
    "outbound": [ ...entries... ]
  }
}
```

Each trace entry has:
```json
{
  "source": "include-fragment" | "set-variable" | "choose" | "forward-request" | ...,
  "timestamp": "2026-03-02T20:02:00.3306601Z",
  "elapsed": "00:00:00.0183884",
  "data": "Entering policy fragment 'metadata-config'" | { ...object... }
}
```

**Key parsing strategy for timing:**

Fragment boundaries are marked by `include-fragment` entries:
- `"data": "Entering policy fragment 'metadata-config'"` — fragment start
- `"data": "Leaving policy fragment 'metadata-config'"` — fragment end
- Duration = leaving `elapsed` minus entering `elapsed` (both are cumulative from request start)

Backend call timing comes from `forward-request` entries in the `backend` array.

The trace parser will extract these enter/leave pairs and compute per-fragment durations in milliseconds.
