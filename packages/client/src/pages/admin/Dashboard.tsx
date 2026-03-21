import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";

const stats = [
  { label: "Total Creatures", value: 47, icon: CheckCircle, color: "#2D6B4F" },
  { label: "In Review", value: 3, icon: Clock, color: "#B8860B" },
  { label: "Published", value: 38, icon: CheckCircle, color: "#2D6B4F" },
  { label: "Deprecated", value: 2, icon: XCircle, color: "#8B2500" },
];

const recentChanges = [
  {
    id: 1,
    author: "Jane",
    action: "edited",
    entity: "Drowned Revenant",
    time: "2 min ago",
  },
  {
    id: 2,
    author: "Bob",
    action: "published",
    entity: "Fungal Deep biome",
    time: "1h ago",
  },
  {
    id: 3,
    author: "Jane",
    action: "added",
    entity: "Iron Greatsword",
    time: "3h ago",
  },
];

const pendingReviews = [
  { id: 1, entity: "Cinder Wraith", author: "Jane", time: "3h ago" },
  { id: 2, entity: "Ember Rift biome", author: "Bob", time: "1d ago" },
];

const contentCoverage = [
  { domain: "Creatures", current: 8, target: 10, percentage: 80 },
  { domain: "Items", current: 18, target: 18, percentage: 100 },
  { domain: "Biomes", current: 1, target: 5, percentage: 20 },
  { domain: "Modifiers", current: 5, target: 8, percentage: 62.5 },
  { domain: "Skills", current: 0, target: 12, percentage: 0 },
];

const warnings = [
  "2 creatures have empty loot tables",
  "Shattered Bastion missing room names",
];

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1
        className="text-[#C9A84C] text-2xl mb-6"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Dashboard
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6"
            >
              <div className="flex items-start justify-between mb-2">
                <p
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {stat.label}
                </p>
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <p
                className="text-[#E8E0D0] text-3xl font-bold"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Recent Changes */}
        <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
          <h2
            className="text-[#C9A84C] text-lg mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Recent Changes
          </h2>
          <div className="space-y-3">
            {recentChanges.map((change) => (
              <div key={change.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-[#0A0B0F] text-sm font-bold">
                  {change.author[0]}
                </div>
                <div className="flex-1">
                  <p
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <span className="text-[#C9A84C]">{change.author}</span>{" "}
                    {change.action}{" "}
                    <span className="text-[#8A8B95]">{change.entity}</span>
                  </p>
                  <p
                    className="text-[#4A4B55] text-xs"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {change.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-4 text-[#3A7D7B] hover:text-[#C9A84C] text-sm transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            View All Activity →
          </button>
        </div>

        {/* Pending Reviews */}
        <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
          <h2
            className="text-[#C9A84C] text-lg mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Pending Reviews
          </h2>
          <div className="space-y-3">
            {pendingReviews.map((review) => (
              <div
                key={review.id}
                className="p-3 bg-[#1C1D27] rounded border border-[#2A2B35] hover:border-[#C9A84C] transition-colors cursor-pointer"
              >
                <p
                  className="text-[#E8E0D0] text-sm mb-1"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {review.entity}
                </p>
                <p
                  className="text-[#8A8B95] text-xs"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  by {review.author} — {review.time}
                </p>
              </div>
            ))}
          </div>
          <button
            className="mt-4 text-[#3A7D7B] hover:text-[#C9A84C] text-sm transition-colors"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Review All →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Content Coverage */}
        <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
          <h2
            className="text-[#C9A84C] text-lg mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Content Coverage
          </h2>
          <div className="space-y-4">
            {contentCoverage.map((item) => (
              <div key={item.domain}>
                <div className="flex justify-between items-center mb-2">
                  <span
                    className="text-[#E8E0D0] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {item.domain}
                  </span>
                  <span
                    className="text-[#8A8B95] text-xs"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {item.current}/{item.target}
                  </span>
                </div>
                <div className="h-2 bg-[#1C1D27] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#2D6B4F] to-[#C9A84C]"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Warnings */}
        <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
          <h2
            className="text-[#C9A84C] text-lg mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Validation Warnings
          </h2>
          <div className="space-y-3">
            {warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-[#B8860B] flex-shrink-0 mt-0.5" />
                <p
                  className="text-[#E8E0D0] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {warning}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
