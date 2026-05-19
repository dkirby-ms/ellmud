<!-- markdownlint-disable-file -->

# Testing Guide

Ellmud uses two complementary testing frameworks to ensure quality: **Vitest** for unit and integration tests, and **Playwright** for end-to-end tests.

## Quick Start

Run all tests:
```bash
npm test                  # Run unit/integration tests (all workspaces)
npm run test:e2e         # Run e2e tests (requires server running)
```

Run tests for a specific package:
```bash
npm test -w @ellmud/server    # Server tests only
npm test -w @ellmud/client    # Client tests only
npm test -w @ellmud/shared    # Shared types tests
```

Run a specific test file:
```bash
npm test -- combat.test.ts    # Matches by filename
npm test -- --grep "combat"   # Matches by test name
```

## Test Structure

### Unit & Integration Tests (Vitest)

**Location:** Each package has a `__tests__` directory with test files.

```
packages/server/src/
├── __tests__/
│   ├── combat.test.ts           # Combat system tests
│   ├── auth.test.ts             # Authentication tests
│   ├── narrative.test.ts        # Narration pipeline tests
│   ├── admin.test.ts            # Admin dashboard tests
│   ├── zone-system.test.ts      # Zone and room tests
│   ├── creatures.test.ts        # Creature and AI tests
│   ├── items.test.ts            # Item and equipment tests
│   └── helpers/                 # Test utilities and fixtures
│       ├── fixtures.ts
│       ├── mock-rooms.ts
│       └── test-data.ts
```

### End-to-End Tests (Playwright)

**Location:** `packages/e2e/tests/` with subdirectories by feature.

```
packages/e2e/tests/
├── combat.spec.ts               # Combat gameplay
├── movement.spec.ts             # Navigation and zones
├── group.spec.ts                # Group formation and loot
├── follow.spec.ts               # Follow/unfollow system
├── container-inventory.spec.ts  # Stash and equipment
├── connection.spec.ts           # Server connection and auth
└── fixtures/                    # Shared test data
    └── context.ts               # Playwright context setup
```

## Writing Tests

### Unit Test Pattern (Vitest)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Combat System', () => {
  let room;
  let player;

  beforeEach(() => {
    // Setup
    room = createTestRoom();
    player = createTestPlayer({ maxHp: 100, hp: 100 });
  });

  afterEach(() => {
    // Cleanup
    room.dispose();
  });

  it('should deal damage to a creature', () => {
    const creature = room.state.creatures[0];
    const initialHp = creature.hp;

    room.onMessage('cmd', player, { verb: 'attack', args: ['creature'] });

    expect(creature.hp).toBeLessThan(initialHp);
  });

  it('should end combat when creature dies', () => {
    const creature = room.state.creatures[0];
    creature.hp = 1;  // Weakened for testing

    room.onMessage('cmd', player, { verb: 'attack', args: ['creature'] });

    expect(creature.hp).toBeLessThanOrEqual(0);
    expect(room.state.combatEncounter).toBeUndefined();
  });
});
```

### Integration Test Pattern (Vitest)

Integration tests verify multiple systems working together:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestGame, createTestPlayer } from './helpers';

describe('Combat → Loot → Stash Integration', () => {
  let game;
  let player;

  beforeEach(() => {
    game = createTestGame();
    player = createTestPlayer();
    game.addPlayer(player);
  });

  it('should award loot after defeating a creature', async () => {
    const creatureId = game.spawnCreature('goblin', 'room-1');
    
    // Player defeats creature
    while (game.state.creatures[creatureId].hp > 0) {
      game.tick();
      game.handleCommand(player, 'attack goblin');
    }

    // Verify loot dropped
    const corpse = game.findCorpse(creatureId);
    expect(corpse.items).toHaveLength(1);  // At least one item dropped

    // Verify player can loot
    game.handleCommand(player, `take ${corpse.items[0].id}`);
    expect(player.inventory).toContainEqual(expect.objectContaining({
      id: corpse.items[0].id,
    }));
  });
});
```

### E2E Test Pattern (Playwright)

