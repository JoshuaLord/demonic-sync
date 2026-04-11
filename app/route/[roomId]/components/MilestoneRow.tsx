'use client';

import { memo, useState, useCallback } from 'react';
import { Milestone } from '@/lib/milestones';
import { OfficialRelic, OfficialRegion, MilestoneSelections } from '@/types';
import RelicSelectionModal from './RelicSelectionModal';

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

const RELOADED_RELIC_ID = 19; // ID of the Reloaded relic (Tier 7)

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
  const [modalOpen, setModalOpen] = useState(false);
  const [reloadedModalOpen, setReloadedModalOpen] = useState(false);

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

  const placeholder = isRelic ? 'Select Relic...' : 'Select Region...';

  // Reloaded relic special logic: Check if this is Tier 7 and Reloaded is selected
  const isReloadedSelected = milestone.tier === 7 && selectedId === RELOADED_RELIC_ID;
  const reloadedSelectionId = milestoneSelections['relic_reloaded'] || null;

  // Get available relics for Reloaded selection (T1-T6, excluding already selected ones)
  const getReloadedOptions = (): OfficialRelic[] => {
    if (!isReloadedSelected) return [];

    // Get all T1-T6 relics
    const availableRelics = relics.filter(r => r.tier >= 1 && r.tier <= 6);

    // Exclude relics already selected in their respective tiers
    const selectedRelicIds = Object.entries(milestoneSelections)
      .filter(([key]) => key.startsWith('relic_t'))
      .map(([_, value]) => value);

    return availableRelics.filter(r => !selectedRelicIds.includes(r.id));
  };

  const reloadedOptions = getReloadedOptions();
  const reloadedSelectedItem = reloadedSelectionId
    ? reloadedOptions.find(r => r.id === reloadedSelectionId)
    : null;

  return (
    <div className="bg-gradient-to-r from-[var(--milestone-glow)] to-transparent border-l-2 border-[var(--crimson)] rounded-md p-1.5 flex gap-2 items-center transition-all duration-200 hover:shadow-lg hover:shadow-[var(--crimson)]/30 hover:-translate-y-1">
      <div className="w-[14px] flex-shrink-0" style={{ visibility: mounted && isAdmin ? 'visible' : 'hidden' }}></div>

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
          <button
            onClick={() => setModalOpen(true)}
            disabled={!isAdmin}
            aria-label={`Select ${isRelic ? 'relic' : 'region'} for ${milestone.label}`}
            className="flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border-standard)] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--gold)] focus:outline-none focus:border-[var(--gold)]"
          >
            <span className={selectedItem ? 'text-[var(--gold)]' : 'text-[var(--text-tertiary)]'}>
              {selectedItem ? selectedItem.name : placeholder}
            </span>
          </button>

          <RelicSelectionModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            options={options}
            selectedId={selectedId}
            onSelect={(id) => onMilestoneSelection(milestone.id, id)}
            isRelic={isRelic}
            title={isRelic ? `Select Relic - ${milestone.label}` : `Select Region - ${milestone.label}`}
          />

          {/* Reloaded bonus selection */}
          {isReloadedSelected && (
            <>
              <span className="text-xs text-[var(--text-tertiary)] font-bold">+</span>
              <button
                onClick={() => setReloadedModalOpen(true)}
                disabled={!isAdmin}
                className="flex items-center gap-1.5 bg-[var(--bg-surface)] border-2 border-dashed border-[var(--gold)]/50 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-[var(--gold)] focus:outline-none focus:border-[var(--gold)]"
              >
                <span className={reloadedSelectedItem ? 'text-[var(--gold)]' : 'text-[var(--text-tertiary)]'}>
                  {reloadedSelectedItem ? reloadedSelectedItem.name : 'Bonus Relic...'}
                </span>
              </button>

              <RelicSelectionModal
                isOpen={reloadedModalOpen}
                onClose={() => setReloadedModalOpen(false)}
                options={reloadedOptions}
                selectedId={reloadedSelectionId}
                onSelect={(id) => onMilestoneSelection('relic_reloaded', id)}
                isRelic={true}
                title="Reloaded Bonus - Select from Previous Tiers"
              />
            </>
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

      <div className="w-5 flex-shrink-0" style={{ visibility: mounted && isAdmin ? 'visible' : 'hidden' }}></div>
    </div>
  );
});

export default MilestoneRow;
