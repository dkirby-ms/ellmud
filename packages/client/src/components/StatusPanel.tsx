/**
 * StatusPanel — Right sidebar for the zone exploration view.
 *
 * Layout:
 *   [Always-visible header]  HP · Stamina · Posture · Status Effects
 *   [Tab bar]                Environment | Gear | Character
 *   [Tab content]            Varies per tab
 */

import React, { useState, type RefObject } from "react";
import { Sword, Bug } from "lucide-react";
import AnsiText from "./AnsiText.js";
import CompassControl from "./CompassControl.js";
import { MinimapWidget, type MinimapWidgetProps } from "./map/MinimapWidget.js";
import { EquipmentSilhouette } from "./EquipmentSilhouette.js";
import { RoomOccupants } from "./RoomOccupants.js";
import { CombatHUD } from "./CombatHUD.js";
import { useAppContext, type StatusEffect, type EnemyStatus, type CombatStats, type EffectiveStats } from "../store.js";
import { useVersion } from "../hooks/useVersion.js";

// ─── Status Effect Classifier ────────────────────────────────────────────────

const DEBUFF_KEYWORDS = ['bleeding', 'poisoned', 'burning', 'weakened', 'slowed', 'stunned', 'confused', 'cursed', 'blind', 'fear', 'zone-sick'];
const BUFF_KEYWORDS = ['haste', 'strength', 'shield', 'regeneration', 'regen', 'blessed', 'fortified', 'empowered', 'protect', 'harden'];

function getEffectType(effect: StatusEffect): 'buff' | 'debuff' | 'neutral' {
  const name = effect.name.toLowerCase();
  if (DEBUFF_KEYWORDS.some(d => name.includes(d))) return 'debuff';
  if (BUFF_KEYWORDS.some(b => name.includes(b))) return 'buff';
  return 'neutral';
}

// ─── Sound Cue Direction Highlighting ────────────────────────────────────────

