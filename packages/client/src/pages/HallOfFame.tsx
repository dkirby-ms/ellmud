/**
 * HallOfFame — Memorial page displaying all permanently fallen characters.
 * Ranked by survival time. A somber, hall-of-the-dead aesthetic.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Skull, TrendingUp, Map, Swords } from "lucide-react";
import { useAuthStore } from "../store/auth.js";
import { fetchHallOfFame, fetchHallOfFameStats } from "../services/api.js";
import type { HallOfFameEntry, HallOfFameStats } from "../services/api.js";

function formatSurvivalTime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(' ');
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

export default function HallOfFame() {
  const navigate = useNavigate();
  const token = useAuthStore(s => s.token);
  const username = useAuthStore(s => s.username);
  const email = useAuthStore(s => s.email);
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [stats, setStats] = useState<HallOfFameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const perPage = 50;

  useEffect(() => {
    if (!token) return;

    Promise.all([
      fetchHallOfFame(token, page, perPage),
      page === 1 ? fetchHallOfFameStats(token) : Promise.resolve(null),
    ])
      .then(([entriesData, statsData]) => {
        setEntries(entriesData.entries);
        setHasMore(entriesData.hasMore);
        if (statsData) setStats(statsData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? 'Failed to load Hall of Fame');
        setLoading(false);
      });
  }, [token, page]);

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
      setLoading(true);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setPage(page + 1);
      setLoading(true);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Header */}
      <div className="bg-bg-panel border-b border-border-muted px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/characters")}
            className="text-text-secondary hover:text-accent-gold transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Skull className="w-6 h-6 text-danger" />
            <h1 className="text-2xl font-serif text-accent-gold">Hall of Fame</h1>
          </div>
        </div>
        <span className="text-text-secondary text-sm">
          {username ?? email ?? "Unknown"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
        {loading && page === 1 ? (
          <div className="text-center text-text-secondary py-12">
            Loading chronicles of past lives...
          </div>
        ) : error ? (
          <div className="text-center text-danger py-12">{error}</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Skull className="w-16 h-16 text-text-disabled mx-auto mb-4" />
            <p className="text-text-secondary text-lg font-serif italic">
              No past lives recorded yet. Will you be the first to fall and rise again?
            </p>
          </div>
        ) : (
          <>
            {/* Stats Banner */}
            {stats && (
              <div className="bg-bg-panel border border-border-muted rounded-lg p-6 mb-6">
                <h2 className="text-text-secondary uppercase tracking-wider text-sm mb-4 font-sans">
                  Server Statistics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3">
                    <Skull className="w-5 h-5 text-danger" />
                    <div>
                      <div className="text-text-primary font-mono text-xl">{stats.totalPermadeaths}</div>
                      <div className="text-text-secondary text-xs">Total Deaths</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-accent-gold" />
                    <div>
                      <div className="text-text-primary font-mono text-xl">{formatSurvivalTime(stats.averageSurvivalSeconds)}</div>
                      <div className="text-text-secondary text-xs">Avg Survival</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Map className="w-5 h-5 text-danger" />
                    <div>
                      <div className="text-text-primary font-mono text-sm">{stats.deadliestZone}</div>
                      <div className="text-text-secondary text-xs">Deadliest Zone</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Swords className="w-5 h-5 text-danger" />
                    <div>
                      <div className="text-text-primary font-mono text-sm">{stats.deadliestCreature}</div>
                      <div className="text-text-secondary text-xs">Deadliest Foe</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Hall of Fame Table */}
            <div className="bg-bg-panel border border-border-muted rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-bg-elevated border-b border-border-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Character
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Survival Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Kills
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Cause of Death
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Zone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => {
                    const rank = (page - 1) * perPage + index + 1;
                    const isTop3 = rank <= 3;
                    
                    return (
                      <tr
                        key={entry.characterId}
                        className="border-b border-border-muted last:border-b-0 hover:bg-bg-elevated transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`font-mono text-sm ${
                              isTop3 ? 'text-accent-gold font-bold' : 'text-text-secondary'
                            }`}
                          >
                            #{rank}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-serif ${isTop3 ? 'text-accent-gold' : 'text-text-primary'}`}>
                            {entry.characterName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-primary font-mono text-sm">
                          {entry.level}
                        </td>
                        <td className="px-4 py-3 text-text-primary font-mono text-sm">
                          {formatSurvivalTime(entry.survivedSeconds)}
                        </td>
                        <td className="px-4 py-3 text-text-primary font-mono text-sm">
                          {entry.totalKills}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-sm">
                          {entry.causeOfDeath}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-sm">
                          {entry.zoneOfDeath}
                        </td>
                        <td className="px-4 py-3 text-text-disabled text-sm">
                          {formatDate(entry.diedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={handlePrevPage}
                disabled={page === 1}
                className="px-4 py-2 bg-bg-elevated border border-border-muted text-text-primary rounded hover:bg-bg-panel disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <span className="text-text-secondary font-mono text-sm">
                Page {page}
              </span>
              
              <button
                onClick={handleNextPage}
                disabled={!hasMore}
                className="px-4 py-2 bg-bg-elevated border border-border-muted text-text-primary rounded hover:bg-bg-panel disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
