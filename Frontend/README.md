# AI Gateway Pipeline Explorer

A visual demo showing how your API request travels through the Unified AI Gateway pipeline, from authentication to AI model invocation and back. Built with React, Vite, and TypeScript, it uses real APIM debug trace data to render a live pipeline flow diagram.

## Features

- **Real-time pipeline visualization** using actual APIM debug trace data
- **9-stage pipeline flow diagram** with animated "packet journey" through each policy fragment
- **Model Race mode** — race all 4 AI models simultaneously (GPT-4.1, GPT-4.1 Mini, Phi-4, Gemini Flash)
- **Journey stats** — model, region, tier, auth type, and token usage
- **Speed breakdown** — per-stage timing with gateway overhead percentage
- **Dark theme** with glow effects

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- An Azure deployment of the Unified AI Gateway sample (provisioned via `azd up` from the repository root)
- The following values from your deployment (populated in `.vscode/settings.json` after `azd` post-provision):
  - APIM Gateway URL
  - APIM Subscription Key
  - APIM Resource ID
  - Azure Entra ID credentials (Tenant ID, App ID, Client Secret)

## Setup

1. Navigate to the Frontend directory:

   ```bash
   cd Frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Ensure `Frontend/.env` exists with your deployment values.

   **If you deployed with `azd up` or `azd provision`:** the post-provision hook auto-generates this file — no manual setup needed. The values are extracted from Terraform outputs and resolved Key Vault secrets.

   **If the file is missing**, copy the example and fill in your values manually:

   ```bash
   cp .env.example .env
   ```

   The required values can be found in `.vscode/settings.json` after running `azd provision` or `azd up` from the repository root.

   > **Note:** `Frontend/.env` is gitignored (both root and Frontend `.gitignore`) — it contains secrets and is never committed.

4. Start the development server:

   ```bash
   npm run dev:all
   ```

   This starts both the Vite dev server (port 5173) and the Express proxy server (port 3001) concurrently.

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Architecture

```
┌─────────────────────┐       ┌──────────────────────┐       ┌──────────────────┐
│  React + Vite App   │──────▶│  Express Proxy (3001) │──────▶│  Azure APIM GW   │
│  (localhost:5173)   │◀──────│  • Azure AD auth      │◀──────│  (your gateway)  │
│                     │       │  • Debug tracing       │       │                  │
└─────────────────────┘       └──────────────────────┘       └──────────────────┘
```

- **React + Vite frontend** (port 5173) — renders the pipeline visualization and handles user interaction.
- **Express.js proxy server** (port 3001) — handles Azure Management API authentication and APIM debug tracing. The proxy is necessary because the Azure Management API has CORS restrictions and requires client secrets that cannot be exposed in the browser.
- **Proxy orchestration flow:** Azure AD token acquisition → debug trace credentials → traced APIM request → trace retrieval and response.

## How It Works

1. You select an AI model and type a prompt.
2. The frontend sends the request to the local Express proxy.
3. The proxy authenticates with Azure AD, obtains debug tracing credentials, sends the request to APIM with debug tracing enabled, and retrieves the full execution trace.
4. The frontend visualizes the trace as a pipeline flow diagram showing each policy fragment's execution time.
5. In **Race mode**, all 4 models are queried simultaneously and race side-by-side.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server only |
| `npm run server` | Start Express proxy server only |
| `npm run dev:all` | Start both concurrently (**recommended**) |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## Environment Variables Reference

| Variable | Required | Exposed to Browser | Description | Source |
|---|---|---|---|---|
| `VITE_APIM_GATEWAY_URL` | Yes | Yes | APIM gateway base URL | Auto-generated from `apim_gateway_url` |
| `APIM_SUBSCRIPTION_KEY` | Yes | No | APIM subscription key for API access | Auto-generated from `apim_subscription_key` |
| `APIM_RESOURCE_ID` | Yes | No | Full Azure resource ID of the APIM instance | Auto-generated from `apim_resource_id` |
| `TENANT_ID` | Yes | No | Azure Entra ID (Azure AD) tenant ID | Auto-generated from `tenant_id` |
| `ENTRA_APP_ID` | Yes | No | Azure Entra ID app registration client ID | Auto-generated from `entra_app_id` |
| `ENTRA_APP_CLIENT_SECRET` | Yes | No | Azure Entra ID app registration client secret | Auto-generated from `entra_app_client_secret` |

> **Note:** Only variables prefixed with `VITE_` are exposed to the browser. All other variables are used exclusively by the Express proxy server. The `.env` file is auto-generated by the `azd` post-provision hook (`Scripts/set-environment-variables.ps1`). To regenerate, run `azd provision`.

## Note

This is a **local development tool** for demos and learning. It is **not** deployed as part of `azd up` infrastructure. It connects to an already-deployed APIM gateway as a consumer.
