import { useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Filter, Book } from "lucide-react";

type NarrativeType = "dialogue" | "lore" | "quest" | "event" | "discovery" | "epilogue";

interface NarrativeEntry {
  id: string;
  title: string;
  slug: string;
  type: NarrativeType;
  category: string;
  wordCount: number;
  conditions: number;
  lastEdited: string;
  status: "published" | "draft" | "review";
}

const narrativeEntries: NarrativeEntry[] = [
  {
    id: "1",
    title: "The Warden's Warning",
    slug: "warden_warning",
    type: "dialogue",
    category: "The Refuge",
    wordCount: 245,
    conditions: 0,
    lastEdited: "2 hours ago",
    status: "published",
  },
  {
    id: "2",
    title: "Chronicle of the Drowned",
    slug: "chronicle_drowned",
    type: "lore",
    category: "Flooded Crypt",
    wordCount: 512,
    conditions: 1,
    lastEdited: "1 day ago",
    status: "published",
  },
  {
    id: "3",
    title: "Reclaim the Lost Relic",
    slug: "reclaim_relic",
    type: "quest",
    category: "The Refuge",
    wordCount: 320,
    conditions: 3,
    lastEdited: "3 days ago",
    status: "review",
  },
  {
    id: "4",
    title: "First Shard Entry",
    slug: "first_shard_entry",
    type: "event",
    category: "Tutorial",
    wordCount: 180,
    conditions: 2,
    lastEdited: "5 days ago",
    status: "published",
  },
  {
    id: "5",
    title: "Ancient Inscription",
    slug: "ancient_inscription",
    type: "discovery",
    category: "Flooded Crypt",
    wordCount: 95,
    conditions: 1,
    lastEdited: "1 week ago",
    status: "published",
  },
  {
    id: "6",
    title: "Merchant's Bargain",
    slug: "merchant_bargain",
    type: "dialogue",
    category: "The Refuge",
    wordCount: 420,
    conditions: 2,
    lastEdited: "2 weeks ago",
    status: "draft",
  },
];

const typeColors: Record<NarrativeType, string> = {
  dialogue: "#3A7D7B",
  lore: "#C9A84C",
  quest: "#6B4E9B",
  event: "#2D6B4F",
  discovery: "#B8860B",
  epilogue: "#8B2500",
};

const typeIcons: Record<NarrativeType, string> = {
  dialogue: "💬",
  lore: "📜",
  quest: "⚔️",
  event: "✨",
  discovery: "🔍",
  epilogue: "🏁",
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

export default function NarrativeList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<NarrativeType | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredEntries = narrativeEntries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || entry.type === selectedType;
    const matchesCategory = selectedCategory === "all" || entry.category === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const categories = Array.from(new Set(narrativeEntries.map(e => e.category)));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Book className="w-7 h-7 text-[#C9A84C]" />
          <h1
            className="text-[#C9A84C] text-2xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Narrative Content
          </h1>
        </div>
        <Link
          to="/admin/narrative/new"
          className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
        >
          <Plus className="w-4 h-4" />
          Create Narrative
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-4 mb-4 flex items-center gap-4">
        <Filter className="w-4 h-4 text-[#8A8B95]" />
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as NarrativeType | "all")}
          className="bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <option value="all">All Types</option>
          <option value="dialogue">Dialogue</option>
          <option value="lore">Lore</option>
          <option value="quest">Quest</option>
          <option value="event">Event</option>
          <option value="discovery">Discovery</option>
          <option value="epilogue">Epilogue</option>
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4B55]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search narrative..."
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
                Title
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
                Category
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Words
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Conditions
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Last Edited
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
            {filteredEntries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors cursor-pointer"
              >
                <td className="p-4">
                  <Link
                    to={`/admin/narrative/${entry.id}`}
                    className="text-[#E8E0D0] hover:text-[#C9A84C] transition-colors"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {entry.title}
                  </Link>
                </td>
                <td className="p-4">
                  <span
                    className="px-2 py-1 rounded text-xs capitalize inline-flex items-center gap-1"
                    style={{
                      backgroundColor: typeColors[entry.type] + "20",
                      color: typeColors[entry.type],
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    <span>{typeIcons[entry.type]}</span>
                    <span>{entry.type}</span>
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {entry.category}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {entry.wordCount.toLocaleString()}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {entry.conditions > 0 ? entry.conditions : "—"}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {entry.lastEdited}
                  </span>
                </td>
                <td className="p-4">{getStatusBadge(entry.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="mt-4 text-[#8A8B95] text-sm"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        Showing {filteredEntries.length} of {narrativeEntries.length} narrative entries
      </div>
    </div>
  );
}