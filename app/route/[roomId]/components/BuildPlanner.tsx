'use client';

import { useState } from 'react';
import { Trophy, Map } from 'lucide-react';
import { RELIC_TIERS, AREA_UNLOCKS } from '@/lib/milestones';
import { OfficialRelic, OfficialRegion, MilestoneSelections } from '@/types';
import { toRomanNumeral } from '@/lib/format-utils';
import RelicSelectionModal from './RelicSelectionModal';

interface BuildPlannerProps {
  relics: OfficialRelic[];
  regions: OfficialRegion[];
  milestoneSelections: MilestoneSelections;
  isAdmin: boolean;
  onMilestoneSelection: (milestoneId: string, selectedId: number | null) => void;
  onCollapse?: () => void;
  position?: 'sidebar' | 'bottom';
}

// Convert name to image filename (matches scraper output)
const nameToFilename = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

const RELOADED_RELIC_ID = 19; // ID of the Reloaded relic (Tier 7)


export default function BuildPlanner({
  relics,
  regions,
  milestoneSelections,
  isAdmin,
  onMilestoneSelection,
  onCollapse,
  position = 'sidebar',
}: BuildPlannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [reloadedModalOpen, setReloadedModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<{
    id: string;
    tier: number;
    isRelic: boolean;
    label: string;
  } | null>(null);

  const openModal = (milestoneId: string, tier: number, isRelic: boolean, label: string) => {
    setSelectedMilestone({ id: milestoneId, tier, isRelic, label });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedMilestone(null);
  };

  const handleSelect = (id: number | null) => {
    if (selectedMilestone) {
      onMilestoneSelection(selectedMilestone.id, id);

      // Check if Reloaded was just selected
      if (selectedMilestone.tier === 7 && id === RELOADED_RELIC_ID) {
        closeModal(); // Close primary modal
        setTimeout(() => setReloadedModalOpen(true), 100); // Open bonus modal after brief delay
        return;
      }

      // Check if changing FROM Reloaded - clear bonus selection
      const currentSelection = milestoneSelections[selectedMilestone.id];
      if (selectedMilestone.tier === 7 && currentSelection === RELOADED_RELIC_ID && id !== RELOADED_RELIC_ID) {
        onMilestoneSelection('relic_reloaded', null); // Clear bonus selection
      }

      closeModal(); // Normal close for non-Reloaded selections
    }
  };

  // Get options for the modal
  const getModalOptions = () => {
    if (!selectedMilestone) return [];
    if (selectedMilestone.isRelic) {
      return relics.filter(r => r.tier === selectedMilestone.tier);
    }
    return regions;
  };

  const modalOptions = getModalOptions();
  const modalSelectedId = selectedMilestone ? milestoneSelections[selectedMilestone.id] || null : null;

  // For regions, collect IDs already selected in OTHER area unlock slots
  const getDisabledIds = (): number[] => {
    if (!selectedMilestone || selectedMilestone.isRelic) return [];
    return AREA_UNLOCKS
      .map(a => `area_u${a.tier}`)
      .filter(id => id !== selectedMilestone.id)
      .map(id => milestoneSelections[id])
      .filter((id): id is number => id != null);
  };
  const modalDisabledIds = getDisabledIds();

  // Get available relics for Reloaded selection (T1-T6, excluding already selected ones)
  const getReloadedOptions = (): OfficialRelic[] => {
    // Get all T1-T6 relics
    const availableRelics = relics.filter(r => r.tier >= 1 && r.tier <= 6);

    // Exclude relics already selected in their respective tiers
    const selectedRelicIds = Object.entries(milestoneSelections)
      .filter(([key]) => key.startsWith('relic_t'))
      .map(([_, value]) => value);

    return availableRelics.filter(r => !selectedRelicIds.includes(r.id));
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)]">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-standard)]">
        <p className="text-xs text-[var(--text-tertiary)]">
          Plan your relics and region unlocks
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Relics Section */}
        <div>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border-subtle)]">
            <Trophy size={16} className="text-[var(--crimson)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Relics</h3>
            <span className="text-xs text-[var(--text-tertiary)]">(8 Tiers)</span>
          </div>

          <div className="space-y-2">
            {RELIC_TIERS.map((tier) => {
              const milestoneId = `relic_t${tier.tier}`;
              const selectedId = milestoneSelections[milestoneId] || null;
              const selectedRelic = selectedId ? relics.find(r => r.id === selectedId) : null;
              const isSelected = !!selectedRelic;

              return (
                <button
                  key={milestoneId}
                  onClick={() => openModal(milestoneId, tier.tier, true, tier.label)}
                  disabled={!isAdmin}
                  className={`w-full flex items-center gap-2 p-2.5 rounded-lg border transition-all duration-200 ${
                    isAdmin
                      ? 'hover:border-[var(--gold)] hover:shadow-md hover:scale-[1.02] cursor-pointer'
                      : 'opacity-60 cursor-not-allowed'
                  } ${
                    isSelected
                      ? 'border-[var(--gold)]/50 bg-[var(--gold)]/10'
                      : 'border-[var(--border-standard)] bg-[var(--bg-surface)]'
                  }`}
                >
                  {/* Relic icon - pentagon placeholder when empty, relic image when selected */}
                  {selectedRelic ? (
                    <img
                      src={selectedRelic.icon_url || `/images/relics/${nameToFilename(selectedRelic.name)}.png`}
                      alt={selectedRelic.name}
                      className="flex-shrink-0 w-10 h-10 object-contain"
                    />
                  ) : (
                    <svg className="flex-shrink-0 w-10 h-10" viewBox="0 0 40 40" fill="none">
                      <polygon
                        points="20,2 38,14 31,36 9,36 2,14"
                        stroke="var(--border-strong)"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                        fill="none"
                      />
                    </svg>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        Relic Tier {toRomanNumeral(tier.tier)}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] font-mono">
                        {tier.threshold} pts
                      </span>
                    </div>
                    <div className="text-xs truncate">
                      {selectedRelic ? (
                        <>
                          <span className="text-[var(--gold)] font-medium">{selectedRelic.name}</span>
                          {selectedRelic.id === RELOADED_RELIC_ID && milestoneSelections['relic_reloaded'] && (
                            <>
                              {' + '}
                              <span className="text-[var(--gold)]/80 font-medium">
                                {relics.find(r => r.id === milestoneSelections['relic_reloaded'])?.name || 'Bonus'}
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-[var(--text-muted)] italic">Select...</span>
                      )}
                    </div>
                  </div>

                </button>
              );
            })}
          </div>
        </div>

        {/* Regions Section */}
        <div>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border-subtle)]">
            <Map size={16} className="text-[var(--crimson)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Regions</h3>
            <span className="text-xs text-[var(--text-tertiary)]">(3 Unlocks)</span>
          </div>

          <div className="space-y-2">
            {AREA_UNLOCKS.map((area) => {
              const milestoneId = `area_u${area.tier}`;
              const selectedId = milestoneSelections[milestoneId] || null;
              const selectedRegion = selectedId ? regions.find(r => r.id === selectedId) : null;
              const isSelected = !!selectedRegion;

              return (
                <button
                  key={milestoneId}
                  onClick={() => openModal(milestoneId, area.tier, false, area.label)}
                  disabled={!isAdmin}
                  className={`w-full flex items-center gap-2 p-2.5 rounded-lg border transition-all duration-200 ${
                    isAdmin
                      ? 'hover:border-[var(--gold)] hover:shadow-md hover:scale-[1.02] cursor-pointer'
                      : 'opacity-60 cursor-not-allowed'
                  } ${
                    isSelected
                      ? 'border-[var(--gold)]/50 bg-[var(--gold)]/10'
                      : 'border-[var(--border-standard)] bg-[var(--bg-surface)]'
                  }`}
                >
                  {/* Region icon - rounded square placeholder when empty, region image when selected */}
                  {selectedRegion ? (
                    <img
                      src={`/images/regions/${nameToFilename(selectedRegion.name)}.png`}
                      alt={selectedRegion.name}
                      className="flex-shrink-0 w-10 h-10 object-contain"
                    />
                  ) : (
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg border-2 border-dashed border-[var(--border-strong)]" />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {area.label}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] font-mono">
                        {area.threshold} tasks
                      </span>
                    </div>
                    <div className="text-xs truncate">
                      {selectedRegion ? (
                        <span className="text-[var(--gold)] font-medium">{selectedRegion.name}</span>
                      ) : (
                        <span className="text-[var(--text-muted)] italic">Select...</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selection Modal */}
      {selectedMilestone && (
        <RelicSelectionModal
          isOpen={modalOpen}
          onClose={closeModal}
          options={modalOptions}
          selectedId={modalSelectedId}
          onSelect={handleSelect}
          isRelic={selectedMilestone.isRelic}
          disabledIds={modalDisabledIds}
          title={
            selectedMilestone.isRelic
              ? `Select Relic - Tier ${toRomanNumeral(selectedMilestone.tier)}`
              : `Select Region - ${selectedMilestone.label}`
          }
        />
      )}

      {/* Reloaded bonus relic modal */}
      <RelicSelectionModal
        isOpen={reloadedModalOpen}
        onClose={() => setReloadedModalOpen(false)}
        options={getReloadedOptions()}
        selectedId={milestoneSelections['relic_reloaded'] || null}
        onSelect={(id) => {
          onMilestoneSelection('relic_reloaded', id);
          setReloadedModalOpen(false);
        }}
        isRelic={true}
        title="Reloaded Bonus - Select from Tiers I-VI"
      />
    </div>
  );
}
