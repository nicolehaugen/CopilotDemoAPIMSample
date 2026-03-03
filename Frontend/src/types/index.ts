export type StageStatus = 'idle' | 'active' | 'complete' | 'error';

export interface StageResult {
  id: string;
  label: string;
  icon: string;
  fragmentName: string;
  durationMs: number;
  status: StageStatus;
  details?: Record<string, string>;
}

export interface PipelineStageDef {
  id: string;
  label: string;
  icon: string;
  fragmentName: string;
  description: string;
}

export interface JourneyStatsData {
  model: string;
  region: string;
  tier: string;
  authType: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalTimeMs: number;
  gatewayOverheadMs: number;
  gatewayOverheadPercent: number;
}

export interface TraceResult {
  response: {
    content: string;
    model: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  stages: StageResult[];
  journeyStats: JourneyStatsData;
  rawTrace?: unknown;
  error?: string;
}

export interface RaceResult {
  model: string;
  result: TraceResult | null;
  error?: string;
  finishOrder: number;
  totalTimeMs: number;
}

export interface ModelDef {
  id: string;
  name: string;
  color: string;
  tier: 'premium' | 'standard';
}
