import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import RouteClient from './RouteClient';

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

  // Fetch room data
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
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
