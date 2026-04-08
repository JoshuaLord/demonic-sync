import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth } from '@/lib/auth';

const VALID_STEP_TYPES = new Set(['task', 'custom']);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const auth = await requireAdminAuth(request, roomId);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const stepData = body.stepData as Record<string, unknown> | undefined;
  if (!stepData || typeof stepData !== 'object') {
    return NextResponse.json({ error: 'Invalid step data' }, { status: 400 });
  }

  if (!VALID_STEP_TYPES.has(stepData.step_type as string)) {
    return NextResponse.json({ error: 'Invalid step_type' }, { status: 400 });
  }

  if (stepData.task_name && (typeof stepData.task_name !== 'string' || (stepData.task_name as string).length > 500)) {
    return NextResponse.json({ error: 'task_name too long (max 500)' }, { status: 400 });
  }
  if (stepData.task_description && (typeof stepData.task_description !== 'string' || (stepData.task_description as string).length > 2000)) {
    return NextResponse.json({ error: 'task_description too long (max 2000)' }, { status: 400 });
  }
  if (stepData.custom_text && (typeof stepData.custom_text !== 'string' || (stepData.custom_text as string).length > 500)) {
    return NextResponse.json({ error: 'custom_text too long (max 500)' }, { status: 400 });
  }

  if (stepData.task_points !== undefined && stepData.task_points !== null && typeof stepData.task_points !== 'number') {
    return NextResponse.json({ error: 'task_points must be a number or null' }, { status: 400 });
  }

  // Server-side step_order calculation with retry logic to handle race conditions
  let data: unknown = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: maxOrderData } = await supabaseAdmin
      .from('route_steps')
      .select('step_order')
      .eq('room_id', roomId)
      .order('step_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = maxOrderData ? maxOrderData.step_order + 1 : 0;

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

    if (!result.error) {
      data = result.data;
      break;
    }

    if (result.error.code === '23505') {
      console.log(`Unique constraint collision on attempt ${attempt + 1}, retrying...`);
      lastError = result.error;
      await new Promise(resolve => setTimeout(resolve, 10 * (attempt + 1)));
      continue;
    }

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

  const auth = await requireAdminAuth(request, roomId);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = body.action as string | undefined;

  switch (action) {
    case 'update_checkbox': {
      const stepId = body.stepId;
      const playerState = body.playerState;
      if (!stepId || typeof stepId !== 'string') {
        return NextResponse.json({ error: 'Invalid step ID' }, { status: 400 });
      }
      if (!playerState || typeof playerState !== 'object' || Array.isArray(playerState)) {
        return NextResponse.json({ error: 'Invalid checkbox data' }, { status: 400 });
      }
      for (const val of Object.values(playerState as Record<string, unknown>)) {
        if (typeof val !== 'boolean' && val !== null) {
          return NextResponse.json({ error: 'Player state values must be boolean or null' }, { status: 400 });
        }
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
      const stepUpdates = body.stepUpdates;
      if (!Array.isArray(stepUpdates)) {
        return NextResponse.json({ error: 'Invalid step updates' }, { status: 400 });
      }
      if (stepUpdates.length > 500) {
        return NextResponse.json({ error: 'Too many step updates (max 500)' }, { status: 400 });
      }
      for (const item of stepUpdates) {
        if (typeof item.id !== 'string' || typeof item.step_order !== 'number' || !Number.isInteger(item.step_order) || item.step_order < 0) {
          return NextResponse.json({ error: 'Invalid step update format' }, { status: 400 });
        }
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

  const auth = await requireAdminAuth(request, roomId);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const stepId = body.stepId;
  if (!stepId || typeof stepId !== 'string') {
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
