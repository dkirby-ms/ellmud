/**
 * ZoneRoomNode — Custom ReactFlow node for zone designer room visualization.
 */

import React from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RoomNodeData {
  slug: string;
  name: string;
  type: string;
  floor: number;
  isDisconnected: boolean;
  isConnectSource: boolean;
  hasUpExits: boolean;
  hasDownExits: boolean;
  portalCount: number;
  npcCount: number;
  lootCount: number;
  hazardCount: number;
  showLabels: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ROOM_TYPE_COLORS: Record<string, { fill: string; stroke: string }> = {
  entry: { fill: '#1A3A2A', stroke: '#2D6B4F' },
  boss: { fill: '#3A1A1A', stroke: '#8B2500' },
  junction: { fill: '#1A3A3A', stroke: '#3A7D7B' },
  corridor: { fill: '#1C1D27', stroke: '#4A4B55' },
  dead_end: { fill: '#1C1D27', stroke: '#4A4B55' },
};

const FEATURE_COLOR = { fill: '#2A1A3A', stroke: '#7B4FA0' };
const DEFAULT_COLOR = { fill: '#1C1D27', stroke: '#4A4B55' };
const NODE_W = 50;
const NODE_H = 50;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRoomColor(type: string): { fill: string; stroke: string } {
  if (type.startsWith('feature_')) return FEATURE_COLOR;
  return ROOM_TYPE_COLORS[type] ?? DEFAULT_COLOR;
}

function getRoomShapePath(type: string, w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;

  if (type === 'entry') {
    // Shield/badge shape
    return `M ${cx} 0 L ${w} ${h * 0.3} L ${w} ${h * 0.7} L ${cx} ${h} L 0 ${h * 0.7} L 0 ${h * 0.3} Z`;
  } else if (type === 'boss') {
    // Diamond (rotated square)
    return `M ${cx} 0 L ${w} ${cy} L ${cx} ${h} L 0 ${cy} Z`;
  } else if (type.startsWith('feature_')) {
    // Pentagon (angular)
    const angle = (Math.PI * 2) / 5;
    const r = w / 2;
    const points = Array.from({ length: 5 }, (_, i) => {
      const a = angle * i - Math.PI / 2;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');
    return points; // Will be used with <polygon>
  } else if (type === 'junction') {
    // Hexagon
    const angle = (Math.PI * 2) / 6;
    const r = w / 2;
    const points = Array.from({ length: 6 }, (_, i) => {
      const a = angle * i;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');
    return points; // Will be used with <polygon>
  }
  return ''; // Default: will use <rect>
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ZoneRoomNode(props: { data: RoomNodeData; selected?: boolean }) {
  const { data, selected } = props;
  const color = getRoomColor(data.type);
  const shapePath = getRoomShapePath(data.type, NODE_W, NODE_H);
  
  // Stroke color based on state
  let strokeColor = color.stroke;
  let strokeWidth = 1.5;
  let strokeDash = undefined;
  let filter = undefined;

  if (selected) {
    strokeColor = '#22D3EE'; // cyan selection
    strokeWidth = 3;
    filter = 'drop-shadow(0 0 6px #22D3EE)';
  } else if (data.isConnectSource) {
    strokeColor = '#3A7D7B'; // teal connect mode
    strokeWidth = 3;
    strokeDash = '4 2';
  } else if (data.isDisconnected) {
    strokeColor = '#B8860B'; // gold warning
    strokeWidth = 2;
  }

  // Boss room override (always red stroke)
  if (data.type === 'boss') {
    const bossStroke = '#DC2626';
    if (!selected && !data.isConnectSource) {
      strokeColor = bossStroke;
    }
  }

  return (
    <div
      style={{
        width: `${NODE_W}px`,
        height: `${NODE_H}px`,
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <svg width={NODE_W} height={NODE_H} xmlns="http://www.w3.org/2000/svg">
        {/* Room shape */}
        {data.type === 'entry' || data.type === 'boss' ? (
          <path
            d={shapePath}
            fill={color.fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
            filter={filter}
          />
        ) : data.type.startsWith('feature_') || data.type === 'junction' ? (
          <polygon
            points={shapePath}
            fill={color.fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
            filter={filter}
          />
        ) : (
          <rect
            x={0}
            y={0}
            width={NODE_W}
            height={NODE_H}
            rx={6}
            ry={6}
            fill={color.fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
            filter={filter}
          />
        )}

        {/* Room name (if labels enabled) */}
        {data.showLabels && (
          <text
            x={NODE_W / 2}
            y={NODE_H / 2 - 4}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#E8E0D0"
            fontSize="6"
            fontFamily="var(--font-sans)"
          >
            {data.name.length > 10 ? data.name.slice(0, 9) + '…' : data.name}
          </text>
        )}

        {/* Room slug */}
        <text
          x={NODE_W / 2}
          y={NODE_H / 2 + (data.showLabels ? 4 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#6A6B75"
          fontSize="6"
          fontFamily="var(--font-mono)"
        >
          {data.slug}
        </text>

        {/* Floor indicator (z !== 0) */}
        {data.floor !== 0 && (
          <text
            x={NODE_W - 3}
            y={7}
            textAnchor="end"
            fill="#8A8B95"
            fontSize="6"
            fontFamily="var(--font-sans)"
          >
            z{data.floor > 0 ? '+' : ''}{data.floor}
          </text>
        )}

        {/* Disconnected warning */}
        {data.isDisconnected && (
          <text x={4} y={7} fill="#B8860B" fontSize="8" fontFamily="var(--font-sans)">
            ⚠
          </text>
        )}
      </svg>

      {/* Content badges (NPCs, loot, hazards) */}
      {(data.npcCount > 0 || data.lootCount > 0 || data.hazardCount > 0) && (
        <div
          style={{
            position: 'absolute',
            bottom: '2px',
            left: '2px',
            right: '2px',
            display: 'flex',
            gap: '2px',
            justifyContent: 'center',
            fontSize: '7px',
          }}
        >
          {data.npcCount > 0 && (
            <span
              style={{
                background: '#2A1E0A',
                color: '#D97706',
                padding: '0 2px',
                borderRadius: '2px',
                fontSize: '7px',
              }}
              title={`${data.npcCount} NPC${data.npcCount > 1 ? 's' : ''}`}
            >
              👤
            </span>
          )}
          {data.lootCount > 0 && (
            <span
              style={{
                background: '#1A2A1A',
                color: '#10B981',
                padding: '0 2px',
                borderRadius: '2px',
                fontSize: '7px',
              }}
              title={`${data.lootCount} loot container${data.lootCount > 1 ? 's' : ''}`}
            >
              📦
            </span>
          )}
          {data.hazardCount > 0 && (
            <span
              style={{
                background: '#2A1A1A',
                color: '#EF4444',
                padding: '0 2px',
                borderRadius: '2px',
                fontSize: '7px',
              }}
              title={`${data.hazardCount} hazard${data.hazardCount > 1 ? 's' : ''}`}
            >
              ⚠
            </span>
          )}
        </div>
      )}

      {/* Vertical exit indicators */}
      {(data.hasUpExits || data.hasDownExits) && (
        <div
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
            fontSize: '8px',
          }}
        >
          {data.hasUpExits && (
            <span style={{ color: '#A78BFA' }} title="Has up exit">
              ▲
            </span>
          )}
          {data.hasDownExits && (
            <span style={{ color: '#A78BFA' }} title="Has down exit">
              ▼
            </span>
          )}
        </div>
      )}

      {/* Portal exit badge */}
      {data.portalCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            color: '#06b6d4',
            fontSize: '8px',
          }}
          title={`${data.portalCount} portal exit${data.portalCount > 1 ? 's' : ''}`}
        >
          ⟐
        </span>
      )}
    </div>
  );
}
