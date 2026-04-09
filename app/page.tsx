'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Crown, Eye, X, Clock } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { getRecentRooms, saveRecentRoom, removeRecentRoom, timeAgo, RecentRoom } from '@/lib/recent-rooms';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function parseRoomId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(UUID_RE);
  return match ? match[0] : null;
}

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    // Load recent rooms and refresh admin status from cookies
    const rooms = getRecentRooms();
    const refreshed = rooms.map((room) => {
      const hasAdminCookie =
        document.cookie.split('; ').some((c) => c === `dsa_${room.roomId}=1`);
      if (room.isAdmin && !hasAdminCookie) {
        return { ...room, isAdmin: false };
      }
      if (!room.isAdmin && hasAdminCookie) {
        return { ...room, isAdmin: true };
      }
      return room;
    });
    // Persist any changes from cookie refresh
    const changed = refreshed.some((r, i) => r.isAdmin !== rooms[i].isAdmin);
    if (changed) {
      try {
        localStorage.setItem('recent_rooms', JSON.stringify(refreshed));
      } catch { /* ignore */ }
    }
    setRecentRooms(refreshed);
  }, []);

  async function createRoom() {
    try {
      setLoading(true);
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { roomId } = await response.json();

      saveRecentRoom({
        roomId,
        name: 'Untitled Route',
        lastVisited: new Date().toISOString(),
        isAdmin: true,
      });

      router.push(`/route/${roomId}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please check the console for details.');
      setLoading(false);
    }
  }

  function handleJoin() {
    const roomId = parseRoomId(joinInput);
    if (!roomId) {
      setJoinError('Enter a valid room URL or ID');
      return;
    }
    setJoinError('');
    router.push(`/route/${roomId}`);
  }

  function handleRemoveRoom(e: React.MouseEvent, roomId: string) {
    e.stopPropagation();
    e.preventDefault();
    removeRecentRoom(roomId);
    setRecentRooms((prev) => prev.filter((r) => r.roomId !== roomId));
  }

  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex items-center justify-center relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-lg px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4">Demonic Sync</h1>
          <p className="text-[var(--text-tertiary)]">
            Collaborative OSRS Leagues route planning
          </p>
        </div>

        {/* Create Button */}
        <div className="text-center mb-8">
          <button
            onClick={createRoom}
            disabled={loading}
            className="bg-[var(--gold)] hover:bg-[var(--gold-deep)] disabled:opacity-50 px-6 py-3 rounded-lg text-lg font-semibold text-white transition-colors"
          >
            {loading ? 'Creating...' : 'Create New Route'}
          </button>
        </div>

        {/* Join Room */}
        <div className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={joinInput}
              onChange={(e) => {
                setJoinInput(e.target.value);
                if (joinError) setJoinError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoin();
              }}
              placeholder="Paste a room URL or ID to join..."
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-standard)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--gold)] transition-colors"
            />
            <button
              onClick={handleJoin}
              className="px-4 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-standard)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--gold)] transition-colors font-medium"
            >
              Join
            </button>
          </div>
          {joinError && (
            <p className="text-[var(--crimson)] text-sm mt-1.5 ml-1">{joinError}</p>
          )}
        </div>

        {/* Recent Rooms */}
        {recentRooms.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-[var(--text-tertiary)]" />
              <span className="text-sm font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Recent Rooms
              </span>
            </div>
            <div className="space-y-2">
              {recentRooms.map((room) => (
                <a
                  key={room.roomId}
                  href={`/route/${room.roomId}`}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/route/${room.roomId}`);
                  }}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-standard)] hover:border-[var(--gold)] transition-colors cursor-pointer"
                >
                  {/* Admin/Viewer badge */}
                  <div
                    className={`flex-shrink-0 p-1.5 rounded ${
                      room.isAdmin
                        ? 'bg-[var(--gold)]/15 text-[var(--gold)]'
                        : 'bg-[var(--text-tertiary)]/10 text-[var(--text-tertiary)]'
                    }`}
                    title={room.isAdmin ? 'Admin' : 'Viewer'}
                  >
                    {room.isAdmin ? <Crown size={14} /> : <Eye size={14} />}
                  </div>

                  {/* Room info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {room.name}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {timeAgo(room.lastVisited)}
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={(e) => handleRemoveRoom(e, room.roomId)}
                    className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-elevated)] transition-all text-[var(--text-tertiary)] hover:text-[var(--crimson)]"
                    title="Remove from history"
                  >
                    <X size={14} />
                  </button>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
