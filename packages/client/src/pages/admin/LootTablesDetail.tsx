import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Save, Send, Plus, X, Dice6 } from "lucide-react";

type SourceType = "creature" | "chest" | "boss" | "quest" | "event" | "biome";

interface LootEntry {
  itemId: string;
  itemName: string;
  tier: string;
  weight: number;
  minQuantity: number;
  maxQuantity: number;
  guaranteed: boolean;
}

export default function LootTablesDetail() {
  const { id } = useParams();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    slug: "drowned_revenant_loot",
    displayName: "Drowned Revenant",
    description: "Loot dropped by Drowned Revenants in the Flooded Crypt.",
    sourceType: "creature" as SourceType,
    sourceEntity: "drowned_revenant",
    // Drop settings
    minDrops: 1,
    maxDrops: 3,
    dropChance: 0.85,
    // Conditions
    requiresKillingBlow: false,
    scalesWithLuck: true,
  });

  const [lootEntries, setLootEntries] = useState<LootEntry[]>([
    {
      itemId: "rusty_sword",
      itemName: "Rusty Sword",
      tier: "common",
      weight: 30,
      minQuantity: 1,
      maxQuantity: 1,
      guaranteed: false,
    },
    {
      itemId: "waterlogged_leather",
      itemName: "Waterlogged Leather",
      tier: "common",
      weight: 25,
      minQuantity: 1,
      maxQuantity: 3,
      guaranteed: false,
    },
    {
      itemId: "ancient_coin",
      itemName: "Ancient Coin",
      tier: "common",
      weight: 20,
      minQuantity: 5,
      maxQuantity: 15,
      guaranteed: true,
    },
    {
      itemId: "drowned_essence",
      itemName: "Drowned Essence",
      tier: "sturdy",
      weight: 15,
      minQuantity: 1,
      maxQuantity: 2,
      guaranteed: false,
    },
    {
      itemId: "revenant_blade",
      itemName: "Revenant Blade",
      tier: "refined",
      weight: 8,
      minQuantity: 1,
      maxQuantity: 1,
      guaranteed: false,
    },
    {
      itemId: "cursed_amulet",
      itemName: "Cursed Amulet",
      tier: "anomalous",
      weight: 2,
      minQuantity: 1,
      maxQuantity: 1,
      guaranteed: false,
    },
  ]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addLootEntry = () => {
    setLootEntries((prev) => [
      ...prev,
      {
        itemId: "",
        itemName: "",
        tier: "common",
        weight: 10,
        minQuantity: 1,
        maxQuantity: 1,
        guaranteed: false,
      },
    ]);
  };

  const removeLootEntry = (index: number) => {
    setLootEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLootEntry = (index: number, field: string, value: any) => {
    setLootEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    );
  };

  const totalWeight = lootEntries.reduce((sum, entry) => sum + (entry.guaranteed ? 0 : entry.weight), 0);

  const calculateDropChance = (weight: number) => {
    if (totalWeight === 0) return 0;
    return ((weight / totalWeight) * 100).toFixed(2);
  };

  const tierColors: Record<string, string> = {
    scrap: "#4A4B55",
    common: "#8A8B95",
    sturdy: "#2D6B4F",
    refined: "#3A7D7B",
    masterwork: "#6B4E9B",
    anomalous: "#C9A84C",
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/loot-tables"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-[#C9A84C] text-xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {isNew ? "New Loot Table" : formData.displayName}
          </h1>
          {!isNew && (
            <span
              className="px-2 py-1 bg-[#2D6B4F] text-[#E8E0D0] text-xs rounded"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              ✅ Published v2
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

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="col-span-2 space-y-6">
            {/* Basic Info */}
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
                    Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
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
                    value={formData.displayName}
                    onChange={(e) => updateField("displayName", e.target.value)}
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
                    rows={2}
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
                      Source Type
                    </label>
                    <select
                      value={formData.sourceType}
                      onChange={(e) => updateField("sourceType", e.target.value)}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      <option value="creature">Creature</option>
                      <option value="chest">Chest</option>
                      <option value="boss">Boss</option>
                      <option value="quest">Quest</option>
                      <option value="event">Event</option>
                      <option value="biome">Biome</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Source Entity
                    </label>
                    <select
                      value={formData.sourceEntity}
                      onChange={(e) => updateField("sourceEntity", e.target.value)}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      <option value="drowned_revenant">Drowned Revenant</option>
                      <option value="crypt_guardian">Crypt Guardian</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Drop Settings */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Drop Settings
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Min Drops
                  </label>
                  <input
                    type="number"
                    value={formData.minDrops}
                    onChange={(e) => updateField("minDrops", parseInt(e.target.value))}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Max Drops
                  </label>
                  <input
                    type="number"
                    value={formData.maxDrops}
                    onChange={(e) => updateField("maxDrops", parseInt(e.target.value))}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Drop Chance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.dropChance}
                    onChange={(e) => updateField("dropChance", parseFloat(e.target.value))}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiresKillingBlow}
                    onChange={(e) => updateField("requiresKillingBlow", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Requires killing blow (no loot sharing)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.scalesWithLuck}
                    onChange={(e) => updateField("scalesWithLuck", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Scales with luck stat
                  </span>
                </label>
              </div>
            </div>

            {/* Loot Entries */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2
                    className="text-[#C9A84C] text-lg"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    Loot Pool
                  </h2>
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Total Weight: {totalWeight}
                  </span>
                </div>
                <button
                  onClick={addLootEntry}
                  className="px-3 py-1.5 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <Plus className="w-3 h-3" />
                  Add Item
                </button>
              </div>
              <div className="space-y-2">
                {lootEntries.map((entry, index) => (
                  <div
                    key={index}
                    className="bg-[#1C1D27] rounded p-3 flex items-center gap-3"
                  >
                    <div className="flex-1 grid grid-cols-6 gap-2">
                      <div className="col-span-2">
                        <select
                          value={entry.itemId}
                          onChange={(e) => {
                            updateLootEntry(index, "itemId", e.target.value);
                            updateLootEntry(index, "itemName", e.target.options[e.target.selectedIndex].text);
                          }}
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                          style={{ fontFamily: "var(--font-serif)" }}
                        >
                          <option value="rusty_sword">Rusty Sword</option>
                          <option value="waterlogged_leather">Waterlogged Leather</option>
                          <option value="ancient_coin">Ancient Coin</option>
                          <option value="drowned_essence">Drowned Essence</option>
                          <option value="revenant_blade">Revenant Blade</option>
                          <option value="cursed_amulet">Cursed Amulet</option>
                        </select>
                      </div>
                      <div>
                        <select
                          value={entry.tier}
                          onChange={(e) => updateLootEntry(index, "tier", e.target.value)}
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          <option value="scrap">Scrap</option>
                          <option value="common">Common</option>
                          <option value="sturdy">Sturdy</option>
                          <option value="refined">Refined</option>
                          <option value="masterwork">Masterwork</option>
                          <option value="anomalous">Anomalous</option>
                        </select>
                      </div>
                      <div className="flex gap-1 items-center">
                        <input
                          type="number"
                          value={entry.minQuantity}
                          onChange={(e) => updateLootEntry(index, "minQuantity", parseInt(e.target.value))}
                          placeholder="Min"
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm text-center"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                        <span className="text-[#8A8B95]">–</span>
                        <input
                          type="number"
                          value={entry.maxQuantity}
                          onChange={(e) => updateLootEntry(index, "maxQuantity", parseInt(e.target.value))}
                          placeholder="Max"
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm text-center"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={entry.weight}
                          onChange={(e) => updateLootEntry(index, "weight", parseInt(e.target.value))}
                          disabled={entry.guaranteed}
                          placeholder="Weight"
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm disabled:opacity-50"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={entry.guaranteed}
                            onChange={(e) => updateLootEntry(index, "guaranteed", e.target.checked)}
                            className="w-3 h-3"
                          />
                          <span
                            className="text-[#E8E0D0] text-xs"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            100%
                          </span>
                        </label>
                        {!entry.guaranteed && (
                          <span
                            className="text-[#8A8B95] text-xs"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {calculateDropChance(entry.weight)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeLootEntry(index)}
                      className="text-[#8B2500] hover:text-[#E8E0D0] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Statistics */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Statistics
              </h3>
              <div
                className="space-y-2 text-sm"
                style={{ fontFamily: "var(--font-mono)", color: "#E8E0D0" }}
              >
                <div className="flex justify-between">
                  <span className="text-[#8A8B95]">Total Items:</span>
                  <span>{lootEntries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8B95]">Guaranteed:</span>
                  <span>{lootEntries.filter(e => e.guaranteed).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8B95]">Weighted:</span>
                  <span>{lootEntries.filter(e => !e.guaranteed).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8B95]">Total Weight:</span>
                  <span>{totalWeight}</span>
                </div>
                <div className="border-t border-[#2A2B35] pt-2 mt-2"></div>
                <div className="flex justify-between">
                  <span className="text-[#8A8B95]">Drop Range:</span>
                  <span>{formData.minDrops}–{formData.maxDrops}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8B95]">Drop Rate:</span>
                  <span>{(formData.dropChance * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Drop Simulator */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4 flex items-center gap-2"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <Dice6 className="w-4 h-4" />
                Drop Simulator
              </h3>
              <button
                className="w-full px-4 py-2 bg-[#1C1D27] hover:bg-[#2A2B35] border border-[#2A2B35] text-[#E8E0D0] rounded transition-colors text-sm"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Simulate 10 Drops
              </button>
              <div className="mt-4 p-3 bg-[#1C1D27] rounded text-xs space-y-1" style={{ fontFamily: "var(--font-mono)", color: "#8A8B95" }}>
                <div>Click to simulate drops...</div>
              </div>
            </div>

            {/* Tier Distribution */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Tier Distribution
              </h3>
              <div className="space-y-2">
                {Object.entries(
                  lootEntries.reduce((acc, entry) => {
                    acc[entry.tier] = (acc[entry.tier] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([tier, count]) => (
                  <div key={tier} className="flex items-center gap-2">
                    <div
                      className="px-2 py-1 rounded text-xs capitalize flex-1"
                      style={{
                        backgroundColor: tierColors[tier] + "20",
                        color: tierColors[tier],
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {tier}
                    </div>
                    <span
                      className="text-[#8A8B95] text-sm"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

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
