# Figma Export → Ellmud Client: Conversion Strategy

> **Author:** Elminster (Lead/Architect)  
> **Date:** 2026-03-19  
> **Status:** Authoritative — this is the plan the team follows.

---

## 1. Export Audit

### 1.1 Screens Inventory

| Screen | File | Lines | Purpose | Status |
|---|---|---|---|---|
| Login/Register | `pages/Login.tsx` | 160 | Auth entry point with login/register toggle | Complete layout |
| Character Select | `pages/CharacterSelect.tsx` | 255 | Character list + creation with faction picker | Complete layout |
| Refuge (Hub) | `pages/Refuge.tsx` | 334 | Hub with 7-tab navigation, ambient events, chat sidebar | Complete layout |
| Shard Exploration | `pages/ShardExploration.tsx` | 576 | Main gameplay: narrative panel (70%) + sidebar (30%) + command input + combat overlay | Complete layout |
| Leaderboard | `pages/Leaderboard.tsx` | 383 | Seasonal rankings, personal stats, contracts | Complete layout |
| Settings | `pages/Settings.tsx` | 494 | 6-category settings panel (account, display, narration, audio, keybinds, accessibility) | Complete layout |

| Component | File | Lines | Purpose |
|---|---|---|---|
| ShardboardTab | `components/ShardboardTab.tsx` | 190 | Shard selection cards with tier/biome/modifiers/rumor |
| StashTab | `components/StashTab.tsx` | 185 | Item inventory with tier coloring + durability bars |
| LoadoutTab | `components/LoadoutTab.tsx` | 309 | Equipment slots (6), consumables (4), tools (2), shard key |
| shadcn/ui library | `components/ui/*.tsx` | ~48 files | Full shadcn/ui component library (buttons, dialogs, forms, etc.) |

### 1.2 Routing

```
/                → Login
/characters      → CharacterSelect
/refuge          → Refuge (with tab sub-navigation)
/shard/:shardId  → ShardExploration
/leaderboard     → Leaderboard
/settings        → Settings
```

Uses `react-router` v7 with `createBrowserRouter`. Clean and standard.

### 1.3 UI Patterns

**Design system (theme.css):**
- CSS custom properties for the full Ellmud palette — matches the GDD/Figma design prompt exactly.
- Three font families declared: `--font-serif` (Crimson Text), `--font-mono` (JetBrains Mono), `--font-sans` (Inter).
- Google Fonts loaded via CSS import.
- Tailwind CSS v4 with `@tailwindcss/vite` plugin. Theme tokens exposed via `@theme inline`.
- Base layer styles for body, headings, labels, buttons, inputs.

**Component patterns:**
- All pages are self-contained React components with local `useState` for interactivity.
- No shared state management (no context, no store, no Zustand/Redux).
- Mock data hardcoded directly in each component file.
- Lucide React icons used consistently across all pages.
- Inline `style={{ fontFamily: "var(--font-*)" }}` used extensively (rather than Tailwind utility classes for font family).
- Color values hardcoded as hex literals in className strings (e.g., `text-[#C9A84C]`) rather than using theme tokens.

**Navigation:** `useNavigate` from react-router for all page transitions. No auth guards or protected routes.

### 1.4 Quality Assessment

**Strengths:**
- ✅ **Excellent visual design.** The Figma AI prototype nails the dark-fantasy MUD aesthetic from the design prompt. Colors, typography, layout proportions are production-quality.
- ✅ **Correct screen architecture.** The 70/30 narrative+sidebar split in ShardExploration, the tabbed Refuge, the command input bar with history — all match the GDD's design vision.
- ✅ **Narrative entry types.** ShardExploration defines `NarrativeEntry` with types `room | combat | trace | sound | system | speech` — exactly maps to the server message categories.
- ✅ **Combat overlay pattern.** The combat action bar conditionally renders below the narrative, overlaying on the exploration view. Correct UX pattern.
- ✅ **Collapse timer.** Implemented with live countdown, color transitions (white → amber → red), "Destabilising" warning. Maps to GDD shard lifecycle.
- ✅ **Command history.** Arrow-up/down navigation through previous commands. Classic MUD UX.
- ✅ **Tier coloring system.** Consistent tier → color mapping in both StashTab and ShardboardTab.
- ✅ **Clickable exits.** Exit buttons in narrative that populate the command bar — matches the GDD's "click or type" accessibility requirement.
- ✅ **Font strategy.** Serif for narrative, mono for commands/system, sans for UI chrome. Exactly right.

