import { useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Save, Send, Plus, X } from "lucide-react";

type ModifierType = "buff" | "debuff" | "status" | "passive" | "curse" | "blessing";
type EffectType = "stat_change" | "dot" | "hot" | "resist" | "vulnerability" | "special";
type StackBehavior = "none" | "refresh" | "extend" | "intensity";

interface Effect {
  type: EffectType;
  stat?: string;
  value: number;
  isPercent: boolean;
}

export default function ModifiersDetail() {
  const { id } = useParams();
  const isNew = id === "new";

  const [formData, setFormData] = useState({
    slug: "blade_fury",
    displayName: "Blade Fury",
    description: "Your strikes become faster and more devastating. Attack speed increased by 25% and damage increased by 15%.",
    type: "buff" as ModifierType,
    icon: "⚔️",
    color: "#2D6B4F",
    // Duration
    isPermanent: false,
    baseDuration: 60,
    // Stacking
    stackable: false,
    stackBehavior: "none" as StackBehavior,
    maxStacks: 1,
    // Visual
    showInUI: true,
    particleEffect: "golden_shimmer",
  });

  const [effects, setEffects] = useState<Effect[]>([
    { type: "stat_change", stat: "attack_speed", value: 25, isPercent: true },
    { type: "stat_change", stat: "damage", value: 15, isPercent: true },
  ]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addEffect = () => {
    setEffects((prev) => [
      ...prev,
      { type: "stat_change", stat: "", value: 0, isPercent: false },
    ]);
  };

  const removeEffect = (index: number) => {
    setEffects((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEffect = (index: number, field: string, value: any) => {
    setEffects((prev) =>
      prev.map((effect, i) =>
        i === index ? { ...effect, [field]: value } : effect
      )
    );
  };

  const typeColors: Record<ModifierType, string> = {
    buff: "#2D6B4F",
    debuff: "#8B2500",
    status: "#B8860B",
    passive: "#3A7D7B",
    curse: "#6B4E9B",
    blessing: "#C9A84C",
  };

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
            {isNew ? "New Modifier" : formData.displayName}
          </h1>
          {!isNew && (
            <span
              className="px-2 py-1 bg-[#2D6B4F] text-[#E8E0D0] text-xs rounded"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              ✅ Published v3
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
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => updateField("type", e.target.value)}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      <option value="buff">Buff</option>
                      <option value="debuff">Debuff</option>
                      <option value="status">Status Effect</option>
                      <option value="passive">Passive</option>
                      <option value="curse">Curse</option>
                      <option value="blessing">Blessing</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className="block text-[#8A8B95] text-sm mb-2"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Icon (emoji)
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => updateField("icon", e.target.value)}
                      className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-center text-2xl"
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

            {/* Duration & Stacking */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Duration & Stacking
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPermanent}
                      onChange={(e) => updateField("isPermanent", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span
                      className="text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Permanent (no duration)
                    </span>
                  </label>
                  {!formData.isPermanent && (
                    <div className="flex-1 flex items-center gap-2">
                      <label
                        className="text-[#8A8B95] text-sm"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        Base Duration:
                      </label>
                      <input
                        type="number"
                        value={formData.baseDuration}
                        onChange={(e) => updateField("baseDuration", parseInt(e.target.value))}
                        className="w-24 bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                      <span
                        className="text-[#8A8B95] text-sm"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        seconds
                      </span>
                    </div>
                  )}
                </div>
                <div className="border-t border-[#2A2B35] pt-4">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={formData.stackable}
                      onChange={(e) => updateField("stackable", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span
                      className="text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Stackable
                    </span>
                  </label>
                  {formData.stackable && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div>
                        <label
                          className="block text-[#8A8B95] text-sm mb-2"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          Stack Behavior
                        </label>
                        <select
                          value={formData.stackBehavior}
                          onChange={(e) => updateField("stackBehavior", e.target.value)}
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          <option value="refresh">Refresh duration</option>
                          <option value="extend">Extend duration</option>
                          <option value="intensity">Increase intensity</option>
                        </select>
                      </div>
                      <div>
                        <label
                          className="block text-[#8A8B95] text-sm mb-2"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          Max Stacks
                        </label>
                        <input
                          type="number"
                          value={formData.maxStacks}
                          onChange={(e) => updateField("maxStacks", parseInt(e.target.value))}
                          className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Effects */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-[#C9A84C] text-lg"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Effects
                </h2>
                <button
                  onClick={addEffect}
                  className="px-3 py-1.5 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <Plus className="w-3 h-3" />
                  Add Effect
                </button>
              </div>
              <div className="space-y-3">
                {effects.map((effect, index) => (
                  <div
                    key={index}
                    className="bg-[#1C1D27] rounded p-4 flex items-start gap-3"
                  >
                    <div className="flex-1 grid grid-cols-4 gap-3">
                      <div>
                        <label
                          className="block text-[#8A8B95] text-xs mb-1"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          Effect Type
                        </label>
                        <select
                          value={effect.type}
                          onChange={(e) => updateEffect(index, "type", e.target.value)}
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          <option value="stat_change">Stat Change</option>
                          <option value="dot">Damage Over Time</option>
                          <option value="hot">Heal Over Time</option>
                          <option value="resist">Resistance</option>
                          <option value="vulnerability">Vulnerability</option>
                          <option value="special">Special</option>
                        </select>
                      </div>
                      {effect.type === "stat_change" && (
                        <div>
                          <label
                            className="block text-[#8A8B95] text-xs mb-1"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            Stat
                          </label>
                          <select
                            value={effect.stat}
                            onChange={(e) => updateEffect(index, "stat", e.target.value)}
                            className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            <option value="attack_speed">Attack Speed</option>
                            <option value="damage">Damage</option>
                            <option value="defense">Defense</option>
                            <option value="max_hp">Max HP</option>
                            <option value="stamina_regen">Stamina Regen</option>
                            <option value="move_speed">Move Speed</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label
                          className="block text-[#8A8B95] text-xs mb-1"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          Value
                        </label>
                        <input
                          type="number"
                          value={effect.value}
                          onChange={(e) => updateEffect(index, "value", parseFloat(e.target.value))}
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-[#8A8B95] text-xs mb-1"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          Type
                        </label>
                        <select
                          value={effect.isPercent ? "percent" : "flat"}
                          onChange={(e) => updateEffect(index, "isPercent", e.target.value === "percent")}
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          <option value="flat">Flat</option>
                          <option value="percent">Percent</option>
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={() => removeEffect(index)}
                      className="text-[#8B2500] hover:text-[#E8E0D0] transition-colors mt-5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Settings */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Visual Settings
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showInUI}
                    onChange={(e) => updateField("showInUI", e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Show in UI status bar
                  </span>
                </label>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Particle Effect
                  </label>
                  <select
                    value={formData.particleEffect}
                    onChange={(e) => updateField("particleEffect", e.target.value)}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <option value="none">None</option>
                    <option value="golden_shimmer">Golden Shimmer</option>
                    <option value="dark_smoke">Dark Smoke</option>
                    <option value="blood_drops">Blood Drops</option>
                    <option value="healing_sparkles">Healing Sparkles</option>
                  </select>
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
                In-Game Preview
              </h3>
              <div className="bg-[#1C1D27] rounded p-4 space-y-3">
                {/* Status bar preview */}
                <div className="flex items-center gap-2 bg-[#0A0B0F] rounded p-2">
                  <span className="text-2xl">{formData.icon}</span>
                  <div className="flex-1">
                    <div
                      className="text-sm"
                      style={{ fontFamily: "var(--font-serif)", color: formData.color }}
                    >
                      {formData.displayName}
                    </div>
                    {!formData.isPermanent && (
                      <div
                        className="text-xs text-[#8A8B95]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {formData.baseDuration}s
                      </div>
                    )}
                  </div>
                  {formData.stackable && (
                    <div
                      className="px-2 py-1 bg-[#2A2B35] rounded text-xs"
                      style={{ fontFamily: "var(--font-mono)", color: "#E8E0D0" }}
                    >
                      ×{formData.maxStacks}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div
                  className="text-xs text-[#8A8B95] bg-[#0A0B0F] rounded p-3"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {formData.description}
                </div>

                {/* Effects preview */}
                <div className="space-y-1">
                  {effects.map((effect, i) => (
                    <div
                      key={i}
                      className="text-xs flex items-center gap-1"
                      style={{ fontFamily: "var(--font-mono)", color: "#E8E0D0" }}
                    >
                      <span className="text-[#2D6B4F]">+</span>
                      <span>
                        {effect.value}
                        {effect.isPercent ? "%" : ""} {effect.stat?.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Type Badge */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Classification
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
