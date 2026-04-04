-- Column-level security: Hide admin_key from anon role
-- Even with RLS policies, SELECT * would expose admin_key.
-- This migration uses column-level privileges to block it entirely.

-- Revoke all SELECT access on rooms from anon/authenticated roles
REVOKE SELECT ON rooms FROM anon, authenticated;

-- Grant SELECT only on safe columns (exclude admin_key)
GRANT SELECT (
  id,
  name,
  player_names,
  milestone_selections,
  milestone_player_state,
  created_at,
  updated_at
) ON rooms TO anon, authenticated;
