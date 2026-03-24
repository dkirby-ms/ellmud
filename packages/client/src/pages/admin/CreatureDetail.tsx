import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Save, Send, X, Plus, AlertCircle } from "lucide-react";
import { getCreature, createCreature, updateCreature, AdminAPIError, simulateCreatureReroll, type CreatureRerollResult } from "../../lib/admin-api";

type Status = "draft" | "review" | "published" | "deprecated";

interface LootEntry {
  itemId: string;
  itemName: string;
  weight: number;
}

interface CreatureFormData {
  type: string;
  name: string;
  description: string;
  behavior: string;
  maxHp: number;
  attack: number;
  defence: number;
  armour: number;
  minCount: number;
  maxCount: number;
  preferredRooms: string[];
  forbiddenRooms: string[];
  idleTicksMin: number;
  idleTicksMax: number;
  fleeThreshold: number;
  biomeAffinity: string[];
  tierMin: number;
  tierMax: number;
  status?: Status;
}

const getStatusBadge = (status: Status) => {
  const badges = {
    draft: { emoji: "📝", label: "Draft", color: "#4A4B55" },
    review: { emoji: "⏳", label: "In Review", color: "#B8860B" },
    published: { emoji: "✅", label: "Published", color: "#2D6B4F" },
    deprecated: { emoji: "⛔", label: "Deprecated", color: "#8B2500" },
  };
  const badge = badges[status];
  return (
    <span
      className="px-2 py-1 rounded text-xs inline-flex items-center gap-1"
      style={{
        backgroundColor: badge.color + "20",
        color: badge.color,
        fontFamily: "var(--font-sans)",
      }}
    >
      <span>{badge.emoji}</span>
      <span>{badge.label}</span>
    </span>
  );
};

