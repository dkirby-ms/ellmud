import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Server, Users, XCircle } from "lucide-react";
import {
  fetchDashboardMetrics,
  fetchRecentChanges,
  fetchValidationWarnings,
  type DashboardMetrics,
  type RecentChange,
  type ValidationWarning,
} from "../../lib/admin-api";

const REFRESH_INTERVAL_MS = 30_000;

const ENTITY_LABELS: Record<string, string> = {
  items: "Items",
  creatures: "Creatures",
  biomes: "Biomes",
  modifiers: "Modifiers",
  skills: "Skills",
  "loot-tables": "Loot Tables",
  factions: "Factions",
  rooms: "Rooms",
  narrative: "Narrative",
};

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 flex items-center justify-center min-h-[120px]">
      <div className="flex items-center gap-2 text-[#8A8B95]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm" style={{ fontFamily: "var(--font-sans)" }}>Loading {label}…</span>
      </div>
    </div>
  );
}

function ErrorCard({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="bg-[#12131A] border border-[#8B2500] rounded-lg p-6 flex flex-col items-center justify-center min-h-[120px] gap-2">
      <div className="flex items-center gap-2 text-[#8B2500]">
        <XCircle className="w-4 h-4" />
        <span className="text-sm" style={{ fontFamily: "var(--font-sans)" }}>Failed to load {label}</span>
      </div>
      <button
        onClick={onRetry}
        className="text-[#3A7D7B] hover:text-[#C9A84C] text-xs transition-colors"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        Retry
      </button>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(false);

  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([]);
  const [changesLoading, setChangesLoading] = useState(true);
  const [changesError, setChangesError] = useState(false);

  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [warningsLoading, setWarningsLoading] = useState(true);
  const [warningsError, setWarningsError] = useState(false);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(false);
    try {
      const data = await fetchDashboardMetrics();
      setMetrics(data);
    } catch {
      setMetricsError(true);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const loadRecentChanges = useCallback(async () => {
    setChangesLoading(true);
    setChangesError(false);
    try {
      const data = await fetchRecentChanges();
      setRecentChanges(data.changes);
    } catch {
      setChangesError(true);
    } finally {
      setChangesLoading(false);
    }
  }, []);

  const loadWarnings = useCallback(async () => {
    setWarningsLoading(true);
    setWarningsError(false);
    try {
      const data = await fetchValidationWarnings();
      setWarnings(data.warnings);
    } catch {
      setWarningsError(true);
    } finally {
      setWarningsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    loadMetrics();
    loadRecentChanges();
    loadWarnings();
  }, [loadMetrics, loadRecentChanges, loadWarnings]);

  // Initial load + auto-refresh every 30s
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Build stat cards from metrics
  const statCards = metrics
    ? [
        { label: "Total Content", value: metrics.totalItems, icon: CheckCircle, color: "#2D6B4F" },
        { label: "Active Rooms", value: metrics.activeRooms, icon: Server, color: "#3A7D7B" },
        { label: "Active Players", value: metrics.activePlayers, icon: Users, color: "#C9A84C" },
        { label: "Entity Types", value: Object.keys(metrics.entityCounts).length, icon: CheckCircle, color: "#2D6B4F" },
      ]
    : [];

  // Build content coverage from entity counts
  const contentCoverage = metrics
    ? Object.entries(metrics.entityCounts).map(([type, count]) => ({
        domain: ENTITY_LABELS[type] || type,
        current: count,
      }))
    : [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-[#C9A84C] text-2xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Dashboard
        </h1>
        <button
          onClick={refreshAll}
          className="flex items-center gap-2 text-[#8A8B95] hover:text-[#C9A84C] text-sm transition-colors"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {metricsLoading && !metrics ? (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <LoadingCard key={i} label="metrics" />
          ))}
        </div>
      ) : metricsError && !metrics ? (
        <div className="mb-8">
          <ErrorCard label="metrics" onRetry={loadMetrics} />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => {
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
      )}

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Recent Changes */}
        {changesLoading && recentChanges.length === 0 ? (
          <LoadingCard label="recent changes" />
        ) : changesError && recentChanges.length === 0 ? (
          <ErrorCard label="recent changes" onRetry={loadRecentChanges} />
        ) : (
          <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
            <h2
              className="text-[#C9A84C] text-lg mb-4"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Recent Changes
            </h2>
            {recentChanges.length === 0 ? (
              <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                No content changes yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentChanges.map((change) => (
                  <div key={`${change.entityType}-${change.id}`} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-[#0A0B0F] text-sm font-bold flex-shrink-0">
                      {(ENTITY_LABELS[change.entityType] || change.entityType)[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p
                        className="text-[#E8E0D0] text-sm"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        <span className="text-[#C9A84C]">{ENTITY_LABELS[change.entityType] || change.entityType}</span>{" "}
                        <span className="text-[#8A8B95]">{change.name}</span>
                      </p>
                      <p
                        className="text-[#4A4B55] text-xs"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        {formatTimeAgo(change.updatedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => navigate("/admin/audit-log")}
              className="mt-4 text-[#3A7D7B] hover:text-[#C9A84C] text-sm transition-colors"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              View All Activity →
            </button>
          </div>
        )}

        {/* Content Coverage */}
        {metricsLoading && !metrics ? (
          <LoadingCard label="content coverage" />
        ) : metricsError && !metrics ? (
          <ErrorCard label="content coverage" onRetry={loadMetrics} />
        ) : (
          <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
            <h2
              className="text-[#C9A84C] text-lg mb-4"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Content Coverage
            </h2>
            {contentCoverage.length === 0 ? (
              <p className="text-[#8A8B95] text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                No content defined yet.
              </p>
            ) : (
              <div className="space-y-4">
                {contentCoverage.map((item) => {
                  const maxCount = Math.max(...contentCoverage.map((c) => c.current), 1);
                  const percentage = (item.current / maxCount) * 100;
                  return (
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
                          {item.current}
                        </span>
                      </div>
                      <div className="h-2 bg-[#1C1D27] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#2D6B4F] to-[#C9A84C]"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validation Warnings */}
      {warningsLoading && warnings.length === 0 ? (
        <LoadingCard label="validation warnings" />
      ) : warningsError && warnings.length === 0 ? (
        <ErrorCard label="validation warnings" onRetry={loadWarnings} />
      ) : (
        <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
          <h2
            className="text-[#C9A84C] text-lg mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Validation Warnings
          </h2>
          {warnings.length === 0 ? (
            <div className="flex items-center gap-2 text-[#2D6B4F]">
              <CheckCircle className="w-4 h-4" />
              <p className="text-sm" style={{ fontFamily: "var(--font-sans)" }}>
                All content passes validation.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-3">
                  {warning.severity === "error" ? (
                    <XCircle className="w-4 h-4 text-[#8B2500] flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#B8860B] flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p
                      className="text-[#E8E0D0] text-sm"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      <span className="text-[#8A8B95]">[{ENTITY_LABELS[warning.entityType] || warning.entityType}]</span>{" "}
                      <span className="text-[#C9A84C]">{warning.entityName}</span>:{" "}
                      {warning.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
