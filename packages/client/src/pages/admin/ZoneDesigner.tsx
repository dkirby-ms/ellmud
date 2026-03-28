import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, X, Trash2, Link2, Globe, AlertTriangle, Save, Zap } from "lucide-react";
import { computeLayout } from "../../map/computeLayout.js";
import type { LayoutRoom } from "../../map/computeLayout.js";
import { FloorSelector } from "../../components/map/FloorSelector.js";
import { computeFloorBounds } from "../../components/map/useFloorFilter.js";
import {
  createRoom, updateRoom, deleteRoom,
  createExit, updateExit, deleteExit, listZones, getZone,
  getOrphanedExits, removeOrphanedExits,
  type ZoneDefinition, type ZoneRoomDefinition, type ZoneExitDefinition,
  type OrphanedExitInfo,
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

const CELL_W = 180;
const CELL_H = 120;
const NODE_W = 140;
const NODE_H = 60;
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
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedExit, setSelectedExit] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Room add form
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({
    slug: "", name: "", description: "", type: "corridor",
    properties: [] as string[], lootContainers: [] as unknown[], hazards: [] as unknown[], npcs: [] as unknown[],
  });

  // Room edit (side panel)
  const [editForm, setEditForm] = useState({
    name: "", slug: "", description: "", type: "corridor",
    properties: [] as string[],
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

  // Floor switching
  const [currentFloor, setCurrentFloor] = useState(0);

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
        });
      }
    }
  }, [selectedRoom, rooms]);

  // Escape key clears selection
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedRoom(null);
        setSelectedExit(null);
        setConnectTarget(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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
    if (mode === "select") {
      setSelectedRoom(null);
      setSelectedExit(null);
      setConnectTarget(null);
    }
  }

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

  async function handleDeleteExit() {
    if (!selectedExit) return;
    const exit = exits.find((e) => e.id === selectedExit);
    if (!exit || !confirm(`Delete exit ${exit.fromRoomSlug} → ${exit.toRoomSlug} (${exit.direction})?`)) return;
    try {
      setBusy(true);
      setError(null);
      await deleteExit(selectedExit);
      setSelectedExit(null);
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

  // Compute viewBox from visible rooms (current floor + ghost rooms for inter-floor exits)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const viewBoxPositions = new Map(floorPositions);
  for (const ghostSlug of ghostFloorRoomSlugs) {
    const pos = positions.get(ghostSlug);
    if (pos) viewBoxPositions.set(ghostSlug, pos);
  }
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

  return (
    <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg">
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
      <div className="flex">
        {/* SVG Canvas */}
        <div
          className="flex-1 p-4 overflow-auto"
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
              viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
              style={{ width: "100%", minHeight: "350px", maxHeight: "600px" }}
              xmlns="http://www.w3.org/2000/svg"
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
                    <text
                      x={lx} y={ly}
                      textAnchor="middle" dominantBaseline="central"
                      fill={isSelected ? "#C9A84C" : isOrphan ? "#EF4444" : isMissingReverse ? "#B8860B" : "#6A6B75"}
                      fontSize="10" fontFamily="var(--font-sans)"
                    >
                      {exit.direction}
                    </text>
                    {(exit.locked || exit.hidden) && (
                      <text
                        x={lx} y={ly + 12}
                        textAnchor="middle" dominantBaseline="central"
                        fill="#B8860B" fontSize="9" fontFamily="var(--font-sans)"
                      >
                        {exit.locked ? "🔒" : ""}{exit.hidden ? "👁" : ""}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* ── Inter-floor exit edges (dashed purple) ──────── */}
              {floorInterFloorExits.map((exit) => {
                const fromPos = positions.get(exit.fromRoomSlug);
                const toPos = positions.get(exit.toRoomSlug);
                if (!fromPos || !toPos) return null;

                const from = roomCenter(fromPos.x, fromPos.y);
                const to = roomCenter(toPos.x, toPos.y);
                const { x1, y1, x2, y2 } = clipToRect(from.cx, from.cy, to.cx, to.cy);
                const { lx, ly } = edgeLabelPos(x1, y1, x2, y2);
                const isSelected = selectedExit === exit.id;
                const goesUp = toPos.z > fromPos.z;

                return (
                  <g
                    key={`ifl-${exit.id}`}
                    onClick={(e) => { e.stopPropagation(); handleExitClick(exit.id); }}
                    style={{ cursor: "pointer" }}
                  >
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={isSelected ? "#C9A84C" : INTER_FLOOR_COLOR}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      strokeDasharray="4 3"
                      markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead-interfloor)"}
                    />
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12} />
                    <text
                      x={lx} y={ly}
                      textAnchor="middle" dominantBaseline="central"
                      fill={isSelected ? "#C9A84C" : INTER_FLOOR_COLOR}
                      fontSize="10" fontFamily="var(--font-sans)"
                    >
                      {exit.direction} {goesUp ? "↑" : "↓"}
                    </text>
                  </g>
                );
              })}

              {/* ── Ghost rooms from other floors (inter-floor endpoints) ── */}
              {Array.from(ghostFloorRoomSlugs).map((slug) => {
                const pos = positions.get(slug);
                const room = roomMap.get(slug);
                if (!pos || !room) return null;
                const color = roomColor(room.type);
                const x = pos.x * CELL_W;
                const y = pos.y * CELL_H;

                return (
                  <g
                    key={`ghost-floor-${slug}`}
                    opacity={0.3}
                    onClick={(e) => { e.stopPropagation(); handleRoomClick(slug); }}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x={x} y={y} width={NODE_W} height={NODE_H} rx={6} ry={6}
                      fill={color.fill}
                      stroke={INTER_FLOOR_COLOR}
                      strokeWidth={1}
                      strokeDasharray="4 2"
                    />
                    <text
                      x={x + NODE_W / 2} y={y + NODE_H / 2 - 7}
                      textAnchor="middle" dominantBaseline="central"
                      fill="#E8E0D0" fontSize="12" fontFamily="var(--font-serif)"
                    >
                      {room.name.length > 16 ? room.name.slice(0, 15) + "…" : room.name}
                    </text>
                    <text
                      x={x + NODE_W / 2} y={y + NODE_H / 2 + 9}
                      textAnchor="middle" dominantBaseline="central"
                      fill="#6A6B75" fontSize="9" fontFamily="var(--font-mono)"
                    >
                      z{pos.z > 0 ? "+" : ""}{pos.z}
                    </text>
                  </g>
                );
              })}

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
                    <text
                      x={x + NODE_W / 2} y={y + NODE_H / 2 - 7}
                      textAnchor="middle" dominantBaseline="central"
                      fill="#E8E0D0" fontSize="12" fontFamily="var(--font-serif)"
                    >
                      {room.name.length > 16 ? room.name.slice(0, 15) + "…" : room.name}
                    </text>
                    <text
                      x={x + NODE_W / 2} y={y + NODE_H / 2 + 9}
                      textAnchor="middle" dominantBaseline="central"
                      fill="#6A6B75" fontSize="9" fontFamily="var(--font-mono)"
                    >
                      {slug}
                    </text>
                    {pos.z !== 0 && (
                      <text
                        x={x + NODE_W - 8} y={y + 12}
                        textAnchor="end" fill="#8A8B95" fontSize="9" fontFamily="var(--font-sans)"
                      >
                        z{pos.z > 0 ? "+" : ""}{pos.z}
                      </text>
                    )}
                    {isDisconnected && (
                      <text
                        x={x + 10} y={y + 12}
                        fill="#B8860B" fontSize="12" fontFamily="var(--font-sans)"
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
                      const totalW = badges.length * 18 + (badges.length - 1) * 4;
                      const startX = x + NODE_W / 2 - totalW / 2;
                      return badges.map((b, i) => (
                        <g key={b.icon}>
                          <circle
                            cx={startX + i * 22 + 9} cy={y + NODE_H - 2}
                            r={8} fill={b.bg} stroke={b.color} strokeWidth={1}
                          />
                          <text
                            x={startX + i * 22 + 9} y={y + NODE_H - 2}
                            textAnchor="middle" dominantBaseline="central"
                            fill={b.color} fontSize="8" fontFamily="var(--font-sans)"
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
                        x={x + NODE_W / 2} y={y + NODE_H + 12}
                        textAnchor="middle" dominantBaseline="central"
                        fill="#6A6B75" fontSize="8" fontFamily="var(--font-mono)"
                      >
                        {room.properties.join(" · ")}
                      </text>
                    )}

                    {/* Vertical exit (up/down) badges — click to navigate floor */}
                    {upExits.length > 0 && (() => {
                      const targetZ = upExits.map((e) => positions.get(e.toRoomSlug)?.z).find((z) => z != null);
                      return (
                        <g
                          onClick={(e) => { e.stopPropagation(); if (targetZ != null) setCurrentFloor(targetZ); }}
                          style={{ cursor: targetZ != null ? "pointer" : "default" }}
                        >
                          <circle
                            cx={x + NODE_W - 2} cy={y + 2}
                            r={8} fill="#1a1033" stroke={INTER_FLOOR_COLOR} strokeWidth={1}
                          />
                          <text
                            x={x + NODE_W - 2} y={y + 2}
                            textAnchor="middle" dominantBaseline="central"
                            fill={INTER_FLOOR_COLOR} fontSize="9" fontWeight="bold"
                            fontFamily="var(--font-sans)"
                          >
                            ▲
                          </text>
                          <title>{upTooltip} (click to go to floor)</title>
                        </g>
                      );
                    })()}
                    {downExits.length > 0 && (() => {
                      const targetZ = downExits.map((e) => positions.get(e.toRoomSlug)?.z).find((z) => z != null);
                      return (
                        <g
                          onClick={(e) => { e.stopPropagation(); if (targetZ != null) setCurrentFloor(targetZ); }}
                          style={{ cursor: targetZ != null ? "pointer" : "default" }}
                        >
                          <circle
                            cx={x + NODE_W - 2} cy={y + NODE_H - 2}
                            r={8} fill="#1a1033" stroke={INTER_FLOOR_COLOR} strokeWidth={1}
                          />
                          <text
                            x={x + NODE_W - 2} y={y + NODE_H - 2}
                            textAnchor="middle" dominantBaseline="central"
                            fill={INTER_FLOOR_COLOR} fontSize="9" fontWeight="bold"
                            fontFamily="var(--font-sans)"
                          >
                            ▼
                          </text>
                          <title>{downTooltip} (click to go to floor)</title>
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
                          cx={x + NODE_W + 14} cy={y + 14 + i * 22} r={9}
                          fill="#0e3a3d" stroke={PORTAL_COLOR} strokeWidth={1.5}
                        />
                        <text
                          x={x + NODE_W + 14} y={y + 14 + i * 22}
                          textAnchor="middle" dominantBaseline="central"
                          fill={PORTAL_COLOR} fontSize="12" fontFamily="var(--font-sans)"
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
        </div>

        {/* ─── Side panel ─────────────────────────────────── */}
        {(selectedRoomData || selectedExitData || connectTarget) && (
          <div className="w-64 border-l border-[#2A2B35] p-4 space-y-3 flex-shrink-0">
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
                    style={{ fontFamily: "var(--font-serif)" }}
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
                {/* Content summary (read-only) */}
                {(selectedRoomData.npcs?.length > 0 || selectedRoomData.lootContainers?.length > 0 || selectedRoomData.hazards?.length > 0) && (
                  <div>
                    <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                      Content
                    </label>
                    <div className="bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 space-y-0.5">
                      {selectedRoomData.npcs?.length > 0 && (
                        <div className="text-xs flex items-center gap-1.5" style={{ fontFamily: "var(--font-sans)" }}>
                          <span style={{ color: "#D97706" }}>👤</span>
                          <span className="text-[#E8E0D0]">{selectedRoomData.npcs.length} NPC{selectedRoomData.npcs.length > 1 ? "s" : ""}</span>
                        </div>
                      )}
                      {selectedRoomData.lootContainers?.length > 0 && (
                        <div className="text-xs flex items-center gap-1.5" style={{ fontFamily: "var(--font-sans)" }}>
                          <span style={{ color: "#CA8A04" }}>📦</span>
                          <span className="text-[#E8E0D0]">{selectedRoomData.lootContainers.length} Loot Container{selectedRoomData.lootContainers.length > 1 ? "s" : ""}</span>
                        </div>
                      )}
                      {selectedRoomData.hazards?.length > 0 && (
                        <div className="text-xs flex items-center gap-1.5" style={{ fontFamily: "var(--font-sans)" }}>
                          <span style={{ color: "#DC2626" }}>⚠</span>
                          <span className="text-[#E8E0D0]">{selectedRoomData.hazards.length} Hazard{selectedRoomData.hazards.length > 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                        fontFamily: "var(--font-serif)",
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
          { label: "↑↓ Inter-floor", color: INTER_FLOOR_COLOR },
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
                  style={{ fontFamily: "var(--font-serif)" }}
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
                  style={{ fontFamily: "var(--font-serif)" }}
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
    </div>
  );
}
