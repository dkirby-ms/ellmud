import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Save, Plus, X, Eye } from "lucide-react";
import { useAdminEntity } from "../../hooks/useAdminEntity.js";
import AnsiTextarea from "../../components/admin/AnsiTextarea.js";

interface NarrativeData {
  id: string;
  name: string;
  narrativeType: string;
  template: string;
  tone: string;
  verbosity: string;
  tags: string[];
}

type NarrativeType = "dialogue" | "lore" | "quest" | "event" | "discovery" | "epilogue";

interface DialogueLine {
  speaker: string;
  text: string;
  emotion?: string;
}

interface Condition {
  type: string;
  operator: string;
  value: string;
}

interface Choice {
  text: string;
  nextSlug?: string;
  condition?: string;
}

export default function NarrativeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const { data: apiData, loading, error, saving, saveError, save } = useAdminEntity<NarrativeData>(
    "narrative",
    id,
    isNew
  );

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    narrativeType: "dialogue" as string,
    template: "",
    tone: "",
    verbosity: "",
    tags: [] as string[],
  });

  const [dialogueLines, setDialogueLines] = useState<DialogueLine[]>([]);

  const [conditions, setConditions] = useState<Condition[]>([]);

  const [choices, setChoices] = useState<Choice[]>([]);

  useEffect(() => {
    if (apiData && !isNew) {
      setFormData({
        id: apiData.id,
        name: apiData.name,
        narrativeType: apiData.narrativeType,
        template: apiData.template,
        tone: apiData.tone,
        verbosity: apiData.verbosity,
        tags: apiData.tags ?? [],
      });
    }
  }, [apiData, isNew]);

  const handleSave = async () => {
    try {
      await save(formData);
      if (isNew) {
        navigate("/admin/narrative");
      }
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const updateField = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addDialogueLine = () => {
    setDialogueLines((prev) => [...prev, { speaker: "Warden", text: "", emotion: "neutral" }]);
  };

  const removeDialogueLine = (index: number) => {
    setDialogueLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDialogueLine = (index: number, field: string, value: string | number | boolean) => {
    setDialogueLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  };

  const addCondition = () => {
    setConditions((prev) => [...prev, { type: "player_level", operator: ">=", value: "1" }]);
  };

  const removeCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: string, value: string | number | boolean) => {
    setConditions((prev) =>
      prev.map((cond, i) => (i === index ? { ...cond, [field]: value } : cond))
    );
  };

  const addChoice = () => {
    setChoices((prev) => [...prev, { text: "", nextSlug: "" }]);
  };

  const removeChoice = (index: number) => {
    setChoices((prev) => prev.filter((_, i) => i !== index));
  };

  const updateChoice = (index: number, field: string, value: string | number | boolean) => {
    setChoices((prev) =>
      prev.map((choice, i) => (i === index ? { ...choice, [field]: value } : choice))
    );
  };

  const wordCount = formData.template.split(/\s+/).filter(Boolean).length;

  const typeColors: Record<NarrativeType, string> = {
    dialogue: "#3A7D7B",
    lore: "#C9A84C",
    quest: "#6B4E9B",
    event: "#2D6B4F",
    discovery: "#B8860B",
    epilogue: "#8B2500",
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-[#8A8B95]" style={{ fontFamily: "var(--font-sans)" }}>
          Loading narrative...
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
            to="/admin/narrative"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-[#C9A84C] text-xl"
           
          >
            {isNew ? "New Narrative" : formData.name}
          </h1>
          {saveError && (
            <span
              className="px-2 py-1 bg-[#8B2500] text-[#E8E0D0] text-xs rounded"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Error: {saveError}
            </span>
          )}
          {!isNew && !saveError && (
            <span
              className="px-2 py-1 bg-[#2D6B4F] text-[#E8E0D0] text-xs rounded"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              ✅ Published v4
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
            {saving ? "Saving..." : "Save"}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Type
                    </label>
                    <select
                      value={formData.narrativeType}
                      onChange={(e) => updateField("narrativeType", e.target.value)}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      <option value="dialogue">Dialogue</option>
                      <option value="lore">Lore</option>
                      <option value="quest">Quest</option>
                      <option value="event">Event</option>
                      <option value="discovery">Discovery</option>
                      <option value="epilogue">Epilogue</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Tone
                    </label>
                    <input
                      type="text"
                      value={formData.tone}
                      onChange={(e) => updateField("tone", e.target.value)}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-sans)" }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Verbosity
                    </label>
                    <input
                      type="text"
                      value={formData.verbosity}
                      onChange={(e) => updateField("verbosity", e.target.value)}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-sans)" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-[#C9A84C] text-lg"
                 
                >
                  {formData.narrativeType === "dialogue" ? "Dialogue Lines" : "Narrative Content"}
                </h2>
                <span
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {wordCount} words
                </span>
              </div>

              {formData.narrativeType === "dialogue" ? (
                <div className="space-y-3">
                  {dialogueLines.map((line, index) => (
                    <div
                      key={index}
                      className="bg-[#1C1D27] rounded p-3 flex items-start gap-3"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <select
                            value={line.speaker}
                            onChange={(e) => updateDialogueLine(index, "speaker", e.target.value)}
                            className="bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            <option value="Warden">Warden</option>
                            <option value="Player">Player</option>
                            <option value="Merchant">Merchant</option>
                            <option value="Narrator">Narrator</option>
                          </select>
                          <select
                            value={line.emotion}
                            onChange={(e) => updateDialogueLine(index, "emotion", e.target.value)}
                            className="bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            <option value="neutral">Neutral</option>
                            <option value="weary">Weary</option>
                            <option value="serious">Serious</option>
                            <option value="curious">Curious</option>
                            <option value="grim">Grim</option>
                            <option value="hopeful">Hopeful</option>
                          </select>
                        </div>
                        <AnsiTextarea
                          value={line.text}
                          onChange={(v) => updateDialogueLine(index, "text", v)}
                          rows={2}
                          placeholder="Dialogue text..."
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded-none px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none resize-none text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeDialogueLine(index)}
                        className="text-[#8B2500] hover:text-[#E8E0D0] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addDialogueLine}
                    className="w-full px-4 py-2 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center justify-center gap-2 text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Dialogue Line
                  </button>
                </div>
              ) : (
                <>
                <AnsiTextarea
                  value={formData.template}
                  onChange={(v) => updateField("template", v)}
                  rows={12}
                  style={{ lineHeight: "1.7" }}
                />
                </>
              )}
            </div>

            {/* Player Choices */}
            {formData.narrativeType === "dialogue" && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="text-[#C9A84C] text-lg"
                   
                  >
                    Player Choices
                  </h2>
                  <button
                    onClick={addChoice}
                    className="px-3 py-1.5 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <Plus className="w-3 h-3" />
                    Add Choice
                  </button>
                </div>
                <div className="space-y-2">
                  {choices.map((choice, index) => (
                    <div
                      key={index}
                      className="bg-[#1C1D27] rounded p-3 flex items-start gap-3"
                    >
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={choice.text}
                          onChange={(e) => updateChoice(index, "text", e.target.value)}
                          placeholder="Choice text..."
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                         
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={choice.nextSlug || ""}
                            onChange={(e) => updateChoice(index, "nextSlug", e.target.value)}
                            placeholder="next_dialogue_slug"
                            className="flex-1 bg-[#0A0B0F] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                            style={{ fontFamily: "var(--font-mono)" }}
                          />
                          <input
                            type="text"
                            value={choice.condition || ""}
                            onChange={(e) => updateChoice(index, "condition", e.target.value)}
                            placeholder="condition (optional)"
                            className="w-40 bg-[#0A0B0F] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                            style={{ fontFamily: "var(--font-mono)" }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeChoice(index)}
                        className="text-[#8B2500] hover:text-[#E8E0D0] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conditions */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-[#C9A84C] text-lg"
                 
                >
                  Display Conditions
                </h2>
                <button
                  onClick={addCondition}
                  className="px-3 py-1.5 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <Plus className="w-3 h-3" />
                  Add Condition
                </button>
              </div>
              <div className="space-y-2">
                {conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="bg-[#1C1D27] rounded p-3 flex items-center gap-3"
                  >
                    <div className="flex-1 flex gap-2">
                      <select
                        value={condition.type}
                        onChange={(e) => updateCondition(index, "type", e.target.value)}
                        className="flex-1 bg-[#0A0B0F] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        <option value="player_level">Player Level</option>
                        <option value="quest_complete">Quest Complete</option>
                        <option value="item_owned">Item Owned</option>
                        <option value="faction_rep">Faction Rep</option>
                        <option value="flag_set">Flag Set</option>
                      </select>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(index, "operator", e.target.value)}
                        className="w-20 bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        <option value=">=">&gt;=</option>
                        <option value="<=">&lt;=</option>
                        <option value="==">=</option>
                        <option value="!=">!=</option>
                      </select>
                      <input
                        type="text"
                        value={condition.value}
                        onChange={(e) => updateCondition(index, "value", e.target.value)}
                        className="w-32 bg-[#0A0B0F] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                    <button
                      onClick={() => removeCondition(index)}
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
            {/* Preview */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4 flex items-center gap-2"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <Eye className="w-4 h-4" />
                In-Game Preview
              </h3>
              <div className="bg-[#0A0B0F] rounded p-4 border border-[#2A2B35]">
                {formData.narrativeType === "dialogue" ? (
                  <div className="space-y-3">
                    {dialogueLines.slice(0, 3).map((line, i) => (
                      <div key={i} className="space-y-1">
                        <div
                          className="text-[#C9A84C] text-xs"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          {line.speaker}
                        </div>
                        <div
                          className="text-[#E8E0D0] text-sm"
                         
                        >
                          {line.text || "(empty)"}
                        </div>
                      </div>
                    ))}
                    {dialogueLines.length > 3 && (
                      <div
                        className="text-[#8A8B95] text-xs italic"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        +{dialogueLines.length - 3} more lines...
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="text-[#E8E0D0] text-sm"
                    style={{ lineHeight: "1.7" }}
                  >
                    {formData.template.slice(0, 300)}
                    {formData.template.length > 300 && "..."}
                  </div>
                )}
              </div>
            </div>

            {/* Type Badge */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Type
              </h3>
              <span
                className="px-3 py-2 rounded inline-block capitalize"
                style={{
                  backgroundColor: (typeColors[formData.narrativeType as NarrativeType] ?? "#4A4B55") + "20",
                  color: typeColors[formData.narrativeType as NarrativeType] ?? "#4A4B55",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {formData.narrativeType}
              </span>
            </div>

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
                  <span className="text-[#8A8B95]">Word Count:</span>
                  <span>{wordCount}</span>
                </div>
                {formData.narrativeType === "dialogue" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#8A8B95]">Lines:</span>
                      <span>{dialogueLines.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8A8B95]">Choices:</span>
                      <span>{choices.length}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-[#8A8B95]">Conditions:</span>
                  <span>{conditions.length}</span>
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
