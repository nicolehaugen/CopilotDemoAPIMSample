import type { CSSProperties } from 'react';

interface ResponsePanelProps {
  content: string | null;
  isLoading: boolean;
}

const styles: Record<string, CSSProperties> = {
  card: {
    background: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    padding: '16px 20px',
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column',
  },
  heading: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  content: {
    flex: 1,
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#f1f5f9',
    whiteSpace: 'pre-wrap' as const,
    overflowY: 'auto' as const,
    maxHeight: '300px',
  },
  placeholder: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#475569',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  loading: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#64748b',
    letterSpacing: '4px',
  },
};

const pulseKeyframes = `
@keyframes responsePulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
`;

export function ResponsePanel({ content, isLoading }: ResponsePanelProps) {
  return (
    <div style={styles.card}>
      <style>{pulseKeyframes}</style>
      <h3 style={styles.heading}>AI Response</h3>

      {isLoading ? (
        <div style={{ ...styles.loading, animation: 'responsePulse 1.2s ease-in-out infinite' }}>
          . . .
        </div>
      ) : content ? (
        <div style={styles.content}>{content}</div>
      ) : (
        <div style={styles.placeholder}>
          Send a request to see the AI response
        </div>
      )}
    </div>
  );
}
