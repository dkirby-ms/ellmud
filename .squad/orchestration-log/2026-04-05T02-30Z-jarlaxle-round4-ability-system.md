# 2026-04-05T02:30Z — Ability System: Cooldowns, Stamina, Damage Model (Issue #279)

| Field | Value |
|-------|-------|
| **Agent routed** | Jarlaxle (Systems Developer) |
| **Why chosen** | Combat systems owner; responsible for core game mechanics and data-driven design patterns |
| **Mode** | sync |
| **Why this mode** | Complex feature requiring comprehensive test coverage before merge; user expects ability system to be production-ready |
| **Files authorized to read** | GDD.md §6.3 (ability system spec), CombatState.ts, damage.ts, existing combat tests |
| **File(s) agent must produce** | AbilityDefinition, abilities.ts, CombatState updates, 18 tests, branch push, PR #296 |
| **Outcome** | Completed — Ability definitions, stamina tracking, cooldown system, damage multipliers. 18 tests. CombatSystem integration pending. PR #296 opened. |

---

## Summary

Implemented Phase 1 ability system per GDD §6.3: data-driven ability definitions (Heavy Strike, Block, Observe), cooldown tracking (Map-based, decrements at tick start), stamina costs (optional fields on Combatant), and damage multipliers (separate from stance multipliers). All 18 tests pass. CombatSystem.validateAbilityAction() and CombatSystem.updateCooldowns() integration pending in next PR. Coordinated with Drizzt on threat/aggro system (both modify combat state).
