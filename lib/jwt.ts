import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.SUPABASE_JWT_SECRET!
);

/**
 * Sign a custom JWT for Supabase Realtime authorization.
 * Includes a session_id claim so RLS policies on realtime.messages
 * can identify which admin session is connecting.
 */
export async function signRealtimeJwt(sessionId: string): Promise<string> {
  return new SignJWT({
    iss: 'supabase-demo',
    role: 'anon',
    session_id: sessionId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
}