E2E tests simulate real user interactions:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Player Combat', () => {
  test('should attack a creature and see narration', async ({ page }) => {
    // Navigate to zone
    await page.goto('http://localhost:3000');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button:has-text("Login")');

    // Wait for game to load
    await page.waitForSelector('[data-test="room-name"]');

    // Enter a zone with creatures
    await page.click('button:has-text("Expedition Board")');
    await page.click('button:has-text("Flooded Crypt")');

    // Find and attack a creature
    await page.fill('input[data-test="command"]', 'attack goblin');
    await page.press('input[data-test="command"]', 'Enter');

    // Verify combat narration appears
    await expect(page.locator('[data-test="narration"]')).toContainText(/goblin/i);
  });
});
```

## Test Patterns

### Mocking Colyseus Rooms

When testing server logic in isolation, mock the room:

```typescript
import { describe, it, vi } from 'vitest';
import { ZoneRoom } from '../ZoneRoom';

describe('ZoneRoom Commands', () => {
  it('should broadcast room header on entry', async () => {
    const room = new ZoneRoom();
    const broadcast = vi.spyOn(room, 'broadcast');

    await room.onCreate({ zoneId: 'crypt-1' });

    expect(broadcast).toHaveBeenCalledWith('room_header', expect.objectContaining({
      roomName: 'Flooded Crypt',
      exits: expect.arrayContaining(['north', 'south']),
    }));
  });
});
```

### Testing Message Protocol

Verify client-server communication:

```typescript
describe('Message Protocol', () => {
  it('should send narrate message after player action', async () => {
    const room = createTestRoom();
    const player = createTestPlayer();
    const sendSpy = vi.spyOn(player, 'send');

    room.onMessage('cmd', player, { verb: 'look' });

    expect(sendSpy).toHaveBeenCalledWith('narrate', expect.objectContaining({
      text: expect.stringContaining('You see'),
    }));
  });
});
```

### Fixture Pattern

Reuse test data:

```typescript
// helpers/fixtures.ts
export const PLAYER_FIXTURE = {
  id: 'player-1',
  name: 'TestHero',
  maxHp: 100,
  hp: 100,
  stats: { str: 10, agi: 10, con: 10 },
};

export const CREATURE_FIXTURE = {
  id: 'goblin-1',
  type: 'goblin',
  maxHp: 30,
  hp: 30,
  stats: { str: 8, agi: 8 },
};

// in tests:
import { PLAYER_FIXTURE, CREATURE_FIXTURE } from './helpers/fixtures';
const player = createTestPlayer(PLAYER_FIXTURE);
const creature = createTestCreature(CREATURE_FIXTURE);
```

## Running Tests

### Run All Tests

```bash
npm test
```

Output:
```
✓ packages/server/src/__tests__/combat.test.ts (12 tests)
✓ packages/server/src/__tests__/auth.test.ts (8 tests)
...
✓ packages/shared/src/__tests__/types.test.ts (4 tests)

12 passed (250ms)
```

### Run Tests in Watch Mode

Watch mode reruns tests when files change:

```bash
npm test -- --watch
```

### Run E2E Tests Only

E2E tests require the server to be running:

```bash
# Terminal 1: Start the server
npm run dev:server

# Terminal 2: Run e2e tests
npm run test:e2e
```

### Run a Specific Test File

```bash
npm test -- combat.test.ts
```

### Run Tests Matching a Pattern

```bash
npm test -- --grep "should deal damage"
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

Coverage reports are generated in `coverage/` with HTML output:
```bash
open coverage/index.html  # View in browser
```

## Coverage Goals

The project targets **80% coverage** across all metrics:

| Metric | Target | Current |
|--------|--------|---------|
| Statements | 80% | ~85% |
| Branches | 80% | ~82% |
| Functions | 80% | ~84% |
| Lines | 80% | ~85% |

View coverage thresholds in:
- `packages/server/vitest.config.ts`
- `packages/client/vitest.config.ts`

## Debugging Tests

### Run Tests with Verbose Output

```bash
npm test -- --reporter=verbose
```

### Pause in Debugger

Add a breakpoint in your test:

```typescript
it('should attack creature', () => {
  debugger;  // ← Browser will pause here
  const damage = calculateDamage(player, creature);
  expect(damage).toBeGreaterThan(0);
});
```

Run with debugger:
```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run combat.test.ts
```

Then open `chrome://inspect` in Chrome.

### Log Output During Tests

```typescript
it('should apply damage', () => {
  console.log('Player HP before:', player.hp);
  player.takeDamage(10);
  console.log('Player HP after:', player.hp);
  expect(player.hp).toBe(90);
});
```

Run with log capture:
```bash
npm test -- --reporter=verbose
```

### Inspect E2E Test Failures

Playwright records traces and screenshots on failure:

```bash
npm run test:e2e
# Failed tests generate:
# - playwright-report/index.html (clickable report)
# - trace files (replay interactions)
```

View the report:
```bash
npx playwright show-report
```

## Best Practices

### Test Names Are Specifications

Write test names that describe expected behavior:

```typescript
// ✅ Good
it('should reduce enemy HP by damage amount when attack is successful', () => {});

// ❌ Avoid
it('test attack', () => {});
```

### Test One Thing Per Test

Each test should verify one behavior:

```typescript
// ✅ Good
it('should deal damage', () => { /* ... */ });
it('should apply armor reduction', () => { /* ... */ });

// ❌ Avoid
it('should handle combat', () => {
  // Tests damage, armor, dodge, etc. together
});
```

### Use Fixtures for Setup

Reuse common test data and room setup:

```typescript
beforeEach(() => {
  room = createTestRoom();
  player = createTestPlayer();
  creature = createTestCreature();
});
```

### Assert Behavior, Not Implementation

```typescript
// ✅ Good
expect(creature.hp).toBeLessThan(initialHp);

// ❌ Avoid
expect(damageCalled).toBe(true);
```

### Keep Tests Fast

- Use in-memory data stores for unit tests
- Use test fixtures instead of generating data
- Avoid sleep/timeout delays (use fake timers instead)

```typescript
import { vi } from 'vitest';

it('should respawn after 30 seconds', async () => {
  vi.useFakeTimers();
  
  player.die();
  expect(player.status).toBe('dead');
  
  vi.advanceTimersByTime(30_000);
  expect(player.status).toBe('alive');
  
  vi.useRealTimers();
});
```

### Use Descriptive Error Messages

```typescript
// ✅ Good
expect(creature.hp).toBeLessThan(initialHp, 'Damage should reduce creature HP');

// ❌ Avoid
expect(creature.hp).toBeLessThan(initialHp);
```

## Common Test Scenarios

### Test Command Parsing

```typescript
it('should parse "attack goblin" command', () => {
  const cmd = parseCommand('attack goblin');
  expect(cmd).toEqual({ verb: 'attack', args: ['goblin'] });
});
```

### Test State Persistence

```typescript
it('should save and restore player state', async () => {
  player.inventory.add(testItem);
  await playerRepo.save(player);

  const restored = await playerRepo.get(player.id);
  expect(restored.inventory).toContainEqual(testItem);
});
```

### Test Async Operations

```typescript
it('should connect and authenticate', async () => {
  const client = new GameClient();
  await client.connect();
  const token = await client.authenticate('user', 'pass');
  expect(token).toBeDefined();
});
```

### Test Error Handling

```typescript
it('should reject invalid attack', () => {
  expect(() => {
    player.attack(null);  // Invalid target
  }).toThrow('Invalid target');
});
```

## Continuous Integration

Tests run on GitHub Actions for every commit:

```bash
npm run test:ci
```

This runs:
1. Unit tests for all packages
2. E2E tests (requires live services)
3. Protocol drift check for Unity client

See `.github/workflows/` for CI configuration.

## See Also

- **[Vitest Documentation](https://vitest.dev)** — Unit test framework
- **[Playwright Documentation](https://playwright.dev)** — E2E testing
- **[Testing Library](https://testing-library.com)** — React component testing
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** — Contribution guidelines
- **[GDD.md](../GDD.md)** — Game design (helps write behavior-driven tests)

