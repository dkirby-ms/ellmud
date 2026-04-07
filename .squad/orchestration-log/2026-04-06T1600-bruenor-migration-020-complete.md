# Bruenor — Migration 020: Creature/Item Retheme (2026-04-06T16:00)

**Status:** Completed (Background)  
**Timestamp:** 2026-04-06T16:00 UTC  

## Summary

Built and tested migration 020 implementing creature and item retheme per Laeral's design document. All creature names, descriptions, and room descriptions updated for dystopian Gulf Coast alignment. All item name/description updates applied. IDs preserved for schema compatibility.

## Scope

- 8 creature rethemes (city_dog, pigeon_flock, feral_dog, alley_thug, dockside_smuggler, plague_bearer, harbourmaster)
- 12 item rethemes (alley_thugs_coin, noble_signet_ring, city_map, silk_scarf, healing_draught, iron_sword, iron_chainmail, voidforged_blade, shardsteel_sabre, shardsteel_shard, corroded_halberd, rat_tail)
- No schema changes, no stat changes, no loot table restructuring
- Passive behavior flags preserved on city_dog and pigeon_flock

## Next Steps

- Deploy migration 020 to staging/production
