import type { JourneyStatsData, StageResult } from '../types';

/** Calculate gateway overhead from parsed stage results. */
export function calculateOverhead(stages: StageResult[]): {
  overheadMs: number;
  overheadPercent: number;
  aiTimeMs: number;
  totalTimeMs: number;
} {
  const aiStage = stages.find((s) => s.id === 'call-ai');
  const aiTimeMs = aiStage?.durationMs ?? 0;
  const totalTimeMs = stages.reduce((sum, s) => sum + s.durationMs, 0);
  const overheadMs = totalTimeMs - aiTimeMs;
  const overheadPercent = totalTimeMs > 0 ? (overheadMs / totalTimeMs) * 100 : 0;

  return {
    overheadMs: Math.round(overheadMs * 100) / 100,
    overheadPercent: Math.round(overheadPercent * 100) / 100,
    aiTimeMs: Math.round(aiTimeMs * 100) / 100,
    totalTimeMs: Math.round(totalTimeMs * 100) / 100,
  };
}

/** Parse UAIG-* and token headers into JourneyStatsData. */
export function parseHeaders(headers: Record<string, string>): JourneyStatsData {
  const get = (key: string): string => headers[key] ?? headers[key.toLowerCase()] ?? '';

  const promptTokens = parseInt(get('X-Prompt-Tokens'), 10) || 0;
  const completionTokens = parseInt(get('X-Completion-Tokens'), 10) || 0;
  const totalTokens = parseInt(get('X-Total-Tokens'), 10) || 0;

  return {
    model: get('UAIG-Model-ID') || 'Unknown',
    region: get('UAIG-Region') || 'Unknown',
    tier: get('UAIG-Model-Tier') || 'Unknown',
    authType: get('UAIG-Auth-Type') || 'Unknown',
    promptTokens,
    completionTokens,
    totalTokens,
    totalTimeMs: 0,
    gatewayOverheadMs: 0,
    gatewayOverheadPercent: 0,
  };
}
