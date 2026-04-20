/**
 * CombinedStashLoadout — Unified equipment + stash panel.
 *
 * Layout: Loadout (LEFT) | Stash (RIGHT)
 * Server-authoritative: sends EQUIP_ITEM / UNEQUIP_ITEM, updates only on server confirm.
 * MUD terminal aesthetic: narrative-terminal, ansi-*, mud-* CSS classes.
 */

import { useState, useCallback } from 'react';
import type { Room } from '@colyseus/sdk';
import {
  EQUIPMENT_SLOT_ORDER,
  EQUIPMENT_SLOT_LABELS,
  SLOT_ACCEPTS,
  type EquipmentSlotType,
  type DisplayItem,
  type GearTier,
  type ItemType,
} from '@ellmud/shared';
import { useInventoryStore, type InventoryItem } from '../store/inventory.js';
import { sendEquipItem, sendUnequipItem } from '../services/connection';
import AnsiText from './AnsiText.js';

// ─── Tier → MUD CSS class mapping ───────────────────────────────────────────

const TIER_CLASS: Record<GearTier, string> = {
  scrap:       'ansi-dim',
  common:      'mud-common',
  sturdy:      'mud-uncommon',
  refined:     'mud-rare',
  masterwork:  'mud-epic',
  anomalous:   'mud-legendary',
};

function tierClass(tier: GearTier): string {
  return TIER_CLASS[tier] ?? 'mud-common';
}

// ─── Slot → Icon character (MUD-style ASCII) ────────────────────────────────