**Weaknesses:**
- ❌ **Pervasive hardcoded colors.** Every component uses raw hex values (`text-[#C9A84C]`, `bg-[#12131A]`) instead of theme tokens (`text-accent-gold`, `bg-bg-panel`). This must be refactored for maintainability.
- ❌ **Inline font-family styles everywhere.** `style={{ fontFamily: "var(--font-serif)" }}` appears on nearly every text element. Should be Tailwind utility classes (e.g., `font-serif`, `font-mono`).
- ❌ **No shared state.** Each page is an island. No mechanism to pass auth tokens, character selection, game state, or WebSocket connection between screens.
- ❌ **All data is mock.** Every piece of data (characters, items, shards, leaderboard, chat) is hardcoded. Zero API or WebSocket integration.
- ❌ **Zero error handling.** No loading states, no error boundaries, no connection status indicators.
- ❌ **No responsive design.** Fixed percentage widths (`w-[40%]`, `w-[70%]`, `w-[30%]`). No breakpoint considerations.
- ❌ **shadcn/ui library mostly unused.** The export ships ~48 shadcn/ui primitives but the page components use raw HTML/Tailwind instead. The library is scaffold bloat.
- ❌ **Duplicate code patterns.** Progress bars, tier color functions, and top-bar layouts are copy-pasted across components.

### 1.5 Summary Verdict

> **The visual design and screen architecture are excellent and should be preserved. The code implementation is throwaway scaffold that needs systematic refactoring.** The mock data, hardcoded colors, inline styles, and absence of state management mean every file will be edited — but the *layouts and visual patterns* are the reusable asset, not the code itself.

---

## 2. Gap Analysis

### 2.1 Missing Screens

| Missing Screen | Priority | Notes |
|---|---|---|
| **Extraction Sequence** | Phase C | Transition from shard → refuge with loot summary. Currently just `navigate("/refuge")`. |
| **Death/Downed Screen** | Phase C | What the player sees when HP reaches 0. Not present. |
| **Reconnection Overlay** | Phase B | WebSocket disconnect → reconnecting → reconnected states. |
| **Loading/Transition States** | Phase B | Shard loading, room transitions, combat initiation. |

### 2.2 Missing Interactivity

| Gap | Impact | Resolution |
|---|---|---|
| **No WebSocket connection** | Critical | Colyseus `@colyseus/sdk` client integration |
| **No command processing** | Critical | Commands must be sent to server, not processed locally |
| **No real-time narrative** | Critical | Narrative panel must receive server `broadcast` messages |
| **No combat tick sync** | Critical | Combat actions must sync to 1s server tick |
| **No auth flow** | High | Login must POST to auth endpoint, receive token, establish WebSocket |
| **Chat not connected** | High | Refuge chat must flow through RefugeRoom messages |
| **Shard list not dynamic** | High | Shardboard must query matchmaker for available shards |
| **Inventory not persistent** | High | Stash/loadout must read from player persistence |
| **Settings not persistent** | Medium | Narration preferences must be sent to server (affects LLM prompts) |
| **No reconnection handling** | Medium | WebSocket drop → reconnect with Colyseus token |

### 2.3 Missing Data Flow

The Figma export has **zero data flow infrastructure**:

1. **No Colyseus client SDK** — must add `@colyseus/sdk` (or `colyseus.js`)
2. **No state management** — game state lives nowhere between components
3. **No message protocol** — server message types not defined
4. **No auth context** — no token storage, no session management
5. **No environment config** — no server URL, no API endpoints

### 2.4 What's Static vs. What Must Become Dynamic

