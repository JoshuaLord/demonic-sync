-- Update existing routes to reflect Medium task point change from 40 to 30
-- This updates the copied task_points data in route_steps for consistency
UPDATE route_steps
SET task_points = 30
WHERE task_tier = 'Medium' AND task_points = 40;
