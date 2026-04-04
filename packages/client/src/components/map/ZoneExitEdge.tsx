import React from 'react';
import { getBezierPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExitEdgeData {
  direction: string;
  isBidirectional: boolean;
  isOrphan: boolean;
  isPortal: boolean;
  locked: boolean;
  hidden: boolean;
  targetZoneSlug?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PORTAL_COLOR = '#06b6d4';
const ONE_WAY_COLOR = '#F59E0B';
const ORPHAN_COLOR = '#EF4444';
const SELECTED_COLOR = '#C9A84C';

// ─── Component ──────────────────────────────────────────────────────────────

export function ZoneExitEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected = false,
  } = props;
  
  // Type assertion for our custom data
  const edgeData = (data || {}) as unknown as ExitEdgeData;
  // Compute Bézier path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine stroke color and style
  let strokeColor: string;
  let strokeWidth: number;
  let strokeDasharray: string | undefined;
  let markerEnd: string | undefined;

  if (selected) {
    strokeColor = SELECTED_COLOR;
    strokeWidth = 3;
    markerEnd = edgeData.isBidirectional ? undefined : 'url(#arrowhead-oneway-selected)';
  } else if (edgeData.isOrphan) {
    strokeColor = ORPHAN_COLOR;
    strokeWidth = 1.5;
    strokeDasharray = '6 3';
    markerEnd = 'url(#arrowhead-orphan)';
  } else if (edgeData.isPortal) {
    strokeColor = PORTAL_COLOR;
    strokeWidth = 2;
    strokeDasharray = '4 2';
    markerEnd = 'url(#arrowhead-portal)';
  } else if (edgeData.isBidirectional) {
    // Direction-based gradient
    const dir = edgeData.direction;
    if (dir === 'north' || dir === 'south') {
      strokeColor = 'url(#exit-ns-gradient)';
    } else if (dir === 'east' || dir === 'west') {
      strokeColor = 'url(#exit-ew-gradient)';
    } else {
      strokeColor = 'url(#exit-ud-gradient)';
    }
    strokeWidth = 1.5;
    markerEnd = undefined;
  } else {
    // One-way
    strokeColor = ONE_WAY_COLOR;
    strokeWidth = 2.5;
    markerEnd = 'url(#arrowhead-oneway)';
  }

  const hasModifiers = edgeData.locked || edgeData.hidden;

  return (
    <>
      {/* Main path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        fill="none"
        markerEnd={markerEnd}
        style={{
          cursor: 'pointer',
        }}
      />

      {/* Invisible wider path for easier click targeting */}
      <path
        d={edgePath}
        stroke="transparent"
        strokeWidth={12}
        fill="none"
        style={{ cursor: 'pointer' }}
      />

      {/* Lock/hidden icons */}
      {hasModifiers && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#B8860B"
          fontSize="9"
          fontFamily="var(--font-sans)"
          style={{ pointerEvents: 'none' }}
        >
          {edgeData.locked ? '🔒' : ''}
          {edgeData.hidden ? '👁' : ''}
        </text>
      )}

      {/* Portal target label */}
      {edgeData.isPortal && edgeData.targetZoneSlug && (
        <text
          x={labelX}
          y={labelY + (hasModifiers ? 10 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fill={selected ? SELECTED_COLOR : PORTAL_COLOR}
          fontSize="9"
          fontFamily="var(--font-sans)"
          style={{ pointerEvents: 'none' }}
        >
          ⟐ {edgeData.direction} → {edgeData.targetZoneSlug}
        </text>
      )}
    </>
  );
}
