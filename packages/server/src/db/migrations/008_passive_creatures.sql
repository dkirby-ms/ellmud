-- 008_passive_creatures.sql — Add aggressive flag for passive wildlife.

-- Add aggressive column to creature_definitions (defaults to true for backward compatibility)
ALTER TABLE creature_definitions 
ADD COLUMN aggressive BOOLEAN NOT NULL DEFAULT true;

-- Mark city wildlife as non-aggressive
UPDATE creature_definitions 
SET aggressive = false 
WHERE type IN ('pigeon_flock', 'city_dog');
