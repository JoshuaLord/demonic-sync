'use client';

import { memo, useState, useCallback } from 'react';
import { Milestone } from '@/lib/milestones';
import { OfficialRelic, OfficialRegion, MilestoneSelections } from '@/types';

type PlayerNames = Record<string, string>;

export interface MilestoneRowProps {
  milestone: Milestone;
  playerIds: string[];
  playerNames: PlayerNames;
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
  playerNames,
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

  const handleCheckboxToggle = useCallback((milestoneId: string, playerId: string) => {
    const checkboxKey = `${milestoneId}-${playerId}`;
    setBouncingCheckbox(checkboxKey);
    onToggleMilestoneCheckbox(milestoneId, playerId);
    setTimeout(() => setBouncingCheckbox(null), 400);
  }, [onToggleMilestoneCheckbox]);

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

  return (
    <div className="bg-gradient-to-r from-[var(--crimson-glow)] to-transparent border-l-2 border-[var(--crimson)] rounded-md p-1.5 flex gap-2 items-center transition-all duration-200 hover:shadow-lg hover:shadow-[var(--crimson)]/30 hover:-translate-y-1">
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

        <div className="ml-auto flex items-center gap-2">
          {selectedItem && (
            <span className="text-xs text-[var(--gold)] font-bold">
              {selectedItem.name}
            </span>
          )}
          <select
            value={selectedId || ''}
            onChange={(e) => {
              const value = e.target.value;
              onMilestoneSelection(
                milestone.id,
                value === '' ? null : parseInt(value, 10)
              );
            }}
            disabled={!isAdmin}
            className="w-36 bg-[var(--bg-surface)] border border-[var(--border-standard)] rounded-md px-2 py-1 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {isRelic ? 'Select Relic...' : 'Select Region...'}
            </option>
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
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
