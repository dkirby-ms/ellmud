import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Plus, X, Trash2, Link2, Globe, AlertTriangle, Save, Zap, ZoomIn, ZoomOut, Maximize2, HelpCircle } from "lucide-react";
import { computeLayout } from "../../map/computeLayout.js";
import type { LayoutRoom } from "../../map/computeLayout.js";
import { FloorSelector } from "../../components/map/FloorSelector.js";
import { computeFloorBounds } from "../../components/map/useFloorFilter.js";
import {
  createRoom, updateRoom, deleteRoom,
  createExit, updateExit, deleteExit, listZones, getZone,
  getOrphanedExits, removeOrphanedExits,
  listCreatures, listItems,
  type ZoneDefinition, type ZoneRoomDefinition, type ZoneExitDefinition,
  type OrphanedExitInfo, type RoomNPC, type RoomLootContainer,
} from "../../lib/zone-api.js";

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
  "entry", "corridor", "junction", "dead_end", "extraction", "boss",
  "feature_stash", "feature_shardboard", "feature_marketplace",
  "feature_crafting", "feature_training", "feature_contracts", "feature_infirmary",
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
  extraction:  { fill: "#1A2A3A", stroke: "#3A6D9B" },
  boss:        { fill: "#3A1A1A", stroke: "#8B2500" },
  junction:    { fill: "#1A3A3A", stroke: "#3A7D7B" },
  corridor:    { fill: "#1C1D27", stroke: "#4A4B55" },
  dead_end:    { fill: "#1C1D27", stroke: "#4A4B55" },
};

const FEATURE_COLOR = { fill: "#2A1A3A", stroke: "#7B4FA0" };
const DEFAULT_COLOR = { fill: "#1C1D27", stroke: "#4A4B55" };
const PORTAL_COLOR = "#06b6d4"; // cyan/teal for cross-zone exits
const INTER_FLOOR_COLOR = "#a78bfa"; // purple for inter-floor exits

function roomColor(type: string): { fill: string; stroke: string } {
  if (type.startsWith("feature_")) return FEATURE_COLOR;
  return ROOM_TYPE_COLORS[type] ?? DEFAULT_COLOR;
}

// ─── Layout constants ────────────────────────────────────────────────────────

const CELL_W = 100;
const CELL_H = 100;
const NODE_W = 50;
const NODE_H = 50;
const PADDING = 60;

// ─── Helper: convert zone data → computeLayout input ─────────────────────────

export function zoneToLayoutInput(
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

// ─── Arrow helpers ───────────────────────────────────────────────────────────

function roomCenter(x: number, y: number): { cx: number; cy: number } {
  return {
    cx: x * CELL_W + NODE_W / 2,
    cy: y * CELL_H + NODE_H / 2,
  };
}

function clipToRect(
  sx: number, sy: number, tx: number, ty: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x1: sx, y1: sy, x2: tx, y2: ty };

  const nx = dx / len;
  const ny = dy / len;
  const hw = NODE_W / 2;
  const hh = NODE_H / 2;

  const scaleStart =
    Math.abs(nx) * hh > Math.abs(ny) * hw
      ? hw / Math.abs(nx)
      : hh / Math.abs(ny);
  const scaleEnd = scaleStart;

  return {
    x1: sx + nx * scaleStart,
    y1: sy + ny * scaleStart,
    x2: tx - nx * scaleEnd,
    y2: ty - ny * scaleEnd,
  };
}

function edgeLabelPos(
  x1: number, y1: number, x2: number, y2: number,
): { lx: number; ly: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { lx: mx, ly: my };
  return { lx: mx - (dy / len) * 10, ly: my + (dx / len) * 10 };
}

