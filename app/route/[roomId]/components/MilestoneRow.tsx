'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Milestone } from '@/lib/milestones';
import { OfficialRelic, OfficialRegion, MilestoneSelections } from '@/types';

export interface MilestoneRowProps {
  milestone: Milestone;
  playerIds: string[];
  playerNames: Record<string, string>;
  milestonePlayerState: Record<string, Record<string, boolean>>;
  milestoneSelections: MilestoneSelections;
  relics: OfficialRelic[];
  regions: OfficialRegion[];
  isAdmin: boolean;
  mounted: boolean;
  onToggleMilestoneCheckbox: (milestoneId: string, playerId: string) => void;
  onMilestoneSelection: (milestoneId: string, selectedId: number | null) => void;
}

const MilestoneRow = memo(function MilestoneRow({
  milestone,
  playerIds,
  milestonePlayerState,
  milestoneSelections,
  relics,
  regions,
  isAdmin,
  mounted,
  onToggleMilestoneCheckbox,
  onMilestoneSelection
}: MilestoneRowProps) {
  const [bouncingCheckbox, setBouncingCheckbox] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleCheckboxToggle = useCallback((milestoneId: string, playerId: string) => {
    const checkboxKey = `${milestoneId}-${playerId}`;
    setBouncingCheckbox(checkboxKey);
    onToggleMilestoneCheckbox(milestoneId, playerId);
    setTimeout(() => setBouncingCheckbox(null), 400);
  }, [onToggleMilestoneCheckbox]);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [popoverOpen]);

  const isRelic = milestone.type === 'relic';
  const thresholdText = isRelic
    ? `${milestone.threshold} pts`
    : `${milestone.threshold} tasks`;

  const options = isRelic
    ? relics.filter(r => r.tier === milestone.tier)
    : regions;

  const selectedId = milestoneSelections[milestone.id] || null;
  const selectedItem = selectedId
    ? options.find(opt => opt.id === selectedId)
    : null;

  const placeholder = isRelic ? 'Select Relic...' : 'Select Region...';

  return (
    <div className="bg-gradient-to-r from-[var(--milestone-glow)] to-transparent border-l-2 border-[var(--crimson)] rounded-md p-1.5 flex gap-2 items-center transition-all duration-200 hover:shadow-lg hover:shadow-[var(--crimson)]/30 hover:-translate-y-1">
      {isAdmin && <div className="w-[14px] flex-shrink-0"></div>}

      <div className="flex-1 min-w-0 flex items-center gap-2">
        {!isRelic && (
          <div className="flex-shrink-0 w-6 h-6 rounded bg-gradient-to-br from-[var(--gold)] to-[var(--gold-deep)] flex items-center justify-center text-xs">
            🗺
          </div>
        )}

        <span className="font-bold text-sm text-[var(--text-primary)]">
          {milestone.label}
        </span>

        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-[var(--success)] text-white">
          UNLOCKED
        </span>

        <span className="text-xs font-mono text-[var(--text-tertiary)]">
          ({thresholdText})
        </span>

        <div className="ml-auto relative">
          <button
            ref={buttonRef}
            onClick={() => setPopoverOpen(!popoverOpen)}
            disabled={!isAdmin}
            className="flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border-standard)] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--gold)] focus:outline-none focus:border-[var(--gold)]"
          >
            <span className={selectedItem ? 'text-[var(--gold)]' : 'text-[var(--text-tertiary)]'}>
              {selectedItem ? selectedItem.name : placeholder}
            </span>
          </button>

          {popoverOpen && (
            <div
              ref={popoverRef}
              className="absolute top-full left-0 mt-1 min-w-[220px] max-h-[280px] overflow-y-auto bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg shadow-xl z-50"
            >
              {options.map((opt) => {
                const isSelected = opt.id === selectedId;
                const relic = isRelic ? (opt as OfficialRelic) : null;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      onMilestoneSelection(milestone.id, isSelected ? null : opt.id);
                      setPopoverOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-[var(--bg-hover)] ${
                      isSelected ? 'text-[var(--gold)] font-bold' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{opt.name}</div>
                      {relic?.description && (
                        <div className="text-[var(--text-tertiary)] text-[10px] mt-0.5 leading-tight">
                          {relic.description}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="flex-shrink-0 text-[var(--gold)]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0" style={{ width: '52px' }}></div>

      {playerIds.length > 0 && (
        <div className="flex gap-2.5">
          {playerIds.map((playerId) => {
            const state = milestonePlayerState[milestone.id]?.[playerId] || false;
            const checkboxKey = `${milestone.id}-${playerId}`;
            const isBouncing = bouncingCheckbox === checkboxKey;
            return (
              <div key={playerId} className="w-12 flex justify-center">
                <input
                  type="checkbox"
                  checked={state}
                  onChange={() => handleCheckboxToggle(milestone.id, playerId)}
                  disabled={!isAdmin}
                  className={`${
                    isBouncing ? 'animate-checkbox-bounce' : ''
                  } ${
                    isAdmin
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed opacity-60'
                  }`}
                />
              </div>
            );
          })}
        </div>
      )}

      {mounted && isAdmin && <div className="w-5 flex-shrink-0"></div>}
    </div>
  );
});

export default MilestoneRow;
