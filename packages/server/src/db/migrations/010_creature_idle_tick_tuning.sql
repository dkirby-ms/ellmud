-- 010_creature_idle_tick_tuning.sql — Increase creature idle tick times by 10x.
-- 
-- Purpose: Reduce creature movement frequency. Creatures were patrolling every
-- 3-15 seconds. This migration increases idle tick ranges to 30-150 seconds,
-- making the world feel less chaotic and encouraging more strategic gameplay.

-- Increase all creature idle tick times by 10x to reduce movement frequency
UPDATE creature_definitions SET idle_ticks_min = idle_ticks_min * 10, idle_ticks_max = idle_ticks_max * 10;
