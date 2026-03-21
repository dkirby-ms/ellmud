import { useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Filter } from "lucide-react";

type ModifierType = "buff" | "debuff" | "status" | "passive" | "curse" | "blessing";

interface Modifier {
  id: string;
  name: string;
  slug: string;
  type: ModifierType;
  duration: number | "permanent";
  stackable: boolean;
  status: "published" | "draft" | "review";
}

const modifiers: Modifier[] = [
  {
    id: "1",
    name: "Blade Fury",
    slug: "blade_fury",
    type: "buff",
    duration: 60,
    stackable: false,
    status: "published",
  },
  {
    id: "2",
    name: "Drowning",
    slug: "drowning",
    type: "debuff",
    duration: 30,
    stackable: true,
    status: "published",
  },
  {
    id: "3",
    name: "Bleeding",
    slug: "bleeding",
    type: "status",
    duration: 45,
    stackable: true,
    status: "published",
  },
  {
    id: "4",
    name: "Iron Resolve",
    slug: "iron_resolve",
    type: "passive",
    duration: "permanent",
    stackable: false,
    status: "review",
  },
  {
    id: "5",
    name: "Mark of the Void",
    slug: "mark_void",
    type: "curse",
    duration: "permanent",
    stackable: false,
    status: "published",
  },
];

const typeColors: Record<ModifierType, string> = {
  buff: "#2D6B4F",
  debuff: "#8B2500",
  status: "#B8860B",
  passive: "#3A7D7B",
  curse: "#6B4E9B",
  blessing: "#C9A84C",
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

export default function ModifiersList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ModifierType | "all">("all");

  const filteredModifiers = modifiers.filter((modifier) => {
    const matchesSearch =
      modifier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      modifier.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || modifier.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[#C9A84C] text-2xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Modifiers
        </h1>
        <Link
          to="/admin/modifiers/new"
          className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
        >
          <Plus className="w-4 h-4" />
          Create Modifier
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-4 mb-4 flex items-center gap-4">
        <Filter className="w-4 h-4 text-[#8A8B95]" />
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as ModifierType | "all")}
          className="bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <option value="all">All Types</option>
          <option value="buff">Buff</option>
          <option value="debuff">Debuff</option>
          <option value="status">Status Effect</option>
          <option value="passive">Passive</option>
          <option value="curse">Curse</option>
          <option value="blessing">Blessing</option>
        </select>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4B55]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search modifiers..."
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
                Slug
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Type
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Duration
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Stackable
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
            {filteredModifiers.map((modifier) => (
              <tr
                key={modifier.id}
                className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors cursor-pointer"
              >
                <td className="p-4">
                  <Link
                    to={`/admin/modifiers/${modifier.id}`}
                    className="text-[#E8E0D0] hover:text-[#C9A84C] transition-colors"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {modifier.name}
                  </Link>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {modifier.slug}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="px-2 py-1 rounded text-xs capitalize"
                    style={{
                      backgroundColor: typeColors[modifier.type] + "20",
                      color: typeColors[modifier.type],
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {modifier.type}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {modifier.duration === "permanent"
                      ? "∞"
                      : `${modifier.duration}s`}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {modifier.stackable ? "✓" : "—"}
                  </span>
                </td>
                <td className="p-4">{getStatusBadge(modifier.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="mt-4 text-[#8A8B95] text-sm"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        Showing {filteredModifiers.length} of {modifiers.length} modifiers
      </div>
    </div>
  );
}