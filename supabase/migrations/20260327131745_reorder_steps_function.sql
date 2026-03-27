-- Create a function to reorder route steps atomically
-- This avoids UNIQUE constraint conflicts by doing all updates in one transaction

CREATE OR REPLACE FUNCTION reorder_route_steps(
  step_updates jsonb[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  step_update jsonb;
BEGIN
  -- Temporarily set all step_order values to negative to avoid conflicts
  FOREACH step_update IN ARRAY step_updates
  LOOP
    UPDATE route_steps
    SET step_order = -1 - (step_update->>'step_order')::integer
    WHERE id = (step_update->>'id')::uuid;
  END LOOP;

  -- Now set them to their final positive values
  FOREACH step_update IN ARRAY step_updates
  LOOP
    UPDATE route_steps
    SET step_order = (step_update->>'step_order')::integer
    WHERE id = (step_update->>'id')::uuid;
  END LOOP;
END;
$$;
