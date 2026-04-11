'use client';

import { Activity, Clock, Pause } from 'lucide-react';

type Props = {
  canBroadcast: boolean;
  queuePosition: number;
  totalAdmins: number;
  hasPremium: boolean;
};

export default function BroadcastStatus({
  canBroadcast,
  queuePosition,
  totalAdmins,
  hasPremium,
}: Props) {
  // Don't show anything if no admins or no premium
  if (totalAdmins === 0 || !hasPremium) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {canBroadcast ? (
        <>
          <Activity className="w-4 h-4 text-green-500" />
          <span className="text-[var(--text-secondary)]">Broadcasting</span>
        </>
      ) : totalAdmins === 1 ? (
        <>
          <Pause className="w-4 h-4 text-amber-500" />
          <span className="text-[var(--text-secondary)]">Paused (alone)</span>
        </>
      ) : (
        <>
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-[var(--text-secondary)]">Queue: {queuePosition}/{totalAdmins}</span>
        </>
      )}
    </div>
  );
}