| Element | Currently | Must Become |
|---|---|---|
| Character list | Hardcoded `mockCharacters` array | REST API call on page load |
| Shard list | Hardcoded `mockShards` array | Matchmaker query (Colyseus) |
| Narrative text | Hardcoded `initialNarrative` + local mock | Server `broadcast("narrate", ...)` messages |
| Command processing | Local switch statement | `room.send("command", { text })` |
| Combat actions | Local string concatenation | `room.send("action", { type })` |
| Chat messages | Local state array | RefugeRoom messages |
| Inventory/stash | Hardcoded `mockItems` | Player state from server |
| Loadout | Hardcoded `equipmentSlots` | Player state from server |
| Health/status bars | Static 75% | Server state updates |
| Collapse timer | Local `setInterval` countdown | Server `broadcast("shard:tick", { collapse_remaining })` |
| Ambient events | Hardcoded string array | RefugeRoom `broadcast("ambient", ...)` |
| Nearby players | Hardcoded array | RefugeRoom presence data |
| Leaderboard | Hardcoded mock data | REST API endpoint |
| Settings | Local `useState` only | REST API for persistence + server preference messages |

---

## 3. Conversion Strategy

### 3.1 Keep vs. Rewrite vs. Adapt

| Layer | Decision | Rationale |
|---|---|---|
| **Visual design / palette** | **KEEP** | theme.css is production-quality. Colors, fonts, spacing are correct. |
| **Screen layouts** | **ADAPT** | The structural HTML/JSX layout of each page is correct. Refactor to use theme tokens instead of hardcoded hex. Extract shared components. |
| **Page components** | **REWRITE** | Every page needs: remove mock data, add Colyseus message handlers, add state management hooks, add loading/error states. The JSX structure guides the rewrite but the logic is 100% replaced. |
| **Tab components** | **ADAPT** | ShardboardTab, StashTab, LoadoutTab have good layouts. Wire to real data, extract shared patterns (tier colors, progress bars). |
| **shadcn/ui library** | **SELECTIVE KEEP** | Keep only components actually used or planned: `button`, `input`, `select`, `tabs`, `dialog`, `scroll-area`, `tooltip`, `progress`, `separator`, `badge`, `switch`, `slider`, `radio-group`. Drop the other ~30 unused primitives. |
| **Routing** | **ADAPT** | Add auth guards, route-level loading, Colyseus room join/leave lifecycle hooks. Keep the URL structure. |
| **Styling approach** | **REFACTOR** | Migrate hardcoded hex to Tailwind theme tokens. Replace inline `style={{ fontFamily }}` with Tailwind utility classes. Add `font-serif`, `font-mono`, `font-sans` to Tailwind config. |
| **Build tooling** | **KEEP** | Vite + React + Tailwind CSS v4 is the right stack. Keep the config. |

### 3.2 Colyseus Client Integration

**Pattern: Message-only client (no Schema sync)**

```typescript
// client/src/lib/colyseus.ts
import { Client, Room } from "colyseus.js";

const client = new Client("wss://ellmud.kirbytoso.xyz");

// Join patterns:
const refuge = await client.joinOrCreate("refuge", { token });
const shard = await client.joinOrCreate("shard", { token, shardId });

// Send commands:
room.send("command", { text: "go north" });
room.send("action", { type: "strike" });
room.send("chat", { text: "Anyone here?" });

// Receive narration:
room.onMessage("narrate", (msg: NarrateMessage) => { ... });
room.onMessage("combat:tick", (msg: CombatTickMessage) => { ... });
room.onMessage("shard:tick", (msg: ShardTickMessage) => { ... });
room.onMessage("ambient", (msg: AmbientMessage) => { ... });
room.onMessage("chat", (msg: ChatMessage) => { ... });
room.onMessage("error", (msg: ErrorMessage) => { ... });
```

**Critical constraint:** The client MUST NOT subscribe to `room.state` or `room.onStateChange`. This is the schema leakage prevention required by architecture decisions.

**Reconnection:**
```typescript
room.onLeave((code) => {
  if (code === 1006) { // abnormal close
    showReconnectOverlay();
    client.reconnect(room.reconnectionToken)
      .then(reconnectedRoom => { ... })
      .catch(() => navigateToLogin());
  }
});
```

### 3.3 State Management

**Approach: React Context + useReducer (no external library)**

The game's state model is simple — the server is authoritative and the client is a thin view layer. We don't need Redux/Zustand complexity.

```
GameProvider (context)
├── auth: { token, username }
├── character: { id, name, faction, stats }
├── narrative: NarrativeEntry[]     ← appended by server messages
├── room: { name, exits }           ← updated by server messages
├── combat: { active, actions, tick }
├── shard: { id, collapseRemaining }
├── inventory: Item[]
├── loadout: EquipmentSlot[]
├── connection: { status, roomRef }
└── settings: { verbosity, fontSize, narrationStyle }
```