export default function CreatureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const [formData, setFormData] = useState<CreatureFormData>({
    type: "",
    name: "",
    description: "",
    behavior: "guardian",
    maxHp: 50,
    attack: 10,
    defence: 3,
    armour: 3,
    minCount: 1,
    maxCount: 3,
    preferredRooms: [],
    forbiddenRooms: [],
    idleTicksMin: 3,
    idleTicksMax: 5,
    fleeThreshold: 0.25,
    biomeAffinity: [],
    tierMin: 1,
    tierMax: 3,
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [lootTable, setLootTable] = useState<LootEntry[]>([]);
  const [rerollResult, setRerollResult] = useState<CreatureRerollResult | null>(null);
  const [rerolling, setRerolling] = useState(false);
  const [rerollError, setRerollError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    const fetchCreature = async () => {
      try {
        setLoading(true);
        setError(null);
        const creature = await getCreature<Record<string, unknown>>(id!);
        setFormData(creature);
        // Load lootTable from API response
        if (creature.lootTable && Array.isArray(creature.lootTable)) {
          setLootTable(
            creature.lootTable.map((entry: Record<string, unknown>) => ({
              itemId: (entry.itemId as string) || "",
              itemName: (entry.name as string) || (entry.itemName as string) || "Unknown Item",
              weight: (entry.dropWeight as number) || (entry.weight as number) || 50,
            }))
          );
        }
      } catch (err) {
        if (err instanceof AdminAPIError) {
          setError(err.message);
        } else {
          setError('Failed to load creature');
        }
        console.error('Failed to fetch creature:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCreature();
  }, [id, isNew]);

  const updateField = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.type.trim()) errors.push("Type (slug) is required");
    if (!formData.name.trim()) errors.push("Name is required");
    if (formData.maxHp <= 0) errors.push("Max HP must be positive");
    if (formData.attack < 0) errors.push("Attack cannot be negative");
    if (formData.defence < 0) errors.push("Defence cannot be negative");
    if (formData.armour < 0) errors.push("Armour cannot be negative");
    if (formData.tierMin > formData.tierMax) errors.push("Tier min cannot exceed tier max");
    if (formData.fleeThreshold < 0 || formData.fleeThreshold > 1) {
      errors.push("Flee threshold must be between 0 and 1");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async (submitForReview: boolean) => {
    if (!validateForm()) return;
    try {
      setSaving(true);
      setError(null);
      // Include lootTable in payload
      const payload = {
        ...formData,
        lootTable: lootTable.map((entry) => ({
          itemId: entry.itemId,
          name: entry.itemName,
          dropWeight: entry.weight,
          weight: entry.weight,
        })),
        status: submitForReview ? ('review' as Status) : formData.status,
      };
      if (isNew) {
        await createCreature(payload);
        navigate('/admin/creatures');
      } else {
        await updateCreature(id!, payload);
      }
    } catch (err) {
      if (err instanceof AdminAPIError) {
        setError(err.message);
      } else {
        setError(submitForReview ? 'Failed to submit for review' : 'Failed to save creature');
      }
      console.error('Failed to save creature:', err);
    } finally {
      setSaving(false);
    }
  };

  const addLootEntry = () => {
    setLootTable([
      ...lootTable,
      { itemId: "", itemName: "Select Item", weight: 50 },
    ]);
  };

  const removeLootEntry = (index: number) => {
    setLootTable(lootTable.filter((_, i) => i !== index));
  };

  const updateLootEntry = (
    index: number,
    field: keyof LootEntry,
    value: string | number
  ) => {
    const updated = [...lootTable];
    updated[index] = { ...updated[index], [field]: value };
    setLootTable(updated);
  };

  const handleReroll = async () => {
    if (!id || isNew) return;
    
    setRerolling(true);
    setRerollError(null);
    try {
      const result = await simulateCreatureReroll(id, 5);
      setRerollResult(result);
    } catch (err) {
      setRerollError(err instanceof Error ? err.message : 'Failed to simulate reroll');
      setRerollResult(null);
    } finally {
      setRerolling(false);
    }
  };

  // Calculate loot probabilities
  const totalWeight = lootTable.reduce((sum, entry) => sum + entry.weight, 0);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[#8A8B95]" style={{ fontFamily: "var(--font-sans)" }}>
          Loading creature...
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/creatures"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-[#C9A84C] text-xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {isNew ? "New Creature" : formData.name}
          </h1>
          {!isNew && formData.status && getStatusBadge(formData.status)}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2 border border-[#8A8B95] hover:bg-[#1C1D27] text-[#8A8B95] hover:text-[#E8E0D0] rounded transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
          >
            <Send className="w-4 h-4" />
            {saving ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="m-8 bg-[#8B2500] border border-[#A52A00] rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#E8E0D0]" />
            <div>
              <p className="text-[#E8E0D0] font-semibold" style={{ fontFamily: "var(--font-sans)" }}>Error</p>
              <p className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-sans)" }}>{error}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-6 p-8">
          {/* Left Column - Editor Form */}
          <div className="col-span-2 space-y-6">
            {/* Identity Section */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Identity
              </h2>
              <div className="space-y-4">
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Type (slug)
                  </label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => updateField("type", e.target.value)}
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
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Behavior Archetype
                  </label>
                  <select
                    value={formData.behavior}
                    onChange={(e) => updateField("behavior", e.target.value)}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <option value="berserker">Berserker</option>
                    <option value="skulker">Skulker</option>
                    <option value="guardian">Guardian</option>
                    <option value="patrol">Patrol</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Combat Stats */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Combat Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Max HP
                  </label>
                  <input
                    type="number"
                    value={formData.maxHp}
                    onChange={(e) =>
                      updateField("maxHp", parseInt(e.target.value))
                    }
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                  <p
                    className="text-[#4A4B55] text-xs mt-1"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Typical Tier 1 range: 30–80 HP
                  </p>
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Attack
                  </label>
                  <input
                    type="number"
                    value={formData.attack}
                    onChange={(e) =>
                      updateField("attack", parseInt(e.target.value))
                    }
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Defence
                  </label>
                  <input
                    type="number"
                    value={formData.defence}
                    onChange={(e) =>
                      updateField("defence", parseInt(e.target.value))
                    }
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Armour
                  </label>
                  <input
                    type="number"
                    value={formData.armour}
                    onChange={(e) =>
                      updateField("armour", parseInt(e.target.value))
                    }
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>
            </div>

            {/* Loot Table */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Loot Table
              </h2>
              <div className="space-y-3">
                {lootTable.map((entry, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <select
                        value={entry.itemId}
                        onChange={(e) =>
                          updateLootEntry(index, "itemId", e.target.value)
                        }
                        className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        <option>{entry.itemName}</option>
                      </select>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={entry.weight}
                        onChange={(e) =>
                          updateLootEntry(
                            index,
                            "weight",
                            parseInt(e.target.value)
                          )
                        }
                        className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                        style={{ fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                    <div className="w-20 text-right">
                      <span
                        className="text-[#8A8B95] text-sm"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {totalWeight > 0 ? ((entry.weight / totalWeight) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                    <button
                      onClick={() => removeLootEntry(index)}
                      className="text-[#8B2500] hover:text-[#E8E0D0] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addLootEntry}
                  className="px-3 py-2 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <Plus className="w-4 h-4" />
                  Add Loot Entry
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Preview & Context */}
          <div className="space-y-6">
            {/* Preview */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Preview
              </h3>
              <div
                className="bg-[#1C1D27] rounded p-4 text-sm space-y-2"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <div className="text-[#E8E0D0]">
                  HP: {formData.maxHp} | ATK: {formData.attack}
                </div>
                <div className="text-[#E8E0D0]">
                  DEF: {formData.defence} | ARM: {formData.armour}
                </div>
                <div className="border-t border-[#2A2B35] my-2"></div>
                <div className="text-[#8A8B95]">
                  Flee at: {formData.fleeThreshold * 100}% HP
                </div>
                <div className="text-[#8A8B95]">
                  Tier: {formData.tierMin}-{formData.tierMax}
                </div>
              </div>
            </div>

            {/* Stat Re-roll Simulator */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Stat Re-roll Simulator
              </h3>
              <button
                onClick={handleReroll}
                disabled={rerolling || isNew}
                className="w-full px-3 py-2 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors text-sm disabled:opacity-50"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {rerolling ? "Re-rolling..." : "Re-roll Stats (5x)"}
              </button>
              {rerollError && (
                <div className="mt-3 p-2 bg-[#8B2500]/20 border border-[#8B2500] rounded text-xs text-[#E8E0D0]" style={{ fontFamily: "var(--font-sans)" }}>
                  Error: {rerollError}
                </div>
              )}
              {rerollResult && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-[#1C1D27] rounded">
                    <div className="text-[#C9A84C] text-xs font-semibold mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                      Baseline:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                      {Object.entries(rerollResult.baseline).map(([stat, value]) => (
                        <div key={stat} className="flex justify-between">
                          <span className="text-[#8A8B95] capitalize">{stat}:</span>
                          <span className="text-[#E8E0D0]">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {rerollResult.rolls.map((roll, idx) => (
                    <div key={idx} className="p-3 bg-[#1C1D27] rounded">
                      <div className="text-[#C9A84C] text-xs font-semibold mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                        Roll #{idx + 1}:
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                        {Object.entries(roll.stats).map(([stat, value]) => {
                          const baseline = rerollResult.baseline[stat] || 0;
                          const diff = value - baseline;
                          const color = diff > 0 ? "#3A7D7B" : diff < 0 ? "#8B2500" : "#8A8B95";
                          return (
                            <div key={stat} className="flex justify-between">
                              <span className="text-[#8A8B95] capitalize">{stat}:</span>
                              <span style={{ color }}>
                                {value} {diff !== 0 && `(${diff > 0 ? '+' : ''}${diff})`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {roll.modifiers && roll.modifiers.length > 0 && (
                        <div className="mt-2 text-xs text-[#8A8B95]" style={{ fontFamily: "var(--font-sans)" }}>
                          Modifiers: {roll.modifiers.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!rerollResult && !rerollError && !rerolling && (
                <div className="mt-4 p-3 bg-[#1C1D27] rounded text-xs text-[#8A8B95]" style={{ fontFamily: "var(--font-mono)" }}>
                  Click to simulate stat variations...
                </div>
              )}
            </div>

            {/* Version History */}
            {!isNew && (
              <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
                <h3
                  className="text-[#C9A84C] text-sm mb-4"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Version History
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-[#1C1D27] rounded">
                    <p
                      className="text-[#E8E0D0]"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      v3 (current) - Published
                    </p>
                    <p
                      className="text-[#8A8B95] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Jane, 2h ago
                    </p>
                  </div>
                  <div className="p-2 hover:bg-[#1C1D27] rounded cursor-pointer">
                    <p
                      className="text-[#8A8B95]"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      v2
                    </p>
                    <p
                      className="text-[#4A4B55] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Jane, 1d ago
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Validation */}
            {validationErrors.length > 0 ? (
              <div className="bg-[#8B2500] border border-[#A52A00] rounded-lg p-4">
                <p className="text-[#E8E0D0] text-sm font-semibold mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                  ⚠️ Validation Errors
                </p>
                <ul className="text-[#E8E0D0] text-sm space-y-1" style={{ fontFamily: "var(--font-sans)" }}>
                  {validationErrors.map((err, idx) => <li key={idx}>• {err}</li>)}
                </ul>
              </div>
            ) : (
              <div className="bg-[#2D6B4F] border border-[#256B4A] rounded-lg p-4">
                <p
                  className="text-[#E8E0D0] text-sm flex items-center gap-2"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <span>✅</span>
                  <span>All fields valid</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
