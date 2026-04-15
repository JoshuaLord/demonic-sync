-- Drop the unique constraint on (room_id, step_order).
-- It causes constraint violations during concurrent insert+reorder
-- and is not required (ordering is managed by application logic).
ALTER TABLE route_steps
  DROP CONSTRAINT IF EXISTS route_steps_room_id_step_order_key;

-- Drop both overloads of the reorder RPC function.
-- Replaced by individual PostgREST updates that reliably trigger Realtime events.
DROP FUNCTION IF EXISTS reorder_route_steps(jsonb[]);
DROP FUNCTION IF EXISTS reorder_route_steps(uuid, jsonb[]);