**Why not Zustand/Redux:**
- The client is purely reactive to server messages. No complex client-side state logic.
- Context + useReducer is sufficient for ~10 state slices.
- Fewer dependencies = smaller bundle = faster load.
- If we discover we need more power later, Zustand is a clean migration from useReducer.

### 3.4 Command Input → Server

The command input bar in ShardExploration already has the right UX (monospace, `>` prompt, arrow-key history). The conversion:

1. **Remove** the local mock `handleCommand` switch statement.
2. **Replace** with `room.send("command", { text: command })`.
3. **Keep** the command history logic (client-side, no server involvement).
4. **Add** a "sending" state (brief visual feedback that command was sent).
5. **Add** debounce/throttle: max 1 command per 200ms to prevent spam.

### 3.5 Narrative Panel ← Server Messages

The narrative panel receives server messages and appends them to a scrolling log:

```typescript
room.onMessage("narrate", (msg) => {
  dispatch({ type: "APPEND_NARRATIVE", payload: msg });
  // msg shape: { type, content, room?, exits?, timestamp }
  // Types: "room" | "combat" | "trace" | "sound" | "system" | "speech"
});
```

**Scroll behavior:**
- Auto-scroll to bottom on new messages (already implemented in the export).
- If user has scrolled up (reading history), do NOT auto-scroll. Show a "↓ New messages" indicator.
- Cap the narrative buffer at ~500 entries client-side to prevent memory bloat.

**Rendering rules (from Figma export, preserved):**
- `room` type: Gold room name header + serif prose + clickable exits
- `combat` type: Serif prose, same as room but no header
- `trace` type: Italic, indented, with Eye icon
- `sound` type: Italic, indented, with Volume2 icon
- `system` type: Monospace, dark grey
- `speech` type: NPC/player speech with speaker name

### 3.6 Combat Mode

The Figma export's combat pattern is correct: a conditional action bar appears below the narrative, above the command input. The conversion:

1. **Server sends** `combat:start` message → `dispatch({ type: "COMBAT_START" })` → show action bar.
2. **Player clicks action** → `room.send("action", { type: "strike" })`.
3. **Server sends** `combat:tick` with round results → append to narrative.
4. **Server sends** `combat:end` → hide action bar.
5. **Tick visualization:** Show a subtle 1-second countdown in the action bar so the player knows the tick window.
6. **No-input default:** If the player doesn't act within the tick window, the server defaults to `dodge` (per GDD). The client should show this visually.

### 3.7 Real-Time Concerns

| Concern | Strategy |
|---|---|
| **Message throttling** | Server-side rate limiting. Client-side: 200ms command debounce. |
| **Scroll performance** | Virtual scrolling if narrative exceeds 200 entries (use `react-window` or native). Cap buffer at 500. |
| **Reconnection** | Colyseus reconnection tokens. 30-60s window. Show overlay during reconnection. |
| **Message ordering** | Server timestamps on all messages. Client renders in order received (WebSocket guarantees ordering). |
| **Stale data** | On reconnect, server sends full room state snapshot (room description, exits, combat state, nearby entities). |
| **Bundle size** | Tree-shake unused deps. Target <200KB gzipped JS. |

---

## 4. Dependency Audit

### 4.1 KEEP (needed for game client)

| Package | Reason |
|---|---|
| `react`, `react-dom` (peer) | Core framework |
| `react-router` | Client routing (already configured correctly) |
| `lucide-react` | Icon library (used across all pages — good, lightweight) |
| `class-variance-authority` | shadcn/ui dependency (component variants) |
| `clsx` | Conditional className utility |
| `tailwind-merge` | Tailwind class merging |
| `@tailwindcss/vite` (dev) | Tailwind v4 Vite plugin |
| `tailwindcss` (dev) | Tailwind CSS v4 |
| `@vitejs/plugin-react` (dev) | Vite React plugin |
| `vite` (dev) | Build tool |

### 4.2 ADD (required for Ellmud)

| Package | Reason |
|---|---|
| `colyseus.js` | Colyseus client SDK — WebSocket connection to game server |

### 4.3 DROP (Figma scaffold bloat)

