# Figma Export v2 — Comprehensive Analysis

> **Author:** Elminster (Lead/Architect)  
> **Date:** 2026-03-19  
> **Context:** Analysis of the updated Figma export responding to our gap-fill brief (`docs/figma-gaps-brief.md`)

---

## Executive Summary

**Verdict:** The design team has delivered **three new production-quality components** addressing critical gaps from our brief. The new components (ChatPanel, ExtractionOverlay, InventoryOverlay) implement §2D, §2C, and §2B from the brief with excellent visual fidelity and functional structure. However, **§2A (Combat Mode Overlay) was documented but not componentized**, and several smaller component gaps (§3A-§3E) and state variants (§4A-§4G) remain unaddressed.

**Key wins:**
- ✅ Three new overlay components are clean, well-structured, and follow the established design system
- ✅ ShardExploration now integrates all three overlays with proper state management
- ✅ Combat UI is implemented inline (not as a separate component) with action quickbar
- ✅ Sound cues panel is present in the sidebar
- ✅ Dependencies unchanged (still 55 packages — no new bloat)
- ✅ Theme tokens unchanged (still need migration but no regressions)

**Remaining gaps:**
- ❌ Combat mode as a separate Figma frame/component (§2A) — only documented in markdown
- ❌ Mini-action buttons (§3C: Look/Listen/Inventory quickbar)
- ❌ Ambient events feed in Refuge (§3D)
- ❌ Shard stability indicator bar in narrative header (§3A)
- ❌ Auto-complete hint above command input (§3E)
- ❌ Button state variants (§4A: hover/active/disabled for all 4 button types)
- ❌ Item card tier variants (§4B: 5 distinct card styles)
- ❌ HP bar states (§4C: healthy/wounded/critical with color transitions)
- ❌ Toast notification patterns (§4F: 4 types with left accent)
- ❌ Empty state designs (§4G: 6 atmospheric empty states)
- ❌ Responsive breakpoints (§5B, §5C: tablet layouts)

**Impact on conversion strategy:** The new overlays are production-ready scaffolds that will require the same refactoring as existing pages (hardcoded colors → theme tokens, mock data → Colyseus integration), but the structural work is done. This saves ~2-3 days of layout implementation. The missing component gaps are low-impact — most can be built during Phase B (Core Screens) conversion.

---

## §1 — Gap Coverage Scorecard

Systematic review of every item in `docs/figma-gaps-brief.md`:

### §2A — Combat Mode Overlay (**Original Prompt — Screen 6**)

| Element | Status | Notes |
|---------|--------|-------|
| Combat banner | 🟡 **Partially addressed** | Implemented inline in ShardExploration.tsx (line 544+) but not as a separate Figma frame. Banner shows "⚔ COMBAT" with blood-red border. |
| Tick timer | ❌ **Missing** | No countdown bar below the banner. The combat tick state exists in code but no visual timer. |
| Action quickbar | ✅ **Fully addressed** | 7 action buttons (Strike, Heavy Strike, Dodge, Block, Use Item, Flee, Observe) with keyboard shortcuts displayed. Inline implementation works well. |
| Enemy status panel | ❌ **Missing** | `enemyStatus` state exists in code but no sidebar panel rendering it. |
| Combat narrative styling | 🟡 **Partially addressed** | Combat entries render in the narrative panel but lack the color-coding specified (hits dealt in gold, hits taken in red). Currently uniform text color. |
| Transition states | 🟡 **Partially addressed** | Combat state toggles (banner appears/disappears) but no fade animations specified in the brief. |
| **Separate Figma frame** | ❌ **Missing** | The brief asked for a separate Figma frame showing the exploration screen "in its combat state". Only inline code implementation exists. |

**Combat mode markdown doc:** `src/imports/pasted_text/combat-mode-overlay.md` is a **copy of the gap-fill brief**, not a new design spec. It's documentation, not a deliverable.

**Score:** 🟡 **Partially addressed** — Combat works functionally but lacks visual polish (tick timer, enemy status, narrative color-coding) and wasn't delivered as a standalone Figma design artifact.

---

### §2B — Inventory / Loadout Detail Overlay (**Original Prompt — Screen 7**)

| Element | Status | Notes |
|---------|--------|-------|
| Overlay panel (60% width, slides from right) | ✅ **Fully addressed** | `InventoryOverlay.tsx` — full-width overlay with scrim and close button. |
| Carried Items section | ✅ **Fully addressed** | List layout with item name (tier-colored), type, durability bar, weight. |
| Item action buttons | ✅ **Fully addressed** | Equip, Use, Drop buttons per item. |
| Equipped Gear section | ✅ **Fully addressed** | Slot-based layout with Primary Weapon and Chest Armour examples. |
| Item Inspect sub-panel | ✅ **Fully addressed** | Shows item name (tier-colored), flavor text (italic serif), qualitative stats as tags. |
| Weight indicator | ✅ **Fully addressed** | "Carried Weight" with progress bar (14/20 units). |
| Dismiss behavior | ✅ **Fully addressed** | Close button, scrim click to dismiss. |

