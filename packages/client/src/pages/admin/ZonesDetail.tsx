import { useState, useEffect, Fragment } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Save, Send, Plus, X, Trash2, Edit2, ChevronDown, ChevronRight, ArrowRight, ArrowRightLeft } from "lucide-react";
import {
  getZone, createZone, updateZone,
  createRoom, updateRoom, deleteRoom,
  createExit, deleteExit,
  type ZoneDefinition, type ZoneRoomDefinition, type ZoneExitDefinition,
} from "../../lib/zone-api";
import ZoneDesigner from "./ZoneDesigner.js";

type Tab = "general" | "rooms" | "exits" | "designer";

const THEME_OPTIONS = [
  "flooded_crypt", "shattered_bastion", "fungal_deep", "ashen_reach", "void_rift",
];
const LIFECYCLE_OPTIONS = ["persistent", "scheduled", "event"] as const;
const CATEGORY_OPTIONS = ["hub", "dungeon", "wilderness", "social"] as const;
const ROOM_TYPE_OPTIONS = ["entry", "corridor", "junction", "dead_end", "boss"];
const DIRECTION_OPTIONS = ["north", "south", "east", "west", "up", "down"];
const ROOM_PROPERTY_OPTIONS = ["heavy_door", "cavern", "water"];

const OPPOSITE: Record<string, string> = {
  north: "south", south: "north",
  east: "west", west: "east",
  up: "down", down: "up",
};

type ExitPair = {
  key: string;
  forward: ZoneExitDefinition;
  reverse: ZoneExitDefinition | null;
  isInterZone: boolean;
};

function groupExitsIntoPairs(exits: ZoneExitDefinition[]): ExitPair[] {
  const matched = new Set<string>();
  const pairs: ExitPair[] = [];

  for (const exit of exits) {
    if (matched.has(exit.id)) continue;

    const isInterZone = !!exit.targetZoneSlug;
    const opp = OPPOSITE[exit.direction];
    const reverse = !isInterZone && opp
      ? exits.find(
          (r) =>
            r.id !== exit.id &&
            !matched.has(r.id) &&
            r.fromRoomSlug === exit.toRoomSlug &&
            r.toRoomSlug === exit.fromRoomSlug &&
            r.direction === opp &&
            !r.targetZoneSlug
        ) ?? null
      : null;

    matched.add(exit.id);
    if (reverse) matched.add(reverse.id);

    pairs.push({
      key: reverse ? [exit.id, reverse.id].sort().join(":") : exit.id,
      forward: exit,
      reverse,
      isInterZone,
    });
  }
  return pairs;
}

