import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Plus, Search, Filter, AlertCircle } from "lucide-react";
import { listCreatures, AdminAPIError } from "../../lib/admin-api";

type Status = "draft" | "review" | "published" | "deprecated";

interface Creature {
  id: string;
  name: string;
  type: string;
  maxHp: number;
  biomeAffinity?: string[];
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

export default function CreaturesList() {
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<Status | "all">("all");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    loadCreatures();
  }, []);

  const loadCreatures = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listCreatures<Creature>();
      setCreatures(data);
    } catch (err) {
      if (err instanceof AdminAPIError) {
        setError(err.message);
      } else {
        setError('Failed to load creatures');
      }
      console.error('Failed to load creatures:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCreatures = creatures.filter((creature) => {
    const matchesSearch =
      creature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creature.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || creature.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const toggleRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedRows(
      selectedRows.length === filteredCreatures.length
        ? []
        : filteredCreatures.map((c) => c.id)
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[#C9A84C] text-2xl"
         
        >
          Creatures
        </h1>
        <Link
          to="/admin/creatures/new"
          className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
        >
          <Plus className="w-4 h-4" />
          Create Creature
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-[#8B2500] border border-[#A52A00] rounded-lg p-4 mb-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#E8E0D0]" />
          <div>
            <p className="text-[#E8E0D0] font-semibold" style={{ fontFamily: "var(--font-sans)" }}>
              Failed to load creatures
            </p>
            <p className="text-[#E8E0D0] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-8 text-center">
          <p className="text-[#8A8B95]" style={{ fontFamily: "var(--font-sans)" }}>
            Loading creatures...
          </p>
        </div>
      )}

      {/* Filters */}
      {!loading && (
      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-4 mb-4 flex items-center gap-4">
        <Filter className="w-4 h-4 text-[#8A8B95]" />
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as Status | "all")}
          className="bg-[#1C1D27] border border-[#2A2B35] rounded px-3 py-1.5 text-[#E8E0D0] text-sm focus:border-[#C9A84C] focus:outline-none"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="review">In Review</option>
          <option value="published">Published</option>
          <option value="deprecated">Deprecated</option>
        </select>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4B55]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creatures..."
            className="w-full pl-10 pr-4 py-1.5 bg-[#1C1D27] border border-[#2A2B35] rounded text-[#E8E0D0] placeholder-[#4A4B55] focus:border-[#C9A84C] focus:outline-none text-sm"
            style={{ fontFamily: "var(--font-sans)" }}
          />
        </div>
      </div>
      )}

      {/* Bulk Actions */}
      {!loading && selectedRows.length > 0 && (
        <div className="bg-[#3A7D7B] border border-[#2D6B4F] rounded-lg p-3 mb-4 flex items-center justify-between">
          <span
            className="text-[#E8E0D0] text-sm"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {selectedRows.length} selected
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-[#2D6B4F] hover:bg-[#256B4A] text-[#E8E0D0] rounded text-sm transition-colors"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Publish
            </button>
            <button
              className="px-3 py-1 bg-[#8B2500] hover:bg-[#7A2100] text-[#E8E0D0] rounded text-sm transition-colors"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Deprecate
            </button>
            <button
              className="px-3 py-1 bg-[#1C1D27] hover:bg-[#2A2B35] text-[#E8E0D0] rounded text-sm transition-colors"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Delete Draft
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && (
      <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1C1D27] border-b border-[#2A2B35]">
            <tr>
              <th className="p-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedRows.length === filteredCreatures.length}
                  onChange={toggleAll}
                  className="w-4 h-4"
                />
              </th>
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
                HP
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Biome(s)
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
            {filteredCreatures.map((creature) => (
              <tr
                key={creature.id}
                className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors cursor-pointer"
              >
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(creature.id)}
                    onChange={() => toggleRow(creature.id)}
                    className="w-4 h-4"
                  />
                </td>
                <td className="p-4">
                  <Link
                    to={`/admin/creatures/${creature.id}`}
                    className="text-[#E8E0D0] hover:text-[#C9A84C] transition-colors"
                   
                  >
                    {creature.name}
                  </Link>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {creature.type}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {creature.maxHp}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-1">
                    {creature.biomeAffinity?.map((biome) => (
                      <span
                        key={biome}
                        className="px-2 py-1 bg-[#1C1D27] text-[#8A8B95] text-xs rounded"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {biome}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4">{getStatusBadge(creature.status || "draft")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Pagination */}
      {!loading && (
      <div className="mt-4 flex items-center justify-between">
        <span
          className="text-[#8A8B95] text-sm"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Showing {filteredCreatures.length} of {creatures.length}
        </span>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-[#1C1D27] hover:bg-[#2A2B35] text-[#8A8B95] rounded text-sm transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            ◀ Previous
          </button>
          <button
            className="px-3 py-1 bg-[#1C1D27] hover:bg-[#2A2B35] text-[#E8E0D0] rounded text-sm transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            1
          </button>
          <button
            className="px-3 py-1 bg-[#1C1D27] hover:bg-[#2A2B35] text-[#8A8B95] rounded text-sm transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Next ▶
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
