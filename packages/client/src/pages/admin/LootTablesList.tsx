import { useState } from "react";
import { Link } from "react-router";
import { Plus, Search } from "lucide-react";
import { useAdminEntityList } from "../../hooks/useAdminEntityList.js";

interface LootTableEntry {
  itemId: string;
  dropWeight: number;
  minQuantity: number;
  maxQuantity: number;
}

interface LootTable {
  id: string;
  name: string;
  description: string;
  entries: LootTableEntry[];
  minDrops: number;
  maxDrops: number;
}

export default function LootTablesList() {
  const { data: lootTables, loading, error } = useAdminEntityList<LootTable>("loot-tables");
  const [searchQuery, setSearchQuery] = useState("");

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-[#8A8B95]" style={{ fontFamily: "var(--font-sans)" }}>
          Loading loot tables...
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

  const filteredTables = lootTables.filter((table) => {
    const matchesSearch =
      table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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
                ID
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Description
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Entries
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Min Drops
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Max Drops
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
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {table.id}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {table.description && table.description.length > 60
                      ? table.description.substring(0, 60) + "..."
                      : table.description}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {table.entries?.length ?? 0}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {table.minDrops}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {table.maxDrops}
                  </span>
                </td>
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