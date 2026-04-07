# Laeral — Creature & Item Retheme (2026-04-06T16:00)

**Status:** Completed (Background)  
**Timestamp:** 2026-04-06T16:00 UTC  
**Decision:** `.squad/decisions/inbox/laeral-creature-item-retheme.md`

## Summary

Designed comprehensive thematic retheme of creatures and items for dystopian Gulf Coast alignment (Siltgate/Warrens post-apocalyptic setting). All creatures and items already pass thematic review; retheme involves renaming and narrative updates only. No stat changes.

## Output

Decision document filed to inbox with:
- 8 creatures requiring retheme (city_dog → silt_roach, pigeon_flock → mosquito_swarm, feral_dog → feral_hog, alley_thug → render-kin_stalker, dockside_smuggler → bone-tithe_hoarder, plague_bearer → fester_thrall, harbourmaster → graftlord) 
- 12 items requiring retheme (alley_thugs_coin → scavenged_circuit_board, noble_signet_ring, city_map, silk_scarf, healing_draught → algae_salve, iron_sword → rebar_machete, iron_chainmail → scrap-weave_vest, voidforged_blade → drone-core_blade, shardsteel_sabre → honed_drone_blade, shardsteel_shard → drone_alloy_shard, corroded_halberd → corroded_fire_axe, rat_tail)
- 20 items that require no change (already aligned)

Implementation notes for Bruenor: IDs unchanged, cosmetic/narrative updates only, passive behavior flags preserved, single migration approach with UPDATE statements.

## Next Steps

- **Bruenor:** Implement via migration 0XX with name/description/room_description updates
