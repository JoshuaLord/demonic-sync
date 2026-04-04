import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateAdmin } from '@/lib/validate-admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, adminKey } = body;

  const auth = await validateAdmin(roomId, adminKey);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  switch (action) {
    case 'update_name': {
      const { name } = body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from('rooms')
        .update({ name: name.trim() })
        .eq('id', roomId);
      if (error) {
        console.error('Error updating room name:', error);
        return NextResponse.json({ error: 'Failed to update room name' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'update_players': {
      const { playerNames } = body;
      if (!playerNames || typeof playerNames !== 'object') {
        return NextResponse.json({ error: 'Invalid player names' }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from('rooms')
        .update({ player_names: playerNames })
        .eq('id', roomId);
      if (error) {
        console.error('Error updating players:', error);
        return NextResponse.json({ error: 'Failed to update players' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'update_milestone_state': {
      const { milestonePlayerState } = body;
      if (!milestonePlayerState || typeof milestonePlayerState !== 'object') {
        return NextResponse.json({ error: 'Invalid milestone state' }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from('rooms')
        .update({ milestone_player_state: milestonePlayerState })
        .eq('id', roomId);
      if (error) {
        console.error('Error updating milestone state:', error);
        return NextResponse.json({ error: 'Failed to update milestone state' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'update_milestone_selections': {
      const { milestoneSelections } = body;
      if (!milestoneSelections || typeof milestoneSelections !== 'object') {
        return NextResponse.json({ error: 'Invalid milestone selections' }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from('rooms')
        .update({ milestone_selections: milestoneSelections })
        .eq('id', roomId);
      if (error) {
        console.error('Error updating milestone selections:', error);
        return NextResponse.json({ error: 'Failed to update milestone selections' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