**Score:** ✅ **Fully addressed** — This component is production-quality scaffold. Excellent work.

---

### §2C — Extraction Screen / Overlay (**Original Prompt — Screen 8**)

| Element | Status | Notes |
|---------|--------|-------|
| **State 1: Extraction In Progress** | | |
| Progress bar overlay | ✅ **Fully addressed** | Large centered bar with "Extraction Ritual — Hold Your Ground" label. Pulse animation present. |
| Multi-phase segments | 🟡 **Partially addressed** | Bar fills smoothly (not in discrete segments as specified), but this is acceptable UX. |
| Noise warning text | ✅ **Fully addressed** | "Noise generated: HIGH — nearby entities may investigate." in amber below bar. |
| **State 2A: Extraction Success** | | |
| Full overlay with summary card | ✅ **Fully addressed** | Centered card with gold border, dark scrim behind. |
| Items Extracted list | ✅ **Fully addressed** | Tier-colored item names with bullet indicators. |
| Experience qualitative text | ✅ **Fully addressed** | "Significant combat experience gained" in muted silver. |
| Contracts Completed | ✅ **Fully addressed** | "✓ Hunt: Drowned Revenants (3/5)" in emerald. |
| Run Stats | ✅ **Fully addressed** | Time, Rooms, Creatures, Players evaded — monospace, muted silver. |
| Return to Refuge button | ✅ **Fully addressed** | Primary gold button. |
| **State 2B: Death Summary** | | |
| "You Have Fallen" header | ✅ **Fully addressed** | Blood-red text, centered. |
| Items Lost (crossed out) | ✅ **Fully addressed** | Line-through text in disabled grey. |
| Status acquired | ✅ **Fully addressed** | "Shard-sickness (moderate)" in amber. |
| Secondary button styling | ✅ **Fully addressed** | Outlined button (no gold fill). |

**Score:** ✅ **Fully addressed** — This component is excellent. Covers all three states (in-progress, success, death) with correct styling.

---

### §2D — Chat & Social Panel (**Original Prompt — Screen 9**)

| Element | Status | Notes |
|---------|--------|-------|
| Panel slides from right (40% width) | ✅ **Fully addressed** | `ChatPanel.tsx` — fixed overlay with scrim. |
| Chat tabs | ✅ **Fully addressed** | Proximity, Whisper, Refuge, Squad (disabled). Active tab has gold underline. |
| Players Nearby section | ✅ **Fully addressed** | Shows "Nearby Presences" with anonymous descriptors and faction indicator dots. |
| Chat message styling | ✅ **Fully addressed** | Player messages (quoted, serif italic), system messages (monospace grey), emotes (italic, no quotes), whispers (prefixed with [whisper] in teal). |
| Chat input | ✅ **Fully addressed** | Monospace input with "Say something..." placeholder. Commands listed below (/say /whisper /emote). |
| Trade Interface | ❌ **Missing** | No trade UI within the chat panel. Brief specified two-column offer panel accessible from chat. |

**Score:** 🟡 **Partially addressed** — Chat panel is excellent, but the trade interface sub-feature is missing.

---

### §2E — Additional Missing Screens

| Screen | Status | Notes |
|--------|--------|-------|
| Death / Downed Screen | ✅ **Addressed** | Covered by ExtractionOverlay "death" state (§2C State 2B). |
| Reconnection Overlay | ❌ **Missing** | No component or design for WebSocket disconnect → reconnecting states. |
| Loading / Transition States | ❌ **Missing** | No shard loading screen or room transition indicators. |

**Score:** 🟡 **Partially addressed** — Death screen exists. Reconnection and loading states missing.

---

### §3A — Shard Stability Indicator (Narrative Panel Header)

| Element | Status | Notes |
|---------|--------|-------|
| Thin bar (3-4px) spanning narrative header | 🟡 **Partially addressed** | A stability bar exists in ShardExploration but it's in the **sidebar header**, not the narrative panel header. Shows "Shard Stability" label with progress bar. |
| Color transitions (emerald → amber → red) | ✅ **Fully addressed** | `getCollapseColor()` function implements the color transition correctly. |

**Score:** 🟡 **Partially addressed** — The bar exists but is in the wrong location (sidebar instead of narrative panel header).

---

### §3B — Sound Cues Panel (Sidebar)

| Element | Status | Notes |
|---------|--------|-------|
| Section at bottom of sidebar | ✅ **Fully addressed** | "SOUND CUES" section in ShardExploration sidebar (line 493+). |
| Label and styling | ✅ **Fully addressed** | Label in sans-serif, cues in italic serif with direction highlighted. |
| Ephemeral behavior (fade out) | ❌ **Missing** | Cues are static in the UI (no fade-out animation). |
| Empty state | ❌ **Missing** | No "Silence." empty state. |

