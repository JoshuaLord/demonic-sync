'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Trophy, Map, Sparkles, Flame, Crown, Skull } from 'lucide-react';
import { RELIC_TIERS, AREA_UNLOCKS } from '@/lib/milestones';
import { OfficialRelic, OfficialRegion, MilestoneSelections } from '@/types';
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

// Tier-specific icons matching RelicSelectionModal
const getTierIcon = (tier: number) => {
  switch (tier) {
    case 1: return Sparkles;
    case 2:
    case 3: return Flame;
    case 4:
    case 5: return Crown;
    case 6:
    case 7: return Skull;
    case 8: return Crown;
    default: return Sparkles;
  }
};

// Tier-specific colors matching RelicSelectionModal
const getTierColor = (tier: number): string => {
  switch (tier) {
    case 1: return 'from-gray-600 to-gray-700';
    case 2: return 'from-green-600 to-green-700';
    case 3: return 'from-blue-600 to-blue-700';
    case 4: return 'from-purple-600 to-purple-700';
    case 5: return 'from-orange-600 to-orange-700';
    case 6: return 'from-red-600 to-red-700';
    case 7: return 'from-pink-600 to-pink-700';
    case 8: return 'from-yellow-500 to-amber-600';
    default: return 'from-gray-600 to-gray-700';
  }
};

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
              const TierIcon = getTierIcon(tier.tier);
              const tierColor = getTierColor(tier.tier);

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
                    selectedRelic
                      ? 'border-[var(--gold)]/50 bg-gradient-to-r from-[var(--gold)]/10 to-transparent'
                      : 'border-[var(--border-standard)] bg-[var(--bg-surface)]'
                  }`}
                >
                  {/* Tier Badge */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-md bg-gradient-to-br ${tierColor} flex items-center justify-center shadow-sm`}>
                    <TierIcon size={16} className="text-white" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {tier.label}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] font-mono">
                        {tier.threshold} pts
                      </span>
                    </div>
                    <div className="text-xs truncate">
                      {selectedRelic ? (
                        <span className="text-[var(--gold)] font-medium">{selectedRelic.name}</span>
                      ) : (
                        <span className="text-[var(--text-muted)] italic">Select...</span>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                    selectedRelic ? 'bg-[var(--gold)]' : 'bg-[var(--border-standard)]'
                  }`} />
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
                    selectedRegion
                      ? 'border-[var(--gold)]/50 bg-gradient-to-r from-[var(--gold)]/10 to-transparent'
                      : 'border-[var(--border-standard)] bg-[var(--bg-surface)]'
                  }`}
                >
                  {/* Map Icon */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gradient-to-br from-[var(--crimson)]/30 to-[var(--crimson)]/10 flex items-center justify-center border border-[var(--border-standard)]">
                    <Map size={16} className="text-[var(--crimson)]" />
                  </div>

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

                  {/* Status Indicator */}
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                    selectedRegion ? 'bg-[var(--gold)]' : 'bg-[var(--border-standard)]'
                  }`} />
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
          title={
            selectedMilestone.isRelic
              ? `Select Relic - ${selectedMilestone.label}`
              : `Select Region - ${selectedMilestone.label}`
          }
        />
      )}
    </div>
  );
}
