import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Save, Send, Plus, X, Eye } from "lucide-react";

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
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    slug: "warden_warning",
    title: "The Warden's Warning",
    type: "dialogue" as NarrativeType,
    category: "The Refuge",
    description: "Initial dialogue with the Warden when first entering The Refuge.",
    // Content
    bodyText: `The dim lanterns flicker as you approach the Warden's post. His armor is battered, scarred from countless incursions into the depths below.

"Another seeker of fortune, I see. They all come eventually—drawn by the whispers of treasure, of power, of redemption." He gestures to the yawning portal behind him, its edges crackling with unstable energy.

"The Shards are not forgiving. Each one is a fragment of a broken world, teeming with creatures that should not exist. But the Pale King's corruption runs deep, and only by venturing into these rifts can we hope to stem the tide."

He hands you a worn leather satchel. "Take this. You'll need it to carry what you find—assuming you make it back."`,
    showInGame: true,
    playOnce: false,
    // Trigger settings
    triggerType: "automatic",
    triggerEvent: "first_refuge_entry",
  });

  const [dialogueLines, setDialogueLines] = useState<DialogueLine[]>([
    { speaker: "Warden", text: "Another seeker of fortune, I see.", emotion: "weary" },
    { speaker: "Warden", text: "The Shards are not forgiving. Each one is a fragment of a broken world.", emotion: "serious" },
    { speaker: "Player", text: "What happened to the others?", emotion: "curious" },
    { speaker: "Warden", text: "Some returned. Most didn't. That's the way of things here.", emotion: "grim" },
  ]);

  const [conditions, setConditions] = useState<Condition[]>([
    { type: "player_level", operator: ">=", value: "1" },
  ]);

  const [choices, setChoices] = useState<Choice[]>([
    { text: "Tell me more about the Shards.", nextSlug: "warden_shards_info" },
    { text: "I'm ready to go.", nextSlug: "refuge_hub" },
    { text: "Who is the Pale King?", nextSlug: "warden_pale_king", condition: "lore_unlocked" },
  ]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addDialogueLine = () => {
    setDialogueLines((prev) => [...prev, { speaker: "Warden", text: "", emotion: "neutral" }]);
  };

  const removeDialogueLine = (index: number) => {
    setDialogueLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDialogueLine = (index: number, field: string, value: any) => {
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

  const updateCondition = (index: number, field: string, value: any) => {
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

  const updateChoice = (index: number, field: string, value: any) => {
    setChoices((prev) =>
      prev.map((choice, i) => (i === index ? { ...choice, [field]: value } : choice))
    );
  };

  const wordCount = formData.bodyText.split(/\s+/).filter(Boolean).length;

  const typeColors: Record<NarrativeType, string> = {
    dialogue: "#3A7D7B",
    lore: "#C9A84C",
    quest: "#6B4E9B",
    event: "#2D6B4F",
    discovery: "#B8860B",
    epilogue: "#8B2500",
  };

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
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {isNew ? "New Narrative" : formData.title}
          </h1>
          {!isNew && (
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
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
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
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => updateField("type", e.target.value)}
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
                      <option value="The Refuge">The Refuge</option>
                      <option value="Flooded Crypt">Flooded Crypt</option>
                      <option value="Tutorial">Tutorial</option>
                      <option value="World Lore">World Lore</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Description (internal)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-sans)" }}
                  />
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-[#C9A84C] text-lg"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {formData.type === "dialogue" ? "Dialogue Lines" : "Narrative Content"}
                </h2>
                <span
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {wordCount} words
                </span>
              </div>

              {formData.type === "dialogue" ? (
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
                        <textarea
                          value={line.text}
                          onChange={(e) => updateDialogueLine(index, "text", e.target.value)}
                          rows={2}
                          placeholder="Dialogue text..."
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none resize-none text-sm"
                          style={{ fontFamily: "var(--font-serif)" }}
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
                <textarea
                  value={formData.bodyText}
                  onChange={(e) => updateField("bodyText", e.target.value)}
                  rows={12}
                  className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-4 py-3 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none resize-none"
                  style={{ fontFamily: "var(--font-serif)", lineHeight: "1.7" }}
                />
              )}
            </div>

            {/* Player Choices */}
            {formData.type === "dialogue" && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="text-[#C9A84C] text-lg"
                    style={{ fontFamily: "var(--font-serif)" }}
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
                          style={{ fontFamily: "var(--font-serif)" }}
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
                  style={{ fontFamily: "var(--font-serif)" }}
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

            {/* Trigger Settings */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Trigger Settings
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Trigger Type
                    </label>
                    <select
                      value={formData.triggerType}
                      onChange={(e) => updateField("triggerType", e.target.value)}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      <option value="automatic">Automatic</option>
                      <option value="interact">Interact</option>
                      <option value="discovery">Discovery</option>
                      <option value="event">Event</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Event ID
                    </label>
                    <input
                      type="text"
                      value={formData.triggerEvent}
                      onChange={(e) => updateField("triggerEvent", e.target.value)}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-mono)" }}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.playOnce}
                      onChange={(e) => updateField("playOnce", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span
                      className="text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Play only once per character
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showInGame}
                      onChange={(e) => updateField("showInGame", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span
                      className="text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Show in game
                    </span>
                  </label>
                </div>
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
                {formData.type === "dialogue" ? (
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
                          style={{ fontFamily: "var(--font-serif)" }}
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
                    style={{ fontFamily: "var(--font-serif)", lineHeight: "1.7" }}
                  >
                    {formData.bodyText.slice(0, 300)}
                    {formData.bodyText.length > 300 && "..."}
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
                  backgroundColor: typeColors[formData.type] + "20",
                  color: typeColors[formData.type],
                  fontFamily: "var(--font-sans)",
                }}
              >
                {formData.type}
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
                {formData.type === "dialogue" && (
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