**Score:** 🟡 **Partially addressed** — Panel exists and looks good, but lacks the ephemeral animation specified.

---

### §3C — Mini-Action Buttons (Sidebar)

| Element | Status | Notes |
|---------|--------|-------|
| Look / Listen / Inventory buttons | ❌ **Missing** | No quick-action buttons in the sidebar. Players must type commands. |

**Score:** ❌ **Missing**

---

### §3D — Ambient Events Feed (Refuge)

| Element | Status | Notes |
|---------|--------|-------|
| Scrolling text feed below Refuge nav tabs | ❌ **Missing** | Not present in the Refuge page. |

**Score:** ❌ **Missing**

---

### §3E — Auto-Complete Hint (Command Input)

| Element | Status | Notes |
|---------|--------|-------|
| Ghost text above command input | ❌ **Missing** | No auto-complete hint. Variable exists in code (`autoComplete`) but no UI rendering. |

**Score:** ❌ **Missing**

---

### §4A — Button States (Variants)

| Element | Status | Notes |
|---------|--------|-------|
| Primary / Secondary / Danger / Ghost button variants | ❌ **Missing** | No design system documentation or variant examples for the 4 button types × 4 states (default/hover/active/disabled). |

**Score:** ❌ **Missing**

---

### §4B — Item Card Variants by Loot Tier

| Element | Status | Notes |
|---------|--------|-------|
| 5 tier cards (Common, Sturdy, Refined, Masterwork, Anomalous) | 🟡 **Partially addressed** | Tier colors are correctly applied to item names in InventoryOverlay. Left-border accent is present (line 109). No standalone tier card component set. |

**Score:** 🟡 **Partially addressed** — Implementation exists but not documented as a design variant set.

---

### §4C — HP Bar States

| Element | Status | Notes |
|---------|--------|-------|
| Healthy / Wounded / Critical states | ❌ **Missing** | HP bar in ShardExploration is static (no state-based color changes). |

**Score:** ❌ **Missing**

---

### §4D — Collapse Timer States

| Element | Status | Notes |
|---------|--------|-------|
| Stable / Destabilising / Collapsing phases | 🟡 **Partially addressed** | Color transitions work (`getCollapseColor()`) but no "Destabilising" or "COLLAPSE IMMINENT" warning labels. No pulse animation in red phase. |

**Score:** 🟡 **Partially addressed** — Color transitions work, labels and pulse missing.

---

### §4E — Extraction Progress Bar States

| Element | Status | Notes |
|---------|--------|-------|
| Ritual starting / In progress / Interrupted / Completed | 🟡 **Partially addressed** | In-progress state works. No interrupted or completed flash effects. |

**Score:** 🟡 **Partially addressed**

---

### §4F — Toast / Notification Patterns

| Element | Status | Notes |
|---------|--------|-------|
| System / Success / Warning / Danger toast variants | ❌ **Missing** | No toast component or notification patterns. |

**Score:** ❌ **Missing**

---

### §4G — Empty States

| Element | Status | Notes |
|---------|--------|-------|
| 6 atmospheric empty states (Empty Stash, No Contracts, etc.) | ❌ **Missing** | No empty state designs. |

**Score:** ❌ **Missing**

---

### §5 — Responsive Breakpoints

| Breakpoint | Status | Notes |
|------------|--------|-------|
| 1440px+ (Desktop) | ✅ **Delivered** | Current design target. |
| 1024px (Tablet Landscape) | ❌ **Missing** | No responsive variants. |
| 768px (Tablet Portrait) | ❌ **Missing** | No responsive variants. |
| <768px (Mobile) | ❌ **Missing** | No responsive variants. |

**Score:** ❌ **Missing** — All responsive work deferred.

---

## §1 Summary Table

| Category | Total Items | ✅ Fully | 🟡 Partially | ❌ Missing | 🆕 Bonus |
|----------|-------------|----------|--------------|------------|----------|
| **§2 — Missing Screens** | 5 | 2 | 3 | 0 | 0 |
| **§3 — Missing Components** | 5 | 1 | 1 | 3 | 0 |
| **§4 — Missing States** | 7 | 0 | 4 | 3 | 0 |
| **§5 — Responsive** | 3 | 0 | 0 | 3 | 0 |
| **TOTAL** | **20** | **3** | **8** | **9** | **0** |

**Coverage:** 55% fully or partially addressed (11/20), 45% missing (9/20).

---

## §2 — New Component Deep Dive

### 2.1 ChatPanel.tsx (244 lines)

**What it implements:** §2D — Chat & Social Panel from the brief.

