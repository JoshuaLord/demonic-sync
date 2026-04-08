import crypto from 'crypto';
import { supabaseAdmin } from './supabase-admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_RE.test(id);
}

export async function validateAdmin(
  roomId: string,
  adminKey: string | null | undefined
): Promise<{ valid: boolean; error?: string }> {
  if (!adminKey) {
    return { valid: false, error: 'Missing admin key' };
  }

  const { data: room, error } = await supabaseAdmin
    .from('rooms')
    .select('admin_key')
    .eq('id', roomId)
    .single();

  if (error || !room) {
    return { valid: false, error: 'Room not found' };
  }

  const storedKey = room.admin_key;
  if (!storedKey) {
    return { valid: false, error: 'Room has no admin key' };
  }

  // Hash both keys to fixed-length buffers before comparison.
  // This prevents leaking length information through timingSafeEqual's
  // requirement for equal-length buffers.
  const a = crypto.createHash('sha256').update(adminKey).digest();
  const b = crypto.createHash('sha256').update(storedKey).digest();
  const match = crypto.timingSafeEqual(a, b);

  return match ? { valid: true } : { valid: false, error: 'Invalid admin key' };
}
