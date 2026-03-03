import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { StageNodeData } from './pipelineConfig';

const statusStyles: Record<string, { borderColor: string; boxShadow: string }> = {
  idle:     { borderColor: '#475569', boxShadow: 'none' },
  active:   { borderColor: '#3b82f6', boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)' },
  complete: { borderColor: '#22c55e', boxShadow: '0 0 12px rgba(34, 197, 94, 0.3)' },
  error:    { borderColor: '#ef4444', boxShadow: '0 0 12px rgba(239, 68, 68, 0.5)' },
};

const baseStyle: CSSProperties = {
  width: 180,
  height: 60,
  borderRadius: 10,
  borderWidth: 2,
  borderStyle: 'solid',
  borderColor: '#475569',
  background: '#1e293b',
  display: 'flex',
  alignItems: 'center',
  padding: '0 12px',
  gap: 8,
  color: '#e2e8f0',
  fontSize: 13,
  fontFamily: 'system-ui, sans-serif',
};

const handleStyle: CSSProperties = { opacity: 0 };

function StageNode({ data }: NodeProps) {
  const { label, icon, status, durationMs, isFirst, isLast } = data as StageNodeData;
  const showTiming = status === 'complete' && durationMs > 0;

  return (
    <motion.div
      animate={{
        ...statusStyles[status],
        scale: status === 'active' ? [1, 1.02, 1] : 1,
      }}
      transition={{
        duration: 0.3,
        scale: status === 'active'
          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.3 },
      }}
      style={{
        ...baseStyle,
        opacity: status === 'idle' ? 0.6 : 1,
      }}
    >
      {!isFirst && <Handle type="target" position={Position.Top} style={handleStyle} />}

      <span style={{ fontSize: 18 }}>{icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </div>
        {showTiming && (
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {durationMs < 1 ? `${(durationMs * 1000).toFixed(0)}µs` : `${durationMs.toFixed(1)}ms`}
          </div>
        )}
      </div>

      {status === 'complete' && (
        <span style={{ color: '#22c55e', fontSize: 14, fontWeight: 700 }}>✓</span>
      )}

      {!isLast && <Handle type="source" position={Position.Bottom} style={handleStyle} />}
    </motion.div>
  );
}

export default StageNode;