| Package | Reason |
|---|---|
| `@emotion/react`, `@emotion/styled` | MUI CSS-in-JS — conflicts with Tailwind, unused |
| `@mui/icons-material`, `@mui/material` | Material UI — conflicts with Tailwind/shadcn, unused (using Lucide) |
| `@popperjs/core`, `react-popper` | Positioning lib — Radix handles this natively |
| `canvas-confetti` | Confetti effects — not appropriate for dark fantasy |
| `cmdk` | Command palette — we have our own command input |
| `date-fns` | Date formatting — minimal use, Intl API sufficient |
| `embla-carousel-react` | Carousel — no carousel UI in the game |
| `input-otp` | OTP input — no OTP auth flow |
| `motion` | Animation library (Framer Motion) — drop for now, add back if needed |
| `next-themes` | Next.js theme switching — wrong framework, dark-only |
| `react-day-picker` | Date picker — no calendar UI |
| `react-dnd`, `react-dnd-html5-backend` | Drag-and-drop — not needed for Phase 1 |
| `react-hook-form` | Form library — our forms are simple enough for native React |
| `react-resizable-panels` | Resizable panels — fixed layout for now |
| `react-responsive-masonry` | Masonry layout — not used |
| `react-slick` | Slider/carousel — not used |
| `recharts` | Charts library — not used (leaderboard is a table) |
| `sonner` | Toast notifications — replace with simple custom toast |
| `tw-animate-css` | Animation CSS — evaluate later, not critical |
| `vaul` | Drawer component — not needed |

### 4.4 SELECTIVE KEEP (Radix primitives)

Only keep Radix primitives that shadcn/ui components we actually use depend on:

| Keep | Used By |
|---|---|
| `@radix-ui/react-dialog` | Modal dialogs (death screen, extraction summary) |
| `@radix-ui/react-dropdown-menu` | Context menus on items |
| `@radix-ui/react-label` | Form labels |
| `@radix-ui/react-progress` | Health/durability bars |
| `@radix-ui/react-scroll-area` | Narrative panel scroll |
| `@radix-ui/react-select` | Settings dropdowns |
| `@radix-ui/react-separator` | Visual dividers |
| `@radix-ui/react-slider` | Font size slider |
| `@radix-ui/react-switch` | Settings toggles |
| `@radix-ui/react-tabs` | Refuge tab navigation |
| `@radix-ui/react-tooltip` | Item/action tooltips |
| `@radix-ui/react-slot` | shadcn/ui composition primitive |
| `@radix-ui/react-radio-group` | Verbosity selection |
| `@radix-ui/react-toggle-group` | Layout toggle |

**Drop these Radix packages (unused):**
`react-accordion`, `react-alert-dialog`, `react-aspect-ratio`, `react-avatar`, `react-checkbox`, `react-collapsible`, `react-context-menu`, `react-hover-card`, `react-menubar`, `react-navigation-menu`, `react-popover`, `react-toggle`

### 4.5 Dependency Count

- **Before:** ~55 packages (dependencies + devDependencies + Radix)
- **After:** ~22 packages (+ colyseus.js)
- **Reduction:** ~60% fewer dependencies

---

## 5. Phased Conversion Plan

### Phase A: Foundation (Week 1-2)

**Goal:** Stripped-down client that can connect to a Colyseus server and display messages.

1. **A1: Scaffold client project** — Copy Figma export into `packages/client/`. Clean `package.json` (remove bloat deps). Verify Vite builds.
2. **A2: Theme token refactor** — Replace all hardcoded hex values with Tailwind theme tokens. Define `font-serif`, `font-mono`, `font-sans` as Tailwind utilities. Remove all inline `style={{ fontFamily }}`.
3. **A3: Colyseus client setup** — Install `colyseus.js`. Create `lib/colyseus.ts` with connection management. Define message type interfaces (`NarrateMessage`, `CombatTickMessage`, etc.).
4. **A4: State management** — Create `GameProvider` context with `useReducer`. Define all state slices and action types.
5. **A5: Auth flow** — Wire Login page to auth endpoint (REST). Store token. Establish Colyseus connection on successful auth.
6. **A6: Extract shared components** — Top bar, progress bars, tier color utility, button variants. Deduplicate across pages.

**Exit criteria:** `npm run build` succeeds. Client connects to a Colyseus server. Login flow works end-to-end.

