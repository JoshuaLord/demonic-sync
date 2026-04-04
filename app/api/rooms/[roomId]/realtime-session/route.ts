import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateAdmin } from '@/lib/validate-admin';
import { signRealtimeJwt } from '@/lib/jwt';

// Helper: get queue status for a room
async function getQueueStatus(roomId: string, sessionId: string) {
  const { data: sessions } = await supabaseAdmin
    .from('realtime_admin_sessions')
    .select('session_id, joined_at')
    .eq('room_id', roomId)
    .gte('last_heartbeat', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .order('joined_at', { ascending: true });

  const queuePosition = (sessions?.findIndex(s => s.session_id === sessionId) ?? -1) + 1;
  const totalAdmins = sessions?.length ?? 0;

  return {
    queuePosition,
    totalAdmins,
    canBroadcast: queuePosition > 0 && queuePosition <= 4 && totalAdmins > 1,
  };
}

// POST - Register admin session
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const { adminKey, sessionId } = await request.json();

  // Validate admin key
  const auth = await validateAdmin(roomId, adminKey);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Hash admin key for privacy (don't store plaintext in sessions table)
  const keyHash = createHash('sha256').update(adminKey).digest('hex');

  // Upsert session (handles reconnects gracefully)
  const { error } = await supabaseAdmin
    .from('realtime_admin_sessions')
    .upsert({
      room_id: roomId,
      session_id: sessionId,
      admin_key_hash: keyHash,
      joined_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
    }, {
      onConflict: 'room_id,session_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Failed to register session:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }

  // Sign a custom JWT with this session_id for Realtime RLS
  const token = await signRealtimeJwt(sessionId);

  const status = await getQueueStatus(roomId, sessionId);

  return NextResponse.json({ ok: true, token, ...status });
}

// PATCH - Heartbeat update
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const { sessionId } = await request.json();

  const { error } = await supabaseAdmin
    .from('realtime_admin_sessions')
    .update({ last_heartbeat: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('session_id', sessionId);

  if (error) {
    return NextResponse.json({ error: 'Heartbeat failed' }, { status: 500 });
  }

  // Re-sign JWT on each heartbeat (keeps expiration fresh)
  const token = await signRealtimeJwt(sessionId);

  const status = await getQueueStatus(roomId, sessionId);

  return NextResponse.json({ ok: true, token, ...status });
}

// DELETE - Unregister session
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const { sessionId } = await request.json();

  await supabaseAdmin
    .from('realtime_admin_sessions')
    .delete()
    .eq('room_id', roomId)
    .eq('session_id', sessionId);

  return NextResponse.json({ ok: true });
}
