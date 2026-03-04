import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { RaceResult } from '../../types';

interface RaceResultsProps {
  results: RaceResult[];
}

interface ModelDef {
  id: string;
  name: string;
  color: string;
}

const MODELS: ModelDef[] = [
  { id: 'gpt-4.1', name: 'GPT-4.1', color: '#3b82f6' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', color: '#22c55e' },
  { id: 'phi-4', name: 'Phi-4', color: '#a855f7' },
  { id: 'gemini-flash', name: 'Gemini Flash', color: '#f97316' },
];

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣'];

const AI_STAGE_ID = 'call-ai';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  card: {
    background: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    padding: '16px 20px',
  },
  heading: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  rankRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    background: '#0f172a',
    borderRadius: '8px',
    marginBottom: '6px',
  },
  medal: {
    fontSize: '20px',
    flexShrink: 0,
    width: '28px',
    textAlign: 'center' as const,
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  rankName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e2e8f0',
    flex: 1,
  },
  rankTime: {
    fontSize: '13px',
    color: '#94a3b8',
    flexShrink: 0,
  },
  rankTokens: {
    fontSize: '12px',
    color: '#64748b',
    flexShrink: 0,
  },
  failedText: {
    fontSize: '13px',
    color: '#fca5a5',
    fontWeight: 500,
  },
  calloutRow: {
    display: 'flex',
    gap: '12px',
  },
  callout: {
    flex: 1,
    background: '#0f172a',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  calloutLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 500,
  },
  calloutValue: {
    fontSize: '14px',
    color: '#e2e8f0',
    fontWeight: 600,
  },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  previewCard: {
    background: '#0f172a',
    borderRadius: '8px',
    padding: '10px 12px',
    overflow: 'hidden',
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
  },
  previewName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#cbd5e1',
  },
  previewText: {
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: '1.4',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical' as const,
  },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function findModel(modelName: string): ModelDef {
  const lower = modelName.toLowerCase();
  return (
    MODELS.find(
      (m) => lower.includes(m.id) || lower.includes(m.name.toLowerCase()),
    ) ?? { id: modelName, name: modelName, color: '#64748b' }
  );
}

function getTokenCount(r: RaceResult): number {
  return r.result?.response.usage?.totalTokens ?? 0;
}

function getGatewayOverhead(r: RaceResult): number {
  return r.result?.journeyStats.gatewayOverheadMs ?? Infinity;
}

function getAiTime(r: RaceResult): number {
  const aiStage = r.result?.stages.find((s) => s.id === AI_STAGE_ID);
  return aiStage?.durationMs ?? Infinity;
}

export function RaceResults({ results }: RaceResultsProps) {
  const sorted = [...results].sort((a, b) => a.finishOrder - b.finishOrder);

  const successResults = results.filter((r) => r.result && !r.error);

  const fastestGateway =
    successResults.length > 0
      ? successResults.reduce((best, r) =>
          getGatewayOverhead(r) < getGatewayOverhead(best) ? r : best,
        )
      : null;

  const fastestAi =
    successResults.length > 0
      ? successResults.reduce((best, r) =>
          getAiTime(r) < getAiTime(best) ? r : best,
        )
      : null;

  return (
    <motion.div
      style={styles.container}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Rankings */}
      <motion.div style={styles.card} variants={itemVariants}>
        <h3 style={styles.heading}>Race Rankings</h3>
        {sorted.map((r, i) => {
          const model = findModel(r.model);
          const failed = !!r.error || !r.result;

          return (
            <motion.div
              key={r.model}
              style={styles.rankRow}
              variants={itemVariants}
            >
              <span style={styles.medal}>{MEDALS[i] ?? ''}</span>
              <span style={{ ...styles.dot, background: model.color }} />
              <span style={styles.rankName}>{model.name}</span>
              {failed ? (
                <span style={styles.failedText}>❌ Failed</span>
              ) : (
                <>
                  <span style={styles.rankTokens}>
                    {getTokenCount(r)} tokens
                  </span>
                  <span style={styles.rankTime}>{r.totalTimeMs}ms</span>
                </>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Callouts */}
      {(fastestGateway ?? fastestAi) && (
        <motion.div style={styles.calloutRow} variants={itemVariants}>
          {fastestGateway && (
            <div style={styles.callout}>
              <span style={styles.calloutLabel}>⚡ Fastest Gateway</span>
              <span style={styles.calloutValue}>
                {findModel(fastestGateway.model).name} —{' '}
                {fastestGateway.result?.journeyStats.gatewayOverheadMs}ms
              </span>
            </div>
          )}
          {fastestAi && (
            <div style={styles.callout}>
              <span style={styles.calloutLabel}>🤖 Fastest AI</span>
              <span style={styles.calloutValue}>
                {findModel(fastestAi.model).name} —{' '}
                {fastestAi.result?.stages.find((s) => s.id === AI_STAGE_ID)
                  ?.durationMs}
                ms
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Response Previews */}
      {successResults.length > 0 && (
        <motion.div style={styles.card} variants={itemVariants}>
          <h3 style={styles.heading}>Response Previews</h3>
          <div style={styles.previewGrid}>
            {sorted.map((r) => {
              const model = findModel(r.model);
              const content = r.result?.response.content;
              const preview = content
                ? content.length > 100
                  ? content.slice(0, 100) + '…'
                  : content
                : null;

              return (
                <div key={r.model} style={styles.previewCard}>
                  <div style={styles.previewHeader}>
                    <span
                      style={{ ...styles.dot, background: model.color }}
                    />
                    <span style={styles.previewName}>{model.name}</span>
                  </div>
                  <div style={styles.previewText}>
                    {preview ?? (
                      <span style={{ color: '#fca5a5' }}>No response</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
