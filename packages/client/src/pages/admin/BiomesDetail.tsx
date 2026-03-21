import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Save, Send, Plus, X } from "lucide-react";

type Tab = "overview" | "room-names" | "room-descriptions" | "loot" | "hazards";

export default function BiomesDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [formData, setFormData] = useState({
    type: "flooded_crypt",
    name: "Flooded Crypt",
    flavour: "Ancient tombs drowned by rising waters. The dead do not rest easy here.",
    signatureCreature: "drowned_revenant",
    signatureHazard: "Rising Waters",
    ambientSounds: ["dripping water", "distant groaning", "echoing footsteps"],
    lightLevelMin: 0.1,
    lightLevelMax: 0.3,
  });

  const [roomNames, setRoomNames] = useState({
    entry: ["Drowned Vestibule", "Sunken Threshold", "Waterlogged Gate"],
    extraction: ["Crumbling Altar", "Flooded Ossuary"],
    boss: ["Drowned Cathedral"],
    corridor: ["Flooded Passage", "Submerged Hall", "Waterlogged Tunnel"],
    junction: ["Tidal Crossing", "Drowned Nexus"],
    dead_end: ["Sealed Tomb", "Collapsed Chamber", "Forgotten Vault"],
  });

  const tabs = [
    { id: "overview" as Tab, label: "Overview" },
    { id: "room-names" as Tab, label: "Room Names" },
    { id: "room-descriptions" as Tab, label: "Room Descriptions" },
    { id: "loot" as Tab, label: "Loot Table" },
    { id: "hazards" as Tab, label: "Hazards" },
  ];

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addRoomName = (roomType: string) => {
    setRoomNames((prev) => ({
      ...prev,
      [roomType]: [...prev[roomType as keyof typeof prev], ""],
    }));
  };

  const removeRoomName = (roomType: string, index: number) => {
    setRoomNames((prev) => ({
      ...prev,
      [roomType]: prev[roomType as keyof typeof prev].filter((_, i) => i !== index),
    }));
  };

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
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {isNew ? "New Biome" : formData.name}
          </h1>
          {!isNew && (
            <span
              className="px-2 py-1 bg-[#2D6B4F] text-[#E8E0D0] text-xs rounded"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              ✅ Published v1
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 border border-[#8A8B95] hover:bg-[#1C1D27] text-[#8A8B95] hover:text-[#E8E0D0] rounded transition-colors flex items-center gap-2"
            style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2"
            style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
          >
            <Send className="w-4 h-4" />
            Submit Review
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
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    Basic Information
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label
                        className="block text-[#8A8B95] text-sm mb-2"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Type (slug)
                      </label>
                      <input
                        type="text"
                        value={formData.type}
                        onChange={(e) => updateField("type", e.target.value)}
                        disabled={!isNew}
                        className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none disabled:opacity-50"
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[#8A8B95] text-sm mb-2"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                        style={{ fontFamily: "var(--font-serif)" }}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[#8A8B95] text-sm mb-2"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Flavour Text
                      </label>
                      <textarea
                        value={formData.flavour}
                        onChange={(e) => updateField("flavour", e.target.value)}
                        rows={3}
                        className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none resize-none"
                        style={{ fontFamily: "var(--font-serif)" }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          className="block text-[#8A8B95] text-sm mb-2"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          Signature Creature
                        </label>
                        <select
                          value={formData.signatureCreature}
                          onChange={(e) => updateField("signatureCreature", e.target.value)}
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-serif)" }}
                        >
                          <option value="drowned_revenant">Drowned Revenant</option>
                        </select>
                      </div>
                      <div>
                        <label
                          className="block text-[#8A8B95] text-sm mb-2"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          Signature Hazard
                        </label>
                        <input
                          type="text"
                          value={formData.signatureHazard}
                          onChange={(e) => updateField("signatureHazard", e.target.value)}
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                          style={{ fontFamily: "var(--font-sans)" }}
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        className="block text-[#8A8B95] text-sm mb-2"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Light Level Range
                      </label>
                      <div className="flex gap-4 items-center">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={formData.lightLevelMin}
                          onChange={(e) => updateField("lightLevelMin", parseFloat(e.target.value))}
                          className="flex-1"
                        />
                        <span
                          className="text-[#8A8B95] text-sm"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {formData.lightLevelMin} – {formData.lightLevelMax}
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={formData.lightLevelMax}
                          onChange={(e) => updateField("lightLevelMax", parseFloat(e.target.value))}
                          className="flex-1"
                        />
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
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Room Names by Type
                </h2>
                <div className="space-y-4">
                  {Object.entries(roomNames).map(([roomType, names]) => (
                    <div key={roomType}>
                      <h3
                        className="text-[#E8E0D0] text-sm mb-2 capitalize"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        {roomType.replace("_", " ")} ({names.length} names)
                      </h3>
                      <div className="space-y-2">
                        {names.map((name, index) => (
                          <div key={index} className="flex gap-2">
                            <input
                              type="text"
                              value={name}
                              className="flex-1 bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                              style={{ fontFamily: "var(--font-serif)" }}
                            />
                            <button
                              onClick={() => removeRoomName(roomType, index)}
                              className="text-[#8B2500] hover:text-[#E8E0D0] transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addRoomName(roomType)}
                          className="px-3 py-1.5 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          <Plus className="w-3 h-3" />
                          Add name
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "room-descriptions" && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <h2
                  className="text-[#C9A84C] text-lg mb-4"
                  style={{ fontFamily: "var(--font-serif)" }}
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
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Biome Loot Table
                </h2>
                <p
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Loot table editor coming soon...
                </p>
              </div>
            )}

            {activeTab === "hazards" && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <h2
                  className="text-[#C9A84C] text-lg mb-4"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Hazard Templates
                </h2>
                <p
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Hazards editor coming soon...
                </p>
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
                style={{ fontFamily: "var(--font-serif)", color: "#E8E0D0" }}
              >
                <div className="text-[#C9A84C] text-lg mb-2">{formData.name}</div>
                <p className="text-[#8A8B95] text-xs">{formData.flavour}</p>
                <div className="border-t border-[#2A2B35] my-2"></div>
                <div className="text-xs">
                  <div>Signature Creature: Drowned Revenant</div>
                  <div>Signature Hazard: {formData.signatureHazard}</div>
                  <div>Light: {formData.lightLevelMin}–{formData.lightLevelMax}</div>
                </div>
              </div>
            </div>

            <div className="bg-[#2D6B4F] border border-[#256B4A] rounded-lg p-4">
              <p
                className="text-[#E8E0D0] text-sm flex items-center gap-2"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <span>✅</span>
                <span>All fields valid</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
