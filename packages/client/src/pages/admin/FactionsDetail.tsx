import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Save, Send, Plus, X } from "lucide-react";
import { useAdminEntity } from "../../hooks/useAdminEntity.js";

interface FactionMilestoneEntry {
  name: string;
  threshold: number;
  description: string;
}

interface FactionEventEntry {
  milestone: string;
  narratives: string[];
}

interface FactionData {
  id: string;
  name: string;
  description: string;
  milestones: FactionMilestoneEntry[];
  events: FactionEventEntry[];
}

export default function FactionsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const { data: apiData, loading, error, saving, saveError, save } = useAdminEntity<FactionData>(
    "factions",
    id,
    isNew
  );

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
  });

  const [milestones, setMilestones] = useState<FactionMilestoneEntry[]>([]);
  const [events, setEvents] = useState<FactionEventEntry[]>([]);

  useEffect(() => {
    if (apiData && !isNew) {
      setFormData({
        id: apiData.id ?? "",
        name: apiData.name ?? "",
        description: apiData.description ?? "",
      });
      setMilestones(apiData.milestones ?? []);
      setEvents(apiData.events ?? []);
    }
  }, [apiData, isNew]);

  const updateField = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      { name: "", threshold: 0, description: "" },
    ]);
  };

  const removeMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: string, value: string | number | boolean) => {
    setMilestones((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      )
    );
  };

  const handleSave = async () => {
    try {
      await save({ ...formData, milestones, events });
      if (isNew) {
        navigate("/admin/factions");
      }
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-[#8A8B95]" style={{ fontFamily: "var(--font-sans)" }}>
          Loading...
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
            to="/admin/factions"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-[#C9A84C] text-xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {isNew ? "New Faction" : formData.name}
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
        <div className="flex items-center gap-2">
          {saveError && (
            <span className="text-[#8B2500] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
              {saveError}
            </span>
          )}
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
                    ID
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
                    rows={4}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none resize-none"
                    style={{ fontFamily: "var(--font-serif)" }}
                  />
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-[#C9A84C] text-lg"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Milestones
                </h2>
                <button
                  onClick={addMilestone}
                  className="px-3 py-1.5 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <Plus className="w-3 h-3" />
                  Add Milestone
                </button>
              </div>
              <div className="space-y-3">
                {milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className="bg-[#1C1D27] rounded p-4 flex items-center gap-4"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={milestone.name}
                        onChange={(e) => updateMilestone(index, "name", e.target.value)}
                        placeholder="Milestone name"
                        className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                        style={{ fontFamily: "var(--font-serif)" }}
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={milestone.threshold}
                        onChange={(e) => updateMilestone(index, "threshold", parseInt(e.target.value) || 0)}
                        placeholder="Threshold"
                        className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={milestone.description}
                        onChange={(e) => updateMilestone(index, "description", e.target.value)}
                        placeholder="Description"
                        className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                        style={{ fontFamily: "var(--font-serif)" }}
                      />
                    </div>
                    <button
                      onClick={() => removeMilestone(index)}
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
                  style={{ fontFamily: "var(--font-serif)", color: "#C9A84C" }}
                >
                  {formData.name}
                </div>
                <div className="text-[#8A8B95] text-xs">
                  {formData.description?.slice(0, 100)}{(formData.description?.length ?? 0) > 100 ? "…" : ""}
                </div>
                <div className="border-t border-[#2A2B35] my-2"></div>
                <div className="text-xs text-[#8A8B95]">
                  {milestones.length} milestones · {events.length} events
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