function inferDirection(
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number },
): string {
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "east" : "west";
  return dy > 0 ? "south" : "north";
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
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
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

  // Zoom
  const [zoom, setZoom] = useState(1.0);
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 3.0;

  // Pan
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Exit edit form
  const [exitEditForm, setExitEditForm] = useState({
    direction: "",
    toRoomSlug: "",
    targetZoneSlug: "",
    targetRoomSlug: "",
    locked: false,
    hidden: false,
  });
  const [exitEditTargetRooms, setExitEditTargetRooms] = useState<ZoneRoomDefinition[]>([]);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; roomSlug: string } | null>(null);
  const designerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  // Resizable panel
  const [panelWidth, setPanelWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);

  // Creature and item lists for NPC/loot management
  const [creatures, setCreatures] = useState<Array<{ type: string; name: string }>>([]);
  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);

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

  // Wheel zoom — native listener to allow preventDefault on non-passive event
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Escape key clears selection, +/- for zoom
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedRoom(null);
        setSelectedExit(null);
        setConnectTarget(null);
      }
      if (designerRef.current && designerRef.current.contains(document.activeElement)) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          setZoom((z) => Math.min(MAX_ZOOM, z + 0.1));
        } else if (e.key === "-") {
          e.preventDefault();
          setZoom((z) => Math.max(MIN_ZOOM, z - 0.1));
        } else if (e.key === "0") {
          e.preventDefault();
          setZoom(1.0);
          setPanX(0);
          setPanY(0);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Reset pan when floor changes
  useEffect(() => {
    setPanX(0);
    setPanY(0);
  }, [currentFloor]);

  // Pan mouse handlers on SVG
  const handlePanMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Only start pan on SVG background, not on room/exit elements
    if (e.target !== e.currentTarget) return;
    // Only left button
    if (e.button !== 0) return;
    e.preventDefault(); // Prevent text selection during drag
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
  }, [panX, panY]);

  const handlePanMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning || !panStartRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    // We need zoomedW/zoomedH for coordinate conversion, but those are computed
    // in the render section. Parse from the current viewBox attribute.
    const vb = svgRef.current.getAttribute("viewBox");
    if (!vb) return;
    const parts = vb.split(/\s+/).map(Number);
    const vbWidth = parts[2];
    const vbHeight = parts[3];
    const scaleX = vbWidth / rect.width;
    const scaleY = vbHeight / rect.height;
    // Pan opposite to mouse direction
    const dx = (e.clientX - panStartRef.current.x) * scaleX;
    const dy = (e.clientY - panStartRef.current.y) * scaleY;
    setPanX(panStartRef.current.panX - dx);
    setPanY(panStartRef.current.panY - dy);
  }, [isPanning]);

  const handlePanMouseUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

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

  // ─── Layout computation ─────────────────────────────────
  const { positions, roomMap, interZoneExits, intraZoneExits } = useMemo(() => {
    if (rooms.length === 0) {
      return {
        positions: new Map<string, { x: number; y: number; z: number }>(),
        roomMap: new Map<string, ZoneRoomDefinition>(),
        interZoneExits: [] as ZoneExitDefinition[],
        intraZoneExits: [] as ZoneExitDefinition[],
      };
    }

    const { rooms: layoutInput, entryRoomSlug } = zoneToLayoutInput(rooms, exits);
    const pos = computeLayout(layoutInput, entryRoomSlug);

    const rMap = new Map<string, ZoneRoomDefinition>();
    for (const room of rooms) rMap.set(room.slug, room);

    const inter: ZoneExitDefinition[] = [];
    const intra: ZoneExitDefinition[] = [];
    for (const exit of exits) {
      if (exit.targetZoneSlug) inter.push(exit);
      else intra.push(exit);
    }

    return { positions: pos, roomMap: rMap, interZoneExits: inter, intraZoneExits: intra };
  }, [rooms, exits]);

  // ─── Floor bounds ───────────────────────────────────────
  const floorBounds = useMemo(() => computeFloorBounds(positions), [positions]);

  // ─── Floor-filtered views ───────────────────────────────
  const { floorPositions, floorIntraExits, floorInterFloorExits, ghostFloorRoomSlugs } = useMemo(() => {
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

  const missingReverseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of exits.filter((ex) => !ex.targetZoneSlug)) {
      const hasReverse = exits.some(
        (r) => r.fromRoomSlug === e.toRoomSlug && r.toRoomSlug === e.fromRoomSlug && !r.targetZoneSlug,
      );
      if (!hasReverse) ids.add(e.id);
    }
    return ids;
  }, [exits]);

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
    if (mode === "select") {
      setSelectedRoom(null);
      setSelectedExit(null);
      setConnectTarget(null);
    }
  }

  function handleRoomContextMenu(e: React.MouseEvent, slug: string) {
    e.preventDefault();
    e.stopPropagation();
    const bounds = designerRef.current?.getBoundingClientRect();
    setContextMenu({
      x: e.clientX - (bounds?.left ?? 0),
      y: e.clientY - (bounds?.top ?? 0),
      roomSlug: slug,
    });
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
    if (!contextMenu) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setContextMenu(null);
    }
    function onClick() {
      setContextMenu(null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [contextMenu]);

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
        await createRoom(zoneId, roomForm);
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
      await updateRoom(room.id, {
        name: editForm.name,
        description: editForm.description,
        type: editForm.type,
        properties: editForm.properties,
        npcs: editForm.npcs,
        lootContainers: editForm.lootContainers,
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
      await deleteRoom(room.id);
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
      await createExit(zoneId, exitData as Partial<ZoneExitDefinition>);

      if (connectBidirectional && OPPOSITE[connectDirection]) {
        const reverseData: Record<string, unknown> = {
          fromRoomSlug: connectTarget,
          direction: OPPOSITE[connectDirection],
          toRoomSlug: selectedRoom,
          locked: false,
          hidden: false,
        };
        await createExit(zoneId, reverseData as Partial<ZoneExitDefinition>);
      }

      setConnectTarget(null);
      setMode("select");
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create exit");
    } finally {
      setBusy(false);
    }
  }

  function handleDeleteExit() {
    if (!selectedExit) return;
    const exit = exits.find((e) => e.id === selectedExit);
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
          await deleteExit(reverseExit.id);
        }
      }
      
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
      await updateExit(selectedExit, data as Partial<ZoneExitDefinition>);
      onZoneChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update exit");
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

  // Compute viewBox from visible rooms on the current floor only
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const viewBoxPositions = new Map(floorPositions);
  if (viewBoxPositions.size > 0) {
    for (const pos of viewBoxPositions.values()) {
      const left = pos.x * CELL_W;
      const top = pos.y * CELL_H;
      if (left < minX) minX = left;
      if (top < minY) minY = top;
      if (left + NODE_W > maxX) maxX = left + NODE_W;
      if (top + NODE_H > maxY) maxY = top + NODE_H;
    }
  } else {
    minX = 0; minY = 0; maxX = 400; maxY = 200;
  }

  const vbX = minX - PADDING;
  const vbY = minY - PADDING;
  const vbW = maxX - minX + PADDING * 2;
  const vbH = maxY - minY + PADDING * 2;

  // Apply zoom to viewBox
  const zoomedW = vbW / zoom;
  const zoomedH = vbH / zoom;
  const zoomedX = vbX + (vbW - zoomedW) / 2;
  const zoomedY = vbY + (vbH - zoomedH) / 2;

  // Apply pan offset
  const finalX = zoomedX + panX;
  const finalY = zoomedY + panY;

  // Cursor style based on mode
  const canvasCursor = mode === "connect" ? "crosshair" : isPanning ? "grabbing" : "grab";

  return (
    <div ref={designerRef} className="bg-[#12131A] border border-[#2A2B35] rounded-lg h-full flex flex-col" style={{ position: "relative" }}>
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

        <div className="flex-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1 border-l border-[#2A2B35] pl-2">
          <button
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.1))}
            disabled={zoom <= MIN_ZOOM}
            className="px-2 py-1.5 border border-[#2A2B35] text-[#8A8B95] hover:text-[#E8E0D0] hover:border-[#3A3B45] rounded text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
            title="Zoom out (-)"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span
            className="px-2 text-[#8A8B95] text-xs tabular-nums min-w-[3rem] text-center"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.1))}
            disabled={zoom >= MAX_ZOOM}
            className="px-2 py-1.5 border border-[#2A2B35] text-[#8A8B95] hover:text-[#E8E0D0] hover:border-[#3A3B45] rounded text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
            title="Zoom in (+)"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={() => { setZoom(1.0); setPanX(0); setPanY(0); }}
            disabled={zoom === 1.0 && panX === 0 && panY === 0}
            className="px-2 py-1.5 border border-[#2A2B35] text-[#8A8B95] hover:text-[#E8E0D0] hover:border-[#3A3B45] rounded text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
            title="Reset zoom & pan (0)"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>

        {/* Pan indicator */}
        {(panX !== 0 || panY !== 0) && (
          <button
            onClick={() => { setPanX(0); setPanY(0); }}
            className="px-2 py-1 text-[#8A8B95] hover:text-[#E8E0D0] text-xs transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
            title="Reset pan"
          >
            📍 Panned
          </button>
        )}

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
      </div>

      {/* ─── Main area (canvas + side panel) ──────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* SVG Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 p-4 overflow-hidden relative"
          style={{ cursor: canvasCursor }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCanvasClick(); }}
        >
          {rooms.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                Add rooms to see the zone layout.
              </p>
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`${finalX} ${finalY} ${zoomedW} ${zoomedH}`}
              style={{ width: "100%", minHeight: "350px", cursor: canvasCursor }}
              xmlns="http://www.w3.org/2000/svg"
              onMouseDown={handlePanMouseDown}
              onMouseMove={handlePanMouseMove}
              onMouseUp={handlePanMouseUp}
              onMouseLeave={handlePanMouseUp}
            >
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#8A8B95" />
                </marker>
                <marker id="arrowhead-selected" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#C9A84C" />
                </marker>
                <marker id="arrowhead-warning" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#B8860B" />
                </marker>
                <marker id="arrowhead-portal" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={PORTAL_COLOR} />
                </marker>
                <marker id="arrowhead-orphan" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#EF4444" />
                </marker>
                <marker id="arrowhead-interfloor" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={INTER_FLOOR_COLOR} />
                </marker>
              </defs>

              {/* ── Missing reverse exit ghost lines ─────────── */}
              {floorIntraExits.filter((e) => missingReverseIds.has(e.id)).map((exit) => {
                const fromPos = positions.get(exit.toRoomSlug);
                const toPos = positions.get(exit.fromRoomSlug);
                if (!fromPos || !toPos) return null;
                const from = roomCenter(fromPos.x, fromPos.y);
                const to = roomCenter(toPos.x, toPos.y);
                const { x1, y1, x2, y2 } = clipToRect(from.cx, from.cy, to.cx, to.cy);
                return (
                  <line
                    key={`ghost-${exit.id}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#B8860B"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    opacity={0.5}
                    markerEnd="url(#arrowhead-warning)"
                  />
                );
              })}

              {/* ── Exit edges (current floor) ─────────────────── */}
              {floorIntraExits.map((exit) => {
                const fromPos = positions.get(exit.fromRoomSlug);
                const toPos = positions.get(exit.toRoomSlug);
                if (!fromPos || !toPos) return null;

                const from = roomCenter(fromPos.x, fromPos.y);
                const to = roomCenter(toPos.x, toPos.y);
                const { x1, y1, x2, y2 } = clipToRect(from.cx, from.cy, to.cx, to.cy);
                const { lx, ly } = edgeLabelPos(x1, y1, x2, y2);
                const isSelected = selectedExit === exit.id;
                const isMissingReverse = missingReverseIds.has(exit.id);
                const isOrphan = orphanExitIds.has(exit.id);

                const strokeColor = isSelected ? "#C9A84C"
                  : isOrphan ? "#EF4444"
                  : isMissingReverse ? "#B8860B"
                  : "#4A4B55";
                const markerEnd = isSelected ? "url(#arrowhead-selected)"
                  : isOrphan ? "url(#arrowhead-orphan)"
                  : isMissingReverse ? "url(#arrowhead-warning)"
                  : "url(#arrowhead)";

                return (
                  <g
                    key={exit.id}
                    onClick={(e) => { e.stopPropagation(); handleExitClick(exit.id); }}
                    style={{ cursor: "pointer" }}
                  >
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      strokeDasharray={isOrphan ? "6 3" : undefined}
                      markerEnd={markerEnd}
                    />
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12} />
                    {(exit.locked || exit.hidden) && (
                      <text
                        x={lx} y={ly}
                        textAnchor="middle" dominantBaseline="central"
                        fill="#B8860B" fontSize="9" fontFamily="var(--font-sans)"
                      >
                        {exit.locked ? "🔒" : ""}{exit.hidden ? "👁" : ""}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Inter-floor exits are indicated by ▲▼ icons on rooms; no cross-z lines drawn */}

              {/* Ghost rooms hidden — navigate via ▲▼ icons on rooms */}

              {/* ── Portal (inter-zone) exit edges ─────────────── */}
              {interZoneExits.filter((exit) => {
                const fromPos = positions.get(exit.fromRoomSlug);
                return fromPos && fromPos.z === currentFloor;
              }).map((exit) => {
                const fromPos = positions.get(exit.fromRoomSlug);
                if (!fromPos) return null;
                const from = roomCenter(fromPos.x, fromPos.y);
                // Portal exits don't connect to a room in the SVG — draw a stub line outward
                const angle = exit.direction === "east" ? 0
                  : exit.direction === "west" ? Math.PI
                  : exit.direction === "south" ? Math.PI / 2
                  : exit.direction === "north" ? -Math.PI / 2
                  : exit.direction === "up" ? -Math.PI / 4
                  : Math.PI / 4; // down
                const stubLen = 40;
                const sx = from.cx + Math.cos(angle) * (NODE_W / 2 + 4);
                const sy = from.cy + Math.sin(angle) * (NODE_H / 2 + 4);
                const ex = sx + Math.cos(angle) * stubLen;
                const ey = sy + Math.sin(angle) * stubLen;
                const isSelected = selectedExit === exit.id;

                return (
                  <g
                    key={exit.id}
                    onClick={(e) => { e.stopPropagation(); handleExitClick(exit.id); }}
                    style={{ cursor: "pointer" }}
                  >
                    <line
                      x1={sx} y1={sy} x2={ex} y2={ey}
                      stroke={isSelected ? "#C9A84C" : PORTAL_COLOR}
                      strokeWidth={isSelected ? 2.5 : 2}
                      strokeDasharray="4 2"
                      markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead-portal)"}
                    />
                    <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="transparent" strokeWidth={12} />
                    <text
                      x={ex + Math.cos(angle) * 6} y={ey + Math.sin(angle) * 6}
                      textAnchor="middle" dominantBaseline="central"
                      fill={isSelected ? "#C9A84C" : PORTAL_COLOR}
                      fontSize="9" fontFamily="var(--font-sans)"
                    >
                      ⟐ {exit.direction} → {exit.targetZoneSlug}
                    </text>
                  </g>
                );
              })}

              {/* ── Room nodes (current floor) ──────────────────── */}
              {Array.from(floorPositions.entries()).map(([slug, pos]) => {
                const room = roomMap.get(slug);
                if (!room) return null;
                const color = roomColor(room.type);
                const isSelected = selectedRoom === slug;
                const isDisconnected = disconnectedSlugs.has(slug);
                const isConnectSource = mode === "connect" && selectedRoom === slug;

                const x = pos.x * CELL_W;
                const y = pos.y * CELL_H;
                const portalExits = interZoneExits.filter((e) => e.fromRoomSlug === slug);

                // Vertical (up/down) exits from this room
                const upExits = exits.filter(
                  (e) => e.fromRoomSlug === slug && e.direction === "up",
                );
                const downExits = exits.filter(
                  (e) => e.fromRoomSlug === slug && e.direction === "down",
                );
                const upTooltip = upExits.length > 0
                  ? "Up → " + upExits.map((e) => {
                      const tgt = e.targetZoneSlug
                        ? `${e.targetZoneSlug}/${e.targetRoomSlug}`
                        : e.toRoomSlug;
                      const tRoom = roomMap.get(e.toRoomSlug);
                      const tPos = positions.get(e.toRoomSlug);
                      const name = tRoom ? tRoom.name : tgt;
                      const fl = tPos != null ? ` (F${tPos.z})` : "";
                      return `${name}${fl}`;
                    }).join(", ")
                  : "";
                const downTooltip = downExits.length > 0
                  ? "Down → " + downExits.map((e) => {
                      const tgt = e.targetZoneSlug
                        ? `${e.targetZoneSlug}/${e.targetRoomSlug}`
                        : e.toRoomSlug;
                      const tRoom = roomMap.get(e.toRoomSlug);
                      const tPos = positions.get(e.toRoomSlug);
                      const name = tRoom ? tRoom.name : tgt;
                      const fl = tPos != null ? ` (F${tPos.z})` : "";
                      return `${name}${fl}`;
                    }).join(", ")
                  : "";

                return (
                  <g
                    key={slug}
                    onClick={(e) => { e.stopPropagation(); handleRoomClick(slug); }}
                    onContextMenu={(e) => handleRoomContextMenu(e, slug)}
                    onMouseEnter={(e) => {
                      if (hoverTimer) clearTimeout(hoverTimer);
                      const rect = (e.currentTarget as Element).getBoundingClientRect();
                      const timer = setTimeout(() => {
                        setHoveredRoom(slug);
                        setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
                      }, 150);
                      setHoverTimer(timer);
                    }}
                    onMouseLeave={() => {
                      if (hoverTimer) {
                        clearTimeout(hoverTimer);
                        setHoverTimer(null);
                      }
                      setHoveredRoom(null);
                      setHoverPosition(null);
                    }}
                    style={{
                      cursor: mode === "connect" && selectedRoom && slug !== selectedRoom
                        ? "crosshair"
                        : "pointer",
                    }}
                  >
                    <rect
                      x={x} y={y} width={NODE_W} height={NODE_H} rx={6} ry={6}
                      fill={color.fill}
                      stroke={
                        isSelected ? "#22D3EE"
                          : isConnectSource ? "#3A7D7B"
                          : isDisconnected ? "#B8860B"
                          : color.stroke
                      }
                      strokeWidth={isSelected || isConnectSource ? 3 : isDisconnected ? 2 : 1.5}
                      strokeDasharray={isConnectSource ? "4 2" : undefined}
                    />
                    {showLabels && (
                      <text
                        x={x + NODE_W / 2} y={y + NODE_H / 2 - 4}
                        textAnchor="middle" dominantBaseline="central"
                        fill="#E8E0D0" fontSize="6"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        {room.name.length > 10 ? room.name.slice(0, 9) + "…" : room.name}
                      </text>
                    )}
                    <text
                      x={x + NODE_W / 2} y={y + NODE_H / 2 + (showLabels ? 4 : 0)}
                      textAnchor="middle" dominantBaseline="central"
                      fill="#6A6B75" fontSize="6" fontFamily="var(--font-mono)"
                    >
                      {slug}
                    </text>
                    {pos.z !== 0 && (
                      <text
                        x={x + NODE_W - 3} y={y + 7}
                        textAnchor="end" fill="#8A8B95" fontSize="6" fontFamily="var(--font-sans)"
                      >
                        z{pos.z > 0 ? "+" : ""}{pos.z}
                      </text>
                    )}
                    {isDisconnected && (
                      <text
                        x={x + 4} y={y + 7}
                        fill="#B8860B" fontSize="8" fontFamily="var(--font-sans)"
                      >
                        ⚠
                      </text>
                    )}

                    {/* Content badges (NPC, Loot, Hazard) along bottom edge */}
                    {(() => {
                      const badges: Array<{ icon: string; color: string; bg: string; label: string }> = [];
                      if (room.npcs?.length > 0)
                        badges.push({ icon: "👤", color: "#D97706", bg: "#2A1E0A", label: `${room.npcs.length} NPC${room.npcs.length > 1 ? "s" : ""}` });
                      if (room.lootContainers?.length > 0)
                        badges.push({ icon: "📦", color: "#CA8A04", bg: "#2A200A", label: `${room.lootContainers.length} Loot` });
                      if (room.hazards?.length > 0)
                        badges.push({ icon: "⚠", color: "#DC2626", bg: "#2A0A0A", label: `${room.hazards.length} Hazard${room.hazards.length > 1 ? "s" : ""}` });
                      if (badges.length === 0) return null;
                      const totalW = badges.length * 12 + (badges.length - 1) * 2;
                      const startX = x + NODE_W / 2 - totalW / 2;
                      return badges.map((b, i) => (
                        <g key={b.icon}>
                          <circle
                            cx={startX + i * 14 + 6} cy={y + NODE_H - 5}
                            r={5} fill={b.bg} stroke={b.color} strokeWidth={1}
                          />
                          <text
                            x={startX + i * 14 + 6} y={y + NODE_H - 5}
                            textAnchor="middle" dominantBaseline="central"
                            fill={b.color} fontSize="5" fontFamily="var(--font-sans)"
                          >
                            {b.icon}
                          </text>
                          <title>{b.label}</title>
                        </g>
                      ));
                    })()}

                    {/* Property tags below room node */}
                    {room.properties?.length > 0 && (
                      <text
                        x={x + NODE_W / 2} y={y + NODE_H + 6}
                        textAnchor="middle" dominantBaseline="central"
                        fill="#6A6B75" fontSize="5" fontFamily="var(--font-mono)"
                      >
                        {room.properties.join(" · ")}
                      </text>
                    )}

                    {/* Vertical exit (up/down) badges — click to navigate floor */}
                    {upExits.length > 0 && (() => {
                      const targetZ = upExits.map((e) => positions.get(e.toRoomSlug)?.z).find((z) => z != null);
                      return (
                        <g
                          onClick={(e) => { e.stopPropagation(); handleExitClick(upExits[0].id); }}
                          onDoubleClick={(e) => { e.stopPropagation(); if (targetZ != null) setCurrentFloor(targetZ); }}
                          style={{ cursor: "pointer" }}
                        >
                          <circle
                            cx={x + NODE_W - 5} cy={y + 5}
                            r={5} fill="#1a1033" stroke={INTER_FLOOR_COLOR} strokeWidth={1}
                          />
                          <text
                            x={x + NODE_W - 5} y={y + 5}
                            textAnchor="middle" dominantBaseline="central"
                            fill={INTER_FLOOR_COLOR} fontSize="6" fontWeight="bold"
                            fontFamily="var(--font-sans)"
                          >
                            ▲
                          </text>
                          <title>{upTooltip} (click to select · double-click to navigate)</title>
                        </g>
                      );
                    })()}
                    {downExits.length > 0 && (() => {
                      const targetZ = downExits.map((e) => positions.get(e.toRoomSlug)?.z).find((z) => z != null);
                      return (
                        <g
                          onClick={(e) => { e.stopPropagation(); handleExitClick(downExits[0].id); }}
                          onDoubleClick={(e) => { e.stopPropagation(); if (targetZ != null) setCurrentFloor(targetZ); }}
                          style={{ cursor: "pointer" }}
                        >
                          <circle
                            cx={x + NODE_W - 5} cy={y + NODE_H - 5}
                            r={5} fill="#1a1033" stroke={INTER_FLOOR_COLOR} strokeWidth={1}
                          />
                          <text
                            x={x + NODE_W - 5} y={y + NODE_H - 5}
                            textAnchor="middle" dominantBaseline="central"
                            fill={INTER_FLOOR_COLOR} fontSize="6" fontWeight="bold"
                            fontFamily="var(--font-sans)"
                          >
                            ▼
                          </text>
                          <title>{downTooltip} (click to select · double-click to navigate)</title>
                        </g>
                      );
                    })()}

                    {/* Inter-zone portal indicators */}
                    {portalExits.map((pe, i) => (
                      <g key={pe.id}
                        onClick={(e) => { e.stopPropagation(); handleExitClick(pe.id); }}
                        style={{ cursor: "pointer" }}
                      >
                        <circle
                          cx={x + NODE_W + 8} cy={y + 8 + i * 14} r={6}
                          fill="#0e3a3d" stroke={PORTAL_COLOR} strokeWidth={1}
                        />
                        <text
                          x={x + NODE_W + 8} y={y + 8 + i * 14}
                          textAnchor="middle" dominantBaseline="central"
                          fill={PORTAL_COLOR} fontSize="8" fontFamily="var(--font-sans)"
                        >
                          ⟐
                        </text>
                        <title>
                          {pe.direction} → {pe.targetZoneSlug}/{pe.targetRoomSlug}
                        </title>
                      </g>
                    ))}
                  </g>
                );
              })}
            </svg>
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
                          ["extraction", "Extraction"],
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
                        {([
                          { color: "#4A4B55", dash: undefined, width: 1.5, label: "Normal" },
                          { color: "#C9A84C", dash: undefined, width: 2, label: "Selected" },
                          { color: "#B8860B", dash: "4 4", width: 1.5, label: "Missing Reverse" },
                          { color: "#EF4444", dash: "6 3", width: 1.5, label: "Orphaned" },
                          { color: PORTAL_COLOR, dash: "4 2", width: 2, label: "Cross-Zone Portal" },
                          { color: INTER_FLOOR_COLOR, dash: undefined, width: 1.5, label: "Inter-Floor" },
                        ] as const).map((e) => (
                          <div key={e.label} className="flex items-center gap-1.5">
                            <svg width="24" height="10" viewBox="0 0 24 10">
                              <line
                                x1="2" y1="5" x2="19" y2="5"
                                stroke={e.color} strokeWidth={e.width}
                                strokeDasharray={e.dash}
                              />
                              <polygon points="19 2, 23 5, 19 8" fill={e.color} />
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
                  {selectedRoom} → {connectTarget}
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={connectBidirectional}
                    onChange={(e) => setConnectBidirectional(e.target.checked)}
                    className="accent-[#C9A84C]"
                  />
                  <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-sans)" }}>
                    Also create {connectTarget} → {selectedRoom} ({OPPOSITE[connectDirection] || "reverse"})
                  </span>
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
                              : editForm.type === "extraction" ? "#22C55E"
                              : editForm.type === "entry" ? "#60A5FA"
                              : "#8A8B95",
                            background: editForm.type === "boss" ? "rgba(220,38,38,0.1)"
                              : editForm.type === "extraction" ? "rgba(34,197,94,0.1)"
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

            {/* Selected exit edit panel */}
            {selectedExitData && (
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
            )}
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
          { label: "Extraction", color: "#3A6D9B" },
          { label: "Boss", color: "#8B2500" },
          { label: "Junction", color: "#3A7D7B" },
          { label: "Corridor", color: "#4A4B55" },
          { label: "Feature", color: "#7B4FA0" },
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
