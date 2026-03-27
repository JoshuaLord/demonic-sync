-- Add columns to store task data directly in route_steps
-- This eliminates the need for JOINs and makes real-time updates simpler

ALTER TABLE route_steps
ADD COLUMN task_name TEXT,
ADD COLUMN task_description TEXT,
ADD COLUMN task_tier TEXT,
ADD COLUMN task_points INTEGER,
ADD COLUMN task_region TEXT;

-- Drop the foreign key since we're copying data instead of referencing
ALTER TABLE route_steps
DROP CONSTRAINT IF EXISTS route_steps_task_id_fkey;
