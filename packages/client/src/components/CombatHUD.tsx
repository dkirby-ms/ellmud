/**
 * CombatHUD.tsx — Combat UI enhancements per GDD §6.4
 * 
 * Features:
 * - Enhanced target panel with HP tier and telegraph intent
 * - Tab cycling through hostile targets
 * - Ability cooldown overlay (placeholder for future ability system)
 * - Group frames (placeholder for future group system)
 */

import { useEffect, useState } from 'react';
import { Sword, Shield, Heart, Target } from 'lucide-react';
import type { EnemyStatus } from '../store.js';

interface CombatHUDProps {
  enemyStatus: EnemyStatus | null;
  availableTargets?: Array<{ id: string; name: string; hp: number; maxHp: number }>;
  onTargetChange?: (targetId: string) => void;
  abilities?: Array<{
    id: string;
    name: string;
    cooldown: number;
    maxCooldown: number;
    hotkey: number;
  }>;
  groupMembers?: Array<{
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    role: 'tank' | 'healer' | 'damage';
    threat: number;
  }>;
}

export function CombatHUD({
  enemyStatus,
  availableTargets = [],
  onTargetChange,
  abilities = [],
  groupMembers = [],
}: CombatHUDProps) {
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);

  // Tab key cycling through targets
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && availableTargets.length > 0) {
        e.preventDefault();
        const nextIndex = (currentTargetIndex + 1) % availableTargets.length;
        setCurrentTargetIndex(nextIndex);
        onTargetChange?.(availableTargets[nextIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTargetIndex, availableTargets, onTargetChange]);

  return (
    <div className="space-y-4" data-testid="combat-hud">
      {/* Enhanced Target Panel */}
      {enemyStatus && (
        <div className="border-b border-border-muted pb-4" data-testid="target-panel">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-danger text-xs font-sans flex items-center gap-1">
              <Target className="w-3 h-3" />
              TARGET
            </h3>
            {availableTargets.length > 1 && (
              <span className="text-text-disabled text-xs font-mono">
                {currentTargetIndex + 1}/{availableTargets.length}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-text-primary text-sm font-serif">
              {enemyStatus.name}
            </p>

            {/* HP Bar with Tier */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-text-disabled text-xs font-sans">Health</span>
                <span
                  className="text-xs font-mono font-semibold"
                  style={{
                    color:
                      enemyStatus.hpTier === 'Near Death'
                        ? 'var(--color-danger)'
                        : enemyStatus.hpTier === 'Badly Wounded'
                        ? 'var(--color-warning)'
                        : enemyStatus.hpTier === 'Wounded'
                        ? 'var(--color-warning)'
                        : 'var(--color-success)',
                  }}
                >
                  {enemyStatus.hpTier}
                </span>
              </div>
              <div
                className="h-2 bg-bg-elevated rounded-full overflow-hidden"
                role="progressbar"
                aria-label={`Target health: ${enemyStatus.hpTier}`}
              >
                <div
                  className="h-full bg-gradient-to-r from-danger to-success transition-all"
                  style={{
                    width:
                      enemyStatus.maxHp > 0
                        ? `${(enemyStatus.hp / enemyStatus.maxHp) * 100}%`
                        : '0%',
                  }}
                />
              </div>
            </div>

            {/* Telegraph Intent Indicator */}
            {enemyStatus.telegraphedAction && (
              <div
                className="bg-warning/10 border border-warning/30 rounded px-2 py-1.5"
                data-testid="telegraph-indicator"
              >
                <div className="flex items-center justify-between">
                  <span className="text-warning text-xs font-serif italic">
                    Telegraphing: {enemyStatus.telegraphedAction}
                  </span>
                  <span className="text-warning text-xs font-mono animate-pulse">
                    ⚠
                  </span>
                </div>
              </div>
            )}

            {/* Target List (if multiple targets available) */}
            {availableTargets.length > 1 && (
              <div className="mt-2 space-y-1">
                <span className="text-text-disabled text-xs font-sans">
                  Available Targets (Tab to cycle):
                </span>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {availableTargets.map((target, idx) => (
                    <div
                      key={target.id}
                      className={`text-xs font-mono flex items-center justify-between px-2 py-1 rounded ${
                        idx === currentTargetIndex
                          ? 'bg-accent-gold/20 text-text-primary'
                          : 'text-text-disabled hover:bg-bg-elevated cursor-pointer'
                      }`}
                      onClick={() => {
                        setCurrentTargetIndex(idx);
                        onTargetChange?.(target.id);
                      }}
                    >
                      <span>{target.name}</span>
                      <span className="text-xs">
                        {target.maxHp > 0
                          ? `${Math.round((target.hp / target.maxHp) * 100)}%`
                          : '0%'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ability Cooldowns Panel (Placeholder) */}
      {abilities.length > 0 && (
        <div className="border-b border-border-muted pb-4" data-testid="ability-cooldowns">
          <h3 className="text-text-secondary text-xs mb-3 font-sans">ABILITIES</h3>
          <div className="grid grid-cols-5 gap-2">
            {abilities.map((ability) => (
              <div
                key={ability.id}
                className={`relative aspect-square rounded border ${
                  ability.cooldown > 0
                    ? 'border-border-muted bg-bg-elevated opacity-50'
                    : 'border-accent-gold/30 bg-bg-panel hover:bg-accent-gold/10'
                } transition-all cursor-pointer`}
                data-testid={`ability-${ability.id}`}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                  <span className="text-text-secondary text-xs font-mono">
                    {ability.hotkey}
                  </span>
                  <span className="text-text-primary text-xs font-serif truncate w-full text-center">
                    {ability.name}
                  </span>
                </div>
                {ability.cooldown > 0 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-bg-primary/80 rounded"
                    data-testid={`cooldown-overlay-${ability.id}`}
                  >
                    <span className="text-text-primary text-sm font-mono font-bold">
                      {ability.cooldown}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group Frames (Placeholder) */}
      {groupMembers.length > 0 && (
        <div className="border-b border-border-muted pb-4" data-testid="group-frames">
          <h3 className="text-text-secondary text-xs mb-3 font-sans">
            GROUP ({groupMembers.length})
          </h3>
          <div className="space-y-2">
            {groupMembers
              .sort((a, b) => b.threat - a.threat)
              .map((member) => {
                const hpPercent = member.maxHp > 0 ? member.hp / member.maxHp : 0;
                const roleIcon =
                  member.role === 'tank' ? (
                    <Shield className="w-3 h-3 text-interactive" />
                  ) : member.role === 'healer' ? (
                    <Heart className="w-3 h-3 text-success" />
                  ) : (
                    <Sword className="w-3 h-3 text-danger" />
                  );

                return (
                  <div
                    key={member.id}
                    className="bg-bg-elevated rounded px-2 py-1.5"
                    data-testid={`group-member-${member.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {roleIcon}
                        <span className="text-text-primary text-xs font-serif">
                          {member.name}
                        </span>
                      </div>
                      <span className="text-text-disabled text-xs font-mono">
                        {Math.round(hpPercent * 100)}%
                      </span>
                    </div>
                    <div className="h-1 bg-bg-primary rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          hpPercent > 0.6
                            ? 'bg-success'
                            : hpPercent > 0.3
                            ? 'bg-warning'
                            : 'bg-danger'
                        }`}
                        style={{ width: `${hpPercent * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
