'use client';

import { Pencil } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import PresenceAvatars from './PresenceAvatars';
import type { PresenceUser } from '../hooks/usePresence';

type PlayerNames = Record<string, string>;

interface NextMilestone {
  label: string;
  remaining: number;
  percentage: number;
}

export interface RouteHeaderProps {
  roomName: string;
  isAdmin: boolean;
  mounted: boolean;
  totalPoints: number;
  totalTasks: number;
  nextRelic: NextMilestone | null;
  nextArea: NextMilestone | null;
  isEditingName: boolean;
  editingNameValue: string;
  onEditingNameChange: (value: string) => void;
  onStartEditingName: () => void;
  onSaveRoomName: () => void;
  onCancelEditingName: () => void;
  onShowShareModal: () => void;
  onOpenPlayerModal: () => void;
  presenceOthers: PresenceUser[];
  presenceColor: string;
  presenceName: string;
  onPresenceNameChange?: (name: string) => void;
}

export default function RouteHeader({
  roomName,
  isAdmin,
  mounted,
  totalPoints,
  totalTasks,
  nextRelic,
  nextArea,
  isEditingName,
  editingNameValue,
  onEditingNameChange,
  onStartEditingName,
  onSaveRoomName,
  onCancelEditingName,
  onShowShareModal,
  onOpenPlayerModal,
  presenceOthers,
  presenceColor,
  presenceName,
  onPresenceNameChange,
}: RouteHeaderProps) {
  return (
    <div className="border-b border-[var(--border-strong)] bg-[var(--bg-elevated)] px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div suppressHydrationWarning>
            {isEditingName ? (
              <input
                type="text"
                value={editingNameValue}
                onChange={(e) => onEditingNameChange(e.target.value)}
                onBlur={onSaveRoomName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveRoomName();
                  if (e.key === 'Escape') onCancelEditingName();
                }}
                autoFocus
                maxLength={50}
                className="text-2xl font-bold tracking-tight bg-[var(--bg-surface)] border border-[var(--gold)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none"
              />
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl font-bold tracking-tight">
                  {roomName}
                </h1>
                {mounted && isAdmin && (
                  <button
                    onClick={onStartEditingName}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--bg-surface)] rounded"
                    title="Edit route name"
                  >
                    <Pencil size={16} className="text-[var(--text-tertiary)]" />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-standard)]" suppressHydrationWarning>
              <div className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-[var(--gold)]' : 'bg-[var(--steel)]'}`}></div>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {mounted && (isAdmin ? 'ADMIN' : 'VIEW-ONLY')}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm font-mono font-semibold">
              <span className="text-[var(--crimson)]" suppressHydrationWarning>
                {totalPoints.toLocaleString()}
              </span>
              <span className="text-[var(--text-tertiary)]">pts</span>
              <div className="w-px h-4 bg-[var(--border-standard)]"></div>
              <span className="text-[var(--gold)]">
                {totalTasks}
              </span>
              <span className="text-[var(--text-tertiary)]">tasks</span>
            </div>

            <div className="flex items-center gap-4 pl-4 border-l border-[var(--border-standard)]">
              {nextRelic && (
                <div className="flex flex-col gap-1 min-w-[140px]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--crimson)] font-semibold">
                      {nextRelic.label}
                    </span>
                    <span className="text-[var(--text-tertiary)] font-mono text-[10px]">
                      {nextRelic.remaining} pts
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-[var(--crimson)] to-[var(--crimson-light)] rounded-full transition-all duration-500 ease-out ${
                        nextRelic.percentage >= 90 ? 'animate-pulse' : ''
                      }`}
                      style={{ width: `${Math.min(nextRelic.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {nextArea && (
                <div className="flex flex-col gap-1 min-w-[140px]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--gold)] font-semibold">
                      {nextArea.label}
                    </span>
                    <span className="text-[var(--text-tertiary)] font-mono text-[10px]">
                      {nextArea.remaining} tasks
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] rounded-full transition-all duration-500 ease-out ${
                        nextArea.percentage >= 90 ? 'animate-pulse' : ''
                      }`}
                      style={{ width: `${Math.min(nextArea.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {mounted && (
            <PresenceAvatars
              others={presenceOthers}
              selfColor={presenceColor}
              selfName={presenceName}
              onNameChange={onPresenceNameChange}
            />
          )}
        <div className="flex gap-2" suppressHydrationWarning>
          {mounted && isAdmin && (
            <>
              <button
                onClick={onShowShareModal}
                className="px-3 py-1.5 rounded-md bg-[var(--gold)] hover:bg-[var(--gold-deep)] text-white text-sm font-semibold transition-colors"
                title="Share route"
              >
                Share
              </button>
              <button
                onClick={onOpenPlayerModal}
                className="px-3 py-1.5 rounded-md bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-standard)] text-[var(--text-primary)] text-sm font-semibold transition-colors"
                title="Manage Players"
              >
                Players
              </button>
            </>
          )}
          <ThemeToggle />
        </div>
        </div>
      </div>
    </div>
  );
}
