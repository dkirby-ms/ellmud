import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Save } from "lucide-react";
import { useAdminEntity } from "../../hooks/useAdminEntity.js";

interface ModifierData {
  id: string;
  name: string;
  description: string;
  effects: Record<string, number>;
  stackable: boolean;
  tags: string[];
}

export default function ModifiersDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  
  const { data: apiData, loading, error, saving, saveError, save } = useAdminEntity<ModifierData>(
    "modifiers",
    id,
    isNew
  );

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    effects: {} as Record<string, number>,
    stackable: false,
    tags: [] as string[],
  });

  useEffect(() => {
    if (apiData && !isNew) {
      setFormData(apiData);
    }
  }, [apiData, isNew]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await save(formData);
      if (isNew) {
        navigate("/admin/modifiers");
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
      {/* Header */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/modifiers"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-[#C9A84C] text-xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {isNew ? "New Modifier" : formData.name}
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
            className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2 disabled:opacity-50"
            style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
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
            <div>
              <label
                className="flex items-center gap-2 text-[#8A8B95] text-sm"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <input
                  type="checkbox"
                  checked={formData.stackable}
                  onChange={(e) => updateField("stackable", e.target.checked)}
                  className="w-4 h-4"
                />
                Stackable
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