function highlightDirections(text: string) {
  const directionRegex = /\b(north|south|east|west|above|below)\b/gi;
  const parts: (string | React.JSX.Element)[] = [];
  let lastIndex = 0;
  let match;
  while ((match = directionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<span key={match.index} className="text-interactive">{match[0]}</span>);
    lastIndex = directionRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

// ─── Tab Types ───────────────────────────────────────────────────────────────

type StatusTab = "environment" | "gear" | "character";

const TABS: { id: StatusTab; label: string }[] = [
  { id: "environment", label: "Environment" },
  { id: "gear", label: "Gear" },
  { id: "character", label: "Character" },
];

// ─── Props ───────────────────────────────────────────────────────────────────

export interface StatusPanelProps {
  compassRef: RefObject<HTMLDivElement | null>;
  onNavigate: (direction: string) => void;
  onSendCommand: (cmd: string) => void;
  onOpenInventory: () => void;
  mapState: Pick<MinimapWidgetProps, "visitedRooms" | "ghostRooms" | "positions" | "currentRoomId">;
  onToggleFullMap: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StatusPanel({
  compassRef,
  onNavigate,
  onSendCommand,
  onOpenInventory,
  mapState,
  onToggleFullMap,
}: StatusPanelProps) {
  const { state } = useAppContext();
  const version = useVersion();
  const [activeTab, setActiveTab] = useState<StatusTab>("environment");

  // ─── HP / Stamina / Posture ────────────────────────────────────────────────
  const hpPercent = state.playerMaxHp > 0 ? state.playerHp / state.playerMaxHp : 0;
  const staminaPercent = state.playerMaxStamina > 0 ? state.playerStamina / state.playerMaxStamina : 0;
  const healthState = hpPercent > 0.6
    ? { label: 'Healthy', color: 'text-success', barClass: 'status-bar-hp-healthy', numericClass: 'status-numeric-hp-healthy', pulse: false }
    : hpPercent >= 0.3
    ? { label: 'Wounded', color: 'text-warning', barClass: 'status-bar-hp-wounded', numericClass: 'status-numeric-hp-wounded', pulse: false }
    : { label: 'Critical', color: 'text-danger', barClass: 'status-bar-hp-critical', numericClass: 'status-numeric-hp-critical', pulse: true };

  // Posture from AppState, with combat action override (#404)
  const posture = state.pendingCombatAction
    ?? state.posture.charAt(0).toUpperCase() + state.posture.slice(1);

  const enemyStatus = state.enemyStatus;

  return (
    <div className="w-[30%] bg-bg-panel border-l border-border-muted flex flex-col" data-testid="status-panel">
      {/* ── Always-visible header ─────────────────────────────────────────── */}
      <div className="p-4 border-b border-border-muted space-y-3">
        {/* HP Bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-text-disabled text-xs font-sans">Health</span>
            <div className="flex items-center gap-2">
              <span
                className={`${healthState.color} text-xs font-mono ${healthState.pulse ? 'animate-pulse' : ''}`}
              >
                {healthState.label}
              </span>
              <span className={`text-xs font-mono ${healthState.numericClass}`}>
                {state.playerHp}/{state.playerMaxHp}
              </span>
            </div>
          </div>
          <div
            className="status-bar"
            role="progressbar"
            aria-label={`Health: ${state.playerHp} of ${state.playerMaxHp}`}
            aria-valuenow={state.playerHp}
            aria-valuemin={0}
            aria-valuemax={state.playerMaxHp}
          >
            <div
              className={`status-bar-fill ${healthState.barClass}`}
              style={{ width: `${hpPercent * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Stamina Bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-text-disabled text-xs font-sans">Stamina</span>
            <span className="text-xs font-mono status-numeric-stamina">
              {state.playerStamina}/{state.playerMaxStamina}
            </span>
          </div>
          <div
            className="status-bar"
            role="progressbar"
            aria-label={`Stamina: ${state.playerStamina} of ${state.playerMaxStamina}`}
            aria-valuenow={state.playerStamina}
            aria-valuemin={0}
            aria-valuemax={state.playerMaxStamina}
          >
            <div
              className="status-bar-fill status-bar-stamina"
              style={{ width: staminaPercent > 0 ? `${staminaPercent * 100}%` : '0%' }}
            ></div>
          </div>
        </div>

        {/* Posture */}
        <div className="flex items-center gap-2">
          <span className="text-text-disabled text-xs font-sans">Stance</span>
          <span className="text-text-primary text-sm font-mono">{posture}</span>
        </div>
      </div>

      {/* Status Effects */}
      {state.statusEffects && state.statusEffects.length > 0 && (
        <div className="px-4 py-2 border-b border-border-muted" data-testid="status-effects">
          <h3 className="text-text-secondary text-xs mb-1.5 font-sans">STATUS EFFECTS</h3>
          <div className="flex flex-wrap gap-1.5">
            {state.statusEffects.map((effect) => {
              const type = getEffectType(effect);
              return (
                <span
                  key={effect.id}
                  data-effect={effect.id}
                  className={`status-pill status-pill-${type} ${
                    type === 'debuff' ? 'text-danger' : type === 'buff' ? 'text-success' : 'text-text-secondary'
                  }`}
                >
                  {effect.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="flex border-b border-border-muted" data-testid="status-tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-2 py-1.5 text-xs font-sans transition-colors ${
              activeTab === tab.id
                ? "text-accent-gold border-b-2 border-accent-gold bg-bg-elevated/40"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "environment" && (
          <EnvironmentTab
            compassRef={compassRef}
            onNavigate={onNavigate}
            mapState={mapState}
            onToggleFullMap={onToggleFullMap}
            inCombat={state.inCombat}
            enemyStatus={enemyStatus}
            roomOccupants={state.roomOccupants}
          />
        )}
        {activeTab === "gear" && (
          <GearTab
            loadout={state.loadout}
            inventory={state.inventory}
            onOpenInventory={onOpenInventory}
          />
        )}
        {activeTab === "character" && (
          <CharacterTab
            soundCues={state.soundCues}
            onSendCommand={onSendCommand}
            onOpenInventory={onOpenInventory}
            combatStats={state.combatStats}
            effectiveStats={state.effectiveStats}
          />
        )}
      </div>

      {/* Version indicator */}
      <div className="mt-auto px-4 py-2 flex items-center justify-end gap-2 border-t border-border-muted">
        <span
          className="text-[10px] font-mono opacity-50 hover:opacity-80 transition-opacity cursor-default select-none"
          style={{ color: 'var(--color-text-secondary, #888)' }}
          title={`v${version.version} — Built: ${version.buildTime}`}
          aria-label={`Version ${version.version}, built ${version.buildTime}`}
          tabIndex={0}
        >
          v{version.version}
        </span>
        <a
          href="https://github.com/dkirby-ms/ellmud/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-40 hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-text-secondary, #888)' }}
          title="Report an issue"
          aria-label="Report an issue on GitHub"
        >
          <Bug className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ─── Environment Tab ─────────────────────────────────────────────────────────

interface EnvironmentTabProps {
  compassRef: RefObject<HTMLDivElement | null>;
  onNavigate: (direction: string) => void;
  mapState: Pick<MinimapWidgetProps, "visitedRooms" | "ghostRooms" | "positions" | "currentRoomId">;
  onToggleFullMap: () => void;
  inCombat: boolean;
  enemyStatus: EnemyStatus | null;
  roomOccupants: {
    creatures: Array<{ id: string; name: string; type: string; aggressive: boolean }>;
    players: Array<{ id: string; name: string; disconnected?: boolean }>;
  };
}

function EnvironmentTab({
  compassRef,
  onNavigate,
  mapState,
  onToggleFullMap,
  inCombat,
  enemyStatus,
  roomOccupants,
}: EnvironmentTabProps) {
  return (
    <>
      {/* Compass + Minimap */}
      <div className="flex items-center justify-center gap-4 px-4 py-3">
        <CompassControl ref={compassRef as React.RefObject<HTMLDivElement>} onNavigate={onNavigate} />
        <div className="h-16 border-l border-border-muted" />
        <MinimapWidget
          visitedRooms={mapState.visitedRooms}
          ghostRooms={mapState.ghostRooms}
          positions={mapState.positions}
          currentRoomId={mapState.currentRoomId}
          onToggleFullMap={onToggleFullMap}
        />
      </div>

      {/* Combat HUD (during combat) */}
      {inCombat && (
        <div className="p-4 border-t border-border-muted">
          <CombatHUD
            enemyStatus={enemyStatus}
            availableTargets={
              roomOccupants.creatures
                .filter((c) => c.aggressive)
                .map((c) => ({
                  id: c.id,
                  name: c.name,
                  hp: 100,
                  maxHp: 100,
                }))
            }
          />
        </div>
      )}

      {/* Room Occupants */}
      <div className="p-4 border-t border-border-muted">
        <RoomOccupants
          creatures={roomOccupants.creatures}
          players={roomOccupants.players}
        />
      </div>
    </>
  );
}

// ─── Gear Tab ────────────────────────────────────────────────────────────────

interface GearTabProps {
  loadout: import("@ellmud/shared").EquipmentSlots;
  inventory: Array<{ id: string; name: string; tier: import("@ellmud/shared").GearTier }>;
  onOpenInventory: () => void;
}

function GearTab({ loadout, inventory, onOpenInventory }: GearTabProps) {
  return (
    <>
      {/* Equipment Silhouette */}
      <div className="p-4">
        <EquipmentSilhouette loadout={loadout} />
      </div>

      {/* Inventory summary */}
      <div className="p-4 border-t border-border-muted">
        <h3 className="text-text-secondary text-xs mb-3 font-sans">INVENTORY</h3>
        <div className="space-y-2 text-sm">
          {inventory.length > 0 ? (
            inventory.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Sword className="w-4 h-4 text-text-secondary" />
                <span className="text-text-primary font-serif"><AnsiText text={item.name} /></span>
              </div>
            ))
          ) : (
            <p className="text-text-disabled text-xs font-sans">No items carried</p>
          )}
        </div>
        {inventory.length > 5 && (
          <button
            onClick={onOpenInventory}
            className="mt-2 text-accent-gold text-xs font-sans hover:underline"
          >
            +{inventory.length - 5} more — Open Inventory
          </button>
        )}
        {inventory.length > 0 && inventory.length <= 5 && (
          <button
            onClick={onOpenInventory}
            className="mt-3 w-full px-2 py-1.5 text-text-secondary hover:bg-bg-elevated hover:text-text-primary rounded text-xs transition-colors font-sans"
          >
            Open Full Inventory
          </button>
        )}
      </div>
    </>
  );
}

// ─── Character Tab ───────────────────────────────────────────────────────────

interface CharacterTabProps {
  soundCues: Array<{ id: string; text: string; timestamp: number }>;
  onSendCommand: (cmd: string) => void;
  onOpenInventory: () => void;
  combatStats: CombatStats;
  effectiveStats: EffectiveStats | null;
}

function CharacterTab({ soundCues, onSendCommand, onOpenInventory, combatStats, effectiveStats }: CharacterTabProps) {
  return (
    <>
      {/* Sound Cues */}
      <div className="p-4">
        <h3 className="text-text-secondary text-xs mb-3 font-sans">SOUND CUES</h3>
        <div className="space-y-2">
          {soundCues.length > 0 ? (
            soundCues.slice(-5).map((cue) => (
              <p
                key={cue.id}
                data-sound-cue={cue.id}
                className="text-text-secondary text-xs italic font-serif"
              >
                <span>{highlightDirections(cue.text)}</span>
              </p>
            ))
          ) : (
            <p className="text-text-disabled text-xs font-sans">Silence.</p>
          )}
        </div>
      </div>

      {/* Combat Skills */}
      <div className="p-4 border-t border-border-muted" data-testid="combat-stats">
        <h3 className="text-text-secondary text-xs mb-3 font-sans">COMBAT SKILLS</h3>

        {/* Effective Stats (with equipment bonuses) */}
        {effectiveStats && (
          <div className="mb-3" data-testid="effective-stats">
            <h4 className="text-text-secondary text-xs mb-1.5 font-sans">⚔ Effective Stats</h4>
            <div className="space-y-1 pl-2">
              <EffectiveStatRow label="Attack" effective={effectiveStats.attack} />
              <EffectiveStatRow label="Armour" effective={effectiveStats.armour} base={combatStats.armour} />
              <EffectiveStatRow label="Shield Block" effective={effectiveStats.shieldBlock} base={combatStats.shieldBlock} />
              <EffectiveStatRow label="Dodge" effective={effectiveStats.dodge} base={combatStats.dodge} />
              <EffectiveStatRow label="Max HP" effective={effectiveStats.maxHp} base={combatStats.maxHp} />
            </div>
          </div>
        )}

        {/* Weapon Skills */}
        <div className="mb-3">
          <h4 className="text-text-secondary text-xs mb-1.5 font-sans">⚔ Weapon Skills</h4>
          <div className="space-y-1 pl-2">
            <StatRow label="Unarmed" value={combatStats.unarmed} />
            <StatRow label="One-Handed" value={combatStats.oneHanded} />
            <StatRow label="Two-Handed" value={combatStats.twoHanded} />
            <StatRow label="Ranged" value={combatStats.ranged} />
          </div>
        </div>

        {/* Defence */}
        {!effectiveStats && (
          <div className="mb-3">
            <h4 className="text-text-secondary text-xs mb-1.5 font-sans">🛡 Defence</h4>
            <div className="space-y-1 pl-2">
              <StatRow label="Dodge" value={combatStats.dodge} />
              <StatRow label="Shield Block" value={combatStats.shieldBlock} />
              <StatRow label="Armour" value={combatStats.armour} />
            </div>
          </div>
        )}

        {/* Health */}
        {!effectiveStats && (
          <div>
            <h4 className="text-text-secondary text-xs mb-1.5 font-sans">❤ Health</h4>
            <div className="space-y-1 pl-2">
              <StatRow label="Max HP" value={combatStats.maxHp} />
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border-muted">
        <h3 className="text-text-secondary text-xs mb-3 font-sans">QUICK ACTIONS</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onSendCommand("look")}
            className="px-2 py-1 text-text-secondary hover:bg-bg-elevated hover:text-text-primary rounded text-xs transition-colors font-sans"
          >
            Look
          </button>
          <button
            onClick={() => onSendCommand("listen")}
            className="px-2 py-1 text-text-secondary hover:bg-bg-elevated hover:text-text-primary rounded text-xs transition-colors font-sans"
          >
            Listen
          </button>
          <button
            onClick={onOpenInventory}
            className="px-2 py-1 text-text-secondary hover:bg-bg-elevated hover:text-text-primary rounded text-xs transition-colors font-sans"
          >
            Inventory
          </button>
        </div>
      </div>
    </>
  );
}

/** Single stat row: label left-aligned, value right-aligned in monospace */
function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-text-primary text-xs font-sans">{label}</span>
      <span className="text-text-primary text-xs font-mono">{value}</span>
    </div>
  );
}

/** Effective stat row: shows effective value with optional base context */
function EffectiveStatRow({ label, effective, base }: { label: string; effective: number; base?: number }) {
  const showBase = base !== undefined && base !== effective;
  return (
    <div className="flex justify-between items-center">
      <span className="text-text-primary text-xs font-sans">{label}</span>
      <span className="text-text-primary text-xs font-mono">
        {effective}
        {showBase && (
          <span className="text-text-disabled ml-1">(base: {base})</span>
        )}
      </span>
    </div>
  );
}
