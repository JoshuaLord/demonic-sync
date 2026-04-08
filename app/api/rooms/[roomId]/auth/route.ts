import { NextRequest, NextResponse } from 'next/server';
import { validateAdmin, isValidUUID } from '@/lib/validate-admin';
import {
  setAdminCookies,
  clearAdminCookies,
  checkOrigin,
} from '@/lib/auth';

/**
 * Establish an admin session by exchanging an admin key (from a share link)
 * for an HttpOnly cookie. The key is never persisted in JS-accessible storage.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { roomId } = await params;
  if (!isValidUUID(roomId)) {
    return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
  }

  let body: { adminKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const auth = await validateAdmin(roomId, body.adminKey);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  setAdminCookies(response, roomId, body.adminKey!);
  return response;
}

/** Sign out (clear cookies for this room). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { roomId } = await params;
  if (!isValidUUID(roomId)) {
    return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true });
  clearAdminCookies(response, roomId);
  return response;
}