**Mapping to specs:**
- ✅ Panel slides from right (40% width) with dark scrim
- ✅ Chat tabs (Proximity, Whisper, Refuge, Squad) with context-aware availability
- ✅ "Nearby Presences" section for shard context
- ✅ Message type styling (player/system/emote/whisper) matches brief exactly
- ✅ Chat input with command hints
- ❌ Trade interface missing

**Quality assessment:** **Production-quality scaffold.** The component structure is clean, state management is simple but adequate (local useState for MVP), and the visual design matches the brief precisely. The conditional tab availability logic (Proximity only in shards, Refuge only in refuge, Squad disabled) shows attention to the game design.

**New patterns:**
- **Context prop:** `context: "shard" | "refuge"` drives tab availability — good separation of concerns.
- **Message typing:** The `ChatMessage` interface with `type` discriminator is extensible for future message variants (trade requests, faction announcements, etc.).
- **Anonymous descriptors in shards:** The mock data shows "A figure in dark leather" rather than player names — correctly implements the GDD's anonymity-in-shards mechanic.

**Missing from specs:**
- Trade interface (two-column offer panel) was specified but not implemented.

**Hardcoded colors:** 15+ instances of hex literals (`#12131A`, `#C9A84C`, etc.). Needs theme token migration.

**Verdict:** Keep this component. Migrate to theme tokens, wire to Colyseus room messages, add trade interface as Phase C feature.

---

### 2.2 ExtractionOverlay.tsx (258 lines)

**What it implements:** §2C — Extraction Screen / Overlay from the brief.

**Mapping to specs:**
- ✅ Three states (in-progress, success, death) with distinct UX
- ✅ Progress bar with pulse animation for in-progress state
- ✅ Noise warning below progress bar
- ✅ Success summary: items extracted (tier-colored), experience, contracts, run stats
- ✅ Death summary: items lost (crossed-out), status acquired, run stats
- ✅ Button styling (gold primary for success, outlined secondary for death)

**Quality assessment:** **Production-quality scaffold.** The three-state pattern is clean (null | "in-progress" | "success" | "death"). The visual hierarchy in the success/death cards is excellent — large serif headers, clear section breaks, monospace stats. The pulse animation is CSS-only (inline `<style>` tag) — acceptable for MVP but should migrate to Tailwind @keyframes utility.

**New patterns:**
- **State-discriminated rendering:** The `state` prop drives completely different UI trees. This is the correct pattern for modal overlays with distinct modes.
- **Border color conditional:** `style={{ borderColor: state === "success" ? "#C9A84C" : "#8B2500" }}` — should use theme tokens.
- **Navigation on close:** Calls `navigate("/refuge")` on button click — correct for the extraction success/death flow.

**Missing from specs:**
- Extraction interrupted state (combat starts during ritual) — not implemented.
- Completed state flash effect — not implemented.

**Hardcoded colors:** 20+ instances. Needs token migration.

**Verdict:** Keep this component. The structure is excellent. Migrate to theme tokens, wire to server extraction events, add interrupted state as edge case handling in Phase C.

---

### 2.3 InventoryOverlay.tsx (280 lines)

**What it implements:** §2B — Inventory / Loadout Detail Overlay from the brief.

**Mapping to specs:**
- ✅ Overlay panel (60% width) slides from right
- ✅ Carried Items section with list layout
- ✅ Item cards show: name (tier-colored), type, durability bar, weight, flavor text, qualitative stats
- ✅ Action buttons per item (Equip, Use, Drop)
- ✅ Equipped Gear section with slot-based layout
- ✅ Weight indicator with progress bar
- ✅ Close button + scrim dismiss

**Quality assessment:** **Production-quality scaffold.** The item card design is the highlight — left-border accent (4px, tier-colored), tier-colored name, durability bar with gradient fill, flavor text in italic serif, stat tags in monospace. This is exactly the visual language the brief requested. The `getTierColor()` function is reusable (should be extracted to a shared util).

**New patterns:**
- **Item type definition:** The `Item` interface with tier enum is well-structured. Missing from the original Figma export — this is new modeling work.
- **Durability gradient:** `bg-gradient-to-r from-[#2D6B4F] to-[#B8860B]` — nice visual detail (green → amber as durability degrades). Should be theme-ified.
- **Weight capacity visualization:** Simple progress bar with "14 / 20 units" text. Clean and readable.

**Missing from specs:**
- Item Inspect sub-panel was specified to appear "to the right within the overlay when an item is selected" — not implemented. Currently, flavor text and stats are inline in each card.

**Hardcoded colors:** 25+ instances. Needs token migration.

**Verdict:** Keep this component. Migrate to theme tokens, wire to player inventory state from server, consider adding the Inspect sub-panel as a Phase C enhancement (click item → right panel slides in with large flavor text + detailed stats).

---

### 2.4 combat-mode-overlay.md (502 lines)

