import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { StageResult } from '../../types';

interface SpeedBreakdownProps {
  stages: StageResult[] | null;
}

const AI_STAGE_ID = 'call-ai';

const STATUS_COLORS: Record<string, string> = {
  complete: '#22c55e',
  active: '#3b82f6',
  error: '#ef4444',
  idle: '#475569',
};

const AI_BAR_COLOR = '#f59e0b';

const PLACEHOLDER_STAGES = [
  { label: 'Auth', icon: '🔑' },
  { label: 'Route', icon: '🔀' },
  { label: 'Transform', icon: '🔄' },
  { label: 'Call AI Model', icon: '🤖' },
  { label: 'Response', icon: '📤' },
];

const styles: Record<string, CSSProperties> = {
  card: {
    background: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    padding: '16px 20px',
  },
  heading: {
    margin: '0 0 14px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  labelArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    width: '150px',
    flexShrink: 0,
  },
  icon: {
    fontSize: '14px',
  },
  label: {
    fontSize: '13px',
    color: '#cbd5e1',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  barTrack: {
    flex: 1,
    height: '20px',
    background: '#0f172a',
    borderRadius: '4px',
    overflow: 'hidden',
    position: 'relative' as const,
  },
  duration: {
    fontSize: '12px',
    color: '#94a3b8',
    width: '60px',
    textAlign: 'right' as const,
    flexShrink: 0,
  },
  footer: {
    marginTop: '12px',
    paddingTop: '10px',
    borderTop: '1px solid #334155',
    fontSize: '13px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  placeholderBar: {
    height: '100%',
    borderRadius: '4px',
    background: '#1e293b',
  },
};

function barColor(stage: StageResult): string {
  if (stage.id === AI_STAGE_ID) return AI_BAR_COLOR;
  return STATUS_COLORS[stage.status] ?? STATUS_COLORS.idle;
}

function computeOverhead(stages: StageResult[]): { ms: number; percent: number } {
  const total = stages.reduce((sum, s) => sum + s.durationMs, 0);
  if (total === 0) return { ms: 0, percent: 0 };
  const aiMs = stages
    .filter((s) => s.id === AI_STAGE_ID)
    .reduce((sum, s) => sum + s.durationMs, 0);
  const overheadMs = total - aiMs;
  return { ms: overheadMs, percent: Math.round((overheadMs / total) * 100) };
}

export function SpeedBreakdown({ stages }: SpeedBreakdownProps) {
  const maxMs = stages ? Math.max(...stages.map((s) => s.durationMs), 1) : 1;
  const overhead = stages ? computeOverhead(stages) : null;

  return (
    <div style={styles.card}>
      <h3 style={styles.heading}>Speed Breakdown</h3>

      {stages ? (
        <>
          {stages.map((stage) => {
            const widthPercent = Math.max((stage.durationMs / maxMs) * 100, 2);
            const color = barColor(stage);
            const isAi = stage.id === AI_STAGE_ID;

            return (
              <div key={stage.id} style={styles.row}>
                <div style={styles.labelArea}>
                  <span style={styles.icon}>{stage.icon}</span>
                  <span style={{ ...styles.label, fontWeight: isAi ? 600 : 400 }}>
                    {stage.label}
                  </span>
                </div>
                <div style={styles.barTrack}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      borderRadius: '4px',
                      background: color,
                      boxShadow: isAi ? `0 0 8px ${color}55` : 'none',
                    }}
                  />
                </div>
                <span style={styles.duration}>{stage.durationMs}ms</span>
              </div>
            );
          })}

          {overhead && (
            <div style={styles.footer}>
              <span>⚡</span>
              <span>
                Gateway overhead: {overhead.percent}% ({overhead.ms}ms)
              </span>
            </div>
          )}
        </>
      ) : (
        PLACEHOLDER_STAGES.map((ph) => (
          <div key={ph.label} style={styles.row}>
            <div style={styles.labelArea}>
              <span style={styles.icon}>{ph.icon}</span>
              <span style={{ ...styles.label, color: '#334155' }}>{ph.label}</span>
            </div>
            <div style={styles.barTrack}>
              <div style={{ ...styles.placeholderBar, width: '40%' }} />
            </div>
            <span style={{ ...styles.duration, color: '#334155' }}>—</span>
          </div>
        ))
      )}
    </div>
  );
}
