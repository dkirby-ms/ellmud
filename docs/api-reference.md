# API Reference

## WebSocket Message Protocol

All gameplay communication uses Colyseus WebSocket messaging. Both web and Unity clients use the same message protocol. Clients are thin presentation layers — **no Colyseus Schema state is synced to clients**. All state is server-authoritative.

### Connection

```
ws://localhost:2567
```

**Room types:**
- `zone` — Adventure zone instance (persistent or temporary)
- `stronghold` — Persistent faction hub (safe spawn, stash, expedition board)

**Joining a room (Web Client):**
```typescript
import { Client } from 'colyseus.js';

const client = new Client('ws://localhost:2567');

// Join with auth token
const room = await client.joinOrCreate('zone', { 
  zoneId: 'flooded-crypt',
  token: 'your-auth-token' 
});

// Listen for messages
room.onMessage('narrate', (message) => { /* handle narration */ });
room.onMessage('room_header', (message) => { /* handle room info */ });
```

**Joining a room (Unity Client):**
```csharp
using Colyseus;

var client = new Client("ws://localhost:2567");
var room = await client.JoinOrCreate<GameRoomState>("zone", new Dictionary<string, object> {
  { "zoneId", "flooded-crypt" },
  { "token", authToken }
});

room.OnMessage += (message) => { /* handle updates */ };
```

### Message Types

Wire-level message keys defined in `@ellmud/shared`:

```typescript
const MessageTypes = {
  COMMAND: 'cmd',
  NARRATE: 'narrate',
  ROOM_HEADER: 'room_header',
  ZONE_STATE: 'zone_state',
  COMBAT_RESULT: 'combat_result',
  STASH_UPDATE: 'stash_update',
  GROUP_UPDATE: 'group_update',
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
  zone: string;        // Zone identifier
}
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

### `group_update` — Group Status

Sent when group composition, leadership, or member status changes.

```typescript
interface GroupUpdateMessage {
  groupId: string;
  leader: string;
  members: Array<{
    playerId: string;
    name: string;
    hp: number;
    maxHp: number;
    status: 'alive' | 'downed' | 'dead';
  }>;
  lootMode: 'round_robin' | 'free_for_all' | 'need_greed';
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
| `target <entity>` | — | Switch combat target |
| `target next` | `Tab` | Cycle to next hostile entity |
| `ability 1` | `1` | Use ability 1 (queued for next tick) |
| `ability 2` | `2` | Use ability 2 (queued for next tick) |
| `ability 3` | `3` | Use ability 3 (queued for next tick) |
| `ability 4` | `4` | Use ability 4 (queued for next tick) |
| `ability 5` | `5` | Use ability 5 (queued for next tick) |
| `reposition front` | — | Move to Front position (melee range) |
| `reposition flank` | — | Move to Flank position (hybrid) |
| `reposition rear` | — | Move to Rear position (ranged) |
| `flee [direction]` | — | Attempt to escape combat and move to an adjacent room |

### Social

| Command | Alias | Description |
|---------|-------|-------------|
| `say <message>` | — | Speak to players in the same room |
| `emote <action>` | — | Perform an action (roleplay) |
| `group invite <player>` | — | Invite player to form a group |
| `group leave` | — | Leave the current group |

### Zone Exits

To leave a zone and return to your stronghold, navigate to an **exit room** and type:

| Command | Description |
|---------|-------------|
| `look` | Check if an exit is available in this room |
| `go <direction>` | Move toward the exit |

Once you exit a zone, all carried items automatically move to your stash.

### Stronghold-Only

| Command | Alias | Description |
|---------|-------|-------------|
| `stash` | — | View stash contents and weight |
| `store <item>` | — | Place item into stash |
| `take <item>` | — | Equip item from stash into active slots |
| `board` | — | Access the Expedition Board |
| `enter <zone-name>` | — | Enter a zone listed on the Expedition Board |

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
