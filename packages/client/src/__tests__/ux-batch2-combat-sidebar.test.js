"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const react_router_1 = require("react-router");
const react_2 = require("react");
const store_js_1 = require("../store.js");
const ShardExploration_js_1 = __importDefault(require("../pages/ShardExploration.js"));
// ─── Mocks ───────────────────────────────────────────────────────────────────
vitest_1.vi.mock('../services/api.js', () => ({
    login: vitest_1.vi.fn(),
    register: vitest_1.vi.fn(),
    ApiError: class ApiError extends Error {
        status;
        constructor(message, status) {
            super(message);
            this.status = status;
        }
    },
}));
vitest_1.vi.mock('../services/connection.js', () => ({
    connect: vitest_1.vi.fn().mockResolvedValue(undefined),
    switchRoom: vitest_1.vi.fn().mockResolvedValue(undefined),
    sendCommand: vitest_1.vi.fn(),
    sendRawCommand: vitest_1.vi.fn(),
    resetClient: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('../hooks/useShardConnection.js', () => ({
    useShardConnection: () => ({
        handleCommand: vitest_1.vi.fn(),
        handleExitClick: vitest_1.vi.fn(),
        handleCombatAction: vitest_1.vi.fn(),
        sendChatMessage: vitest_1.vi.fn(),
        extraction: { status: null, progress: 0, narration: null },
        reconnection: {
            overlayState: 'hidden',
            attempt: 0,
            elapsedSeconds: 0,
            reconnectNow: vitest_1.vi.fn(),
            cancel: vitest_1.vi.fn(),
            returnToRefuge: vitest_1.vi.fn(),
        },
    }),
}));
// ─── Helpers ─────────────────────────────────────────────────────────────────
let idCounter = 0;
function makeMsg(overrides) {
    return {
        id: `test-msg-${++idCounter}`,
        type: 'combat',
        timestamp: Date.now(),
        ...overrides,
    };
}
function renderShardExploration(stateOverrides = {}) {
    const state = {
        ...store_js_1.initialState,
        authenticated: true,
        token: 'test-token',
        playerId: 'test-player',
        connectionStatus: 'connected',
        ...stateOverrides,
    };
    const router = (0, react_router_1.createMemoryRouter)([{ path: '/shard', Component: ShardExploration_js_1.default }], { initialEntries: ['/shard'] });
    function Wrapper() {
        const [currentState, dispatch] = (0, react_2.useReducer)(store_js_1.appReducer, state);
        const ctxValue = { state: currentState, dispatch };
        return (<store_js_1.AppContext.Provider value={ctxValue}>
        <react_router_1.RouterProvider router={router}/>
      </store_js_1.AppContext.Provider>);
    }
    return (0, react_1.render)(<Wrapper />);
}
(0, vitest_1.beforeEach)(() => {
    idCounter = 0;
});
// ─── Gap #10: Combat text color-coding ───────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #10)
// design-prompt §5-6: hits dealt → gold, taken → red, dodges → silver
(0, vitest_1.describe)('Gap #10: Combat text color-coding', () => {
    (0, vitest_1.it)('hits dealt render with gold text class (text-accent-gold)', () => {
        // UX Review Batch 2 — anticipatory test (gap #10)
        const msg = makeMsg({
            text: 'You strike the corrupted sentinel for 12 damage.',
            type: 'combat',
            combatSubtype: 'hit_dealt',
        });
        renderShardExploration({ messages: [msg] });
        const element = react_1.screen.getByText(/You strike the corrupted sentinel/);
        (0, vitest_1.expect)(element.closest('[data-combat-type]') ?? element).toHaveClass('text-accent-gold');
    });
    (0, vitest_1.it)('hits taken render with danger text class (text-danger)', () => {
        // UX Review Batch 2 — anticipatory test (gap #10)
        const msg = makeMsg({
            text: 'The sentinel slashes you for 8 damage.',
            type: 'combat',
            combatSubtype: 'hit_taken',
        });
        renderShardExploration({ messages: [msg] });
        const element = react_1.screen.getByText(/The sentinel slashes you/);
        (0, vitest_1.expect)(element.closest('[data-combat-type]') ?? element).toHaveClass('text-danger');
    });
    (0, vitest_1.it)('dodges render with secondary text class (text-text-secondary)', () => {
        // UX Review Batch 2 — anticipatory test (gap #10)
        const msg = makeMsg({
            text: 'You sidestep the attack.',
            type: 'combat',
            combatSubtype: 'dodge',
        });
        renderShardExploration({ messages: [msg] });
        const element = react_1.screen.getByText(/You sidestep the attack/);
        (0, vitest_1.expect)(element.closest('[data-combat-type]') ?? element).toHaveClass('text-text-secondary');
    });
    (0, vitest_1.it)('mixed combat log preserves correct colors per line type', () => {
        // UX Review Batch 2 — anticipatory test (gap #10)
        const messages = [
            makeMsg({ text: 'You strike for 10 damage.', combatSubtype: 'hit_dealt' }),
            makeMsg({ text: 'The goblin bites you for 5 damage.', combatSubtype: 'hit_taken' }),
            makeMsg({ text: 'You dodge the tail sweep.', combatSubtype: 'dodge' }),
        ];
        renderShardExploration({ messages });
        const hitDealt = react_1.screen.getByText(/You strike for 10 damage/);
        const hitTaken = react_1.screen.getByText(/The goblin bites you/);
        const dodge = react_1.screen.getByText(/You dodge the tail sweep/);
        (0, vitest_1.expect)(hitDealt.closest('[data-combat-type]') ?? hitDealt).toHaveClass('text-accent-gold');
        (0, vitest_1.expect)(hitTaken.closest('[data-combat-type]') ?? hitTaken).toHaveClass('text-danger');
        (0, vitest_1.expect)(dodge.closest('[data-combat-type]') ?? dodge).toHaveClass('text-text-secondary');
    });
});
// ─── Gap #11: Status effects section ─────────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #11)
// design-prompt §5: sidebar should show active status effects
(0, vitest_1.describe)('Gap #11: Status effects in sidebar', () => {
    (0, vitest_1.it)('status effects section renders when effects are active', () => {
        // UX Review Batch 2 — anticipatory test (gap #11)
        renderShardExploration({
            statusEffects: [
                { id: 'bleeding', name: 'Bleeding', duration: 3 },
            ],
        });
        (0, vitest_1.expect)(react_1.screen.getByText(/STATUS EFFECTS|EFFECTS/i)).toBeInTheDocument();
    });
    (0, vitest_1.it)('Bleeding effect shows with appropriate styling', () => {
        // UX Review Batch 2 — anticipatory test (gap #11)
        renderShardExploration({
            statusEffects: [
                { id: 'bleeding', name: 'Bleeding', duration: 3 },
            ],
        });
        const bleedingEl = react_1.screen.getByText('Bleeding');
        (0, vitest_1.expect)(bleedingEl).toBeInTheDocument();
        (0, vitest_1.expect)(bleedingEl.closest('[data-effect]') ?? bleedingEl).toHaveClass('text-danger');
    });
    (0, vitest_1.it)('Shard-sickness debuff displays correctly', () => {
        // UX Review Batch 2 — anticipatory test (gap #11)
        renderShardExploration({
            statusEffects: [
                { id: 'shard-sick', name: 'Shard-sick', duration: 10 },
            ],
        });
        (0, vitest_1.expect)(react_1.screen.getByText('Shard-sick')).toBeInTheDocument();
    });
    (0, vitest_1.it)('no status effects section when no effects active', () => {
        // UX Review Batch 2 — anticipatory test (gap #11)
        renderShardExploration({
            statusEffects: [],
        });
        (0, vitest_1.expect)(react_1.screen.queryByText(/STATUS EFFECTS|EFFECTS/i)).not.toBeInTheDocument();
    });
});
// ─── Gap #12: HP bar dynamic states ──────────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #12)
// gaps-brief §4C: green → amber → red+pulse based on HP percentage
(0, vitest_1.describe)('Gap #12: HP bar dynamic states', () => {
    (0, vitest_1.it)('HP > 60% renders healthy state with success/green indicator', () => {
        // UX Review Batch 2 — anticipatory test (gap #12)
        renderShardExploration({
            playerHp: 80,
            playerMaxHp: 100,
        });
        const healthLabel = react_1.screen.getByText('Healthy');
        (0, vitest_1.expect)(healthLabel).toHaveClass('text-success');
    });
    (0, vitest_1.it)('HP 25-60% renders wounded state with warning/amber indicator', () => {
        // UX Review Batch 2 — anticipatory test (gap #12)
        renderShardExploration({
            playerHp: 40,
            playerMaxHp: 100,
        });
        const healthLabel = react_1.screen.getByText('Wounded');
        (0, vitest_1.expect)(healthLabel).toHaveClass('text-warning');
    });
    (0, vitest_1.it)('HP < 25% renders critical state with danger/red and pulse animation', () => {
        // UX Review Batch 2 — anticipatory test (gap #12)
        renderShardExploration({
            playerHp: 15,
            playerMaxHp: 100,
        });
        const healthLabel = react_1.screen.getByText(/Critical|Near Death/);
        (0, vitest_1.expect)(healthLabel).toHaveClass('text-danger');
        (0, vitest_1.expect)(healthLabel).toHaveClass('animate-pulse');
    });
});
// ─── Gap #13: Stability bar width ────────────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #13)
// gaps-brief §3A: stability bar should span full narrative header width
(0, vitest_1.describe)('Gap #13: Stability bar spans full header width', () => {
    (0, vitest_1.it)('stability bar is not constrained to 128px (w-32)', () => {
        // UX Review Batch 2 — anticipatory test (gap #13)
        renderShardExploration({
            roomHeader: { roomName: 'Dark Crypt', exits: ['north'], stability: 0.6 },
        });
        const stabilityLabel = react_1.screen.getByText('Shard Stability');
        const barContainer = stabilityLabel.closest('div')?.querySelector('[class*="rounded-full"]');
        (0, vitest_1.expect)(barContainer).toBeDefined();
        // Must NOT have w-32 (128px constraint) — should use w-full or flex-1
        (0, vitest_1.expect)(barContainer).not.toHaveClass('w-32');
        (0, vitest_1.expect)(barContainer?.className).toMatch(/w-full|flex-1|flex-grow/);
    });
});
// ─── Gap #14-15: Collapse warning & pulse ────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #14, #15)
// gaps-brief §4D: "COLLAPSE IMMINENT" at <25% stability, pulse in red phase
(0, vitest_1.describe)('Gap #14-15: Collapse warning label and pulse', () => {
    (0, vitest_1.it)('"COLLAPSE IMMINENT" label appears when stability < 25%', () => {
        // UX Review Batch 2 — anticipatory test (gap #14)
        renderShardExploration({
            roomHeader: { roomName: 'Shattered Hall', exits: [], stability: 0.2 },
            shardState: 'destabilising',
            collapseTimer: 30,
            collapseTimerMax: 120,
        });
        (0, vitest_1.expect)(react_1.screen.getByText(/COLLAPSE IMMINENT/i)).toBeInTheDocument();
    });
    (0, vitest_1.it)('collapse warning has pulse animation class in red phase', () => {
        // UX Review Batch 2 — anticipatory test (gap #15)
        renderShardExploration({
            roomHeader: { roomName: 'Shattered Hall', exits: [], stability: 0.15 },
            shardState: 'destabilising',
            collapseTimer: 15,
            collapseTimerMax: 120,
        });
        const warning = react_1.screen.getByText(/COLLAPSE IMMINENT/i);
        (0, vitest_1.expect)(warning).toHaveClass('animate-pulse');
        (0, vitest_1.expect)(warning).toHaveClass('text-danger');
    });
    (0, vitest_1.it)('no warning label when stability >= 25%', () => {
        // UX Review Batch 2 — anticipatory test (gap #14)
        renderShardExploration({
            roomHeader: { roomName: 'Safe Room', exits: ['south'], stability: 0.5 },
            shardState: 'active',
            collapseTimer: 300,
            collapseTimerMax: 600,
        });
        (0, vitest_1.expect)(react_1.screen.queryByText(/COLLAPSE IMMINENT/i)).not.toBeInTheDocument();
    });
});
// ─── Gap #16: Sound cue direction highlighting ───────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #16)
// gaps-brief §3B: direction words highlighted in teal (text-interactive)
(0, vitest_1.describe)('Gap #16: Sound cue direction highlighting', () => {
    (0, vitest_1.it)('direction words (north, south, east, west, above, below) highlighted with interactive/teal class', () => {
        // UX Review Batch 2 — anticipatory test (gap #16)
        renderShardExploration({
            soundCues: [
                { id: 'sc-1', text: 'Footsteps echo from the north', timestamp: Date.now() },
            ],
        });
        const cueContainer = react_1.screen.getByText(/Footsteps echo from the/);
        const highlightedWord = (0, react_1.within)(cueContainer.closest('[data-sound-cue]') ?? cueContainer)
            .getByText('north');
        (0, vitest_1.expect)(highlightedWord).toHaveClass('text-interactive');
    });
    (0, vitest_1.it)('non-direction words in sound cues are not highlighted', () => {
        // UX Review Batch 2 — anticipatory test (gap #16)
        renderShardExploration({
            soundCues: [
                { id: 'sc-2', text: 'A distant growl from the east', timestamp: Date.now() },
            ],
        });
        const cueContainer = react_1.screen.getByText(/distant growl/);
        // "distant" and "growl" should NOT have the interactive highlight class
        (0, vitest_1.expect)(cueContainer).not.toHaveClass('text-interactive');
    });
});
// ─── Gap #18: Auto-complete hint ─────────────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #18)
// gaps-brief §3E: auto-complete suggestion above command input
(0, vitest_1.describe)('Gap #18: Auto-complete hint above command input', () => {
    (0, vitest_1.it)('auto-complete suggestion appears above command input when typing', async () => {
        // UX Review Batch 2 — anticipatory test (gap #18)
        const user = user_event_1.default.setup();
        renderShardExploration();
        const input = react_1.screen.getByPlaceholderText('Type a command...');
        await user.type(input, 'str');
        // An autocomplete hint should appear (e.g., "strike")
        (0, vitest_1.expect)(react_1.screen.getByTestId('autocomplete-hint')).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByTestId('autocomplete-hint')).toHaveTextContent(/strike/i);
    });
    (0, vitest_1.it)('hint updates as user types more characters', async () => {
        // UX Review Batch 2 — anticipatory test (gap #18)
        const user = user_event_1.default.setup();
        renderShardExploration();
        const input = react_1.screen.getByPlaceholderText('Type a command...');
        await user.type(input, 'lo');
        const hint = react_1.screen.getByTestId('autocomplete-hint');
        (0, vitest_1.expect)(hint).toHaveTextContent(/look/i);
    });
    (0, vitest_1.it)('hint disappears when input is empty', async () => {
        // UX Review Batch 2 — anticipatory test (gap #18)
        const user = user_event_1.default.setup();
        renderShardExploration();
        const input = react_1.screen.getByPlaceholderText('Type a command...');
        await user.type(input, 'go');
        (0, vitest_1.expect)(react_1.screen.getByTestId('autocomplete-hint')).toBeInTheDocument();
        await user.clear(input);
        (0, vitest_1.expect)(react_1.screen.queryByTestId('autocomplete-hint')).not.toBeInTheDocument();
    });
});
// ─── Gap #20: Tick timer countdown bar ───────────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #20)
// gaps-brief §2A: tick timer should render as a progress bar, not just text
(0, vitest_1.describe)('Gap #20: Tick timer renders as progress bar', () => {
    (0, vitest_1.it)('tick timer renders a progress bar element during combat', () => {
        // UX Review Batch 2 — anticipatory test (gap #20)
        renderShardExploration({
            inCombat: true,
            combatTick: 3,
        });
        const tickBar = react_1.screen.getByTestId('tick-timer-bar');
        (0, vitest_1.expect)(tickBar).toBeInTheDocument();
        (0, vitest_1.expect)(tickBar.getAttribute('role')).toBe('progressbar');
    });
    (0, vitest_1.it)('tick timer bar reflects tick progress', () => {
        // UX Review Batch 2 — anticipatory test (gap #20)
        renderShardExploration({
            inCombat: true,
            combatTick: 3,
        });
        const tickBar = react_1.screen.getByTestId('tick-timer-bar');
        // The bar should have aria-valuenow reflecting current progress
        (0, vitest_1.expect)(tickBar).toHaveAttribute('aria-valuenow');
        const value = Number(tickBar.getAttribute('aria-valuenow'));
        (0, vitest_1.expect)(value).toBeGreaterThan(0);
    });
});
// ─── Gap #21: Skill button in combat quickbar ────────────────────────────────
// UX Review Batch 2 — anticipatory test (gap #21)
// design-prompt §6: 8 combat actions including "Skill"
(0, vitest_1.describe)('Gap #21: Skill button in combat quickbar', () => {
    (0, vitest_1.it)('combat quickbar has 8 action buttons (not 7)', () => {
        // UX Review Batch 2 — anticipatory test (gap #21)
        renderShardExploration({
            inCombat: true,
            combatTick: 1,
        });
        // All 8 expected actions: Strike, Heavy Strike, Dodge, Block, Use Item, Skill, Flee, Observe
        const expectedActions = ['Strike', 'Heavy Strike', 'Dodge', 'Block', 'Use Item', 'Skill', 'Flee', 'Observe'];
        for (const label of expectedActions) {
            (0, vitest_1.expect)(react_1.screen.getByRole('button', { name: new RegExp(`^\\d*\\s*${label}$`, 'i') })).toBeInTheDocument();
        }
    });
    (0, vitest_1.it)('"Skill" button is present in the combat quickbar', () => {
        // UX Review Batch 2 — anticipatory test (gap #21)
        renderShardExploration({
            inCombat: true,
            combatTick: 1,
        });
        const skillButton = react_1.screen.getByRole('button', { name: /Skill/i });
        (0, vitest_1.expect)(skillButton).toBeInTheDocument();
    });
});
//# sourceMappingURL=ux-batch2-combat-sidebar.test.js.map