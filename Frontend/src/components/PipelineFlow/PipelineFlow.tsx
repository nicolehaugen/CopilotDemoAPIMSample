import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ReactFlow } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import StageNode from './StageNode';
import PacketOrb from './PacketOrb';
import { INITIAL_NODES, INITIAL_EDGES } from './pipelineConfig';
import type { StageNodeData } from './pipelineConfig';
import type { StageResult, StageStatus } from '../../types';

interface PipelineFlowProps {
  stages: StageResult[] | null;
  isLoading: boolean;
}

const containerStyle: CSSProperties = {
  width: '100%',
  minHeight: 400,
  maxHeight: 900,
  height: 850,
  position: 'relative',
  background: 'transparent',
};

export function PipelineFlow({ stages, isLoading }: PipelineFlowProps) {
  const nodeTypes = useMemo(() => ({ stageNode: StageNode }), []);
  const [activeIndex, setActiveIndex] = useState(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setActiveIndex(-1);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    setActiveIndex(0);
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = prev + 1;
        if (next >= INITIAL_NODES.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }
        return next;
      });
    }, 350);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLoading]);

  const nodes: Node<StageNodeData, 'stageNode'>[] = useMemo(() => {
    if (stages) {
      return INITIAL_NODES.map(node => {
        const result = stages.find(r => r.id === node.id);
        if (!result) return node;
        return {
          ...node,
          data: { ...node.data, status: result.status, durationMs: result.durationMs },
        };
      });
    }

    if (isLoading && activeIndex >= 0) {
      return INITIAL_NODES.map((node, i) => {
        let status: StageStatus = 'idle';
        if (i < activeIndex) status = 'complete';
        else if (i === activeIndex) status = 'active';
        return { ...node, data: { ...node.data, status } };
      });
    }

    return INITIAL_NODES;
  }, [stages, isLoading, activeIndex]);

  return (
    <div style={containerStyle}>
      <ReactFlow
        nodes={nodes}
        edges={INITIAL_EDGES}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnScroll={false}
        preventScrolling={false}
        elementsSelectable={false}
      />
      <PacketOrb activeStageIndex={activeIndex} isVisible={isLoading && activeIndex >= 0} />
    </div>
  );
}

export default PipelineFlow;
