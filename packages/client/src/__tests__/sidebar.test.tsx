import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShardSidebar } from '../components/ShardSidebar.js';
import { AppContext, initialState, type AppState, type SoundCue } from '../store.js';
import type { Room } from '@colyseus/sdk';

vi.mock('../services/connection.js', () => ({ sendRawCommand: vi.fn() }));
import { sendRawCommand } from '../services/connection.js';

function renderSidebar(overrides: Partial<AppState> = {}) {
  const state: AppState = { ...initialState, shardState: 'active', roomHeader: { roomName: 'Flooded Antechamber', exits: ['north', 'south'], stability: 0.8 }, ...overrides };
  const dispatch = vi.fn();
  return { ...render(<AppContext.Provider value={{ state, dispatch }}><ShardSidebar /></AppContext.Provider>), dispatch };
}

// TODO: ShardSidebar.tsx moved to _old/ during UX overhaul. Sidebar UI is now part of new page layout components.
// Rewrite tests for new sidebar implementation.
describe.skip('ShardSidebar', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('displays current room name', () => { renderSidebar(); expect(screen.getByText('Flooded Antechamber')).toBeInTheDocument(); });
  it('shows "Unknown Location" when no room header', () => { renderSidebar({ roomHeader: null }); expect(screen.getByText('Unknown Location')).toBeInTheDocument(); });
  it('room name uses serif font class', () => { renderSidebar(); expect(screen.getByText('Flooded Antechamber').className).toContain('sidebar-room-name'); });
  it('displays collapse timer', () => { renderSidebar({ collapseTimer: 90, collapseTimerMax: 120 }); expect(screen.getByLabelText('Collapse timer')).toHaveTextContent('90s'); });
  it('hides timer when null', () => { renderSidebar({ collapseTimer: null }); expect(screen.queryByLabelText('Collapse timer')).not.toBeInTheDocument(); });
  it('timer white class when ratio > 0.6', () => { renderSidebar({ collapseTimer: 80, collapseTimerMax: 100 }); expect(screen.getByLabelText('Collapse timer').className).toContain('timer-white'); });
  it('timer amber class when ratio 0.3-0.6', () => { renderSidebar({ collapseTimer: 40, collapseTimerMax: 100 }); expect(screen.getByLabelText('Collapse timer').className).toContain('timer-amber'); });
  it('timer red class when ratio < 0.3', () => { renderSidebar({ collapseTimer: 10, collapseTimerMax: 100 }); expect(screen.getByLabelText('Collapse timer').className).toContain('timer-red'); });
  it('shows empty sound cues message', () => { renderSidebar({ soundCues: [] }); expect(screen.getByText('No sounds detected...')).toBeInTheDocument(); });
  it('displays sound cues with timestamps', () => {
    const cues: SoundCue[] = [{ id: 'sc-1', text: 'Footsteps echo nearby', timestamp: new Date(2026, 0, 1, 14, 30, 15).getTime() }];
    renderSidebar({ soundCues: cues });
    expect(screen.getByText('Footsteps echo nearby')).toBeInTheDocument();
    expect(screen.getByText('14:30:15')).toBeInTheDocument();
  });
  it('sound cues panel is scrollable', () => { renderSidebar(); expect(screen.getByRole('log', { name: 'Sound cues' })).toBeInTheDocument(); });
  it('shows enemy status during combat', () => {
    renderSidebar({ inCombat: true, enemyStatus: { name: 'Drowned Revenant', hp: 80, maxHp: 100, hpTier: 'Uninjured', telegraphedAction: null } });
    expect(screen.getByText('Drowned Revenant')).toBeInTheDocument();
    expect(screen.queryByText('Sound Cues')).not.toBeInTheDocument();
  });
  it('shows sound cues when not in combat', () => { renderSidebar({ inCombat: false }); expect(screen.getByText('Sound Cues')).toBeInTheDocument(); });
  it('shows Empty for no inventory', () => { renderSidebar({ inventory: [] }); expect(screen.getByText('Empty')).toBeInTheDocument(); });
  it('displays inventory items', () => {
    renderSidebar({ inventory: [{ id: 'i1', name: 'Rusty Sword', tier: 'common' as const }, { id: 'i2', name: 'Iron Shield', tier: 'sturdy' as const }] });
    expect(screen.getByText('Rusty Sword')).toBeInTheDocument();
  });
  it('truncates inventory to 5', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ id: `i${i}`, name: `Item ${i}`, tier: 'common' as const }));
    renderSidebar({ inventory: items });
    expect(screen.getByText('Item 4')).toBeInTheDocument();
    expect(screen.queryByText('Item 5')).not.toBeInTheDocument();
  });
  it('renders 4 mini-action buttons', () => { renderSidebar(); for (const b of ['Look', 'Map', 'Evasion', 'Loot']) expect(screen.getByText(b)).toBeInTheDocument(); });
  it('mini-action sends command', () => { const r = { send: vi.fn() } as unknown as Room; renderSidebar({ room: r }); fireEvent.click(screen.getByText('Look')); expect(sendRawCommand).toHaveBeenCalledWith(r, 'look'); });
  it('has complementary role', () => { renderSidebar(); expect(screen.getByRole('complementary', { name: 'Shard exploration' })).toBeInTheDocument(); });
});
