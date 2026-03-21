import type { EnemyStatus, HpTier } from '../store.js';

function getHpTierClass(tier: HpTier): string {
  switch (tier) {
    case 'Uninjured': return 'hp-uninjured';
    case 'Wounded': return 'hp-wounded';
    case 'Badly Wounded': return 'hp-badly-wounded';
    case 'Near Death': return 'hp-near-death';
  }
}

export interface EnemyStatusPanelProps {
  enemy: EnemyStatus;
}

export function EnemyStatusPanel({ enemy }: EnemyStatusPanelProps): React.JSX.Element {
  return (
    <div className="enemy-status-panel" role="region" aria-label="Enemy status">
      <h3 className="enemy-name">{enemy.name}</h3>
      <span className={`enemy-hp-tier ${getHpTierClass(enemy.hpTier)}`}>
        {enemy.hpTier}
      </span>
      {enemy.telegraphedAction && (
        <p className="enemy-telegraphed">{enemy.telegraphedAction}</p>
      )}
    </div>
  );
}
