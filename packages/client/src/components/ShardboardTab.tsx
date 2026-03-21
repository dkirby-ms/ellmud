import { useNavigate } from "react-router";
import { Clock, Users, Key } from "lucide-react";

interface Shard {
  id: string;
  name: string;
  tier: number;
  biome: string;
  modifiers: string[];
  players: { current: number; max: number };
  timeRemaining: string;
  keyType: string;
  rumor: string;
}

const mockShards: Shard[] = [
  {
    id: "1",
    name: "Ashen Reach — Flooded Crypt",
    tier: 1,
    biome: "Flooded Crypt",
    modifiers: ["Dense", "Dark"],
    players: { current: 2, max: 4 },
    timeRemaining: "14m 32s",
    keyType: "Corrupted Iron Key",
    rumor: "Scouts report anomalous readings near the central chamber.",
  },
  {
    id: "2",
    name: "Hollow Archive — Shattered Bastion",
    tier: 2,
    biome: "Shattered Bastion",
    modifiers: ["Hunted", "Unstable"],
    players: { current: 1, max: 4 },
    timeRemaining: "8m 15s",
    keyType: "Obsidian Seal",
    rumor: "Strange echoes emanate from the lower halls. Something moves.",
  },
  {
    id: "3",
    name: "Crimson Depths — Fungal Deep",
    tier: 3,
    biome: "Fungal Deep",
    modifiers: ["Toxic", "Dense", "Dark"],
    players: { current: 0, max: 4 },
    timeRemaining: "22m 45s",
    keyType: "Spore-Etched Token",
    rumor: "The spores glow brighter in certain chambers. Follow the light.",
  },
];

const getTierColor = (tier: number) => {
  switch (tier) {
    case 1:
      return "#E8E0D0";
    case 2:
      return "#4682B4";
    case 3:
      return "#7B4FA0";
    default:
      return "#E8E0D0";
  }
};

interface ShardboardTabProps {
  onEnterShard?: (shardId: string) => void;
}

export default function ShardboardTab({ onEnterShard }: ShardboardTabProps) {
  const navigate = useNavigate();

  const handleEnterShard = (shardId: string) => {
    if (onEnterShard) {
      onEnterShard(shardId);
    } else {
      navigate(`/shard/${shardId}`);
    }
  };

  return (
    <div className="p-8">
      <h2
        className="text-[#C9A84C] mb-6"
        style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}
      >
        Shardboard
      </h2>

      <div className="grid gap-6">
        {mockShards.map((shard) => (
          <div
            key={shard.id}
            className="bg-[#12131A] border border-[#2A2B35] rounded-lg p-6 hover:border-[#C9A84C] transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3
                  className="text-[#C9A84C] mb-2"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "1.25rem",
                  }}
                >
                  {shard.name}
                </h3>
                <div className="flex items-center gap-3">
                  <span
                    className="px-2 py-1 rounded text-xs font-semibold"
                    style={{
                      fontFamily: "var(--font-sans)",
                      backgroundColor: getTierColor(shard.tier) + "20",
                      color: getTierColor(shard.tier),
                    }}
                  >
                    Tier {shard.tier}
                  </span>
                  <span
                    className="text-[#8A8B95] text-sm"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {shard.biome}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleEnterShard(shard.id)}
                className="bg-[#C9A84C] hover:bg-[#B89840] text-[#0A0B0F] font-medium px-6 py-2 rounded transition-colors"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Enter Shard
              </button>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {shard.modifiers.map((mod) => (
                <span
                  key={mod}
                  className="px-3 py-1 bg-[#1C1D27] text-[#B8860B] text-xs rounded border border-[#B8860B]/30"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {mod}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#8A8B95]" />
                <span
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {shard.players.current}/{shard.players.max} players
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#8A8B95]" />
                <span
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {shard.timeRemaining}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#8A8B95]" />
                <span
                  className="text-[#8A8B95] text-sm"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {shard.keyType}
                </span>
              </div>
            </div>

            <div className="bg-[#1C1D27] border border-[#2A2B35] rounded p-3">
              <p
                className="text-[#4A4B55] text-xs mb-1"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Rumoured Loot
              </p>
              <p
                className="text-[#8A8B95] text-sm italic"
                style={{ fontFamily: "var(--font-serif)", lineHeight: 1.6 }}
              >
                {shard.rumor}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
