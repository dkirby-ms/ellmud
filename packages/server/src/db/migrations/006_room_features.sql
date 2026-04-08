-- 006_room_features.sql — Add features column to zone_rooms (Issue #345).
-- Room features are examinable objects players can inspect via "look <target>".

ALTER TABLE zone_rooms
  ADD COLUMN features JSONB NOT NULL DEFAULT '[]';

-- Seed: A note pinned to the wall in the Temple of Midgaard.
-- The temple description already mentions "ancient wall paintings" on the walls.
UPDATE zone_rooms SET features = '[
  {
    "id": "wall-paintings",
    "keywords": ["paintings", "wall paintings", "ancient paintings"],
    "name": "ancient wall paintings",
    "description": "The wall paintings depict scenes of Gods battling giants across a stormy sky. Odin stands at the centre, one-eyed and grim, flanked by Thor with his hammer raised. Beneath them, peasants toil in fields that stretch to the edges of the frame. The colours have faded but the artistry endures.",
    "type": "examinable"
  }
]'::jsonb
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'midgaard')
  AND slug = 'the-temple-of-midgaard';

-- Seed: A sign on the bar in the Grunting Boar Inn.
-- The bar description mentions "A small sign with big letters is fastened to the bar."
UPDATE zone_rooms SET features = '[
  {
    "id": "bar-sign",
    "keywords": ["sign", "small sign", "bar sign"],
    "name": "a small sign",
    "description": "The sign reads in bold, uneven letters: \"NO FIGHTING. NO SPELLCASTING. NO EXCEPTIONS. — The Management.\" Beneath it, someone has scratched: \"Good luck enforcing that.\"",
    "type": "readable"
  }
]'::jsonb
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'midgaard')
  AND slug = 'the-bar-of-the-grunting-boar-inn';
