import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth } from '@/lib/auth';

const VALID_PLAYER_IDS = new Set(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const auth = await requireAdminAuth(request, roomId);
  if (!auth.ok) return auth.response;
  const adminKey = auth.adminKey;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = body.action as string | undefined;

  switch (action) {
    case 'update_name': {
      const name = body.name;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      }
      if (name.trim().length > 50) {
        return NextResponse.json({ error: 'Name too long (max 50 characters)' }, { status: 400 });
      }
      // TOCTOU defense: only update if admin_key still matches.
      const { error, data } = await supabaseAdmin
        .from('rooms')
        .update({ name: name.trim() })
        .eq('id', roomId)
        .eq('admin_key', adminKey)
        .select('id');
      if (error) {
        console.error('Error updating room name:', error);
        return NextResponse.json({ error: 'Failed to update room name' }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'update_players': {
      const playerNames = body.playerNames;
      if (!playerNames || typeof playerNames !== 'object' || Array.isArray(playerNames)) {
        return NextResponse.json({ error: 'Invalid player names' }, { status: 400 });
      }
      const keys = Object.keys(playerNames as Record<string, unknown>);
      if (keys.length === 0 || keys.length > 6 || !keys.every(k => VALID_PLAYER_IDS.has(k))) {
        return NextResponse.json({ error: 'Invalid player IDs' }, { status: 400 });
      }
      // Names must be non-empty strings up to 20 chars (after trim).
      const rawNames = playerNames as Record<string, unknown>;
      if (!Object.values(rawNames).every(v => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 20)) {
        return NextResponse.json(
          { error: 'Player names must be 1-20 characters' },
          { status: 400 }
        );
      }
      // Trim names before storage
      const trimmedNames: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawNames)) {
        trimmedNames[k] = (v as string).trim();
      }
      const { error, data } = await supabaseAdmin
        .from('rooms')
        .update({ player_names: trimmedNames })
        .eq('id', roomId)
        .eq('admin_key', adminKey)
        .select('id');
      if (error) {
        console.error('Error updating players:', error);
        return NextResponse.json({ error: 'Failed to update players' }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'update_milestone_state': {
      const milestonePlayerState = body.milestonePlayerState;
      if (!milestonePlayerState || typeof milestonePlayerState !== 'object' || Array.isArray(milestonePlayerState)) {
        return NextResponse.json({ error: 'Invalid milestone state' }, { status: 400 });
      }
      const entries = Object.entries(milestonePlayerState as Record<string, unknown>);
      if (entries.length > 50) {
        return NextResponse.json({ error: 'Too many milestone entries' }, { status: 400 });
      }
      for (const [, value] of entries) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return NextResponse.json({ error: 'Invalid milestone state values' }, { status: 400 });
        }
        for (const pv of Object.values(value as Record<string, unknown>)) {
          if (typeof pv !== 'boolean' && pv !== null) {
            return NextResponse.json({ error: 'Player state must be boolean or null' }, { status: 400 });
          }
        }
      }
      const { error, data } = await supabaseAdmin
        .from('rooms')
        .update({ milestone_player_state: milestonePlayerState })
        .eq('id', roomId)
        .eq('admin_key', adminKey)
        .select('id');
      if (error) {
        console.error('Error updating milestone state:', error);
        return NextResponse.json({ error: 'Failed to update milestone state' }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'update_milestone_selections': {
      const milestoneSelections = body.milestoneSelections;
      if (!milestoneSelections || typeof milestoneSelections !== 'object' || Array.isArray(milestoneSelections)) {
        return NextResponse.json({ error: 'Invalid milestone selections' }, { status: 400 });
      }
      const selEntries = Object.entries(milestoneSelections as Record<string, unknown>);
      if (selEntries.length > 50) {
        return NextResponse.json({ error: 'Too many milestone selections' }, { status: 400 });
      }
      if (!selEntries.every(([, v]) => typeof v === 'number' && Number.isFinite(v))) {
        return NextResponse.json({ error: 'Selection values must be numbers' }, { status: 400 });
      }
      const { error, data } = await supabaseAdmin
        .from('rooms')
        .update({ milestone_selections: milestoneSelections })
        .eq('id', roomId)
        .eq('admin_key', adminKey)
        .select('id');
      if (error) {
        console.error('Error updating milestone selections:', error);
        return NextResponse.json({ error: 'Failed to update milestone selections' }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