**What it is:** This is **not a new design deliverable** — it's a **verbatim copy of §2A from the gap-fill brief** (`docs/figma-gaps-brief.md`). The file exists in `src/imports/pasted_text/` which suggests it was pasted into Figma AI as reference material, not generated as output.

**Verdict:** This is **documentation, not a component**. The combat UI was implemented inline in ShardExploration.tsx (action quickbar, combat banner) but was not delivered as a separate Figma frame or reusable component. This is acceptable — the inline implementation works functionally — but it means we don't have a standalone "combat mode overlay" component to inspect or extract.

---

### 2.5 ellmud-figma-design.md (22,879 bytes)

**What it is:** A **markdown export of the original Figma AI design prompt** used to generate the initial v1 export. This is comprehensive documentation of the aesthetic, typography, color palette, and screen specifications. It's identical to the prompt content from the original session.

**Verdict:** This is **reference documentation**. Not new design work. Useful for context, but not a deliverable. It confirms the design team had the full prompt context.

---

## §3 — Existing Screen Updates

All six page components grew in size:

| Page | v1 Size | v2 Size | Growth | Notes |
|------|---------|---------|--------|-------|
| **ShardExploration** | 19K | 21K | +2K | Added InventoryOverlay, ExtractionOverlay, ChatPanel imports and integration. Sound cues panel added. Combat action quickbar added. |
| **Settings** | 19K | 19K | 0 | Unchanged. |
| **Leaderboard** | 13K | 13K | 0 | Unchanged. |
| **Refuge** | 11K | 11K | 0 | Unchanged. |
| **CharacterSelect** | 8.8K | 8.8K | 0 | Unchanged. |
| **Login** | 5.4K | 5.4K | 0 | Unchanged. |

**Key finding:** Only ShardExploration changed. The design team focused their update effort on the shard exploration experience (the core gameplay screen), which is the correct priority.

### 3.1 ShardExploration.tsx Changes

**New state management:**
```typescript
const [inventoryOpen, setInventoryOpen] = useState(false);
const [chatOpen, setChatOpen] = useState(false);
const [extractionState, setExtractionState] = useState<"in-progress" | "success" | "death" | null>(null);
const [extractionProgress, setExtractionProgress] = useState(0);
const [enemyStatus, setEnemyStatus] = useState<{ name: string; hp: string; telegraphed?: string } | null>(null);
```

**New imports:**
```typescript
import InventoryOverlay from "../components/InventoryOverlay";
import ExtractionOverlay from "../components/ExtractionOverlay";
import ChatPanel from "../components/ChatPanel";
```

**Combat UI additions (line 544+):**
- Combat banner (`⚔ COMBAT` with blood-red border)
- Action quickbar with 7 buttons (Strike, Heavy Strike, Dodge, Block, Use Item, Flee, Observe)
- Keyboard shortcuts displayed as superscript (1-7)
- Hover state: gold background transition

**Sound Cues panel additions (line 493+):**
- "SOUND CUES" section in sidebar
- Each cue shows: `"{text} — from the {direction}"`
- Italic serif styling with muted silver color

**Sidebar additions:**
- "Shard Stability" bar with live countdown (lines 250-264)
- Color transitions (white → amber → red) based on `getCollapseColor()`
- Message Square icon button to toggle chat panel

**New overlay integration:**
- InventoryOverlay controlled by `inventoryOpen` state
- ExtractionOverlay controlled by `extractionState` + `extractionProgress`
- ChatPanel controlled by `chatOpen` state + context ("shard")

**No component extraction:** The combat UI, sound cues, and stability bar are all **inline JSX**, not separate components. This is pragmatic for the prototype but means these patterns need to be extracted when building the production client.

---

## §4 — Updated Dependency Audit

**v1 dependencies:** 55 packages  
**v2 dependencies:** 55 packages  
**Change:** **0 new dependencies added**

The dependency list is **byte-for-byte identical** between v1 and v2. This is excellent — the design team did not add any new libraries to support the new components. All new work was accomplished with the existing Radix UI primitives, Lucide icons, and base React.

**Previous audit recommendation:** Cut from ~55 to ~22 packages (drop all MUI, unused Radix primitives, scaffold bloat).

**Impact of v2:** No change to the dependency reduction plan. The three new components use:
- Standard React hooks (useState, useRef, useEffect)
- Lucide icons (already present in v1)
- No Radix primitives (all custom JSX)

**Verdict:** ✅ No new bloat. The reduction strategy from `docs/figma-conversion-strategy.md` is still valid.

---

## §5 — Theme & Token Updates

**v1 theme.css:** ~2K (estimate based on typical CSS size)  
**v2 theme.css:** 3.1K (135 lines)  
**Growth:** +~1K

### 5.1 What Changed

Reviewing the v2 theme.css (first 100 lines):