### Phase B: Core Screens (Week 3-5)

**Goal:** Login → Character Select → Refuge → Shard Exploration with real server data.

1. **B1: Character Select** — Wire to REST API for character list and creation.
2. **B2: Refuge shell** — Join RefugeRoom on entering `/refuge`. Wire ambient events and chat to server messages. Wire nearby players to room presence.
3. **B3: Shardboard** — Query matchmaker for available shards. Display real shard data.
4. **B4: Stash + Loadout** — Wire to player state from server. Equip/unequip via `room.send`.
5. **B5: Shard entry** — Join ShardRoom when entering shard. Display initial room narration from server.
6. **B6: Narrative panel** — Wire to `onMessage("narrate")`. Implement scroll-lock behavior. Buffer management.
7. **B7: Command input** — Wire to `room.send("command")`. Remove mock command handler.

**Exit criteria:** Full flow from login → character select → refuge → enter shard → receive server narration → type commands → see results.

### Phase C: Gameplay (Week 6-8)

**Goal:** Combat, extraction, and real-time game loop working.

1. **C1: Combat mode** — Wire combat action bar to server messages. Show tick timer. Handle `combat:start`/`combat:tick`/`combat:end`.
2. **C2: Collapse timer** — Wire to `shard:tick` server messages. Remove local countdown.
3. **C3: Extraction sequence** — Create extraction overlay/screen showing loot summary, survival stats. Wire to server extraction confirmation.
4. **C4: Death/downed screen** — Create death overlay. Handle death message from server.
5. **C5: Reconnection** — Implement reconnect overlay. Wire Colyseus reconnection tokens. Handle stale state recovery.
6. **C6: Sound/trace rendering** — Ensure sound cues sidebar updates from server messages. Trace entries in narrative.

**Exit criteria:** Complete solo gameplay loop: login → loadout → enter shard → explore → combat → extract or die → return to refuge with persisted loot.

### Phase D: Polish (Week 9-10)

**Goal:** Chat, settings persistence, responsive behavior, edge cases.

1. **D1: Chat system** — Wire Refuge chat to RefugeRoom messages. Support say/whisper/emote.
2. **D2: Settings persistence** — Save narration preferences to server. Apply font size/verbosity from saved settings.
3. **D3: Leaderboard** — Wire to REST API endpoint for seasonal stats.
4. **D4: Loading states** — Add skeleton loaders, transition states, connection indicators throughout.
5. **D5: Error handling** — Error boundaries, server error display, graceful degradation.
6. **D6: Responsive breakpoints** — Tablet (1024px) breakpoint. Collapsible sidebar on smaller screens.
7. **D7: Accessibility** — ARIA labels, keyboard navigation, screen reader mode toggle from Settings.

**Exit criteria:** Production-ready client suitable for Phase 1 MVP deployment.

---

## 6. File Placement

### Monorepo Structure

```
ellmud/
├── packages/
│   ├── client/               ← Figma export converted here
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── pages/          ← Page components (Login, Refuge, etc.)
│   │   │   │   ├── components/     ← Shared UI components
│   │   │   │   │   └── ui/         ← shadcn/ui primitives (pruned)
│   │   │   │   ├── App.tsx
│   │   │   │   └── routes.ts
│   │   │   ├── lib/
│   │   │   │   ├── colyseus.ts     ← Colyseus client wrapper
│   │   │   │   ├── messages.ts     ← Message type definitions
│   │   │   │   └── api.ts          ← REST API client (auth, leaderboard)
│   │   │   ├── state/
│   │   │   │   ├── GameProvider.tsx ← React Context + useReducer
│   │   │   │   ├── actions.ts      ← Action type definitions
│   │   │   │   └── reducer.ts      ← State reducer
│   │   │   ├── hooks/
│   │   │   │   ├── useRoom.ts      ← Colyseus room lifecycle hook
│   │   │   │   ├── useNarrative.ts ← Narrative buffer management
│   │   │   │   └── useAuth.ts      ← Auth context hook
│   │   │   └── styles/
│   │   │       ├── theme.css       ← Preserved from Figma export
│   │   │       ├── index.css
│   │   │       ├── fonts.css
│   │   │       └── tailwind.css
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   ├── server/               ← Colyseus game server (existing)
│   │   └── ...
│   │
│   └── shared/               ← Shared types between client and server
│       └── src/
│           ├── messages.ts   ← Message type interfaces (shared)
│           └── types.ts      ← Game types (Item, Character, etc.)
│
├── docs/
├── GDD.md
└── package.json              ← Workspace root
```

