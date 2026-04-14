'use client';

import { useEffect, useRef } from 'react';
import { Plus, BookOpen } from 'lucide-react';

export interface TaskContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddCustomTask: () => void;
  onAddLibraryTask: () => void;
}

export default function TaskContextMenu({
  x,
  y,
  onClose,
  onAddCustomTask,
  onAddLibraryTask,
}: TaskContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Viewport boundary detection + close on scroll/resize/click-outside/Escape
  useEffect(() => {
    const menu = menuRef.current;
    if (menu) {
      const rect = menu.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (x + rect.width > vw) {
        menu.style.left = `${vw - rect.width - 8}px`;
      }
      if (y + rect.height > vh) {
        menu.style.top = `${vh - rect.height - 8}px`;
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleDismiss() {
      onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [onClose, x, y]);

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: y, left: x, zIndex: 100 }}
      className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg shadow-2xl py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        onClick={() => { onAddCustomTask(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
      >
        <Plus size={14} className="text-[var(--gold)] flex-shrink-0" />
        Add Custom Task
      </button>
      <button
        onClick={() => { onAddLibraryTask(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors text-left"
      >
        <BookOpen size={14} className="text-[var(--crimson)] flex-shrink-0" />
        Add Library Task
      </button>
    </div>
  );
}