**New structure:**
- Added `@custom-variant dark` directive (Tailwind v4 syntax)
- Added `@theme inline` block exposing tokens for Tailwind utilities
- Added comprehensive CSS custom properties for:
  - All color palette values (bg, text, accent, tier colors, border)
  - Typography scale (--text-xs through --text-4xl)
  - Font weights (normal, medium, semibold, bold)
  - Font families (serif, mono, sans)
  - Border radius scale

**New tokens (not in v1):**
```css
--text-xs: 0.75rem;
--text-sm: 0.875rem;
/* ... full scale through 4xl ... */

--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

--radius: 0.375rem;
```

**@theme inline block:**
```css
@theme inline {
  --color-bg-primary: var(--bg-primary);
  --color-bg-panel: var(--bg-panel);
  /* ... exposes all tokens with `--color-` prefix for Tailwind ... */
}
```

This is the **Tailwind CSS v4 pattern** for custom theme tokens. This allows writing:
```tsx
<div className="bg-bg-primary text-text-primary border-border-muted">
```

Instead of:
```tsx
<div className="bg-[#0A0B0F] text-[#E8E0D0] border-[#2A2B35]">
```

**Critical finding:** The theme tokens exist and are correctly structured, but **none of the page components use them**. Every component still has hardcoded hex values. The v2 update added the token infrastructure but did not migrate the components to use it.

### 5.2 Do the Tokens Cover Our Needs?

**From the gap-fill brief §4, we requested:**
- Tier colors (5 tiers) → ✅ Present (`--tier-common` through `--tier-anomalous`)
- State colors (danger, success, warning) → ✅ Present
- Interactive color → ✅ Present (`--interactive: #3A7D7B`)
- Border color → ✅ Present (`--border-muted`)
- HP bar states (healthy/wounded/critical) → 🟡 **Inferred** (success/warning/danger map to healthy/wounded/critical, but no explicit HP tokens)

**Missing tokens:**
- Component-specific variants (button hover/active/disabled states) — not tokenized
- HP bar specific tokens (should have `--hp-healthy`, `--hp-wounded`, `--hp-critical` for semantic clarity)
- Collapse timer phase tokens (could use warning/danger, but semantics unclear)

**Verdict:** 🟡 **Mostly adequate.** The core palette is complete. HP bar and component variant tokens should be added for semantic clarity, but the existing tokens can cover the use cases with aliases.

---

## §6 — Updated Conversion Strategy Impact

The original conversion strategy (`docs/figma-conversion-strategy.md`) laid out:

**Phase A — Foundation (weeks 1-2):**
- Migrate hardcoded hex → theme tokens (all pages)
- Extract shared utilities (tier color functions, progress bars, top bar layout)
- Dependency reduction (~55 → ~22)
- Monorepo setup (`packages/client/`, `packages/shared/`)

**Phase B — Core Screens (weeks 3-5):**
- Wire Login/CharacterSelect to auth API
- Wire Refuge tabs to player state
- Wire ShardExploration to Colyseus ShardRoom
- Implement Colyseus message handlers

**Phase C — Gameplay (weeks 6-8):**
- Inventory overlay (wire to server inventory state)
- Extraction flow (wire to server extraction events)
- Combat action quickbar (wire to combat tick messages)
- Chat panel (wire to room broadcast messages)

**Phase D — Polish (weeks 9-10):**
- Loading states, reconnection overlay, toasts
- Responsive breakpoints
- Accessibility audit
- Performance optimization

### 6.1 What Changed

**Phase A (Foundation):**
- No change. Theme tokens exist but migration still required.

**Phase B (Core Screens):**
- No change. Pages still need Colyseus integration.

**Phase C (Gameplay):**
- **Time saved:** ~2-3 days. The three new overlays (Inventory, Extraction, Chat) provide production-quality scaffolds. We no longer need to build the layout from scratch — just refactor and wire to server. Original estimate: 2 weeks for overlays. New estimate: 1.5 weeks.
- **New work:** Trade interface (missing from ChatPanel) adds ~1 day.
- **Net impact:** Phase C shrinks from 3 weeks to 2.5 weeks.

**Phase D (Polish):**
- **New work:** Reconnection overlay, loading states, toast notifications were already in Phase D. These are still missing from the Figma export, but we always planned to build them in this phase.
- No change to Phase D effort.

### 6.2 Revised Effort Estimate

| Phase | Original Estimate | Revised Estimate | Change | Reason |
|-------|-------------------|------------------|--------|--------|
| **A — Foundation** | 2 weeks | 2 weeks | 0 | Theme token migration unchanged. |
| **B — Core Screens** | 3 weeks | 3 weeks | 0 | Colyseus integration unchanged. |
| **C — Gameplay** | 3 weeks | 2.5 weeks | **-0.5 weeks** | Overlays scaffolded; just need refactor + wiring. |
| **D — Polish** | 2 weeks | 2 weeks | 0 | Loading/reconnect/toasts were always planned for Phase D. |
| **TOTAL** | **10 weeks** | **9.5 weeks** | **-0.5 weeks** | ~5% time savings from overlay scaffolds. |