export default function ZonesDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isNew = slug === "new";
  const [activeTab, setActiveTab] = useState<Tab>("designer");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<ZoneDefinition>>({
    slug: "",
    name: "",
    description: "",
    tier: 1,
    theme: "flooded_crypt",
    levelMin: 1,
    levelMax: 5,
    lifecycle: "persistent",
    category: "dungeon",
    maxPlayers: 0,
    pvpEnabled: false,
    repopIntervalSeconds: 300,
    entryRoomSlugs: [],
  });

  const [rooms, setRooms] = useState<ZoneRoomDefinition[]>([]);
  const [exits, setExits] = useState<ZoneExitDefinition[]>([]);
  const [zoneId, setZoneId] = useState<string | null>(null);

  // Room form state
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ZoneRoomDefinition | null>(null);
  const [roomForm, setRoomForm] = useState({
    slug: "", name: "", description: "", type: "corridor", properties: [] as string[],
  });

  // Exit form state
  const [showExitForm, setShowExitForm] = useState(false);
  const [exitForm, setExitForm] = useState({
    fromRoomSlug: "", direction: "north", toRoomSlug: "",
    targetZoneSlug: "", targetRoomSlug: "", locked: false, hidden: false,
  });
  const [exitFormBidirectional, setExitFormBidirectional] = useState(true);

  // Exit pair expand/collapse state
  const [expandedPairs, setExpandedPairs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isNew && slug) {
      loadZone(slug);
    }
  }, [slug, isNew]);

  async function loadZone(zoneSlug: string) {
    try {
      setLoading(true);
      setError(null);
      const data = await getZone(zoneSlug);
      setFormData(data.zone);
      setZoneId(data.zone.id);
      setRooms(data.rooms);
      setExits(data.exits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load zone");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.name || !formData.slug) {
      setError("Name and slug are required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isNew) {
        const created = await createZone(formData);
        navigate(`/admin/zones/${created.slug}`);
      } else if (zoneId) {
        await updateZone(zoneId, formData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save zone");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!formData.name || !formData.slug) {
      setError("Name and slug are required");
      return;
    }
    await handleSave();
  }

  // ─── Room CRUD handlers ───────────────────────────────────────────────────

  function openNewRoomForm() {
    setEditingRoom(null);
    setRoomForm({ slug: "", name: "", description: "", type: "corridor", properties: [] });
    setShowRoomForm(true);
  }

  function openEditRoomForm(room: ZoneRoomDefinition) {
    setEditingRoom(room);
    setRoomForm({
      slug: room.slug, name: room.name, description: room.description,
      type: room.type, properties: room.properties || [],
    });
    setShowRoomForm(true);
  }

  async function handleSaveRoom() {
    if (!roomForm.slug || !roomForm.name) {
      setError("Room slug and name are required");
      return;
    }
    try {
      setError(null);
      if (editingRoom) {
        const updated = await updateRoom(editingRoom.id, roomForm);
        setRooms((prev) => prev.map((r) => r.id === editingRoom.id ? updated : r));
      } else if (zoneId) {
        const created = await createRoom(zoneId, roomForm);
        setRooms((prev) => [...prev, created]);
      }
      setShowRoomForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save room");
    }
  }

  async function handleDeleteRoom(roomId: string) {
    try {
      setError(null);
      await deleteRoom(roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete room");
    }
  }

  // ─── Exit CRUD handlers ───────────────────────────────────────────────────

  function openNewExitForm() {
    setExitForm({
      fromRoomSlug: rooms[0]?.slug || "", direction: "north",
      toRoomSlug: rooms[0]?.slug || "", targetZoneSlug: "", targetRoomSlug: "",
      locked: false, hidden: false,
    });
    setShowExitForm(true);
  }

  async function handleSaveExit() {
    if (!exitForm.fromRoomSlug || !exitForm.direction) {
      setError("From room and direction are required");
      return;
    }
    try {
      setError(null);
      if (zoneId) {
        const data: Record<string, unknown> = { ...exitForm };
        if (!data.targetZoneSlug) delete data.targetZoneSlug;
        if (!data.targetRoomSlug) delete data.targetRoomSlug;
        const created = await createExit(zoneId, data as Partial<ZoneExitDefinition>);
        setExits((prev) => [...prev, created]);

        // Create reverse exit for bidirectional pair
        const isInterZone = !!exitForm.targetZoneSlug;
        const opp = OPPOSITE[exitForm.direction];
        if (exitFormBidirectional && !isInterZone && opp) {
          const reverseData: Record<string, unknown> = {
            fromRoomSlug: exitForm.toRoomSlug,
            direction: opp,
            toRoomSlug: exitForm.fromRoomSlug,
            locked: false,
            hidden: false,
          };
          const reverseCreated = await createExit(zoneId, reverseData as Partial<ZoneExitDefinition>);
          setExits((prev) => [...prev, reverseCreated]);
        }
      }
      setShowExitForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save exit");
    }
  }

  async function handleDeleteExit(exitId: string) {
    try {
      setError(null);
      await deleteExit(exitId);
      setExits((prev) => prev.filter((e) => e.id !== exitId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete exit");
    }
  }

  async function handleAddReverse(exit: ZoneExitDefinition) {
    const opp = OPPOSITE[exit.direction];
    if (!opp || !zoneId) return;
    try {
      setError(null);
      const reverseData: Record<string, unknown> = {
        fromRoomSlug: exit.toRoomSlug,
        direction: opp,
        toRoomSlug: exit.fromRoomSlug,
        locked: false,
        hidden: false,
      };
      const created = await createExit(zoneId, reverseData as Partial<ZoneExitDefinition>);
      setExits((prev) => [...prev, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add reverse exit");
    }
  }

  async function handleDeletePair(pair: ExitPair) {
    try {
      setError(null);
      await deleteExit(pair.forward.id);
      if (pair.reverse) await deleteExit(pair.reverse.id);
      setExits((prev) => prev.filter((e) => e.id !== pair.forward.id && e.id !== pair.reverse?.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete exit pair");
    }
  }

  function togglePairExpanded(key: string) {
    setExpandedPairs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const updateField = (field: keyof ZoneDefinition, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addEntryRoom = () => {
    updateField("entryRoomSlugs", [...(formData.entryRoomSlugs || []), ""]);
  };

  const updateEntryRoom = (index: number, value: string) => {
    const updated = [...(formData.entryRoomSlugs || [])];
    updated[index] = value;
    updateField("entryRoomSlugs", updated);
  };

  const removeEntryRoom = (index: number) => {
    updateField("entryRoomSlugs", (formData.entryRoomSlugs || []).filter((_, i) => i !== index));
  };

  const toggleRoomProperty = (prop: string) => {
    const current = roomForm.properties;
    if (current.includes(prop)) {
      setRoomForm({ ...roomForm, properties: current.filter((p) => p !== prop) });
    } else {
      setRoomForm({ ...roomForm, properties: [...current, prop] });
    }
  };

  const tabs = [
    { id: "general" as Tab, label: "General" },
    { id: "designer" as Tab, label: "Designer" },
    { id: "rooms" as Tab, label: `Rooms (${rooms.length})` },
    { id: "exits" as Tab, label: `Exits (${exits.length})` },
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
          Loading zone...
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/zones" className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-[#C9A84C] text-xl">
            {isNew ? "New Zone" : formData.name || "Untitled Zone"}
          </h1>
          {error && (
            <span className="px-2 py-1 bg-[#8B2500] text-[#E8E0D0] text-xs rounded" style={{ fontFamily: "var(--font-sans)" }}>
              ⚠ {error}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 border border-[#8A8B95] hover:bg-[#1C1D27] text-[#8A8B95] hover:text-[#E8E0D0] rounded transition-colors flex items-center gap-2 disabled:opacity-50"
            style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2 disabled:opacity-50"
            style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
          >
            <Send className="w-4 h-4" />
            {saving ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-8 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-[#C9A84C] text-[#C9A84C]"
                : "border-transparent text-[#8A8B95] hover:text-[#E8E0D0]"
            }`}
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`flex-1 ${activeTab === "designer" ? "overflow-hidden relative" : "overflow-y-auto"}`}>
        <div className={activeTab === "designer" ? "h-full" : "p-8"}>
          <div className={activeTab === "designer" ? "h-full relative" : ""}>
            {/* ─── General Tab ──────────────────────────────────────────────── */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                  <h2 className="text-[#C9A84C] text-lg mb-4">
                    Basic Information
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#8A8B95] text-sm mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                          Slug (URL-safe)
                        </label>
                        <input
                          type="text"
                          value={formData.slug || ""}
                          onChange={(e) => updateField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-"))}
                          placeholder="e.g., flooded-crypt-tier1"
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-[#8A8B95] text-sm mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                          Name
                        </label>
                        <input
                          type="text"
                          value={formData.name || ""}
                          onChange={(e) => updateField("name", e.target.value)}
                          placeholder="e.g., The Flooded Crypt"
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                         
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#8A8B95] text-sm mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                        Description
                      </label>
                      <textarea
                        value={formData.description || ""}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Describe the zone..."
                        rows={3}
                        className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none resize-none"
                       
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[#8A8B95] text-sm mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                          Tier
                        </label>
                        <select
                          value={formData.tier || 1}
                          onChange={(e) => updateField("tier", parseInt(e.target.value))}
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {[1, 2, 3].map((t) => (
                            <option key={t} value={t}>Tier {t}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[#8A8B95] text-sm mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                          Theme
                        </label>
                        <select
                          value={formData.theme || "flooded_crypt"}
                          onChange={(e) => updateField("theme", e.target.value)}
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          {THEME_OPTIONS.map((b) => (
                            <option key={b} value={b}>{b.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[#8A8B95] text-sm mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                          Category
                        </label>
                        <select
                          value={formData.category || "dungeon"}
                          onChange={(e) => updateField("category", e.target.value)}
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          {CATEGORY_OPTIONS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[#8A8B95] text-sm mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                          Level Min
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formData.levelMin || 1}
                          onChange={(e) => updateField("levelMin", parseInt(e.target.value))}
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-[#8A8B95] text-sm mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                          Level Max
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formData.levelMax || 5}
                          onChange={(e) => updateField("levelMax", parseInt(e.target.value))}
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-[#8A8B95] text-sm mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                          Lifecycle
                        </label>
                        <select
                          value={formData.lifecycle || "persistent"}
                          onChange={(e) => updateField("lifecycle", e.target.value)}
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          {LIFECYCLE_OPTIONS.map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[#8A8B95] text-sm mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                          Max Players (0 = unlimited)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={formData.maxPlayers ?? 0}
                          onChange={(e) => updateField("maxPlayers", parseInt(e.target.value))}
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-[#8A8B95] text-sm mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                          Repop Interval (seconds)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={formData.repopIntervalSeconds ?? 300}
                          onChange={(e) => updateField("repopIntervalSeconds", parseInt(e.target.value))}
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: "var(--font-sans)" }}>
                          <input
                            type="checkbox"
                            checked={formData.pvpEnabled || false}
                            onChange={(e) => updateField("pvpEnabled", e.target.checked)}
                            className="accent-[#C9A84C]"
                          />
                          <span className="text-[#8A8B95] text-sm">PvP Enabled</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#8A8B95] text-sm mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                        Entry Room Slugs
                      </label>
                      <div className="space-y-2">
                        {(formData.entryRoomSlugs || []).map((slug, index) => (
                          <div key={index} className="flex gap-2">
                            <select
                              value={slug}
                              onChange={(e) => updateEntryRoom(index, e.target.value)}
                              className="flex-1 bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                              style={{ fontFamily: "var(--font-mono)" }}
                            >
                              <option value="">Select a room...</option>
                              {rooms.map((r) => (
                                <option key={r.slug} value={r.slug}>{r.slug} — {r.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeEntryRoom(index)}
                              className="text-[#8B2500] hover:text-[#E8E0D0] transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={addEntryRoom}
                          className="px-3 py-1.5 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          <Plus className="w-3 h-3" />
                          Add entry room
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Rooms Tab ───────────────────────────────────────────────── */}
            {activeTab === "rooms" && (
              <div className="space-y-6">
                <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[#C9A84C] text-lg">
                      Rooms
                    </h2>
                    {!isNew && (
                      <button
                        onClick={openNewRoomForm}
                        className="px-3 py-1.5 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2 text-sm"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        <Plus className="w-3 h-3" />
                        Add Room
                      </button>
                    )}
                  </div>

                  {isNew ? (
                    <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                      Save the zone first to add rooms.
                    </p>
                  ) : rooms.length === 0 ? (
                    <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                      No rooms yet. Add your first room to start building the zone layout.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded border border-[#2A2B35]">
                      <table className="w-full">
                        <thead className="bg-[#1C1D27] border-b border-[#2A2B35]">
                          <tr>
                            <th className="p-3 text-left text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>Slug</th>
                            <th className="p-3 text-left text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>Name</th>
                            <th className="p-3 text-left text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>Type</th>
                            <th className="p-3 text-left text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>Properties</th>
                            <th className="p-3 text-right text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rooms.map((room) => (
                            <tr key={room.id} className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors">
                              <td className="p-3">
                                <span className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-mono)" }}>{room.slug}</span>
                              </td>
                              <td className="p-3">
                                <span className="text-[#E8E0D0] text-sm">{room.name}</span>
                              </td>
                              <td className="p-3">
                                <span className="text-[#8A8B95] text-sm capitalize" style={{ fontFamily: "var(--font-sans)" }}>{room.type.replace(/_/g, " ")}</span>
                              </td>
                              <td className="p-3">
                                <span className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                                  {(room.properties || []).join(", ") || "—"}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => openEditRoomForm(room)} className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteRoom(room.id)} className="text-[#8A8B95] hover:text-[#8B2500] transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Room form modal */}
                  {showRoomForm && (
                    <div className="mt-4 bg-[#1C1D27] border border-[#2A2B35] rounded-lg p-6">
                      <h3 className="text-[#C9A84C] text-sm mb-4" style={{ fontFamily: "var(--font-sans)" }}>
                        {editingRoom ? "Edit Room" : "New Room"}
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>Slug</label>
                            <input
                              type="text"
                              value={roomForm.slug}
                              onChange={(e) => setRoomForm({ ...roomForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-") })}
                              placeholder="e.g., entrance-hall"
                              className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
                              style={{ fontFamily: "var(--font-mono)" }}
                            />
                          </div>
                          <div>
                            <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>Name</label>
                            <input
                              type="text"
                              value={roomForm.name}
                              onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                              placeholder="e.g., Entrance Hall"
                              className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
                             
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>Description</label>
                          <textarea
                            value={roomForm.description}
                            onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                            placeholder="Describe this room..."
                            rows={2}
                            className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none resize-none"
                           
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>Type</label>
                            <select
                              value={roomForm.type}
                              onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}
                              className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
                              style={{ fontFamily: "var(--font-sans)" }}
                            >
                              {ROOM_TYPE_OPTIONS.map((t) => (
                                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>Properties</label>
                            <div className="flex gap-3 pt-1">
                              {ROOM_PROPERTY_OPTIONS.map((prop) => (
                                <label key={prop} className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={roomForm.properties.includes(prop)}
                                    onChange={() => toggleRoomProperty(prop)}
                                    className="accent-[#C9A84C]"
                                  />
                                  <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-sans)" }}>{prop}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setShowRoomForm(false)}
                            className="px-3 py-1.5 border border-[#2A2B35] text-[#8A8B95] rounded transition-colors text-sm hover:bg-[#12131A]"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveRoom}
                            className="px-3 py-1.5 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors text-sm"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            {editingRoom ? "Update Room" : "Create Room"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Exits Tab ───────────────────────────────────────────────── */}
            {activeTab === "exits" && (
              <div className="space-y-6">
                <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[#C9A84C] text-lg">
                      Exits
                    </h2>
                    {!isNew && rooms.length > 0 && (
                      <button
                        onClick={openNewExitForm}
                        className="px-3 py-1.5 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2 text-sm"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        <Plus className="w-3 h-3" />
                        Add Exit
                      </button>
                    )}
                  </div>

                  {isNew ? (
                    <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                      Save the zone first to add exits.
                    </p>
                  ) : rooms.length === 0 ? (
                    <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                      Add rooms first before creating exits.
                    </p>
                  ) : exits.length === 0 ? (
                    <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                      No exits yet. Connect rooms by adding exits.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded border border-[#2A2B35]">
                      <table className="w-full">
                        <thead className="bg-[#1C1D27] border-b border-[#2A2B35]">
                          <tr>
                            <th className="p-3 w-8" />
                            <th className="p-3 text-left text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>Connection</th>
                            <th className="p-3 text-left text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>Directions</th>
                            <th className="p-3 text-left text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>Status</th>
                            <th className="p-3 text-right text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupExitsIntoPairs(exits).map((pair) => {
                            const isExpanded = expandedPairs.has(pair.key);
                            const isBidirectional = !!pair.reverse;
                            const roomA = pair.forward.fromRoomSlug;
                            const roomB = pair.forward.toRoomSlug;
                            const dirFwd = pair.forward.direction;
                            const dirRev = pair.reverse?.direction;

                            return (
                              <Fragment key={pair.key}>
                                {/* ── Pair summary row ── */}
                                <tr className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors">
                                  <td className="p-3 w-8">
                                    <button
                                      onClick={() => togglePairExpanded(pair.key)}
                                      className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
                                    >
                                      {isExpanded
                                        ? <ChevronDown className="w-4 h-4" />
                                        : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-mono)" }}>{roomA}</span>
                                      {isBidirectional ? (
                                        <ArrowRightLeft className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
                                      ) : (
                                        <ArrowRight className="w-4 h-4 text-[#8A8B95] flex-shrink-0" />
                                      )}
                                      <span className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-mono)" }}>{roomB}</span>
                                      {pair.isInterZone && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-[#1A2E2E] text-[#3A7D7B] text-[10px] rounded uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>
                                          inter-zone
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span className="text-[#C9A84C] text-sm capitalize" style={{ fontFamily: "var(--font-sans)" }}>
                                      {isBidirectional ? `${dirFwd} / ${dirRev}` : dirFwd}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2 text-xs">
                                      {pair.forward.locked && <span className="text-[#B8860B]" title={`${dirFwd}: locked`}>🔒</span>}
                                      {pair.forward.hidden && <span className="text-[#8A8B95]" title={`${dirFwd}: hidden`}>👁</span>}
                                      {pair.reverse?.locked && <span className="text-[#B8860B]" title={`${dirRev}: locked`}>🔒</span>}
                                      {pair.reverse?.hidden && <span className="text-[#8A8B95]" title={`${dirRev}: hidden`}>👁</span>}
                                      {!pair.forward.locked && !pair.forward.hidden && !pair.reverse?.locked && !pair.reverse?.hidden && (
                                        <span className="text-[#4A4B55]" style={{ fontFamily: "var(--font-sans)" }}>—</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex justify-end gap-2">
                                      {!isBidirectional && !pair.isInterZone && (
                                        <button
                                          onClick={() => handleAddReverse(pair.forward)}
                                          className="px-2 py-0.5 border border-[#3A7D7B] text-[#3A7D7B] rounded text-[10px] hover:bg-[#1A2E2E] transition-colors"
                                          style={{ fontFamily: "var(--font-sans)" }}
                                          title="Add reverse direction"
                                        >
                                          + reverse
                                        </button>
                                      )}
                                      <button onClick={() => handleDeletePair(pair)} className="text-[#8A8B95] hover:text-[#8B2500] transition-colors" title={isBidirectional ? "Delete pair" : "Delete exit"}>
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* ── Expanded individual exit rows ── */}
                                {isExpanded && (
                                  <>
                                    <tr className="bg-[#0E0F15] border-b border-[#2A2B35]">
                                      <td className="p-2 pl-8" colSpan={2}>
                                        <div className="flex items-center gap-2">
                                          <ArrowRight className="w-3 h-3 text-[#C9A84C]" />
                                          <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                                            {pair.forward.fromRoomSlug}
                                          </span>
                                          <span className="text-[#C9A84C] text-xs capitalize" style={{ fontFamily: "var(--font-sans)" }}>
                                            {pair.forward.direction}
                                          </span>
                                          <span className="text-[#4A4B55] text-xs">→</span>
                                          <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                                            {pair.forward.toRoomSlug}
                                          </span>
                                          {pair.isInterZone && pair.forward.targetZoneSlug && (
                                            <span className="text-[#3A7D7B] text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                                              → {pair.forward.targetZoneSlug}/{pair.forward.targetRoomSlug}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-2">
                                        <span className="text-[#8A8B95] text-xs capitalize" style={{ fontFamily: "var(--font-sans)" }}>{pair.forward.direction}</span>
                                      </td>
                                      <td className="p-2">
                                        <div className="flex items-center gap-2 text-xs">
                                          {pair.forward.locked && <span className="text-[#B8860B]">🔒 locked</span>}
                                          {pair.forward.hidden && <span className="text-[#8A8B95]">👁 hidden</span>}
                                          {!pair.forward.locked && !pair.forward.hidden && <span className="text-[#4A4B55]">open</span>}
                                        </div>
                                      </td>
                                      <td className="p-2 text-right">
                                        <button onClick={() => handleDeleteExit(pair.forward.id)} className="text-[#8A8B95] hover:text-[#8B2500] transition-colors" title="Delete this direction only">
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </td>
                                    </tr>

                                    {pair.reverse && (
                                      <tr className="bg-[#0E0F15] border-b border-[#2A2B35]">
                                        <td className="p-2 pl-8" colSpan={2}>
                                          <div className="flex items-center gap-2">
                                            <ArrowRight className="w-3 h-3 text-[#C9A84C]" />
                                            <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                                              {pair.reverse.fromRoomSlug}
                                            </span>
                                            <span className="text-[#C9A84C] text-xs capitalize" style={{ fontFamily: "var(--font-sans)" }}>
                                              {pair.reverse.direction}
                                            </span>
                                            <span className="text-[#4A4B55] text-xs">→</span>
                                            <span className="text-[#8A8B95] text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                                              {pair.reverse.toRoomSlug}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="p-2">
                                          <span className="text-[#8A8B95] text-xs capitalize" style={{ fontFamily: "var(--font-sans)" }}>{pair.reverse.direction}</span>
                                        </td>
                                        <td className="p-2">
                                          <div className="flex items-center gap-2 text-xs">
                                            {pair.reverse.locked && <span className="text-[#B8860B]">🔒 locked</span>}
                                            {pair.reverse.hidden && <span className="text-[#8A8B95]">👁 hidden</span>}
                                            {!pair.reverse.locked && !pair.reverse.hidden && <span className="text-[#4A4B55]">open</span>}
                                          </div>
                                        </td>
                                        <td className="p-2 text-right">
                                          <button onClick={() => handleDeleteExit(pair.reverse!.id)} className="text-[#8A8B95] hover:text-[#8B2500] transition-colors" title="Delete this direction only">
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Exit form */}
                  {showExitForm && (
                    <div className="mt-4 bg-[#1C1D27] border border-[#2A2B35] rounded-lg p-6">
                      <h3 className="text-[#C9A84C] text-sm mb-4" style={{ fontFamily: "var(--font-sans)" }}>
                        New Exit
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>From Room</label>
                            <select
                              value={exitForm.fromRoomSlug}
                              onChange={(e) => setExitForm({ ...exitForm, fromRoomSlug: e.target.value })}
                              className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
                              style={{ fontFamily: "var(--font-mono)" }}
                            >
                              {rooms.map((r) => (
                                <option key={r.slug} value={r.slug}>{r.slug}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>Direction</label>
                            <select
                              value={exitForm.direction}
                              onChange={(e) => setExitForm({ ...exitForm, direction: e.target.value })}
                              className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
                              style={{ fontFamily: "var(--font-sans)" }}
                            >
                              {DIRECTION_OPTIONS.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>To Room</label>
                            <select
                              value={exitForm.toRoomSlug}
                              onChange={(e) => setExitForm({ ...exitForm, toRoomSlug: e.target.value })}
                              className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
                              style={{ fontFamily: "var(--font-mono)" }}
                            >
                              {rooms.map((r) => (
                                <option key={r.slug} value={r.slug}>{r.slug}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                              Target Zone Slug (inter-zone, optional)
                            </label>
                            <input
                              type="text"
                              value={exitForm.targetZoneSlug}
                              onChange={(e) => setExitForm({ ...exitForm, targetZoneSlug: e.target.value })}
                              placeholder="e.g., the-reliquary"
                              className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
                              style={{ fontFamily: "var(--font-mono)" }}
                            />
                          </div>
                          <div>
                            <label className="block text-[#8A8B95] text-xs mb-1" style={{ fontFamily: "var(--font-sans)" }}>
                              Target Room Slug (inter-zone, optional)
                            </label>
                            <input
                              type="text"
                              value={exitForm.targetRoomSlug}
                              onChange={(e) => setExitForm({ ...exitForm, targetRoomSlug: e.target.value })}
                              placeholder="e.g., plaza"
                              className="w-full bg-[#12131A] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
                              style={{ fontFamily: "var(--font-mono)" }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={exitForm.locked}
                              onChange={(e) => setExitForm({ ...exitForm, locked: e.target.checked })}
                              className="accent-[#C9A84C]"
                            />
                            <span className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>Locked</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={exitForm.hidden}
                              onChange={(e) => setExitForm({ ...exitForm, hidden: e.target.checked })}
                              className="accent-[#C9A84C]"
                            />
                            <span className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>Hidden</span>
                          </label>
                          {!exitForm.targetZoneSlug && (
                            <label className="flex items-center gap-2 cursor-pointer ml-4 pl-4 border-l border-[#2A2B35]">
                              <input
                                type="checkbox"
                                checked={exitFormBidirectional}
                                onChange={(e) => setExitFormBidirectional(e.target.checked)}
                                className="accent-[#C9A84C]"
                              />
                              <span className="text-[#C9A84C] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                                Create pair (bidirectional)
                              </span>
                            </label>
                          )}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setShowExitForm(false)}
                            className="px-3 py-1.5 border border-[#2A2B35] text-[#8A8B95] rounded transition-colors text-sm hover:bg-[#12131A]"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveExit}
                            className="px-3 py-1.5 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors text-sm"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            {exitFormBidirectional && !exitForm.targetZoneSlug ? "Create Pair" : "Create Exit"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Designer Tab ─────────────────────────────────────────────── */}
            {activeTab === "designer" && (
              <div className="absolute inset-0">
                <ZoneDesigner
                  zone={formData as ZoneDefinition}
                  rooms={rooms}
                  exits={exits}
                  zoneId={zoneId}
                  onZoneChanged={() => {
                    if (slug && !isNew) loadZone(slug);
                  }}
                />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
