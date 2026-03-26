import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { Clock, Users, Key, MapPin } from "lucide-react";

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

/** Zone listing returned from the admin/zone API. */
interface ZoneListing {
  id: string;
  slug: string;
  name: string;
  description: string;
  tier: number;
  category: 'hub' | 'dungeon' | 'wilderness' | 'social';
  lifecycle: 'persistent' | 'scheduled' | 'event';
  levelMin: number;
  levelMax: number;
  playerCount?: number;
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
      return "var(--color-tier-common)";
    case 2:
      return "var(--color-tier-refined)";
    case 3:
      return "var(--color-tier-masterwork)";
    default:
      return "var(--color-tier-common)";
  }
};

interface ShardboardTabProps {
  onEnterShard?: (shardId: string) => void;
  onEnterZone?: (zoneSlug: string) => void;
}

const getCategoryStyle = (category: ZoneListing['category']) => {
  switch (category) {
    case 'hub': return { color: 'text-interactive', bg: 'bg-interactive/10', label: 'Hub' };
    case 'dungeon': return { color: 'text-danger', bg: 'bg-danger/10', label: 'Dungeon' };
    case 'wilderness': return { color: 'text-success', bg: 'bg-success/10', label: 'Wilderness' };
    case 'social': return { color: 'text-accent-gold', bg: 'bg-accent-gold/10', label: 'Social' };
    default: return { color: 'text-text-secondary', bg: 'bg-bg-elevated', label: category };
  }
};

export default function ShardboardTab({ onEnterShard, onEnterZone }: ShardboardTabProps) {
  const navigate = useNavigate();
  const [zones, setZones] = useState<ZoneListing[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);

  // Fetch available zones from admin API
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_URL ?? '';
    fetch(`${baseUrl}/api/admin/zones`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ZoneListing[]) => setZones(data))
      .catch(() => setZones([]))
      .finally(() => setZonesLoading(false));
  }, []);

  const handleEnterShard = (shardId: string) => {
    if (onEnterShard) {
      onEnterShard(shardId);
    } else {
      navigate(`/shard/${shardId}`);
    }
  };

  const handleEnterZone = (zoneSlug: string) => {
    if (onEnterZone) {
      onEnterZone(zoneSlug);
    } else {
      // TODO: Wire to server-side zone join via matchmaker
      // For now, navigate to shard route with zoneSlug hint
      navigate(`/shard?zone=${zoneSlug}`);
    }
  };

  return (
    <div className="p-8">
      {/* ── Zones — Persistent Destinations ─────────────────────────────── */}
      <h2
        className="text-accent-gold mb-4 font-serif"
        style={{ fontSize: "1.5rem" }}
      >
        Zones
      </h2>
      <p className="text-text-secondary text-sm mb-6 font-sans">
        Persistent destinations — always available to explore.
      </p>

      {zonesLoading ? (
        <p className="text-text-disabled text-sm font-sans mb-8">Loading zones...</p>
      ) : zones.length > 0 ? (
        <div className="grid gap-4 mb-10">
          {zones.map((zone) => {
            const cat = getCategoryStyle(zone.category);
            return (
              <div
                key={zone.id}
                className="bg-bg-panel border border-border-muted rounded-lg p-5 hover:border-accent-gold transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3
                      className="text-accent-gold mb-1 font-serif"
                      style={{ fontSize: "1.125rem" }}
                    >
                      {zone.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold font-sans"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${getTierColor(zone.tier)} 20%, transparent)`,
                          color: getTierColor(zone.tier),
                        }}
                      >
                        Tier {zone.tier}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-sans ${cat.color} ${cat.bg}`}>
                        {cat.label}
                      </span>
                      <span className="text-text-disabled text-xs font-sans">
                        Lv {zone.levelMin}–{zone.levelMax}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEnterZone(zone.slug)}
                    className="bg-interactive hover:bg-interactive/90 text-bg-primary font-medium px-5 py-2 rounded transition-colors font-sans text-sm"
                  >
                    Enter Zone
                  </button>
                </div>
                <p className="text-text-secondary text-sm font-serif mb-2" style={{ lineHeight: 1.6 }}>
                  {zone.description}
                </p>
                <div className="flex items-center gap-4 text-text-disabled text-xs font-sans">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {zone.lifecycle}
                  </span>
                  {zone.playerCount != null && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {zone.playerCount} players
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-text-disabled text-sm font-sans mb-10">
          No zones available yet.
        </p>
      )}

      {/* ── Shards — Procedural Expeditions ──────────────────────────────── */}
      <h2
        className="text-accent-gold mb-6 font-serif"
        style={{ fontSize: "1.5rem" }}
      >
        Shardboard
      </h2>

      <div className="grid gap-6">
        {mockShards.map((shard) => (
          <div
            key={shard.id}
            className="bg-bg-panel border border-border-muted rounded-lg p-6 hover:border-accent-gold transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3
                  className="text-accent-gold mb-2 font-serif"
                  style={{ fontSize: "1.25rem" }}
                >
                  {shard.name}
                </h3>
                <div className="flex items-center gap-3">
                  <span
                    className="px-2 py-1 rounded text-xs font-semibold font-sans"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${getTierColor(shard.tier)} 20%, transparent)`,
                      color: getTierColor(shard.tier),
                    }}
                  >
                    Tier {shard.tier}
                  </span>
                  <span className="text-text-secondary text-sm font-sans">
                    {shard.biome}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleEnterShard(shard.id)}
                className="bg-accent-gold hover:bg-accent-gold/90 text-bg-primary font-medium px-6 py-2 rounded transition-colors font-sans"
              >
                Enter Shard
              </button>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {shard.modifiers.map((mod) => (
                <span
                  key={mod}
                  className="px-3 py-1 bg-bg-elevated text-warning text-xs rounded border border-warning/30 font-sans"
                >
                  {mod}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-text-secondary" />
                <span className="text-text-secondary text-sm font-sans">
                  {shard.players.current}/{shard.players.max} players
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-secondary" />
                <span className="text-text-secondary text-sm font-sans">
                  {shard.timeRemaining}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-text-secondary" />
                <span className="text-text-secondary text-sm font-sans">
                  {shard.keyType}
                </span>
              </div>
            </div>

            <div className="bg-bg-elevated border border-border-muted rounded p-3">
              <p className="text-text-disabled text-xs mb-1 font-sans">
                Rumoured Loot
              </p>
              <p
                className="text-text-secondary text-sm italic font-serif"
                style={{ lineHeight: 1.6 }}
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
