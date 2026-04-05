import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Trophy, Target, Swords } from "lucide-react";

type TabType = "seasonal" | "personal" | "contracts";

interface LeaderboardEntry {
  rank: number;
  name: string;
  faction: string;
  zonesCompleted: number;
  itemsExtracted: number;
  pvpSurvived: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    name: "Shadow Reaper",
    faction: "Ashen Guard",
    zonesCompleted: 147,
    itemsExtracted: 523,
    pvpSurvived: 34,
  },
  {
    rank: 2,
    name: "Ironforge",
    faction: "Ironwright Compact",
    zonesCompleted: 139,
    itemsExtracted: 612,
    pvpSurvived: 28,
  },
  {
    rank: 3,
    name: "Veilwalker",
    faction: "Veilkeepers",
    zonesCompleted: 132,
    itemsExtracted: 445,
    pvpSurvived: 41,
  },
  {
    rank: 47,
    name: "Kael Darkwater",
    faction: "Ironwright Compact",
    zonesCompleted: 23,
    itemsExtracted: 87,
    pvpSurvived: 5,
  },
];

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<TabType>("seasonal");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      {/* Top bar */}
      <div className="bg-[#12131A] border-b border-[#2A2B35] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/zone")}
            className="text-[#8A8B95] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1
            className="text-[#C9A84C]"
            style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem" }}
          >
            Leaderboard & Stats
          </h1>
        </div>
      </div>

      <div className="p-8 max-w-6xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-[#2A2B35]">
          <button
            onClick={() => setActiveTab("seasonal")}
            className={`pb-3 px-4 transition-colors flex items-center gap-2 ${
              activeTab === "seasonal"
                ? "border-b-2 border-[#C9A84C] text-[#C9A84C]"
                : "text-[#8A8B95] hover:text-[#E8E0D0]"
            }`}
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <Trophy className="w-4 h-4" />
            Seasonal Leaderboard
          </button>
          <button
            onClick={() => setActiveTab("personal")}
            className={`pb-3 px-4 transition-colors flex items-center gap-2 ${
              activeTab === "personal"
                ? "border-b-2 border-[#C9A84C] text-[#C9A84C]"
                : "text-[#8A8B95] hover:text-[#E8E0D0]"
            }`}
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <Target className="w-4 h-4" />
            Personal Stats
          </button>
          <button
            onClick={() => setActiveTab("contracts")}
            className={`pb-3 px-4 transition-colors flex items-center gap-2 ${
              activeTab === "contracts"
                ? "border-b-2 border-[#C9A84C] text-[#C9A84C]"
                : "text-[#8A8B95] hover:text-[#E8E0D0]"
            }`}
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <Swords className="w-4 h-4" />
            Active Contracts
          </button>
        </div>

        {/* Seasonal Leaderboard */}
        {activeTab === "seasonal" && (
          <div>
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#1C1D27]">
                  <tr>
                    <th
                      className="text-left px-6 py-3 text-[#8A8B95] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Rank
                    </th>
                    <th
                      className="text-left px-6 py-3 text-[#8A8B95] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Player
                    </th>
                    <th
                      className="text-left px-6 py-3 text-[#8A8B95] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Faction
                    </th>
                    <th
                      className="text-left px-6 py-3 text-[#8A8B95] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Zones Completed
                    </th>
                    <th
                      className="text-left px-6 py-3 text-[#8A8B95] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Items Extracted
                    </th>
                    <th
                      className="text-left px-6 py-3 text-[#8A8B95] text-xs"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      PvP Survived
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockLeaderboard.map((entry) => (
                    <tr
                      key={entry.rank}
                      className={`border-t border-[#2A2B35] ${
                        entry.name === "Kael Darkwater"
                          ? "bg-[#C9A84C]/10"
                          : "hover:bg-[#1C1D27]"
                      }`}
                    >
                      <td
                        className="px-6 py-4"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        <span
                          className={
                            entry.rank <= 3 ? "text-[#C9A84C]" : "text-[#8A8B95]"
                          }
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 text-[#E8E0D0]"
                        style={{ fontFamily: "var(--font-serif)" }}
                      >
                        {entry.name}
                      </td>
                      <td
                        className="px-6 py-4 text-[#8A8B95]"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        {entry.faction}
                      </td>
                      <td
                        className="px-6 py-4 text-[#E8E0D0]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {entry.zonesCompleted}
                      </td>
                      <td
                        className="px-6 py-4 text-[#E8E0D0]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {entry.itemsExtracted}
                      </td>
                      <td
                        className="px-6 py-4 text-[#E8E0D0]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {entry.pvpSurvived}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Personal Stats */}
        {activeTab === "personal" && (
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#8A8B95] text-xs mb-2"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Runs Completed
              </h3>
              <p
                className="text-[#C9A84C] text-3xl"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                23
              </p>
            </div>
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#8A8B95] text-xs mb-2"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Survival Rate
              </h3>
              <p
                className="text-[#2D6B4F] text-3xl"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                67%
              </p>
            </div>
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#8A8B95] text-xs mb-2"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Favorite Biome
              </h3>
              <p
                className="text-[#E8E0D0]"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Flooded Crypt
              </p>
            </div>
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#8A8B95] text-xs mb-2"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Total Items Extracted
              </h3>
              <p
                className="text-[#C9A84C] text-3xl"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                87
              </p>
            </div>
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#8A8B95] text-xs mb-2"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Longest Streak
              </h3>
              <p
                className="text-[#2D6B4F] text-3xl"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                7
              </p>
            </div>
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#8A8B95] text-xs mb-2"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                PvP Encounters
              </h3>
              <p
                className="text-[#8B2500] text-3xl"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                12
              </p>
            </div>
          </div>
        )}

        {/* Active Contracts */}
        {activeTab === "contracts" && (
          <div className="space-y-4">
            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6">
              <h3
                className="text-[#C9A84C] mb-2"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.125rem" }}
              >
                Hunt: Drowned Revenants
              </h3>
              <p
                className="text-[#8A8B95] text-sm mb-4"
                style={{ fontFamily: "var(--font-serif)", lineHeight: 1.6 }}
              >
                Eliminate 5 Drowned Revenants in Flooded Crypt zones. The
                Refuge scholars seek to understand their corruption.
              </p>
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span
                    className="text-[#4A4B55] text-xs"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Progress
                  </span>
                  <span
                    className="text-[#8A8B95] text-xs"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    3 / 5
                  </span>
                </div>
                <div className="h-2 bg-[#1C1D27] rounded-full overflow-hidden">
                  <div className="h-full w-[60%] bg-[#C9A84C]"></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Reward: 500 coin, Refined weapon
                </span>
                <button
                  className="text-[#8B2500] hover:text-[#8B2500]/80 text-xs"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Abandon
                </button>
              </div>
            </div>

            <div className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 opacity-60">
              <h3
                className="text-[#8A8B95] mb-2"
                style={{ fontFamily: "var(--font-serif)", fontSize: "1.125rem" }}
              >
                No other active contracts
              </h3>
              <p
                className="text-[#4A4B55] text-sm"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Visit the Contracts board in the Refuge to accept new
                assignments.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
