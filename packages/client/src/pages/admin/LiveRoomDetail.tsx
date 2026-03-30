import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
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
  listEntities,
  type LiveRoomDetail as RoomDetail,
  type LiveRoomCreature,
  AdminAPIError,
} from "../../lib/admin-api.js";

interface CreatureTemplate {
  id: string;
  name: string;
  type: string;
}

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
      showFeedback("success", result.message);
      setShowSpawnModal(false);
      loadRoom(); // Refresh to see new creature
    } catch (err) {
      showFeedback(
        "error",
        err instanceof AdminAPIError ? err.message : "Spawn failed"
      );
    } finally {
      setSpawning(false);
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
  const isShard = room.name === "shard" || isZone;

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
              {isZone ? "Zone" : room.name === "shard" ? "Shard" : room.name} — {room.roomId.slice(0, 12)}…
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
          {isShard && (
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
                {isShard && (
                  <>
                    <StatRow label="Biome" value={room.biome ?? "—"} />
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

            {/* Creatures (shard only) */}
            {isShard && room.creatures && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <h2
                  className="text-[#C9A84C] text-lg mb-4"
                 
                >
                  Creatures ({room.creatures.length})
                </h2>
                {room.creatures.length === 0 ? (
                  <p
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    No creatures in this shard.
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
              </div>
            )}

            {/* Players */}
            {room.players && room.players.length > 0 && (
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

          {/* Right column — quick actions */}
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
                {isShard && <div>Biome: {room.biome ?? "—"}</div>}
                <div>Paused: {room.paused ? "Yes" : "No"}</div>
              </div>
            </div>

            {isShard && (
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
