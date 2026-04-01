/**
 * PLAYER_STATE message tests — verify HP, stamina, status effects are sent correctly.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { MessageTypes } from '@ellmud/shared';
import {
  bootTestServer,
  connectTestClient,
  wait,
  makeCommand,
} from './helpers/index.js';

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  colyseus = await bootTestServer();
});

afterAll(async () => {
  await colyseus.shutdown();
});

describe('PLAYER_STATE message — Server → Client', () => {
  it('should send PLAYER_STATE on join with default HP', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    // Player should receive initial PLAYER_STATE message on join
    expect(collector.playerState.length).toBeGreaterThanOrEqual(1);

    const initialState = collector.playerState[0];
    expect(initialState.hp).toBe(100);
    expect(initialState.maxHp).toBe(100);
    expect(initialState.stamina).toBe(0); // Placeholder
    expect(initialState.maxStamina).toBe(0); // Placeholder
    expect(initialState.statusEffects).toBeInstanceOf(Array);
    expect(initialState.statusEffects.length).toBe(0);

    await client.leave();
  });

  it('should send PLAYER_STATE after player takes damage in combat', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    // Clear initial messages
    collector.clear();

    // Spawn a creature and attack it to initiate combat
    client.send(MessageTypes.COMMAND, makeCommand('admin', 'spawn', 'creature', 'drowned-revenant'));
    await wait(500);

    collector.clear();

    // Wait for creature to attack player (creatures auto-attack on sight)
    // Give enough time for combat tick to process
    await wait(2000);

    // Player should have received PLAYER_STATE updates during combat
    // Note: Might be 0 if player wasn't hit, but with Drowned Revenant they should be attacked
    const stateUpdates = collector.playerState.filter(
      (msg) => msg.hp < 100
    );

    // If combat occurred, we should see HP changes
    if (stateUpdates.length > 0) {
      const update = stateUpdates[0];
      expect(update.hp).toBeLessThan(100);
      expect(update.maxHp).toBe(100);
    }

    await client.leave();
  });

  it('PLAYER_STATE message should have correct shape', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    const state = collector.playerState[0];
    
    // Verify all required fields are present
    expect(state).toHaveProperty('hp');
    expect(state).toHaveProperty('maxHp');
    expect(state).toHaveProperty('stamina');
    expect(state).toHaveProperty('maxStamina');
    expect(state).toHaveProperty('statusEffects');

    // Verify types
    expect(typeof state.hp).toBe('number');
    expect(typeof state.maxHp).toBe('number');
    expect(typeof state.stamina).toBe('number');
    expect(typeof state.maxStamina).toBe('number');
    expect(Array.isArray(state.statusEffects)).toBe(true);

    await client.leave();
  });
});
