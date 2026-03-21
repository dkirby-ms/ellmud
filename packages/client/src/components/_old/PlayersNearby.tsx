import { useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Faction = 'none' | 'forge-wardens' | 'ashen-court' | 'veil-walkers' | 'drift-merchants';

export interface NearbyPlayer {
  id: string;
  name: string;
  faction: Faction;
  isTrading: boolean;
}

export interface PlayersNearbyProps {
  players: NearbyPlayer[];
  onPlayerClick?: (playerId: string) => void;
  onTradeRequest?: (playerId: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FACTION_ICONS: Record<Faction, string> = {
  'none': '⚪',
  'forge-wardens': '🔨',
  'ashen-court': '🔥',
  'veil-walkers': '👁️',
  'drift-merchants': '💰',
};

const FACTION_LABELS: Record<Faction, string> = {
  'none': 'Unaffiliated',
  'forge-wardens': 'Forge Wardens',
  'ashen-court': 'Ashen Court',
  'veil-walkers': 'Veil Walkers',
  'drift-merchants': 'Drift Merchants',
};

// ─── PlayersNearby ───────────────────────────────────────────────────────────

export function PlayersNearby({
  players,
  onPlayerClick,
  onTradeRequest,
}: PlayersNearbyProps): React.JSX.Element {
  const handlePlayerClick = useCallback(
    (playerId: string) => {
      onPlayerClick?.(playerId);
    },
    [onPlayerClick],
  );

  const handleTradeClick = useCallback(
    (e: React.MouseEvent, playerId: string) => {
      e.stopPropagation();
      onTradeRequest?.(playerId);
    },
    [onTradeRequest],
  );

  return (
    <div className="players-nearby">
      <h3 className="players-nearby__title">Players Nearby</h3>
      <div className="players-nearby__count">
        {players.length} {players.length === 1 ? 'player' : 'players'} nearby
      </div>

      <div className="players-nearby__list" role="list">
        {players.length === 0 && (
          <div className="players-nearby__empty" role="listitem">
            No players nearby
          </div>
        )}

        {players.map((player) => (
          <div
            key={player.id}
            className={`players-nearby__player${player.isTrading ? ' players-nearby__player--trading' : ''}`}
            role="listitem"
            onClick={() => handlePlayerClick(player.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePlayerClick(player.id);
              }
            }}
            tabIndex={0}
            aria-label={`${player.name}, ${FACTION_LABELS[player.faction]}`}
          >
            <span
              className="players-nearby__faction-icon"
              title={FACTION_LABELS[player.faction]}
              aria-label={FACTION_LABELS[player.faction]}
            >
              {FACTION_ICONS[player.faction]}
            </span>
            <span className="players-nearby__name">{player.name}</span>
            {player.isTrading && (
              <span className="players-nearby__trading-badge">Trading</span>
            )}
            <button
              className="players-nearby__trade-btn"
              type="button"
              onClick={(e) => handleTradeClick(e, player.id)}
              aria-label={`Trade with ${player.name}`}
            >
              Trade
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
