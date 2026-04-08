import { NextRequest, NextResponse } from 'next/server';
import { validateAdmin, isValidUUID } from './validate-admin';

// Cookie names are namespaced per room so a single browser can hold
// admin sessions for many rooms simultaneously.
export function adminCookieName(roomId: string): string {
  return `dsk_${roomId}`;
}
export function presenceCookieName(roomId: string): string {
  return `dsa_${roomId}`;
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Set the HttpOnly admin key cookie plus a non-HttpOnly companion flag
 * that the client uses to know it has admin rights (without ever reading
 * the actual key from JS).
 */
export function setAdminCookies(
  response: NextResponse,
  roomId: string,
  adminKey: string
) {
  const isProd = process.env.NODE_ENV === 'production';
  response.cookies.set(adminCookieName(roomId), adminKey, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  response.cookies.set(presenceCookieName(roomId), '1', {
    httpOnly: false,
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAdminCookies(response: NextResponse, roomId: string) {
  response.cookies.delete(adminCookieName(roomId));
  response.cookies.delete(presenceCookieName(roomId));
}

/**
 * CSRF defense: ensure the request originates from our own site.
 * Rejects cross-origin POST/PATCH/DELETE even if the attacker has
 * somehow obtained the admin key. SameSite=Strict cookies are the
 * primary defense; this Origin check is belt-and-suspenders.
 */
export function checkOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  // Same-origin fetch from our own pages always sends Origin in modern browsers.
  // Missing origin on a state-changing request is suspicious -> reject.
  if (!origin) return false;

  const host = request.headers.get('host');
  if (!host) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  if (originHost === host) return true;

  // Allow explicit production origin override (e.g. when behind a proxy).
  const allowed = process.env.NEXT_PUBLIC_SITE_URL;
  if (allowed) {
    try {
      if (new URL(allowed).host === originHost) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/**
 * Resolve the real client IP using Vercel-trusted headers first.
 * `x-forwarded-for` alone is user-spoofable; `x-real-ip` and
 * `x-vercel-forwarded-for` are set by Vercel's edge and cannot be
 * forged by the client.
 */
export function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const vercelFwd = request.headers.get('x-vercel-forwarded-for');
  if (vercelFwd) return vercelFwd.split(',')[0]!.trim();

  // Last resort: in local dev there are no proxy headers.
  if (process.env.NODE_ENV !== 'production') {
    const fwd = request.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0]!.trim();
  }
  return 'unknown';
}

export type AdminAuthResult =
  | { ok: true; adminKey: string }
  | { ok: false; response: NextResponse };

/**
 * Standard guard for write endpoints. Checks Origin (CSRF), validates
 * room id, reads the admin key from the HttpOnly cookie, and runs the
 * timing-safe validation against the database.
 */
export async function requireAdminAuth(
  request: NextRequest,
  roomId: string
): Promise<AdminAuthResult> {
  if (!checkOrigin(request)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  if (!isValidUUID(roomId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid room ID' }, { status: 400 }),
    };
  }
  const adminKey = request.cookies.get(adminCookieName(roomId))?.value;
  const auth = await validateAdmin(roomId, adminKey);
  if (!auth.valid) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }),
    };
  }
  return { ok: true, adminKey: adminKey! };
}
