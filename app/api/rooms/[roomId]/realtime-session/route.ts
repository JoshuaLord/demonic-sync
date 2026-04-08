import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth } from '@/lib/auth';
import { signRealtimeJwt } from '@/lib/jwt';

const SESSION_ID_RE = /^[a-z0-9]+$/i;

function validSessionId(sessionId: unknown): sessionId is string {
  return typeof sessionId === 'string' && sessionId.length > 0 && sessionId.length <= 64 && SESSION_ID_RE.test(sessionId);
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const auth = await requireAdminAuth(request, roomId);
  if (!auth.ok) return auth.response;

  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionId } = body;
  if (!validSessionId(sessionId)) {
    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
  }

  const keyHash = createHash('sha256').update(auth.adminKey).digest('hex');

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

  const token = await signRealtimeJwt(sessionId);
  const status = await getQueueStatus(roomId, sessionId);
  return NextResponse.json({ ok: true, token, ...status });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const auth = await requireAdminAuth(request, roomId);
  if (!auth.ok) return auth.response;

  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionId } = body;
  if (!validSessionId(sessionId)) {
    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('realtime_admin_sessions')
    .update({ last_heartbeat: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('session_id', sessionId);

  if (error) {
    return NextResponse.json({ error: 'Heartbeat failed' }, { status: 500 });
  }

  const token = await signRealtimeJwt(sessionId);
  const status = await getQueueStatus(roomId, sessionId);
  return NextResponse.json({ ok: true, token, ...status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const auth = await requireAdminAuth(request, roomId);
  if (!auth.ok) return auth.response;

  let body: { sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionId } = body;
  if (!validSessionId(sessionId)) {
    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
  }

  await supabaseAdmin
    .from('realtime_admin_sessions')
    .delete()
    .eq('room_id', roomId)
    .eq('session_id', sessionId);

  return NextResponse.json({ ok: true });
}
