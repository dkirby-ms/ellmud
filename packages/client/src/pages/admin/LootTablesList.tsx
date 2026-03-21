import { useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Filter } from "lucide-react";

type SourceType = "creature" | "chest" | "boss" | "quest" | "event" | "biome";

interface LootTable {
  id: string;
  name: string;
  slug: string;
  sourceType: SourceType;
  sourceEntity: string;
  itemCount: number;
  totalWeight: number;
  status: "published" | "draft" | "review";
}

const lootTables: LootTable[] = [
  {
    id: "1",
    name: "Drowned Revenant",
    slug: "drowned_revenant_loot",
    sourceType: "creature",
    sourceEntity: "Drowned Revenant",
    itemCount: 8,
    totalWeight: 100,
    status: "published",
  },
  {
    id: "2",
    name: "Flooded Chest - Common",
    slug: "flooded_chest_common",
    sourceType: "chest",
    sourceEntity: "Flooded Crypt",
    itemCount: 12,
    totalWeight: 150,
    status: "published",
  },
  {
    id: "3",
    name: "Crypt Guardian Boss",
    slug: "crypt_guardian_boss",
    sourceType: "boss",
    sourceEntity: "Crypt Guardian",
    itemCount: 15,
    totalWeight: 200,
    status: "review",
  },
  {
    id: "4",
    name: "Flooded Crypt Biome",
    slug: "flooded_crypt_biome",
    sourceType: "biome",
    sourceEntity: "Flooded Crypt",
    itemCount: 20,
    totalWeight: 250,
    status: "published",
  },
];

const sourceTypeColors: Record<SourceType, string> = {
  creature: "#8A8B95",
  chest: "#C9A84C",
  boss: "#8B2500",
  quest: "#3A7D7B",
  event: "#6B4E9B",
  biome: "#2D6B4F",
};

const getStatusBadge = (status: string) => {
  const badges = {
    draft: { emoji: "📝", label: "Draft", color: "#4A4B55" },
    review: { emoji: "⏳", label: "In Review", color: "#B8860B" },
    published: { emoji: "✅", label: "Published", color: "#2D6B4F" },
  };
  const badge = badges[status as keyof typeof badges];
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

export default function LootTablesList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<SourceType | "all">("all");

  const filteredTables = lootTables.filter((table) => {
    const matchesSearch =
      table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.sourceEntity.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || table.sourceType === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[#C9A84C] text-2xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Loot Tables
        </h1>
        <Link
          to="/admin/loot-tables/new"
          className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
        >
          <Plus className="w-4 h-4" />
          Create Loot Table
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-4 mb-4 flex items-center gap-4">
        <Filter className="w-4 h-4 text-[#8A8B95]" />
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as SourceType | "all")}
          className="bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <option value="all">All Sources</option>
          <option value="creature">Creature</option>
          <option value="chest">Chest</option>
          <option value="boss">Boss</option>
          <option value="quest">Quest</option>
          <option value="event">Event</option>
          <option value="biome">Biome</option>
        </select>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4B55]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search loot tables..."
            className="w-full pl-10 pr-4 py-1.5 bg-[#1C1D27] border border-[#2A2B35] rounded text-[#E8E0D0] placeholder-[#4A4B55] focus:border-[#C9A84C] focus:outline-none text-sm"
            style={{ fontFamily: "var(--font-sans)" }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1C1D27] border-b border-[#2A2B35]">
            <tr>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Name
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Source Type
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Source Entity
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Items
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Total Weight
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTables.map((table) => (
              <tr
                key={table.id}
                className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors cursor-pointer"
              >
                <td className="p-4">
                  <Link
                    to={`/admin/loot-tables/${table.id}`}
                    className="text-[#E8E0D0] hover:text-[#C9A84C] transition-colors"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {table.name}
                  </Link>
                </td>
                <td className="p-4">
                  <span
                    className="px-2 py-1 rounded text-xs capitalize"
                    style={{
                      backgroundColor: sourceTypeColors[table.sourceType] + "20",
                      color: sourceTypeColors[table.sourceType],
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {table.sourceType}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {table.sourceEntity}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {table.itemCount}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {table.totalWeight}
                  </span>
                </td>
                <td className="p-4">{getStatusBadge(table.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="mt-4 text-[#8A8B95] text-sm"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        Showing {filteredTables.length} of {lootTables.length} loot tables
      </div>
    </div>
  );
}