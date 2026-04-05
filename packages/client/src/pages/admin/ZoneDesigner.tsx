import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Plus, X, Trash2, Link2, Globe, AlertTriangle, Save, Zap, HelpCircle, Search, Filter, Undo2, Redo2 } from "lucide-react";
import { useUndoRedo } from "../../hooks/useUndoRedo.js";
import { computeElkLayout, type LayoutRoom } from "../../map/elkLayout.js";
import { FloorSelector } from "../../components/map/FloorSelector.js";
import { computeFloorBounds } from "../../components/map/useFloorFilter.js";
import { ZoneDesignerFlow } from "../../components/map/ZoneDesignerFlow.js";
import { ReactFlowProvider } from "@xyflow/react";
import type { Node as FlowNode, Edge as FlowEdge } from "@xyflow/react";
import {
  createRoom, updateRoom, deleteRoom,
  createExit, updateExit, deleteExit, listZones, getZone,
  getOrphanedExits, removeOrphanedExits,
  listCreatures, listItems,
  type ZoneDefinition, type ZoneRoomDefinition, type ZoneExitDefinition,
  type OrphanedExitInfo, type RoomNPC, type RoomLootContainer,
} from "../../lib/zone-api.js";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../../components/ui/alert-dialog.js";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ZoneDesignerProps {
  zone: ZoneDefinition;
  rooms: ZoneRoomDefinition[];
  exits: ZoneExitDefinition[];
  zoneId: string | null;
  onZoneChanged?: () => void;
  onRoomSelect?: (roomSlug: string) => void;
  onExitSelect?: (exitId: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

type DesignerMode = "select" | "connect";

const ROOM_TYPE_OPTIONS = [
  "entry", "corridor", "junction", "dead_end", "boss",
  "feature_stash", "feature_expedition_board", "feature_marketplace",
  "feature_crafting", "feature_training", "feature_contracts", "feature_infirmary",
  "feature_armoury", "feature_war_room",
];

const ROOM_PROPERTY_OPTIONS = ["heavy_door", "cavern", "water"] as const;
const DIRECTION_OPTIONS = ["north", "south", "east", "west", "up", "down"];

const OPPOSITE: Record<string, string> = {
  north: "south", south: "north",
  east: "west", west: "east",
  up: "down", down: "up",
};

const ROOM_TYPE_COLORS: Record<string, { fill: string; stroke: string }> = {
  entry:       { fill: "#1A3A2A", stroke: "#2D6B4F" },
  boss:        { fill: "#3A1A1A", stroke: "#8B2500" },
  junction:    { fill: "#1A3A3A", stroke: "#3A7D7B" },
  corridor:    { fill: "#1C1D27", stroke: "#4A4B55" },
  dead_end:    { fill: "#1C1D27", stroke: "#4A4B55" },
};

const FEATURE_COLOR = { fill: "#2A1A3A", stroke: "#7B4FA0" };
const DEFAULT_COLOR = { fill: "#1C1D27", stroke: "#4A4B55" };
const PORTAL_COLOR = "#06b6d4"; // cyan/teal for cross-zone exits
const INTER_FLOOR_COLOR = "#a78bfa"; // purple for inter-floor exits
const ONE_WAY_COLOR = "#F59E0B"; // amber for one-way exits

interface ExitPair {
  forward: ZoneExitDefinition;
  reverse: ZoneExitDefinition | null;
  isBidirectional: boolean;
}

function roomColor(type: string): { fill: string; stroke: string } {
  if (type.startsWith("feature_")) return FEATURE_COLOR;
  return ROOM_TYPE_COLORS[type] ?? DEFAULT_COLOR;
}

// ─── Helper: convert zone data → layout input ───────────────────────────────

function zoneToLayoutInput(
  rooms: ZoneRoomDefinition[],
  exits: ZoneExitDefinition[],
): { rooms: Map<string, LayoutRoom>; entryRoomSlug: string } {
  const map = new Map<string, LayoutRoom>();

  for (const room of rooms) {
    map.set(room.slug, { exits: new Map() });
  }

  for (const exit of exits) {
    if (exit.targetZoneSlug) continue;
    const roomEntry = map.get(exit.fromRoomSlug);
    if (roomEntry) {
      roomEntry.exits.set(exit.direction, exit.toRoomSlug);
    }
  }

  const entryRoom = rooms.find((r) => r.type === "entry");
  const entryRoomSlug = entryRoom?.slug ?? rooms[0]?.slug ?? "";

  return { rooms: map, entryRoomSlug };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Infer compass direction from layout positions (used in connect mode). */
function inferDirection(
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number },
): string {
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "east" : "west";
  return dy > 0 ? "south" : "north";
}

// ─── ReactFlow Conversion ────────────────────────────────────────────────────

/**
 * Convert zone rooms → ReactFlow nodes.
 */
function roomsToFlowNodes(
  rooms: ZoneRoomDefinition[],
  positions: Map<string, { x: number; y: number; z: number }>,
  currentFloor: number,
  selectedRoom: string | null,
  disconnectedSlugs: Set<string>,
  orphanExitIds: Set<string>,
  exits: ZoneExitDefinition[],
  showLabels: boolean,
  mode: DesignerMode,
): FlowNode[] {
  const nodes: FlowNode[] = [];

  for (const room of rooms) {
    const pos = positions.get(room.slug);
    if (!pos || pos.z !== currentFloor) continue;

    // Count up/down/portal exits
    const hasUpExits = exits.some((e) => e.fromRoomSlug === room.slug && e.direction === 'up');
    const hasDownExits = exits.some((e) => e.fromRoomSlug === room.slug && e.direction === 'down');
    const portalCount = exits.filter((e) => e.fromRoomSlug === room.slug && e.targetZoneSlug).length;

    nodes.push({
      id: room.slug,
      type: 'room',
      position: { x: pos.x, y: pos.y },
      data: {
        slug: room.slug,
        name: room.name,
        type: room.type,
        floor: pos.z,
        isDisconnected: disconnectedSlugs.has(room.slug),
        isConnectSource: mode === 'connect' && selectedRoom === room.slug,
        hasUpExits,
        hasDownExits,
        portalCount,
        npcCount: room.npcs?.length ?? 0,
        lootCount: room.lootContainers?.length ?? 0,
        hazardCount: room.hazards?.length ?? 0,
        showLabels,
        properties: Array.isArray(room.properties) ? room.properties : [],
      },
    });
  }

  return nodes;
}

/** Map exit direction to the opposite compass direction (for target handles). */
const OPPOSITE_DIRECTION: Record<string, string> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  up: 'north',
  down: 'south',
};

/**
 * Convert zone exits → ReactFlow edges.
 * Groups bidirectional exit pairs into single edges.
 */
function exitsToFlowEdges(
  exitPairs: ExitPair[],
  interZoneExits: ZoneExitDefinition[],
  positions: Map<string, { x: number; y: number; z: number }>,
  currentFloor: number,
  orphanExitIds: Set<string>,
): FlowEdge[] {
  const edges: FlowEdge[] = [];

  // Intra-zone exit pairs
  for (const pair of exitPairs) {
    const fromPos = positions.get(pair.forward.fromRoomSlug);
    const toPos = positions.get(pair.forward.toRoomSlug);
    if (!fromPos || !toPos || fromPos.z !== currentFloor || toPos.z !== currentFloor) continue;

    const isOrphanFwd = orphanExitIds.has(pair.forward.id);
    const isOrphanRev = pair.reverse ? orphanExitIds.has(pair.reverse.id) : false;

    const dir = pair.forward.direction;
    const oppositeDir = OPPOSITE_DIRECTION[dir] ?? 'north';

    edges.push({
      id: pair.forward.id,
      source: pair.forward.fromRoomSlug,
      target: pair.forward.toRoomSlug,
      sourceHandle: `${dir}-source`,
      targetHandle: `${oppositeDir}-target`,
      type: 'exit',
      data: {
        direction: pair.forward.direction,
        isBidirectional: pair.isBidirectional,
        isOrphan: isOrphanFwd || isOrphanRev,
        isPortal: false,
        locked: pair.forward.locked || (pair.reverse?.locked ?? false),
        hidden: pair.forward.hidden || (pair.reverse?.hidden ?? false),
      },
    });
  }

  // Inter-zone (portal) exits — draw stub edges
  for (const exit of interZoneExits) {
    const fromPos = positions.get(exit.fromRoomSlug);
    if (!fromPos || fromPos.z !== currentFloor) continue;

    // Portal exits don't have a target node in the graph — we'll render them as special stub edges
    // For ReactFlow, we need a dummy target node or just skip drawing them as edges
    // Let's skip them for now since they don't connect to another node in this zone
    // (They're indicated by the portal badge on the room node itself)
  }

  return edges;
}


// ─── Component ───────────────────────────────────────────────────────────────

