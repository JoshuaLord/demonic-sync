'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function createRoom() {
    setLoading(true);

    const response = await fetch('/api/rooms/create', {
      method: 'POST',
    });

    const { roomId, adminKey } = await response.json();

    // Redirect to room with admin key
    router.push(`/route/${roomId}?key=${adminKey}`);
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">Demonic Sync</h1>
        <p className="text-gray-400 mb-8">
          Collaborative OSRS Leagues route planning
        </p>
        <button
          onClick={createRoom}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg text-lg font-semibold"
        >
          {loading ? 'Creating...' : 'Create New Route'}
        </button>
      </div>
    </main>
  );
}
