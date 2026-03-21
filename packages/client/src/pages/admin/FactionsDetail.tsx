import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Save, Send, Plus, X } from "lucide-react";

export default function FactionsDetail() {
  const { id } = useParams();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    slug: "forgebound",
    displayName: "The Forgebound",
    philosophy: "Craft your fate",
    description: "Master smiths and artificers who believe that power is earned through creation. They value craftsmanship, resilience, and the transformation of raw materials into legendary gear.",
    specialty: "Smithing & Gear",
    color: "#C9A84C",
  });

  const [ranks, setRanks] = useState([
    { level: 1, name: "Apprentice", reqPoints: 0 },
    { level: 2, name: "Journeyman", reqPoints: 500 },
    { level: 3, name: "Craftsman", reqPoints: 1500 },
    { level: 4, name: "Master Smith", reqPoints: 3500 },
    { level: 5, name: "Forgelord", reqPoints: 7500 },
  ]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addRank = () => {
    setRanks((prev) => [
      ...prev,
      { level: prev.length + 1, name: "", reqPoints: 0 },
    ]);
  };

  const removeRank = (index: number) => {
    setRanks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRank = (index: number, field: string, value: any) => {
    setRanks((prev) =>
      prev.map((rank, i) =>
        i === index ? { ...rank, [field]: value } : rank
      )
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/factions"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-[#C9A84C] text-xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {isNew ? "New Faction" : formData.displayName}
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

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-3 gap-6">
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
                    Philosophy
                  </label>
                  <input
                    type="text"
                    value={formData.philosophy}
                    onChange={(e) => updateField("philosophy", e.target.value)}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Specialty
                    </label>
                    <input
                      type="text"
                      value={formData.specialty}
                      onChange={(e) => updateField("specialty", e.target.value)}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-sans)" }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Color
                    </label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => updateField("color", e.target.value)}
                      className="w-full h-10 bg-[#1C1D27] border border-[#2A2B35] rounded px-2 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ranks */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-[#C9A84C] text-lg"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Ranks
                </h2>
                <button
                  onClick={addRank}
                  className="px-3 py-1.5 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <Plus className="w-3 h-3" />
                  Add Rank
                </button>
              </div>
              <div className="space-y-3">
                {ranks.map((rank, index) => (
                  <div
                    key={index}
                    className="bg-[#1C1D27] rounded p-4 flex items-center gap-4"
                  >
                    <div className="w-16">
                      <span
                        className="text-[#8A8B95] text-sm"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Rank {rank.level}
                      </span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={rank.name}
                        onChange={(e) => updateRank(index, "name", e.target.value)}
                        placeholder="Rank name"
                        className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                        style={{ fontFamily: "var(--font-serif)" }}
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={rank.reqPoints}
                        onChange={(e) => updateRank(index, "reqPoints", parseInt(e.target.value))}
                        placeholder="Points"
                        className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                    <button
                      onClick={() => removeRank(index)}
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
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Preview
              </h3>
              <div
                className="bg-[#1C1D27] rounded p-4 text-sm space-y-3"
                style={{ fontFamily: "var(--font-sans)", color: "#E8E0D0" }}
              >
                <div
                  className="text-lg"
                  style={{ fontFamily: "var(--font-serif)", color: formData.color }}
                >
                  {formData.displayName}
                </div>
                <div className="text-[#8A8B95] text-xs italic">
                  "{formData.philosophy}"
                </div>
                <div className="text-xs text-[#8A8B95]">
                  {formData.specialty}
                </div>
                <div className="border-t border-[#2A2B35] my-2"></div>
                <div className="text-xs text-[#8A8B95]">
                  {ranks.length} ranks
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
