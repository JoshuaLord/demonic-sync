-- Remap old route_steps and cleanup
-- Step 3: Remap route_steps from old synthetic IDs (10001-10075) to new wiki IDs
UPDATE route_steps rs
SET task_id = nt.id
FROM official_tasks nt
WHERE rs.task_id BETWEEN 10001 AND 10075
  AND nt.league = 'demonic'
  AND nt.id BETWEEN 100000 AND 199999
  AND LOWER(TRIM(rs.task_name)) = LOWER(TRIM(nt.name));
-- Step 4: Remove old synthetic pact tasks (IDs 10001-10075)
DELETE FROM official_tasks WHERE id BETWEEN 10001 AND 10075;

-- Step 5: Re-enable RLS
ALTER TABLE official_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_steps ENABLE ROW LEVEL SECURITY;
