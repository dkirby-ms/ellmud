import React, { useState } from 'react';
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

const DIRECTION_EMOJI: Record<string, string> = {
  north: '↑',
  south: '↓',
  east: '→',
  west: '←',
  up: '▲',
  down: '▼',
};

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
  
  const [hovered, setHovered] = useState(false);
  
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
  } else if (hovered) {
    // Hover brightening — lighten current color
    if (edgeData.isOrphan) {
      strokeColor = '#FF6B6B';
    } else if (edgeData.isPortal) {
      strokeColor = '#22D3EE';
    } else if (edgeData.isBidirectional) {
      const dir = edgeData.direction;
      if (dir === 'north' || dir === 'south') {
        strokeColor = '#60A5FA';
      } else if (dir === 'east' || dir === 'west') {
        strokeColor = '#FBBF24';
      } else {
        strokeColor = '#C4B5FD';
      }
    } else {
      strokeColor = '#FBBF24';
    }
    strokeWidth = 2.5;
    markerEnd = edgeData.isBidirectional ? undefined :
      edgeData.isOrphan ? 'url(#arrowhead-orphan)' :
      edgeData.isPortal ? 'url(#arrowhead-portal)' :
      'url(#arrowhead-oneway)';
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
  const showLabel = selected || hovered;
  const dirEmoji = DIRECTION_EMOJI[edgeData.direction] ?? '';
  const glowFilter = selected ? 'drop-shadow(0 0 4px rgba(201,168,76,0.6))' : undefined;

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
          filter: glowFilter,
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease, filter 0.15s ease',
        }}
      />

      {/* Invisible wider path for easier click targeting + hover detection */}
      <path
        d={edgePath}
        stroke="transparent"
        strokeWidth={12}
        fill="none"
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Direction emoji label (fade in on hover/selection) */}
      {dirEmoji && (
        <text
          x={labelX}
          y={labelY - (hasModifiers ? 10 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fill={selected ? SELECTED_COLOR : '#A0A0B0'}
          fontSize="10"
          fontFamily="var(--font-sans)"
          style={{
            pointerEvents: 'none',
            opacity: showLabel ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          {dirEmoji}
        </text>
      )}

      {/* Lock/hidden icons */}
      {hasModifiers && (
        <text
          x={labelX}
          y={labelY + (dirEmoji && showLabel ? 6 : 0)}
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
