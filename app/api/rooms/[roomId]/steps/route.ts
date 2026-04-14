import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth, getClientIp } from '@/lib/auth';
import { isValidUUID } from '@/lib/validate-admin';

const VALID_STEP_TYPES = new Set(['task', 'custom']);

// Rate limiter for task operations: IP → array of timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = process.env.NODE_ENV === 'production' ? 60 : 1000;

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

// Maximum tasks per room
const MAX_STEPS_PER_ROOM = 2000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const auth = await requireAdminAuth(request, roomId);
  if (!auth.ok) return auth.response;

  // Rate limiting check
  const ip = getClientIp(request);
  if (ip !== 'unknown' && isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many task operations. Please slow down.' },
      { status: 429 }
    );
  }

  // Check max steps per room
  const { count } = await supabaseAdmin
    .from('route_steps')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId);

  if (count !== null && count >= MAX_STEPS_PER_ROOM) {
    return NextResponse.json(
      { error: `Room has reached maximum of ${MAX_STEPS_PER_ROOM} tasks` },
      { status: 400 }
    );
  }

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
        is_pact_task: stepData.is_pact_task === true,
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

  // Rate limiting check
  const ip = getClientIp(request);
  if (ip !== 'unknown' && isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many task operations. Please slow down.' },
      { status: 429 }
    );
  }

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
      if (!stepId || typeof stepId !== 'string' || !isValidUUID(stepId)) {
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
        if (typeof item.id !== 'string' || !isValidUUID(item.id) || typeof item.step_order !== 'number' || !Number.isInteger(item.step_order) || item.step_order < 0) {
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

    case 'update_custom_text': {
      const stepId = body.stepId;
      const customText = body.customText;
      if (!stepId || typeof stepId !== 'string' || !isValidUUID(stepId)) {
        return NextResponse.json({ error: 'Invalid step ID' }, { status: 400 });
      }
      if (typeof customText !== 'string' || customText.length === 0 || customText.length > 500) {
        return NextResponse.json({ error: 'custom_text must be 1-500 characters' }, { status: 400 });
      }
      const { error } = await supabaseAdmin
        .from('route_steps')
        .update({ custom_text: customText })
        .eq('id', stepId)
        .eq('room_id', roomId)
        .eq('step_type', 'custom');
      if (error) {
        console.error('Error updating custom text:', error);
        return NextResponse.json({ error: 'Failed to update custom text' }, { status: 500 });
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

  // Rate limiting check
  const ip = getClientIp(request);
  if (ip !== 'unknown' && isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many task operations. Please slow down.' },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const stepId = body.stepId;
  if (!stepId || typeof stepId !== 'string' || !isValidUUID(stepId)) {
    return NextResponse.json({ error: 'Invalid step ID' }, { status: 400 });
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
