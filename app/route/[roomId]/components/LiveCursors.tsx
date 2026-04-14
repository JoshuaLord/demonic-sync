'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { PresenceUser } from '../hooks/usePresence';

function CursorSvg({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.928 0.640L14.730 10.876C15.182 11.197 14.905 11.907 14.347 11.868L8.355 11.454L5.352 18.587C5.178 19.001 4.635 19.075 4.355 18.722L0.313 1.567C0.167 1.053 0.538 0.363 0.928 0.640Z"
        fill={color}
        stroke="var(--cursor-stroke)"
        strokeWidth="1.2"
      />
    </svg>
  );
}

/** Resolves a user's broadcasted position to screen pixels. */
function resolvePosition(
  user: PresenceUser,
  panelRects: Map<string, { rect: DOMRect; scrollLeft: number; scrollTop: number }>,
): { x: number; y: number; visible: boolean } {
  if (user.panel) {
    const info = panelRects.get(user.panel);
    if (!info) return { x: 0, y: 0, visible: false };

    // Convert content-relative back to screen coords
    const x = info.rect.left + user.x - info.scrollLeft;
    const y = info.rect.top + user.y - info.scrollTop;

    // Hide if outside the panel's visible bounds
    const visible =
      x >= info.rect.left - 20 &&
      x <= info.rect.right + 20 &&
      y >= info.rect.top - 20 &&
      y <= info.rect.bottom + 20;

    return { x, y, visible };
  }

  // Fallback: viewport percentage (for cursors outside panels)
  return {
    x: (user.x / 100) * window.innerWidth,
    y: (user.y / 100) * window.innerHeight,
    visible: true,
  };
}

export default function LiveCursors({ others }: { others: PresenceUser[] }) {
  const rafRef = useRef<number>(0);
  const [, forceRender] = useState(0);

  // Re-render when panels scroll so cursor positions update on the receiver side
  const scheduleUpdate = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      forceRender((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    if (others.length === 0) return;

    // Collect all panels that have cursors pointed at them
    const panelNames = new Set<string>();
    for (const u of others) {
      if (u.panel) panelNames.add(u.panel);
    }

    const panels: HTMLElement[] = [];
    for (const name of panelNames) {
      const el = document.querySelector<HTMLElement>(`[data-cursor-panel="${name}"]`);
      if (el) panels.push(el);
    }

    // Listen for scroll on those panels
    for (const panel of panels) {
      panel.addEventListener('scroll', scheduleUpdate, { passive: true });
    }
    // Also listen for window resize
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      for (const panel of panels) {
        panel.removeEventListener('scroll', scheduleUpdate);
      }
      window.removeEventListener('resize', scheduleUpdate);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [others, scheduleUpdate]);

  if (others.length === 0) return null;

  // Snapshot current panel positions for this render
  const panelRects = new Map<string, { rect: DOMRect; scrollLeft: number; scrollTop: number }>();
  const panelNames = new Set<string>();
  for (const u of others) {
    if (u.panel) panelNames.add(u.panel);
  }
  for (const name of panelNames) {
    const el = document.querySelector<HTMLElement>(`[data-cursor-panel="${name}"]`);
    if (el) {
      panelRects.set(name, {
        rect: el.getBoundingClientRect(),
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
      });
    }
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {others.map((user) => {
        const { x, y, visible } = resolvePosition(user, panelRects);

        if (!visible) return null;

        return (
          <div
            key={user.id}
            className="absolute"
            style={{
              left: x,
              top: y,
              transform: 'translate(-1px, -1px)',
              transition: 'left 120ms linear, top 120ms linear',
            }}
          >
            <CursorSvg color={user.color} />
            <div
              className="absolute left-4 top-4 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
