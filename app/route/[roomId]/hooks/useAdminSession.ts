'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type SessionStatus = {
  queuePosition: number;
  totalAdmins: number;
  canBroadcast: boolean;
};

export function useAdminSession(
  roomId: string,
  isAdmin: boolean
) {
  // Eagerly initialize sessionId so it's available on the first render
  const [sessionId] = useState(() =>
    Math.random().toString(36).substring(2) + Date.now().toString(36)
  );
  const sessionIdRef = useRef(sessionId);
  const [status, setStatus] = useState<SessionStatus>({
    queuePosition: 0,
    totalAdmins: 0,
    canBroadcast: false,
  });
  // Custom JWT signed by server for Realtime RLS authorization
  const [realtimeToken, setRealtimeToken] = useState<string | null>(null);

  const registerSession = useCallback(async () => {
    if (!isAdmin) return;

    const response = await fetch(`/api/rooms/${roomId}/realtime-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setStatus({
        queuePosition: data.queuePosition,
        totalAdmins: data.totalAdmins,
        canBroadcast: data.canBroadcast,
      });
      if (data.token) {
        setRealtimeToken(data.token);
      }
    }
  }, [roomId, isAdmin]);

  const heartbeat = useCallback(async () => {
    if (!isAdmin) return;

    const response = await fetch(`/api/rooms/${roomId}/realtime-session`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ sessionId: sessionIdRef.current }),
    });

    if (response.ok) {
      const data = await response.json();
      setStatus({
        queuePosition: data.queuePosition,
        totalAdmins: data.totalAdmins,
        canBroadcast: data.canBroadcast,
      });
      // Refresh token on each heartbeat (keeps expiration fresh)
      if (data.token) {
        setRealtimeToken(data.token);
      }
    }
  }, [roomId, isAdmin]);

  const unregisterSession = useCallback(async () => {
    if (!isAdmin) return;

    await fetch(`/api/rooms/${roomId}/realtime-session`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ sessionId: sessionIdRef.current }),
    });
  }, [roomId, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    // Register on mount
    registerSession();

    // Heartbeat every 30s
    const interval = setInterval(heartbeat, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      unregisterSession();
    };
  }, [isAdmin, registerSession, heartbeat, unregisterSession]);

  return {
    sessionId,
    realtimeToken,
    ...status,
  };
}
