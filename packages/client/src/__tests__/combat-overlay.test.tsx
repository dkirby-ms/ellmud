import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CombatOverlay } from '../components/CombatOverlay.js';
import { EnemyStatusPanel } from '../components/EnemyStatusPanel.js';
import { AppContext, initialState, getHpTier, type AppState, type EnemyStatus } from '../store.js';

vi.mock('../services/connection.js', () => ({ sendRawCommand: vi.fn() }));
import { sendRawCommand } from '../services/connection.js';

function renderOverlay(overrides: Partial<AppState> = {}) {
  const state: AppState = { ...initialState, ...overrides };
  const dispatch = vi.fn();
  return { ...render(<AppContext.Provider value={{ state, dispatch }}><CombatOverlay /></AppContext.Provider>), dispatch };
}

describe('CombatOverlay', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.mocked(sendRawCommand).mockClear(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('hidden when not in combat', () => { renderOverlay({ inCombat: false }); expect(screen.queryByRole('region', { name: 'Combat' })).not.toBeInTheDocument(); });
  it('renders combat banner', () => { renderOverlay({ inCombat: true }); expect(screen.getByText('⚔ COMBAT')).toBeInTheDocument(); });
  it('has accent line', () => { renderOverlay({ inCombat: true }); expect(document.querySelector('.combat-banner-accent')).toBeInTheDocument(); });
  it('renders tick timer', () => { renderOverlay({ inCombat: true, combatTick: 1 }); expect(screen.getByRole('progressbar', { name: 'Tick timer' })).toBeInTheDocument(); });
  it('renders all 8 action buttons', () => {
    renderOverlay({ inCombat: true });
    for (const l of ['Strike (key 1)', 'Heavy Strike (key 2)', 'Dodge (key 3)', 'Block (key 4)', 'Use Item (key 5)', 'Skill (key 6)', 'Flee (key 7)', 'Observe (key 8)'])
      expect(screen.getByRole('button', { name: l })).toBeInTheDocument();
  });
  it('has superscripts', () => { renderOverlay({ inCombat: true }); expect(screen.getByText('¹')).toBeInTheDocument(); expect(screen.getByText('⁸')).toBeInTheDocument(); });
  it('clicking action sends command', () => {
    const r = { send: vi.fn() } as unknown;
    const { dispatch } = renderOverlay({ inCombat: true, room: r });
    fireEvent.click(screen.getByRole('button', { name: 'Strike (key 1)' }));
    expect(sendRawCommand).toHaveBeenCalledWith(r, 'strike');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PENDING_COMBAT_ACTION', action: 'strike' });
  });
  it('keyboard shortcut triggers action', () => {
    const r = { send: vi.fn() } as unknown;
    renderOverlay({ inCombat: true, room: r });
    fireEvent.keyDown(window, { key: '3' });
    expect(sendRawCommand).toHaveBeenCalledWith(r, 'dodge');
  });
  it('no shortcuts outside combat', () => { const r = { send: vi.fn() } as unknown; renderOverlay({ inCombat: false, room: r }); fireEvent.keyDown(window, { key: '1' }); expect(sendRawCommand).not.toHaveBeenCalled(); });
  it('active button has gold class', () => { renderOverlay({ inCombat: true, pendingCombatAction: 'dodge' }); expect(screen.getByRole('button', { name: 'Dodge (key 3)' }).className).toContain('action-btn--active'); });
  it('fades in', () => { renderOverlay({ inCombat: true }); act(() => { vi.advanceTimersByTime(16); }); expect(screen.getByRole('region', { name: 'Combat' }).className).toContain('combat-overlay--visible'); });
  it('has toolbar role', () => { renderOverlay({ inCombat: true }); expect(screen.getByRole('toolbar', { name: 'Combat actions' })).toBeInTheDocument(); });
});

describe('EnemyStatusPanel', () => {
  function rp(e: EnemyStatus) { return render(<EnemyStatusPanel enemy={e} />); }
  it('displays name', () => { rp({ name: 'Drowned Revenant', hp: 100, maxHp: 100, hpTier: 'Uninjured', telegraphedAction: null }); expect(screen.getByText('Drowned Revenant').className).toContain('enemy-name'); });
  it('Uninjured class', () => { rp({ name: 'R', hp: 100, maxHp: 100, hpTier: 'Uninjured', telegraphedAction: null }); expect(screen.getByText('Uninjured').className).toContain('hp-uninjured'); });
  it('Wounded class', () => { rp({ name: 'R', hp: 60, maxHp: 100, hpTier: 'Wounded', telegraphedAction: null }); expect(screen.getByText('Wounded').className).toContain('hp-wounded'); });
  it('Badly Wounded class', () => { rp({ name: 'R', hp: 25, maxHp: 100, hpTier: 'Badly Wounded', telegraphedAction: null }); expect(screen.getByText('Badly Wounded').className).toContain('hp-badly-wounded'); });
  it('Near Death class', () => { rp({ name: 'R', hp: 5, maxHp: 100, hpTier: 'Near Death', telegraphedAction: null }); expect(screen.getByText('Near Death').className).toContain('hp-near-death'); });
  it('shows telegraphed action', () => { rp({ name: 'R', hp: 50, maxHp: 100, hpTier: 'Wounded', telegraphedAction: 'Rears back...' }); expect(screen.getByText('Rears back...').className).toContain('enemy-telegraphed'); });
  it('hides telegraphed when null', () => { rp({ name: 'R', hp: 50, maxHp: 100, hpTier: 'Wounded', telegraphedAction: null }); expect(document.querySelector('.enemy-telegraphed')).not.toBeInTheDocument(); });
  it('has region role', () => { rp({ name: 'R', hp: 100, maxHp: 100, hpTier: 'Uninjured', telegraphedAction: null }); expect(screen.getByRole('region', { name: 'Enemy status' })).toBeInTheDocument(); });
});

describe('getHpTier', () => {
  it('>75% = Uninjured', () => expect(getHpTier(80, 100)).toBe('Uninjured'));
  it('41-75% = Wounded', () => expect(getHpTier(50, 100)).toBe('Wounded'));
  it('16-40% = Badly Wounded', () => expect(getHpTier(30, 100)).toBe('Badly Wounded'));
  it('<=15% = Near Death', () => expect(getHpTier(10, 100)).toBe('Near Death'));
  it('0 HP = Near Death', () => expect(getHpTier(0, 100)).toBe('Near Death'));
  it('0 maxHp = Near Death', () => expect(getHpTier(0, 0)).toBe('Near Death'));
});