**One developer, full-time:** 9.5 weeks end-to-end.

---

## §7 — Remaining Gaps

Items from the gap-fill brief that are **still missing** and need to be addressed:

### 7.1 Critical Gaps (Affects Core UX)

1. **Reconnection Overlay (§2E):** When WebSocket drops, the player needs visual feedback. **Priority: High.** This is part of the latency tolerance model from GDD §13.5. We'll build this in Phase D.

2. **Enemy Status Panel (§2A):** During combat, the player needs to see enemy HP tier and telegraphed actions. Currently the state exists in code but no sidebar panel renders it. **Priority: High.** Add this in Phase C combat integration.

3. **Tick Timer (§2A):** The 1-second countdown bar below the combat banner. Critical for teaching players the tick cadence. **Priority: High.** Add in Phase C.

### 7.2 Medium-Priority Gaps (Quality of Life)

4. **Mini-Action Buttons (§3C):** Look / Listen / Inventory quickbar in the sidebar. **Priority: Medium.** Nice-to-have for click-preferring players. Add in Phase C or defer to Phase D.

5. **Ambient Events Feed (§3D):** Makes the Refuge feel alive. **Priority: Medium.** Add in Phase B when wiring RefugeRoom.

6. **Auto-Complete Hint (§3E):** Ghost text above command input. **Priority: Medium.** Add in Phase C as a command parser enhancement.

7. **Trade Interface (§2D):** Two-column offer panel within ChatPanel. **Priority: Medium.** Add in Phase C marketplace integration (GDD §8).

### 7.3 Low-Priority Gaps (Polish / Edge Cases)

8. **Button State Variants (§4A):** Design system documentation for hover/active/disabled states. **Priority: Low.** We can infer these from existing button implementations. Document in Phase D.

9. **HP Bar States (§4C):** Healthy/Wounded/Critical color transitions with labels. **Priority: Low.** Currently static. Add state transitions in Phase C.

10. **Toast Notifications (§4F):** 4 toast variants (system/success/warning/danger). **Priority: Low.** Build in Phase D.

11. **Empty States (§4G):** 6 atmospheric empty states. **Priority: Low.** Build as needed during Phase B/C screen wiring.

12. **Responsive Breakpoints (§5):** Tablet landscape/portrait layouts. **Priority: Low.** Defer to Phase 4 (post-MVP) or handle organically if user feedback requests it.

### 7.4 Gap Summary

| Priority | Count | Items |
|----------|-------|-------|
| **High** | 3 | Reconnection overlay, Enemy status panel, Tick timer |
| **Medium** | 4 | Mini-actions, Ambient events, Auto-complete, Trade UI |
| **Low** | 5 | Button variants, HP bar states, Toasts, Empty states, Responsive |
| **TOTAL** | **12** | |

**Recommendation:** High-priority items (3) should be added during Phase C (Gameplay). Medium-priority items (4) can be added opportunistically during Phase B/C or deferred to Phase D. Low-priority items (5) are Phase D polish work or post-MVP.

**No need for another design iteration:** These remaining gaps are small enough that we can implement them directly in code using the established design system. The patterns are clear from the existing components.

---

## §8 — Design Guidelines Review

The new file `guidelines/Guidelines.md` is a **template, not actual guidelines**. It contains placeholder comments like:

```markdown
**Add your own guidelines here**
<!--
System Guidelines

Use this file to provide the AI with rules and guidelines...
-->
```

The template includes example sections (General guidelines, Design system guidelines, Button component usage) but all are commented out with instructional text. **No actual guidelines were written.**

**Verdict:** ❌ **Not a deliverable.** This is the default Figma AI template for adding custom guidelines. The design team did not populate it with Ellmud-specific rules.

**Impact:** None. We have the established patterns from the v1 analysis and this v2 analysis. The components themselves *are* the guidelines. We don't need a separate markdown doc — the code is the source of truth.

---

## §9 — Comparison to Decisions & GDD

### 9.1 Alignment with `.squad/decisions.md`

**Decision: Message-only client protocol (no Schema sync):**
- ✅ The new overlays are pure UI — no state sync assumptions. They accept props (`state`, `progress`, `isOpen`) and call callbacks (`onClose`). This is compatible with the message-only pattern.

**Decision: Prose-only client:**
- ✅ All three new overlays render qualitative text ("Significant combat experience", "Wounded", "Shard-sickness (moderate)"). No raw numbers exposed.

**Decision: Server-authoritative state:**
- ✅ The overlays have no local game logic. Extraction progress, combat actions, chat messages all flow through mock handlers that will be replaced with `room.send()` calls.

