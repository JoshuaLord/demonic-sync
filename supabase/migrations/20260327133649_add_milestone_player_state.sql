-- Add milestone_player_state column to rooms table
-- Stores checkbox state for each milestone per player
-- Format: {"relic_t2": {"p1": true, "p2": false}, "area_u1": {"p1": true}}

ALTER TABLE rooms
ADD COLUMN milestone_player_state JSONB DEFAULT '{}'::jsonb;
