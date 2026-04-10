# Team Directives

Persistent rules and preferences set by Dale. Read by all agents at spawn time.

## Process

- When scoping any new feature request, always consider whether it needs **client-side changes, server-side changes, or both**. Not every change requires both, but it must be explicitly considered. (Example: Inventory UI bug where server-side inventory existed but client-side wiring was never done.)

## Technical

- **Inventory and stash are SEPARATE concepts** (like a traditional MMORPG bank):
  - Player inventory: Accessible everywhere; item cap & weight cap; in-memory on PlayerState
  - Stash: Accessible only in `feature_stash` rooms; much higher item limit; no weight limit; persisted in `player_stash`

- **Inventory Persistence & Containers** — Foundational for inventory, death, and loot systems:
  - Player inventory is NOT transient; persists across sessions via DB
  - Inventory CAN be lost on death
  - New first-class `'container'` ItemType for items that hold other items
  - On player death, drop a special "corpse" container representing the body
  - Starter items should go into player inventory (persistent), not stash

- **User Flags Architecture**:
  - Admins can always see through [Anon]
  - [Anon] exception is **same-room only** (not same-zone)
  - Only [Anon] and [RP] flags for v1
  - Who list is server-wide (all players, not zone-scoped)
  - Flags persist across sessions (logout/login)
  - Flags should be toggleable in the player settings UI (not just /flag command)

- **Migration Discipline** — Seed files pair with numbered migrations:
  - Any modification to data in seed files (e.g., `003_seed_zones.sql`) must be paired with a corresponding numbered migration file (e.g., `014_repurpose_refuge.sql`)
  - The migration system tracks applied files by filename — once executed, seed files are never re-run

## Design

- **Zone Designer Tool Stack** — elkjs + ReactFlow (xyflow) is the preferred long-term approach:
  - Layout engine: BFS → ELK.js (Sugiyama layered algorithm for crossing minimization)
  - Rendering: Hand-crafted SVG → ReactFlow for pan/zoom/drag/minimap
  - MUD-specific constraints encoded as elkjs port-side and layer constraints (compass directions, grid alignment)
  - Z-axis support via layer constraints (multi-floor relationships)

- **Map Layout Constraints**:
  - **No curved or diagonal edges** on the map. All connections must be drawn as straight orthogonal lines (horizontal or vertical).
  - If two rooms connected by a cardinal exit aren't on the same axis, fix the layout — don't draw a curve.
  - Curves indicate a layout alignment failure, not a rendering choice.
  - Cardinal alignment rules: E/W-connected rooms share the same y-coordinate; N/S-connected rooms share the same x-coordinate

- **Text Combat is Canonical** — All position info, ability costs, cooldowns visible in text feed first. Grid updates sync with text, never ahead. Position-based UI (grid) is supplementary, never mandatory.
