import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Save, Send } from "lucide-react";

type ItemType = "weapon" | "armour" | "consumable" | "material" | "tool" | "key" | "blueprint";
type GearTier = "scrap" | "common" | "sturdy" | "refined" | "masterwork" | "anomalous";

const tierColors = {
  scrap: "#4A4B55",
  common: "#8A8B95",
  sturdy: "#2D6B4F",
  refined: "#3A7D7B",
  masterwork: "#6B4E9B",
  anomalous: "#C9A84C",
};

export default function ItemsDetail() {
  const { id } = useParams();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    id: "iron_greatsword",
    name: "Iron Greatsword",
    description: "A heavy blade forged from crude iron. Slow but devastating.",
    type: "weapon" as ItemType,
    tier: "common" as GearTier,
    soulbound: false,
    weight: 8.5,
    baseDurability: 150,
    // Weapon-specific
    damage: 35,
    speed: 8,
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/items"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-[#C9A84C] text-xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {isNew ? "New Item" : formData.name}
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

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-6 p-8">
          {/* Left Column */}
          <div className="col-span-2 space-y-6">
            {/* Identity */}
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
                    ID (slug)
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => updateField("id", e.target.value)}
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
                    rows={3}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none resize-none"
                    style={{ fontFamily: "var(--font-serif)" }}
                  />
                </div>
              </div>
            </div>

            {/* Classification */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Classification
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => updateField("type", e.target.value)}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <option value="weapon">Weapon</option>
                    <option value="armour">Armour</option>
                    <option value="consumable">Consumable</option>
                    <option value="material">Material</option>
                    <option value="tool">Tool</option>
                    <option value="key">Key</option>
                    <option value="blueprint">Blueprint</option>
                  </select>
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Tier
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => updateField("tier", e.target.value)}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
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
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Soulbound
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.soulbound}
                      onChange={(e) => updateField("soulbound", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span
                      className="text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Cannot trade
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Stats - Weapon */}
            {formData.type === "weapon" && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <h2
                  className="text-[#C9A84C] text-lg mb-4"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Weapon Stats
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Damage
                    </label>
                    <input
                      type="number"
                      value={formData.damage}
                      onChange={(e) => updateField("damage", parseInt(e.target.value))}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Speed (ticks)
                    </label>
                    <input
                      type="number"
                      value={formData.speed}
                      onChange={(e) => updateField("speed", parseInt(e.target.value))}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Physical Properties */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Physical Properties
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Weight
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => updateField("weight", parseFloat(e.target.value))}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Base Durability
                  </label>
                  <input
                    type="number"
                    value={formData.baseDurability}
                    onChange={(e) => updateField("baseDurability", parseInt(e.target.value))}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Preview
              </h3>
              <div className="bg-[#1C1D27] rounded p-4">
                <div
                  className="text-lg mb-2"
                  style={{
                    fontFamily: "var(--font-serif)",
                    color: tierColors[formData.tier],
                  }}
                >
                  {formData.name}
                </div>
                <div
                  className="text-[#8A8B95] text-xs mb-3"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {formData.type.charAt(0).toUpperCase() + formData.type.slice(1)} • {formData.tier.charAt(0).toUpperCase() + formData.tier.slice(1)}
                </div>
                {formData.type === "weapon" && (
                  <div
                    className="text-sm space-y-1 mb-3"
                    style={{ fontFamily: "var(--font-mono)", color: "#E8E0D0" }}
                  >
                    <div>Damage: {formData.damage}</div>
                    <div>Speed: {formData.speed} ticks</div>
                  </div>
                )}
                <div className="border-t border-[#2A2B35] pt-2 mt-2">
                  <div
                    className="text-[#8A8B95] text-xs mb-2"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Weight: {formData.weight}
                  </div>
                  <div className="h-2 bg-[#0A0B0F] rounded-full overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-[#2D6B4F] to-[#8B2500]"></div>
                  </div>
                  <div
                    className="text-[#8A8B95] text-xs mt-1"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {formData.baseDurability}/{formData.baseDurability}
                  </div>
                </div>
              </div>
            </div>

            {/* Used In */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Used In
              </h3>
              <div className="space-y-2 text-sm">
                <div
                  className="text-[#8A8B95]"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  • 2 creature loot tables
                </div>
                <div
                  className="text-[#8A8B95]"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  • Flooded Crypt biome
                </div>
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
