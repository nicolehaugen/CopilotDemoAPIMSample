import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';

interface PacketOrbProps {
  activeStageIndex: number;
  isVisible: boolean;
}

const orbStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: 0,
  width: 12,
  height: 12,
  borderRadius: '50%',
  background: '#06b6d4',
  boxShadow: '0 0 8px #06b6d4, 0 0 16px #06b6d4, 0 0 24px rgba(6, 182, 212, 0.4)',
  transform: 'translateX(-50%)',
  zIndex: 10,
  pointerEvents: 'none',
};

function PacketOrb({ activeStageIndex, isVisible }: PacketOrbProps) {
  if (!isVisible) return null;

  const targetY = activeStageIndex * 85 + 25;

  return (
    <motion.div
      className="animate-pulse-orb"
      animate={{ y: targetY }}
      transition={{ y: { type: 'spring', stiffness: 200, damping: 20 } }}
      style={orbStyle}
    />
  );
}

export default PacketOrb;
