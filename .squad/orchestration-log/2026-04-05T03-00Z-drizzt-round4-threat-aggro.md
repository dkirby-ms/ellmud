# 2026-04-05T03:00Z — Threat/Aggro System (Issue #281)

| Field | Value |
|-------|-------|
| **Agent routed** | Drizzt (Engine Developer) |
| **Why chosen** | Game engine specialist; owns creature AI and combat encounter flow; responsible for multi-target mechanics |
| **Mode** | sync |
| **Why this mode** | Complex creature behavior system; multiple test edge cases require validation before submission |
| **Files authorized to read** | GDD.md §5.4 (threat/aggro spec), CombatState.ts, creature templates, encounter flow tests |
| **File(s) agent must produce** | ThreatTable class, damage-based threat scoring, target selection logic, cleanup on flee/death, tests, branch push, PR #297 |
| **Outcome** | Completed — ThreatTable class, damage-based threat generation, creature target selection (primary/secondary), cleanup on death/flee. Some test edge cases remain. PR #297 opened. |

---

## Summary

Implemented threat/aggro system per GDD §5.4: ThreatTable tracks damage-based threat per creature, creatures select targets by highest threat (with primary/secondary fallback), threat accumulates across multiple attackers. Cleanup logic removes deceased/fled targets from tables. 27 tests written; some edge cases (threat reset on flee, multi-turn threat decay) remain for refinement. Branch pushed, PR #297 opened. Will integrate with Jarlaxle's ability system in next phase (Heavy Strike generates more threat).
