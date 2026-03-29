import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Save, Send, Plus, X } from "lucide-react";
import { getEntity, createEntity, updateEntity } from "../../lib/admin-api";

type Tab = "overview" | "room-names" | "room-descriptions" | "loot" | "hazards";

interface Biome {
  id: string;
  name: string;
  description: string;
  tier: number;
  features: string[];
  hazardTypes: string[];
  roomProperties: string[];
  narrationHints: string[];
}

export default function BiomesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Biome>>({
    name: "",
    description: "",
    tier: 1,
    features: [],
    hazardTypes: [],
    roomProperties: [],
    narrationHints: [],
  });

  useEffect(() => {
    if (!isNew && id) {
      loadBiome(id);
    }
  }, [id, isNew]);

  async function loadBiome(biomeId: string) {
    try {
      setLoading(true);
      setError(null);
      const data = await getEntity<Biome>("biomes", biomeId);
      setFormData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load biome");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    // Prevent saving invalid data
    if (!formData.name || !formData.description) {
      setError("Name and description are required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isNew) {
        const created = await createEntity<Biome>("biomes", formData);
        navigate(`/admin/biomes/${created.id}`);
      } else if (id) {
        await updateEntity<Biome>("biomes", id, formData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save biome");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    // Prevent submitting invalid data
    if (!formData.name || !formData.description) {
      setError("Name and description are required");
      return;
    }

    // For now, just save - in future could trigger review workflow
    await handleSave();
  }

  const tabs = [
    { id: "overview" as Tab, label: "Overview" },
    { id: "room-names" as Tab, label: "Room Names" },
    { id: "room-descriptions" as Tab, label: "Room Descriptions" },
    { id: "loot" as Tab, label: "Loot Table" },
    { id: "hazards" as Tab, label: "Hazards" },
  ];

  const updateField = (field: keyof Biome, value: string | number | boolean | string[] | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addArrayItem = (field: keyof Biome) => {
    const current = formData[field] as string[];
    updateField(field, [...(current || []), ""]);
  };

  const updateArrayItem = (field: keyof Biome, index: number, value: string) => {
    const current = formData[field] as string[];
    const updated = [...(current || [])];
    updated[index] = value;
    updateField(field, updated);
  };

  const removeArrayItem = (field: keyof Biome, index: number) => {
    const current = formData[field] as string[];
    updateField(field, (current || []).filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p
          className="text-[#8A8B95] text-sm"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Loading biome...
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/biomes"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-[#C9A84C] text-xl"
           
          >
            {isNew ? "New Biome" : formData.name || "Untitled Biome"}
          </h1>
          {error && (
            <span
              className="px-2 py-1 bg-[#8B2500] text-[#E8E0D0] text-xs rounded"
              style={{ fontFamily: "var(--font-sans)" }}
            >
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
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                  <h2
                    className="text-[#C9A84C] text-lg mb-4"
                   
                  >
                    Basic Information
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label
                        className="block text-[#8A8B95] text-sm mb-2"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Biome Name
                      </label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="e.g., Flooded Crypt"
                        className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                       
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[#8A8B95] text-sm mb-2"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Description
                      </label>
                      <textarea
                        value={formData.description || ""}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Describe the biome's atmosphere and characteristics..."
                        rows={3}
                        className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none resize-none"
                       
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[#8A8B95] text-sm mb-2"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Tier
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.tier || 1}
                        onChange={(e) => updateField("tier", parseInt(e.target.value))}
                        className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[#8A8B95] text-sm mb-2"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Features
                      </label>
                      <div className="space-y-2">
                        {(formData.features || []).map((feature, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={feature}
                              onChange={(e) => updateArrayItem("features", index, e.target.value)}
                              placeholder="e.g., flooded floors, crumbling walls"
                              className="flex-1 bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                              style={{ fontFamily: "var(--font-sans)" }}
                            />
                            <button
                              onClick={() => removeArrayItem("features", index)}
                              className="text-[#8B2500] hover:text-[#E8E0D0] transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addArrayItem("features")}
                          className="px-3 py-1.5 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          <Plus className="w-3 h-3" />
                          Add feature
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "room-names" && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <h2
                  className="text-[#C9A84C] text-lg mb-4"
                 
                >
                  Room Properties
                </h2>
                <div className="space-y-4">
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Room Properties (descriptors for room generation)
                    </label>
                    <div className="space-y-2">
                      {(formData.roomProperties || []).map((prop, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={prop}
                            onChange={(e) => updateArrayItem("roomProperties", index, e.target.value)}
                            placeholder="e.g., waterlogged, unstable, ancient"
                            className="flex-1 bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                            style={{ fontFamily: "var(--font-sans)" }}
                          />
                          <button
                            onClick={() => removeArrayItem("roomProperties", index)}
                            className="text-[#8B2500] hover:text-[#E8E0D0] transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addArrayItem("roomProperties")}
                        className="px-3 py-1.5 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        <Plus className="w-3 h-3" />
                        Add property
                      </button>
                    </div>
                  </div>
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Narration Hints
                    </label>
                    <div className="space-y-2">
                      {(formData.narrationHints || []).map((hint, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={hint}
                            onChange={(e) => updateArrayItem("narrationHints", index, e.target.value)}
                            placeholder="e.g., emphasize dampness, mention echoes"
                            className="flex-1 bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                            style={{ fontFamily: "var(--font-sans)" }}
                          />
                          <button
                            onClick={() => removeArrayItem("narrationHints", index)}
                            className="text-[#8B2500] hover:text-[#E8E0D0] transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addArrayItem("narrationHints")}
                        className="px-3 py-1.5 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        <Plus className="w-3 h-3" />
                        Add hint
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "room-descriptions" && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <h2
                  className="text-[#C9A84C] text-lg mb-4"
                 
                >
                  Room Description Templates
                </h2>
                <p
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Room description templates coming soon...
                </p>
              </div>
            )}

            {activeTab === "loot" && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <h2
                  className="text-[#C9A84C] text-lg mb-4"
                 
                >
                  Biome Loot Table
                </h2>
                <p
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Coming soon...
                </p>
              </div>
            )}

            {activeTab === "hazards" && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <h2
                  className="text-[#C9A84C] text-lg mb-4"
                 
                >
                  Hazard Types
                </h2>
                <div className="space-y-4 mb-4">
                  <label
                    className="block text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Hazard Types
                  </label>
                  <div className="space-y-2">
                    {(formData.hazardTypes || []).map((hazard, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={hazard}
                          onChange={(e) => updateArrayItem("hazardTypes", index, e.target.value)}
                          placeholder="e.g., rising_water, collapsing_ceiling"
                          className="flex-1 bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                        <button
                          onClick={() => removeArrayItem("hazardTypes", index)}
                          className="text-[#8B2500] hover:text-[#E8E0D0] transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addArrayItem("hazardTypes")}
                      className="px-3 py-1.5 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      <Plus className="w-3 h-3" />
                      Add hazard type
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Preview
              </h3>
              <div
                className="bg-[#1C1D27] rounded p-4 text-sm space-y-2"
                style={{ color: "#E8E0D0" }}
              >
                <div className="text-[#C9A84C] text-lg mb-2">
                  {formData.name || "Untitled Biome"}
                </div>
                <p className="text-[#8A8B95] text-xs">
                  {formData.description || "No description"}
                </p>
                <div className="border-t border-[#2A2B35] my-2"></div>
                <div className="text-xs">
                  <div>Tier: {formData.tier || 1}</div>
                  <div>Features: {(formData.features || []).length}</div>
                  <div>Hazards: {(formData.hazardTypes || []).length}</div>
                </div>
              </div>
            </div>

            {!error && formData.name && formData.description && (
              <div className="bg-[#2D6B4F] border border-[#256B4A] rounded-lg p-4">
                <p
                  className="text-[#E8E0D0] text-sm flex items-center gap-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <span>✅</span>
                  <span>Ready to save</span>
                </p>
              </div>
            )}
            {(!formData.name || !formData.description) && (
              <div className="bg-[#8B2500] border border-[#A02900] rounded-lg p-4">
                <p
                  className="text-[#E8E0D0] text-sm flex items-center gap-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <span>⚠</span>
                  <span>Name and description required</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
