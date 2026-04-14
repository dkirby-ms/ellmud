# Combat Stat System — Phase 1 Implementation Plan

## Problem
The combat stat system is cobbled together: players have no stat persistence (hardcoded DEFAULT_PLAYER_STATS forever), equipment bonuses are never applied, and stats like `defence` exist but are unused. The stat model needs to be clear, meaningful, and consistent between players and creatures.

## Design Decisions (Locked)
1. **Weapon-type skills** replace single `attack`: unarmed, oneHanded, twoHanded, ranged
2. **Both players AND creatures** have weapon-type skills (creatures can equip gear)
3. **Shield block is BINARY** — successful block nullifies the attack (0 damage), `shieldBlock` stat = block chance (like dodge)
4. **Shields use offhand slot** — competes with dual-wield/2H weapons
5. **Unarmed = pure skill** — no phantom "Fists" weapon, attack = unarmed skill only
6. **Agility REMOVED** — dodge stat alone handles avoidance
7. **Resolution order**: Dodge check → Shield block check → Damage (armour reduction)
8. **Skill growth deferred** to Phase 2

## Final Stat Model

### Player Stats (8 stats)
maxHp, unarmed, oneHanded, twoHanded, ranged, shieldBlock, dodge, armour

### Creature Stats (same as players — they can equip gear)
maxHp, unarmed, oneHanded, twoHanded, ranged, shieldBlock, dodge, armour

### Three Layers
1. Template (immutable starting values)
2. Base (persistent, grows through usage — Phase 2)
3. Effective (base + equipment bonuses)

## Work Items

### 1. DB Schema (Drizzt) — `db-schema`
- Migration: add weapon skills + dodge + armour + max_hp to `characters` (NO agility)
- Migration: update `creature_definitions` — add weapon skills, dodge, remove single attack reliance
- Update CharacterRepository to read/write new columns
- Update ContentRegistry to load new creature columns
- Populate creature dodge_skill_rank with varied values

### 2. Combat System (Jarlaxle) — `combat-system`
- TypeScript types: PlayerCombatStats, CreatureCombatStats (NO agility)
- Updated Combatant interface with shieldBlock, NO agility
- createCombatant() with new signature
- calculateEquipmentBonuses()
- calculatePlayerEffectiveStats()
- Binary shield block: chance-based roll, nullifies on success
- Dodge formula: remove AGI term, use dodge stat only
- Update ZoneRoom registration flow + attack handler

### 3. Frontend Stats Display (Regis) — `frontend-stats`
- Add combat stats to Character tab in StatusPanel
- Show: weapon skills, dodge, shieldBlock, armour, maxHp

### 4. Tests (Minsc) — `tests`
- calculateEquipmentBonuses() tests
- calculatePlayerEffectiveStats() tests
- Binary shield block tests
- Updated dodge formula tests
- Weapon-type skill selection tests
