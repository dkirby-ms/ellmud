import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Save, Send } from "lucide-react";
import { useAdminEntity } from "../../hooks/useAdminEntity.js";

interface RoomData {
  id: string;
  name: string;
  description: string;
  type: string;
  properties: string[];
  hazards: Array<{ type: string; severity: number }>;
  lootContainers: Array<{ type: string; itemIds: string[] }>;
}

export default function RoomsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const { data: apiData, loading, error, saving, saveError, save } = useAdminEntity<RoomData>(
    "rooms",
    id,
    isNew
  );

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    properties: [] as string[],
    hazards: [] as Array<{ type: string; severity: number }>,
    lootContainers: [] as Array<{ type: string; itemIds: string[] }>,
  });

  useEffect(() => {
    if (apiData && !isNew) {
      setFormData({
        name: apiData.name,
        description: apiData.description,
        type: apiData.type,
        properties: apiData.properties,
        hazards: apiData.hazards,
        lootContainers: apiData.lootContainers,
      });
    }
  }, [apiData, isNew]);

  const updateField = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await save(formData);
      if (isNew) {
        navigate("/admin/rooms");
      }
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const roomTypeColors: Record<string, string> = {
    entry: "#2D6B4F",
    extraction: "#C9A84C",
    boss: "#8B2500",
    corridor: "#4A4B55",
    junction: "#3A7D7B",
    dead_end: "#6B4E9B",
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-[#8A8B95]" style={{ fontFamily: "var(--font-sans)" }}>
          Loading room...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-[#8B2500]" style={{ fontFamily: "var(--font-sans)" }}>
          Error: {error}
        </div>
      </div>
    );
  }

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
          {saveError && (
            <span
              className="px-2 py-1 bg-[#8B2500] text-[#E8E0D0] text-xs rounded"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Error: {saveError}
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
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Room Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => updateField("type", e.target.value)}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    <option value="">Select type...</option>
                    <option value="entry">Entry</option>
                    <option value="extraction">Extraction</option>
                    <option value="boss">Boss</option>
                    <option value="corridor">Corridor</option>
                    <option value="junction">Junction</option>
                    <option value="dead_end">Dead End</option>
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
              <div>
                <label
                  className="block text-[#8A8B95] text-sm mb-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Properties (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.properties.join(", ")}
                  onChange={(e) =>
                    updateField(
                      "properties",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                  style={{ fontFamily: "var(--font-mono)" }}
                  placeholder="e.g. dark, flooded, narrow"
                />
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
                    backgroundColor: (roomTypeColors[formData.type] ?? "#4A4B55") + "20",
                    color: roomTypeColors[formData.type] ?? "#4A4B55",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {formData.type || "—"}
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
                  <div>Properties: {formData.properties.length > 0 ? formData.properties.join(", ") : "—"}</div>
                  <div>Hazards: {formData.hazards.length}</div>
                  <div>Loot Containers: {formData.lootContainers.length}</div>
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
