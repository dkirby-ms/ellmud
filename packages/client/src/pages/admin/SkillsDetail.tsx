import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Save, Send } from "lucide-react";

export default function SkillsDetail() {
  const { id } = useParams();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    slug: "blade_mastery",
    displayName: "Blade Mastery",
    category: "combat",
    description: "Proficiency with bladed weapons. Increases damage and reduces stamina cost.",
    maxLevel: 100,
    softCapLevel: 50,
    softCapMultiplier: 0.5,
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/skills"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-[#C9A84C] text-xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {isNew ? "New Skill" : formData.displayName}
          </h1>
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
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <option value="combat">Combat</option>
                    <option value="defence">Defence</option>
                    <option value="survival">Survival</option>
                    <option value="subterfuge">Subterfuge</option>
                    <option value="awareness">Awareness</option>
                    <option value="social">Social</option>
                  </select>
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
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Max Level
                    </label>
                    <input
                      type="number"
                      value={formData.maxLevel}
                      onChange={(e) => updateField("maxLevel", parseInt(e.target.value))}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Soft Cap Level
                    </label>
                    <input
                      type="number"
                      value={formData.softCapLevel}
                      onChange={(e) => updateField("softCapLevel", parseInt(e.target.value))}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Soft Cap Multiplier
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.softCapMultiplier}
                      onChange={(e) => updateField("softCapMultiplier", parseFloat(e.target.value))}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Skill Overview
              </h3>
              <div
                className="bg-[#1C1D27] rounded p-4 text-sm space-y-2"
                style={{ fontFamily: "var(--font-sans)", color: "#E8E0D0" }}
              >
                <div className="text-[#C9A84C]">{formData.displayName}</div>
                <div className="text-[#8A8B95] text-xs">{formData.category}</div>
                <div className="border-t border-[#2A2B35] my-2"></div>
                <div className="text-xs text-[#8A8B95]">
                  Max Level: {formData.maxLevel}
                </div>
                <div className="text-xs text-[#8A8B95]">
                  Soft Cap: Level {formData.softCapLevel}
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
