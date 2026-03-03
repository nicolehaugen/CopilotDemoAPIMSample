import type { Node, Edge } from '@xyflow/react';
import type { PipelineStageDef, StageStatus } from '../../types';

export interface StageNodeData {
  id: string;
  label: string;
  icon: string;
  description: string;
  fragmentName: string;
  status: StageStatus;
  durationMs: number;
  isFirst: boolean;
  isLast: boolean;
  [key: string]: unknown;
}

export const STAGE_DEFINITIONS: PipelineStageDef[] = [
  { id: 'load-config', label: 'Load Config', icon: '📋', fragmentName: 'metadata-config + central-cache-manager', description: 'Loads gateway routing rules' },
  { id: 'parse-request', label: 'Parse Request', icon: '🔍', fragmentName: 'request-processor', description: 'Identifies the AI model and API type' },
  { id: 'authenticate', label: 'Authenticate', icon: '🔐', fragmentName: 'security-handler', description: 'Verifies your identity' },
  { id: 'select-model', label: 'Select Model', icon: '🎯', fragmentName: 'backend-selector', description: 'Picks the right AI model and region' },
  { id: 'build-route', label: 'Build Route', icon: '🛤️', fragmentName: 'path-builder', description: 'Constructs the path to the AI service' },
  { id: 'check-rate-limit', label: 'Check Rate Limit', icon: '⚖️', fragmentName: 'token-limiter', description: "Ensures you're within usage limits" },
  { id: 'log-usage', label: 'Log Usage', icon: '📊', fragmentName: 'token-logger', description: 'Records token consumption metrics' },
  { id: 'call-ai', label: 'Call AI Model', icon: '🤖', fragmentName: 'forward-request', description: 'Sends your prompt to the AI service' },
  { id: 'add-metadata', label: 'Add Metadata', icon: '🏷️', fragmentName: 'diagnostic-headers', description: 'Attaches diagnostic info to the response' },
];

export const INITIAL_NODES: Node<StageNodeData, 'stageNode'>[] = STAGE_DEFINITIONS.map((stage, i) => ({
  id: stage.id,
  type: 'stageNode' as const,
  position: { x: 0, y: i * 85 },
  data: {
    id: stage.id,
    label: stage.label,
    icon: stage.icon,
    description: stage.description,
    fragmentName: stage.fragmentName,
    status: 'idle' as StageStatus,
    durationMs: 0,
    isFirst: i === 0,
    isLast: i === STAGE_DEFINITIONS.length - 1,
  },
}));

export const INITIAL_EDGES: Edge[] = STAGE_DEFINITIONS.slice(0, -1).map((stage, i) => ({
  id: `${stage.id}->${STAGE_DEFINITIONS[i + 1].id}`,
  source: stage.id,
  target: STAGE_DEFINITIONS[i + 1].id,
  animated: true,
  style: { stroke: '#475569', strokeDasharray: '5 5' },
}));
