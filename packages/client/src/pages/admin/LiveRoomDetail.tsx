import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  MapPin,
  Megaphone,
  Move,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Skull,
  Users,
  X,
} from "lucide-react";
import {
  fetchLiveRoomDetail,
  pauseRoom,
  resumeRoom,
  spawnInRoom,
  broadcastToRoom,
  teleportPlayer,
  listEntities,
  type LiveRoomDetail as RoomDetail,
  type LiveRoomCreature,
  type LiveRoomPlayer,
  AdminAPIError,
} from "../../lib/admin-api.js";
import {
  getZone,
  type ZoneData,
} from "../../lib/zone-api.js";

interface CreatureTemplate {
  id: string;
  name: string;
  type: string;
}

type DetailTab = "room-graph" | "creatures" | "players";

export default function LiveRoomDetail() {
  const { roomId } = useParams();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<DetailTab>("room-graph");

  // Zone data state
  const [zoneData, setZoneData] = useState<ZoneData | null>(null);
  const [zoneLoading, setZoneLoading] = useState(false);

  // Expanded room rows in the room graph
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  // Spawn modal state
  const [showSpawnModal, setShowSpawnModal] = useState(false);
  const [creatureTemplates, setCreatureTemplates] = useState<
    CreatureTemplate[]
  >([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [targetRoomId, setTargetRoomId] = useState("");
  const [spawning, setSpawning] = useState(false);

  // Confirm modal state
  const [confirmAction, setConfirmAction] = useState<{
    action: "pause" | "resume";
    title: string;
    message: string;
  } | null>(null);

  // Broadcast modal state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTargetRoom, setBroadcastTargetRoom] = useState<{
    slug: string;
    name: string;
  } | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastAsSystem, setBroadcastAsSystem] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);

  // Teleport modal state
  const [showTeleportModal, setShowTeleportModal] = useState(false);
  const [teleportTargetRoom, setTeleportTargetRoom] = useState<{
    slug: string;
    name: string;
  } | null>(null);
  const [teleportPlayerId, setTeleportPlayerId] = useState("");
  const [teleportNotify, setTeleportNotify] = useState(true);
  const [teleporting, setTeleporting] = useState(false);

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchLiveRoomDetail(roomId);
      setRoom(detail);
    } catch (err) {
      setError(
        err instanceof AdminAPIError ? err.message : "Failed to load room"
      );
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // Fetch zone definition when we have a zoneSlug
  useEffect(() => {
    if (!room?.zoneSlug) {
      setZoneData(null);
      return;
    }
    let cancelled = false;
    setZoneLoading(true);
    getZone(room.zoneSlug)
      .then((data) => {
        if (!cancelled) setZoneData(data);
      })
      .catch(() => {
        if (!cancelled) setZoneData(null);
      })
      .finally(() => {
        if (!cancelled) setZoneLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [room?.zoneSlug]);

  // Compute per-room occupancy from live player/creature data
  const roomOccupancy = useMemo(() => {
    const map: Record<
      string,
      { players: LiveRoomPlayer[]; creatures: LiveRoomCreature[] }
    > = {};
    // Use zoneData rooms when available; fall back to the room-graph rooms
    // included in the room detail response (fixes procedural zones and
    // zone-data fetch failures).
    const roomList: { slug?: string; id?: string }[] =
      zoneData?.rooms ?? (room?.roomGraphRooms?.map((r) => ({ slug: r.id, id: r.id })) ?? []);
    if (roomList.length === 0) return map;
    for (const zr of roomList) {
      const key = (zr as { slug?: string }).slug ?? (zr as { id?: string }).id ?? '';
      if (key) map[key] = { players: [], creatures: [] };
    }
    for (const p of room?.players ?? []) {
      if (map[p.currentRoomId]) {
        map[p.currentRoomId].players.push(p);
      }
    }
    for (const c of room?.creatures ?? []) {
      if (map[c.currentRoomId]) {
        map[c.currentRoomId].creatures.push(c);
      }
    }
    return map;
  }, [zoneData, room?.players, room?.creatures, room?.roomGraphRooms]);

  // Normalised room list for the Room Graph tab.
  // Prefer full zone data; fall back to the lightweight roomGraphRooms
  // included in every zone room detail response.
  const displayRooms: { slug: string; name: string; type?: string; properties?: string[]; npcs?: { creatureId: string }[]; lootContainers?: { id: string }[] }[] = useMemo(() => {
    if (zoneData) return zoneData.rooms;
    if (room?.roomGraphRooms) {
      return room.roomGraphRooms.map((r) => ({
        slug: r.id,
        name: r.name,
        type: r.type,
      }));
    }
    return [];
  }, [zoneData, room?.roomGraphRooms]);

  const showFeedback = (type: "success" | "error", message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handlePauseResume = async (action: "pause" | "resume") => {
    if (!roomId) return;
    setActionPending(true);
    setConfirmAction(null);
    try {
      const result =
        action === "pause"
          ? await pauseRoom(roomId)
          : await resumeRoom(roomId);
      setRoom((prev) => (prev ? { ...prev, paused: result.paused } : prev));
      showFeedback(
        "success",
        `Room ${action === "pause" ? "paused" : "resumed"} successfully`
      );
    } catch (err) {
      showFeedback(
        "error",
        err instanceof AdminAPIError ? err.message : `Failed to ${action} room`
      );
    } finally {
      setActionPending(false);
    }
  };

  const openSpawnModal = async () => {
    setShowSpawnModal(true);
    setSelectedTemplate("");
    setTargetRoomId("");
    try {
      const templates = await listEntities<CreatureTemplate>("creatures");
      setCreatureTemplates(templates);
    } catch {
      setCreatureTemplates([]);
    }
  };

  const handleSpawn = async () => {
    if (!roomId || !selectedTemplate) return;
    setSpawning(true);
    try {
      const result = await spawnInRoom(
        roomId,
        "creature",
        selectedTemplate,
        targetRoomId || undefined
      );
      setShowSpawnModal(false);
      await loadRoom(); // Refresh to see new creature
      showFeedback("success", result.message);
    } catch (err) {
      showFeedback(
        "error",
        err instanceof AdminAPIError ? err.message : "Spawn failed"
      );
    } finally {
      setSpawning(false);
    }
  };

  const openBroadcastModal = (targetRoom: { slug: string; name: string }) => {
    setBroadcastTargetRoom(targetRoom);
    setBroadcastMessage("");
    setBroadcastAsSystem(true);
    setShowBroadcastModal(true);
  };

  const handleBroadcast = async () => {
    if (!roomId || !broadcastTargetRoom || !broadcastMessage.trim()) return;
    setBroadcasting(true);
    try {
      const result = await broadcastToRoom(
        roomId,
        broadcastTargetRoom.slug,
        broadcastMessage.trim(),
        broadcastAsSystem ? "system" : "admin"
      );
      showFeedback("success", result.message);
      setShowBroadcastModal(false);
    } catch (err) {
      showFeedback(
        "error",
        err instanceof AdminAPIError ? err.message : "Broadcast failed"
      );
    } finally {
      setBroadcasting(false);
    }
  };

  const openTeleportModal = (targetRoom: { slug: string; name: string }) => {
    setTeleportTargetRoom(targetRoom);
    setTeleportPlayerId("");
    setTeleportNotify(true);
    setShowTeleportModal(true);
  };

  const handleTeleport = async () => {
    if (!roomId || !teleportTargetRoom || !teleportPlayerId) return;
    setTeleporting(true);
    try {
      const result = await teleportPlayer(
        roomId,
        teleportPlayerId,
        teleportTargetRoom.slug,
        teleportNotify
      );
      showFeedback("success", result.message);
      setShowTeleportModal(false);
      loadRoom(); // Refresh to see updated positions
    } catch (err) {
      showFeedback(
        "error",
        err instanceof AdminAPIError ? err.message : "Teleport failed"
      );
    } finally {
      setTeleporting(false);
    }
  };

  const toggleRoomExpanded = (slug: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const openSpawnInRoom = async (targetSlug: string) => {
    setShowSpawnModal(true);
    setSelectedTemplate("");
    setTargetRoomId(targetSlug);
    try {
      const templates = await listEntities<CreatureTemplate>("creatures");
      setCreatureTemplates(templates);
    } catch {
      setCreatureTemplates([]);
    }
  };

  if (loading && !room) {
    return (
      <div className="p-8">
        <div
          className="text-[#8A8B95]"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Loading room…
        </div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="p-8">
        <Link
          to="/admin/live-rooms"
          className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Live Rooms
        </Link>
        <div
          className="text-[#8B2500]"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Error: {error}
        </div>
      </div>
    );
  }

  if (!room) return null;

  const isZone = room.name.startsWith("zone:");
  const isZoneRoom = room.name === "zone" || isZone;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/live-rooms"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1
              className="text-[#C9A84C] text-xl"
             
            >
              {isZone ? "Zone" : room.name === "zone" ? "Zone" : room.name} — {room.roomId.slice(0, 12)}…
            </h1>
            <span
              className="text-[#8A8B95] text-xs"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {room.roomId}
            </span>
          </div>
          {room.paused && (
            <span
              className="px-2 py-1 bg-[#C9A84C]/20 text-[#C9A84C] text-xs rounded"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              PAUSED
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadRoom}
            disabled={loading}
            className="px-3 py-2 border border-[#2A2B35] hover:bg-[#1C1D27] text-[#8A8B95] hover:text-[#E8E0D0] rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          {room.paused ? (
            <button
              onClick={() =>
                setConfirmAction({
                  action: "resume",
                  title: "Resume Room",
                  message:
                    "This will restart the game tick. Creatures will resume AI behavior and timers will continue.",
                })
              }
              disabled={actionPending}
              className="px-4 py-2 bg-[#2D6B4F] hover:bg-[#256B4A] text-[#E8E0D0] rounded transition-colors flex items-center gap-2 disabled:opacity-50"
              style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
            >
              <Play className="w-4 h-4" /> Resume
            </button>
          ) : (
            <button
              onClick={() =>
                setConfirmAction({
                  action: "pause",
                  title: "Pause Room",
                  message:
                    "This will stop the game tick. Creature AI, combat resolution, and all timers will halt until resumed.",
                })
              }
              disabled={actionPending}
              className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2 disabled:opacity-50"
              style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
            >
              <Pause className="w-4 h-4" /> Pause
            </button>
          )}
          {isZoneRoom && (
            <button
              onClick={openSpawnModal}
              disabled={actionPending}
              className="px-4 py-2 border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10 rounded transition-colors flex items-center gap-2 disabled:opacity-50"
              style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
            >
              <Plus className="w-4 h-4" /> Spawn Creature
            </button>
          )}
        </div>
      </div>

      {/* Feedback toast */}
      {actionFeedback && (
        <div
          className={`mx-8 mt-4 p-3 rounded text-sm ${
            actionFeedback.type === "success"
              ? "bg-[#2D6B4F]/20 border border-[#2D6B4F] text-[#E8E0D0]"
              : "bg-[#8B2500]/20 border border-[#8B2500] text-[#E8E0D0]"
          }`}
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {actionFeedback.message}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Left column — room info */}
          <div className="col-span-2 space-y-6">
            {/* Stats */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
               
              >
                Room Status
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {isZoneRoom && (
                  <>
                    <StatRow label="Lifecycle" value={room.lifecycle ?? "—"} />
                    <StatRow
                      label="Stability"
                      value={room.stability != null ? `${room.stability}%` : "—"}
                    />
                    <StatRow
                      label="Collapse Timer"
                      value={room.collapseTimer?.toString() ?? "—"}
                    />
                  </>
                )}
                <StatRow label="Tick" value={room.tick?.toString() ?? "—"} />
                <StatRow label="Connected Clients" value={String(room.clients)} />
                <StatRow
                  label="Player Count"
                  value={room.playerCount?.toString() ?? String(room.clients)}
                />
                <StatRow
                  label="Paused"
                  value={room.paused ? "Yes" : "No"}
                  highlight={room.paused}
                />
              </div>
            </div>

            {/* Tabbed content area */}
            {isZoneRoom && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-[#2A2B35]">
                  {(
                    [
                      { key: "room-graph" as DetailTab, label: "Room Graph", icon: MapPin },
                      { key: "creatures" as DetailTab, label: `Creatures (${room.creatures?.length ?? 0})`, icon: Skull },
                      { key: "players" as DetailTab, label: `Players (${room.players?.length ?? 0})`, icon: Users },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-5 py-3 text-sm flex items-center gap-2 transition-colors border-b-2 ${
                        activeTab === tab.key
                          ? "border-[#C9A84C] text-[#C9A84C]"
                          : "border-transparent text-[#8A8B95] hover:text-[#E8E0D0]"
                      }`}
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-6">
                  {/* Room Graph Tab */}
                  {activeTab === "room-graph" && (
                    <>
                      {zoneLoading && displayRooms.length === 0 ? (
                        <p
                          className="text-[#8A8B95] text-sm"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          Loading zone rooms…
                        </p>
                      ) : displayRooms.length === 0 ? (
                        <p
                          className="text-[#8A8B95] text-sm"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          No rooms defined for this zone.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {/* Header row */}
                          <div className="grid grid-cols-[24px_1fr_100px_100px_1fr] gap-3 px-3 py-2 text-[#8A8B95] text-xs uppercase tracking-wider"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            <span />
                            <span>Room Name</span>
                            <span className="text-center">Players</span>
                            <span className="text-center">Creatures</span>
                            <span>Features</span>
                          </div>
                          {displayRooms.map((zr) => {
                            const occ = roomOccupancy[zr.slug] ?? {
                              players: [],
                              creatures: [],
                            };
                            const isExpanded = expandedRooms.has(zr.slug);
                            return (
                              <div key={zr.slug}>
                                <button
                                  onClick={() => toggleRoomExpanded(zr.slug)}
                                  className="w-full grid grid-cols-[24px_1fr_100px_100px_1fr] gap-3 px-3 py-2 rounded hover:bg-[#1C1D27] transition-colors items-center text-left"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-[#8A8B95]" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-[#8A8B95]" />
                                  )}
                                  <div>
                                    <span className="text-[#E8E0D0] text-sm">
                                      {zr.name}
                                    </span>
                                    <span
                                      className="text-[#8A8B95] text-xs ml-2"
                                      style={{ fontFamily: "var(--font-mono)" }}
                                    >
                                      {zr.slug}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-center text-sm ${
                                      occ.players.length > 0
                                        ? "text-[#C9A84C]"
                                        : "text-[#4A4B55]"
                                    }`}
                                    style={{ fontFamily: "var(--font-mono)" }}
                                  >
                                    {occ.players.length}
                                  </span>
                                  <span
                                    className={`text-center text-sm ${
                                      occ.creatures.length > 0
                                        ? "text-[#8B2500]"
                                        : "text-[#4A4B55]"
                                    }`}
                                    style={{ fontFamily: "var(--font-mono)" }}
                                  >
                                    {occ.creatures.length}
                                  </span>
                                  <div className="flex gap-1 flex-wrap">
                                    {(zr.properties ?? []).map((prop) => (
                                      <span
                                        key={prop}
                                        className="px-1.5 py-0.5 text-[10px] rounded bg-[#2A2B35] text-[#8A8B95]"
                                        style={{ fontFamily: "var(--font-sans)" }}
                                      >
                                        {prop}
                                      </span>
                                    ))}
                                    {zr.npcs?.length > 0 && (
                                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-[#8B2500]/20 text-[#8B2500]"
                                        style={{ fontFamily: "var(--font-sans)" }}
                                      >
                                        NPCs
                                      </span>
                                    )}
                                    {zr.lootContainers?.length > 0 && (
                                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-[#C9A84C]/20 text-[#C9A84C]"
                                        style={{ fontFamily: "var(--font-sans)" }}
                                      >
                                        Loot
                                      </span>
                                    )}
                                  </div>
                                </button>

                                {/* Expanded detail */}
                                {isExpanded && (
                                  <div className="ml-8 mr-3 mb-3 border-l-2 border-[#2A2B35] pl-4 space-y-3">
                                    {/* Players in this room */}
                                    {occ.players.length > 0 && (
                                      <div>
                                        <h4
                                          className="text-[#8A8B95] text-xs uppercase tracking-wider mb-1"
                                          style={{ fontFamily: "var(--font-sans)" }}
                                        >
                                          Players
                                        </h4>
                                        {occ.players.map((p) => (
                                          <div
                                            key={p.sessionId}
                                            className="flex items-center gap-3 text-sm py-1"
                                          >
                                            <Users className="w-3 h-3 text-[#C9A84C]" />
                                            <span
                                              className="text-[#E8E0D0]"
                                              style={{ fontFamily: "var(--font-mono)" }}
                                            >
                                              {p.sessionId.slice(0, 10)}…
                                            </span>
                                            <span
                                              className="text-[#8A8B95] text-xs"
                                              style={{ fontFamily: "var(--font-sans)" }}
                                            >
                                              {p.inventoryCount} items
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Creatures in this room */}
                                    {occ.creatures.length > 0 && (
                                      <div>
                                        <h4
                                          className="text-[#8A8B95] text-xs uppercase tracking-wider mb-1"
                                          style={{ fontFamily: "var(--font-sans)" }}
                                        >
                                          Creatures
                                        </h4>
                                        {occ.creatures.map((c) => (
                                          <div
                                            key={c.id}
                                            className="flex items-center gap-3 text-sm py-1"
                                          >
                                            <Skull
                                              className={`w-3 h-3 ${
                                                c.isAlive
                                                  ? "text-[#8B2500]"
                                                  : "text-[#4A4B55]"
                                              }`}
                                            />
                                            <span className="text-[#E8E0D0]">
                                              {c.name}
                                            </span>
                                            <span
                                              className={`text-xs ${
                                                c.hp / c.maxHp > 0.5
                                                  ? "text-[#2D6B4F]"
                                                  : c.hp / c.maxHp > 0.25
                                                  ? "text-[#C9A84C]"
                                                  : "text-[#8B2500]"
                                              }`}
                                              style={{
                                                fontFamily: "var(--font-mono)",
                                              }}
                                            >
                                              {c.hp}/{c.maxHp} HP
                                            </span>
                                            <span
                                              className="text-xs px-1.5 py-0.5 rounded"
                                              style={{
                                                fontFamily: "var(--font-sans)",
                                                backgroundColor:
                                                  behaviorColor(c.behaviorState) + "20",
                                                color: behaviorColor(
                                                  c.behaviorState
                                                ),
                                              }}
                                            >
                                              {c.behaviorState}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Room actions */}
                                    <div className="flex gap-2 pt-1">
                                      <button
                                        onClick={() =>
                                          openBroadcastModal({
                                            slug: zr.slug,
                                            name: zr.name,
                                          })
                                        }
                                        className="px-3 py-1.5 text-xs border border-[#2A2B35] text-[#8A8B95] hover:text-[#E8E0D0] hover:bg-[#1C1D27] rounded transition-colors flex items-center gap-1.5"
                                        style={{ fontFamily: "var(--font-sans)" }}
                                      >
                                        <Megaphone className="w-3 h-3" />
                                        Broadcast
                                      </button>
                                      <button
                                        onClick={() => openSpawnInRoom(zr.slug)}
                                        className="px-3 py-1.5 text-xs border border-[#2A2B35] text-[#8A8B95] hover:text-[#E8E0D0] hover:bg-[#1C1D27] rounded transition-colors flex items-center gap-1.5"
                                        style={{ fontFamily: "var(--font-sans)" }}
                                      >
                                        <Plus className="w-3 h-3" />
                                        Spawn Here
                                      </button>
                                      <button
                                        onClick={() =>
                                          openTeleportModal({
                                            slug: zr.slug,
                                            name: zr.name,
                                          })
                                        }
                                        className="px-3 py-1.5 text-xs border border-[#2A2B35] text-[#8A8B95] hover:text-[#E8E0D0] hover:bg-[#1C1D27] rounded transition-colors flex items-center gap-1.5"
                                        style={{ fontFamily: "var(--font-sans)" }}
                                      >
                                        <Move className="w-3 h-3" />
                                        Teleport Here
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* Creatures Tab */}
                  {activeTab === "creatures" && (
                    <>
                      {!room.creatures || room.creatures.length === 0 ? (
                        <p
                          className="text-[#8A8B95] text-sm"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          No creatures in this zone.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {room.creatures.map((c: LiveRoomCreature) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between bg-[#1C1D27] rounded px-4 py-2"
                            >
                              <div className="flex items-center gap-3">
                                <Skull
                                  className={`w-4 h-4 ${
                                    c.isAlive ? "text-[#8B2500]" : "text-[#4A4B55]"
                                  }`}
                                />
                                <div>
                                  <span
                                    className="text-[#E8E0D0] text-sm"
                                   
                                  >
                                    {c.name}
                                  </span>
                                  <span
                                    className="text-[#8A8B95] text-xs ml-2"
                                    style={{ fontFamily: "var(--font-mono)" }}
                                  >
                                    {c.id}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span
                                  className="text-xs px-2 py-1 rounded"
                                  style={{
                                    fontFamily: "var(--font-sans)",
                                    backgroundColor: behaviorColor(c.behaviorState) + "20",
                                    color: behaviorColor(c.behaviorState),
                                  }}
                                >
                                  {c.behaviorState}
                                </span>
                                <span
                                  className={`text-sm ${
                                    c.hp / c.maxHp > 0.5
                                      ? "text-[#2D6B4F]"
                                      : c.hp / c.maxHp > 0.25
                                      ? "text-[#C9A84C]"
                                      : "text-[#8B2500]"
                                  }`}
                                  style={{ fontFamily: "var(--font-mono)" }}
                                >
                                  {c.hp}/{c.maxHp} HP
                                </span>
                                <span
                                  className="text-[#8A8B95] text-xs"
                                  style={{ fontFamily: "var(--font-mono)" }}
                                >
                                  Room: {c.currentRoomId}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Players Tab */}
                  {activeTab === "players" && (
                    <>
                      {!room.players || room.players.length === 0 ? (
                        <p
                          className="text-[#8A8B95] text-sm"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          No players in this zone.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {room.players.map((p) => (
                            <div
                              key={p.sessionId}
                              className="flex items-center justify-between bg-[#1C1D27] rounded px-4 py-2"
                            >
                              <div className="flex items-center gap-3">
                                <Users className="w-4 h-4 text-[#C9A84C]" />
                                <span
                                  className="text-[#E8E0D0] text-sm"
                                  style={{ fontFamily: "var(--font-mono)" }}
                                >
                                  {p.sessionId.slice(0, 10)}…
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span
                                  className="text-[#8A8B95] text-xs"
                                  style={{ fontFamily: "var(--font-mono)" }}
                                >
                                  Room: {p.currentRoomId}
                                </span>
                                <span
                                  className="text-[#8A8B95] text-xs"
                                  style={{ fontFamily: "var(--font-sans)" }}
                                >
                                  {p.inventoryCount} items · {p.currentWeight}/{p.maxCarryWeight} wt
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Creatures (non-zone or no tabs fallback) */}
            {!isZoneRoom && room.creatures && room.creatures.length > 0 && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <h2
                  className="text-[#C9A84C] text-lg mb-4"
                 
                >
                  Creatures ({room.creatures.length})
                </h2>
                <div className="space-y-2">
                  {room.creatures.map((c: LiveRoomCreature) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between bg-[#1C1D27] rounded px-4 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <Skull
                          className={`w-4 h-4 ${
                            c.isAlive ? "text-[#8B2500]" : "text-[#4A4B55]"
                          }`}
                        />
                        <div>
                          <span className="text-[#E8E0D0] text-sm">
                            {c.name}
                          </span>
                          <span
                            className="text-[#8A8B95] text-xs ml-2"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {c.id}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            fontFamily: "var(--font-sans)",
                            backgroundColor: behaviorColor(c.behaviorState) + "20",
                            color: behaviorColor(c.behaviorState),
                          }}
                        >
                          {c.behaviorState}
                        </span>
                        <span
                          className={`text-sm ${
                            c.hp / c.maxHp > 0.5
                              ? "text-[#2D6B4F]"
                              : c.hp / c.maxHp > 0.25
                              ? "text-[#C9A84C]"
                              : "text-[#8B2500]"
                          }`}
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {c.hp}/{c.maxHp} HP
                        </span>
                        <span
                          className="text-[#8A8B95] text-xs"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          Room: {c.currentRoomId}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Players (non-zone fallback) */}
            {!isZoneRoom && room.players && room.players.length > 0 && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <h2
                  className="text-[#C9A84C] text-lg mb-4"
                 
                >
                  Players ({room.players.length})
                </h2>
                <div className="space-y-2">
                  {room.players.map((p) => (
                    <div
                      key={p.sessionId}
                      className="flex items-center justify-between bg-[#1C1D27] rounded px-4 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-[#C9A84C]" />
                        <span
                          className="text-[#E8E0D0] text-sm"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {p.sessionId.slice(0, 10)}…
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className="text-[#8A8B95] text-xs"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          Room: {p.currentRoomId}
                        </span>
                        <span
                          className="text-[#8A8B95] text-xs"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          {p.inventoryCount} items · {p.currentWeight}/{p.maxCarryWeight} wt
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column — quick info & actions */}
          <div className="space-y-6">
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Quick Info
              </h3>
              <div
                className="text-xs text-[#8A8B95] space-y-2"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <div>Room Type: {room.name}</div>
                <div>Full ID: {room.roomId}</div>
                <div>Paused: {room.paused ? "Yes" : "No"}</div>
                {room.zoneSlug && <div>Zone: {room.zoneSlug}</div>}
              </div>
            </div>

            {/* Quick Actions card */}
            {isZoneRoom && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <h3
                  className="text-[#C9A84C] text-sm mb-4"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab("room-graph")}
                    className="w-full px-3 py-2 text-xs text-left border border-[#2A2B35] text-[#8A8B95] hover:text-[#E8E0D0] hover:bg-[#1C1D27] rounded transition-colors flex items-center gap-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    View Zone Graph
                  </button>
                  <button
                    onClick={openSpawnModal}
                    className="w-full px-3 py-2 text-xs text-left border border-[#2A2B35] text-[#8A8B95] hover:text-[#E8E0D0] hover:bg-[#1C1D27] rounded transition-colors flex items-center gap-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Spawn Creature
                  </button>
                </div>
              </div>
            )}

            {isZoneRoom && (
              <div
                className={`border rounded-lg p-4 ${
                  room.paused
                    ? "bg-[#C9A84C]/10 border-[#C9A84C]/30"
                    : "bg-[#2D6B4F]/10 border-[#2D6B4F]/30"
                }`}
              >
                <p
                  className="text-[#E8E0D0] text-sm flex items-center gap-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {room.paused ? (
                    <>
                      <Pause className="w-4 h-4 text-[#C9A84C]" />
                      <span>Tick halted — resume to continue simulation</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-[#2D6B4F]" />
                      <span>Simulation running normally</span>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 w-full max-w-md">
            <h3
              className="text-[#C9A84C] text-lg mb-2"
             
            >
              {confirmAction.title}
            </h3>
            <p
              className="text-[#8A8B95] text-sm mb-6"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {confirmAction.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 border border-[#2A2B35] text-[#8A8B95] hover:text-[#E8E0D0] rounded transition-colors"
                style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handlePauseResume(confirmAction.action)}
                disabled={actionPending}
                className={`px-4 py-2 rounded transition-colors flex items-center gap-2 disabled:opacity-50 ${
                  confirmAction.action === "pause"
                    ? "bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F]"
                    : "bg-[#2D6B4F] hover:bg-[#256B4A] text-[#E8E0D0]"
                }`}
                style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
              >
                {actionPending
                  ? "Working…"
                  : confirmAction.action === "pause"
                  ? "Pause"
                  : "Resume"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spawn Modal */}
      {showSpawnModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-[#C9A84C] text-lg"
               
              >
                Spawn Creature
              </h3>
              <button
                onClick={() => setShowSpawnModal(false)}
                className="text-[#8A8B95] hover:text-[#E8E0D0] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-[#8A8B95] text-sm mb-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Creature Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                 
                >
                  <option value="">Select creature…</option>
                  {creatureTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="block text-[#8A8B95] text-sm mb-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Target Room ID{" "}
                  <span className="text-[#4A4B55]">(optional — auto-selects if empty)</span>
                </label>
                <input
                  type="text"
                  value={targetRoomId}
                  onChange={(e) => setTargetRoomId(e.target.value)}
                  placeholder="e.g. room-3"
                  className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowSpawnModal(false)}
                className="px-4 py-2 border border-[#2A2B35] text-[#8A8B95] hover:text-[#E8E0D0] rounded transition-colors"
                style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSpawn}
                disabled={spawning || !selectedTemplate}
                className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2 disabled:opacity-50"
                style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
              >
                <Plus className="w-4 h-4" />
                {spawning ? "Spawning…" : "Spawn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && broadcastTargetRoom && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-[#C9A84C] text-lg"
               
              >
                Broadcast to {broadcastTargetRoom.name}
              </h3>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-[#8A8B95] hover:text-[#E8E0D0] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-[#8A8B95] text-sm mb-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Message
                </label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) =>
                    setBroadcastMessage(e.target.value.slice(0, 500))
                  }
                  placeholder="Enter message to broadcast…"
                  rows={4}
                  className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none resize-none"
                  style={{ fontFamily: "var(--font-sans)" }}
                />
                <span
                  className="text-[#4A4B55] text-xs mt-1 block text-right"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {broadcastMessage.length}/500
                </span>
              </div>
              <label
                className="flex items-center gap-2 text-[#8A8B95] text-sm cursor-pointer"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <input
                  type="checkbox"
                  checked={broadcastAsSystem}
                  onChange={(e) => setBroadcastAsSystem(e.target.checked)}
                  className="accent-[#C9A84C]"
                />
                Send as system message
              </label>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="px-4 py-2 border border-[#2A2B35] text-[#8A8B95] hover:text-[#E8E0D0] rounded transition-colors"
                style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleBroadcast}
                disabled={broadcasting || !broadcastMessage.trim()}
                className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2 disabled:opacity-50"
                style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
              >
                <Megaphone className="w-4 h-4" />
                {broadcasting ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teleport Modal */}
      {showTeleportModal && teleportTargetRoom && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-[#C9A84C] text-lg"
               
              >
                Teleport Player to {teleportTargetRoom.name}
              </h3>
              <button
                onClick={() => setShowTeleportModal(false)}
                className="text-[#8A8B95] hover:text-[#E8E0D0] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-[#8A8B95] text-sm mb-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Select Player
                </label>
                <select
                  value={teleportPlayerId}
                  onChange={(e) => setTeleportPlayerId(e.target.value)}
                  className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                >
                  <option value="">Select player…</option>
                  {(room?.players ?? []).map((p) => (
                    <option key={p.sessionId} value={p.sessionId}>
                      {p.sessionId.slice(0, 16)}… (in {p.currentRoomId})
                    </option>
                  ))}
                </select>
              </div>
              <label
                className="flex items-center gap-2 text-[#8A8B95] text-sm cursor-pointer"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <input
                  type="checkbox"
                  checked={teleportNotify}
                  onChange={(e) => setTeleportNotify(e.target.checked)}
                  className="accent-[#C9A84C]"
                />
                Notify player
              </label>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowTeleportModal(false)}
                className="px-4 py-2 border border-[#2A2B35] text-[#8A8B95] hover:text-[#E8E0D0] rounded transition-colors"
                style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
              >
                Cancel
              </button>
              <button
                onClick={handleTeleport}
                disabled={teleporting || !teleportPlayerId}
                className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2 disabled:opacity-50"
                style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
              >
                <Move className="w-4 h-4" />
                {teleporting ? "Teleporting…" : "Teleport"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1">
      <span
        className="text-[#8A8B95] text-sm"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        {label}
      </span>
      <span
        className={`text-sm ${highlight ? "text-[#C9A84C]" : "text-[#E8E0D0]"}`}
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {value}
      </span>
    </div>
  );
}

function behaviorColor(state: string): string {
  switch (state) {
    case "idle":
      return "#8A8B95";
    case "alert":
      return "#C9A84C";
    case "hostile":
      return "#8B2500";
    case "fleeing":
      return "#6B4E9B";
    default:
      return "#4A4B55";
  }
}
