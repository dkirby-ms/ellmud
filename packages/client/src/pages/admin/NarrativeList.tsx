import { useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Filter, Book } from "lucide-react";
import { useAdminEntityList } from "../../hooks/useAdminEntityList.js";

type NarrativeType = "dialogue" | "lore" | "quest" | "event" | "discovery" | "epilogue";

interface NarrativeTemplate {
  id: string;
  name: string;
  narrativeType: string;
  template: string;
  tone: string;
  verbosity: string;
  tags: string[];
}

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

export default function NarrativeList() {
  const { data: narrativeEntries, loading, error } = useAdminEntityList<NarrativeTemplate>("narrative");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<NarrativeType | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-[#8A8B95]" style={{ fontFamily: "var(--font-sans)" }}>
          Loading narratives...
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

  const filteredEntries = narrativeEntries.filter((entry) => {
    const matchesSearch =
      entry.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || entry.narrativeType === selectedType;
    const matchesCategory = selectedCategory === "all" || entry.tone === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const categories = Array.from(new Set(narrativeEntries.map(e => e.tone)));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Book className="w-7 h-7 text-[#C9A84C]" />
          <h1
            className="text-[#C9A84C] text-2xl"
           
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
                Name
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
                Tone
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Tags
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
                   
                  >
                    {entry.name}
                  </Link>
                </td>
                <td className="p-4">
                  <span
                    className="px-2 py-1 rounded text-xs capitalize inline-flex items-center gap-1"
                    style={{
                      backgroundColor: (typeColors[entry.narrativeType as NarrativeType] ?? "#4A4B55") + "20",
                      color: typeColors[entry.narrativeType as NarrativeType] ?? "#4A4B55",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    <span>{typeIcons[entry.narrativeType as NarrativeType] ?? "📄"}</span>
                    <span>{entry.narrativeType}</span>
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {entry.tone}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-1 flex-wrap">
                    {(entry.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-[#1C1D27] text-[#8A8B95] text-xs rounded"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
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
        Showing {filteredEntries.length} of {narrativeEntries.length} narrative entries
      </div>
    </div>
  );
}