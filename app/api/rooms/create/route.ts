import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

export async function POST() {
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

  return NextResponse.json({ roomId, adminKey });
}
