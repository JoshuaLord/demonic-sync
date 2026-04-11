'use client';

import { useState, useEffect, useRef } from 'react';
import { Lock, Unlock } from 'lucide-react';

export interface PremiumModalProps {
  onClose: () => void;
  onUnlock: (code: string) => Promise<boolean>;
}

export default function PremiumModal({ onClose, onUnlock }: PremiumModalProps) {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError('Please enter a code');
      return;
    }

    setIsValidating(true);
    setError(null);

    const isValid = await onUnlock(code);

    if (isValid) {
      setSuccess(true);
      // Close modal after success animation
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setError('Invalid code. Please try again.');
      setIsValidating(false);
      setCode('');
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onKeyDown={(e) => { if (e.key === 'Escape' && !isValidating) onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget && !isValidating) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Unlock Premium Features"
        className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg p-6 w-[440px] shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-2">
          {success ? (
            <Unlock className="w-6 h-6 text-[var(--success)]" />
          ) : (
            <Lock className="w-6 h-6 text-[var(--gold)]" />
          )}
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {success ? 'Premium Unlocked!' : 'Unlock Premium Features'}
          </h2>
        </div>

        {success ? (
          <div className="py-8 text-center">
            <div className="mb-4 text-[var(--success)] text-4xl">✓</div>
            <p className="text-sm text-[var(--text-secondary)]">
              Live cursor broadcasting is now enabled
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--text-tertiary)] mb-6">
              Enter the premium code to unlock live cursor broadcasting. This enables real-time cursor tracking for all players in this room.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="premium-code"
                  className="block text-sm font-semibold text-[var(--text-secondary)] mb-2"
                >
                  Premium Code
                </label>
                <input
                  ref={inputRef}
                  id="premium-code"
                  type="password"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError(null);
                  }}
                  disabled={isValidating}
                  placeholder="Enter your premium code"
                  className="w-full px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-standard)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--gold)] transition-colors disabled:opacity-50"
                />
                {error && (
                  <p className="mt-2 text-xs text-[var(--crimson)] font-semibold">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isValidating}
                  className="bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-4 py-2 rounded-md border border-[var(--border-standard)] text-[var(--text-primary)] text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isValidating || !code.trim()}
                  className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 px-4 py-2 rounded-md text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      Unlock Premium
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
