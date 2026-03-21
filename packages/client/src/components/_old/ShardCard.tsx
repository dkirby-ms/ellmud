import { useCallback } from 'react';
import { Droplets, Castle, Leaf, Flame, BookOpen } from 'lucide-react';
import type { ShardCardData } from '@ellmud/shared';
import type { BiomeType, ShardTier, ShardModifier, ShardKeyType } from '@ellmud/shared';
import { useCountdown } from '../hooks/useCountdown.js';

// ─── Display Mappings ────────────────────────────────────────────────────────

const BIOME_CONFIG: Record<BiomeType, { label: string; icon: typeof Droplets }> = {
  flooded_crypt:      { label: 'Flooded Crypt',      icon: Droplets },
  shattered_bastion:  { label: 'Shattered Bastion',  icon: Castle },
  fungal_deep:        { label: 'Fungal Deep',         icon: Leaf },
  ashen_reach:        { label: 'Ember Rift',          icon: Flame },
  void_rift:          { label: 'Hollow Archive',      icon: BookOpen },
};

const TIER_LABELS: Record<ShardTier, string> = {
  1: 'Tier 1',
  2: 'Tier 2',
  3: 'Tier 3',
};

const MODIFIER_LABELS: Record<ShardModifier, string> = {
  darkness:  'Dark',
  hunted:    'Hunted',
  silent:    'Silent',
  echoing:   'Echoing',
  bountiful: 'Bountiful',
};

const KEY_LABELS: Record<ShardKeyType, string> = {
  bone:    'Bone Key',
  iron:    'Iron Key',
  crystal: 'Crystal Key',
  void:    'Void Key',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function tierCssClass(tier: ShardTier): string {
  if (tier === 2) return 'shard-tier--blue';
  if (tier === 3) return 'shard-tier--purple';
  return 'shard-tier--white';
}

// ─── Component ───────────────────────────────────────────────────────────────

export interface ShardCardProps {
  shard: ShardCardData;
  onEnter: (shardId: string) => void;
}

export function ShardCard({ shard, onEnter }: ShardCardProps): React.JSX.Element {
  const remaining = useCountdown(shard.entryWindowSeconds);
  const biome = BIOME_CONFIG[shard.biome];
  const BiomeIcon = biome.icon;
  const isUrgent = remaining > 0 && remaining < 300;
  const isExpired = remaining <= 0;

  const handleEnter = useCallback(() => {
    if (!isExpired) onEnter(shard.shardId);
  }, [isExpired, onEnter, shard.shardId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleEnter();
      }
    },
    [handleEnter],
  );

  return (
    <article
      className="shard-card"
      role="article"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={`Shard: ${shard.name}`}
    >
      {/* Header: name + tier badge */}
      <div className="shard-card__header">
        <h3 className="shard-card__name">{shard.name}</h3>
        <span className={`shard-card__tier ${tierCssClass(shard.tier)}`}>
          {TIER_LABELS[shard.tier]}
        </span>
      </div>

      {/* Biome */}
      <div className="shard-card__biome">
        <BiomeIcon size={16} aria-hidden="true" />
        <span>{biome.label}</span>
      </div>

      {/* Modifiers */}
      {shard.modifiers.length > 0 && (
        <div className="shard-card__modifiers" role="list" aria-label="Shard modifiers">
          {shard.modifiers.map((mod) => (
            <span key={mod} className="shard-card__modifier" role="listitem">
              {MODIFIER_LABELS[mod]}
            </span>
          ))}
        </div>
      )}

      {/* Player slots */}
      <div
        className="shard-card__players"
        aria-label={`${shard.currentPlayers} of ${shard.maxPlayers} players entered`}
      >
        <div className="shard-card__slots">
          {Array.from({ length: shard.maxPlayers }, (_, i) => (
            <span
              key={i}
              className={`shard-card__slot ${i < shard.currentPlayers ? 'shard-card__slot--filled' : ''}`}
              aria-hidden="true"
            />
          ))}
        </div>
        <span className="shard-card__player-text">
          {shard.currentPlayers}/{shard.maxPlayers} players
        </span>
      </div>

      {/* Footer: time, key cost, enter button */}
      <div className="shard-card__footer">
        <div className="shard-card__meta">
          <span
            className={`shard-card__time ${isUrgent ? 'shard-card__time--urgent' : ''} ${isExpired ? 'shard-card__time--expired' : ''}`}
            aria-label={isExpired ? 'Entry window closed' : `${formatTime(remaining)} remaining`}
          >
            {isExpired ? 'Closed' : formatTime(remaining)}
          </span>
          <span className="shard-card__key">{KEY_LABELS[shard.keyCost]}</span>
        </div>
        <button
          className="shard-card__enter"
          onClick={handleEnter}
          disabled={isExpired}
          aria-label={`Enter shard ${shard.name}`}
        >
          Enter Shard
        </button>
      </div>
    </article>
  );
}
