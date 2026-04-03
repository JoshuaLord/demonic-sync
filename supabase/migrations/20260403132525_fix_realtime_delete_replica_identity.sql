-- Fix: Supabase Realtime DELETE events require REPLICA IDENTITY FULL
-- to include non-PK columns (like room_id) in the `old` payload.
-- Without this, filtered subscriptions (filter: room_id=eq.xxx) silently
-- drop DELETE events because room_id is not in the old record.

ALTER TABLE route_steps REPLICA IDENTITY FULL;
ALTER TABLE rooms REPLICA IDENTITY FULL;
