import type { CSSProperties } from 'react';
import type { JourneyStatsData } from '../../types';

interface JourneyStatsProps {
  stats: JourneyStatsData | null;
}

interface StatItem {
  icon: string;
  label: string;
  value: (s: JourneyStatsData) => string;
}

const STAT_ITEMS: StatItem[] = [
  { icon: '🤖', label: 'Model', value: (s) => s.model },
  { icon: '🌍', label: 'Region', value: (s) => s.region },
  { icon: '⭐', label: 'Tier', value: (s) => s.tier.charAt(0).toUpperCase() + s.tier.slice(1) },
  { icon: '🔑', label: 'Auth', value: (s) => s.authType },
  { icon: '📊', label: 'Tokens', value: (s) => `${s.promptTokens} → ${s.completionTokens}` },
  { icon: '⏱️', label: 'Total', value: (s) => `${s.totalTimeMs}ms` },
  {
    icon: '⚡',
    label: 'Gateway',
    value: (s) => `${s.gatewayOverheadMs}ms (${s.gatewayOverheadPercent}%)`,
  },
];

const styles: Record<string, CSSProperties> = {
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px',
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    background: '#0f172a',
    borderRadius: '8px',
  },
  icon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  label: {
    fontSize: '12px',
    color: '#64748b',
    marginRight: '4px',
    flexShrink: 0,
  },
  value: {
    fontSize: '13px',
    color: '#f1f5f9',
    fontWeight: 500,
  },
  placeholder: {
    fontSize: '13px',
    color: '#334155',
    fontWeight: 500,
  },
};

export function JourneyStats({ stats }: JourneyStatsProps) {
  return (
    <div style={styles.card}>
      <h3 style={styles.heading}>Journey Stats</h3>
      <div style={styles.grid}>
        {STAT_ITEMS.map((item) => (
          <div key={item.label} style={styles.statRow}>
            <span style={styles.icon}>{item.icon}</span>
            <span style={styles.label}>{item.label}:</span>
            {stats ? (
              <span style={styles.value}>{item.value(stats)}</span>
            ) : (
              <span style={styles.placeholder}>—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
