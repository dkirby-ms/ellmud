import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Save, Send } from "lucide-react";

export default function RoomsDetail() {
  const { id } = useParams();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    name: "Drowned Vestibule",
    biome: "flooded_crypt",
    roomType: "entry",
    lightLevel: 0.2,
    description: "Water drips from ancient stone arches as you enter this crumbling antechamber. The floor is covered in a thin layer of murky water that ripples with each step.",
    exits: 2,
    minSize: 8,
    maxSize: 12,
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const roomTypeColors: Record<string, string> = {
    entry: "#2D6B4F",
    extraction: "#C9A84C",
    boss: "#8B2500",
    corridor: "#4A4B55",
    junction: "#3A7D7B",
    dead_end: "#6B4E9B",
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/rooms"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-[#C9A84C] text-xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {isNew ? "New Room Template" : formData.name}
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
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-serif)" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Biome
                    </label>
                    <select
                      value={formData.biome}
                      onChange={(e) => updateField("biome", e.target.value)}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      <option value="flooded_crypt">Flooded Crypt</option>
                      <option value="shattered_bastion">Shattered Bastion</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Room Type
                    </label>
                    <select
                      value={formData.roomType}
                      onChange={(e) => updateField("roomType", e.target.value)}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      <option value="entry">Entry</option>
                      <option value="extraction">Extraction</option>
                      <option value="boss">Boss</option>
                      <option value="corridor">Corridor</option>
                      <option value="junction">Junction</option>
                      <option value="dead_end">Dead End</option>
                    </select>
                  </div>
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
              </div>
            </div>

            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Room Properties
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Light Level
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={formData.lightLevel}
                    onChange={(e) => updateField("lightLevel", parseFloat(e.target.value))}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Exit Count
                  </label>
                  <input
                    type="number"
                    value={formData.exits}
                    onChange={(e) => updateField("exits", parseInt(e.target.value))}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Size Range
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={formData.minSize}
                      onChange={(e) => updateField("minSize", parseInt(e.target.value))}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                      style={{ fontFamily: "var(--font-mono)" }}
                    />
                    <span className="text-[#8A8B95]">–</span>
                    <input
                      type="number"
                      value={formData.maxSize}
                      onChange={(e) => updateField("maxSize", parseInt(e.target.value))}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
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
                Preview
              </h3>
              <div
                className="bg-[#1C1D27] rounded p-4 text-sm space-y-3"
                style={{ color: "#E8E0D0" }}
              >
                <div
                  className="text-lg"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {formData.name}
                </div>
                <div
                  className="px-2 py-1 rounded text-xs inline-block"
                  style={{
                    backgroundColor: roomTypeColors[formData.roomType] + "20",
                    color: roomTypeColors[formData.roomType],
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {formData.roomType}
                </div>
                <div className="border-t border-[#2A2B35] my-2"></div>
                <div
                  className="text-xs text-[#8A8B95]"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {formData.description}
                </div>
                <div className="border-t border-[#2A2B35] my-2"></div>
                <div
                  className="text-xs text-[#8A8B95] space-y-1"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <div>Light: {formData.lightLevel}</div>
                  <div>Exits: {formData.exits}</div>
                  <div>Size: {formData.minSize}–{formData.maxSize}</div>
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
