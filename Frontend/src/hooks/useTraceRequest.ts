import { useState, useCallback } from 'react';
import type { TraceResult, RaceResult, StageResult, JourneyStatsData } from '../types/index.ts';
import { parseTrace } from '../utils/traceParser.ts';
import { calculateOverhead, parseHeaders } from '../utils/overheadCalc.ts';

const MODELS_FOR_RACE = ['gpt-4.1', 'gpt-4.1-mini', 'phi-4', 'gemini-2.5-flash-lite'];

function buildTraceResult(data: {
  response: { content: string; model: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } };
  trace: unknown;
  headers: Record<string, string>;
}): TraceResult {
  const stages: StageResult[] = parseTrace(data.trace);
  const overhead = calculateOverhead(stages);
  const headerStats = parseHeaders(data.headers);

  const journeyStats: JourneyStatsData = {
    model: headerStats.model || data.response.model,
    region: headerStats.region,
    tier: headerStats.tier,
    authType: headerStats.authType,
    promptTokens: data.response.usage?.promptTokens ?? headerStats.promptTokens,
    completionTokens: data.response.usage?.completionTokens ?? headerStats.completionTokens,
    totalTokens: data.response.usage?.totalTokens ?? headerStats.totalTokens,
    totalTimeMs: overhead.totalTimeMs,
    gatewayOverheadMs: overhead.overheadMs,
    gatewayOverheadPercent: overhead.overheadPercent,
  };

  return {
    response: data.response,
    stages,
    journeyStats,
    rawTrace: data.trace,
  };
}

export function useTraceRequest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TraceResult | null>(null);
  const [raceResults, setRaceResults] = useState<RaceResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRaceMode, setIsRaceMode] = useState(false);

  const sendRequest = useCallback(async (model: string, prompt: string, maxTokens = 100) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setRaceResults(null);
    setIsRaceMode(false);

    try {
      const res = await fetch('/api/trace-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, maxTokens }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errBody.error || `Request failed: ${res.status}`);
      }

      const data = await res.json();
      const traceResult = buildTraceResult(data);
      setResult(traceResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const raceModels = useCallback(async (prompt: string, maxTokens = 100) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setRaceResults(null);
    setIsRaceMode(true);

    const results: RaceResult[] = [];
    let finishOrder = 0;

    const promises = MODELS_FOR_RACE.map(async (model) => {
      const startTime = performance.now();
      try {
        const res = await fetch('/api/trace-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt, maxTokens }),
        });

        const totalTimeMs = performance.now() - startTime;

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: res.statusText }));
          results.push({ model, result: null, error: errBody.error || `${res.status}`, finishOrder: ++finishOrder, totalTimeMs });
          return;
        }

        const data = await res.json();
        const traceResult = buildTraceResult(data);
        results.push({ model, result: traceResult, finishOrder: ++finishOrder, totalTimeMs });
      } catch (err) {
        const totalTimeMs = performance.now() - startTime;
        results.push({ model, result: null, error: err instanceof Error ? err.message : 'Unknown error', finishOrder: ++finishOrder, totalTimeMs });
      }
    });

    await Promise.all(promises);

    // Sort by finish order
    results.sort((a, b) => a.finishOrder - b.finishOrder);
    setRaceResults(results);
    setIsLoading(false);
  }, []);

  return { sendRequest, raceModels, isLoading, result, raceResults, error, isRaceMode };
}
