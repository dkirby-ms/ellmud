/**
 * ZoneRoomNode — Custom ReactFlow node for zone designer room visualization.
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PortalExitInfo {
  direction: string;
  targetZoneSlug: string;
  targetRoomSlug?: string;
}

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
  portalExits: PortalExitInfo[];
  onPortalClick?: (targetZoneSlug: string) => void;
  npcCount: number;
  lootCount: number;
  hazardCount: number;
  showLabels: boolean;
  properties: string[];
  /** True when this node matches the active search query */
  searchMatch?: boolean;
  /** True when a search is active but this node does NOT match */
  dimmed?: boolean;
  // Tooltip data (shown on hover when showLabels is false)
  description?: string;
  npcs?: Array<{ creatureId: string; spawnCount: number; displayName?: string }>;
  lootContainers?: Array<{ id: string; type: string; itemCount: number }>;
  hazards?: Array<{ type: string }>;
  // Callbacks for vertical exit clicks (#445)
  onUpExitClick?: () => void;
  onDownExitClick?: () => void;
  // Exit IDs for tooltip display (#445)
  upExitIds?: string[];
  downExitIds?: string[];
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

const PROPERTY_ICONS: Record<string, string> = {
  heavy_door: '🚪',
  cavern: '🕳',
  water: '💧',
};

