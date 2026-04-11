'use client';

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
        stroke="white"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export default function LiveCursors({ others }: { others: PresenceUser[] }) {
  if (others.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {others.map((user) => {
        // Convert percentages to absolute pixels based on current viewport
        const xPixels = (user.x / 100) * window.innerWidth;
        const yPixels = (user.y / 100) * window.innerHeight;

        return (
          <div
            key={user.id}
            className="absolute"
            style={{
              left: xPixels,
              top: yPixels,
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
