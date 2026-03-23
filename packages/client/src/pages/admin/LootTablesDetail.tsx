import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { ArrowLeft, Save, Plus, X, Dice6 } from "lucide-react";
import { useAdminEntity } from "../../hooks/useAdminEntity.js";

interface LootTableEntry {
  itemId: string;
  dropWeight: number;
  minQuantity: number;
  maxQuantity: number;
}

interface LootTableData {
  id: string;
  name: string;
  description: string;
  entries: LootTableEntry[];
  minDrops: number;
  maxDrops: number;
}

export default function LootTablesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const { data: apiData, loading, error, saving, saveError, save } = useAdminEntity<LootTableData>(
    "loot-tables",
    id,
    isNew
  );

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    minDrops: 0,
    maxDrops: 0,
  });

  const [lootEntries, setLootEntries] = useState<LootTableEntry[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (apiData && !isNew) {
      setFormData({
        id: apiData.id,
        name: apiData.name,
        description: apiData.description,
        minDrops: apiData.minDrops,
        maxDrops: apiData.maxDrops,
      });
      setLootEntries(apiData.entries ?? []);
    }
  }, [apiData, isNew]);

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return "Name is required";
    }
    if (!formData.id.trim()) {
      return "ID is required";
    }
    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      setValidationError(error);
      return;
    }
    
    setValidationError(null);
    try {
      await save({
        ...formData,
        entries: lootEntries,
      } as LootTableData);
      if (isNew) {
        navigate("/admin/loot-tables");
      }
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addLootEntry = () => {
    setLootEntries((prev) => [
      ...prev,
      {
        itemId: "",
        dropWeight: 10,
        minQuantity: 1,
        maxQuantity: 1,
      },
    ]);
  };

  const removeLootEntry = (index: number) => {
    setLootEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLootEntry = (index: number, field: string, value: any) => {
    setLootEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    );
  };

  const totalWeight = lootEntries.reduce((sum, entry) => sum + entry.dropWeight, 0);

  const calculateDropChance = (weight: number) => {
    if (totalWeight === 0) return 0;
    return ((weight / totalWeight) * 100).toFixed(2);
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
            to="/admin/loot-tables"
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1
            className="text-[#C9A84C] text-xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {isNew ? "New Loot Table" : formData.name}
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
                    rows={2}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none resize-none"
                    style={{ fontFamily: "var(--font-serif)" }}
                  />
                </div>
              </div>
            </div>

            {/* Drop Settings */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h2
                className="text-[#C9A84C] text-lg mb-4"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Drop Settings
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Min Drops
                  </label>
                  <input
                    type="number"
                    value={formData.minDrops}
                    onChange={(e) => updateField("minDrops", parseInt(e.target.value))}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[#8A8B95] text-sm mb-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Max Drops
                  </label>
                  <input
                    type="number"
                    value={formData.maxDrops}
                    onChange={(e) => updateField("maxDrops", parseInt(e.target.value))}
                    className="w-full bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-2 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>
            </div>

            {/* Loot Entries */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2
                    className="text-[#C9A84C] text-lg"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    Loot Pool
                  </h2>
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Total Weight: {totalWeight}
                  </span>
                </div>
                <button
                  onClick={addLootEntry}
                  className="px-3 py-1.5 border border-[#3A7D7B] hover:bg-[#1C1D27] text-[#3A7D7B] rounded transition-colors flex items-center gap-2 text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  <Plus className="w-3 h-3" />
                  Add Item
                </button>
              </div>
              <div className="space-y-2">
                {lootEntries.map((entry, index) => (
                  <div
                    key={index}
                    className="bg-[#1C1D27] rounded p-3 flex items-center gap-3"
                  >
                    <div className="flex-1 grid grid-cols-5 gap-2">
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={entry.itemId}
                          onChange={(e) => updateLootEntry(index, "itemId", e.target.value)}
                          placeholder="Item ID"
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                      </div>
                      <div className="flex gap-1 items-center">
                        <input
                          type="number"
                          value={entry.minQuantity}
                          onChange={(e) => updateLootEntry(index, "minQuantity", parseInt(e.target.value))}
                          placeholder="Min"
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm text-center"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                        <span className="text-[#8A8B95]">–</span>
                        <input
                          type="number"
                          value={entry.maxQuantity}
                          onChange={(e) => updateLootEntry(index, "maxQuantity", parseInt(e.target.value))}
                          placeholder="Max"
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm text-center"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={entry.dropWeight}
                          onChange={(e) => updateLootEntry(index, "dropWeight", parseInt(e.target.value))}
                          placeholder="Weight"
                          className="w-full bg-[#0A0B0F] border border-[#2A2B35] rounded px-2 py-1.5 text-[#E8E0D0] focus:border-[#C9A84C] focus:outline-none text-sm"
                          style={{ fontFamily: "var(--font-mono)" }}
                        />
                      </div>
                      <div className="flex items-center">
                        <span
                          className="text-[#8A8B95] text-xs"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {calculateDropChance(entry.dropWeight)}%
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLootEntry(index)}
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
                  <span className="text-[#8A8B95]">Total Items:</span>
                  <span>{lootEntries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8B95]">Total Weight:</span>
                  <span>{totalWeight}</span>
                </div>
                <div className="border-t border-[#2A2B35] pt-2 mt-2"></div>
                <div className="flex justify-between">
                  <span className="text-[#8A8B95]">Drop Range:</span>
                  <span>{formData.minDrops}–{formData.maxDrops}</span>
                </div>
              </div>
            </div>

            {/* Drop Simulator */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4 flex items-center gap-2"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <Dice6 className="w-4 h-4" />
                Drop Simulator
              </h3>
              <button
                className="w-full px-4 py-2 bg-[#1C1D27] hover:bg-[#2A2B35] border border-[#2A2B35] text-[#E8E0D0] rounded transition-colors text-sm"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Simulate 10 Drops
              </button>
              <div className="mt-4 p-3 bg-[#1C1D27] rounded text-xs space-y-1" style={{ fontFamily: "var(--font-mono)", color: "#8A8B95" }}>
                <div>Click to simulate drops...</div>
              </div>
            </div>

            {/* Weight Distribution */}
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] text-sm mb-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Weight Distribution
              </h3>
              <div className="space-y-2">
                {lootEntries.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span
                      className="text-[#E8E0D0] text-xs flex-1 truncate"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {entry.itemId || "(empty)"}
                    </span>
                    <span
                      className="text-[#8A8B95] text-xs"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {calculateDropChance(entry.dropWeight)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation */}
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
