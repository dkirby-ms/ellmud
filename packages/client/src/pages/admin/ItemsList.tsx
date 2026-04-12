import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Plus, Search, Filter, AlertCircle } from "lucide-react";
import { listItems, AdminAPIError } from "../../lib/admin-api";
import AnsiText from "../../components/AnsiText.js";

type Status = "draft" | "review" | "published" | "deprecated";
type ItemType = "weapon" | "armour" | "consumable" | "material" | "tool" | "key" | "blueprint";
type GearTier = "scrap" | "common" | "sturdy" | "refined" | "masterwork" | "anomalous";

interface Item {
  id: string;
  name: string;
  type: ItemType;
  tier: GearTier;
  weight: number;
  soulbound: boolean;
  status?: Status;
}



const tierColors = {
  scrap: "#4A4B55",
  common: "#8A8B95",
  sturdy: "#2D6B4F",
  refined: "#3A7D7B",
  masterwork: "#6B4E9B",
  anomalous: "#C9A84C",
};

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

export default function ItemsList() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<Status | "all">("all");

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listItems<Item>();
        setItems(data);
      } catch (err) {
        if (err instanceof AdminAPIError) {
          setError(err.message);
        } else {
          setError('Failed to load items');
        }
        console.error('Failed to fetch items:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || item.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[#C9A84C] text-2xl"
         
        >
          Items
        </h1>
        <Link
          to="/admin/items/new"
          className="px-4 py-2 bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] rounded transition-colors flex items-center gap-2"
          style={{ fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}
        >
          <Plus className="w-4 h-4" />
          Create Item
        </Link>
      </div>

      {/* Filters */}
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
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-1.5 bg-[#1C1D27] border border-[#2A2B35] rounded text-[#E8E0D0] placeholder-[#4A4B55] focus:border-[#C9A84C] focus:outline-none text-sm"
            style={{ fontFamily: "var(--font-sans)" }}
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-[#8B2500] border border-[#A52A00] rounded-lg p-4 mb-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#E8E0D0]" />
          <div>
            <p className="text-[#E8E0D0] font-semibold" style={{ fontFamily: "var(--font-sans)" }}>
              Failed to load items
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
            Loading items...
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
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
                Tier
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Weight
              </th>
              <th
                className="p-4 text-left text-[#8A8B95] text-xs uppercase tracking-wider"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Soulbound
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
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[#2A2B35] hover:bg-[#1C1D27] transition-colors cursor-pointer"
              >
                <td className="p-4">
                  <Link
                    to={`/admin/items/${item.id}`}
                    className="text-[#E8E0D0] hover:text-[#C9A84C] transition-colors"
                   
                  >
                    <AnsiText text={item.name} />
                  </Link>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm capitalize"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {item.type}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="px-2 py-1 rounded text-xs capitalize"
                    style={{
                      backgroundColor: tierColors[item.tier] + "20",
                      color: tierColors[item.tier],
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {item.tier}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {item.weight}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {item.soulbound ? "✓" : "—"}
                  </span>
                </td>
                <td className="p-4">{item.status ? getStatusBadge(item.status) : <span className="text-[#4A4B55] text-sm">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-[#8A8B95]" style={{ fontFamily: "var(--font-sans)" }}>
              {searchQuery || selectedStatus !== "all" ? "No items match your filters" : "No items found"}
            </p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}