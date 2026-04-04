'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function createRoom() {
    try {
      setLoading(true);

      const response = await fetch('/api/rooms/create', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { roomId, adminKey } = await response.json();

      // Redirect to room with admin key
      router.push(`/route/${roomId}?key=${adminKey}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please check the console for details.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex items-center justify-center relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">Demonic Sync</h1>
        <p className="text-[var(--text-tertiary)] mb-8">
          Collaborative OSRS Leagues route planning
        </p>
        <button
          onClick={createRoom}
          disabled={loading}
          className="bg-[var(--gold)] hover:bg-[var(--gold-deep)] disabled:opacity-50 px-6 py-3 rounded-lg text-lg font-semibold text-white transition-colors"
        >
          {loading ? 'Creating...' : 'Create New Route'}
        </button>
      </div>
    </main>
  );
}
