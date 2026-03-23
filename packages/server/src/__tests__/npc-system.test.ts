import { describe, it, expect, beforeEach } from 'vitest';
import { NPCSystem, NPC_IDLE_INTERVAL, type NPCEvent } from '../systems/NPCSystem.js';
import type { NPCDefinition } from '@ellmud/shared';

const TEST_NPCS: NPCDefinition[] = [
  {
    id: 'merchant-a',
    name: 'Merchant A',
    role: 'merchant',
    patrolRoute: ['loc-1', 'loc-2', 'loc-3'],
    idleActions: ['polishes wares', 'counts coins'],
    patrolInterval: 3,
  },
  {
    id: 'faction-rep-b',
    name: 'Faction Rep B',
    role: 'faction_rep',
    patrolRoute: ['council-hall'],
    idleActions: ['reads a scroll', 'paces slowly'],
    patrolInterval: 0,
  },
  {
    id: 'refugee-c',
    name: 'a weary refugee',
    role: 'refugee',
    patrolRoute: ['gate', 'plaza', 'camp'],
    idleActions: ['sits by the fire'],
    patrolInterval: 5,
  },
];

describe('NPCSystem', () => {
  let system: NPCSystem;
  let rngValue: number;

  beforeEach(() => {
    rngValue = 0.5;
    system = new NPCSystem(TEST_NPCS, () => rngValue);
  });

  describe('initialization', () => {
    it('should create NPC states for all definitions', () => {
      const all = system.getAllNPCs();
      expect(all).toHaveLength(3);
    });

    it('should place merchants at first patrol location', () => {
      const merchant = system.getNPC('merchant-a');
      expect(merchant).toBeDefined();
      expect(merchant!.currentLocation).toBe('loc-1');
      expect(merchant!.isPresent).toBe(true);
    });

    it('should place faction reps at their location', () => {
      const rep = system.getNPC('faction-rep-b');
      expect(rep!.currentLocation).toBe('council-hall');
      expect(rep!.isPresent).toBe(true);
    });

    it('should start refugees as not present', () => {
      const refugee = system.getNPC('refugee-c');
      expect(refugee!.isPresent).toBe(false);
    });
  });

  describe('patrol movement', () => {
    it('should move merchant along patrol route', () => {
      // patrolInterval is 3, so move on tick 3
      let events: NPCEvent[] = [];
      for (let i = 0; i < 3; i++) events = system.tick();

      const moveEvent = events.find(e => e.type === 'move' && e.npcId === 'merchant-a');
      expect(moveEvent).toBeDefined();
      expect(moveEvent!.location).toBe('loc-2');
      expect(moveEvent!.previousLocation).toBe('loc-1');
    });

    it('should cycle patrol route', () => {
      // Move 3 times: loc-1 → loc-2 → loc-3 → loc-1
      for (let i = 0; i < 9; i++) system.tick();
      const merchant = system.getNPC('merchant-a');
      expect(merchant!.currentLocation).toBe('loc-1');
    });

    it('should not move faction reps (patrolInterval 0)', () => {
      const allEvents: NPCEvent[] = [];
      for (let i = 0; i < 10; i++) allEvents.push(...system.tick());
      const repMoves = allEvents.filter(e => e.type === 'move' && e.npcId === 'faction-rep-b');
      expect(repMoves).toHaveLength(0);
    });
  });

  describe('idle actions', () => {
    it('should emit idle actions at NPC_IDLE_INTERVAL', () => {
      const allEvents: NPCEvent[] = [];
      for (let i = 0; i < NPC_IDLE_INTERVAL; i++) allEvents.push(...system.tick());
      const idles = allEvents.filter(e => e.type === 'idle');
      // At least merchant and faction rep should produce idle actions
      expect(idles.length).toBeGreaterThanOrEqual(2);
    });

    it('should include idle action text from definitions', () => {
      const allEvents: NPCEvent[] = [];
      for (let i = 0; i < NPC_IDLE_INTERVAL; i++) allEvents.push(...system.tick());
      const merchantIdle = allEvents.find(e => e.type === 'idle' && e.npcId === 'merchant-a');
      expect(merchantIdle).toBeDefined();
      expect(['polishes wares', 'counts coins']).toContain(merchantIdle!.idleAction);
    });
  });

  describe('refugee lifecycle', () => {
    it('should arrive when rng is below threshold', () => {
      // Refugee arrivalChance is 0.02
      rngValue = 0.01;
      const events = system.tick();
      const arrival = events.find(e => e.type === 'arrive' && e.npcId === 'refugee-c');
      expect(arrival).toBeDefined();
      expect(arrival!.npcName).toBe('a weary refugee');
    });

    it('should depart when at end of route and rng is below threshold', () => {
      // Spawn refugee, move to end of route
      system.spawnRefugee('refugee-c');
      const refugee = system.getNPC('refugee-c')!;
      refugee.patrolIndex = 2; // last position (camp)
      refugee.currentLocation = 'camp';

      rngValue = 0.005; // below departureChance of 0.01
      const events = system.tick();
      const departure = events.find(e => e.type === 'depart');
      expect(departure).toBeDefined();
      expect(refugee.isPresent).toBe(false);
    });

    it('should allow manual spawn/despawn', () => {
      system.spawnRefugee('refugee-c');
      expect(system.getNPC('refugee-c')!.isPresent).toBe(true);

      system.despawnRefugee('refugee-c');
      expect(system.getNPC('refugee-c')!.isPresent).toBe(false);
    });
  });

  describe('location queries', () => {
    it('should return NPCs at a specific location', () => {
      const atLoc1 = system.getNPCsAt('loc-1');
      expect(atLoc1.length).toBeGreaterThanOrEqual(1);
      expect(atLoc1.some(n => n.id === 'merchant-a')).toBe(true);
    });

    it('should not include absent NPCs', () => {
      const atGate = system.getNPCsAt('gate');
      expect(atGate.some(n => n.id === 'refugee-c')).toBe(false);
    });
  });
});
