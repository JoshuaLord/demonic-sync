import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateAdmin } from '@/lib/validate-admin';

export async function POST(
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

  const { adminKey, stepData } = body;

  const auth = await validateAdmin(roomId, adminKey);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!stepData || typeof stepData !== 'object') {
    return NextResponse.json({ error: 'Invalid step data' }, { status: 400 });
  }

  // Server-side step_order calculation with retry logic to handle race conditions
  // When two admins add simultaneously, one might get a unique constraint violation
  // We retry up to 3 times with recalculated order
  let data: any = null;
  let lastError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    // Calculate the next order
    const { data: maxOrderData } = await supabaseAdmin
      .from('route_steps')
      .select('step_order')
      .eq('room_id', roomId)
      .order('step_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = maxOrderData ? maxOrderData.step_order + 1 : 0;

    // Try to insert
    const result = await supabaseAdmin
      .from('route_steps')
      .insert({
        room_id: roomId,
        step_order: nextOrder,
        step_type: stepData.step_type,
        task_id: stepData.task_id ?? null,
        task_name: stepData.task_name ?? null,
        task_description: stepData.task_description ?? null,
        task_tier: stepData.task_tier ?? null,
        task_points: stepData.task_points ?? null,
        task_region: stepData.task_region ?? null,
        custom_text: stepData.custom_text ?? null,
        player_state: stepData.player_state ?? {},
      })
      .select()
      .single();

    // If successful, break out of retry loop
    if (!result.error) {
      data = result.data;
      break;
    }

    // If it's a unique constraint violation (code 23505), retry
    if (result.error.code === '23505') {
      console.log(`Unique constraint collision on attempt ${attempt + 1}, retrying...`);
      lastError = result.error;
      // Small delay before retry to reduce collision likelihood
      await new Promise(resolve => setTimeout(resolve, 10 * (attempt + 1)));
      continue;
    }

    // For other errors, fail immediately
    lastError = result.error;
    break;
  }

  if (!data) {
    console.error('Error inserting step after retries:', lastError);
    return NextResponse.json({ error: 'Failed to insert step' }, { status: 500 });
  }

  return NextResponse.json({ step: data });
}

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
    case 'update_checkbox': {
      const { stepId, playerState } = body;
      if (!stepId || !playerState || typeof playerState !== 'object') {
        return NextResponse.json({ error: 'Invalid checkbox data' }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from('route_steps')
        .update({ player_state: playerState })
        .eq('id', stepId)
        .eq('room_id', roomId);
      if (error) {
        console.error('Error updating checkbox:', error);
        return NextResponse.json({ error: 'Failed to update checkbox' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    case 'reorder': {
      const { stepUpdates } = body;
      if (!Array.isArray(stepUpdates)) {
        return NextResponse.json({ error: 'Invalid step updates' }, { status: 400 });
      }
      const { error } = await supabaseAdmin.rpc('reorder_route_steps', {
        p_room_id: roomId,
        step_updates: stepUpdates,
      });
      if (error) {
        console.error('Error reordering steps:', error);
        return NextResponse.json({ error: 'Failed to reorder steps' }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}

export async function DELETE(
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

  const { adminKey, stepId } = body;

  const auth = await validateAdmin(roomId, adminKey);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!stepId) {
    return NextResponse.json({ error: 'Missing step ID' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('route_steps')
    .delete()
    .eq('id', stepId)
    .eq('room_id', roomId);

  if (error) {
    console.error('Error deleting step:', error);
    return NextResponse.json({ error: 'Failed to delete step' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
