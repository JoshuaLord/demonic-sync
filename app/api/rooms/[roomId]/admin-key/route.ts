import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';

/**
 * Returns the current room's admin key to an already-authenticated admin
 * (cookie + Origin check). Used to construct the shareable admin link
 * on demand instead of persisting the key in localStorage.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const auth = await requireAdminAuth(request, roomId);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ adminKey: auth.adminKey });
}
