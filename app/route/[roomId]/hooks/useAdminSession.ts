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
  // Persist sessionId in sessionStorage so page refreshes reuse the same
  // session instead of creating ghost entries in the admin queue.
  const [sessionId] = useState(() => {
    const storageKey = `admin_session_${roomId}`;
    if (typeof window !== 'undefined') {
      const existing = sessionStorage.getItem(storageKey);
      if (existing) return existing;
    }
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(storageKey, id);
    }
    return id;
  });
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

    let interval: ReturnType<typeof setInterval> | null = null;
    let registered = false;

    function startHeartbeat() {
      if (interval) return;
      if (!registered) {
        registerSession();
        registered = true;
      } else {
        // Re-register after returning from hidden (session may have expired)
        registerSession();
      }
      interval = setInterval(heartbeat, 30000);
    }

    function stopHeartbeat() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        stopHeartbeat();
      } else {
        startHeartbeat();
      }
    }

    // Start immediately if tab is visible
    if (!document.hidden) {
      startHeartbeat();
    }

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopHeartbeat();
      unregisterSession();
    };
  }, [isAdmin, registerSession, heartbeat, unregisterSession]);

  return {
    sessionId,
    realtimeToken,
    ...status,
  };
}
