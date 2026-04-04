'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Check, Sparkles, Crown, Flame, Skull } from 'lucide-react';
import { OfficialRelic, OfficialRegion } from '@/types';

interface RelicSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: (OfficialRelic | OfficialRegion)[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  isRelic: boolean;
  title: string;
}

// Tier-specific styling and icons
const getTierConfig = (tier: number) => {
  switch (tier) {
    case 1:
      return { icon: Sparkles, color: 'from-gray-600 to-gray-700', label: 'Tier 1', border: 'border-gray-500' };
    case 2:
      return { icon: Flame, color: 'from-green-600 to-green-700', label: 'Tier 2', border: 'border-green-500' };
    case 3:
      return { icon: Flame, color: 'from-blue-600 to-blue-700', label: 'Tier 3', border: 'border-blue-500' };
    case 4:
      return { icon: Crown, color: 'from-purple-600 to-purple-700', label: 'Tier 4', border: 'border-purple-500' };
    case 5:
      return { icon: Crown, color: 'from-orange-600 to-orange-700', label: 'Tier 5', border: 'border-orange-500' };
    case 6:
      return { icon: Skull, color: 'from-red-600 to-red-700', label: 'Tier 6', border: 'border-red-500' };
    case 7:
      return { icon: Skull, color: 'from-pink-600 to-pink-700', label: 'Tier 7', border: 'border-pink-500' };
    case 8:
      return { icon: Crown, color: 'from-yellow-500 to-amber-600', label: 'Tier 8 - Legendary', border: 'border-yellow-500' };
    default:
      return { icon: Sparkles, color: 'from-gray-600 to-gray-700', label: `Tier ${tier}`, border: 'border-gray-500' };
  }
};

