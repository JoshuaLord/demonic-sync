-- Update Medium tasks from 40 points to 30 points
-- Step 1: Drop the old CHECK constraint first
ALTER TABLE official_tasks
DROP CONSTRAINT IF EXISTS official_tasks_points_check;

-- Step 2: Update all existing Medium tier tasks to 30 points
UPDATE official_tasks
SET points = 30
WHERE tier = 'Medium' AND points = 40;

-- Step 3: Add new CHECK constraint with updated point values
ALTER TABLE official_tasks
ADD CONSTRAINT official_tasks_points_check
CHECK (points IN (10, 30, 80, 200, 400));
