import type { PipelineStageDef, StageResult } from '../types';

/** Static pipeline stage definitions in execution order. */
export const PIPELINE_STAGES: PipelineStageDef[] = [
  { id: 'load-config', label: 'Load Config', icon: '📋', fragmentName: 'metadata-config', description: 'Load metadata configuration and central cache' },
  { id: 'parse-request', label: 'Parse Request', icon: '🔍', fragmentName: 'request-processor', description: 'Parse and validate the incoming request' },
  { id: 'authenticate', label: 'Authenticate', icon: '🔐', fragmentName: 'security-handler', description: 'Authenticate the request' },
  { id: 'select-model', label: 'Select Model', icon: '🎯', fragmentName: 'backend-selector', description: 'Select the target AI model backend' },
  { id: 'build-route', label: 'Build Route', icon: '🛤️', fragmentName: 'path-builder', description: 'Build the route to the selected backend' },
  { id: 'check-rate-limit', label: 'Check Rate Limit', icon: '⚖️', fragmentName: 'token-limiter', description: 'Enforce token-based rate limits' },
  { id: 'log-usage', label: 'Log Usage', icon: '📊', fragmentName: 'token-logger', description: 'Log token usage metrics' },
  { id: 'call-ai', label: 'Call AI Model', icon: '🤖', fragmentName: 'forward-request', description: 'Forward the request to the AI backend' },
  { id: 'add-metadata', label: 'Add Metadata', icon: '🏷️', fragmentName: 'diagnostic-headers', description: 'Add diagnostic headers to the response' },
];

interface TraceEntry {
  source: string;
  elapsed: string;
  data: unknown;
}

interface TraceData {
  traceEntries?: {
    inbound?: TraceEntry[];
    backend?: TraceEntry[];
    outbound?: TraceEntry[];
  };
}

/** Parse an elapsed timestamp "HH:MM:SS.nnnnnnn" into milliseconds. */
function parseElapsedMs(elapsed: string): number {
  const match = /^(\d+):(\d+):(\d+)\.(\d+)$/.exec(elapsed);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  // Pad or trim fractional part to 7 digits then convert to ms
  const frac = match[4].padEnd(7, '0').slice(0, 7);
  const fracMs = parseInt(frac, 10) / 10_000;
  return (hours * 3_600_000) + (minutes * 60_000) + (seconds * 1_000) + fracMs;
}

/** Extract fragment name from trace data string like "Entering policy fragment 'X'". */
function extractFragmentName(data: unknown): string | null {
  if (typeof data !== 'string') return null;
  const match = /policy fragment '([^']+)'/.exec(data);
  return match ? match[1] : null;
}

/** Compute duration between entering and leaving a fragment across trace entries. */
function getFragmentDuration(entries: TraceEntry[], fragmentName: string): { durationMs: number; details?: Record<string, string> } {
  let enterMs: number | null = null;
  let leaveMs: number | null = null;

  for (const entry of entries) {
    if (entry.source !== 'include-fragment' || typeof entry.data !== 'string') continue;
    const name = extractFragmentName(entry.data);
    if (name !== fragmentName) continue;

    if (entry.data.startsWith('Entering')) {
      enterMs = parseElapsedMs(entry.elapsed);
    } else if (entry.data.startsWith('Leaving')) {
      leaveMs = parseElapsedMs(entry.elapsed);
    }
  }

  if (enterMs !== null && leaveMs !== null) {
    return { durationMs: Math.max(0, leaveMs - enterMs) };
  }
  return { durationMs: 0 };
}

/** Get backend forward-request duration from the backend trace section. */
function getBackendDuration(backendEntries: TraceEntry[]): { durationMs: number; details: Record<string, string> } {
  const details: Record<string, string> = {};

  // Extract backend pool selection
  for (const entry of backendEntries) {
    if (entry.source === 'backend-pool') {
      const msg = typeof entry.data === 'object' && entry.data !== null
        ? (entry.data as Record<string, unknown>).message
        : entry.data;
      if (typeof msg === 'string') {
        const poolMatch = /Backend '([^']+)' was selected in the pool '([^']+)'/.exec(msg);
        if (poolMatch) {
          details['backend'] = poolMatch[1];
          details['pool'] = poolMatch[2];
        }
      }
    }
  }

  // Duration from first to last entry in backend section
  if (backendEntries.length === 0) return { durationMs: 0, details };
  const firstMs = parseElapsedMs(backendEntries[0].elapsed);
  const lastMs = parseElapsedMs(backendEntries[backendEntries.length - 1].elapsed);
  return { durationMs: Math.max(0, lastMs - firstMs), details };
}

/** Parse APIM debug trace JSON into an ordered array of StageResult. */
export function parseTrace(traceData: unknown): StageResult[] {
  const trace = traceData as TraceData;
  const inbound = trace?.traceEntries?.inbound ?? [];
  const backend = trace?.traceEntries?.backend ?? [];
  const outbound = trace?.traceEntries?.outbound ?? [];
  const allInbound = [...inbound];

  const results: StageResult[] = [];

  for (const stage of PIPELINE_STAGES) {
    let durationMs = 0;
    let details: Record<string, string> | undefined;

    if (stage.id === 'load-config') {
      // Combine metadata-config and central-cache-manager durations
      const config = getFragmentDuration(allInbound, 'metadata-config');
      const cache = getFragmentDuration(allInbound, 'central-cache-manager');
      durationMs = config.durationMs + cache.durationMs;
    } else if (stage.id === 'call-ai') {
      const result = getBackendDuration(backend);
      durationMs = result.durationMs;
      if (Object.keys(result.details).length > 0) {
        details = result.details;
      }
    } else if (stage.id === 'add-metadata') {
      const result = getFragmentDuration(outbound, stage.fragmentName);
      durationMs = result.durationMs;
    } else {
      const result = getFragmentDuration(allInbound, stage.fragmentName);
      durationMs = result.durationMs;
    }

    const status = durationMs > 0 ? 'complete' : 'idle';

    results.push({
      id: stage.id,
      label: stage.label,
      icon: stage.icon,
      fragmentName: stage.fragmentName,
      durationMs: Math.round(durationMs * 100) / 100,
      status,
      ...(details ? { details } : {}),
    });
  }

  return results;
}
