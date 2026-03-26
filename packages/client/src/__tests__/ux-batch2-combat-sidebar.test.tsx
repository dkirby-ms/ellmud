/**
 * ux-batch2-combat-sidebar.test.tsx — Anticipatory tests for UX Review Batch 2.
 *
 * Tests define the design contract for combat/sidebar polish gaps identified
 * in Elminster's UX review. These tests will FAIL until Batch 2 implementation
 * lands — they specify what the spec REQUIRES, not what currently exists.
 *
 * Gaps covered: #10, #11, #12, #13, #14, #15, #16, #18, #20, #21
 *
 * Theme tokens used (NOT hardcoded hex — Batch 1 token migration in progress):
 *   text-accent-gold, text-danger, text-text-secondary, text-interactive,
 *   text-success, text-warning, animate-pulse
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { useReducer } from 'react';
import {
  AppContext,
  appReducer,
  initialState,
  type AppState,
  type AppContextValue,
  type TerminalMessage,
} from '../store.js';
import ShardExploration from '../pages/ShardExploration.js';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../services/api.js', () => ({
  login: vi.fn(),
  register: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock('../services/connection.js', () => ({
  connect: vi.fn().mockResolvedValue(undefined),
  switchRoom: vi.fn().mockResolvedValue(undefined),
  sendCommand: vi.fn(),
  sendRawCommand: vi.fn(),
  resetClient: vi.fn(),
}));

vi.mock('../hooks/useShardConnection.js', () => ({
  useShardConnection: () => ({
    handleCommand: vi.fn(),
    handleExitClick: vi.fn(),
    handleCombatAction: vi.fn(),
    sendChatMessage: vi.fn(),
    extraction: { status: null, progress: 0, narration: null },
    reconnection: {
      overlayState: 'hidden',
      attempt: 0,
      elapsedSeconds: 0,
      reconnectNow: vi.fn(),
      cancel: vi.fn(),
      returnToRefuge: vi.fn(),
    },
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

let idCounter = 0;
function makeMsg(
  overrides: Partial<TerminalMessage> & { text: string },
): TerminalMessage {
  return {
    id: `test-msg-${++idCounter}`,
    type: 'combat',
    timestamp: Date.now(),
    ...overrides,
  };
}

function renderShardExploration(stateOverrides: Partial<AppState> = {}) {
  const state: AppState = {
    ...initialState,
    authenticated: true,
    token: 'test-token',
    playerId: 'test-player',
    connectionStatus: 'connected',
    ...stateOverrides,
  };

  const router = createMemoryRouter(
    [{ path: '/shard', Component: ShardExploration }],
    { initialEntries: ['/shard'] },
  );

  function Wrapper() {
    const [currentState, dispatch] = useReducer(appReducer, state);
    const ctxValue: AppContextValue = { state: currentState, dispatch };
    return (
      <AppContext.Provider value={ctxValue}>
        <RouterProvider router={router} />
      </AppContext.Provider>
    );
  }

  return render(<Wrapper />);
}

beforeEach(() => {
  idCounter = 0;
});

// ─── Gap #10: Combat text color-coding ───────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #10)
// design-prompt §5-6: hits dealt → gold, taken → red, dodges → silver

describe('Gap #10: Combat text color-coding', () => {
  it('hits dealt render with gold text class (text-accent-gold)', () => {
    // UX Review Batch 2 — anticipatory test (gap #10)
    const msg = makeMsg({
      text: 'You strike the corrupted sentinel for 12 damage.',
      type: 'combat',
      combatSubtype: 'hit_dealt',
    } as TerminalMessage);

    renderShardExploration({ messages: [msg] });

    const element = screen.getByText(/You strike the corrupted sentinel/);
    expect(element.closest('[data-combat-type]') ?? element).toHaveClass('mud-damage');
  });

  it('hits taken render with danger text class (text-danger)', () => {
    // UX Review Batch 2 — anticipatory test (gap #10)
    const msg = makeMsg({
      text: 'The sentinel slashes you for 8 damage.',
      type: 'combat',
      combatSubtype: 'hit_taken',
    } as TerminalMessage);

    renderShardExploration({ messages: [msg] });

    const element = screen.getByText(/The sentinel slashes you/);
    expect(element.closest('[data-combat-type]') ?? element).toHaveClass('mud-critical');
  });

  it('dodges render with secondary text class (text-text-secondary)', () => {
    // UX Review Batch 2 — anticipatory test (gap #10)
    const msg = makeMsg({
      text: 'You sidestep the attack.',
      type: 'combat',
      combatSubtype: 'dodge',
    } as TerminalMessage);

    renderShardExploration({ messages: [msg] });

    const element = screen.getByText(/You sidestep the attack/);
    expect(element.closest('[data-combat-type]') ?? element).toHaveClass('mud-dodge');
  });

  it('mixed combat log preserves correct colors per line type', () => {
    // UX Review Batch 2 — anticipatory test (gap #10)
    const messages = [
      makeMsg({ text: 'You strike for 10 damage.', combatSubtype: 'hit_dealt' } as TerminalMessage),
      makeMsg({ text: 'The goblin bites you for 5 damage.', combatSubtype: 'hit_taken' } as TerminalMessage),
      makeMsg({ text: 'You dodge the tail sweep.', combatSubtype: 'dodge' } as TerminalMessage),
    ];

    renderShardExploration({ messages });

    const hitDealt = screen.getByText(/You strike for 10 damage/);
    const hitTaken = screen.getByText(/The goblin bites you/);
    const dodge = screen.getByText(/You dodge the tail sweep/);

    expect(hitDealt.closest('[data-combat-type]') ?? hitDealt).toHaveClass('mud-damage');
    expect(hitTaken.closest('[data-combat-type]') ?? hitTaken).toHaveClass('mud-critical');
    expect(dodge.closest('[data-combat-type]') ?? dodge).toHaveClass('mud-dodge');
  });
});

// ─── Gap #11: Status effects section ─────────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #11)
// design-prompt §5: sidebar should show active status effects

describe('Gap #11: Status effects in sidebar', () => {
  it('status effects section renders when effects are active', () => {
    // UX Review Batch 2 — anticipatory test (gap #11)
    renderShardExploration({
      statusEffects: [
        { id: 'bleeding', name: 'Bleeding', duration: 3 },
      ],
    } as Partial<AppState>);

    expect(screen.getByText(/STATUS EFFECTS|EFFECTS/i)).toBeInTheDocument();
  });

  it('Bleeding effect shows with appropriate styling', () => {
    // UX Review Batch 2 — anticipatory test (gap #11)
    renderShardExploration({
      statusEffects: [
        { id: 'bleeding', name: 'Bleeding', duration: 3 },
      ],
    } as Partial<AppState>);

    const bleedingEl = screen.getByText('Bleeding');
    expect(bleedingEl).toBeInTheDocument();
    expect(bleedingEl.closest('[data-effect]') ?? bleedingEl).toHaveClass('text-danger');
  });

  it('Shard-sickness debuff displays correctly', () => {
    // UX Review Batch 2 — anticipatory test (gap #11)
    renderShardExploration({
      statusEffects: [
        { id: 'shard-sick', name: 'Shard-sick', duration: 10 },
      ],
    } as Partial<AppState>);

    expect(screen.getByText('Shard-sick')).toBeInTheDocument();
  });

  it('no status effects section when no effects active', () => {
    // UX Review Batch 2 — anticipatory test (gap #11)
    renderShardExploration({
      statusEffects: [],
    } as Partial<AppState>);

    expect(screen.queryByText(/STATUS EFFECTS|EFFECTS/i)).not.toBeInTheDocument();
  });
});

// ─── Gap #12: HP bar dynamic states ──────────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #12)
// gaps-brief §4C: green → amber → red+pulse based on HP percentage

describe('Gap #12: HP bar dynamic states', () => {
  it('HP > 60% renders healthy state with success/green indicator', () => {
    // UX Review Batch 2 — anticipatory test (gap #12)
    renderShardExploration({
      playerHp: 80,
      playerMaxHp: 100,
    } as Partial<AppState>);

    const healthLabel = screen.getByText('Healthy');
    expect(healthLabel).toHaveClass('text-success');
  });

  it('HP 25-60% renders wounded state with warning/amber indicator', () => {
    // UX Review Batch 2 — anticipatory test (gap #12)
    renderShardExploration({
      playerHp: 40,
      playerMaxHp: 100,
    } as Partial<AppState>);

    const healthLabel = screen.getByText('Wounded');
    expect(healthLabel).toHaveClass('text-warning');
  });

  it('HP < 25% renders critical state with danger/red and pulse animation', () => {
    // UX Review Batch 2 — anticipatory test (gap #12)
    renderShardExploration({
      playerHp: 15,
      playerMaxHp: 100,
    } as Partial<AppState>);

    const healthLabel = screen.getByText(/Critical|Near Death/);
    expect(healthLabel).toHaveClass('text-danger');
    expect(healthLabel).toHaveClass('animate-pulse');
  });
});

// ─── Gap #13: Stability bar width ────────────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #13)
// gaps-brief §3A: stability bar should span full narrative header width

describe('Gap #13: Stability bar spans full header width', () => {
  it('stability bar is not constrained to 128px (w-32)', () => {
    // UX Review Batch 2 — anticipatory test (gap #13)
    renderShardExploration({
      roomHeader: { roomName: 'Dark Crypt', exits: ['north'], stability: 0.6 },
    });

    const stabilityLabel = screen.getByText('Shard Stability');
    const barContainer = stabilityLabel.closest('div')?.querySelector('[class*="rounded-full"]');
    expect(barContainer).toBeDefined();
    // Must NOT have w-32 (128px constraint) — should use w-full or flex-1
    expect(barContainer).not.toHaveClass('w-32');
    expect(barContainer?.className).toMatch(/w-full|flex-1|flex-grow/);
  });
});

// ─── Gap #14-15: Collapse warning & pulse ────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #14, #15)
// gaps-brief §4D: "COLLAPSE IMMINENT" at <25% stability, pulse in red phase

describe('Gap #14-15: Collapse warning label and pulse', () => {
  it('"COLLAPSE IMMINENT" label appears when stability < 25%', () => {
    // UX Review Batch 2 — anticipatory test (gap #14)
    renderShardExploration({
      roomHeader: { roomName: 'Shattered Hall', exits: [], stability: 0.2 },
      shardState: 'destabilising',
      collapseTimer: 30,
      collapseTimerMax: 120,
    });

    expect(screen.getByText(/COLLAPSE IMMINENT/i)).toBeInTheDocument();
  });

  it('collapse warning has pulse animation class in red phase', () => {
    // UX Review Batch 2 — anticipatory test (gap #15)
    renderShardExploration({
      roomHeader: { roomName: 'Shattered Hall', exits: [], stability: 0.15 },
      shardState: 'destabilising',
      collapseTimer: 15,
      collapseTimerMax: 120,
    });

    const warning = screen.getByText(/COLLAPSE IMMINENT/i);
    expect(warning).toHaveClass('animate-pulse');
    expect(warning).toHaveClass('text-danger');
  });

  it('no warning label when stability >= 25%', () => {
    // UX Review Batch 2 — anticipatory test (gap #14)
    renderShardExploration({
      roomHeader: { roomName: 'Safe Room', exits: ['south'], stability: 0.5 },
      shardState: 'active',
      collapseTimer: 300,
      collapseTimerMax: 600,
    });

    expect(screen.queryByText(/COLLAPSE IMMINENT/i)).not.toBeInTheDocument();
  });
});

// ─── Gap #16: Sound cue direction highlighting ───────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #16)
// gaps-brief §3B: direction words highlighted in teal (text-interactive)

describe('Gap #16: Sound cue direction highlighting', () => {
  it('direction words (north, south, east, west, above, below) highlighted with interactive/teal class', () => {
    // UX Review Batch 2 — anticipatory test (gap #16)
    renderShardExploration({
      soundCues: [
        { id: 'sc-1', text: 'Footsteps echo from the north', timestamp: Date.now() },
      ],
    });

    const cueContainer = screen.getByText(/Footsteps echo from the/);
    const highlightedWord = within(cueContainer.closest('[data-sound-cue]') ?? cueContainer)
      .getByText('north');
    expect(highlightedWord).toHaveClass('text-interactive');
  });

  it('non-direction words in sound cues are not highlighted', () => {
    // UX Review Batch 2 — anticipatory test (gap #16)
    renderShardExploration({
      soundCues: [
        { id: 'sc-2', text: 'A distant growl from the east', timestamp: Date.now() },
      ],
    });

    const cueContainer = screen.getByText(/distant growl/);
    // "distant" and "growl" should NOT have the interactive highlight class
    expect(cueContainer).not.toHaveClass('text-interactive');
  });
});

// ─── Gap #18: Auto-complete hint ─────────────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #18)
// gaps-brief §3E: auto-complete suggestion above command input

describe('Gap #18: Auto-complete hint above command input', () => {
  it('auto-complete suggestion appears above command input when typing', async () => {
    // UX Review Batch 2 — anticipatory test (gap #18)
    const user = userEvent.setup();
    renderShardExploration();

    const input = screen.getByPlaceholderText('Type a command...');
    await user.type(input, 'str');

    // An autocomplete hint should appear (e.g., "strike")
    expect(screen.getByTestId('autocomplete-hint')).toBeInTheDocument();
    expect(screen.getByTestId('autocomplete-hint')).toHaveTextContent(/strike/i);
  });

  it('hint updates as user types more characters', async () => {
    // UX Review Batch 2 — anticipatory test (gap #18)
    const user = userEvent.setup();
    renderShardExploration();

    const input = screen.getByPlaceholderText('Type a command...');
    await user.type(input, 'lo');

    const hint = screen.getByTestId('autocomplete-hint');
    expect(hint).toHaveTextContent(/look/i);
  });

  it('hint disappears when input is empty', async () => {
    // UX Review Batch 2 — anticipatory test (gap #18)
    const user = userEvent.setup();
    renderShardExploration();

    const input = screen.getByPlaceholderText('Type a command...');
    await user.type(input, 'go');
    expect(screen.getByTestId('autocomplete-hint')).toBeInTheDocument();

    await user.clear(input);
    expect(screen.queryByTestId('autocomplete-hint')).not.toBeInTheDocument();
  });
});

// ─── Gap #20: Tick timer countdown bar ───────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #20)
// gaps-brief §2A: tick timer should render as a progress bar, not just text

describe('Gap #20: Tick timer renders as progress bar', () => {
  it('tick timer renders a progress bar element during combat', () => {
    // UX Review Batch 2 — anticipatory test (gap #20)
    renderShardExploration({
      inCombat: true,
      combatTick: 3,
    });

    const tickBar = screen.getByTestId('tick-timer-bar');
    expect(tickBar).toBeInTheDocument();
    expect(tickBar.getAttribute('role')).toBe('progressbar');
  });

  it('tick timer bar reflects tick progress', () => {
    // UX Review Batch 2 — anticipatory test (gap #20)
    renderShardExploration({
      inCombat: true,
      combatTick: 3,
    });

    const tickBar = screen.getByTestId('tick-timer-bar');
    // The bar should have aria-valuenow reflecting current progress
    expect(tickBar).toHaveAttribute('aria-valuenow');
    const value = Number(tickBar.getAttribute('aria-valuenow'));
    expect(value).toBeGreaterThan(0);
  });
});

// ─── Gap #21: Skill button in combat quickbar ────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #21)
// design-prompt §6: 8 combat actions including "Skill"

describe('Gap #21: Skill button in combat quickbar', () => {
  it('combat quickbar has 8 action buttons (not 7)', () => {
    // UX Review Batch 2 — anticipatory test (gap #21)
    renderShardExploration({
      inCombat: true,
      combatTick: 1,
    });

    // All 8 expected actions: Strike, Heavy Strike, Dodge, Block, Use Item, Skill, Flee, Observe
    const expectedActions = ['Strike', 'Heavy Strike', 'Dodge', 'Block', 'Use Item', 'Skill', 'Flee', 'Observe'];
    for (const label of expectedActions) {
      expect(screen.getByRole('button', { name: new RegExp(`^\\d*\\s*${label}$`, 'i') })).toBeInTheDocument();
    }
  });

  it('"Skill" button is present in the combat quickbar', () => {
    // UX Review Batch 2 — anticipatory test (gap #21)
    renderShardExploration({
      inCombat: true,
      combatTick: 1,
    });

    const skillButton = screen.getByRole('button', { name: /Skill/i });
    expect(skillButton).toBeInTheDocument();
  });
});
