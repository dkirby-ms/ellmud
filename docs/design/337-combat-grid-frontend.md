# Combat Grid Frontend Design Analysis
**Issue:** #337 — "feature idea: in-room combat represented by sprites in a grid (DCSS style)"  
**Author:** Regis (Frontend Dev)  
**Date:** 2026-01-25  
**Status:** Research & Design Analysis

---

## Executive Summary

This document analyzes the frontend implementation of a DCSS-style visual combat grid for Ellmud, examining tileset resources, rendering approaches, integration strategies, and technical considerations. The goal is to add a grid-based tile view of combat that coexists with the existing text-first MUD interface.

**Key findings:**
- DCSS tiles are available under CC0 license (public domain equivalent) via the `crawl/tiles` repository
- HTML5 Canvas is recommended over WebGL for this use case (simpler, proven in DCSS webtiles)
- Grid should be an **optional overlay** that enhances but doesn't replace text combat
- Mobile/responsive design requires careful layout planning
- Performance should be excellent (DCSS webtiles handles 60+ entities smoothly in browser)

---

## 1. DCSS Tileset Research

### 1.1 Licensing & Availability

**Dungeon Crawl Stone Soup (DCSS)** uses open-source tilesets originally derived from rltiles, with extensive community contributions. Many tiles have been released under **CC0 (Creative Commons Zero)** — effectively public domain.

