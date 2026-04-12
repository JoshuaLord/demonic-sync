'use client';

import { ReactNode, useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

const ARROW_SIZE = 4;
const GAP = 8;

export default function Tooltip({ children, text, position = 'right' }: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - GAP;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + GAP;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - GAP;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + GAP;
        break;
    }

    setCoords({ top, left });
  }, [position]);

  const show = useCallback(() => {
    updatePosition();
    setVisible(true);
  }, [updatePosition]);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  // Recalculate on scroll while visible
  useEffect(() => {
    if (!visible) return;
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [visible, updatePosition]);

  const transformClasses: Record<string, string> = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left: '-translate-y-1/2 -translate-x-full',
    right: '-translate-y-1/2',
  };

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[var(--bg-tooltip)]',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[var(--bg-tooltip)]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[var(--bg-tooltip)]',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[var(--bg-tooltip)]',
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        {children}
      </div>
      {visible && coords &&
        createPortal(
          <div
            className={`fixed pointer-events-none z-[9999] whitespace-nowrap ${transformClasses[position]}`}
            style={{ top: coords.top, left: coords.left }}
          >
            <div className="bg-[var(--bg-tooltip)] text-white text-xs font-medium px-2 py-1 rounded shadow-lg relative">
              {text}
              <div className={`absolute ${arrowClasses[position]} w-0 h-0 border-${ARROW_SIZE}`} />
            </div>
          </div>,
          document.body
        )
      }
    </>
  );
}
