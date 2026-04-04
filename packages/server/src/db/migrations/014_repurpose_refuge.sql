-- 014_repurpose_refuge.sql — Repurpose Refuge as designer/debug hub.
-- Matches the seed-file change in 003_seed_zones.sql for existing databases.

UPDATE zones
SET category    = 'dev',
    description = 'A pocket dimension maintained by the designers. Test dummies, debug consoles, and prototype systems fill the crumbling halls. Unaffiliated shardwalkers awaken here.'
WHERE slug = 'the-refuge';
