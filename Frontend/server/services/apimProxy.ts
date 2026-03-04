interface TracedRequestResult {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  traceId: string;
  headers: Record<string, string>;
}

function buildRequestConfig(
  model: string,
  prompt: string,
  maxTokens: number,
  gatewayUrl: string
): { url: string; body: Record<string, unknown> } {
  const messages = [{ role: "user", content: prompt }];

  if (model === "phi-4") {
    // Azure AI Foundry inference API
    return {
      url: `${gatewayUrl}/models/chat/completions?api-version=2024-05-01-preview`,
      body: { model: "phi-4", messages, max_tokens: maxTokens },
    };
  }

  if (model === "gemini-2.5-flash-lite") {
    return {
      url: `${gatewayUrl}/v1beta/openai/chat/completions`,
      body: { model: "gemini-2.5-flash-lite", messages, max_tokens: maxTokens },
    };
  }

  // OpenAI-compatible models (gpt-4.1, gpt-4.1-mini, etc.)
  return {
    url: `${gatewayUrl}/openai/deployments/${model}/chat/completions?api-version=2025-01-01-preview`,
    body: { model, messages, max_tokens: maxTokens },
  };
}

export async function sendTracedRequest(
  model: string,
  prompt: string,
  maxTokens: number,
  debugToken: string
): Promise<TracedRequestResult> {
  const gatewayUrl = (process.env.VITE_APIM_GATEWAY_URL ?? "").replace(
    /\/$/,
    ""
  );
  const subscriptionKey = process.env.APIM_SUBSCRIPTION_KEY;

  if (!gatewayUrl || !subscriptionKey) {
    throw new Error(
      "Missing required env vars: VITE_APIM_GATEWAY_URL, APIM_SUBSCRIPTION_KEY"
    );
  }

  const { url, body } = buildRequestConfig(model, prompt, maxTokens, gatewayUrl);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": subscriptionKey,
      "Apim-Debug-Authorization": debugToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const traceId = response.headers.get("Apim-Trace-Id") ?? "";

  // Extract UAIG diagnostic headers
  const diagnosticHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith("uaig-")) {
      diagnosticHeaders[key] = value;
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `APIM request failed (${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  const content = data.choices?.[0]?.message?.content ?? "";
  const responseModel = data.model ?? model;
  const usage = data.usage
    ? {
        promptTokens: data.usage.prompt_tokens ?? 0,
        completionTokens: data.usage.completion_tokens ?? 0,
        totalTokens: data.usage.total_tokens ?? 0,
      }
    : undefined;

  return {
    content,
    model: responseModel,
    usage,
    traceId,
    headers: diagnosticHeaders,
  };
}
