'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Check } from 'lucide-react';
import { OfficialRelic, OfficialRegion } from '@/types';
import { toRomanNumeral } from '@/lib/format-utils';

interface RelicSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: (OfficialRelic | OfficialRegion)[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  isRelic: boolean;
  disabledIds?: number[];
  title: string;
}

// Convert name to image filename (matches scraper output)
const nameToFilename = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[']/g, '') // Remove apostrophes
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
};


export default function RelicSelectionModal({
  isOpen,
  onClose,
  options,
  selectedId,
  onSelect,
  isRelic,
  disabledIds = [],
  title
}: RelicSelectionModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

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
    const imagePath = relic.icon_url || `/images/relics/${nameToFilename(relic.name)}.png`;
    const imgFailed = failedImages.has(relic.id);

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
        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--gold)] text-white shadow-lg z-10">
            <Check size={12} strokeWidth={3} />
            <span className="text-[10px] font-bold">SELECTED</span>
          </div>
        )}

        {/* Card content */}
        <div className="p-4 flex flex-col items-center gap-3">
          {/* Relic image or pentagon placeholder */}
          <div className={`relative w-20 h-20 flex items-center justify-center transition-all duration-300 ${isHovered ? 'scale-110' : ''}`}>
            {imgFailed ? (
              <svg className="w-full h-full" viewBox="0 0 80 80" fill="none">
                <polygon
                  points="40,4 76,28 62,72 18,72 4,28"
                  stroke="var(--border-strong)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  fill="none"
                />
              </svg>
            ) : (
              <img
                src={imagePath}
                alt={relic.name}
                className="w-full h-full object-contain"
                onError={() => setFailedImages(prev => new Set(prev).add(relic.id))}
              />
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
    const isDisabled = disabledIds.includes(region.id);
    const isHovered = hoveredId === region.id;
    const imagePath = `/images/regions/${nameToFilename(region.name)}.png`;
    const imgFailed = failedImages.has(region.id);

    return (
      <button
        key={region.id}
        onClick={() => !isDisabled && handleSelect(region.id)}
        onMouseEnter={() => setHoveredId(region.id)}
        onMouseLeave={() => setHoveredId(null)}
        disabled={isDisabled}
        className={`group relative overflow-hidden rounded-lg border-2 transition-all duration-300 ${
          isDisabled
            ? 'border-[var(--border-standard)] bg-[var(--bg-surface)] opacity-40 cursor-not-allowed grayscale'
            : isSelected
              ? 'border-[var(--gold)] bg-gradient-to-b from-[var(--gold)]/20 via-[var(--gold)]/10 to-transparent shadow-lg shadow-[var(--gold)]/30 scale-105'
              : 'border-[var(--border-standard)] bg-[var(--bg-surface)] hover:border-[var(--gold)]/50 hover:shadow-lg hover:scale-102'
        }`}
      >
        {/* Selected badge */}
        {isSelected && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--gold)] text-white shadow-lg z-10">
            <Check size={12} strokeWidth={3} />
            <span className="text-[10px] font-bold">SELECTED</span>
          </div>
        )}

        <div className="p-4 flex flex-col items-center gap-3">
          {/* Region image or rounded square placeholder */}
          <div className={`relative w-20 h-20 flex items-center justify-center transition-all duration-300 ${isHovered && !isDisabled ? 'scale-110' : ''}`}>
            {imgFailed ? (
              <div className="w-full h-full rounded-lg border-2 border-dashed border-[var(--border-strong)]" />
            ) : (
              <img
                src={imagePath}
                alt={region.name}
                className="w-full h-full object-contain"
                onError={() => setFailedImages(prev => new Set(prev).add(region.id))}
              />
            )}
          </div>

          <h3 className={`text-sm font-bold text-center leading-tight min-h-[32px] flex items-center px-1 transition-colors ${
            isDisabled ? 'text-[var(--text-tertiary)]' : isSelected ? 'text-[var(--gold)]' : 'text-[var(--text-primary)] group-hover:text-[var(--gold)]'
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
      className="backdrop:bg-black/80 backdrop:backdrop-blur-sm bg-[var(--bg-base)] border-2 border-[var(--border-strong)] rounded-2xl shadow-2xl p-0 max-w-3xl w-[85vw] max-h-[80vh] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0"
      onClose={onClose}
    >
      <div className="flex flex-col max-h-[80vh]">
        {/* Enhanced Header */}
        <div className="relative flex items-center justify-between px-6 py-5 border-b-2 border-[var(--border-strong)] bg-gradient-to-r from-[var(--bg-elevated)] to-[var(--bg-surface)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--crimson)] tracking-wide">
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
                  return (
                    <div key={tier}>
                      {/* Tier label */}
                      <h3 className="text-sm font-bold text-[var(--text-secondary)] mb-3">
                        Tier {toRomanNumeral(Number(tier))}
                      </h3>

                      {/* Tier relics grid */}
                      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                        {relics.map(renderRelicCard)}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            // Regions simple grid
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              {options.map((opt) => renderRegionCard(opt as OfficialRegion))}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
