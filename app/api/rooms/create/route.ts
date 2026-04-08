import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkOrigin, getClientIp, setAdminCookies } from '@/lib/auth';
import crypto from 'crypto';

// Simple in-memory rate limiter: IP → array of timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
// Higher limit in dev to allow E2E tests to create many rooms
const RATE_LIMIT_MAX = process.env.NODE_ENV === 'production' ? 10 : 100;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  rateLimitMap.set(ip, valid);

  if (valid.length >= RATE_LIMIT_MAX) {
    return true;
  }

  valid.push(now);
  return false;
}

export async function POST(request: NextRequest) {
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ip = getClientIp(request);
  // Skip rate limiting for unidentified IPs (e.g. local E2E tests with no
  // proxy headers). In production every request comes through Vercel's
  // edge so `x-real-ip` is always set and `unknown` should not occur.
  if (ip !== 'unknown' && isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many rooms created. Please try again later.' },
      { status: 429 }
    );
  }

  const roomId = crypto.randomUUID();
  const adminKey = crypto.randomBytes(32).toString('hex');

  const { error } = await supabaseAdmin.from('rooms').insert({
    id: roomId,
    admin_key: adminKey,
    name: 'Untitled Route',
    player_names: { p1: 'Player 1' },
    milestone_selections: {}
  });

  if (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }

  // Issue an HttpOnly cookie session immediately so the creator never
  // needs to handle the raw admin key in JS-accessible storage.
  const response = NextResponse.json({ roomId });
  setAdminCookies(response, roomId, adminKey);
  return response;
}