const HANDLE_STYLE: React.CSSProperties = {
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  border: 'none',
  padding: 0,
};

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
    filter = 'drop-shadow(0 0 8px rgba(34,211,238,0.7)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))';
  } else if (data.searchMatch) {
    strokeColor = '#22D3EE';
    strokeWidth = 2.5;
    filter = 'drop-shadow(0 0 6px rgba(34,211,238,0.5))';
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

  const hasTooltipContent = !data.showLabels;

  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <div
            style={{
              width: `${NODE_W}px`,
              height: `${NODE_H}px`,
              position: 'relative',
              cursor: 'pointer',
              opacity: data.dimmed ? 0.25 : 1,
              transition: 'opacity 0.2s ease',
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

              {/* Room name (if labels enabled) — foreignObject for text wrapping */}
              {data.showLabels && (
                <foreignObject x={2} y={2} width={NODE_W - 4} height={NODE_H / 2 - 2}>
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#E8E0D0',
                      fontSize: '6px',
                      fontFamily: 'var(--font-sans)',
                      textAlign: 'center',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      padding: '1px',
                    }}
                  >
                    {data.name}
                  </div>
                </foreignObject>
              )}

              {/* Room slug — foreignObject for text wrapping */}
              <foreignObject
                x={2}
                y={data.showLabels ? NODE_H / 2 : 2}
                width={NODE_W - 4}
                height={data.showLabels ? NODE_H / 2 - 2 : NODE_H - 4}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6A6B75',
                    fontSize: '6px',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    padding: '1px',
                  }}
                >
                  {data.slug}
                </div>
              </foreignObject>

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
                  pointerEvents: 'auto',
                }}
              >
                {data.hasUpExits && (
                  <span 
                    style={{ 
                      color: '#A78BFA',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'inline-block',
                      transition: 'transform 0.1s ease, color 0.1s ease',
                    }}
                    title={data.upExitIds?.length ? `Up exit (${data.upExitIds.length})` : "Has up exit"}
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onUpExitClick?.();
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.3)';
                      (e.currentTarget as HTMLElement).style.color = '#C4B5FD';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                      (e.currentTarget as HTMLElement).style.color = '#A78BFA';
                    }}
                  >
                    ▲
                  </span>
                )}
                {data.hasDownExits && (
                  <span 
                    style={{ 
                      color: '#A78BFA',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'inline-block',
                      transition: 'transform 0.1s ease, color 0.1s ease',
                    }}
                    title={data.downExitIds?.length ? `Down exit (${data.downExitIds.length})` : "Has down exit"}
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onDownExitClick?.();
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.3)';
                      (e.currentTarget as HTMLElement).style.color = '#C4B5FD';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                      (e.currentTarget as HTMLElement).style.color = '#A78BFA';
                    }}
                  >
                    ▼
                  </span>
                )}
              </div>
            )}

            {/* Portal exit badge — icon on node */}
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

            {/* Invisible handles for ReactFlow edge connections (4 source + 4 target) */}
            <Handle type="source" position={Position.Top} id="north-source" style={HANDLE_STYLE} />
            <Handle type="target" position={Position.Top} id="north-target" style={HANDLE_STYLE} />
            <Handle type="source" position={Position.Bottom} id="south-source" style={HANDLE_STYLE} />
            <Handle type="target" position={Position.Bottom} id="south-target" style={HANDLE_STYLE} />
            <Handle type="source" position={Position.Right} id="east-source" style={HANDLE_STYLE} />
            <Handle type="target" position={Position.Right} id="east-target" style={HANDLE_STYLE} />
            <Handle type="source" position={Position.Left} id="west-source" style={HANDLE_STYLE} />
            <Handle type="target" position={Position.Left} id="west-target" style={HANDLE_STYLE} />

            {/* Property tags (4.6) */}
            {data.properties && data.properties.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: `${NODE_H + 2}px`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '2px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {data.properties.map((prop) => (
                  <span
                    key={prop}
                    style={{
                      background: 'rgba(28, 29, 39, 0.85)',
                      color: '#8A8B95',
                      padding: '0 2px',
                      borderRadius: '2px',
                      fontSize: '6px',
                      fontFamily: 'var(--font-mono)',
                      border: '1px solid #3A3B45',
                      lineHeight: '1.2',
                    }}
                    title={prop}
                  >
                    {PROPERTY_ICONS[prop] ?? '•'} {prop}
                  </span>
                ))}
              </div>
            )}
          </div>
        </TooltipPrimitive.Trigger>
        {hasTooltipContent && (
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              side="top"
              sideOffset={10}
              className="bg-[#1C1D27] border border-[#2A2B35] rounded-lg p-3 shadow-lg max-w-[300px] z-[1000]"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              <div className="text-[#C9A84C] font-semibold text-sm mb-1">
                {data.name}
              </div>
              <div className="text-[#6A6B75] text-xs mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
                {data.slug} · {data.type}
              </div>
              {data.description && (
                <div className="text-[#8A8B95] text-xs mb-2">
                  {data.description.length > 100
                    ? data.description.slice(0, 97) + '...'
                    : data.description}
                </div>
              )}
              {data.properties && data.properties.length > 0 && (
                <div className="text-[#6A6B75] text-xs mb-2">
                  Properties: {data.properties.join(', ')}
                </div>
              )}
              {(data.npcs?.length || data.lootContainers?.length || data.hazards?.length) ? (
                <div className="text-[#8A8B95] text-xs space-y-0.5">
                  {data.npcs && data.npcs.length > 0 && (
                    <div>
                      <span className="text-[#D97706]">👤 NPCs:</span>
                      {data.npcs.map((npc, i) => (
                        <div key={i} className="ml-3 text-[#A0A0AA]">
                          {npc.displayName ?? npc.creatureId} ×{npc.spawnCount}
                        </div>
                      ))}
                    </div>
                  )}
                  {data.lootContainers && data.lootContainers.length > 0 && (
                    <div>
                      <span className="text-[#CA8A04]">📦 Loot:</span>
                      {data.lootContainers.map((lc, i) => (
                        <div key={i} className="ml-3 text-[#A0A0AA]">
                          {lc.id} ({lc.type}) — {lc.itemCount} item{lc.itemCount !== 1 ? 's' : ''}
                        </div>
                      ))}
                    </div>
                  )}
                  {data.hazards && data.hazards.length > 0 && (
                    <div>⚠ {data.hazards.length} Hazard{data.hazards.length > 1 ? 's' : ''}</div>
                  )}
                </div>
              ) : null}
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        )}
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
