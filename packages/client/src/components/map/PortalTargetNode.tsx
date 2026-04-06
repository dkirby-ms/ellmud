/**
 * PortalTargetNode — Small phantom node at the end of a portal exit stub edge.
 * Shows the target zone slug and is clickable to navigate to that zone.
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PortalTargetData {
  targetZoneSlug: string;
  direction: string;
  onPortalClick?: (targetZoneSlug: string) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const HANDLE_STYLE: React.CSSProperties = {
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  border: 'none',
  padding: 0,
};

// ─── Component ──────────────────────────────────────────────────────────────

export function PortalTargetNode(props: { data: PortalTargetData }) {
  const { data } = props;

  return (
    <div
      style={{
        background: 'rgba(6, 182, 212, 0.15)',
        border: '1px solid rgba(6, 182, 212, 0.4)',
        borderRadius: '4px',
        padding: '1px 4px',
        color: '#06b6d4',
        fontSize: '7px',
        fontFamily: 'var(--font-mono)',
        cursor: data.onPortalClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        lineHeight: '1.3',
      }}
      onClick={() => data.onPortalClick?.(data.targetZoneSlug)}
      title={`Navigate to ${data.targetZoneSlug}`}
    >
      {data.targetZoneSlug}

      {/* Handles for edge connections — one per cardinal direction */}
      <Handle type="target" position={Position.Top} id="north-target" style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Bottom} id="south-target" style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Right} id="east-target" style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Left} id="west-target" style={HANDLE_STYLE} />
    </div>
  );
}
