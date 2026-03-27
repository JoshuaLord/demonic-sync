import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const roomId = crypto.randomUUID();
  const adminKey = crypto.randomBytes(32).toString('hex');

  const { error } = await supabase.from('rooms').insert({
    id: roomId,
    admin_key: adminKey,
    name: 'Untitled Route',
    player_names: { p1: 'Player 1' },
    milestone_selections: {}
  });

  if (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ roomId, adminKey });
}
