'use client';

import { useState, useEffect, useRef } from 'react';

export interface AddCustomTaskModalProps {
  onClose: () => void;
  onInsert: (text: string, position: 'above' | 'below') => void;
}

export default function AddCustomTaskModal({
  onClose,
  onInsert,
}: AddCustomTaskModalProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const canSubmit = text.trim().length > 0 && text.length <= 500;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add Custom Task"
        className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg p-6 w-[400px] shadow-2xl"
      >
        <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">
          Add Custom Task
        </h2>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter task description..."
          maxLength={500}
          rows={3}
          className="w-full bg-[var(--bg-surface)] border border-[var(--border-standard)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold)] transition-colors mb-1 resize-y min-h-[4.5rem]"
        />
        <div className="text-xs text-[var(--text-tertiary)] mb-4 text-right">
          {text.length}/500
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-4 py-2 rounded-md border border-[var(--border-standard)] text-[var(--text-secondary)] text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onInsert(text.trim(), 'above')}
            disabled={!canSubmit}
            className="bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-4 py-2 rounded-md border border-[var(--gold)] text-[var(--gold)] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Insert Above
          </button>
          <button
            onClick={() => onInsert(text.trim(), 'below')}
            disabled={!canSubmit}
            className="bg-[var(--crimson)] hover:bg-[var(--crimson-deep)] px-4 py-2 rounded-md text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Insert Below
          </button>
        </div>
      </div>
    </div>
  );
}
