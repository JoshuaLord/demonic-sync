import crypto from 'crypto';
import { supabaseAdmin } from './supabase-admin';

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

  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(adminKey, 'utf-8');
  const b = Buffer.from(storedKey, 'utf-8');

  if (a.length !== b.length) {
    return { valid: false, error: 'Invalid admin key' };
  }

  const match = crypto.timingSafeEqual(a, b);
  return match ? { valid: true } : { valid: false, error: 'Invalid admin key' };
}