### Key Principle: `packages/shared/`

Message type definitions and game entity types MUST be shared between client and server. This prevents drift and ensures the client's TypeScript types match what the server actually sends. The `shared` package is the contract.

```typescript
// packages/shared/src/messages.ts
export interface NarrateMessage {
  type: "room" | "combat" | "trace" | "sound" | "system" | "speech";
  content: string;
  room?: string;
  exits?: string[];
  speaker?: string;
  timestamp: number;
}

export interface CombatTickMessage {
  round: number;
  actions: CombatAction[];
  narrative: string;
  combatantsAlive: boolean;
}

export interface ShardTickMessage {
  collapseRemaining: number;  // seconds
  phase: "open" | "active" | "destabilising" | "collapsing";
}
```

---

## 7. Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| **Theme token migration breaks visual fidelity** | Medium | Side-by-side comparison screenshots before/after. The Figma export is the visual reference. |
| **Colyseus SDK version mismatch** | Low | Pin `colyseus.js` to match server's `@colyseus/core` version. |
| **shadcn/ui pruning breaks used components** | Low | Build verification after each removal. Components are self-contained. |
| **Narrative panel memory bloat** | Medium | Cap buffer at 500 entries. Test with 1000+ messages. |
| **Bundle size regression** | Medium | Measure baseline after Phase A. Target <200KB gzipped. Track in CI. |
| **Figma export updates invalidate work** | Low | This conversion is a one-time migration. The Figma prototype is now a reference, not a source. |

---

## Appendix A: Files to Delete from Figma Export

Before copying into `packages/client/`:

```
# Figma scaffold files
ATTRIBUTIONS.md                           # Keep for reference, don't deploy
guidelines/                               # Figma generation guidelines — delete
src/imports/                              # Figma design prompt pasted text — delete
src/app/components/figma/                 # Figma image fallback helper — delete

# Unused shadcn/ui components (prune after verifying)
src/app/components/ui/accordion.tsx
src/app/components/ui/alert-dialog.tsx
src/app/components/ui/alert.tsx
src/app/components/ui/aspect-ratio.tsx
src/app/components/ui/avatar.tsx
src/app/components/ui/breadcrumb.tsx
src/app/components/ui/calendar.tsx
src/app/components/ui/carousel.tsx
src/app/components/ui/chart.tsx
src/app/components/ui/checkbox.tsx
src/app/components/ui/collapsible.tsx
src/app/components/ui/command.tsx
src/app/components/ui/context-menu.tsx
src/app/components/ui/drawer.tsx
src/app/components/ui/form.tsx
src/app/components/ui/hover-card.tsx
src/app/components/ui/input-otp.tsx
src/app/components/ui/menubar.tsx
src/app/components/ui/navigation-menu.tsx
src/app/components/ui/pagination.tsx
src/app/components/ui/popover.tsx
src/app/components/ui/resizable.tsx
src/app/components/ui/sheet.tsx
src/app/components/ui/sidebar.tsx
src/app/components/ui/skeleton.tsx         # Actually keep — useful for loading states
src/app/components/ui/sonner.tsx
src/app/components/ui/toggle.tsx
src/app/components/ui/toggle-group.tsx
```

## Appendix B: Color Token Migration Map

| Hardcoded Hex | → Tailwind Token |
|---|---|
| `#0A0B0F` | `bg-bg-primary` |
| `#12131A` | `bg-bg-panel` |
| `#1C1D27` | `bg-bg-elevated` |
| `#E8E0D0` | `text-text-primary` |
| `#8A8B95` | `text-text-secondary` |
| `#4A4B55` | `text-text-disabled` |
| `#C9A84C` | `text-accent-gold` |
| `#8B2500` | `text-danger` |
| `#2D6B4F` | `text-success` |
| `#3A7D7B` | `text-interactive` |
| `#B8860B` | `text-warning` |
| `#2A2B35` | `border-border-muted` |

The theme.css already defines these as CSS custom properties AND exposes them via `@theme inline`. The Tailwind tokens are available — the page components just don't use them.
