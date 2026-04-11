-- 015_container_properties.sql — Add container_properties column and seed all container items.

-- Add container_properties JSONB column to item_definitions
ALTER TABLE item_definitions ADD COLUMN container_properties JSONB DEFAULT NULL;

-- Insert all 9 container items (3 existing + 6 new from PR #430)
INSERT INTO item_definitions (id, name, type, tier, base_stats, base_durability, weight, description, soulbound, stackable, max_stack, status, container_properties) VALUES
  -- ─── Existing Containers ──────────────────────────────────────────────────
  ('tattered_satchel',       'Tattered Satchel',              'container', 'scrap',      '{}', NULL, 1,   'A worn leather satchel with fraying straps. Holds a few small items.', false, false, 1, 'published', '{"maxSlots":4,"maxWeight":10}'),
  ('expedition_pack',        'Expedition Pack',               'container', 'common',     '{}', NULL, 2,   'A sturdy canvas pack issued to expeditioners. Increases carrying capacity.', false, false, 1, 'published', '{"maxSlots":8,"maxWeight":30,"carryBonus":5}'),
  ('apothecary_pouch',       'Apothecary''s Pouch',           'container', 'sturdy',     '{}', NULL, 0.5, 'A small padded pouch designed for carrying potions and salves safely.', false, false, 1, 'published', '{"maxSlots":6,"maxWeight":8,"allowedItemTypes":["consumable"]}'),
  
  -- ─── New Containers (PR #430) ─────────────────────────────────────────────
  ('munitions_wrap',         'Munitions Wrap',                'container', 'sturdy',     '{}', NULL, 1,   'A length of oiled canvas, rolled tight and cinched with copper wire. Keeps blades dry and edges true.', false, false, 1, 'published', '{"maxSlots":4,"maxWeight":20,"allowedItemTypes":["weapon"]}'),
  ('ironbound_coffer',       '[bold]Ironbound Coffer[reset]', 'container', 'refined',    '{}', NULL, 4,   'Heavy iron banding reinforces this salt-stained chest. Whatever it once held, it held securely. The lock has long since rusted open.', false, false, 1, 'published', '{"maxSlots":10,"maxWeight":50,"carryBonus":10}'),
  ('salvagers_haversack',    'Salvager''s Haversack',         'container', 'refined',    '{}', NULL, 2,   'Dozens of interior pockets, each sized for ore chunks and bone fragments. A salvager who knew their trade stitched this.', false, false, 1, 'published', '{"maxSlots":12,"maxWeight":25,"allowedItemTypes":["material"]}'),
  ('wardens_lockbox',        '[cyan]Warden''s Lockbox[reset]','container', 'masterwork', '{}', NULL, 3,   '[dim]Rune-etched steel, cold to the touch. The interior is lined with a material that drinks light. Whatever the wardens guarded, they guarded it well.[reset]', false, false, 1, 'published', '{"maxSlots":12,"maxWeight":60,"carryBonus":15}'),
  ('fleshknit_satchel',      '[magenta]Fleshknit Satchel[reset]','container','masterwork','{}',NULL, 1, '[dim]The leather breathes. Faintly. Stitched from something that was alive more recently than you''d like, its interior shifts to accommodate whatever you feed it.[reset]', false, false, 1, 'published', '{"maxSlots":8,"maxWeight":15,"allowedItemTypes":["consumable","key"]}'),
  ('hollow_of_the_forgotten','[bold][yellow]Hollow of the Forgotten[reset]','container','anomalous','{}',NULL, 0, '[bold]It shouldn''t be able to hold this much. The opening is no wider than your fist, yet your arm slides in to the shoulder. Things placed inside do not rattle. Things placed inside do not weigh anything at all.[reset]', false, false, 1, 'published', '{"maxSlots":16,"carryBonus":25}')

ON CONFLICT (id) DO UPDATE SET
  container_properties = EXCLUDED.container_properties,
  updated_at = now();
