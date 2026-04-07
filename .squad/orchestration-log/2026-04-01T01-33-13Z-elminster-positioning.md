# Orchestration Log: Elminster (Room Positioning)

**Agent:** Elminster (Lead/Architect)  
**Task:** Added §6.11 Room Positioning (Front/Flank/Rear) to GDD, updated 7 cross-references  
**Status:** Completed  
**Timestamp:** 2026-04-01T01:33:13Z  

## Deliverable

Added GDD.md section:
- **§6.11 Room Positioning** — Three-zone position system (Front, Flank, Rear) with tactical mechanics

Updated GDD sections:
- **§6.2 Combat Flow** — Position resolution added as step 1
- **§6.3 Abilities** — Melee/ranged position requirements, AoE zone targeting
- **§6.4 Combat HUD** — Position badges, zone selector buttons
- **§6.5 Enemy Telegraphs** — Zone-based cleave/cone warnings
- **§6.10 Threat & Aggro** — Reachable target mechanic
- **§8.3 PvP Combat Flow** — Positioning applies in PvP

## Key Mechanics

- **Three zones:** Front (melee tank position), Flank (+15% damage vs front-focused targets), Rear (melee invalid, healers/ranged safe)
- **Repositioning:** Costs a tick's action + 3-tick cooldown
- **Threat:** "Highest-threat *reachable* target" — melee creatures can only reach Front/Flank from their position
- **AI types:** Aggressive (creatures chase unreachable targets), Steady (attack highest-threat reachable), Bosses (ignore position)
- **Solo unaffected:** Default position Front; solo players with no `position` command see zero difference

## Decision Files

- `.squad/decisions/inbox/elminster-room-positioning.md` — Full specification with design rationale
- User directive in `.squad/decisions/inbox/copilot-directive-2026-04-01T010858.md`

## Schema Impact

- Creature data needs `default_position` and `position_ai` fields
- Combat tick loop gains position resolution step
