export interface TraceRequestBody {
  model: string;
  prompt: string;
  maxTokens?: number;
}

export interface TraceResponse {
  response: {
    content: string;
    model: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  trace: unknown;
  headers: Record<string, string>;
  error?: string;
}

export interface CachedToken {
  token: string;
  expiresAt: number;
}
