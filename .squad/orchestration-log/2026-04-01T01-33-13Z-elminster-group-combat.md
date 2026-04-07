# Orchestration Log: Elminster (Group Combat)

**Agent:** Elminster (Lead/Architect)  
**Task:** Updated GDD §6 for 20-player group combat, threat/aggro system, loot distribution  
**Status:** Completed  
**Timestamp:** 2026-04-01T01:33:13Z  

## Deliverable

Updated GDD.md sections:
- **§6.2 Group Combat** — Groups of 20, same-room spawning, persistent across transitions
- **§6.3 New Ability Types** — AoE (70% damage scaling), group buffs, group heals, taunts
- **§6.4 Group Frames** — Compact party display, threat-sorted, scrollable enemy list
- **§6.5 Group Telegraphs** — Room-wide AoE, targeted, cleave/cone mechanics
- **§6.6 Narration at Scale** — Micro-batching, kill attribution, verbosity filtering
- **§6.10 Threat & Aggro** — Threat tables, creature targeting, skill multipliers
- **§8.5 Group System** — Formation, loot distribution modes, friendly fire protection

## Decision Files

- `.squad/decisions/inbox/elminster-group-combat.md` — Full specification with design constraints and playtesting questions
- User directive in `.squad/decisions/inbox/copilot-directive-2026-04-01T010720.md`

## Cross-References

Updated 7 cross-references in GDD:
- §5.2 (Tick Model) — group frame resolution
- §6.1–§6.10 (Combat sections) — intra-section references
- §8.3 (PvP) — group combat rules apply in PvP
- §17 (Roadmap) — Phase 1 notes 20-player groups
