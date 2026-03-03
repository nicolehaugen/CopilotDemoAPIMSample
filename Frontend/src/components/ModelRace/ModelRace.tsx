import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { RaceResult, StageStatus } from '../../types';

interface ModelRaceProps {
  results: RaceResult[] | null;
  isLoading: boolean;
}

interface ModelDef {
  id: string;
  name: string;
  color: string;
  tier: 'premium' | 'standard';
}

interface StageDef {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
}

const MODELS: ModelDef[] = [
  { id: 'gpt-4.1', name: 'GPT-4.1', color: '#3b82f6', tier: 'premium' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', color: '#22c55e', tier: 'standard' },
  { id: 'phi-4', name: 'Phi-4', color: '#a855f7', tier: 'standard' },
  { id: 'gemini-flash', name: 'Gemini Flash', color: '#f97316', tier: 'standard' },
];

const STAGES: StageDef[] = [
  { id: 'load-config', label: 'Load Config', shortLabel: 'Config', icon: '📋' },
  { id: 'parse-request', label: 'Parse Request', shortLabel: 'Parse', icon: '🔍' },
  { id: 'authenticate', label: 'Authenticate', shortLabel: 'Auth', icon: '🔐' },
  { id: 'select-model', label: 'Select Model', shortLabel: 'Select', icon: '🎯' },
  { id: 'build-route', label: 'Build Route', shortLabel: 'Route', icon: '🛤️' },
  { id: 'check-rate-limit', label: 'Check Rate Limit', shortLabel: 'Rate', icon: '⚖️' },
  { id: 'log-usage', label: 'Log Usage', shortLabel: 'Log', icon: '📊' },
  { id: 'call-ai', label: 'Call AI', shortLabel: 'AI', icon: '🤖' },
  { id: 'add-metadata', label: 'Add Metadata', shortLabel: 'Meta', icon: '🏷️' },
];

const MEDALS = ['🥇', '🥈', '🥉', '4th'];

const STATUS_BG: Record<StageStatus, string> = {
  idle: '#334155',
  active: '#1d4ed8',
  complete: '#15803d',
  error: '#991b1b',
};

const STATUS_TEXT: Record<StageStatus, string> = {
  idle: '#94a3b8',
  active: '#93c5fd',
  complete: '#86efac',
  error: '#fca5a5',
};

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    gap: '12px',
    minHeight: '380px',
    width: '100%',
  },
  column: {
    flex: 1,
    background: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
  },
  winnerColumn: {
    border: '1px solid #ca8a04',
    boxShadow: '0 0 16px rgba(202, 138, 4, 0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  modelName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e2e8f0',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  medal: {
    fontSize: '16px',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  stageList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
  },
  pillIcon: {
    fontSize: '12px',
    flexShrink: 0,
  },
  pillLabel: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  pillDuration: {
    fontSize: '11px',
    opacity: 0.8,
    flexShrink: 0,
  },
  errorText: {
    fontSize: '12px',
    color: '#fca5a5',
    padding: '8px',
    background: '#450a0a',
    borderRadius: '8px',
    marginTop: 'auto',
  },
};

function findModel(modelName: string): ModelDef {
  const lower = modelName.toLowerCase();
  return (
    MODELS.find(
      (m) => lower.includes(m.id) || lower.includes(m.name.toLowerCase()),
    ) ?? MODELS[0]
  );
}

export function ModelRace({ results, isLoading }: ModelRaceProps) {
  // Track animated stage progress per model during loading
  const [activeStages, setActiveStages] = useState<number[]>([0, 0, 0, 0]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Reset stages when loading starts
    setActiveStages([0, 0, 0, 0]);

    intervalRef.current = setInterval(() => {
      setActiveStages((prev) =>
        prev.map((s) => {
          if (s >= STAGES.length) return s;
          // Randomized advancement to simulate different speeds
          return Math.random() > 0.35 ? s + 1 : s;
        }),
      );
    }, 300);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoading]);

  function getStageStatus(
    modelIndex: number,
    stageIndex: number,
    modelResult: RaceResult | undefined,
  ): { status: StageStatus; durationMs?: number } {
    // If results are in, use real data
    if (modelResult?.result) {
      const stageData = modelResult.result.stages.find(
        (s) => s.id === STAGES[stageIndex].id,
      );
      if (stageData) return { status: stageData.status, durationMs: stageData.durationMs };
      return { status: 'complete' };
    }
    if (modelResult?.error) {
      return { status: 'error' };
    }

    // Loading animation
    if (!isLoading) return { status: 'idle' };
    const progress = activeStages[modelIndex];
    if (stageIndex < progress) return { status: 'complete' };
    if (stageIndex === progress) return { status: 'active' };
    return { status: 'idle' };
  }

  return (
    <div style={styles.container}>
      {MODELS.map((model, modelIndex) => {
        const modelResult = results?.find(
          (r) => findModel(r.model).id === model.id,
        );
        const isWinner = modelResult?.finishOrder === 1 && !modelResult.error;
        const hasError = !!modelResult?.error;
        const columnStyle: CSSProperties = {
          ...styles.column,
          ...(isWinner ? styles.winnerColumn : {}),
        };

        return (
          <motion.div
            key={model.id}
            style={columnStyle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: modelIndex * 0.05 }}
          >
            <div style={styles.header}>
              <span style={{ ...styles.dot, background: model.color }} />
              <span style={styles.modelName}>{model.name}</span>
              {modelResult && !modelResult.error && modelResult.finishOrder > 0 && (
                <span style={styles.medal}>
                  {MEDALS[modelResult.finishOrder - 1] ?? ''}
                </span>
              )}
            </div>

            <div style={styles.stageList}>
              {STAGES.map((stage, stageIndex) => {
                const { status, durationMs } = getStageStatus(
                  modelIndex,
                  stageIndex,
                  modelResult ?? undefined,
                );

                return (
                  <motion.div
                    key={stage.id}
                    style={{
                      ...styles.pill,
                      background: STATUS_BG[status],
                      color: STATUS_TEXT[status],
                    }}
                    animate={{
                      background: STATUS_BG[status],
                      color: STATUS_TEXT[status],
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <span style={styles.pillIcon}>{stage.icon}</span>
                    <span style={styles.pillLabel}>{stage.shortLabel}</span>
                    {durationMs !== undefined && status === 'complete' && (
                      <span style={styles.pillDuration}>{durationMs}ms</span>
                    )}
                    {status === 'active' && (
                      <motion.span
                        style={styles.pillDuration}
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      >
                        ···
                      </motion.span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {hasError && (
              <div style={styles.errorText}>❌ {modelResult?.error ?? 'Failed'}</div>
            )}

            {modelResult?.result && (
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '8px',
                  borderTop: '1px solid #334155',
                  fontSize: '12px',
                  color: '#94a3b8',
                }}
              >
                {modelResult.totalTimeMs}ms total
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