export default function RelicSelectionModal({
  isOpen,
  onClose,
  options,
  selectedId,
  onSelect,
  isRelic,
  title
}: RelicSelectionModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const rect = dialog.getBoundingClientRect();
    const clickedInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!clickedInDialog) {
      onClose();
    }
  };

  const handleSelect = (id: number) => {
    const isSelected = id === selectedId;
    onSelect(isSelected ? null : id);
    onClose();
  };

  // Group relics by tier for visual separation
  const groupedOptions = isRelic
    ? (options as OfficialRelic[]).reduce((acc, relic) => {
        const tier = relic.tier;
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(relic);
        return acc;
      }, {} as Record<number, OfficialRelic[]>)
    : null;

  const renderRelicCard = (relic: OfficialRelic) => {
    const isSelected = relic.id === selectedId;
    const isHovered = hoveredId === relic.id;
    const tierConfig = getTierConfig(relic.tier);
    const TierIcon = tierConfig.icon;

    return (
      <button
        key={relic.id}
        onClick={() => handleSelect(relic.id)}
        onMouseEnter={() => setHoveredId(relic.id)}
        onMouseLeave={() => setHoveredId(null)}
        className={`group relative overflow-hidden rounded-lg border-2 transition-all duration-300 ${
          isSelected
            ? 'border-[var(--gold)] bg-gradient-to-b from-[var(--gold)]/20 via-[var(--gold)]/10 to-transparent shadow-lg shadow-[var(--gold)]/30 scale-105'
            : 'border-[var(--border-standard)] bg-[var(--bg-surface)] hover:border-[var(--gold)]/50 hover:shadow-lg hover:scale-102'
        }`}
      >
        {/* Tier badge */}
        <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r ${tierConfig.color} text-white shadow-md z-10`}>
          <TierIcon size={10} />
          <span>T{relic.tier}</span>
        </div>

        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--gold)] text-white shadow-lg z-10 animate-pulse">
            <Check size={12} strokeWidth={3} />
            <span className="text-[10px] font-bold">SELECTED</span>
          </div>
        )}

        {/* Card content */}
        <div className="p-4 flex flex-col items-center gap-3">
          {/* Icon or fallback */}
          <div className={`relative w-20 h-20 rounded-lg border-2 ${isSelected ? tierConfig.border : 'border-[var(--border-standard)]'} bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden transition-all duration-300 ${isHovered ? 'scale-110 shadow-lg' : ''}`}>
            {relic.icon_url ? (
              <img
                src={relic.icon_url}
                alt={relic.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${tierConfig.color}`}>
                <TierIcon size={32} className="text-white/70" />
              </div>
            )}
          </div>

          {/* Name */}
          <h3 className={`text-sm font-bold text-center leading-tight min-h-[32px] flex items-center px-1 transition-colors ${
            isSelected ? 'text-[var(--gold)]' : 'text-[var(--text-primary)] group-hover:text-[var(--gold)]'
          }`}>
            {relic.name}
          </h3>

          {/* Short description - always visible, expands on hover */}
          {relic.short_description && (
            <div className={`text-xs text-[var(--text-secondary)] leading-snug text-center transition-all duration-300 ${
              isHovered ? 'max-h-32 opacity-100' : 'max-h-12 opacity-70'
            } overflow-hidden`}>
              <p className={isHovered ? 'line-clamp-none' : 'line-clamp-2'}>
                {relic.short_description}
              </p>
            </div>
          )}

          {/* Placeholder for TBA relics */}
          {!relic.short_description && relic.name.includes('TBA') && (
            <p className="text-xs text-[var(--text-tertiary)] italic">
              Coming soon...
            </p>
          )}
        </div>

        {/* Hover glow effect */}
        {isHovered && !isSelected && (
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--gold)]/5 to-transparent pointer-events-none" />
        )}
      </button>
    );
  };

  const renderRegionCard = (region: OfficialRegion) => {
    const isSelected = region.id === selectedId;
    const isHovered = hoveredId === region.id;

    return (
      <button
        key={region.id}
        onClick={() => handleSelect(region.id)}
        onMouseEnter={() => setHoveredId(region.id)}
        onMouseLeave={() => setHoveredId(null)}
        className={`group relative overflow-hidden rounded-lg border-2 transition-all duration-300 ${
          isSelected
            ? 'border-[var(--gold)] bg-gradient-to-b from-[var(--gold)]/20 via-[var(--gold)]/10 to-transparent shadow-lg shadow-[var(--gold)]/30 scale-105'
            : 'border-[var(--border-standard)] bg-[var(--bg-surface)] hover:border-[var(--gold)]/50 hover:shadow-lg hover:scale-102'
        }`}
      >
        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--gold)] text-white shadow-lg z-10 animate-pulse">
            <Check size={12} strokeWidth={3} />
            <span className="text-[10px] font-bold">SELECTED</span>
          </div>
        )}

        <div className="p-4 flex flex-col items-center gap-3">
          {/* Region icon placeholder */}
          <div className={`w-20 h-20 rounded-lg border-2 ${isSelected ? 'border-[var(--gold)]' : 'border-[var(--border-standard)]'} bg-gradient-to-br from-[var(--crimson)]/20 to-[var(--bg-elevated)] flex items-center justify-center text-3xl transition-all duration-300 ${isHovered ? 'scale-110 shadow-lg' : ''}`}>
            🗺️
          </div>

          <h3 className={`text-sm font-bold text-center leading-tight min-h-[32px] flex items-center px-1 transition-colors ${
            isSelected ? 'text-[var(--gold)]' : 'text-[var(--text-primary)] group-hover:text-[var(--gold)]'
          }`}>
            {region.name}
          </h3>

          <p className="text-xs text-[var(--text-tertiary)] italic text-center">
            Unlock this region
          </p>
        </div>

        {/* Hover glow effect */}
        {isHovered && !isSelected && (
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--gold)]/5 to-transparent pointer-events-none" />
        )}
      </button>
    );
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="backdrop:bg-black/80 backdrop:backdrop-blur-sm bg-[var(--bg-base)] border-2 border-[var(--border-strong)] rounded-2xl shadow-2xl p-0 max-w-7xl w-[92vw] max-h-[88vh] overflow-hidden fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      onClose={onClose}
    >
      <div className="flex flex-col h-full">
        {/* Enhanced Header */}
        <div className="relative flex items-center justify-between px-6 py-5 border-b-2 border-[var(--border-strong)] bg-gradient-to-r from-[var(--bg-elevated)] to-[var(--bg-surface)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--gold)] tracking-wide">
              {title}
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {isRelic ? 'Choose your power carefully' : 'Select a region to explore'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all p-2 rounded-lg hover:bg-[var(--bg-hover)] hover:rotate-90 duration-300"
          >
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* Content - Grid Layout */}
        <div className="overflow-y-auto flex-1 p-6">
          {isRelic && groupedOptions ? (
            // Relics grouped by tier
            <div className="space-y-8">
              {Object.entries(groupedOptions)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([tier, relics]) => {
                  const tierConfig = getTierConfig(Number(tier));
                  return (
                    <div key={tier}>
                      {/* Tier header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${tierConfig.color} text-white font-bold text-sm shadow-lg`}>
                          {/* @ts-ignore */}
                          <tierConfig.icon size={16} />
                          <span>{tierConfig.label}</span>
                        </div>
                        <div className="flex-1 h-[2px] bg-gradient-to-r from-[var(--border-strong)] to-transparent" />
                      </div>

                      {/* Tier relics grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {relics.map(renderRelicCard)}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            // Regions simple grid
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {options.map((opt) => renderRegionCard(opt as OfficialRegion))}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
