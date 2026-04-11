'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAdminSession } from './useAdminSession';

export type PresenceUser = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

const COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

const DEMON_WORDS = ['Imp', 'Demon', 'Fiend', 'Wraith', 'Shade', 'Ghoul', 'Specter', 'Djinn'];
const COLOR_NAMES = ['Red', 'Amber', 'Green', 'Blue', 'Violet', 'Pink', 'Cyan', 'Orange'];

function generateIdentity() {
  const index = Math.floor(Math.random() * COLORS.length);
  const demonIndex = Math.floor(Math.random() * DEMON_WORDS.length);
  return {
    color: COLORS[index],
    name: `${COLOR_NAMES[index]} ${DEMON_WORDS[demonIndex]}`,
  };
}

export function usePresence(
  roomId: string,
  isAdmin: boolean
) {
  const [others, setOthers] = useState<PresenceUser[]>([]);
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [displayColor, setDisplayColor] = useState('');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const identityRef = useRef<{ color: string; name: string } | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const lastBroadcastRef = useRef(0);
  const broadcastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Map of session ID -> latest cursor position (from broadcasts)
  const cursorMapRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  // Map of session ID -> broadcast name override (prevents sync from reverting to stale name)
  const nameOverridesRef = useRef<Map<string, string>>(new Map());

  // Admin session management for broadcasting control
  const { sessionId, realtimeToken, canBroadcast, queuePosition, totalAdmins } =
    useAdminSession(roomId, isAdmin);

  // Refs to avoid stale closures in broadcastCursor
  const canBroadcastRef = useRef(canBroadcast);
  canBroadcastRef.current = canBroadcast;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  // Generate identity on mount (client-side only), restoring saved name/color from localStorage
  useEffect(() => {
    const id = generateIdentity();
    const savedName = localStorage.getItem('presence_name');
    const savedColor = localStorage.getItem('presence_color');
    if (savedName) id.name = savedName;
    if (savedColor) id.color = savedColor;
    else localStorage.setItem('presence_color', id.color);
    identityRef.current = id;
    setDisplayName(id.name);
    setDisplayColor(id.color);
    setReady(true);
  }, []);

  const broadcastCursor = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || !identityRef.current || !canBroadcastRef.current) return;

    const now = Date.now();
    // Throttle: 50ms → 100ms for cost reduction
    if (now - lastBroadcastRef.current < 100) {
      if (!broadcastTimeoutRef.current) {
        broadcastTimeoutRef.current = setTimeout(() => {
          broadcastTimeoutRef.current = null;
          broadcastCursor();
        }, 100);
      }
      return;
    }

    lastBroadcastRef.current = now;
    if (channel.state !== 'joined') return;
    channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        id: sessionIdRef.current,
        x: mouseRef.current.x,
        y: mouseRef.current.y,
      },
    });
  }, []);

  // Push refreshed JWT to Realtime on each heartbeat
  useEffect(() => {
    if (!realtimeToken || !isAdmin) return;
    supabase.realtime.setAuth(realtimeToken);
  }, [realtimeToken, isAdmin]);

  useEffect(() => {
    // Wait for client-side identity generation
    if (!ready) return;

    // CRITICAL: Only connect to presence/broadcast if admin with a valid token
    if (!isAdmin || !realtimeToken) return;

    // Set the custom JWT before creating the channel
    supabase.realtime.setAuth(realtimeToken);

    const channel = supabase.channel(`presence_${roomId}`, {
      config: {
        presence: { key: sessionId },
        private: true, // Enforce RLS on realtime.messages
      },
    });

    channelRef.current = channel;

    // Presence: who's online (name + color)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: PresenceUser[] = [];
      for (const [key, presences] of Object.entries(state)) {
        if (key === sessionId) continue;
        const p = presences[0] as { id?: string; name?: string; color?: string } | undefined;
        if (p?.id && p.name && p.color) {
          const cursor = cursorMapRef.current.get(p.id) || { x: 0, y: 0 };
          const nameOverride = nameOverridesRef.current.get(p.id);
          users.push({
            id: p.id,
            name: nameOverride || p.name,
            color: p.color,
            x: cursor.x,
            y: cursor.y,
          });
          // Clear override once presence state has caught up
          if (nameOverride && p.name === nameOverride) {
            nameOverridesRef.current.delete(p.id);
          }
        }
      }
      setOthers(users);
    });

    // Broadcast: real-time cursor positions
    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      if (!payload || payload.id === sessionId) return;
      cursorMapRef.current.set(payload.id, { x: payload.x, y: payload.y });
      setOthers((prev) =>
        prev.map((u) =>
          u.id === payload.id ? { ...u, x: payload.x, y: payload.y } : u
        )
      );
    });

    // Broadcast: name changes
    channel.on('broadcast', { event: 'name_change' }, ({ payload }) => {
      if (!payload || payload.id === sessionId) return;
      nameOverridesRef.current.set(payload.id, payload.name);
      setOthers((prev) =>
        prev.map((u) =>
          u.id === payload.id ? { ...u, name: payload.name } : u
        )
      );
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: sessionId,
          name: identityRef.current!.name,
          color: identityRef.current!.color,
        });
      }
    });

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (canBroadcastRef.current) {
        broadcastCursor();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, ready, isAdmin, sessionId, realtimeToken, broadcastCursor]);

  const setName = useCallback((newName: string) => {
    const trimmed = newName.trim().slice(0, 20);
    if (!trimmed || !identityRef.current) return;
    identityRef.current = { ...identityRef.current, name: trimmed };
    setDisplayName(trimmed);
    localStorage.setItem('presence_name', trimmed);
    const channel = channelRef.current;
    if (channel && isAdmin && canBroadcast && channel.state === 'joined') {
      // Broadcast name change (same mechanism as cursors — reliable)
      channel.send({
        type: 'broadcast',
        event: 'name_change',
        payload: {
          id: sessionId,
          name: trimmed,
        },
      });
      // Also re-track presence so new joiners get the correct name
      channel.track({
        id: sessionId,
        name: trimmed,
        color: identityRef.current.color,
      });
    }
  }, [isAdmin, canBroadcast, sessionId]);

  return {
    others: isAdmin ? others : [], // Viewers don't see cursors
    color: displayColor,
    name: displayName,
    setName,
    // Expose queue status for UI
    queuePosition,
    totalAdmins,
    canBroadcast,
  };
}
