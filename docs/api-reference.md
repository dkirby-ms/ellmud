# API Reference

## WebSocket Message Protocol

All gameplay communication uses Colyseus WebSocket messaging. The client is a prose-only terminal — **no Colyseus Schema state is synced to clients**.

### Connection

```
ws://localhost:2567
```

**Room types:**
- `shard` — Exploration/combat instance (20-40 min lifetime)
- `refuge` — Persistent safe hub

**Joining a room:**
```typescript
import { Client } from 'colyseus.js';

const client = new Client('ws://localhost:2567');

// Join with optional auth token
const room = await client.joinOrCreate('shard', { token: 'your-auth-token' });

// Listen for messages
room.onMessage('narrate', (message) => { /* handle narration */ });
room.onMessage('room_header', (message) => { /* handle room info */ });
```

### Message Types

Wire-level message keys defined in `@ellmud/shared`:

```typescript
const MessageTypes = {
  COMMAND: 'cmd',
  NARRATE: 'narrate',
  ROOM_HEADER: 'room_header',
  SHARD_STATE: 'shard_state',
  COMBAT_RESULT: 'combat_result',
  EXTRACTION_STATE: 'extraction_state',
  STASH_UPDATE: 'stash_update',
};
```

---

## Client → Server

### `cmd` — Command Input

Send a parsed command to the server.

```typescript
room.send('cmd', {
  verb: string,   // Command verb (e.g., 'go', 'look', 'attack')
  args: string[], // Arguments (e.g., ['north'], ['goblin'])
});
```

---

## Server → Client

### `narrate` — Narration

Prose text delivered to the player.

```typescript
interface NarrateMessage {
  text: string;       // Narrated prose
  type: NarrationType; // Category of narration
  timestamp: number;   // Server timestamp (ms)
}

type NarrationType =
  | 'room'    // Room descriptions, look output
  | 'combat'  // Combat tick results
  | 'system'  // System messages (join, disconnect, errors)
  | 'speech'  // Player/NPC speech
  | 'sound'   // Sound propagation cues
  | 'trace';  // Environmental traces (footprints, blood, etc.)
```

### `room_header` — Room Info

Structured room metadata sent alongside narration on room entry.

```typescript
interface RoomHeaderMessage {
  roomName: string;    // Display name of the room
  exits: string[];     // Available directions (e.g., ['north', 'east'])
  stability: number;   // Shard stability 0.0–1.0
}
```

### `shard_state` — Shard Lifecycle

Broadcast to all players when shard state changes.

```typescript
interface ShardStateMessage {
  state: ShardState;        // Current lifecycle phase
  collapseTimer?: number;   // Seconds remaining (if applicable)
}

type ShardState =
  | 'seeding'
  | 'open'
  | 'active'
  | 'destabilising'
  | 'collapse';
```

### `combat_result` — Combat Tick

Sent per combat tick to all encounter participants.

```typescript
interface CombatResultMessage {
  tick: number;
  encounterId: string;
  results: Array<{
    actorId: string;
    actorName: string;
    action: CombatAction;
    targetId?: string;
    targetName?: string;
    damage?: number;
    newHp?: number;
    maxHp?: number;
  }>;
  combatEnded: boolean;
}

type CombatAction =
  | 'strike'
  | 'heavy_strike'
  | 'dodge'
  | 'block'
  | 'use_item'
  | 'skill'
  | 'flee'
  | 'observe';
```

### `extraction_state` — Extraction Progress

Sent to the extracting player during channeled extraction.

```typescript
interface ExtractionMessage {
  playerId: string;
  state: 'started' | 'progress' | 'completed' | 'interrupted';
  ticksRemaining?: number;
  totalTicks?: number;
  narration: string;
  timestamp: number;
}
```

### `stash_update` — Stash Changes

Sent when a player's stash contents change.

---

## Command List

Commands are parsed via verb-noun syntax. The parser supports direction aliases and single-letter abbreviations.

### Movement

| Command | Alias | Description |
|---------|-------|-------------|
| `go <direction>` | — | Move in a direction |
| `n`, `s`, `e`, `w`, `u`, `d` | → `go north`, etc. | Direction shortcuts |

Directions: `north`, `south`, `east`, `west`, `up`, `down`

### Observation

| Command | Alias | Description |
|---------|-------|-------------|
| `look [target]` | `l` | Describe current room or examine a target |
| `search` | — | Search the room for hidden items/features |
| `listen` | — | Listen for sounds in adjacent rooms |

### Items

| Command | Alias | Description |
|---------|-------|-------------|
| `take <item>` | — | Pick up an item from the room |
| `drop <item>` | — | Drop an item from inventory |
| `inventory` | `i` | List carried items |
| `use <item>` | — | Use a consumable item |

### Combat

| Command | Alias | Description |
|---------|-------|-------------|
| `attack <target>` | `k` | Initiate combat with a target |
| `strike` | — | Attack action during combat tick |
| `dodge` | — | Evasion action during combat tick (default if no input) |
| `flee [direction]` | — | Attempt to escape combat |

### Social

| Command | Alias | Description |
|---------|-------|-------------|
| `say <message>` | — | Speak to players in the same room |

### Extraction

| Command | Alias | Description |
|---------|-------|-------------|
| `extract` | — | Begin extraction ritual (extraction rooms only) |

### Refuge-Only

| Command | Alias | Description |
|---------|-------|-------------|
| `stash` | — | View stash contents and weight |
| `store <item>` | — | Place item into stash |
| `shardboard` | — | View available shard entries |
| `enter <shard-id>` | — | Enter an open shard listed on the shardboard |

### Command Errors

Unknown commands return a narration of type `system`:

```
Unknown command: "dance". Try "look" to survey your surroundings.
```

Empty input returns:

```
Silence hangs in the air. Type a command.
```

---

## HTTP Endpoints

### Authentication

#### `POST /auth/register`

Create a new player account.

```json
// Request
{ "username": "string", "password": "string" }

// Response 200
{ "playerId": "string", "token": "string" }

// Error 400 — Invalid input
{ "error": "Username must be 3-20 characters..." }

// Error 409 — Duplicate username
{ "error": "Username already taken" }
```

**Validation:**
- Username: 3–20 characters, alphanumeric + underscore/hyphen
- Password: ≥ 6 characters

#### `POST /auth/login`

Authenticate and receive a token.

```json
// Request
{ "username": "string", "password": "string" }

// Response 200
{ "playerId": "string", "token": "string" }

// Error 401 — Invalid credentials
{ "error": "Invalid username or password" }
```

#### `POST /auth/logout`

Invalidate the current token.

```
Authorization: Bearer <token>
```

```json
// Response 200
{ "message": "Logged out" }
```

**Token details:**
- Format: UUID
- TTL: 24 hours
- Storage: In-memory (Phase 1), Redis (Phase 2)

### Health Check

#### `GET /health`

```json
{
  "status": "ok",
  "uptime": 1234.56,
  "timestamp": 1710000000000
}
```

### Admin Monitor

#### `GET /colyseus`

Colyseus Monitor dashboard. Displays room states, connected clients, and server metrics. Uses Colyseus Schema state sync internally (admin only — never exposed to game clients).
