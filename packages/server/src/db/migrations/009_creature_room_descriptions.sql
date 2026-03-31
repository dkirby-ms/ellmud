-- Migration 009: Add room_description column to creature_definitions
-- Room descriptions are short atmospheric sentences shown when entering a room.

ALTER TABLE creature_definitions ADD COLUMN room_description TEXT;

-- Seed room descriptions for all existing creatures
UPDATE creature_definitions SET room_description = 'A drowned revenant sways in the murk, waterlogged limbs dragging.' WHERE type = 'drowned_revenant';
UPDATE creature_definitions SET room_description = 'A gutterspawn crouches in the filth, eyes glinting.' WHERE type = 'gutterspawn';
UPDATE creature_definitions SET room_description = 'A rubble scavenger picks through debris with twitching claws.' WHERE type = 'rubble_scavenger';
UPDATE creature_definitions SET room_description = 'A hollow stalker drifts in the shadows, barely visible.' WHERE type = 'hollow_stalker';
UPDATE creature_definitions SET room_description = 'The Collapsed One looms here, stone and flesh fused into one.' WHERE type = 'the_collapsed_one';
UPDATE creature_definitions SET room_description = 'A slum rat sniffs along the ground.' WHERE type = 'slum_rat';
UPDATE creature_definitions SET room_description = 'A sewer lurker clings to the damp wall.' WHERE type = 'sewer_lurker';
UPDATE creature_definitions SET room_description = 'A city dog lounges in a patch of dust.' WHERE type = 'city_dog';
UPDATE creature_definitions SET room_description = 'A flock of pigeons pecks at crumbs on the flagstones.' WHERE type = 'pigeon_flock';
UPDATE creature_definitions SET room_description = 'A feral dog watches from a doorway, hackles raised.' WHERE type = 'feral_dog';
UPDATE creature_definitions SET room_description = 'An alley thug leans against the wall, eyeing passersby.' WHERE type = 'alley_thug';
UPDATE creature_definitions SET room_description = 'A dockside smuggler loiters near the quay, hands in pockets.' WHERE type = 'dockside_smuggler';
UPDATE creature_definitions SET room_description = 'A silt serpent coils in the shallow water, barely disturbing the surface.' WHERE type = 'silt_serpent';
UPDATE creature_definitions SET room_description = 'A plague bearer shuffles through, wrapped in stained rags.' WHERE type = 'plague_bearer';
UPDATE creature_definitions SET room_description = 'The Harbourmaster stands at the dock, ledger in hand.' WHERE type = 'the_harbourmaster';
