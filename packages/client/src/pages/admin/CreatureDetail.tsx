import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Save, Send, X, Plus } from "lucide-react";

interface LootEntry {
  itemId: string;
  itemName: string;
  weight: number;
}

export default function CreatureDetail() {
  const { id } = useParams();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    type: "drowned_revenant",
    name: "Drowned Revenant",
    description:
      "A waterlogged corpse risen from the crypts below. Its pale flesh hangs in tatters, and dark water streams from its mouth and eyes.",
    behavior: "guardian",
    maxHp: 50,
    attack: 10,
    defence: 3,
    armour: 3,
    minCount: 3,
    maxCount: 5,
    preferredRooms: ["corridor", "dead_end"],
    forbiddenRooms: ["entry", "extraction"],
    idleTicksMin: 3,
    idleTicksMax: 5,
    fleeThreshold: 0.25,
    biomeAffinity: ["flooded_crypt"],
    tierMin: 1,
    tierMax: 3,
  });

  const [lootTable, setLootTable] = useState<LootEntry[]>([
    { itemId: "waterlogged_bone", itemName: "Waterlogged Bone", weight: 60 },
    { itemId: "revenant_essence", itemName: "Revenant Essence", weight: 40 },
  ]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addLootEntry = () => {
    setLootTable([
      ...lootTable,
      { itemId: "", itemName: "Select Item", weight: 50 },
    ]);
  };

  const removeLootEntry = (index: number) => {
    setLootTable(lootTable.filter((_, i) => i !== index));
  };

  const updateLootEntry = (
    index: number,
    field: keyof LootEntry,
    value: any
  ) => {
    const updated = [...lootTable];
    updated[index] = { ...updated[index], [field]: value };
    setLootTable(updated);
  };

  // Calculate loot probabilities
  const totalWeight = lootTable.reduce((sum, entry) => sum + entry.weight, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/creatures"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-[#C9A84C] text-xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {isNew ? "New Creature" : formData.name}
          </h1>
          {!isNew && (
            <span
              className="px-2 py-1 bg-[#2D6B4F] text-[#E8E0D0] text-xs rounded"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              ✅ Published v3
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

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-6 p-8">
          {/* Left Column - Editor Form */}
          <div className="col-span-2 space-y-6">
            {/* Identity Section */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Identity
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
                    Name
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
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    rows={4}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none resize-none"
                    style={{ fontFamily: "var(--font-serif)" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Behavior Archetype
                  </label>
                  <select
                    value={formData.behavior}
                    onChange={(e) => updateField("behavior", e.target.value)}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <option value="berserker">Berserker</option>
                    <option value="skulker">Skulker</option>
                    <option value="guardian">Guardian</option>
                    <option value="patrol">Patrol</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Combat Stats */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Combat Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Max HP
                  </label>
                  <input
                    type="number"
                    value={formData.maxHp}
                    onChange={(e) =>
                      updateField("maxHp", parseInt(e.target.value))
                    }
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                  <p
                    className="text-[#4A4B55] text-xs mt-1"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Typical Tier 1 range: 30–80 HP
                  </p>
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Attack
                  </label>
                  <input
                    type="number"
                    value={formData.attack}
                    onChange={(e) =>
                      updateField("attack", parseInt(e.target.value))
                    }
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Defence
                  </label>
                  <input
                    type="number"
                    value={formData.defence}
                    onChange={(e) =>
                      updateField("defence", parseInt(e.target.value))
                    }
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Armour
                  </label>
                  <input
                    type="number"
                    value={formData.armour}
                    onChange={(e) =>
                      updateField("armour", parseInt(e.target.value))
                    }
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>
            </div>

            {/* Loot Table */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Loot Table
              </h2>
              <div className="space-y-3">
                {lootTable.map((entry, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <select
                        value={entry.itemId}
                        onChange={(e) =>
                          updateLootEntry(index, "itemId", e.target.value)
                        }
                        className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        <option>{entry.itemName}</option>
                      </select>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={entry.weight}
                        onChange={(e) =>
                          updateLootEntry(
                            index,
                            "weight",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                    <div className="w-20 text-right">
                      <span
                        className="text-[#8A8B95] text-sm"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {((entry.weight / totalWeight) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <button
                      onClick={() => removeLootEntry(index)}
                      className="text-[#8B2500] hover:text-[#E8E0D0] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addLootEntry}
                  className="px-3 py-2 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <Plus className="w-4 h-4" />
                  Add Loot Entry
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Preview & Context */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Preview
              </h3>
              <div
                className="bg-[#1C1D27] rounded p-4 text-sm space-y-2"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <div className="text-[#E8E0D0]">
                  HP: {formData.maxHp} | ATK: {formData.attack}
                </div>
                <div className="text-[#E8E0D0]">
                  DEF: {formData.defence} | ARM: {formData.armour}
                </div>
                <div className="border-t border-[#2A2B35] my-2"></div>
                <div className="text-[#8A8B95]">
                  Flee at: {formData.fleeThreshold * 100}% HP
                </div>
                <div className="text-[#8A8B95]">
                  Tier: {formData.tierMin}-{formData.tierMax}
                </div>
              </div>
            </div>

            {/* Loot Simulation */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Loot Simulation
              </h3>
              <div className="space-y-2">
                {lootTable.map((entry, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span
                      className="text-[#8A8B95]"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {entry.itemName}
                    </span>
                    <span
                      className="text-[#E8E0D0]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {((entry.weight / totalWeight) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
              <button
                className="mt-4 w-full px-3 py-2 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors text-sm"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Re-roll Simulation
              </button>
            </div>

            {/* Version History */}
            {!isNew && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <h3
                  className="text-[#C9A84C] text-sm mb-4"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Version History
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-[#1C1D27] rounded">
                    <p
                      className="text-[#E8E0D0]"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      v3 (current) - Published
                    </p>
                    <p
                      className="text-[#8A8B95] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Jane, 2h ago
                    </p>
                  </div>
                  <div className="p-2 hover:bg-[#1C1D27] rounded cursor-pointer">
                    <p
                      className="text-[#8A8B95]"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      v2
                    </p>
                    <p
                      className="text-[#4A4B55] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Jane, 1d ago
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Validation */}
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