export default function ZoneDesigner({
  zone,
  rooms,
  exits,
  zoneId,
  onZoneChanged,
  onRoomSelect,
  onExitSelect,
}: ZoneDesignerProps) {
  // ─── State ──────────────────────────────────────────────
  const [mode, setMode] = useState<DesignerMode>("select");
  const [showLabels, setShowLabels] = useState(false);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedExit, setSelectedExit] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Room add form
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({
    slug: "", name: "", description: "", type: "corridor",
    properties: [] as string[], 
    lootContainers: [] as RoomLootContainer[], 
    hazards: [] as unknown[], 
    npcs: [] as RoomNPC[],
  });

  // Room edit (side panel)
  const [editForm, setEditForm] = useState({
    name: "", slug: "", description: "", type: "corridor",
    properties: [] as string[],
    npcs: [] as RoomNPC[],
    lootContainers: [] as RoomLootContainer[],
  });

  // Connect mode
  const [connectTarget, setConnectTarget] = useState<string | null>(null);
  const [connectDirection, setConnectDirection] = useState("north");
  const [connectBidirectional, setConnectBidirectional] = useState(true);

  // Portal dialog
  const [showPortalDialog, setShowPortalDialog] = useState(false);
  const [allZones, setAllZones] = useState<ZoneDefinition[]>([]);
  const [portalTargetZone, setPortalTargetZone] = useState("");
  const [portalTargetRooms, setPortalTargetRooms] = useState<ZoneRoomDefinition[]>([]);
  const [portalTargetRoom, setPortalTargetRoom] = useState("");
  const [portalDirection, setPortalDirection] = useState("north");

  // Orphaned exits
  const [orphanedExits, setOrphanedExits] = useState<OrphanedExitInfo[]>([]);
  const [orphanCount, setOrphanCount] = useState(0);
  const [showOrphans, setShowOrphans] = useState(false);
  const [orphansBusy, setOrphansBusy] = useState(false);

  // Delete exit modal
  const [showDeleteExitModal, setShowDeleteExitModal] = useState(false);
  const [deleteAlsoReverse, setDeleteAlsoReverse] = useState(true);

  // Floor switching
  const [currentFloor, setCurrentFloor] = useState(0);

  // Layout results (computed asynchronously via ELK)
  const [positions, setPositions] = useState<Map<string, { x: number; y: number; z: number }>>(new Map());
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [elkLayoutError, setElkLayoutError] = useState<string | null>(null);

  // Exit edit form
  const [exitEditForm, setExitEditForm] = useState({
    direction: "",
    toRoomSlug: "",
    targetZoneSlug: "",
    targetRoomSlug: "",
    locked: false,
    hidden: false,
  });
  const [reverseExitEditForm, setReverseExitEditForm] = useState({
    direction: "",
    locked: false,
    hidden: false,
  });
  const [exitEditTargetRooms, setExitEditTargetRooms] = useState<ZoneRoomDefinition[]>([]);

  // Context menus
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; roomSlug: string } | null>(null);
  const [exitContextMenu, setExitContextMenu] = useState<{ x: number; y: number; exitId: string } | null>(null);

  // Insert room on exit confirm
  const [insertRoomTarget, setInsertRoomTarget] = useState<string | null>(null);
  const designerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Property clipboard
  const [copiedRoomProps, setCopiedRoomProps] = useState<{
    name: string;
    description: string;
    type: string;
    properties: string[];
  } | null>(null);

  // Copy notification toast
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  // Legend panel
  const [showLegend, setShowLegend] = useState(false);

  // Search & filter (5.2)
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [directionFilter, setDirectionFilter] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Resizable panel
  const [panelWidth, setPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);

  // Creature and item lists for NPC/loot management
  const [creatures, setCreatures] = useState<Array<{ type: string; name: string }>>([]);
  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);

  // Undo/redo operation stack (5.1)
  const {
    pushOperation,
    handleUndo,
    handleRedo,
    undoRedoBusy,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
  } = useUndoRedo(onZoneChanged);

  // Sync edit form when selection changes
  useEffect(() => {
    if (selectedRoom) {
      const room = rooms.find((r) => r.slug === selectedRoom);
      if (room) {
        setEditForm({
          name: room.name,
          slug: room.slug,
          description: room.description,
          type: room.type,
          properties: Array.isArray(room.properties) ? [...room.properties] : [],
          npcs: Array.isArray(room.npcs) ? [...room.npcs] : [],
          lootContainers: Array.isArray(room.lootContainers) ? [...room.lootContainers] : [],
        });
      }
    }
  }, [selectedRoom, rooms]);

  // Fetch creature templates and items on mount
  useEffect(() => {
    void (async () => {
      try {
        const [creaturesData, itemsData] = await Promise.all([
          listCreatures(),
          listItems(),
        ]);
        setCreatures(creaturesData);
        setItems(itemsData);
      } catch (err) {
        console.error('[ZoneDesigner] Failed to fetch creatures/items:', err);
      }
    })();
  }, []);

  // Escape key clears selection; Ctrl/Cmd+F focuses search (5.2)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showSearchBar) {
          setShowSearchBar(false);
          setSearchQuery("");
          setDirectionFilter(null);
        } else {
          setSelectedRoom(null);
          setSelectedExit(null);
          setConnectTarget(null);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearchBar(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSearchBar]);

  // Sync exit edit form when exit selection changes
  useEffect(() => {
    if (selectedExit) {
      const exit = exits.find((e) => e.id === selectedExit);
      if (exit) {
        setExitEditForm({
          direction: exit.direction,
          toRoomSlug: exit.toRoomSlug,
          targetZoneSlug: exit.targetZoneSlug ?? "",
          targetRoomSlug: exit.targetRoomSlug ?? "",
          locked: exit.locked,
          hidden: exit.hidden,
        });
        // Load target zone rooms for cross-zone exits
        if (exit.targetZoneSlug) {
          getZone(exit.targetZoneSlug)
            .then((data) => setExitEditTargetRooms(data.rooms))
            .catch(() => setExitEditTargetRooms([]));
        } else {
          setExitEditTargetRooms([]);
        }
      }
    }
  }, [selectedExit, exits]);

  // ─── Layout computation (ELK hierarchical layout) ──────────────────────────
  useEffect(() => {
    if (rooms.length === 0) {
      setPositions(new Map());
      return;
    }

    const { rooms: layoutInput, entryRoomSlug } = zoneToLayoutInput(rooms, exits);

    setLayoutLoading(true);
    setElkLayoutError(null);
    computeElkLayout(layoutInput, entryRoomSlug)
      .then((pos) => {
        setPositions(pos);
        setLayoutLoading(false);
      })
      .catch((err) => {
        console.error('[ZoneDesigner] ELK layout failed:', err);
        setElkLayoutError(err.message || 'ELK layout failed');
        setLayoutLoading(false);
      });
  }, [rooms, exits]);

  // ─── Derived layout data ────────────────────────────────────────────────────
  const { roomMap, interZoneExits, intraZoneExits } = useMemo(() => {
    const rMap = new Map<string, ZoneRoomDefinition>();
    for (const room of rooms) rMap.set(room.slug, room);

    const inter: ZoneExitDefinition[] = [];
    const intra: ZoneExitDefinition[] = [];
    for (const exit of exits) {
      if (exit.targetZoneSlug) inter.push(exit);
      else intra.push(exit);
    }

    return { roomMap: rMap, interZoneExits: inter, intraZoneExits: intra };
  }, [rooms, exits]);


  // ─── Floor bounds ───────────────────────────────────────
  const floorBounds = useMemo(() => computeFloorBounds(positions), [positions]);

  // ─── Floor-filtered views ───────────────────────────────
  const { floorPositions: _floorPositions, floorIntraExits, floorInterFloorExits: _floorInterFloorExits, ghostFloorRoomSlugs: _ghostFloorRoomSlugs } = useMemo(() => {
    if (!floorBounds.isMultiFloor) {
      return {
        floorPositions: positions,
        floorIntraExits: intraZoneExits,
        floorInterFloorExits: [] as ZoneExitDefinition[],
        ghostFloorRoomSlugs: new Set<string>(),
      };
    }

    // Rooms on the current floor
    const fp = new Map<string, { x: number; y: number; z: number }>();
    for (const [slug, pos] of positions) {
      if (pos.z === currentFloor) fp.set(slug, pos);
    }

    // Classify intra-zone exits
    const onFloor: ZoneExitDefinition[] = [];
    const crossFloor: ZoneExitDefinition[] = [];
    const ghosts = new Set<string>();

    for (const exit of intraZoneExits) {
      const fromPos = positions.get(exit.fromRoomSlug);
      const toPos = positions.get(exit.toRoomSlug);
      if (!fromPos || !toPos) continue;

      const fromOn = fromPos.z === currentFloor;
      const toOn = toPos.z === currentFloor;

      if (fromOn && toOn) {
        onFloor.push(exit);
      } else if (fromOn || toOn) {
        crossFloor.push(exit);
        if (!fromOn) ghosts.add(exit.fromRoomSlug);
        if (!toOn) ghosts.add(exit.toRoomSlug);
      }
    }

    return {
      floorPositions: fp,
      floorIntraExits: onFloor,
      floorInterFloorExits: crossFloor,
      ghostFloorRoomSlugs: ghosts,
    };
  }, [positions, intraZoneExits, currentFloor, floorBounds.isMultiFloor]);

  // ─── Exit pairs (group bidirectional connections) ────────
  const exitPairs = useMemo(() => {
    const pairs: ExitPair[] = [];
    const seen = new Set<string>();

    for (const exit of floorIntraExits) {
      if (seen.has(exit.id)) continue;

      const reverse = floorIntraExits.find(
        (r) =>
          r.fromRoomSlug === exit.toRoomSlug &&
          r.toRoomSlug === exit.fromRoomSlug &&
          r.direction === OPPOSITE[exit.direction] &&
          !seen.has(r.id),
      );

      seen.add(exit.id);
      if (reverse) seen.add(reverse.id);

      pairs.push({
        forward: exit,
        reverse: reverse ?? null,
        isBidirectional: !!reverse,
      });
    }

    return pairs;
  }, [floorIntraExits]);

  // Sync reverse exit edit form when pair selection changes
  useEffect(() => {
    if (!selectedExit) return;
    const pair = exitPairs.find((p) => p.forward.id === selectedExit || p.reverse?.id === selectedExit);
    if (pair?.reverse) {
      setReverseExitEditForm({
        direction: pair.reverse.direction,
        locked: pair.reverse.locked,
        hidden: pair.reverse.hidden,
      });
    } else {
      setReverseExitEditForm({ direction: "", locked: false, hidden: false });
    }
  }, [selectedExit, exitPairs]);

  // ─── Validation ─────────────────────────────────────────
  const validationWarnings = useMemo(() => {
    const warnings: Array<{ type: string; message: string; roomSlugs?: string[] }> = [];
    if (rooms.length === 0) return warnings;

    if (!rooms.some((r) => r.type === "entry")) {
      warnings.push({ type: "no-entry", message: "No room has type \"entry\"" });
    }

    const connected = new Set<string>();
    for (const e of exits) {
      connected.add(e.fromRoomSlug);
      if (!e.targetZoneSlug) connected.add(e.toRoomSlug);
    }
    const disconnected = rooms.filter((r) => !connected.has(r.slug)).map((r) => r.slug);
    if (disconnected.length > 0) {
      warnings.push({
        type: "disconnected",
        message: `Disconnected: ${disconnected.join(", ")}`,
        roomSlugs: disconnected,
      });
    }

    const missingReverse: string[] = [];
    for (const e of exits.filter((ex) => !ex.targetZoneSlug)) {
      const hasReverse = exits.some(
        (r) => r.fromRoomSlug === e.toRoomSlug && r.toRoomSlug === e.fromRoomSlug && !r.targetZoneSlug,
      );
      if (!hasReverse) {
        missingReverse.push(`${e.fromRoomSlug}→${e.toRoomSlug}`);
      }
    }
    if (missingReverse.length > 0) {
      warnings.push({
        type: "missing-reverse",
        message: `One-way exits: ${missingReverse.join(", ")}`,
      });
    }

    return warnings;
  }, [rooms, exits]);

  const disconnectedSlugs = useMemo(() => {
    return new Set(validationWarnings.find((w) => w.type === "disconnected")?.roomSlugs ?? []);
  }, [validationWarnings]);

  // Detect true orphan exit IDs (toRoomSlug doesn't exist in zone rooms) for SVG highlighting
  const orphanExitIds = useMemo(() => {
    const ids = new Set<string>();
    const roomSlugs = new Set(rooms.map((r) => r.slug));
    for (const e of exits) {
      if (!roomSlugs.has(e.fromRoomSlug)) {
        ids.add(e.id);
      } else if (!e.targetZoneSlug && !roomSlugs.has(e.toRoomSlug)) {
        ids.add(e.id);
      }
    }
    return ids;
  }, [rooms, exits]);

  // ─── Search match set (5.2) ──────────────────────────────────────────────────
  const searchMatchSlugs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null; // null = no active search
    const matched = new Set<string>();
    for (const room of rooms) {
      if (
        room.name.toLowerCase().includes(q) ||
        room.slug.toLowerCase().includes(q) ||
        room.type.toLowerCase().includes(q)
      ) {
        matched.add(room.slug);
      }
    }
    return matched;
  }, [searchQuery, rooms]);

  // ─── ReactFlow nodes & edges ────────────────────────────────────────────────
  const flowNodes = useMemo(() => {
    const nodes = roomsToFlowNodes(
      rooms,
      positions,
      currentFloor,
      selectedRoom,
      disconnectedSlugs,
      orphanExitIds,
      exits,
      showLabels,
      mode,
    );
    // Apply search match/dim styling
    if (searchMatchSlugs !== null) {
      for (const node of nodes) {
        const isMatch = searchMatchSlugs.has(node.id);
        (node.data as Record<string, unknown>).searchMatch = isMatch;
        (node.data as Record<string, unknown>).dimmed = !isMatch;
      }
    }
    return nodes;
  }, [rooms, positions, currentFloor, selectedRoom, disconnectedSlugs, orphanExitIds, exits, showLabels, mode, searchMatchSlugs]);

  const flowEdges = useMemo(() => {
    let edges = exitsToFlowEdges(
      exitPairs,
      interZoneExits,
      positions,
      currentFloor,
      orphanExitIds,
    );
    // Apply direction filter (5.2): hide edges that don't match the selected direction group
    if (directionFilter) {
      const allowedDirs = directionFilter === "ns" ? ["north", "south"]
        : directionFilter === "ew" ? ["east", "west"]
        : directionFilter === "ud" ? ["up", "down"]
        : [];
      edges = edges.filter((e) => {
        const dir = (e.data as Record<string, unknown>)?.direction as string | undefined;
        return dir ? allowedDirs.includes(dir) : true;
      });
    }
    // Apply search dim to edges: dim edges not connecting matched rooms
    if (searchMatchSlugs !== null) {
      for (const edge of edges) {
        const srcMatch = searchMatchSlugs.has(edge.source);
        const tgtMatch = searchMatchSlugs.has(edge.target);
        (edge.data as Record<string, unknown>).dimmed = !(srcMatch || tgtMatch);
      }
    }
    return edges;
  }, [exitPairs, interZoneExits, positions, currentFloor, orphanExitIds, directionFilter, searchMatchSlugs]);

  // ─── Click handlers ─────────────────────────────────────
  function handleRoomClick(slug: string) {
    if (mode === "connect" && selectedRoom && slug !== selectedRoom) {
      const fromPos = positions.get(selectedRoom);
      const toPos = positions.get(slug);
      const dir = fromPos && toPos ? inferDirection(fromPos, toPos) : "north";
      setConnectTarget(slug);
      setConnectDirection(dir);
      setConnectBidirectional(true);
      return;
    }
    // Auto-switch floor when clicking a room on a different floor
    if (floorBounds.isMultiFloor) {
      const pos = positions.get(slug);
      if (pos && pos.z !== currentFloor) setCurrentFloor(pos.z);
    }
    setSelectedRoom(slug);
    setSelectedExit(null);
    setConnectTarget(null);
    onRoomSelect?.(slug);
  }

  function handleExitClick(exitId: string) {
    setSelectedExit(exitId);
    setSelectedRoom(null);
    setConnectTarget(null);
    onExitSelect?.(exitId);
  }

  function handleCanvasClick() {
    setContextMenu(null);
    setExitContextMenu(null);
    if (mode === "select") {
      setSelectedRoom(null);
      setSelectedExit(null);
      setConnectTarget(null);
    }
  }

  function handleRoomContextMenu(e: React.MouseEvent, slug: string) {
    e.preventDefault();
    e.stopPropagation();
    setExitContextMenu(null);
    const bounds = designerRef.current?.getBoundingClientRect();
    setContextMenu({
      x: e.clientX - (bounds?.left ?? 0),
      y: e.clientY - (bounds?.top ?? 0),
      roomSlug: slug,
    });
  }

  function handleExitContextMenu(e: React.MouseEvent, exitId: string) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(null);
    const bounds = designerRef.current?.getBoundingClientRect();
    setExitContextMenu({
      x: e.clientX - (bounds?.left ?? 0),
      y: e.clientY - (bounds?.top ?? 0),
      exitId,
    });
  }

  function handleRoomMouseEnter(e: React.MouseEvent, slug: string) {
    // Cancel any pending leave — mouse moved to another node
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    // Capture coordinates immediately — React synthetic events are pooled
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    if (!canvasBounds) return;
    const x = rect.left + rect.width / 2 - canvasBounds.left;
    const y = rect.top - canvasBounds.top;
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null;
      setHoveredRoom(slug);
      setHoverPosition({ x, y });
    }, 150);
  }

  function handleRoomMouseLeave(_e: React.MouseEvent, _slug: string) {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    // Short delay before hiding — prevents flicker when moving between nodes
    // or when ReactFlow fires spurious leave events during re-renders
    leaveTimerRef.current = setTimeout(() => {
      leaveTimerRef.current = null;
      setHoveredRoom(null);
      setHoverPosition(null);
    }, 100);
  }

  async function handleAddRoomInDirection(fromSlug: string, direction: string) {
    if (!zoneId) return;
    const timestamp = Date.now();
    const newSlug = `new-room-${timestamp}`;
    try {
      setBusy(true);
      setError(null);
      await createRoom(zoneId, {
        slug: newSlug,
        name: "New Room",
        description: "",
        type: "corridor",
        properties: [],
        lootContainers: [],
        hazards: [],
        npcs: [],
      } as Partial<ZoneRoomDefinition>);
      // Forward exit
      await createExit(zoneId, {
        fromRoomSlug: fromSlug,
        direction,
        toRoomSlug: newSlug,
        locked: false,
        hidden: false,
      } as Partial<ZoneExitDefinition>);
      // Reverse exit
      if (OPPOSITE[direction]) {
        await createExit(zoneId, {
          fromRoomSlug: newSlug,
          direction: OPPOSITE[direction],
          toRoomSlug: fromSlug,
          locked: false,
          hidden: false,
        } as Partial<ZoneExitDefinition>);
      }
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add room");
    } finally {
      setBusy(false);
    }
  }

  // ─── Panel resize handlers ────────────────────────────────
  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, width: panelWidth };
  }

  useEffect(() => {
    if (!isResizing) return;

    function handleResizeMove(e: MouseEvent) {
      if (!resizeStartRef.current) return;
      const deltaX = resizeStartRef.current.x - e.clientX;
      const newWidth = Math.max(280, Math.min(600, resizeStartRef.current.width + deltaX));
      setPanelWidth(newWidth);
    }

    function handleResizeEnd() {
      setIsResizing(false);
      resizeStartRef.current = null;
    }

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  // Close context menu on Escape or click outside
  useEffect(() => {
    if (!contextMenu && !exitContextMenu) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setContextMenu(null);
        setExitContextMenu(null);
      }
    }
    function onClick() {
      setContextMenu(null);
      setExitContextMenu(null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [contextMenu, exitContextMenu]);

  // ─── Room CRUD ──────────────────────────────────────────
  function openAddRoom() {
    setRoomForm({ slug: "", name: "", description: "", type: "corridor", properties: [], lootContainers: [], hazards: [], npcs: [] });
    setShowRoomForm(true);
  }

  async function handleSaveNewRoom() {
    if (!roomForm.slug || !roomForm.name) {
      setError("Slug and name are required");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      if (zoneId) {
        const created = await createRoom(zoneId, roomForm);
        const savedForm = { ...roomForm };
        const savedZoneId = zoneId;
        pushOperation({
          type: 'createRoom',
          label: `Create room '${savedForm.name}'`,
          undo: async () => { await deleteRoom(created.id); },
          redo: async () => { await createRoom(savedZoneId, savedForm); },
        });
      }
      setShowRoomForm(false);
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateRoom() {
    const room = rooms.find((r) => r.slug === selectedRoom);
    if (!room) return;
    try {
      setBusy(true);
      setError(null);
      const previousData = {
        name: room.name,
        description: room.description,
        type: room.type,
        properties: Array.isArray(room.properties) ? [...room.properties] : [],
        npcs: Array.isArray(room.npcs) ? [...room.npcs] : [],
        lootContainers: Array.isArray(room.lootContainers) ? [...room.lootContainers] : [],
      };
      const newData = {
        name: editForm.name,
        description: editForm.description,
        type: editForm.type,
        properties: editForm.properties,
        npcs: editForm.npcs,
        lootContainers: editForm.lootContainers,
      };
      await updateRoom(room.id, newData);
      const savedRoomId = room.id;
      pushOperation({
        type: 'updateRoom',
        label: `Update room '${room.name}'`,
        undo: async () => { await updateRoom(savedRoomId, previousData); },
        redo: async () => { await updateRoom(savedRoomId, newData); },
      });
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update room");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteRoom() {
    const room = rooms.find((r) => r.slug === selectedRoom);
    if (!room || !confirm(`Delete room "${room.name}"?`)) return;
    try {
      setBusy(true);
      setError(null);
      // Snapshot room data for undo restoration
      const savedRoom = { ...room };
      const savedZoneId = zoneId;
      await deleteRoom(room.id);
      if (savedZoneId) {
        pushOperation({
          type: 'deleteRoom',
          label: `Delete room '${savedRoom.name}'`,
          undo: async () => {
            await createRoom(savedZoneId, {
              slug: savedRoom.slug,
              name: savedRoom.name,
              description: savedRoom.description,
              type: savedRoom.type,
              properties: savedRoom.properties,
              lootContainers: savedRoom.lootContainers,
              hazards: savedRoom.hazards,
              npcs: savedRoom.npcs,
            });
          },
          redo: async () => {
            // Find the re-created room by slug to get its new ID
            const refreshed = rooms.find((r) => r.slug === savedRoom.slug);
            if (refreshed) await deleteRoom(refreshed.id);
          },
        });
      }
      setSelectedRoom(null);
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete room");
    } finally {
      setBusy(false);
    }
  }

  // ─── Exit CRUD ──────────────────────────────────────────
  async function handleCreateConnection() {
    if (!connectTarget || !selectedRoom || !zoneId) return;
    try {
      setBusy(true);
      setError(null);
      const exitData: Record<string, unknown> = {
        fromRoomSlug: selectedRoom,
        direction: connectDirection,
        toRoomSlug: connectTarget,
        locked: false,
        hidden: false,
      };
      const created = await createExit(zoneId, exitData as Partial<ZoneExitDefinition>);

      let createdReverse: ZoneExitDefinition | null = null;
      if (connectBidirectional && OPPOSITE[connectDirection]) {
        const reverseData: Record<string, unknown> = {
          fromRoomSlug: connectTarget,
          direction: OPPOSITE[connectDirection],
          toRoomSlug: selectedRoom,
          locked: false,
          hidden: false,
        };
        createdReverse = await createExit(zoneId, reverseData as Partial<ZoneExitDefinition>);
      }

      const savedZoneId = zoneId;
      const savedExitData = { ...exitData } as Partial<ZoneExitDefinition>;
      const savedReverseData = createdReverse
        ? ({ fromRoomSlug: connectTarget, direction: OPPOSITE[connectDirection], toRoomSlug: selectedRoom, locked: false, hidden: false } as Partial<ZoneExitDefinition>)
        : null;
      const fromName = rooms.find(r => r.slug === selectedRoom)?.name ?? selectedRoom;
      const toName = rooms.find(r => r.slug === connectTarget)?.name ?? connectTarget;

      pushOperation({
        type: 'createExit',
        label: `Connect '${fromName}' → '${toName}'`,
        undo: async () => {
          await deleteExit(created.id);
          if (createdReverse) await deleteExit(createdReverse.id);
        },
        redo: async () => {
          const re = await createExit(savedZoneId, savedExitData);
          // Update closure reference for future undo
          created.id = re.id;
          if (savedReverseData) {
            const reRev = await createExit(savedZoneId, savedReverseData);
            if (createdReverse) createdReverse.id = reRev.id;
          }
        },
      });

      setConnectTarget(null);
      setMode("select");
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create exit");
    } finally {
      setBusy(false);
    }
  }

  function handleDeleteExit(exitIdOverride?: string) {
    const targetId = exitIdOverride ?? selectedExit;
    if (!targetId) return;
    if (exitIdOverride) setSelectedExit(exitIdOverride);
    const exit = exits.find((e) => e.id === targetId);
    if (!exit) return;
    // Check if there's a reverse exit
    const reverseExit = exits.find((e) =>
      e.fromRoomSlug === exit.toRoomSlug &&
      e.toRoomSlug === exit.fromRoomSlug &&
      e.direction === OPPOSITE[exit.direction]
    );
    // Default to checked if reverse exit exists (most exits are bidirectional)
    setDeleteAlsoReverse(!!reverseExit);
    setShowDeleteExitModal(true);
  }

  async function confirmDeleteExit(alsoDeleteReverse: boolean) {
    if (!selectedExit) return;
    const exit = exits.find((e) => e.id === selectedExit);
    if (!exit) return;
    try {
      setBusy(true);
      setError(null);
      
      // Snapshot exit data for undo
      const savedExit = { ...exit };
      const savedZoneId = exit.zoneId;
      let savedReverseExit: ZoneExitDefinition | null = null;
      
      // Delete the selected exit
      await deleteExit(selectedExit);
      
      // If requested, also delete the reverse exit
      if (alsoDeleteReverse) {
        const reverseExit = exits.find((e) =>
          e.fromRoomSlug === exit.toRoomSlug &&
          e.toRoomSlug === exit.fromRoomSlug &&
          e.direction === OPPOSITE[exit.direction]
        );
        if (reverseExit?.id) {
          savedReverseExit = { ...reverseExit };
          await deleteExit(reverseExit.id);
        }
      }

      const fromName = rooms.find(r => r.slug === savedExit.fromRoomSlug)?.name ?? savedExit.fromRoomSlug;
      const toName = rooms.find(r => r.slug === savedExit.toRoomSlug)?.name ?? savedExit.toRoomSlug;

      pushOperation({
        type: 'deleteExit',
        label: `Delete exit '${fromName}' → '${toName}'`,
        undo: async () => {
          const re = await createExit(savedZoneId, {
            fromRoomSlug: savedExit.fromRoomSlug,
            direction: savedExit.direction,
            toRoomSlug: savedExit.toRoomSlug,
            locked: savedExit.locked,
            hidden: savedExit.hidden,
            targetZoneSlug: savedExit.targetZoneSlug,
            targetRoomSlug: savedExit.targetRoomSlug,
          });
          savedExit.id = re.id;
          if (savedReverseExit) {
            const reRev = await createExit(savedZoneId, {
              fromRoomSlug: savedReverseExit.fromRoomSlug,
              direction: savedReverseExit.direction,
              toRoomSlug: savedReverseExit.toRoomSlug,
              locked: savedReverseExit.locked,
              hidden: savedReverseExit.hidden,
            });
            savedReverseExit.id = reRev.id;
          }
        },
        redo: async () => {
          await deleteExit(savedExit.id);
          if (savedReverseExit) await deleteExit(savedReverseExit.id);
        },
      });
      
      setSelectedExit(null);
      setShowDeleteExitModal(false);
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete exit");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateExit() {
    if (!selectedExit) return;
    try {
      setBusy(true);
      setError(null);
      const exit = exits.find((e) => e.id === selectedExit);
      // Snapshot previous data for undo
      const previousData: Partial<ZoneExitDefinition> = exit
        ? { direction: exit.direction, toRoomSlug: exit.toRoomSlug, locked: exit.locked, hidden: exit.hidden, targetZoneSlug: exit.targetZoneSlug, targetRoomSlug: exit.targetRoomSlug }
        : {};
      const data: Record<string, unknown> = {
        direction: exitEditForm.direction,
        toRoomSlug: exitEditForm.toRoomSlug,
        locked: exitEditForm.locked,
        hidden: exitEditForm.hidden,
      };
      if (exitEditForm.targetZoneSlug) {
        data.targetZoneSlug = exitEditForm.targetZoneSlug;
        data.targetRoomSlug = exitEditForm.targetRoomSlug;
      } else {
        data.targetZoneSlug = null;
        data.targetRoomSlug = null;
      }
      const savedExitId = selectedExit;
      const newData = { ...data } as Partial<ZoneExitDefinition>;
      await updateExit(selectedExit, data as Partial<ZoneExitDefinition>);

      const fromName = exit ? (rooms.find(r => r.slug === exit.fromRoomSlug)?.name ?? exit.fromRoomSlug) : selectedExit;
      pushOperation({
        type: 'updateExit',
        label: `Update exit from '${fromName}'`,
        undo: async () => { await updateExit(savedExitId, previousData); },
        redo: async () => { await updateExit(savedExitId, newData); },
      });
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update exit");
    } finally {
      setBusy(false);
    }
  }

  // ─── Pair-aware exit operations ────────────────────────
  async function handleAddReverse() {
    if (!selectedExit || !zoneId) return;
    const exit = exits.find((e) => e.id === selectedExit);
    if (!exit || exit.targetZoneSlug) return;
    const reverseDir = OPPOSITE[exit.direction];
    if (!reverseDir) return;
    try {
      setBusy(true);
      setError(null);
      await createExit(zoneId, {
        fromRoomSlug: exit.toRoomSlug,
        direction: reverseDir,
        toRoomSlug: exit.fromRoomSlug,
        locked: false,
        hidden: false,
      } as Partial<ZoneExitDefinition>);
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add reverse exit");
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePair() {
    const pair = exitPairs.find((p) => p.forward.id === selectedExit || p.reverse?.id === selectedExit);
    if (!pair) return;
    try {
      setBusy(true);
      setError(null);
      await updateExit(pair.forward.id, {
        direction: exitEditForm.direction,
        toRoomSlug: exitEditForm.toRoomSlug,
        locked: exitEditForm.locked,
        hidden: exitEditForm.hidden,
        ...(exitEditForm.targetZoneSlug
          ? { targetZoneSlug: exitEditForm.targetZoneSlug, targetRoomSlug: exitEditForm.targetRoomSlug }
          : { targetZoneSlug: null, targetRoomSlug: null }),
      } as Partial<ZoneExitDefinition>);
      if (pair.reverse) {
        await updateExit(pair.reverse.id, {
          direction: reverseExitEditForm.direction,
          locked: reverseExitEditForm.locked,
          hidden: reverseExitEditForm.hidden,
        } as Partial<ZoneExitDefinition>);
      }
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update exit pair");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteReverseOnly() {
    const pair = exitPairs.find((p) => p.forward.id === selectedExit || p.reverse?.id === selectedExit);
    if (!pair?.reverse) return;
    if (!confirm(`Delete reverse exit ${pair.reverse.fromRoomSlug} → ${pair.reverse.toRoomSlug}? This makes the connection one-way.`)) return;
    try {
      setBusy(true);
      setError(null);
      await deleteExit(pair.reverse.id);
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete reverse exit");
    } finally {
      setBusy(false);
    }
  }

  // ─── Insert room on exit ────────────────────────────────
  function requestInsertRoomOnExit(exitId: string) {
    setInsertRoomTarget(exitId);
  }

  async function executeInsertRoomOnExit() {
    const targetExitId = insertRoomTarget;
    if (!targetExitId || !zoneId) return;

    const pair = exitPairs.find(
      (p) => p.forward.id === targetExitId || p.reverse?.id === targetExitId,
    );
    const exit = pair?.forward ?? exits.find((e) => e.id === targetExitId);
    if (!exit || exit.targetZoneSlug) return;

    const fromSlug = exit.fromRoomSlug;
    const toSlug = exit.toRoomSlug;
    const direction = exit.direction;
    const reverseDir = OPPOSITE[direction];
    if (!reverseDir) return;

    const timestamp = Date.now();
    const newSlug = `inserted-room-${timestamp}`;

    try {
      setBusy(true);
      setError(null);
      setInsertRoomTarget(null);

      // 1. Create the new room
      await createRoom(zoneId, {
        slug: newSlug,
        name: "New Room",
        description: "",
        type: "corridor",
        properties: [],
        lootContainers: [],
        hazards: [],
        npcs: [],
      } as Partial<ZoneRoomDefinition>);

      // 2. Delete the original exit(s)
      await deleteExit(exit.id);
      if (pair?.reverse) {
        await deleteExit(pair.reverse.id);
      }

      // 3. Create fromRoom → newRoom exit
      await createExit(zoneId, {
        fromRoomSlug: fromSlug,
        direction,
        toRoomSlug: newSlug,
        locked: false,
        hidden: false,
      } as Partial<ZoneExitDefinition>);
      // Reverse: newRoom → fromRoom
      await createExit(zoneId, {
        fromRoomSlug: newSlug,
        direction: reverseDir,
        toRoomSlug: fromSlug,
        locked: false,
        hidden: false,
      } as Partial<ZoneExitDefinition>);

      // 4. Create newRoom → toRoom exit
      await createExit(zoneId, {
        fromRoomSlug: newSlug,
        direction,
        toRoomSlug: toSlug,
        locked: false,
        hidden: false,
      } as Partial<ZoneExitDefinition>);
      // Reverse: toRoom → newRoom
      await createExit(zoneId, {
        fromRoomSlug: toSlug,
        direction: reverseDir,
        toRoomSlug: newSlug,
        locked: false,
        hidden: false,
      } as Partial<ZoneExitDefinition>);

      setSelectedExit(null);
      onZoneChanged?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to insert room on exit",
      );
    } finally {
      setBusy(false);
    }
  }

  // ─── Orphan management ─────────────────────────────────
  const handleScanOrphans = useCallback(async () => {
    try {
      setOrphansBusy(true);
      setError(null);
      const result = await getOrphanedExits();
      setOrphanedExits(result.orphanedExits);
      setOrphanCount(result.count);
      setShowOrphans(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan orphaned exits");
    } finally {
      setOrphansBusy(false);
    }
  }, []);

  async function handleRemoveAllOrphans() {
    if (!confirm(`Remove all ${orphanCount} orphaned exits?`)) return;
    try {
      setOrphansBusy(true);
      setError(null);
      await removeOrphanedExits();
      setOrphanedExits([]);
      setOrphanCount(0);
      setShowOrphans(false);
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove orphaned exits");
    } finally {
      setOrphansBusy(false);
    }
  }

  async function handleRemoveOrphan(exitId: string) {
    try {
      setOrphansBusy(true);
      setError(null);
      await deleteExit(exitId);
      setOrphanedExits((prev) => prev.filter((o) => o.exit.id !== exitId));
      setOrphanCount((c) => Math.max(0, c - 1));
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete orphan");
    } finally {
      setOrphansBusy(false);
    }
  }

  async function handleExitEditZoneChange(zoneSlug: string) {
    setExitEditForm((f) => ({ ...f, targetZoneSlug: zoneSlug, targetRoomSlug: "" }));
    if (!zoneSlug) { setExitEditTargetRooms([]); return; }
    try {
      const data = await getZone(zoneSlug);
      setExitEditTargetRooms(data.rooms);
    } catch {
      setExitEditTargetRooms([]);
    }
  }

  // ─── Portal CRUD ────────────────────────────────────────
  async function openPortalDialog() {
    if (!selectedRoom) return;
    try {
      const zones = await listZones();
      setAllZones(zones.filter((z) => z.slug !== zone.slug));
      setPortalTargetZone("");
      setPortalTargetRooms([]);
      setPortalTargetRoom("");
      setPortalDirection("north");
      setShowPortalDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load zones");
    }
  }

  async function handlePortalZoneChange(zoneSlug: string) {
    setPortalTargetZone(zoneSlug);
    setPortalTargetRoom("");
    if (!zoneSlug) { setPortalTargetRooms([]); return; }
    try {
      const data = await getZone(zoneSlug);
      setPortalTargetRooms(data.rooms);
    } catch {
      setPortalTargetRooms([]);
    }
  }

  async function handleCreatePortal() {
    if (!selectedRoom || !zoneId || !portalTargetZone || !portalTargetRoom) return;
    try {
      setBusy(true);
      setError(null);
      const exitData: Record<string, unknown> = {
        fromRoomSlug: selectedRoom,
        direction: portalDirection,
        toRoomSlug: selectedRoom,
        targetZoneSlug: portalTargetZone,
        targetRoomSlug: portalTargetRoom,
        locked: false,
        hidden: false,
      };
      await createExit(zoneId, exitData as Partial<ZoneExitDefinition>);
      setShowPortalDialog(false);
      setMode("select");
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create portal");
    } finally {
      setBusy(false);
    }
  }

  // ─── Render helpers ─────────────────────────────────────
  const selectedRoomData = selectedRoom ? roomMap.get(selectedRoom) : null;
  const selectedExitData = selectedExit ? exits.find((e) => e.id === selectedExit) : null;
  const selectedPair = useMemo(() => {
    if (!selectedExit) return null;
    return exitPairs.find((p) => p.forward.id === selectedExit || p.reverse?.id === selectedExit) ?? null;
  }, [selectedExit, exitPairs]);

  // Empty state (no zone saved yet)
  if (!zoneId && rooms.length === 0) {
    return (
      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
        <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
          Save the zone first, then add rooms.
        </p>
      </div>
    );
  }

  return (
    <div ref={designerRef} className="bg-[#12131A] border border-[#2A2B35] rounded-lg h-full flex flex-col select-none [&_input]:select-text [&_textarea]:select-text [&_select]:select-text [&_[contenteditable]]:select-text" style={{ position: "relative" }}>
      {/* ─── Error banner ─────────────────────────────────── */}
      {error && (
        <div className="px-4 py-2 bg-[#8B2500]/30 border-b border-[#8B2500] flex items-center justify-between">
          <span className="text-[#E8E0D0] text-xs" style={{ fontFamily: "var(--font-sans)" }}>
            ⚠ {error}
          </span>
          <button onClick={() => setError(null)} className="text-[#8A8B95] hover:text-[#E8E0D0]">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ─── Toolbar ──────────────────────────────────────── */}
      <div className="px-4 py-2 border-b border-[#2A2B35] flex items-center gap-2 flex-wrap">
        <button
          onClick={openAddRoom}
          disabled={!zoneId || busy}
          className="px-3 py-1.5 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded text-xs flex items-center gap-1.5 disabled:opacity-40 transition-colors"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <Plus className="w-3 h-3" />
          Add Room
        </button>

        <button
          onClick={() => {
            if (mode === "connect") { setMode("select"); setConnectTarget(null); }
            else if (selectedRoom) { setMode("connect"); }
          }}
          disabled={!selectedRoom || busy}
          className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors ${
            mode === "connect"
              ? "bg-[#3A7D7B] text-[#E8E0D0]"
              : "border border-[#3A7D7B] text-[#3A7D7B] hover:bg-[#1C1D27]"
          } disabled:opacity-40`}
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <Link2 className="w-3 h-3" />
          {mode === "connect" ? "Connecting…" : "Connect"}
        </button>

        <button
          onClick={() => void openPortalDialog()}
          disabled={!selectedRoom || !zoneId || busy}
          className="px-3 py-1.5 border border-[#7B4FA0] text-[#7B4FA0] hover:bg-[#1C1D27] rounded text-xs flex items-center gap-1.5 disabled:opacity-40 transition-colors"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <Globe className="w-3 h-3" />
          Portal
        </button>

        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors ${
            showLabels
              ? "bg-[#C9A84C] text-[#0A0B0F]"
              : "border border-[#4A4B55] text-[#8A8B95] hover:bg-[#1C1D27]"
          }`}
          style={{ fontFamily: "var(--font-sans)" }}
          title="Toggle room name labels on map"
        >
          Labels {showLabels ? "On" : "Off"}
        </button>

        <button
          onClick={() => void handleScanOrphans()}
          disabled={orphansBusy}
          className="px-3 py-1.5 border border-[#8B2500] text-[#8B2500] hover:bg-[#8B2500]/20 rounded text-xs flex items-center gap-1.5 disabled:opacity-40 transition-colors relative"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <Zap className="w-3 h-3" />
          Orphaned Exits
          {orphanCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-[#8B2500] text-[#E8E0D0] rounded-full text-[10px] leading-none font-bold">
              {orphanCount}
            </span>
          )}
        </button>

        {floorBounds.isMultiFloor && (
          <FloorSelector
            currentFloor={currentFloor}
            minFloor={floorBounds.minFloor}
            maxFloor={floorBounds.maxFloor}
            onFloorChange={setCurrentFloor}
            roomCounts={floorBounds.roomCounts}
            keyboardEnabled={true}
          />
        )}

        {/* Undo / Redo (5.1) */}
        <div className="flex items-center gap-1 border-l border-[#2A2B35] pl-2">
          <button
            onClick={() => void handleUndo()}
            disabled={!canUndo || busy || undoRedoBusy}
            className="px-2 py-1.5 border border-[#4A4B55] text-[#8A8B95] hover:text-[#E8E0D0] hover:bg-[#1C1D27] rounded text-xs flex items-center gap-1 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#8A8B95] transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
            title={undoLabel ? `Undo: ${undoLabel}` : "Nothing to undo"}
          >
            <Undo2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => void handleRedo()}
            disabled={!canRedo || busy || undoRedoBusy}
            className="px-2 py-1.5 border border-[#4A4B55] text-[#8A8B95] hover:text-[#E8E0D0] hover:bg-[#1C1D27] rounded text-xs flex items-center gap-1 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#8A8B95] transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
            title={redoLabel ? `Redo: ${redoLabel}` : "Nothing to redo"}
          >
            <Redo2 className="w-3 h-3" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Layout status */}
        <div className="flex items-center gap-1 border-l border-[#2A2B35] pl-2">
          <span
            className="px-2 py-1.5 border border-[#7B4FA0] text-[#C9A84C] bg-[#2A1A3A] text-xs rounded"
            style={{ fontFamily: "var(--font-sans)" }}
            title="ELK hierarchical layout engine"
          >
            ELK
          </span>
          {layoutLoading && (
            <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-sans)" }}>
              ⏳
            </span>
          )}
          {elkLayoutError && (
            <span className="text-[#F59E0B] text-xs" style={{ fontFamily: "var(--font-sans)" }} title={elkLayoutError}>
              ⚠️
            </span>
          )}
        </div>

        {mode === "connect" && (
          <span className="text-[#C9A84C] text-xs" style={{ fontFamily: "var(--font-sans)" }}>
            Click a target room to connect
          </span>
        )}
        {mode !== "select" && (
          <button
            onClick={() => { setMode("select"); setConnectTarget(null); }}
            className="px-2 py-1 text-[#8A8B95] hover:text-[#E8E0D0] text-xs"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Cancel
          </button>
        )}

        {/* Search toggle (5.2) */}
        <button
          onClick={() => {
            setShowSearchBar(!showSearchBar);
            if (!showSearchBar) setTimeout(() => searchInputRef.current?.focus(), 0);
          }}
          className={`px-2 py-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
            showSearchBar || searchQuery || directionFilter
              ? "bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40"
              : "border border-[#4A4B55] text-[#8A8B95] hover:bg-[#1C1D27]"
          }`}
          style={{ fontFamily: "var(--font-sans)" }}
          title="Search & Filter (Ctrl+F)"
        >
          <Search className="w-3 h-3" />
        </button>
      </div>

      {/* ─── Search & filter bar (5.2) ────────────────────── */}
      {showSearchBar && (
        <div className="px-4 py-2 border-b border-[#2A2B35] flex items-center gap-3 bg-[#1C1D27]/60" style={{ fontFamily: "var(--font-sans)" }}>
          {/* Room search input */}
          <div className="flex items-center gap-1.5 flex-1 max-w-xs">
            <Search className="w-3 h-3 text-[#8A8B95] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms by name, slug, or type…"
              className="flex-1 bg-transparent border-b border-[#4A4B55] text-[#E8E0D0] text-xs py-1 px-1 focus:border-[#22D3EE] focus:outline-none placeholder:text-[#6A6B75]"
              style={{ fontFamily: "var(--font-mono)" }}
            />
            {searchQuery && (
              <span className="text-[#8A8B95] text-[10px] whitespace-nowrap">
                {searchMatchSlugs?.size ?? 0} match{(searchMatchSlugs?.size ?? 0) !== 1 ? "es" : ""}
              </span>
            )}
          </div>

          {/* Direction filter toggles */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#8A8B95] shrink-0" />
            {[
              { key: "ns", label: "N/S", colors: "border-[#3B82F6] text-[#3B82F6]", active: "bg-[#3B82F6]/20" },
              { key: "ew", label: "E/W", colors: "border-[#F59E0B] text-[#F59E0B]", active: "bg-[#F59E0B]/20" },
              { key: "ud", label: "U/D", colors: "border-[#A78BFA] text-[#A78BFA]", active: "bg-[#A78BFA]/20" },
            ].map(({ key, label, colors, active }) => (
              <button
                key={key}
                onClick={() => setDirectionFilter(directionFilter === key ? null : key)}
                className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                  directionFilter === key
                    ? `${colors} ${active}`
                    : "border-[#3A3B45] text-[#6A6B75] hover:text-[#8A8B95]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Clear all filters */}
          {(searchQuery || directionFilter) && (
            <button
              onClick={() => { setSearchQuery(""); setDirectionFilter(null); }}
              className="px-2 py-0.5 text-[#8A8B95] hover:text-[#E8E0D0] text-[10px] border border-[#3A3B45] rounded transition-colors"
            >
              Clear
            </button>
          )}

          {/* Close search bar */}
          <button
            onClick={() => { setShowSearchBar(false); setSearchQuery(""); setDirectionFilter(null); }}
            className="text-[#8A8B95] hover:text-[#E8E0D0]"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ─── Main area (canvas + side panel) ──────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* ReactFlow Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 p-4 overflow-hidden relative"
          onClick={(e) => { if (e.target === e.currentTarget) handleCanvasClick(); }}
        >
          {rooms.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                Add rooms to see the zone layout.
              </p>
            </div>
          ) : (
            <ReactFlowProvider>
              <ZoneDesignerFlow
                nodes={flowNodes}
                edges={flowEdges}
                onNodeClick={handleRoomClick}
                onEdgeClick={handleExitClick}
                onNodeContextMenu={handleRoomContextMenu}
                onNodeMouseEnter={handleRoomMouseEnter}
                onNodeMouseLeave={handleRoomMouseLeave}
                onEdgeContextMenu={handleExitContextMenu}
                onPaneClick={handleCanvasClick}
                selectedNodeId={selectedRoom}
                selectedEdgeId={selectedExit}
                floor={currentFloor}
              />
            </ReactFlowProvider>
          )}

          {/* ─── Legend panel ──────────────────────────────── */}
          {rooms.length > 0 && (
            <div
              style={{
                position: "absolute",
                bottom: 16,
                left: 16,
                zIndex: 50,
                fontFamily: "var(--font-sans)",
              }}
            >
              {!showLegend ? (
                <button
                  onClick={() => setShowLegend(true)}
                  className="flex items-center gap-1 bg-[#1C1D27]/90 border border-[#2A2B35] rounded px-2 py-1 text-[#8A8B95] text-xs hover:text-[#E8E0D0] hover:border-[#4A4B55] transition-colors"
                  title="Show legend"
                >
                  <HelpCircle size={12} />
                  <span>Legend</span>
                </button>
              ) : (
                <div
                  className="bg-[#1C1D27]/95 border border-[#2A2B35] rounded-lg shadow-lg"
                  style={{ maxWidth: 260, backdropFilter: "blur(4px)" }}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A2B35]">
                    <span className="text-[#C9A84C] text-xs font-semibold uppercase tracking-wider">Legend</span>
                    <button
                      onClick={() => setShowLegend(false)}
                      className="text-[#8A8B95] hover:text-[#E8E0D0] transition-colors"
                      title="Hide legend"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="p-3 space-y-3 text-xs">
                    {/* Room types */}
                    <div>
                      <div className="text-[#8A8B95] uppercase tracking-wider mb-1.5" style={{ fontSize: 9 }}>Room Types</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        {([
                          ["entry", "Entry"],
                          ["boss", "Boss"],
                          ["junction", "Junction"],
                          ["corridor", "Corridor"],
                          ["dead_end", "Dead End"],
                          ["feature_", "Feature"],
                        ] as const).map(([type, label]) => {
                          const c = type === "feature_" ? FEATURE_COLOR : (ROOM_TYPE_COLORS[type] ?? DEFAULT_COLOR);
                          return (
                            <div key={type} className="flex items-center gap-1.5">
                              <svg width="14" height="14" viewBox="0 0 14 14">
                                <rect x="1" y="1" width="12" height="12" rx="2" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
                              </svg>
                              <span className="text-[#E8E0D0]">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selection states */}
                    <div>
                      <div className="text-[#8A8B95] uppercase tracking-wider mb-1.5" style={{ fontSize: 9 }}>Selection</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <svg width="14" height="14" viewBox="0 0 14 14">
                            <rect x="1" y="1" width="12" height="12" rx="2" fill={DEFAULT_COLOR.fill} stroke="#22D3EE" strokeWidth="2.5" />
                          </svg>
                          <span className="text-[#E8E0D0]">Selected</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg width="14" height="14" viewBox="0 0 14 14">
                            <rect x="1" y="1" width="12" height="12" rx="2" fill={DEFAULT_COLOR.fill} stroke="#B8860B" strokeWidth="2" />
                          </svg>
                          <span className="text-[#E8E0D0]">Disconnected</span>
                        </div>
                      </div>
                    </div>

                    {/* Exits */}
                    <div>
                      <div className="text-[#8A8B95] uppercase tracking-wider mb-1.5" style={{ fontSize: 9 }}>Exits</div>
                      <div className="space-y-1">
                        {/* Bidirectional (no arrow) */}
                        <div className="flex items-center gap-1.5">
                          <svg width="24" height="10" viewBox="0 0 24 10">
                            <line x1="2" y1="5" x2="22" y2="5" stroke="#4A4B55" strokeWidth={1.5} />
                          </svg>
                          <span className="text-[#E8E0D0]">Bidirectional</span>
                        </div>
                        {/* One-way (amber arrow) */}
                        <div className="flex items-center gap-1.5">
                          <svg width="24" height="10" viewBox="0 0 24 10">
                            <line x1="2" y1="5" x2="17" y2="5" stroke={ONE_WAY_COLOR} strokeWidth={2} />
                            <polygon points="17 1.5, 23 5, 17 8.5" fill={ONE_WAY_COLOR} />
                          </svg>
                          <span className="text-[#E8E0D0]">One-Way</span>
                        </div>
                        {/* Other exit styles */}
                        {([
                          { color: "#C9A84C", dash: undefined, width: 2, label: "Selected", hasArrow: false },
                          { color: "#EF4444", dash: "6 3", width: 1.5, label: "Orphaned", hasArrow: true },
                          { color: PORTAL_COLOR, dash: "4 2", width: 2, label: "Cross-Zone Portal", hasArrow: true },
                          { color: INTER_FLOOR_COLOR, dash: undefined, width: 1.5, label: "Inter-Floor", hasArrow: false },
                        ] as const).map((e) => (
                          <div key={e.label} className="flex items-center gap-1.5">
                            <svg width="24" height="10" viewBox="0 0 24 10">
                              <line
                                x1="2" y1="5" x2={e.hasArrow ? "19" : "22"} y2="5"
                                stroke={e.color} strokeWidth={e.width}
                                strokeDasharray={e.dash}
                              />
                              {e.hasArrow && <polygon points="19 2, 23 5, 19 8" fill={e.color} />}
                            </svg>
                            <span className="text-[#E8E0D0]">{e.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Exit modifiers */}
                    <div>
                      <div className="text-[#8A8B95] uppercase tracking-wider mb-1.5" style={{ fontSize: 9 }}>Exit Modifiers</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span style={{ fontSize: 11 }}>🔒</span>
                          <span className="text-[#E8E0D0]">Locked</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span style={{ fontSize: 11 }}>👁</span>
                          <span className="text-[#E8E0D0]">Hidden</span>
                        </div>
                      </div>
                    </div>

                    {/* Room badges */}
                    <div>
                      <div className="text-[#8A8B95] uppercase tracking-wider mb-1.5" style={{ fontSize: 9 }}>Room Badges</div>
                      <div className="space-y-1">
                        {([
                          { icon: "👤", color: "#D97706", bg: "#2A1E0A", label: "NPCs" },
                          { icon: "📦", color: "#CA8A04", bg: "#2A200A", label: "Loot" },
                          { icon: "⚠", color: "#DC2626", bg: "#2A0A0A", label: "Hazards" },
                        ] as const).map((b) => (
                          <div key={b.label} className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 14 14">
                              <circle cx="7" cy="7" r="5" fill={b.bg} stroke={b.color} strokeWidth="1" />
                              <text x="7" y="7" textAnchor="middle" dominantBaseline="central" fill={b.color} fontSize="6">{b.icon}</text>
                            </svg>
                            <span className="text-[#E8E0D0]">{b.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Room indicators */}
                    <div>
                      <div className="text-[#8A8B95] uppercase tracking-wider mb-1.5" style={{ fontSize: 9 }}>Indicators</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <svg width="14" height="14" viewBox="0 0 14 14">
                            <circle cx="7" cy="7" r="5" fill="#1a1033" stroke={INTER_FLOOR_COLOR} strokeWidth="1" />
                            <text x="7" y="7" textAnchor="middle" dominantBaseline="central" fill={INTER_FLOOR_COLOR} fontSize="7" fontWeight="bold">▲</text>
                          </svg>
                          <span className="text-[#E8E0D0]">Floor Up/Down</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg width="14" height="14" viewBox="0 0 14 14">
                            <circle cx="7" cy="7" r="6" fill="#0e3a3d" stroke={PORTAL_COLOR} strokeWidth="1" />
                            <text x="7" y="7" textAnchor="middle" dominantBaseline="central" fill={PORTAL_COLOR} fontSize="8">⟐</text>
                          </svg>
                          <span className="text-[#E8E0D0]">Portal</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#B8860B]" style={{ fontSize: 11 }}>⚠</span>
                          <span className="text-[#E8E0D0]">Disconnected Warning</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Hover tooltip ─────────────────────────────── */}
          {hoveredRoom && hoverPosition && !showLabels && (() => {
            const room = roomMap.get(hoveredRoom);
            if (!room) return null;
            return (
              <div
                style={{
                  position: "absolute",
                  left: hoverPosition.x,
                  top: hoverPosition.y - 10,
                  transform: "translate(-50%, -100%)",
                  pointerEvents: "none",
                  zIndex: 1000,
                  maxWidth: "300px",
                }}
              >
                <div
                  className="bg-[#1C1D27] border border-[#2A2B35] rounded-lg p-3 shadow-lg"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <div className="text-[#C9A84C] font-semibold text-sm mb-1">
                    {room.name}
                  </div>
                  <div className="text-[#6A6B75] text-xs mb-2" style={{ fontFamily: "var(--font-mono)" }}>
                    {room.slug} · {room.type}
                  </div>
                  {room.description && (
                    <div className="text-[#8A8B95] text-xs mb-2">
                      {room.description.length > 100
                        ? room.description.slice(0, 97) + "..."
                        : room.description}
                    </div>
                  )}
                  {room.properties && room.properties.length > 0 && (
                    <div className="text-[#6A6B75] text-xs mb-2">
                      Properties: {room.properties.join(", ")}
                    </div>
                  )}
                  {(room.npcs?.length || room.lootContainers?.length || room.hazards?.length) && (
                    <div className="text-[#8A8B95] text-xs space-y-0.5">
                      {room.npcs?.length > 0 && (
                        <div>
                          <span className="text-[#D97706]">👤 NPCs:</span>
                          {room.npcs.map((npc: RoomNPC, i: number) => {
                            const tpl = creatures.find((c) => c.type === npc.creatureId);
                            return (
                              <div key={i} className="ml-3 text-[#A0A0AA]">
                                {tpl?.name ?? npc.creatureId} ×{npc.spawnCount}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {room.lootContainers?.length > 0 && (
                        <div>
                          <span className="text-[#CA8A04]">📦 Loot:</span>
                          {room.lootContainers.map((lc: RoomLootContainer, i: number) => (
                            <div key={i} className="ml-3 text-[#A0A0AA]">
                              {lc.id} ({lc.type}) — {lc.items?.length ?? 0} item{(lc.items?.length ?? 0) !== 1 ? "s" : ""}
                            </div>
                          ))}
                        </div>
                      )}
                      {room.hazards?.length > 0 && (
                        <div>⚠ {room.hazards.length} Hazard{room.hazards.length > 1 ? "s" : ""}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ─── Side panel ─────────────────────────────────── */}
        {(selectedRoomData || selectedExitData || connectTarget) && (
          <div 
            className="border-l border-[#2A2B35] p-4 space-y-3 flex-shrink-0 relative"
            style={{ width: panelWidth }}
          >
            {/* Drag handle */}
            <div
              onMouseDown={handleResizeStart}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#C9A84C] transition-colors bg-[#2A2B35]"
              style={{ zIndex: 10 }}
            />
            {/* Connect confirmation */}
            {connectTarget && selectedRoom && (
              <div className="space-y-3">
                <h4
                  className="text-[#C9A84C] text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Create Connection
                </h4>
                <div className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                  {selectedRoom} {connectBidirectional ? "↔" : "→"} {connectTarget}
                </div>
                <div>
                  <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                    Direction
                  </label>
                  <select
                    value={connectDirection}
                    onChange={(e) => setConnectDirection(e.target.value)}
                    className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] text-xs focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {DIRECTION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <label
                  className={`flex items-center gap-2 cursor-pointer rounded p-2 border transition-colors ${
                    connectBidirectional
                      ? "border-[#3A7D7B] bg-[#3A7D7B]/10"
                      : "border-[#2A2B35]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={connectBidirectional}
                    onChange={(e) => setConnectBidirectional(e.target.checked)}
                    className="accent-[#C9A84C]"
                  />
                  <div>
                    <span className="text-[#E8E0D0] text-xs font-medium" style={{ fontFamily: "var(--font-sans)" }}>
                      ↔ Bidirectional
                    </span>
                    <div className="text-[#6A6B75] text-xs mt-0.5" style={{ fontFamily: "var(--font-sans)" }}>
                      Also create {connectTarget} → {selectedRoom} ({OPPOSITE[connectDirection] || "reverse"})
                    </div>
                  </div>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleCreateConnection()}
                    disabled={busy}
                    className="flex-1 px-2 py-1.5 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded text-xs disabled:opacity-40"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setConnectTarget(null)}
                    className="px-2 py-1.5 border border-[#2A2B35] text-[#8A8B95] rounded text-xs hover:bg-[#12131A]"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Selected room details */}
            {selectedRoomData && !connectTarget && (
              <div className="space-y-3">
                <h4
                  className="text-[#C9A84C] text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Room Details
                </h4>
                <div>
                  <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] text-xs focus:border-[#C9A84C] focus:outline-none"
                   
                  />
                </div>
                <div>
                  <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                    Slug
                  </label>
                  <input
                    type="text"
                    value={editForm.slug}
                    disabled
                    className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#6A6B75] text-xs"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                    Type
                  </label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] text-xs focus:border-[#C9A84C] focus:outline-none"
                    style={{
                      fontFamily: "var(--font-sans)",
                      borderLeftColor: roomColor(editForm.type).stroke,
                      borderLeftWidth: 3,
                    }}
                  >
                    {ROOM_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    rows={8}
                    className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-2 py-2 text-[#D3D7CF] text-sm leading-relaxed focus:border-[#C9A84C] focus:outline-none resize-y"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", lineHeight: "1.35" }}
                    placeholder="Room description as the player will see it…"
                  />
                </div>
                {/* Properties checkboxes */}
                <div>
                  <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                    Properties
                  </label>
                  <div className="space-y-1">
                    {ROOM_PROPERTY_OPTIONS.map((prop) => (
                      <label key={prop} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.properties.includes(prop)}
                          onChange={(e) => {
                            setEditForm((f) => ({
                              ...f,
                              properties: e.target.checked
                                ? [...f.properties, prop]
                                : f.properties.filter((p) => p !== prop),
                            }));
                          }}
                          className="accent-[#C9A84C]"
                        />
                        <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                          {prop}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* NPCs section */}
                <div>
                  <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                    NPCs
                  </label>
                  <div className="space-y-2">
                    {editForm.npcs.map((npc, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={npc.creatureId}
                          onChange={(e) => {
                            const newNpcs = [...editForm.npcs];
                            newNpcs[idx] = { ...npc, creatureId: e.target.value };
                            setEditForm((f) => ({ ...f, npcs: newNpcs }));
                          }}
                          className="flex-1 bg-[#12131A] border border-[#2A2B35] rounded px-2 py-1 text-[#E8E0D0] text-xs focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          <option value="">Select creature…</option>
                          {creatures.map((c) => (
                            <option key={c.type} value={c.type}>{c.name}</option>
                          ))}
                          {npc.creatureId && !creatures.some((c) => c.type === npc.creatureId) && (
                            <option value={npc.creatureId}>{npc.creatureId} (unregistered)</option>
                          )}
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={npc.spawnCount}
                          onChange={(e) => {
                            const newNpcs = [...editForm.npcs];
                            newNpcs[idx] = { ...npc, spawnCount: parseInt(e.target.value) || 1 };
                            setEditForm((f) => ({ ...f, npcs: newNpcs }));
                          }}
                          className="w-16 bg-[#12131A] border border-[#2A2B35] rounded px-2 py-1 text-[#E8E0D0] text-xs focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                        <button
                          onClick={() => {
                            setEditForm((f) => ({ ...f, npcs: f.npcs.filter((_, i) => i !== idx) }));
                          }}
                          className="p-1 text-[#8B2500] hover:bg-[#8B2500]/20 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setEditForm((f) => ({ ...f, npcs: [...f.npcs, { creatureId: "", spawnCount: 1 }] }));
                      }}
                      className="w-full px-2 py-1 border border-[#2A2B35] text-[#8A8B95] hover:bg-[#12131A] rounded text-xs flex items-center justify-center gap-1"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      <Plus className="w-3 h-3" />
                      Add NPC
                    </button>
                  </div>
                </div>

                {/* Loot section */}
                <div>
                  <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                    Loot Containers
                  </label>
                  <div className="space-y-2">
                    {editForm.lootContainers.map((loot, idx) => (
                      <div key={idx} className="border border-[#2A2B35] rounded p-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <input
                            value={loot.id}
                            onChange={(e) => {
                              const newLoot = [...editForm.lootContainers];
                              newLoot[idx] = { ...loot, id: e.target.value };
                              setEditForm((f) => ({ ...f, lootContainers: newLoot }));
                            }}
                            placeholder="Container ID"
                            className="flex-1 bg-[#12131A] border border-[#2A2B35] rounded px-2 py-1 text-[#E8E0D0] text-xs focus:border-[#C9A84C] focus:outline-none"
                            style={{ fontFamily: "var(--font-mono)" }}
                          />
                          <select
                            value={loot.type}
                            onChange={(e) => {
                              const newLoot = [...editForm.lootContainers];
                              newLoot[idx] = { ...loot, type: e.target.value };
                              setEditForm((f) => ({ ...f, lootContainers: newLoot }));
                            }}
                            className="w-20 bg-[#12131A] border border-[#2A2B35] rounded px-2 py-1 text-[#E8E0D0] text-xs focus:border-[#C9A84C] focus:outline-none"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            <option value="crate">crate</option>
                            <option value="chest">chest</option>
                            <option value="altar">altar</option>
                            <option value="corpse">corpse</option>
                            <option value="barrel">barrel</option>
                          </select>
                          <button
                            onClick={() => {
                              setEditForm((f) => ({ ...f, lootContainers: f.lootContainers.filter((_, i) => i !== idx) }));
                            }}
                            className="p-1 text-[#8B2500] hover:bg-[#8B2500]/20 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="ml-2 space-y-1">
                          {(loot.items ?? []).map((itemId, itemIdx) => (
                            <div key={itemIdx} className="flex items-center gap-1">
                              <select
                                value={itemId}
                                onChange={(e) => {
                                  const newLoot = [...editForm.lootContainers];
                                  const newItems = [...(newLoot[idx].items ?? [])];
                                  newItems[itemIdx] = e.target.value;
                                  newLoot[idx] = { ...loot, items: newItems };
                                  setEditForm((f) => ({ ...f, lootContainers: newLoot }));
                                }}
                                className="flex-1 bg-[#12131A] border border-[#2A2B35] rounded px-1 py-0.5 text-[#A0A0AA] text-xs focus:border-[#C9A84C] focus:outline-none"
                                style={{ fontFamily: "var(--font-sans)" }}
                              >
                                <option value="">Select item…</option>
                                {items.map((it) => (
                                  <option key={it.id} value={it.id}>{it.name}</option>
                                ))}
                                {itemId && !items.some((it) => it.id === itemId) && (
                                  <option value={itemId}>{itemId} (unregistered)</option>
                                )}
                              </select>
                              <button
                                onClick={() => {
                                  const newLoot = [...editForm.lootContainers];
                                  const newItems = (newLoot[idx].items ?? []).filter((_, i) => i !== itemIdx);
                                  newLoot[idx] = { ...loot, items: newItems };
                                  setEditForm((f) => ({ ...f, lootContainers: newLoot }));
                                }}
                                className="p-0.5 text-[#8B2500] hover:bg-[#8B2500]/20 rounded"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const newLoot = [...editForm.lootContainers];
                              newLoot[idx] = { ...loot, items: [...(loot.items ?? []), ""] };
                              setEditForm((f) => ({ ...f, lootContainers: newLoot }));
                            }}
                            className="text-[#6A6B75] hover:text-[#C9A84C] text-xs flex items-center gap-0.5"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            <Plus className="w-2.5 h-2.5" /> item
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setEditForm((f) => ({ ...f, lootContainers: [...f.lootContainers, { id: "", type: "crate", items: [] }] }));
                      }}
                      className="w-full px-2 py-1 border border-[#2A2B35] text-[#8A8B95] hover:bg-[#12131A] rounded text-xs flex items-center justify-center gap-1"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      <Plus className="w-3 h-3" />
                      Add Item
                    </button>
                  </div>
                </div>

                {/* In-game preview */}
                <div>
                  <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                    Player Preview
                  </label>
                  <div
                    className="bg-[#0A0B0F] border border-[#2A2B35] rounded p-3"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", lineHeight: "1.35" }}
                  >
                    <h2
                      className="mb-1"
                      style={{
                        fontSize: "1.125rem",
                        color: "#C9A84C",
                      }}
                    >
                      {editForm.name || "Untitled Room"}
                      {editForm.type && editForm.type !== "corridor" && editForm.type !== "dead_end" && (
                        <span
                          className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            fontFamily: "var(--font-sans)",
                            color: editForm.type === "boss" ? "#DC2626"
                              : editForm.type === "entry" ? "#60A5FA"
                              : "#8A8B95",
                            background: editForm.type === "boss" ? "rgba(220,38,38,0.1)"
                              : editForm.type === "entry" ? "rgba(96,165,250,0.1)"
                              : "rgba(138,139,149,0.1)",
                          }}
                        >
                          {editForm.type.replace(/_/g, " ").toUpperCase()}
                        </span>
                      )}
                    </h2>
                    <p style={{ color: "#D3D7CF", maxWidth: "80ch" }}>
                      {editForm.description || <span style={{ color: "#4A4B55", fontStyle: "italic" }}>No description yet.</span>}
                    </p>
                    <div style={{ height: 1, background: "#C9A84C", opacity: 0.1, marginTop: "0.5rem" }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleUpdateRoom()}
                    disabled={busy}
                    className="flex-1 px-2 py-1.5 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded text-xs flex items-center justify-center gap-1 disabled:opacity-40"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={() => void handleDeleteRoom()}
                    disabled={busy}
                    className="px-2 py-1.5 border border-[#8B2500] text-[#8B2500] hover:bg-[#8B2500]/20 rounded text-xs flex items-center gap-1 disabled:opacity-40"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Selected exit pair or single exit panel */}
            {selectedPair ? (
              <div className="space-y-3">
                <h4
                  className="text-[#C9A84C] text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {selectedPair.isBidirectional ? "Exit Pair ↔" : "One-Way Exit →"}
                </h4>
                {/* Connection summary */}
                <div className="bg-[#12131A] border border-[#2A2B35] rounded p-2">
                  <div className="text-[#E8E0D0] text-xs flex items-center gap-1.5" style={{ fontFamily: "var(--font-mono)" }}>
                    <span>{roomMap.get(selectedPair.forward.fromRoomSlug)?.name ?? selectedPair.forward.fromRoomSlug}</span>
                    <span style={{ color: selectedPair.isBidirectional ? "#4A4B55" : ONE_WAY_COLOR }}>
                      {selectedPair.isBidirectional ? "↔" : "→"}
                    </span>
                    <span>{roomMap.get(selectedPair.forward.toRoomSlug)?.name ?? selectedPair.forward.toRoomSlug}</span>
                  </div>
                </div>
                {/* Forward direction */}
                <div className="border border-[#2A2B35] rounded p-3 space-y-2">
                  <div className="text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>
                    {selectedPair.forward.fromRoomSlug} → {selectedPair.forward.direction}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exitEditForm.locked}
                      onChange={(e) => setExitEditForm((f) => ({ ...f, locked: e.target.checked }))}
                      className="accent-[#C9A84C]"
                    />
                    <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-sans)" }}>🔒 Locked</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exitEditForm.hidden}
                      onChange={(e) => setExitEditForm((f) => ({ ...f, hidden: e.target.checked }))}
                      className="accent-[#C9A84C]"
                    />
                    <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-sans)" }}>👁 Hidden</span>
                  </label>
                </div>
                {/* Reverse direction */}
                {selectedPair.reverse ? (
                  <div className="border border-[#2A2B35] rounded p-3 space-y-2">
                    <div className="text-[#8A8B95] text-xs uppercase tracking-wider flex items-center justify-between" style={{ fontFamily: "var(--font-sans)" }}>
                      <span>{selectedPair.reverse.fromRoomSlug} → {selectedPair.reverse.direction}</span>
                      <button
                        onClick={() => void handleDeleteReverseOnly()}
                        disabled={busy}
                        className="text-[#8B2500] hover:text-[#EF4444] disabled:opacity-40"
                        title="Delete reverse (make one-way)"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reverseExitEditForm.locked}
                        onChange={(e) => setReverseExitEditForm((f) => ({ ...f, locked: e.target.checked }))}
                        className="accent-[#C9A84C]"
                      />
                      <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-sans)" }}>🔒 Locked</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reverseExitEditForm.hidden}
                        onChange={(e) => setReverseExitEditForm((f) => ({ ...f, hidden: e.target.checked }))}
                        className="accent-[#C9A84C]"
                      />
                      <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-sans)" }}>👁 Hidden</span>
                    </label>
                  </div>
                ) : (
                  <button
                    onClick={() => void handleAddReverse()}
                    disabled={busy || !OPPOSITE[selectedPair.forward.direction]}
                    className="w-full px-2 py-1.5 border border-dashed border-[#3A7D7B] text-[#3A7D7B] hover:bg-[#3A7D7B]/10 rounded text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <Plus className="w-3 h-3" />
                    Add Reverse ({OPPOSITE[selectedPair.forward.direction] ?? "?"})
                  </button>
                )}
                {/* Save / Delete */}
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleSavePair()}
                    disabled={busy}
                    className="flex-1 px-2 py-1.5 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded text-xs flex items-center justify-center gap-1 disabled:opacity-40"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={() => void handleDeleteExit()}
                    disabled={busy}
                    className="px-2 py-1.5 border border-[#8B2500] text-[#8B2500] hover:bg-[#8B2500]/20 rounded text-xs flex items-center gap-1 disabled:opacity-40"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : selectedExitData ? (
              <div className="space-y-3">
                <h4
                  className="text-[#C9A84C] text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Edit Exit
                </h4>
                {/* From room (read-only) */}
                <div>
                  <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                    From
                  </label>
                  <input
                    type="text"
                    value={selectedExitData.fromRoomSlug}
                    disabled
                    className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#6A6B75] text-xs"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                {/* Direction */}
                <div>
                  <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                    Direction
                  </label>
                  <select
                    value={exitEditForm.direction}
                    onChange={(e) => setExitEditForm((f) => ({ ...f, direction: e.target.value }))}
                    className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] text-xs focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {DIRECTION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                {/* To room */}
                <div>
                  <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                    To Room
                  </label>
                  {exitEditForm.targetZoneSlug ? (
                    <input
                      type="text"
                      value={exitEditForm.toRoomSlug}
                      onChange={(e) => setExitEditForm((f) => ({ ...f, toRoomSlug: e.target.value }))}
                      className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] text-xs focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-mono)" }}
                    />
                  ) : (
                    <select
                      value={exitEditForm.toRoomSlug}
                      onChange={(e) => setExitEditForm((f) => ({ ...f, toRoomSlug: e.target.value }))}
                      className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] text-xs focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      <option value="">Select room…</option>
                      {rooms.map((r) => (
                        <option key={r.slug} value={r.slug}>{r.name} ({r.slug})</option>
                      ))}
                    </select>
                  )}
                </div>
                {/* Portal target zone (optional) */}
                {selectedExitData.targetZoneSlug && (
                  <>
                    <div>
                      <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                        <span style={{ color: PORTAL_COLOR }}>⟐</span> Target Zone
                      </label>
                      <input
                        type="text"
                        value={exitEditForm.targetZoneSlug}
                        onChange={(e) => void handleExitEditZoneChange(e.target.value)}
                        className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-2 py-1.5 text-xs focus:border-[#C9A84C] focus:outline-none"
                        style={{ fontFamily: "var(--font-mono)", color: PORTAL_COLOR }}
                      />
                    </div>
                    <div>
                      <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                        <span style={{ color: PORTAL_COLOR }}>⟐</span> Target Room
                      </label>
                      {exitEditTargetRooms.length > 0 ? (
                        <select
                          value={exitEditForm.targetRoomSlug}
                          onChange={(e) => setExitEditForm((f) => ({ ...f, targetRoomSlug: e.target.value }))}
                          className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-2 py-1.5 text-xs focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-sans)", color: PORTAL_COLOR }}
                        >
                          <option value="">Select room…</option>
                          {exitEditTargetRooms.map((r) => (
                            <option key={r.slug} value={r.slug}>{r.name} ({r.slug})</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={exitEditForm.targetRoomSlug}
                          onChange={(e) => setExitEditForm((f) => ({ ...f, targetRoomSlug: e.target.value }))}
                          className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-2 py-1.5 text-xs focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-mono)", color: PORTAL_COLOR }}
                        />
                      )}
                    </div>
                  </>
                )}
                {/* Locked toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exitEditForm.locked}
                    onChange={(e) => setExitEditForm((f) => ({ ...f, locked: e.target.checked }))}
                    className="accent-[#C9A84C]"
                  />
                  <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-sans)" }}>
                    🔒 Locked
                  </span>
                </label>
                {/* Hidden toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exitEditForm.hidden}
                    onChange={(e) => setExitEditForm((f) => ({ ...f, hidden: e.target.checked }))}
                    className="accent-[#C9A84C]"
                  />
                  <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-sans)" }}>
                    👁 Hidden
                  </span>
                </label>
                {/* Save / Delete */}
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleUpdateExit()}
                    disabled={busy}
                    className="flex-1 px-2 py-1.5 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded text-xs flex items-center justify-center gap-1 disabled:opacity-40"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={() => void handleDeleteExit()}
                    disabled={busy}
                    className="px-2 py-1.5 border border-[#8B2500] text-[#8B2500] hover:bg-[#8B2500]/20 rounded text-xs flex items-center gap-1 disabled:opacity-40"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ─── Context menu overlay ──────────────────────────── */}
      {contextMenu && (() => {
        const cmRoom = rooms.find((r) => r.slug === contextMenu.roomSlug);
        const usedDirs = new Set(
          exits
            .filter((e) => e.fromRoomSlug === contextMenu.roomSlug && !e.targetZoneSlug)
            .map((e) => e.direction),
        );
        const directions: Array<{ dir: string; label: string; arrow: string }> = [
          { dir: "north", label: "Add Room North", arrow: "↑" },
          { dir: "south", label: "Add Room South", arrow: "↓" },
          { dir: "east",  label: "Add Room East",  arrow: "→" },
          { dir: "west",  label: "Add Room West",  arrow: "←" },
          { dir: "up",    label: "Add Room Up",    arrow: "▲" },
          { dir: "down",  label: "Add Room Down",  arrow: "▼" },
        ];
        return (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 100,
              background: "#1C1D27",
              border: "1px solid #2A2B35",
              borderRadius: 6,
              padding: "4px 0",
              minWidth: 180,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "#E0E0E0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Room name header */}
            <div style={{
              padding: "4px 12px 4px",
              color: "#C9A84C",
              fontSize: 13,
              fontWeight: 600,
              borderBottom: "1px solid #2A2B35",
              marginBottom: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {cmRoom?.name || contextMenu.roomSlug}
            </div>
            {directions.map(({ dir, label, arrow }) => {
              const disabled = usedDirs.has(dir);
              return (
                <button
                  key={dir}
                  disabled={disabled || busy}
                  onClick={() => {
                    setContextMenu(null);
                    void handleAddRoomInDirection(contextMenu.roomSlug, dir);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "6px 12px",
                    background: "transparent",
                    border: "none",
                    color: disabled ? "#4A4B55" : "#E0E0E0",
                    cursor: disabled ? "default" : "pointer",
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = "#2A2B35";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  <span style={{ width: 14, textAlign: "center" }}>{arrow}</span>
                  {label}
                </button>
              );
            })}

            {/* Divider */}
            <div style={{ height: 1, background: "#2A2B35", margin: "4px 0" }} />

            <button
              onClick={() => {
                setContextMenu(null);
                handleRoomClick(contextMenu.roomSlug);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 12px",
                background: "transparent",
                border: "none",
                color: "#E0E0E0",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                textAlign: "left",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#2A2B35"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <span style={{ width: 14, textAlign: "center" }}>✎</span>
              Edit Room
            </button>

            <button
              onClick={() => {
                const room = cmRoom;
                if (room) {
                  setCopiedRoomProps({
                    name: room.name,
                    description: room.description,
                    type: room.type,
                    properties: Array.isArray(room.properties) ? [...room.properties] : [],
                  });
                  setCopyNotification(`📋 Copied properties from ${room.name}`);
                  setTimeout(() => setCopyNotification(null), 3000);
                }
                setContextMenu(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 12px",
                background: "transparent",
                border: "none",
                color: "#E0E0E0",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                textAlign: "left",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#2A2B35"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <span style={{ width: 14, textAlign: "center" }}>📋</span>
              Copy Properties
            </button>

            {copiedRoomProps && (
              <button
                disabled={busy}
                onClick={() => {
                  const targetRoom = cmRoom;
                  if (!targetRoom || !copiedRoomProps) return;
                  setContextMenu(null);
                  setBusy(true);
                  setError(null);
                  updateRoom(targetRoom.id, {
                    name: copiedRoomProps.name,
                    description: copiedRoomProps.description,
                    type: copiedRoomProps.type,
                    properties: copiedRoomProps.properties,
                  })
                    .then(() => { onZoneChanged?.(); })
                    .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to paste properties"))
                    .finally(() => setBusy(false));
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "6px 12px",
                  background: "transparent",
                  border: "none",
                  color: busy ? "#4A4B55" : "#E0E0E0",
                  cursor: busy ? "default" : "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!busy) (e.currentTarget as HTMLButtonElement).style.background = "#2A2B35";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <span style={{ width: 14, textAlign: "center" }}>📌</span>
                <span>
                  Paste Properties from{" "}
                  <span style={{ color: "#8A8B95" }}>
                    {copiedRoomProps.name.length > 20
                      ? copiedRoomProps.name.slice(0, 20) + "..."
                      : copiedRoomProps.name}
                  </span>
                </span>
              </button>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: "#2A2B35", margin: "4px 0" }} />

            <button
              onClick={() => {
                setContextMenu(null);
                setSelectedRoom(contextMenu.roomSlug);
                setSelectedExit(null);
                setConnectTarget(null);
                setMode("connect");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 12px",
                background: "transparent",
                border: "none",
                color: "#E0E0E0",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                textAlign: "left",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#2A2B35"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <span style={{ width: 14, textAlign: "center" }}>⟗</span>
              Connect Exit…
            </button>

            {/* Divider */}
            <div style={{ height: 1, background: "#2A2B35", margin: "4px 0" }} />

            <button
              disabled={busy}
              onClick={() => {
                setContextMenu(null);
                if (!cmRoom || !confirm(`Delete room "${cmRoom.name}"?`)) return;
                setBusy(true);
                setError(null);
                deleteRoom(cmRoom.id)
                  .then(() => { setSelectedRoom(null); onZoneChanged?.(); })
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to delete room"))
                  .finally(() => setBusy(false));
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 12px",
                background: "transparent",
                border: "none",
                color: "#8B2500",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                textAlign: "left",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#2A2B35"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <span style={{ width: 14, textAlign: "center" }}>🗑</span>
              Delete Room
            </button>
          </div>
        );
      })()}

      {/* ─── Exit context menu overlay ─────────────────────────── */}
      {exitContextMenu && (() => {
        const cmExit = exits.find((e) => e.id === exitContextMenu.exitId);
        if (!cmExit) return null;
        const cmPair = exitPairs.find(  // eslint-disable-line @typescript-eslint/no-unused-vars
          (p) => p.forward.id === exitContextMenu.exitId || p.reverse?.id === exitContextMenu.exitId,
        );
        const fromRoom = roomMap.get(cmExit.fromRoomSlug);
        const toRoom = roomMap.get(cmExit.toRoomSlug);
        const isPortal = !!cmExit.targetZoneSlug;

        return (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: exitContextMenu.y,
              left: exitContextMenu.x,
              zIndex: 100,
              background: "#1C1D27",
              border: "1px solid #2A2B35",
              borderRadius: 6,
              padding: "4px 0",
              minWidth: 200,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "#E0E0E0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Exit label header */}
            <div style={{
              padding: "4px 12px 4px",
              color: "#C9A84C",
              fontSize: 13,
              fontWeight: 600,
              borderBottom: "1px solid #2A2B35",
              marginBottom: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {fromRoom?.name ?? cmExit.fromRoomSlug} → {isPortal ? `${cmExit.targetZoneSlug}/${cmExit.targetRoomSlug}` : (toRoom?.name ?? cmExit.toRoomSlug)}
            </div>

            {/* Insert Room — only for non-portal exits */}
            {!isPortal && (
              <button
                disabled={busy}
                onClick={() => {
                  setExitContextMenu(null);
                  requestInsertRoomOnExit(exitContextMenu.exitId);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "6px 12px",
                  background: "transparent",
                  border: "none",
                  color: busy ? "#4A4B55" : "#7B4FA0",
                  cursor: busy ? "default" : "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!busy) (e.currentTarget as HTMLButtonElement).style.background = "#2A2B35";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <span style={{ width: 14, textAlign: "center" }}>⑂</span>
                Insert Room on Exit
              </button>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: "#2A2B35", margin: "4px 0" }} />

            {/* Edit Exit */}
            <button
              onClick={() => {
                setExitContextMenu(null);
                handleExitClick(exitContextMenu.exitId);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 12px",
                background: "transparent",
                border: "none",
                color: "#E0E0E0",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                textAlign: "left",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#2A2B35"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <span style={{ width: 14, textAlign: "center" }}>✎</span>
              Edit Exit
            </button>

            {/* Divider */}
            <div style={{ height: 1, background: "#2A2B35", margin: "4px 0" }} />

            {/* Delete Exit */}
            <button
              disabled={busy}
              onClick={() => {
                const eid = exitContextMenu.exitId;
                setExitContextMenu(null);
                handleDeleteExit(eid);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 12px",
                background: "transparent",
                border: "none",
                color: "#8B2500",
                cursor: busy ? "default" : "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                textAlign: "left",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#2A2B35"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <span style={{ width: 14, textAlign: "center" }}>🗑</span>
              Delete Exit
            </button>
          </div>
        );
      })()}

      {/* ─── Copy notification toast ──────────────────────────── */}
      {copyNotification && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            background: "#1C1D27",
            border: "1px solid #C9A84C",
            borderRadius: 6,
            padding: "8px 16px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "#C9A84C",
          }}
        >
          {copyNotification}
        </div>
      )}

      {/* ─── Validation warnings ──────────────────────────── */}
      {validationWarnings.length > 0 && (
        <div className="px-4 py-2 border-t border-[#2A2B35] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#B8860B] flex-shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {validationWarnings.map((w, i) => (
              <span key={i} className="text-[#B8860B] text-xs" style={{ fontFamily: "var(--font-sans)" }}>
                {w.message}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Legend ────────────────────────────────────────── */}
      <div
        className="flex flex-wrap gap-4 px-4 py-2 border-t border-[#2A2B35] text-xs"
        style={{ fontFamily: "var(--font-sans)", color: "#8A8B95" }}
      >
        {[
          { label: "Entry", color: "#2D6B4F" },
          { label: "Boss", color: "#8B2500" },
          { label: "Junction", color: "#3A7D7B" },
          { label: "Corridor", color: "#4A4B55" },
          { label: "Feature", color: "#7B4FA0" },
          { label: "↔ Bidirectional", color: "#4A4B55" },
          { label: "→ One-Way", color: ONE_WAY_COLOR },
          { label: "⟐ Portal", color: PORTAL_COLOR },
          { label: "▲▼ Vertical exit", color: INTER_FLOOR_COLOR },
          { label: "⚠ Disconnected", color: "#B8860B" },
          { label: "⚡ Orphan", color: "#EF4444" },
          { label: "👤 NPCs", color: "#D97706" },
          { label: "📦 Loot", color: "#CA8A04" },
          { label: "⚠ Hazards", color: "#DC2626" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>

      {/* ─── Add Room Form (modal) ──────────────────────────── */}
      {showRoomForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowRoomForm(false)}
        >
          <div
            className="bg-[#1C1D27] border border-[#2A2B35] rounded-lg p-6 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[#C9A84C] text-sm mb-4" style={{ fontFamily: "var(--font-sans)" }}>
              Add Room
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                  Slug
                </label>
                <input
                  type="text"
                  value={roomForm.slug}
                  onChange={(e) =>
                    setRoomForm((f) => ({
                      ...f,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-"),
                    }))
                  }
                  placeholder="e.g., entrance-hall"
                  className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </div>
              <div>
                <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                  Name
                </label>
                <input
                  type="text"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Entrance Hall"
                  className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
                 
                />
              </div>
              <div>
                <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                  Type
                </label>
                <select
                  value={roomForm.type}
                  onChange={(e) => setRoomForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {ROOM_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                  Description
                </label>
                <textarea
                  value={roomForm.description}
                  onChange={(e) => setRoomForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe this room..."
                  rows={2}
                  className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none resize-none"
                 
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowRoomForm(false)}
                  className="px-3 py-1.5 border border-[#2A2B35] text-[#8A8B95] rounded text-sm hover:bg-[#12131A]"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSaveNewRoom()}
                  disabled={busy}
                  className="px-3 py-1.5 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded text-sm disabled:opacity-40"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Create Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Portal Dialog (modal) ──────────────────────────── */}
      {showPortalDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowPortalDialog(false)}
        >
          <div
            className="bg-[#1C1D27] border border-[#2A2B35] rounded-lg p-6 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[#C9A84C] text-sm mb-4" style={{ fontFamily: "var(--font-sans)" }}>
              Create Inter-Zone Portal
            </h3>
            <p className="text-[#8A8B95] text-xs mb-3" style={{ fontFamily: "var(--font-sans)" }}>
              From: <span className="text-[#E8E0D0]" style={{ fontFamily: "var(--font-mono)" }}>
                {selectedRoom}
              </span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                  Direction
                </label>
                <select
                  value={portalDirection}
                  onChange={(e) => setPortalDirection(e.target.value)}
                  className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {DIRECTION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                  Target Zone
                </label>
                <select
                  value={portalTargetZone}
                  onChange={(e) => void handlePortalZoneChange(e.target.value)}
                  className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <option value="">Select zone…</option>
                  {allZones.map((z) => (
                    <option key={z.slug} value={z.slug}>{z.name} ({z.slug})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                  Target Room
                </label>
                <select
                  value={portalTargetRoom}
                  onChange={(e) => setPortalTargetRoom(e.target.value)}
                  disabled={!portalTargetZone}
                  className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none disabled:opacity-40"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <option value="">Select room…</option>
                  {portalTargetRooms.map((r) => (
                    <option key={r.slug} value={r.slug}>{r.name} ({r.slug})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowPortalDialog(false)}
                  className="px-3 py-1.5 border border-[#2A2B35] text-[#8A8B95] rounded text-sm hover:bg-[#12131A]"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleCreatePortal()}
                  disabled={busy || !portalTargetZone || !portalTargetRoom}
                  className="px-3 py-1.5 bg-[#7B4FA0] hover:bg-[#6B3F90] text-[#E8E0D0] rounded text-sm disabled:opacity-40"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Create Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Orphaned Exits Modal ───────────────────────────── */}
      {showOrphans && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowOrphans(false)}
        >
          <div
            className="bg-[#1C1D27] border border-[#2A2B35] rounded-lg p-6 w-[480px] max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#C9A84C] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                Orphaned Exits ({orphanCount})
              </h3>
              <button onClick={() => setShowOrphans(false)} className="text-[#8A8B95] hover:text-[#E8E0D0]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {orphanedExits.length === 0 ? (
              <p className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-sans)" }}>
                No orphaned exits found. All exits are valid.
              </p>
            ) : (
              <>
                <div className="flex-1 overflow-auto space-y-2 mb-4">
                  {orphanedExits.map((o) => (
                    <div
                      key={o.exit.id}
                      className="bg-[#12131A] border border-[#2A2B35] rounded p-3 flex items-start justify-between gap-2"
                    >
                      <div className="text-xs space-y-1" style={{ fontFamily: "var(--font-sans)" }}>
                        <div className="text-[#E8E0D0]" style={{ fontFamily: "var(--font-mono)" }}>
                          {o.exit.fromRoomSlug} → {o.exit.direction} → {o.exit.toRoomSlug}
                          {o.exit.targetZoneSlug && (
                            <span style={{ color: PORTAL_COLOR }}> ⟐ {o.exit.targetZoneSlug}</span>
                          )}
                        </div>
                        <div className="text-[#EF4444]">{o.reason}</div>
                      </div>
                      <button
                        onClick={() => void handleRemoveOrphan(o.exit.id)}
                        disabled={orphansBusy}
                        className="text-[#8B2500] hover:text-[#EF4444] flex-shrink-0 disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => void handleRemoveAllOrphans()}
                  disabled={orphansBusy}
                  className="w-full px-3 py-2 bg-[#8B2500] hover:bg-[#A03000] text-[#E8E0D0] rounded text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <Trash2 className="w-3 h-3" />
                  Remove All Orphans
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Insert Room Confirm Dialog ──────────────────────── */}
      {(() => {
        const targetExit = insertRoomTarget
          ? (exitPairs.find((p) => p.forward.id === insertRoomTarget || p.reverse?.id === insertRoomTarget)?.forward
            ?? exits.find((e) => e.id === insertRoomTarget))
          : null;
        const fromName = targetExit ? (roomMap.get(targetExit.fromRoomSlug)?.name ?? targetExit.fromRoomSlug) : "";
        const toName = targetExit ? (roomMap.get(targetExit.toRoomSlug)?.name ?? targetExit.toRoomSlug) : "";

        return (
          <AlertDialog open={!!insertRoomTarget} onOpenChange={(open) => { if (!open) setInsertRoomTarget(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Insert Room on Exit</AlertDialogTitle>
                <AlertDialogDescription>
                  This will create a new corridor room between <strong>{fromName}</strong> and <strong>{toName}</strong>, replacing the current exit with two new bidirectional connections through the inserted room.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void executeInsertRoomOnExit()}>
                  Insert Room
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}

      {/* ─── Delete Exit Modal ──────────────────────────────── */}
      {showDeleteExitModal && selectedExit && (() => {
        const exit = exits.find((e) => e.id === selectedExit);
        if (!exit) return null;
        
        const reverseExit = exits.find((e) =>
          e.fromRoomSlug === exit.toRoomSlug &&
          e.toRoomSlug === exit.fromRoomSlug &&
          e.direction === OPPOSITE[exit.direction]
        );

        return (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowDeleteExitModal(false)}
          >
            <div
              className="bg-[#1C1D27] border border-[#2A2B35] rounded-lg p-6 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[#C9A84C] text-sm mb-4" style={{ fontFamily: "var(--font-sans)" }}>
                Delete Exit
              </h3>
              
              <div className="space-y-3 mb-4">
                <p className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-sans)" }}>
                  Are you sure you want to delete this exit?
                </p>
                
                <div className="bg-[#12131A] border border-[#2A2B35] rounded p-3">
                  <div className="text-[#E8E0D0] text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                    {exit.fromRoomSlug} → {exit.toRoomSlug} ({exit.direction})
                  </div>
                </div>

                {reverseExit && (
                  <div className="pt-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={deleteAlsoReverse}
                        onChange={(e) => setDeleteAlsoReverse(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[#C9A84C]"
                      />
                      <div className="flex-1">
                        <div className="text-[#E8E0D0] text-xs" style={{ fontFamily: "var(--font-sans)" }}>
                          Also delete connecting exit
                        </div>
                        <div className="text-[#8A8B95] text-xs mt-1" style={{ fontFamily: "var(--font-mono)" }}>
                          {reverseExit.fromRoomSlug} → {reverseExit.toRoomSlug} ({reverseExit.direction})
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteExitModal(false)}
                  disabled={busy}
                  className="px-3 py-1.5 border border-[#2A2B35] text-[#8A8B95] rounded text-sm hover:bg-[#12131A] disabled:opacity-40"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => void confirmDeleteExit(deleteAlsoReverse)}
                  disabled={busy}
                  className="px-3 py-1.5 bg-[#8B2500] hover:bg-[#A03000] text-[#E8E0D0] rounded text-sm disabled:opacity-40"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
