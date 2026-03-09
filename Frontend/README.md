# AI Gateway Pipeline Explorer — Frontend

A React + TypeScript single-page application that visualises how an API request travels through the [Unified AI Gateway](../README.md) pipeline. It connects to a local Express proxy which communicates with Azure APIM using debug tracing, then renders each policy fragment's execution as an interactive, animated pipeline flow diagram.

## Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [File Structure](#file-structure)
- [Components](#components)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [How It Works](#how-it-works)

---

## Features

| Feature | Description |
|---|---|
| **Pipeline flow diagram** | 9-stage animated flow built with React Flow (`@xyflow/react`), driven by real APIM debug trace data |
| **Packet animation** | A glowing orb travels between pipeline nodes as each stage completes |
| **Model Race mode** | Send the same prompt to all 4 models simultaneously and compare side-by-side results |
| **Journey stats panel** | Displays model, region, tier, auth type, and token usage for each response |
| **Speed breakdown** | Per-stage timing bar chart with gateway overhead percentage |
| **Response panel** | Rendered AI response with a loading skeleton during in-flight requests |
| **Error banner** | Dismissible error display for network or APIM errors |
| **Dark theme** | Slate/blue dark colour scheme with neon glow effects |

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | [React 19](https://react.dev/) |
| Build tool | [Vite 7](https://vite.dev/) |
| Language | [TypeScript 5.9](https://www.typescriptlang.org/) |
| Flow diagram | [@xyflow/react 12](https://reactflow.dev/) |
| Animations | [Framer Motion 12](https://motion.dev/) |
| Proxy server | [Express 5](https://expressjs.com/) |
| Concurrency | [concurrently](https://github.com/open-cli-tools/concurrently) |
| Linter | ESLint 9 with TypeScript and React-Hooks plugins |

---

## Architecture

```
┌────────────────────────────────┐
│  Browser (localhost:5173)      │
│                                │
│  React + Vite SPA              │
│  ┌─────────────────────────┐   │
│  │  RequestBar             │   │
│  │  PipelineFlow / Race    │   │
│  │  ResponsePanel          │   │
│  │  JourneyStats           │   │
│  │  SpeedBreakdown         │   │
│  └───────────┬─────────────┘   │
└──────────────│─────────────────┘
               │  POST /api/trace (fetch)
               ▼
┌────────────────────────────────┐
│  Express Proxy (localhost:3001)│
│                                │
│  1. Acquire Azure AD token     │
│  2. Request debug trace creds  │
│  3. Send traced APIM request   │
│  4. Retrieve trace + response  │
└───────────────┬────────────────┘
                │  HTTPS
                ▼
┌────────────────────────────────┐
│  Azure API Management          │
│  (your deployed gateway)       │
└────────────────────────────────┘
```

- **React + Vite frontend** (port 5173) — renders the pipeline visualisation and handles all user interaction. Proxies `/api` calls to the Express server via Vite's built-in proxy.
- **Express proxy server** (port 3001) — authenticates with Azure AD, acquires APIM debug trace credentials, submits the traced request, and returns the parsed trace alongside the AI response. The proxy is required because the Azure Management API enforces CORS and requires client secrets that must not be exposed in the browser.

---

## File Structure

```
Frontend/
├── index.html                  # HTML entry point
├── package.json
├── vite.config.ts              # Vite config — proxies /api → localhost:3001
├── tsconfig.json               # Root TypeScript config
├── tsconfig.app.json           # Browser build config
├── tsconfig.node.json          # Node/server build config
├── eslint.config.js
├── .env.example                # Environment variable template
│
├── server/                     # Express proxy server (Node.js / TypeScript)
│   ├── index.ts                # Server entry point, route registration
│   ├── routes/                 # Express route handlers
│   ├── services/               # Azure AD auth, APIM trace, request logic
│   └── types/                  # Server-side TypeScript types
│
└── src/                        # React SPA
    ├── main.tsx                # App bootstrap (ReactDOM.createRoot)
    ├── App.tsx                 # Root layout — composes all panels
    ├── index.css               # Global dark-theme styles
    │
    ├── components/
    │   ├── PipelineFlow/       # Animated pipeline diagram
    │   │   ├── PipelineFlow.tsx      # React Flow canvas + animation logic
    │   │   ├── StageNode.tsx         # Custom node: icon, label, status, timing
    │   │   ├── PacketOrb.tsx         # Animated glowing orb travelling between nodes
    │   │   └── pipelineConfig.ts     # Stage definitions, initial nodes/edges
    │   ├── ModelRace/
    │   │   ├── ModelRace.tsx         # Side-by-side race columns
    │   │   └── RaceResults.tsx       # Finished race result summary
    │   ├── RequestBar/
    │   │   └── RequestBar.tsx        # Model selector chips + prompt input + Send/Race buttons
    │   ├── ResponsePanel/
    │   │   └── ResponsePanel.tsx     # AI response display with loading skeleton
    │   ├── JourneyStats/
    │   │   └── JourneyStats.tsx      # Model, region, tier, auth, token stats
    │   └── SpeedBreakdown/
    │       └── SpeedBreakdown.tsx    # Per-stage timing bars + overhead %
    │
    ├── hooks/
    │   └── useTraceRequest.ts  # Core data-fetching hook: single request + race
    │
    ├── types/
    │   └── index.ts            # Shared TypeScript types
    │
    └── utils/                  # Shared utility functions
```

---

## Components

### `RequestBar`

The top control bar. Contains colour-coded model selector chips (GPT-4.1, GPT-4.1 Mini, Phi-4, Gemini Flash), a prompt textarea (supports Enter to submit, Shift+Enter for newline), a **Send** button for single-model requests, and a **🏁 Race All** button to trigger Race mode.

### `PipelineFlow`

The main left-panel component. Renders a vertical React Flow canvas with 9 nodes corresponding to the APIM policy fragment pipeline stages:

| Stage | Fragment | Description |
|---|---|---|
| Load Config | `metadata-config` + `central-cache-manager` | Loads gateway routing rules |
| Parse Request | `request-processor` | Identifies AI model and API type |
| Authenticate | `security-handler` | Verifies identity (API key or JWT) |
| Select Model | `backend-selector` | Picks AI model and region |
| Build Route | `path-builder` | Constructs the path to the AI service |
| Check Rate Limit | `token-limiter` | Enforces token usage limits |
| Log Usage | `token-logger` | Records token consumption metrics |
| Call AI Model | `forward-request` | Sends prompt to the AI service |
| Add Metadata | `diagnostic-headers` | Attaches diagnostic info to response |

Each `StageNode` shows an icon, label, policy fragment name, execution status (idle / active / complete / error), and duration in milliseconds once complete. A `PacketOrb` animates between nodes as the request progresses.

### `ModelRace`

Replaces `PipelineFlow` in the left panel when Race mode is active. Shows a column per model, each containing its own mini pipeline, and updates in real time as model responses arrive.

### `RaceResults`

Displayed below the main content after a race completes. Shows each model's finish position, response content, and timing.

### `ResponsePanel`

Right-panel component. Shows a loading skeleton while a request is in flight, then renders the AI response text. Supports both single-model and Race (first successful result) modes.

### `JourneyStats`

Right-panel component. Displays a stat grid: model name, region, tier (premium/standard), auth type (API key or JWT), prompt tokens, completion tokens, total tokens, total time (ms), and gateway overhead (ms and %).

### `SpeedBreakdown`

Right-panel component. Renders a horizontal bar chart of per-stage durations and highlights the gateway overhead as a percentage of total time.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- An Azure deployment of the Unified AI Gateway sample — run `azd up` from the repository root before starting the frontend
- The following values from your deployment, which the `azd` post-provision hook writes to `Frontend/.env` automatically:
  - APIM Gateway URL
  - APIM Subscription Key
  - APIM Resource ID
  - Azure Entra ID credentials (Tenant ID, App ID, Client Secret)

---

## Setup

1. Navigate to the `Frontend` directory:

   ```bash
   cd Frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Confirm that `Frontend/.env` exists.

   **If you ran `azd up` or `azd provision`:** the post-provision hook (`Scripts/set-environment-variables.ps1`) auto-generates this file from Terraform outputs and resolved Key Vault secrets — no manual steps needed.

   **If the file is missing**, copy the example and fill in the values manually:

   ```bash
   cp .env.example .env
   ```

   The required values are available in `.vscode/settings.json` after running `azd provision` or `azd up` from the repository root.

   > **Note:** `Frontend/.env` is gitignored in both the root and `Frontend` `.gitignore` files. It contains secrets and is never committed to source control.

4. Start the development servers:

   ```bash
   npm run dev:all
   ```

   This starts both the Vite dev server (port 5173) and the Express proxy server (port 3001) concurrently.

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server only (port 5173) |
| `npm run server` | Start Express proxy server only (port 3001) |
| `npm run dev:all` | Start both concurrently (**recommended**) |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run ESLint across `src/` and `server/` |
| `npm run preview` | Preview the production build locally |

---

## Environment Variables

All environment variables are read from `Frontend/.env`. Copy `.env.example` to `.env` and populate the values, or let the `azd` post-provision hook generate the file automatically.

| Variable | Required | Exposed to Browser | Description |
|---|---|---|---|
| `VITE_APIM_GATEWAY_URL` | Yes | ✅ Yes | APIM gateway base URL (e.g. `https://your-apim.azure-api.net/unified-ai`) |
| `APIM_SUBSCRIPTION_KEY` | Yes | ❌ No | APIM subscription key for API access |
| `APIM_RESOURCE_ID` | Yes | ❌ No | Full Azure resource ID of the APIM instance |
| `TENANT_ID` | Yes | ❌ No | Azure Entra ID (Azure AD) tenant ID |
| `ENTRA_APP_ID` | Yes | ❌ No | Entra ID app registration client ID |
| `ENTRA_APP_CLIENT_SECRET` | Yes | ❌ No | Entra ID app registration client secret |

> **Security note:** Only variables prefixed with `VITE_` are bundled into the browser build. All other variables are used exclusively by the Express proxy server and are never exposed to the client.

---

## How It Works

```
User types prompt
      │
      ▼
RequestBar sends POST /api/trace  ──────────────────────────────────┐
      │                                                              │
      ▼                                                              │
useTraceRequest hook updates isLoading = true                       │
PipelineFlow shows "active" animation on first stage                │
      │                                                              │
      ▼                                                              ▼
Express proxy (server/index.ts)                            Express proxy
  1. GET Azure AD token (MSAL / client_credentials)
  2. POST to Azure Management API → acquire debug trace credentials
  3. POST request to APIM with debug trace header
  4. GET trace from Azure Management API
  5. Parse trace → extract per-fragment durations + AI response
      │
      ▼
Response returned to browser as { response, stages, journeyStats }
      │
      ├─▶ PipelineFlow animates each stage sequentially using stage durations
      ├─▶ ResponsePanel renders AI response text
      ├─▶ JourneyStats populates stat grid
      └─▶ SpeedBreakdown renders per-stage timing bars
```

In **Race mode** (`🏁 Race All`), the same flow runs for all 4 models in parallel via `Promise.allSettled`. `ModelRace` renders a live column per model, and `RaceResults` summarises finish positions once all responses settle.

---

> **Note:** This is a **local development tool** for demos and learning. It is **not** deployed as part of `azd up` infrastructure. It runs locally and connects to an already-deployed APIM gateway as a consumer.
