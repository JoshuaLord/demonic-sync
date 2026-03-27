-- Fix race condition: when multiple reorders happen concurrently, the second pass
-- (setting final positive values) can collide with step_order values from rows
-- not included in step_updates. Fix: accept room_id and set ALL steps in that
-- room to negative first, so concurrent inserts don't cause unique violations.

CREATE OR REPLACE FUNCTION reorder_route_steps(
  p_room_id uuid,
  step_updates jsonb[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  step_update jsonb;
BEGIN
  -- Move ALL steps in the room to negative values to clear the unique constraint space
  UPDATE route_steps
  SET step_order = -1000000 - step_order
  WHERE room_id = p_room_id;

  -- Now set the specified steps to their final positive values
  FOREACH step_update IN ARRAY step_updates
  LOOP
    UPDATE route_steps
    SET step_order = (step_update->>'step_order')::integer
    WHERE id = (step_update->>'id')::uuid;
  END LOOP;
END;
$$;
