'use client';

import { useState, useEffect, useRef } from 'react';
import type { PresenceUser } from '../hooks/usePresence';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function PresenceAvatars({
  others,
  selfColor,
  selfName,
  onNameChange,
  isBroadcasting = false,
}: {
  others: PresenceUser[];
  selfColor: string;
  selfName: string;
  onNameChange?: (name: string) => void;
  isBroadcasting?: boolean;
}) {
  const [editValue, setEditValue] = useState(selfName);
  const isFocusedRef = useRef(false);

  // Sync editValue when selfName changes externally, but not while user is typing
  useEffect(() => {
    if (!isFocusedRef.current && selfName) {
      setEditValue(selfName);
    }
  }, [selfName]);

  if (!selfColor) return null;

  function commitName() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== selfName && onNameChange) {
      onNameChange(trimmed);
    } else {
      setEditValue(selfName);
    }
  }

  return (
    <div className="flex items-center gap-2" suppressHydrationWarning>
      {/* Self avatar + name input (only show when broadcasting) */}
      {isBroadcasting && (
        <div className="flex items-center gap-1.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-[var(--bg-elevated)]"
            style={{ backgroundColor: selfColor }}
            title={`${selfName} (You)`}
          >
            {getInitials(selfName)}
          </div>
          {onNameChange && (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value.slice(0, 20))}
              onFocus={() => { isFocusedRef.current = true; }}
              onBlur={() => {
                commitName();
                isFocusedRef.current = false;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitName();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              maxLength={20}
              className="w-24 text-xs bg-transparent border-b border-[var(--border-standard)] hover:border-[var(--text-tertiary)] focus:border-[var(--gold)] text-[var(--text-secondary)] focus:text-[var(--text-primary)] outline-none px-1 py-0.5 transition-colors"
              title="Click to change your display name"
            />
          )}
        </div>
      )}
      {/* Others */}
      {others.map((user) => (
        <div
          key={user.id}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-[var(--bg-elevated)] -ml-1"
          style={{ backgroundColor: user.color }}
          title={user.name}
        >
          {getInitials(user.name)}
        </div>
      ))}
    </div>
  );
}
