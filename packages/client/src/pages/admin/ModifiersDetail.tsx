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

  const [effectsJson, setEffectsJson] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (apiData && !isNew) {
      setFormData(apiData);
      setEffectsJson(JSON.stringify(apiData.effects || {}, null, 2));
      setTagsText((apiData.tags || []).join(", "));
    }
  }, [apiData, isNew]);

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return "Name is required";
    }
    if (!formData.id.trim()) {
      return "ID is required";
    }
    
    // Validate effects JSON
    try {
      if (effectsJson.trim()) JSON.parse(effectsJson);
    } catch {
      return "Effects must be valid JSON";
    }
    
    return null;
  };

  const updateField = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      setValidationError(error);
      return;
    }
    
    setValidationError(null);
    
    try {
      // Parse JSON and comma-separated fields before saving
      const dataToSave = {
        ...formData,
        effects: effectsJson.trim() ? JSON.parse(effectsJson) : {},
        tags: tagsText.trim() 
          ? tagsText.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0)
          : [],
      };
      await save(dataToSave);
      if (isNew) {
        navigate("/admin/modifiers");
      }
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const isValid = validateForm() === null;

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
           
          >
            {isNew ? "New Modifier" : formData.name}
          </h1>
          {(saveError || validationError) && (
            <span
              className="px-2 py-1 bg-[#8B2500] text-[#E8E0D0] text-xs rounded"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Error: {saveError || validationError}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
            className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2 disabled:opacity-50"
            style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
               
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

            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 mt-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
               
              >
                Effects & Tags
              </h2>
              <div className="space-y-4">
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Effects (JSON)
                  </label>
                  <textarea
                    value={effectsJson}
                    onChange={(e) => setEffectsJson(e.target.value)}
                    rows={4}
                    placeholder='{"maxHp": 10, "strength": 2}'
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none resize-none"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="buff, combat, temporary"
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-sans)" }}
                  />
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
                Modifier Overview
              </h3>
              <div
                className="bg-[#1C1D27] rounded p-4 text-sm space-y-2"
                style={{ fontFamily: "var(--font-sans)", color: "#E8E0D0" }}
              >
                <div className="text-[#C9A84C]">{formData.name || "Unnamed Modifier"}</div>
                <div className="text-[#8A8B95] text-xs">
                  {formData.stackable ? "Stackable" : "Non-stackable"}
                </div>
                {tagsText && (
                  <div className="text-xs text-[#8A8B95] flex flex-wrap gap-1">
                    {tagsText.split(",").map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-[#2A2B35] rounded">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {isValid ? (
              <div className="bg-[#2D6B4F] border border-[#256B4A] rounded-lg p-4">
                <p
                  className="text-[#E8E0D0] text-sm flex items-center gap-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <span>✅</span>
                  <span>All fields valid</span>
                </p>
              </div>
            ) : (
              <div className="bg-[#8B2500]/20 border border-[#8B2500] rounded-lg p-4">
                <p
                  className="text-[#E8E0D0] text-sm flex items-center gap-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <span>⚠️</span>
                  <span>{validateForm()}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
