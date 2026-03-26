import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Save, Send, Plus, X, Trash2, Edit2 } from "lucide-react";
import {
  getZone, createZone, updateZone,
  createRoom, updateRoom, deleteRoom,
  createExit, deleteExit,
  type ZoneDefinition, type ZoneRoomDefinition, type ZoneExitDefinition,
} from "../../lib/zone-api";

type Tab = "general" | "rooms" | "exits";

const BIOME_OPTIONS = [
  "flooded_crypt", "shattered_bastion", "fungal_deep", "ashen_reach", "void_rift",
];
const LIFECYCLE_OPTIONS = ["persistent", "scheduled", "event"] as const;
const CATEGORY_OPTIONS = ["hub", "dungeon", "wilderness", "social"] as const;
const ROOM_TYPE_OPTIONS = ["entry", "corridor", "junction", "dead_end", "extraction", "boss"];
const DIRECTION_OPTIONS = ["north", "south", "east", "west", "up", "down"];
const ROOM_PROPERTY_OPTIONS = ["heavy_door", "cavern", "water"];

export default function ZonesDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isNew = slug === "new";
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<ZoneDefinition>>({
    slug: "",
    name: "",
    description: "",
    tier: 1,
    biome: "flooded_crypt",
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
          <h1 className="text-[#C9A84C] text-xl" style={{ fontFamily: "var(--font-serif)" }}>
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

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-6 p-8">
          {/* Left Column */}
          <div className="col-span-2">
            {/* ─── General Tab ──────────────────────────────────────────────── */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                  <h2 className="text-[#C9A84C] text-lg mb-4" style={{ fontFamily: "var(--font-serif)" }}>
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
                          style={{ fontFamily: "var(--font-serif)" }}
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
                        style={{ fontFamily: "var(--font-serif)" }}
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
                          Biome
                        </label>
                        <select
                          value={formData.biome || "flooded_crypt"}
                          onChange={(e) => updateField("biome", e.target.value)}
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          {BIOME_OPTIONS.map((b) => (
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
                    <h2 className="text-[#C9A84C] text-lg" style={{ fontFamily: "var(--font-serif)" }}>
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
                                <span className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-serif)" }}>{room.name}</span>
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
                              style={{ fontFamily: "var(--font-serif)" }}
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
                            style={{ fontFamily: "var(--font-serif)" }}
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
                    <h2 className="text-[#C9A84C] text-lg" style={{ fontFamily: "var(--font-serif)" }}>
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
                            <th className="p-3 text-left text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>From Room</th>
                            <th className="p-3 text-left text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>Direction</th>
                            <th className="p-3 text-left text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>To Room</th>
                            <th className="p-3 text-left text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>Inter-Zone Target</th>
                            <th className="p-3 text-right text-[#8A8B95] text-xs uppercase tracking-wider" style={{ fontFamily: "var(--font-sans)" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exits.map((exit) => (
                            <tr key={exit.id} className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors">
                              <td className="p-3">
                                <span className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-mono)" }}>{exit.fromRoomSlug}</span>
                              </td>
                              <td className="p-3">
                                <span className="text-[#C9A84C] text-sm capitalize" style={{ fontFamily: "var(--font-sans)" }}>{exit.direction}</span>
                              </td>
                              <td className="p-3">
                                <span className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-mono)" }}>{exit.toRoomSlug}</span>
                              </td>
                              <td className="p-3">
                                {exit.targetZoneSlug ? (
                                  <span className="text-[#3A7D7B] text-sm" style={{ fontFamily: "var(--font-mono)" }}>
                                    {exit.targetZoneSlug}/{exit.targetRoomSlug}
                                  </span>
                                ) : (
                                  <span className="text-[#4A4B55] text-sm" style={{ fontFamily: "var(--font-sans)" }}>—</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex justify-end gap-2">
                                  {exit.locked && <span className="text-[#B8860B] text-xs" title="Locked">🔒</span>}
                                  {exit.hidden && <span className="text-[#8A8B95] text-xs" title="Hidden">👁</span>}
                                  <button onClick={() => handleDeleteExit(exit.id)} className="text-[#8A8B95] hover:text-[#8B2500] transition-colors">
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
                              placeholder="e.g., refuge"
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
                            Create Exit
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column — Preview */}
          <div className="space-y-6">
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3 className="text-[#C9A84C] text-sm mb-4" style={{ fontFamily: "var(--font-sans)" }}>
                Preview
              </h3>
              <div
                className="bg-[#1C1D27] rounded p-4 text-sm space-y-2"
                style={{ fontFamily: "var(--font-serif)", color: "#E8E0D0" }}
              >
                <div className="text-[#C9A84C] text-lg mb-2">
                  {formData.name || "Untitled Zone"}
                </div>
                <p className="text-[#8A8B95] text-xs">
                  {formData.description || "No description"}
                </p>
                <div className="border-t border-[#2A2B35] my-2"></div>
                <div className="text-xs space-y-1">
                  <div>Slug: <span className="text-[#8A8B95]" style={{ fontFamily: "var(--font-mono)" }}>{formData.slug || "—"}</span></div>
                  <div>Tier: {formData.tier || 1}</div>
                  <div>Biome: <span className="capitalize">{(formData.biome || "—").replace(/_/g, " ")}</span></div>
                  <div>Levels: {formData.levelMin || 1}–{formData.levelMax || 5}</div>
                  <div>Category: <span className="capitalize">{formData.category || "—"}</span></div>
                  <div>Lifecycle: <span className="capitalize">{formData.lifecycle || "—"}</span></div>
                  <div>PvP: {formData.pvpEnabled ? "Yes" : "No"}</div>
                  <div>Rooms: {rooms.length}</div>
                  <div>Exits: {exits.length}</div>
                </div>
              </div>
            </div>

            {!error && formData.name && formData.slug && (
              <div className="bg-[#2D6B4F] border border-[#256B4A] rounded-lg p-4">
                <p className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                  ✓ Zone ready to save
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
