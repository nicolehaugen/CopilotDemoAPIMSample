import { Router } from "express";
import type { Request, Response } from "express";
import type { TraceRequestBody, TraceResponse } from "../types/index.ts";
import { getManagementToken } from "../services/auth.ts";
import {
  getDebugCredentials,
  getTrace,
} from "../services/debugTracing.ts";
import { sendTracedRequest } from "../services/apimProxy.ts";

const router = Router();

router.post(
  "/api/trace-request",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { model, prompt, maxTokens } = req.body as TraceRequestBody;

      if (!model || !prompt) {
        res.status(400).json({ error: "model and prompt are required" });
        return;
      }

      const managementToken = await getManagementToken();
      const debugToken = await getDebugCredentials(managementToken);
      const result = await sendTracedRequest(
        model,
        prompt,
        maxTokens ?? 800,
        debugToken
      );

      const trace = await getTrace(managementToken, result.traceId);

      const response: TraceResponse = {
        response: {
          content: result.content,
          model: result.model,
          usage: result.usage,
        },
        trace,
        headers: result.headers,
      };

      res.json(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Trace request failed:", message);
      res.status(500).json({ error: message });
    }
  }
);

export default router;
