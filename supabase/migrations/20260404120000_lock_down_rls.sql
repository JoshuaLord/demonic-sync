-- Security: Remove permissive write policies for rooms and route_steps.
-- All writes now go through server-side API routes using the service role key,
-- which bypasses RLS. The anon key can only SELECT (read).

DROP POLICY IF EXISTS "Allow all writes" ON rooms;
DROP POLICY IF EXISTS "Allow all writes" ON route_steps;

-- The existing "Public read access" SELECT policies remain untouched:
-- rooms: "Public read access" FOR SELECT USING (true)
-- route_steps: "Public read access" FOR SELECT USING (true)

-- Fix reorder_route_steps RPC: scope UPDATE to the correct room_id
-- to prevent cross-room step manipulation.
CREATE OR REPLACE FUNCTION reorder_route_steps(
  p_room_id uuid,
  step_updates jsonb[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  step_update jsonb;
BEGIN
  -- Move ALL steps in the room to negative values to clear the unique constraint space
  UPDATE route_steps
  SET step_order = -1000000 - step_order
  WHERE room_id = p_room_id;

  -- Now set the specified steps to their final positive values,
  -- scoped to the correct room to prevent cross-room manipulation
  FOREACH step_update IN ARRAY step_updates
  LOOP
    UPDATE route_steps
    SET step_order = (step_update->>'step_order')::integer
    WHERE id = (step_update->>'id')::uuid
      AND room_id = p_room_id;
  END LOOP;
END;
$$;