**Decision: Colyseus Room lifecycle:**
- ✅ The overlays are stateless — they don't care whether they're in a ShardRoom or RefugeRoom. The parent component (`ShardExploration`) will manage the room context.

**Verdict:** ✅ No conflicts with architecture decisions.

### 9.2 Alignment with GDD

**GDD §4 — Narrative Layer:**
- ✅ ExtractionOverlay narrates the extraction ritual in prose ("You begin tracing the extraction sigil..."). Correct pattern.

**GDD §5 — Combat:**
- 🟡 Combat action quickbar is present but missing the enemy status panel and tick timer. **Gap to fill in Phase C.**

**GDD §6 — PvP:**
- ✅ ChatPanel implements proximity-based chat with anonymous descriptors in shards ("A figure in dark leather"). Correct for the stealth/anonymity mechanic.

**GDD §8 — Economy:**
- 🟡 Trade interface is missing from ChatPanel. **Gap to fill in Phase C.**

**GDD §12 — Social:**
- ✅ ChatPanel has Squad tab (disabled) and Refuge tab. Infrastructure is ready for squad system.

**GDD §14 — Anti-Cheat (Client Design):**
- ✅ All overlays are "dumb views" — no embedded game logic. Qualitative stats only. Correct pattern.

**Verdict:** 🟡 Minor gaps (enemy status, trade UI) but overall alignment is strong.

---

## §10 — Recommendations

### For the Development Team:

1. **Accept the v2 export as-is.** The three new overlays are production-quality scaffolds worth integrating. The remaining gaps are small enough to handle in-house.

2. **Prioritize Phase A (Foundation) work.** Migrate all hardcoded hex values to theme tokens before starting Phase B. The tokens exist — we just need to do the find-replace gruntwork.

3. **Extract shared utilities during Phase A:**
   - `getTierColor()` function (used in InventoryOverlay) → `packages/shared/utils/tiers.ts`
   - Tier enum → `packages/shared/types/items.ts`
   - Color transition logic (`getCollapseColor`) → `packages/client/utils/shard.ts`

4. **Add missing high-priority components during Phase C:**
   - Enemy status panel (sidebar, during combat)
   - Tick timer (below combat banner)
   - Reconnection overlay (full-screen, dark scrim, pulsing indicator)

5. **Do not send another brief to the design team.** We have enough to proceed. The missing items are polish/edge-cases we can handle in-house.

### For Future Design Iterations:

If we do request another design pass (unlikely), focus on:
- Responsive breakpoints (1024px, 768px) — only if mobile/tablet becomes a target platform
- Toast notification component with 4 variants
- Empty state illustrations (atmospheric prose-only, no icons)

### For Documentation:

Update the following docs to reflect the v2 analysis:

1. **`docs/figma-conversion-strategy.md`:**
   - Add a "v2 Update" section at the top linking to this analysis
   - Revise Phase C timeline (3 weeks → 2.5 weeks)
   - Update component inventory to include ChatPanel, ExtractionOverlay, InventoryOverlay

2. **`GDD.md` (if needed):**
   - No changes required. The v2 export aligns with existing GDD patterns.

3. **Backlog issues (GitHub):**
   - Update issue #16 (Inventory overlay) — scaffold exists, just needs wiring
   - Update issue #10 (Extraction flow) — scaffold exists, just needs wiring
   - Add new issue: "Implement reconnection overlay" (Phase D)
   - Add new issue: "Add enemy status panel to combat UI" (Phase C)
   - Add new issue: "Add tick timer to combat banner" (Phase C)

---

## §11 — Conclusion

The v2 Figma export is a **successful iteration** that addressed the highest-value gaps from our brief. The design team delivered three new, well-structured overlay components that integrate cleanly into the existing page architecture. The lack of new dependencies and unchanged theme tokens show discipline — no bloat was introduced.

**What worked:**
- ChatPanel, ExtractionOverlay, InventoryOverlay are excellent scaffolds
- Sound cues panel and combat quickbar in ShardExploration are functional and on-brand
- Theme token infrastructure is production-ready (just needs component migration)

**What didn't happen:**
- Combat mode was implemented inline, not as a separate Figma frame/component
- Several smaller components (mini-actions, ambient events, auto-complete) remain missing
- State variants (button states, HP bar states, toasts, empty states) not documented
- Responsive breakpoints deferred

**Net impact:** The v2 update saves ~0.5 weeks of Phase C implementation time by providing overlay scaffolds. The remaining gaps are addressable in-house during Phase C/D without another design iteration.

**Go/no-go:** ✅ **Proceed with conversion.** The Figma export (v1 + v2 combined) provides sufficient design fidelity to begin Phase A (Foundation) work immediately.

---

*Reviewed by Elminster — 2026-03-19*
