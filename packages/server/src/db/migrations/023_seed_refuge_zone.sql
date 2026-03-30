-- Migration 031: Seed the Refuge as the first hand-crafted zone.
-- Hub-and-spoke layout centered on the hearth with 7 navigable rooms.

WITH refuge AS (
  INSERT INTO zones (slug, name, description, tier, biome, lifecycle, category, max_players, pvp_enabled, repop_interval_seconds, entry_room_slugs)
  VALUES (
    'the-refuge',
    'The Refuge',
    'A battered sanctuary carved from the ruins of a collapsed shard. The last safe haven for those who dare the rifts.',
    1,
    'flooded_crypt',
    'persistent',
    'hub',
    0,
    false,
    0,
    ARRAY['hearth']
  )
  RETURNING id
),
rooms_insert AS (
  INSERT INTO zone_rooms (zone_id, slug, name, description, type)
  SELECT refuge.id, v.slug, v.name, v.description, v.type
  FROM refuge, (VALUES
    ('hearth',           'The Hearth',         'A broad stone chamber warmed by a perpetual fire. Scarred adventurers rest on makeshift benches. The air smells of ash and iron.',   'entry'),
    ('stash-alcove',     'Stash Alcove',       'A narrow alcove lined with locked chests and hanging satchels. Your belongings are here — what you''ve kept from the shards.',       'corridor'),
    ('training-grounds', 'Training Grounds',   'A cleared space where weapons ring against practice dummies. Scratched tally marks cover the walls.',                               'corridor'),
    ('shardboard',       'The Shardboard',     'A massive board of pinned notes, sketched maps, and shard coordinates. This is where expeditions begin.',                           'corridor'),
    ('market',           'The Market',         'Makeshift stalls selling salvaged goods. A gruff quartermaster eyes your coin pouch.',                                              'corridor'),
    ('infirmary',        'The Infirmary',      'Cots and bandages. A healer tends to the wounded. The smell of poultice lingers.',                                                  'corridor'),
    ('war-room',         'The War Room',       'A locked chamber where faction leaders meet. Maps of known shards cover the walls.',                                                'corridor')
  ) AS v(slug, name, description, type)
)
INSERT INTO zone_exits (zone_id, from_room_slug, direction, to_room_slug)
SELECT refuge.id, v.from_slug, v.direction, v.to_slug
FROM refuge, (VALUES
  -- hearth ↔ stash-alcove (east/west)
  ('hearth',           'east',  'stash-alcove'),
  ('stash-alcove',     'west',  'hearth'),
  -- hearth ↔ training-grounds (north/south)
  ('hearth',           'north', 'training-grounds'),
  ('training-grounds', 'south', 'hearth'),
  -- hearth ↔ shardboard (west/east)
  ('hearth',           'west',  'shardboard'),
  ('shardboard',       'east',  'hearth'),
  -- hearth ↔ market (south/north)
  ('hearth',           'south', 'market'),
  ('market',           'north', 'hearth'),
  -- market ↔ infirmary (east/west)
  ('market',           'east',  'infirmary'),
  ('infirmary',        'west',  'market'),
  -- training-grounds ↔ war-room (east/west)
  ('training-grounds', 'east',  'war-room'),
  ('war-room',         'west',  'training-grounds')
) AS v(from_slug, direction, to_slug);