const SLOT_ICONS: Record<EquipmentSlotType, string> = {
  weapon:  '⚔',
  offhand: '🛡',
  head:    '⛑',
  chest:   '🧥',
  legs:    '👖',
  feet:    '👢',
  hands:   '🧤',
  ring1:   '💍',
  ring2:   '💍',
  amulet:  '📿',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function canFitSlot(itemType: ItemType, slot: EquipmentSlotType): boolean {
  return (SLOT_ACCEPTS[slot] as readonly string[]).includes(itemType);
}

function getValidSlots(item: DisplayItem): EquipmentSlotType[] {
  if (item.allowedSlots && item.allowedSlots.length > 0) return item.allowedSlots;
  return EQUIPMENT_SLOT_ORDER.filter(s => canFitSlot(item.type, s));
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface CombinedStashLoadoutProps {
  room: Room | null;
  /** When true, also shows zone-found items as equippable. */
  inZone?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CombinedStashLoadout({ room, inZone = false }: CombinedStashLoadoutProps) {
  const loadout = useInventoryStore(s => s.loadout);
  const stashItems = useInventoryStore(s => s.stashItems);
  const pendingEquipAction = useInventoryStore(s => s.pendingEquipAction);
  const inventory = useInventoryStore(s => s.inventory);
  const dispatch = useInventoryStore(s => s.dispatch);

  const [selectedItem, setSelectedItem] = useState<DisplayItem | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showFeedback = useCallback((msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 2500);
  }, []);

  // ── Equip from stash ────────────────────────────────────────────────────

  const handleStashItemClick = useCallback((item: DisplayItem) => {
    setSelectedItem(prev => prev?.instanceId === item.instanceId ? null : item);
  }, []);

  const handleSlotClick = useCallback((slot: EquipmentSlotType) => {
    if (!room) return;

    // If we have a selected item, try to equip it to this slot
    if (selectedItem) {
      const valid = getValidSlots(selectedItem);
      if (!valid.includes(slot)) {
        showFeedback("That doesn't fit there.");
        return;
      }
      dispatch({ type: 'SET_PENDING_EQUIP', pending: true });
      sendEquipItem(room, { itemId: selectedItem.instanceId, targetSlot: slot });
      setSelectedItem(null);
      return;
    }

    // No selected item — unequip whatever's in this slot
    const equipped = loadout[slot];
    if (equipped) {
      dispatch({ type: 'SET_PENDING_EQUIP', pending: true });
      sendUnequipItem(room, { slot });
    }
  }, [room, selectedItem, loadout, dispatch, showFeedback]);

  // ── Quick equip: auto-pick first valid slot ─────────────────────────────

  const handleQuickEquip = useCallback((item: DisplayItem) => {
    if (!room) return;
    const valid = getValidSlots(item);
    // Prefer empty slots
    const emptySlot = valid.find(s => loadout[s] === null);
    const target = emptySlot ?? valid[0];
    if (!target) {
      showFeedback("No valid slot for this item.");
      return;
    }
    dispatch({ type: 'SET_PENDING_EQUIP', pending: true });
    sendEquipItem(room, { itemId: item.instanceId, targetSlot: target });
    setSelectedItem(null);
  }, [room, loadout, dispatch, showFeedback]);

  // ── Zone inventory items (not in stash, found in current run) ──────────

  const zoneItems: InventoryItem[] = inZone ? inventory : [];

  // ── Highlighted slots for selected item ─────────────────────────────────

  const highlightedSlots = new Set(selectedItem ? getValidSlots(selectedItem) : []);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="narrative-terminal h-full flex flex-col" style={{ padding: '1rem' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3" style={{ borderBottom: '1px solid #2A2B35', paddingBottom: '0.5rem' }}>
        <span className="mud-exits" style={{ fontSize: '1rem' }}>
          ═══ EQUIPMENT &amp; {inZone ? 'INVENTORY' : 'STASH'} ═══
        </span>
        {pendingEquipAction && (
          <span className="ansi-yellow ansi-italic" style={{ fontSize: '0.8rem' }}>
            ⏳ Waiting for server...
          </span>
        )}
      </div>

      {/* Feedback message */}
      {feedbackMsg && (
        <div className="mud-system" style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}>
          [{feedbackMsg}]
        </div>
      )}

      {/* Main layout: Loadout LEFT | Stash RIGHT */}
      <div className="flex flex-1 min-h-0 gap-4">

        {/* ═══ LOADOUT PANEL (LEFT) ═══ */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-2">
            <span className="ansi-bright-yellow ansi-bold" style={{ fontSize: '0.85rem' }}>
              LOADOUT
            </span>
          </div>

          <div className="flex-1 overflow-y-auto narrative-scroll space-y-1">
            {EQUIPMENT_SLOT_ORDER.map(slot => {
              const item = loadout[slot];
              const isHighlighted = highlightedSlots.has(slot);
              const slotLabel = EQUIPMENT_SLOT_LABELS[slot];
              const icon = SLOT_ICONS[slot];

              return (
                <button
                  key={slot}
                  onClick={() => handleSlotClick(slot)}
                  disabled={pendingEquipAction}
                  className={`w-full text-left transition-colors ${
                    pendingEquipAction ? 'opacity-50 cursor-wait' : 'cursor-pointer'
                  }`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.5rem',
                    border: isHighlighted
                      ? '1px solid #C4A000'
                      : '1px solid #1C1D27',
                    borderRadius: '2px',
                    background: isHighlighted
                      ? 'rgba(196, 160, 0, 0.08)'
                      : 'transparent',
                  }}
                >
                  {/* Slot icon */}
                  <span style={{ width: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    {icon}
                  </span>

                  {/* Slot label */}
                  <span className="ansi-dim" style={{ width: '4.5rem', fontSize: '0.75rem', flexShrink: 0 }}>
                    {slotLabel}
                  </span>

                  {/* Equipped item or empty */}
                  {item ? (
                    <span className={tierClass(item.tier)} style={{ fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <AnsiText text={item.name} />
                    </span>
                  ) : (
                    <span className="ansi-dim" style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                      [empty]
                    </span>
                  )}

                  {/* Unequip hint */}
                  {item && !selectedItem && (
                    <span className="ansi-dim" style={{ fontSize: '0.65rem', marginLeft: 'auto', flexShrink: 0 }}>
                      click to unequip
                    </span>
                  )}

                  {/* Equip-here hint */}
                  {isHighlighted && selectedItem && (
                    <span className="ansi-yellow" style={{ fontSize: '0.65rem', marginLeft: 'auto', flexShrink: 0 }}>
                      ← equip here
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Slot type legend */}
          <div className="mt-2" style={{ borderTop: '1px solid #2A2B35', paddingTop: '0.4rem' }}>
            <span className="ansi-dim" style={{ fontSize: '0.7rem' }}>
              Slots: ⚔ weapon · 🛡 offhand · armour → head/chest/legs/feet/hands · 💍 rings · 📿 amulet
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: '#2A2B35', flexShrink: 0 }} />

        {/* ═══ STASH PANEL (RIGHT) ═══ */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-2">
            <span className="ansi-bright-yellow ansi-bold" style={{ fontSize: '0.85rem' }}>
              {inZone ? 'INVENTORY' : 'STASH'}
            </span>
            <span className="ansi-dim" style={{ fontSize: '0.75rem', marginLeft: '0.75rem' }}>
              {inZone ? inventory.length : stashItems.length} item{(inZone ? inventory.length : stashItems.length) !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto narrative-scroll">
            {(inZone ? inventory.length : stashItems.length) === 0 ? (
              <div className="mud-system" style={{ padding: '1rem 0', fontSize: '0.8rem', fontStyle: 'italic' }}>
                {inZone ? 'No items carried.' : 'Your stash is empty.'}
              </div>
            ) : inZone ? (
              <div className="space-y-px">
                {inventory.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2"
                    style={{
                      padding: '0.3rem 0.5rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span className={tierClass(item.tier)} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <AnsiText text={item.name} />
                    </span>
                    <span className="ansi-dim" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                      {item.weight}wt
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-px">
                {stashItems.map(item => {
                  const isSelected = selectedItem?.instanceId === item.instanceId;
                  return (
                    <div
                      key={item.instanceId}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleStashItemClick(item)}
                      onDoubleClick={() => handleQuickEquip(item)}
                      onKeyDown={(e) => e.key === 'Enter' && handleStashItemClick(item)}
                      className={`transition-colors ${
                        pendingEquipAction ? 'opacity-50 cursor-wait' : 'cursor-pointer'
                      }`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.3rem 0.5rem',
                        background: isSelected ? 'rgba(196, 160, 0, 0.12)' : 'transparent',
                        border: isSelected ? '1px solid #C4A000' : '1px solid transparent',
                        borderRadius: '2px',
                      }}
                    >
                      {/* Item type indicator */}
                      <span className="ansi-dim" style={{ fontSize: '0.7rem', width: '3.5rem', flexShrink: 0 }}>
                        [{item.type.slice(0, 4)}]
                      </span>

                      {/* Item name with tier color */}
                      <span className={tierClass(item.tier)} style={{ fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <AnsiText text={item.name} />
                      </span>

                      {/* Weight */}
                      <span className="ansi-dim" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                        {item.weight}wt
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Zone-Found Items Section ─────────────────────────────── */}
            {inZone && zoneItems.length > 0 && (
              <div style={{ marginTop: '0.75rem', borderTop: '1px dashed #2A2B35', paddingTop: '0.5rem' }}>
                <span className="ansi-bright-cyan" style={{ fontSize: '0.8rem' }}>
                  ── ZONE FINDS ──
                </span>
                <div className="space-y-px" style={{ marginTop: '0.25rem' }}>
                  {zoneItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                    >
                      <span className="ansi-bright-cyan">◆</span>
                      <span className={tierClass(item.tier)}>
                        <AnsiText text={item.name} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selected item detail */}
          {selectedItem && (
            <div style={{ borderTop: '1px solid #2A2B35', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`${tierClass(selectedItem.tier)}`} style={{ fontSize: '0.85rem' }}>
                  <AnsiText text={selectedItem.name} />
                </span>
                <span className="ansi-dim" style={{ fontSize: '0.7rem' }}>
                  ({selectedItem.tier})
                </span>
              </div>
              <div className="ansi-dim" style={{ fontSize: '0.7rem', marginBottom: '0.25rem' }}>
                {selectedItem.type} · {selectedItem.weight}wt
              </div>
              {selectedItem.description && (
                <div className="ansi-white" style={{ fontSize: '0.75rem', fontStyle: 'italic', marginBottom: '0.3rem' }}>
                  <AnsiText text={selectedItem.description} />
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => handleQuickEquip(selectedItem)}
                  disabled={pendingEquipAction || !room}
                  className="ansi-bright-green"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.5rem',
                    border: '1px solid #4E9A06',
                    borderRadius: '2px',
                    background: 'rgba(78, 154, 6, 0.1)',
                    cursor: pendingEquipAction ? 'wait' : 'pointer',
                  }}
                >
                  [Equip]
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="ansi-dim"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.5rem',
                    border: '1px solid #2A2B35',
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                >
                  [Cancel]
                </button>
              </div>
              <div className="ansi-dim" style={{ fontSize: '0.65rem', marginTop: '0.3rem' }}>
                Click a highlighted slot to equip, or double-click an item to auto-equip.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
