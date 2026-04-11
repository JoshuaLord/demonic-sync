import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import RouteClient from './RouteClient';

// Disable caching so the server component always fetches fresh data.
// Without this, HMR and browser refreshes can serve stale server-rendered
// HTML that conflicts with client state updated via Realtime, causing
// hydration errors.
export const dynamic = 'force-dynamic';

export default async function RoutePage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  // Await params (Next.js 15+ requirement)
  const { roomId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch room data (exclude admin_key for security)
  const { data: room, error } = await supabase
    .from('rooms')
    .select('id, name, player_names, milestone_selections, milestone_player_state, created_at, updated_at')
    .eq('id', roomId)
    .single();

  if (error || !room) {
    notFound();
  }

  // Fetch route steps (task data is copied into the row)
  const { data: steps } = await supabase
    .from('route_steps')
    .select('*')
    .eq('room_id', roomId)
    .order('step_order', { ascending: true });

  // Fetch relics and regions for milestone selection
  const { data: relics } = await supabase
    .from('official_relics')
    .select('*')
    .order('tier', { ascending: true })
    .order('display_order', { ascending: true });

  const { data: regions } = await supabase
    .from('official_regions')
    .select('*')
    .order('display_order', { ascending: true });

  return (
    <RouteClient
      room={room}
      initialSteps={steps || []}
      relics={relics || []}
      regions={regions || []}
    />
  );
}
