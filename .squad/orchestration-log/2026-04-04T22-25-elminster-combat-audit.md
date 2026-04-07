# Orchestration Log: Elminster (Lead)
**Timestamp:** 2026-04-04T22:25:00Z  
**Agent:** Elminster  
**Mode:** background  
**Task:** Combat GDD vs codebase audit  
**Status:** Complete

## Input
- GDD §6 (Combat System) full specification
- Codebase audit of combat implementation across all packages
- 11 subsections evaluated: §6.1–§6.11

## Scope
Systematic audit of GDD §6 against codebase to identify implementation gaps, design divergences, and architectural strengths. Output: Prioritized issue backlog with dependency analysis.

## Key Findings

### Implementation Status
| GDD Section | Status | Issue |
|---|---|---|
| §6.1 Combat Overview | Partially Implemented | #278 |
| §6.2 Combat Flow | Partially Implemented | #278, #285 |
| §6.3 Abilities & Cooldowns | Not Implemented | #279 |
| §6.4 Combat HUD | Partially Implemented | #284 |
| §6.5 Enemy Telegraphs | Not Implemented | #280 |
| §6.6 Combat Narration | Partially Implemented | #283 |
| §6.7 Meaningful Death | Divergent (codebase has DowningSystem) | #286 |
| §6.8 Death & Corpse System | Implemented | — |
| §6.9 Equipment Loss | Design Space (not expected) | — |
| §6.10 Threat & Aggro System | Not Implemented | #281 |
| §6.11 Room Positioning | Not Implemented (GDD: Planned) | #282 |

### Architectural Insights
1. **CombatSystem.resolveTick() is well-structured for extension.** The tick phases (default actions → damage calc → apply → flee → defeated → end check) map cleanly to the GDD tick loop. Adding abilities, threat, and positioning will extend these phases rather than replacing them.

2. **Simultaneous damage resolution is correct.** All damage calculated from start-of-tick HP, applied at once. This matches the GDD determinism requirement and is the right foundation for group combat scaling.

3. **DowningSystem is a net positive divergence.** GDD §6.7 says "no downed state" but the DowningSystem creates meaningful group rescue dynamics. Recommendation: update GDD, don't remove the system.

4. **Creature AI targeting is the most impactful gap.** Creatures targeting `playersHere[0]` makes group combat meaningless — threat tables (#281) should be high priority.

### Suggested Implementation Order
1. #278 Auto-attack baseline — foundational
2. #279 Abilities & cooldowns — unlocks tactical depth
3. #281 Threat system — enables meaningful group combat
4. #280 Enemy telegraphs — requires abilities for defensive reactions
5. #285 Flee skill check — small, independent
6. #283 Signal classification — improves readability, independent
7. #284 Combat HUD — client work, blocked on several server systems
8. #282 Room positioning — largest feature, depends on threat + abilities
9. #286 GDD alignment — documentation, can happen anytime

## Output
- 9 GitHub issues created (#278-#286) with full acceptance criteria and GDD references
- All issues labeled `squad` for tracking
- Dependency graph embedded in issue descriptions
- No duplication with existing issues (#32, #161, #167, #277)
- DowningSystem positive divergence decision documented for GDD update

## Impact
- **All agents:** 9 new combat domain issues in backlog
- **Drizzt (Engine Dev):** Primary assignee for server combat systems
- **Regis (Frontend Dev):** Primary assignee for client HUD and narration
- **GDD:** Requires update for DowningSystem documentation (#286)
