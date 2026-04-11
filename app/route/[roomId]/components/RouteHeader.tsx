'use client';

import { Pencil, HelpCircle, Home, Settings, Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import PresenceAvatars from './PresenceAvatars';
import BroadcastStatus from './BroadcastStatus';
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
  totalPactPoints: number;
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
  onStartTour: () => void;
  presenceOthers: PresenceUser[];
  presenceColor: string;
  presenceName: string;
  onPresenceNameChange?: (name: string) => void;
  canBroadcast?: boolean;
  queuePosition?: number;
  totalAdmins?: number;
  hasPremium?: boolean;
}

export default function RouteHeader({
  roomName,
  isAdmin,
  mounted,
  totalPoints,
  totalTasks,
  totalPactPoints,
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
  onStartTour,
  presenceOthers,
  presenceColor,
  presenceName,
  onPresenceNameChange,
  canBroadcast = false,
  queuePosition = 0,
  totalAdmins = 0,
  hasPremium = false,
}: RouteHeaderProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
              <div>
                <div className="flex items-center gap-2 group">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {roomName}
                  </h1>
                  <button
                    onClick={onStartEditingName}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--bg-surface)] rounded"
                    title="Edit route name"
                    style={{ visibility: mounted && isAdmin ? 'visible' : 'hidden' }}
                  >
                    <Pencil size={16} className="text-[var(--text-tertiary)]" />
                  </button>
                </div>
                {/* Status badges under the name */}
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-standard)]">
                    <div className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-[var(--gold)]' : 'bg-[var(--steel)]'}`}></div>
                    <span className="text-xs font-semibold text-[var(--text-secondary)]" suppressHydrationWarning>
                      {mounted ? (isAdmin ? 'ADMIN' : 'VIEW-ONLY') : ''}
                    </span>
                  </div>

                  <div style={{ visibility: mounted && isAdmin ? 'visible' : 'hidden' }}>
                    <BroadcastStatus
                      canBroadcast={canBroadcast}
                      queuePosition={queuePosition}
                      totalAdmins={totalAdmins}
                      hasPremium={hasPremium}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">

            <div className="flex items-center gap-4 pl-4 border-l border-[var(--border-standard)]">
              {/* Points Progress */}
              {nextRelic && (
                <div className="flex flex-col gap-1 min-w-[140px]">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-0.5">
                      {nextRelic.label}
                    </span>
                    <span className="text-xs text-[var(--crimson)] font-mono font-bold" suppressHydrationWarning>
                      {totalPoints.toLocaleString()}/{(totalPoints + nextRelic.remaining).toLocaleString()} points
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

              {/* Tasks Progress */}
              {nextArea && (
                <div className="flex flex-col gap-1 min-w-[130px]">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-0.5">
                      {nextArea.label}
                    </span>
                    <span className="text-xs text-[var(--gold)] font-mono font-bold" suppressHydrationWarning>
                      {totalTasks}/{totalTasks + nextArea.remaining} tasks
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

              {/* Pact Progress */}
              <div className="flex flex-col gap-1 min-w-[140px]">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-0.5">
                    Demonic Pacts
                  </span>
                  <span className="text-xs text-violet-500 font-mono font-bold" suppressHydrationWarning>
                    {totalPactPoints}/40 pacts
                  </span>
                </div>
                <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-500 ease-out ${
                      totalPactPoints >= 36 ? 'animate-pulse' : ''
                    }`}
                    style={{ width: `${Math.min((totalPactPoints / 40) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>
            <PresenceAvatars
              others={presenceOthers}
              selfColor={presenceColor}
              selfName={presenceName}
              onNameChange={onPresenceNameChange}
            />
          </div>
        <div className="flex gap-2">
          <button
            onClick={onShowShareModal}
            data-tour="share-button"
            className="px-3 py-1.5 rounded-md bg-[var(--gold)] hover:bg-[var(--gold-deep)] text-white text-sm font-semibold transition-colors"
            title="Share route"
            style={{ visibility: mounted && isAdmin ? 'visible' : 'hidden' }}
          >
            Share
          </button>
          <button
            onClick={onOpenPlayerModal}
            data-tour="players-button"
            className="px-3 py-1.5 rounded-md bg-[var(--bg-surface)} hover:bg-[var(--bg-hover)] border border-[var(--border-standard)] text-[var(--text-primary)] text-sm font-semibold transition-colors"
            title="Manage Players"
            style={{ visibility: mounted && isAdmin ? 'visible' : 'hidden' }}
          >
            Players
          </button>

          {/* Settings Dropdown */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-1.5 rounded-md hover:bg-[var(--bg-surface)] transition-colors"
              title="Settings"
            >
              <Settings size={18} className="text-[var(--text-tertiary)]" />
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-elevated)] border border-[var(--border-standard)] rounded-lg shadow-lg overflow-hidden z-50">
                <button
                  onClick={() => {
                    router.push('/');
                    setIsSettingsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-3"
                >
                  <Home size={16} className="text-[var(--text-tertiary)]" />
                  <span className="text-[var(--text-primary)]">Back to Home</span>
                </button>

                <button
                  onClick={toggleTheme}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-3"
                  data-tour="theme-toggle"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun size={16} className="text-[var(--text-tertiary)]" />
                      <span className="text-[var(--text-primary)]">Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon size={16} className="text-[var(--text-tertiary)]" />
                      <span className="text-[var(--text-primary)]">Dark Mode</span>
                    </>
                  )}
                </button>

                {mounted && isAdmin && (
                  <button
                    onClick={() => {
                      onStartTour();
                      setIsSettingsOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-3"
                  >
                    <HelpCircle size={16} className="text-[var(--text-tertiary)]" />
                    <span className="text-[var(--text-primary)]">Start Tour</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
