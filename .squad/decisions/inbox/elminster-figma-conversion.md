# Decision: Figma Export Conversion Architecture

**Date:** 2026-03-19  
**Author:** Elminster (Lead/Architect)  
**Status:** Proposed — awaiting team review  
**Full analysis:** `docs/figma-conversion-strategy.md`

---

## Context

A Figma AI prototype was exported as a React app (`/tmp/figma-export/`). It contains 6 screens, 3 tab components, and a full shadcn/ui library (~48 primitives). The export is a presentational prototype with zero server integration, hardcoded mock data, and no state management.

## Decisions

### 1. Keep visual design, rewrite implementation

The visual design (colors, typography, layouts, screen proportions) is production-quality and matches the GDD design language. The code implementation is scaffold-quality: hardcoded hex colors, inline styles, no shared state, mock data everywhere. **Preserve the visual patterns as reference; rewrite every file's logic.**

### 2. Client lives at `packages/client/`

Monorepo structure: `packages/client/` (React UI), `packages/server/` (Colyseus), `packages/shared/` (message types, game types). The shared package is the contract between client and server — prevents type drift.

### 3. State management: React Context + useReducer

No Zustand, no Redux. The client is a thin view layer over server-authoritative state. Context + useReducer handles ~10 state slices (auth, character, narrative, room, combat, shard, inventory, loadout, connection, settings). Migration to Zustand is clean if we outgrow this later.

### 4. Colyseus integration: message-only, no Schema subscription

The client MUST NOT subscribe to `room.state` or `room.onStateChange`. All game state arrives via `room.onMessage()` handlers. This is the schema leakage prevention enforced at the architecture level.

**Message flow:**
- Client → Server: `room.send("command", { text })`, `room.send("action", { type })`, `room.send("chat", { text })`
- Server → Client: `onMessage("narrate")`, `onMessage("combat:tick")`, `onMessage("shard:tick")`, `onMessage("ambient")`, `onMessage("chat")`

### 5. Dependency reduction: ~55 → ~22 packages

Drop all MUI packages (conflicts with Tailwind), unused Radix primitives (~12 packages), and Figma scaffold deps (canvas-confetti, cmdk, embla-carousel, recharts, etc.). Add `colyseus.js` as the only new dependency.

### 6. Theme token migration required before feature work

All page components use hardcoded hex values (`text-[#C9A84C]`) instead of the Tailwind theme tokens already defined in theme.css. This must be fixed in Phase A before any feature work, or we'll have two color systems to maintain.

### 7. Shared message types package

`packages/shared/` defines TypeScript interfaces for all client-server messages (`NarrateMessage`, `CombatTickMessage`, `ShardTickMessage`, etc.). Both client and server import from this package. This is the type-safe contract.

## Risks

1. **Visual fidelity during token migration** — Compare screenshots before/after. The Figma export is the visual reference.
2. **shadcn/ui pruning** — Verify build after each removal. Components are self-contained.
3. **Narrative panel memory** — Cap at 500 entries. Server messages append indefinitely.

## Rejected Alternatives

- **Use Figma export as-is, incrementally wire up:** Rejected. The hardcoded colors and inline styles would accumulate tech debt faster than we can pay it off. A clean Phase A foundation is worth the upfront cost.
- **Use Redux/Zustand from day one:** Rejected. The client state is simple (server pushes, client renders). Context + useReducer is sufficient and has zero dependencies.
- **Drop shadcn/ui entirely:** Rejected. The primitives we keep (dialog, tabs, scroll-area, tooltip) are battle-tested accessible components that save us from reimplementing ARIA patterns.

## Impact

- **Client developers:** Follow `docs/figma-conversion-strategy.md` phased plan (A→B→C→D).
- **Server developers:** Define message types in `packages/shared/` before client integration.
- **Narrative dev (Volo):** LLM output must match `NarrateMessage` type format (type field, structured exits, semantic markup).
