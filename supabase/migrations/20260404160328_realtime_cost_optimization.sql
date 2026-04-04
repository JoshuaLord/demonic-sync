-- ============================================================================
-- REALTIME COST OPTIMIZATION: Admin Session Tracking & Broadcasting Cap
-- ============================================================================

-- Track active admin sessions for 4-admin broadcasting cap
CREATE TABLE realtime_admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  admin_key_hash text NOT NULL, -- SHA-256 hash of admin key
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_heartbeat timestamptz NOT NULL DEFAULT now(),

  UNIQUE(room_id, session_id)
);

-- Index for fast queue position lookups
CREATE INDEX idx_admin_sessions_room_joined
ON realtime_admin_sessions(room_id, joined_at);

-- Index for cleanup queries
CREATE INDEX idx_admin_sessions_heartbeat
ON realtime_admin_sessions(last_heartbeat);

-- Enable RLS
ALTER TABLE realtime_admin_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public to manage sessions (validation happens in API route)
CREATE POLICY "Public can manage admin sessions"
ON realtime_admin_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES FOR REALTIME AUTHORIZATION
-- ============================================================================
-- Server signs custom JWTs with a session_id claim for each admin.
-- Client passes the JWT via supabase.realtime.setAuth(token) and sets
-- private: true on the channel. Supabase Realtime evaluates these RLS
-- policies when the client joins the channel.
--
-- The policies extract session_id from the JWT, then verify:
--   1. A matching active session exists in realtime_admin_sessions
--   2. The session is within the top 4 oldest active sessions (broadcasting cap)
--
-- Docs: https://supabase.com/docs/guides/realtime/authorization
-- ============================================================================

-- Helper: check if the JWT holder has an active session in the top 4
CREATE OR REPLACE FUNCTION is_active_broadcaster()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  channel_topic text;
  room_uuid uuid;
  jwt_session_id text;
  session_rank integer;
BEGIN
  -- Extract room ID from channel topic "presence_<uuid>"
  channel_topic := realtime.topic();
  IF channel_topic NOT LIKE 'presence_%' THEN
    RETURN false;
  END IF;

  BEGIN
    room_uuid := substring(channel_topic from 10)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  -- Read session_id from the custom JWT claim
  jwt_session_id := (
    current_setting('request.jwt.claims', true)::json ->> 'session_id'
  );
  IF jwt_session_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check active session exists and calculate queue rank
  WITH ranked AS (
    SELECT session_id,
           ROW_NUMBER() OVER (ORDER BY joined_at) AS rank
    FROM realtime_admin_sessions
    WHERE room_id = room_uuid
      AND last_heartbeat > now() - interval '5 minutes'
  )
  SELECT rank INTO session_rank
  FROM ranked
  WHERE session_id = jwt_session_id;

  RETURN (session_rank IS NOT NULL AND session_rank <= 4);
END;
$$;

-- Admins can RECEIVE presence + broadcast messages
CREATE POLICY "Broadcasters can receive presence and broadcast"
ON realtime.messages
FOR SELECT
TO anon
USING (
  realtime.messages.extension IN ('presence', 'broadcast')
  AND is_active_broadcaster()
);

-- Admins can SEND presence + broadcast messages
CREATE POLICY "Broadcasters can send presence and broadcast"
ON realtime.messages
FOR INSERT
TO anon
WITH CHECK (
  realtime.messages.extension IN ('presence', 'broadcast')
  AND is_active_broadcaster()
);

-- ============================================================================
-- CLEANUP FUNCTION: Remove stale sessions
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_stale_admin_sessions()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM realtime_admin_sessions
  WHERE last_heartbeat < now() - interval '5 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
