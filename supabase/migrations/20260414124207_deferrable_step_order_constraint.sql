-- Make the step_order unique constraint deferrable so reorder can happen in a single pass.
-- With INITIALLY DEFERRED, the constraint is only checked at COMMIT, not per-row.
-- This eliminates the two-pass negative-parking hack that caused orphaned negative step_order values.

ALTER TABLE route_steps
  DROP CONSTRAINT route_steps_room_id_step_order_key;

ALTER TABLE route_steps
  ADD CONSTRAINT route_steps_room_id_step_order_key
  UNIQUE (room_id, step_order)
  DEFERRABLE INITIALLY DEFERRED;

-- Simplify the reorder function to a single UPDATE (no more negative parking)
CREATE OR REPLACE FUNCTION reorder_route_steps(
  p_room_id uuid,
  step_updates jsonb[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE route_steps rs
  SET step_order = (su->>'step_order')::integer
  FROM unnest(step_updates) AS su
  WHERE rs.id = (su->>'id')::uuid
    AND rs.room_id = p_room_id;
END;
$$;
