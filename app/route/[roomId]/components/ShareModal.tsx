'use client';

import { useEffect, useRef } from 'react';
import { Waves } from 'lucide-react';

export interface ShareModalProps {
  copiedLink: 'admin' | 'view' | null;
  onCopyAdminLink: () => void;
  onCopyViewOnlyLink: () => void;
  onClose: () => void;
  hasPremium?: boolean;
  onUnlockPremium?: () => void;
}

export default function ShareModal({
  copiedLink,
  onCopyAdminLink,
  onCopyViewOnlyLink,
  onClose,
  hasPremium = true,
  onUnlockPremium,
}: ShareModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-focus first button on mount
    const firstButton = dialogRef.current?.querySelector('button');
    firstButton?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Share Route"
        className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg p-6 w-[440px] shadow-2xl"
      >
        <h2 className="text-xl font-bold mb-2 text-[var(--text-primary)]">
          Share Route
        </h2>
        <p className="text-sm text-[var(--text-tertiary)] mb-6">
          Click to copy a link to your clipboard
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={onCopyAdminLink}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              copiedLink === 'admin'
                ? 'border-[var(--success)] bg-[var(--success)]/10'
                : 'border-[var(--border-standard)] bg-[var(--bg-surface)] hover:border-[var(--gold)] hover:bg-[var(--gold)]/5'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    Admin Link
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[var(--gold)]/20 text-[var(--gold)]">
                    FULL ACCESS
                  </span>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Anyone with this link can edit the route
                </p>
              </div>
              <div className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                copiedLink === 'admin'
                  ? 'bg-[var(--success)] text-white'
                  : 'bg-[var(--gold)] text-white'
              }`}>
                {copiedLink === 'admin' ? 'Copied!' : 'Copy'}
              </div>
            </div>
          </button>

          <button
            onClick={onCopyViewOnlyLink}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              copiedLink === 'view'
                ? 'border-[var(--success)] bg-[var(--success)]/10'
                : 'border-[var(--border-standard)] bg-[var(--bg-surface)] hover:border-[var(--steel)] hover:bg-[var(--steel)]/5'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    View-Only Link
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-[var(--steel)]/20 text-[var(--steel)]">
                    READ ONLY
                  </span>
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Anyone with this link can view the route
                </p>
              </div>
              <div className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                copiedLink === 'view'
                  ? 'bg-[var(--success)] text-white'
                  : 'bg-[var(--steel)] text-white'
              }`}>
                {copiedLink === 'view' ? 'Copied!' : 'Copy'}
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-between items-center">
          {!hasPremium && onUnlockPremium ? (
            <button
              onClick={() => {
                onUnlockPremium();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-standard)] text-[var(--text-tertiary)] text-xs font-semibold transition-colors"
              title="Enable live cursor broadcasting"
            >
              <Waves className="w-3.5 h-3.5" />
              Enable Cursors
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-4 py-2 rounded-md border border-[var(--border-standard)] text-[var(--text-primary)] text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