**Primary source:** [github.com/crawl/tiles](https://github.com/crawl/tiles)

This repository packages DCSS tiles in a format designed for reuse:
- **License:** CC0 for approved tiles (see ARTISTS.md for list of contributors who signed off)
- **Format:** PNG sprite sheets, organized by category (player, monster, item, dungeon, etc.)
- **Tile size:** 32x32px standard (DCSS uses this for web tiles)
- **Coverage:** Hundreds of creature, player, item, and terrain tiles
- **Caveat:** Some tiles remain under unclear licensing (see TILES_UNDER_UNKNOWN_LICENSE.md) — these must be excluded

**Recommendation:**  
Use the crawl/tiles repository as our primary tileset source. We must:
1. Review ARTISTS.md and TILES_UNDER_UNKNOWN_LICENSE.md before including tiles
2. Only use tiles confirmed under CC0
3. Credit DCSS developers in game credits/docs
4. Consider commissioning original tiles for any gaps or game-specific content

### 1.2 Alternative Tilesets

If DCSS tiles prove insufficient or licensing becomes complex, alternative open-source roguelike tilesets include:

- **Kenney Roguelike Pack** (kenney.nl) — CC0, simple 16x16 tiles, less detailed
- **Oryx Design Lab** (oryxdesignlab.com) — CC BY 3.0, requires attribution, fantasy RPG focus
- **OpenGameArt.org** — various CC licenses, large collection but inconsistent style
- **Custom commissioned tiles** — cleanest IP situation, but requires artist time/budget

**Verdict:** Start with DCSS CC0 tiles. They're battle-tested, visually coherent, and free to use.

### 1.3 Sprite Sheet Format

DCSS web tiles use **sprite sheets** (large PNG files containing multiple tiles in a grid). The game renders individual tiles by drawing sub-rectangles from the sheet onto a canvas.

**Example structure:**
```
monsters.png (2048x2048)
- Each tile: 32x32px
- Grid layout: 64 tiles per row
- Index calculated as: (tileIndex % 64, floor(tileIndex / 64))
```

**Benefits:**
- Single HTTP request for hundreds of tiles
- GPU-friendly (single texture upload)
- Fast to render (canvas `drawImage` with source rect)

**Our approach:**
- Download DCSS sprite sheets or assemble custom sheets
- Build a tile metadata JSON file mapping entity types to tile indices
- Lazy-load sprite sheets on first combat encounter

---

## 2. Current Client Architecture Analysis

### 2.1 Rendering Stack (Text-First)

Ellmud's client is a **React + TypeScript** SPA with:
- **UI Framework:** React 18 with Radix UI components
- **Styling:** TailwindCSS v4 (custom design tokens via CSS variables)
- **State Management:** React Context API (`useAppContext()` in `store.ts`)
- **WebSocket:** Colyseus SDK for real-time server communication
- **Router:** React Router v7

**Key finding:** No Canvas or WebGL currently used in the game UI. The zone designer uses **ReactFlow** (SVG-based graph renderer) for admin tooling, but player-facing UI is **pure DOM rendering**.

### 2.2 Combat UI (Current State)

**Primary combat interface:**
- **CombatHUD component** (`packages/client/src/components/CombatHUD.tsx`)
  - Target panel with HP tier display ("Uninjured", "Wounded", etc.)
  - Telegraphed action indicator (warns player of incoming attacks)
  - Tab-cycling through multiple targets
  - Ability cooldown grid (placeholder for future ability system)
  - Group frames (placeholder for party UI)

- **RoomOccupants component** (`packages/client/src/components/RoomOccupants.tsx`)
  - Lists creatures and players in current room
  - Grouped by creature type (e.g., "goblin (x3)")
  - Displays aggressive state (⚔ icon) and disconnected players (💤 icon)

**Combat state flow:**
1. Server sends combat messages via WebSocket (Colyseus Room schema changes)
2. Client updates `store.ts` state (enemyStatus, inCombat, combatTick, roomOccupants, etc.)
3. Combat HUD and room list update reactively
4. Player actions sent via `room.send('combat:action', { action: ... })`

**Key insight:** Combat state is **already tracked** (`roomOccupants` has creatures and players, including position/state). We have the data needed for a grid view — we just need to render it.

### 2.3 Layout & Screen Real Estate

**ZoneExploration page** (`packages/client/src/pages/ZoneExploration.tsx`) is the main game screen:

```
┌────────────────────────────────────────┐
│  Header (zone name, room name)        │
├──────────────┬─────────────────────────┤
│              │  Right Panel:           │
│  Narrative   │  - Compass              │
│  Terminal    │  - Minimap              │
│  (text log)  │  - Room Occupants       │
│              │  - Combat HUD           │
│              │  - Equipment Silhouette │
├──────────────┴─────────────────────────┤
│  Command Prompt                        │
└────────────────────────────────────────┘
```

**Challenge:** Where does the combat grid live?

**Option A:** Replace the minimap widget with grid during combat  
**Option B:** Full-screen grid overlay (modal/dialog)  
**Option C:** Embed grid in narrative area as inline visual  
**Option D:** Dedicated combat tab/panel toggle

### 2.4 Mobile/Responsive Considerations

**Current responsive behavior:**
- Mobile: Single-column layout, panels stack vertically
- Minimap hides on small screens
- Combat HUD scales down but remains visible

**Grid implications:**
- 32x32px tiles × 20x20 grid = 640x640px minimum (doesn't fit mobile screens)
- Need adaptive tile size or scrollable viewport
- Touch controls for entity selection (no mouse hover on mobile)

---

## 3. Proposed Grid Rendering Approach

### 3.1 Canvas vs WebGL vs DOM

**HTML5 Canvas (2D Context)** — ✅ **Recommended**

**Pros:**
- Simple, well-documented API
- Proven in DCSS webtiles (handles 60+ entities smoothly)
- Easy sprite rendering with `drawImage(spriteSheet, sx, sy, sw, sh, dx, dy, dw, dh)`
- No library dependencies (native browser API)
- Works on all devices (mobile included)
- Straightforward entity layering (draw order = render order)

**Cons:**
- No built-in scene graph (must track entities ourselves)
- Manual input handling (click detection via canvas coordinates)

**WebGL (via Pixi.js, etc.)** — ❌ Not recommended for this use case

**Pros:**
- High performance for particle effects, large sprite counts
- Hardware-accelerated transforms and blending
- Mature libraries (Pixi.js v8 is excellent)

**Cons:**
- Overkill for static/turn-based grid (we're not rendering 1000s of sprites)
- Library bundle size (~500KB for Pixi.js)
- More complex debugging
- Mobile GPU compatibility issues (older devices)

**DOM (React components per tile)** — ❌ Not recommended

**Pros:**
- React-native approach, easy to integrate with existing components

**Cons:**
- 400-tile grid (20×20) = 400 DOM nodes = sluggish reflows
- CSS animations aren't ideal for frame-by-frame sprite updates
- Event handling performance issues

**Verdict: Use Canvas 2D.** It's lightweight, battle-tested, and perfectly suited for a tile grid.

### 3.2 Recommended Tile Engine / Library

**rot.js** ([ondras.github.io/rot.js](https://ondras.github.io/rot.js/hp/))  
A JavaScript roguelike toolkit with built-in tile rendering, FOV, pathfinding, and RNG.

**Pros:**
- Designed specifically for roguelike UIs
- Canvas-based tile rendering with sprite sheet support
- Field-of-view (FOV) algorithms built-in (useful for fog-of-war)
- 15KB minified (tiny footprint)
- Well-documented, actively maintained

**Cons:**
- Includes features we don't need (dungeon generation, etc.)
- Rendering API is a bit opinionated (we might want finer control)

**Alternative: Custom Canvas Renderer**

Write a simple tile renderer from scratch (~200 lines):
```typescript
class TileRenderer {
  constructor(canvas, tileSize, spriteSheet) { ... }
  drawTile(x, y, tileIndex) { ... }
  drawEntity(x, y, entityType) { ... }
  clear() { ... }
  handleClick(canvasX, canvasY) { ... } // convert to grid coords
}
```

**Recommendation:** Start with **rot.js** for rapid prototyping. If we need more control, extract the tile rendering logic and write a custom renderer. Don't over-engineer on day one.

### 3.3 Grid Data Model

**Server responsibilities:**
- Track entity positions on grid (x, y coordinates per room)
- Send grid updates via WebSocket when entities move/spawn/die
- Validate grid actions (attacks, movement) server-side

**Client responsibilities:**
- Render grid state from server data
- Handle local animations (attack swoosh, death fade)
- Convert user clicks to grid coordinates and send actions

**State shape (addition to `store.ts`):**
```typescript
interface GridEntity {
  id: string;
  type: 'player' | 'creature' | 'hazard' | 'item';
  name: string;
  x: number;
  y: number;
  spriteIndex: number;
  hp?: number;
  maxHp?: number;
  status?: string[]; // ['poisoned', 'stunned']
}

interface CombatGrid {
  enabled: boolean; // room supports grid combat
  width: number;
  height: number;
  entities: GridEntity[];
  playerPosition: { x: number; y: number } | null;
}

// Add to AppState:
combatGrid: CombatGrid | null;
```

**WebSocket protocol (addition to Colyseus schema):**
```typescript
// Server sends on entity movement
room.send('grid:update', {
  entities: [
    { id: 'goblin-1', x: 5, y: 7, hp: 20, maxHp: 30 },
    { id: 'player-abc', x: 10, y: 10, hp: 100, maxHp: 120 }
  ]
});

// Client sends on grid click
room.send('grid:action', {
  action: 'move', // or 'attack', 'interact'
  targetX: 6,
  targetY: 8
});
```

### 3.4 Integration with Existing UI

**Design decision: Grid as optional overlay, not replacement.**

**Reasons:**
1. **Accessibility:** Text-first combat must remain playable (screen readers, keyboard-only users)
2. **Information parity:** Grid shows position, text shows detailed status/effects
3. **Player choice:** Some players prefer pure text, some prefer visual
4. **Mobile fallback:** Small screens may not fit grid comfortably

**Proposed layout (combat active):**

```
┌────────────────────────────────────────┐
│  Zone: The Goblin Warren  │  [GRID]   │ ← Toggle button
├──────────────┬─────────────────────────┤
│              │  ┌─────────────────────┐│
│  Narrative   │  │                     ││
│  Terminal    │  │   COMBAT GRID       ││
│              │  │   (Canvas element)  ││
│              │  │                     ││
│              │  └─────────────────────┘│
│              │  Combat HUD / Targets   │
├──────────────┴─────────────────────────┤
│  Command Prompt                        │
└────────────────────────────────────────┘
```

**Grid visibility:**
- Hidden by default (or user preference)
- Toggle button in header ("Grid View" icon)
- Grid replaces minimap widget during combat
- Reverts to minimap when combat ends

**Responsive behavior:**
- Desktop: Grid in right panel (400-600px width)
- Tablet: Grid in overlay (centered, semi-transparent backdrop)
- Mobile: Full-screen grid overlay (or disabled entirely based on user testing)

---

## 4. Technical Implementation Details

### 4.1 Canvas Setup & Lifecycle

**Component structure:**
```tsx
// packages/client/src/components/CombatGrid.tsx
interface CombatGridProps {
  grid: CombatGrid;
  onGridAction: (action: string, x: number, y: number) => void;
}

export function CombatGrid({ grid, onGridAction }: CombatGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spriteSheet, setSpriteSheet] = useState<HTMLImageElement | null>(null);
  
  // Load sprite sheet on mount
  useEffect(() => {
    const img = new Image();
    img.src = '/assets/tiles/creatures.png';
    img.onload = () => setSpriteSheet(img);
  }, []);
  
  // Render loop
  useEffect(() => {
    if (!canvasRef.current || !spriteSheet) return;
    const ctx = canvasRef.current.getContext('2d');
    renderGrid(ctx, grid, spriteSheet);
  }, [grid, spriteSheet]);
  
  // Click handling
  const handleClick = (e: MouseEvent) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);
    onGridAction('select', x, y);
  };
  
  return (
    <canvas
      ref={canvasRef}
      width={grid.width * TILE_SIZE}
      height={grid.height * TILE_SIZE}
      onClick={handleClick}
      style={{ imageRendering: 'pixelated' }} // crisp pixel art
    />
  );
}
```

### 4.2 Sprite Sheet Loading & Management

**Asset structure:**
```
public/assets/tiles/
├── creatures.png      (sprite sheet: 32x32 tiles)
├── players.png        (character sprites)
├── terrain.png        (floor, walls, hazards)
├── effects.png        (attack swooshes, blood, etc.)
└── tile-manifest.json (metadata: entity → tile index)
```

**Manifest format:**
```json
{
  "creatures": {
    "goblin": 0,
    "orc": 1,
    "troll": 2
  },
  "players": {
    "warrior": 0,
    "mage": 1
  },
  "terrain": {
    "floor": 0,
    "wall": 1,
    "door": 2
  }
}
```

**Loading strategy:**
- Lazy load on first combat grid render (don't block initial page load)
- Cache loaded images in component state or React context
- Fallback to colored squares if sprite fails to load (dev resilience)

### 4.3 Rendering Layers

**Draw order (back to front):**
1. **Terrain layer** (floor tiles, walls if visible)
2. **Items layer** (loot on ground)
3. **Entity layer** (creatures, players)
4. **Effect layer** (attack animations, status icons)
5. **UI layer** (grid overlay, selection highlight)

**Rendering pseudo-code:**
```typescript
function renderGrid(ctx, grid, spriteSheet) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 1. Terrain (floor texture or solid color)
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      drawTile(ctx, spriteSheet.terrain, 0, x, y); // floor tile
    }
  }
  
  // 2. Entities
  for (const entity of grid.entities) {
    const tileIndex = getTileIndex(entity.type, entity.name);
    drawTile(ctx, spriteSheet.creatures, tileIndex, entity.x, entity.y);
    
    // HP bar overlay (optional)
    if (entity.hp && entity.maxHp) {
      drawHpBar(ctx, entity.x, entity.y, entity.hp / entity.maxHp);
    }
  }
  
  // 3. UI overlays (selection, movement range, etc.)
  if (selectedEntity) {
    drawSelectionHighlight(ctx, selectedEntity.x, selectedEntity.y);
  }
}

function drawTile(ctx, spriteSheet, tileIndex, gridX, gridY) {
  const tilesPerRow = 64;
  const sx = (tileIndex % tilesPerRow) * TILE_SIZE;
  const sy = Math.floor(tileIndex / tilesPerRow) * TILE_SIZE;
  const dx = gridX * TILE_SIZE;
  const dy = gridY * TILE_SIZE;
  
  ctx.drawImage(spriteSheet, sx, sy, TILE_SIZE, TILE_SIZE, dx, dy, TILE_SIZE, TILE_SIZE);
}
```

### 4.4 Animations & Visual Feedback

**Challenges:**
- MUD combat is **real-time** (not strictly turn-based)
- Multiple entities may act simultaneously
- Animations must not block player input

**Animation strategy:**
1. **Instant updates for combat log** (text remains authoritative)
2. **Optional animations for grid** (can be disabled in settings)
3. **Animation types:**
   - **Movement:** Smooth tween from old position to new (200ms ease-out)
   - **Attack:** Flash sprite, draw swoosh effect (100ms)
   - **Death:** Fade out, leave corpse sprite (500ms)
   - **Damage:** Floating damage number, entity flash red (300ms)

**Implementation approach:**
- Use `requestAnimationFrame` for smooth 60fps animations
- Store animation state outside React (animations = side effects, not state)
- Queue animations in a timeline (play sequentially or in parallel)

**Fallback:** If animations prove complex, **skip them initially**. Static grid updates are still valuable. Polish can come in iteration 2.

### 4.5 Performance Considerations

**Concerns:**
- 20×20 grid = 400 tiles redrawn every update
- Multiple entities moving simultaneously
- Mobile devices with slower GPUs

**Optimizations:**
1. **Dirty rectangle rendering:** Only redraw changed tiles (track diff from last frame)
2. **Offscreen canvas:** Pre-render static terrain layer, composite onto main canvas
3. **Frame throttling:** Cap at 30fps for grid (60fps is overkill for turn-based/slow combat)
4. **Sprite batching:** rot.js handles this internally (single drawImage per tile)

**Benchmark target:** Maintain 60fps on 2020-era mid-range devices (tested on iPhone 12, Pixel 5, desktop)

**Expected performance:** Canvas 2D can easily handle 400 tiles + 20 entities at 60fps. DCSS webtiles is proof. No concerns unless we add heavy particle effects.

---

## 5. Grid State Updates & Synchronization

### 5.1 WebSocket Protocol Extensions

**Server → Client (Combat Grid State):**

```typescript
// Initial grid setup (sent when combat starts)
room.send('combat:grid:init', {
  gridSize: { width: 20, height: 15 },
  entities: [
    { id: 'player-123', type: 'player', name: 'Conan', x: 10, y: 7, hp: 100, maxHp: 120, sprite: 'warrior' },
    { id: 'goblin-1', type: 'creature', name: 'goblin', x: 5, y: 7, hp: 20, maxHp: 30, sprite: 'goblin' },
    { id: 'goblin-2', type: 'creature', name: 'goblin', x: 6, y: 8, hp: 30, maxHp: 30, sprite: 'goblin' }
  ]
});

// Entity position update (sent on movement)
room.send('combat:grid:move', {
  entityId: 'goblin-1',
  x: 6,
  y: 7
});

// Entity HP update (sent on damage)
room.send('combat:grid:damage', {
  entityId: 'goblin-1',
  hp: 10,
  maxHp: 30
});

// Entity removed (sent on death)
room.send('combat:grid:remove', {
  entityId: 'goblin-1'
});

// Combat ended (grid teardown)
room.send('combat:grid:end', {});
```

**Client → Server (Grid Actions):**

```typescript
// Player clicks a grid cell
room.send('combat:grid:action', {
  action: 'move',
  targetX: 8,
  targetY: 6
});

// Player clicks an entity
room.send('combat:grid:action', {
  action: 'attack',
  targetEntityId: 'goblin-1'
});
```

**Synchronization rules:**
- **Server is authoritative** — client renders server state, not predicted state
- **Client-side prediction off** (for initial MVP) — wait for server confirmation before updating grid
- **Future enhancement:** Client predicts movement, rolls back on server rejection (reduces perceived latency)

### 5.2 Collision with Existing Combat State

**Potential conflict:** Grid state vs. existing `roomOccupants` and `enemyStatus` fields in `store.ts`.

**Resolution:**
- **Grid state is additive** — it extends roomOccupants with position data, not replace
- `roomOccupants` remains the source of truth for entity list (creatures, players)
- Grid adds `x, y` coordinates and `sprite` metadata
- `enemyStatus` (current target) syncs with grid selection (clicking entity on grid updates `enemyStatus`)

**Data flow:**
```
Server updates roomOccupants → Store updates → Both CombatHUD and CombatGrid re-render
Grid click → Update selectedTarget in store → CombatHUD highlights target
```

---

## 6. Accessibility Considerations

**Challenge:** Grid combat is inherently visual. How do we preserve accessibility?

### 6.1 Text Parity Requirement

**Design rule:** Grid **must not** be the sole source of combat information.

**Implementations:**
1. **Combat log remains authoritative** — all grid events generate text messages
   - "Goblin moves to your left"
   - "You strike the goblin for 15 damage"
   - "Goblin dies"
2. **CombatHUD shows same info** as grid (HP, status, position description)
3. **Screen reader support:**
   - Canvas element has `aria-label` describing grid state
   - Entity list announced as text ("3 goblins: north, east, northeast")
   - Combat log is primary interface for screen reader users

### 6.2 Keyboard Navigation

**Mouse-free grid interaction:**
- Arrow keys to move grid cursor (highlight cell)
- Tab to cycle through entities (sync with CombatHUD target cycling)
- Space to select entity, Enter to attack
- Escape to deselect

**Implementation:**
- Canvas element is `tabindex="0"` (focusable)
- `onKeyDown` handler in CombatGrid component
- Visual focus indicator (highlight ring around selected cell)

### 6.3 High Contrast & Color Blindness

**Concerns:**
- Red/green HP bars hard to distinguish for colorblind users
- Low contrast tiles hard to see for visually impaired

**Solutions:**
- User setting: "High contrast grid" (replaces sprites with colored shapes + text labels)
- HP bars use patterns (stripes, dots) in addition to color
- Tile outlines thickened in high contrast mode
- Optional: Grid overlays text labels on entities (e.g., "G" for goblin)

---

## 7. Responsive Design & Mobile Strategy

### 7.1 Desktop (≥1024px width)

**Grid placement:** Right panel, above or in place of minimap during combat

**Grid size:** 600×400px canvas (can fit 18×12 tiles at 32px, or scale to fit)

**Interactions:** Mouse click to select entity, hover for tooltip

### 7.2 Tablet (768px - 1023px)

**Grid placement:** Overlay (modal), triggered by "Show Grid" button

**Grid size:** 80% of viewport width, centered

**Interactions:** Touch tap to select entity, long-press for tooltip

### 7.3 Mobile (<768px)

**Option A: Disable grid entirely** (text-only combat)
- Simplest, preserves playability
- Add setting: "Enable grid on mobile" (advanced users can opt-in)

**Option B: Full-screen grid overlay**
- Tap "Grid" button → full-screen canvas
- Pinch-to-zoom support for large grids
- Higher implementation complexity

**Recommendation:** Start with **Option A** (disable on mobile). If user feedback demands it, add Option B in a later iteration. Mobile MUD players are accustomed to text interfaces.

### 7.4 Tile Scaling

**Challenge:** Fixed 32px tiles may be too small on high-DPI displays, too large on small screens.

**Solution: Adaptive tile size**
```typescript
const TILE_BASE_SIZE = 32;
const scale = Math.min(
  canvas.width / (grid.width * TILE_BASE_SIZE),
  canvas.height / (grid.height * TILE_BASE_SIZE)
);
const tileSize = Math.floor(TILE_BASE_SIZE * scale);
```

**Rendering:** Scale canvas context:
```typescript
ctx.scale(scale, scale);
// Now draw at TILE_BASE_SIZE, canvas handles scaling
```

---

## 8. Technical Recommendations

### 8.1 Phase 1: Prototype (1-2 weeks)

**Goals:**
- Prove Canvas rendering works
- Integrate grid into existing UI without breaking text combat
- Get player feedback on visual style

**Deliverables:**
1. **CombatGrid component** (Canvas-based, hardcoded test data)
2. **Sprite sheet loader** (single creatures.png with 5-10 test tiles)
3. **Grid toggle button** in ZoneExploration header
4. **Static grid rendering** (no animations, just positions)
5. **Click-to-select entity** (updates `enemyStatus` in store)

**Out of scope for Phase 1:**
- Animations
- Mobile optimization
- Full DCSS tileset integration
- Server-side grid logic (use mock data in client)

### 8.2 Phase 2: Server Integration (2-3 weeks)

**Goals:**
- Real combat grid state from server
- Entity movement updates
- Attack/death visual feedback

**Deliverables:**
1. **Server-side grid positioning** (add x, y to creature/player state)
2. **WebSocket protocol** (combat:grid:init, combat:grid:move, etc.)
3. **Client sync** (Grid state updates from server)
4. **Basic animations** (entity movement tween, damage flash)
5. **Player grid actions** (click grid → send action to server)

**Out of scope for Phase 2:**
- Advanced animations (death effects, particle systems)
- Full tactical combat system (movement cost, range, etc.)

### 8.3 Phase 3: Polish & Optimization (1-2 weeks)

**Goals:**
- Smooth user experience
- Performance tuning
- Visual polish

**Deliverables:**
1. **Animation system** (death effects, attack swooshes, floating damage numbers)
2. **High contrast mode** (accessibility)
3. **Keyboard navigation** (arrow keys, tab cycling)
4. **Performance profiling** (ensure 60fps on target devices)
5. **Mobile responsive layout** (or graceful disable)
6. **User settings** (toggle grid, toggle animations, tile size, etc.)

### 8.4 Tech Stack Summary

**Required dependencies:**
- None (Canvas 2D is built-in browser API)

**Optional dependencies:**
- `rot.js` (15KB, nice-to-have for FOV/tile rendering helpers) — evaluate in Phase 1
- If rot.js feels overkill, write custom tile renderer (~200 lines)

**No dependencies needed for:**
- Sprite loading (native `Image()` works fine)
- Animation (requestAnimationFrame is sufficient)
- Input handling (native mouse/keyboard events)

---

## 9. Open Questions & Risks

### 9.1 Open Questions

**Q1: Grid size — fixed or variable per room?**
- **Fixed (e.g., always 20×20):** Simpler, consistent UI
- **Variable:** Some rooms are bigger/smaller (more realistic, harder to design around)
- **Recommendation:** Start fixed, evaluate variable in Phase 2

**Q2: Grid topology — square grid or hex grid?**
- **Square:** Simpler math, aligns with DCSS style
- **Hex:** Better for tactical combat (no diagonal weirdness), harder to implement
- **Recommendation:** Square grid (DCSS proven, easier initial implementation)

**Q3: Player movement — free movement or turn-based?**
- **Free (real-time):** Players move via WASD or click, like DCSS webtiles
- **Turn-based:** Player queues move, waits for tick resolution
- **Recommendation:** Depends on server combat system design (out of scope for frontend analysis)

**Q4: FOV / Fog of War?**
- Should players see the entire grid, or only tiles in line-of-sight?
- **Recommendation:** Phase 1 = full visibility. Phase 3 = add FOV if desired (rot.js has FOV algorithms ready to use)

**Q5: Multi-floor combat?**
- Can combat span multiple z-levels (e.g., balcony overlooking arena)?
- **Recommendation:** Out of scope for initial implementation. Assume single-floor grid per room.

### 9.2 Risks & Mitigations

**Risk 1: Tileset licensing issues**
- **Impact:** Legal problems if we use tiles without proper license
- **Mitigation:** Strict audit of DCSS tiles repository, only use CC0-confirmed tiles, maintain attribution doc

**Risk 2: Grid adds complexity to combat system**
- **Impact:** Server logic becomes more complex (collision, range, positioning), harder to balance
- **Mitigation:** Grid is **client-side visualization only** in Phase 1 (server still uses existing combat logic, grid just shows positions)

**Risk 3: Performance issues on low-end devices**
- **Impact:** Laggy grid rendering, poor UX on mobile
- **Mitigation:** Performance testing on target devices in Phase 1, fallback to text-only mode if needed

**Risk 4: Players find grid distracting / unnecessary**
- **Impact:** Development time wasted on unwanted feature
- **Mitigation:** User survey/feedback before Phase 2 commitment, make grid **optional and toggleable**

**Risk 5: Screen reader users lose combat info**
- **Impact:** Accessibility regression
- **Mitigation:** Text parity requirement (all grid events logged as text), combat log remains primary interface

---

## 10. Alternative Approaches Considered

### 10.1 ASCII Art Grid (No Sprites)

**Idea:** Render grid as colored ASCII characters in a monospace font (like traditional roguelikes)

**Pros:**
- No sprite sheet needed (zero asset overhead)
- Retains "pure text" MUD aesthetic
- Smaller implementation (just draw text on canvas)

**Cons:**
- Less visually engaging than tiles
- Harder to convey creature identity at a glance (letter "g" vs goblin sprite)

**Verdict:** Rejected. DCSS-style tiles are explicitly requested in issue #337. ASCII grid doesn't match the vision.

### 10.2 SVG-Based Grid

**Idea:** Use SVG instead of Canvas (like our existing MapRenderer for zone exploration)

**Pros:**
- React-friendly (each tile = React component)
- CSS animations for free
- Easier to debug (inspect elements in DevTools)

**Cons:**
- Performance issues with 400+ SVG nodes
- Sprite rendering awkward in SVG (use `<image>` refs, less efficient than canvas drawImage)

**Verdict:** Rejected. Canvas is faster and better suited for tile grids.

### 10.3 Terminal-Based Grid (ANSI Blocks)

**Idea:** Render grid as ANSI-colored blocks in the narrative terminal (like our existing AnsiText component)

**Pros:**
- Reuses existing ANSI rendering infrastructure
- Screen-reader friendly (text-based)
- No new UI components needed

**Cons:**
- Limited resolution (each "tile" = one character cell)
- Can't use sprites (stuck with ASCII or Unicode blocks)
- Hard to scale for large grids

**Verdict:** Rejected. Not visually compelling enough for combat UX.

---

## 11. Next Steps & Recommendations

### 11.1 Immediate Actions (Before Implementation)

1. **Get stakeholder approval** on Canvas-based approach
2. **Download DCSS tiles repository** and audit licensing (confirm CC0 tiles)
3. **Prototype sprite sheet** (assemble 10-20 test tiles into creatures.png)
4. **Create tile manifest JSON** mapping creature types → sprite indices
5. **Design WebSocket protocol** for grid state (collaborate with backend dev)

### 11.2 Implementation Sequence

**Week 1-2: Canvas Prototype**
- Implement CombatGrid component (Canvas rendering)
- Load sprite sheet, render static test grid
- Integrate into ZoneExploration UI (toggle button)
- Get team feedback on visual style

**Week 3-4: Server Integration**
- Extend Colyseus schema to include grid state (x, y per entity)
- Implement WebSocket protocol (combat:grid:init, etc.)
- Client syncs grid state from server
- Click entity → select target in CombatHUD

**Week 5-6: Polish**
- Add animations (movement, damage, death)
- Keyboard navigation support
- High contrast mode
- Performance testing & optimization

### 11.3 Success Criteria

**Phase 1 (Prototype):**
- ✅ Grid renders 20×20 tiles with sprites from sheet
- ✅ Entities appear at correct positions
- ✅ Click entity → selects target in CombatHUD
- ✅ Toggle button shows/hides grid

**Phase 2 (Server Integration):**
- ✅ Grid syncs with live combat state from server
- ✅ Entity movement updates in real-time
- ✅ Attack actions sent from grid clicks
- ✅ No regressions in text-based combat

**Phase 3 (Polish):**
- ✅ Smooth animations (60fps)
- ✅ Keyboard navigation works
- ✅ Screen reader users can play combat (text parity)
- ✅ Mobile either works smoothly or gracefully disables

---

## 12. Appendix: References & Resources

### 12.1 External Resources

- **DCSS Tiles Repository:** https://github.com/crawl/tiles
- **DCSS Webtiles (Live Example):** https://crawl.develz.org/play.htm
- **rot.js Documentation:** https://ondras.github.io/rot.js/hp/
- **Pixi.js (WebGL library):** https://pixijs.com/ (evaluated, not recommended)
- **Canvas 2D API (MDN):** https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

### 12.2 Ellmud Codebase References

- **Combat HUD:** `packages/client/src/components/CombatHUD.tsx`
- **Room Occupants:** `packages/client/src/components/RoomOccupants.tsx`
- **Zone Exploration:** `packages/client/src/pages/ZoneExploration.tsx`
- **App State:** `packages/client/src/store.ts`
- **Map Renderer (SVG example):** `packages/client/src/components/map/MapRenderer.tsx`
- **Zone Designer (ReactFlow example):** `packages/client/src/components/map/ZoneDesignerFlow.tsx`

### 12.3 Similar Projects

- **DCSS Webtiles** (Crawl in browser, tile-based)
- **Shattered Pixel Dungeon** (mobile roguelike, tile-based)
- **Cogmind** (commercial roguelike, advanced tile rendering)
- **Dwarf Fortress** (ASCII + tile mode toggle, inspiration for dual-mode approach)

---

## Final Thoughts (Regis)

This is an exciting feature. DCSS tiles are a perfect fit — visually distinctive, CC0-licensed, and battle-tested in a web environment. Canvas 2D is the right tool for the job: simple, fast, and proven.

**My biggest concern:** Keeping the grid **optional and non-intrusive**. Ellmud is a text-first MUD, and that's a strength. The grid should enhance combat for visual learners, not replace the text experience. If we nail the toggle UX and maintain text parity, this feature will be a win.

**My recommendation:** Start small (Phase 1 prototype), get player feedback early, iterate. Don't over-engineer the animation system or mobile responsiveness until we know players want this.

Let's build it.

— Regis
