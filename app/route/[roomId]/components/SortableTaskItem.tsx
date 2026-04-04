'use client';

import { memo, useState, useCallback } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { RouteStep } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type PlayerNames = Record<string, string>;

export interface SortableTaskItemProps {
  step: RouteStep;
  playerIds: string[];
  playerNames: PlayerNames;
  isAdmin: boolean;
  mounted: boolean;
  deleteClickedId: string | null;
  cumulativePoints: number;
  cumulativeTasks: number;
  onToggleCheckbox: (stepId: string, playerId: string) => void;
  onDelete: (stepId: string) => void;
  onDeleteClick: (stepId: string) => void;
  completedSteps: Set<string>;
  isInsertAnimating?: boolean;
  isPreviewStep?: boolean;
}

const SortableTaskItem = memo(function SortableTaskItem({
  step,
  playerIds,
  playerNames,
  isAdmin,
  mounted,
  deleteClickedId,
  cumulativePoints,
  cumulativeTasks,
  onToggleCheckbox,
  onDelete,
  onDeleteClick,
  completedSteps,
  isInsertAnimating,
  isPreviewStep,
}: SortableTaskItemProps) {
  const [bouncingCheckbox, setBouncingCheckbox] = useState<string | null>(null);

  const handleCheckboxToggle = useCallback((stepId: string, playerId: string) => {
    const checkboxKey = `${stepId}-${playerId}`;
    setBouncingCheckbox(checkboxKey);
    onToggleCheckbox(stepId, playerId);
    setTimeout(() => setBouncingCheckbox(null), 400);
  }, [onToggleCheckbox]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: step.id,
    disabled: !isAdmin || !!isPreviewStep,
    transition: {
      duration: 250,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isComplete = playerIds.length > 0 && playerIds.every((playerId) => {
    const state = (step.player_state as Record<string, boolean | null>)[playerId];
    return state === true;
  });
  const wasJustCompleted = completedSteps.has(step.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="route-task-item"
      {...(isPreviewStep ? {} : attributes)}
      {...(isPreviewStep ? {} : listeners)}
      className={`rounded-md p-1.5 flex gap-2 items-center group ${
        isPreviewStep
          ? 'border-2 border-dashed border-[var(--gold)] bg-[var(--gold)]/5 opacity-80'
          : isDragging
          ? 'bg-[var(--gold)]/10 border-2 border-[var(--gold)] shadow-lg shadow-[var(--gold)]/30 z-10 dragging opacity-50'
          : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-[border-color,box-shadow] duration-200 task-card-hover'
      } ${
        !isPreviewStep && isAdmin && !isDragging
          ? 'hover:border-[var(--gold)] hover:shadow-lg hover:shadow-[var(--gold)]/20 cursor-pointer'
          : !isPreviewStep && isAdmin
          ? 'cursor-grabbing'
          : !isPreviewStep
          ? 'cursor-default'
          : ''
      } ${
        wasJustCompleted ? 'animate-completion-flash' : ''
      } ${
        isComplete && !isPreviewStep ? 'opacity-70' : ''
      } ${
        isInsertAnimating ? 'animate-task-insert' : ''
      }`}
    >
      {isAdmin && !isPreviewStep && (
        <div className="text-[var(--text-tertiary)] group-hover:text-[var(--gold)] flex-shrink-0 transition-colors duration-200 pointer-events-none">
          <GripVertical size={14} />
        </div>
      )}

      <div className="flex-1 min-w-0 flex items-center gap-2">
        {step.step_type === 'custom' ? (
          <div className="text-sm truncate text-[var(--text-primary)] font-medium italic">{step.custom_text}</div>
        ) : (
          <>
            {(step as any).task_tier && (
              <>
                <span
                  className={`w-14 px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 text-center ${
                    (step as any).task_tier === 'Easy'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : (step as any).task_tier === 'Medium'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : (step as any).task_tier === 'Hard'
                      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                      : (step as any).task_tier === 'Elite'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  {(step as any).task_tier}
                </span>
                <span className="w-10 text-xs text-[var(--gold)] font-mono font-bold flex-shrink-0 pl-2">
                  {(step as any).task_points}
                </span>
              </>
            )}
            <div className="text-sm font-medium truncate text-[var(--text-primary)]">
              {(step as any).task_name || `Task #${step.task_id}`}
            </div>
            {(step as any).task_region && (
              <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
                {(step as any).task_region}
              </span>
            )}
          </>
        )}
      </div>

      {!isPreviewStep && (
        <div className="flex-shrink-0 text-xs font-mono font-bold flex items-center gap-1">
          <span className="text-[var(--crimson)]">{cumulativePoints}</span>
          <span className="text-[var(--text-muted)]">/</span>
          <span className="text-[var(--gold)]">{cumulativeTasks}</span>
        </div>
      )}

      {playerIds.length > 0 && !isPreviewStep && (
        <div className="flex gap-2.5">
          {playerIds.map((playerId) => {
            const state = (
              step.player_state as Record<string, boolean | null>
            )[playerId];
            const checkboxKey = `${step.id}-${playerId}`;
            const isBouncing = bouncingCheckbox === checkboxKey;
            return (
              <div key={playerId} className="w-12 flex justify-center">
                <input
                  type="checkbox"
                  checked={state === true}
                  onChange={() => handleCheckboxToggle(step.id, playerId)}
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

      {mounted && isAdmin && !isPreviewStep && (
        <button
          onClick={() => {
            if (deleteClickedId === step.id) {
              onDelete(step.id);
            } else {
              onDeleteClick(step.id);
            }
          }}
          className={`opacity-0 group-hover:opacity-100 transition-all w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
            deleteClickedId === step.id
              ? 'bg-[var(--crimson)] scale-110'
              : 'bg-[var(--bg-surface)] hover:bg-[var(--crimson)] border border-[var(--border-standard)]'
          }`}
          title={deleteClickedId === step.id ? 'Click again to confirm' : 'Delete'}
        >
          <Trash2 size={10} className={deleteClickedId === step.id ? 'text-white' : 'text-[var(--text-tertiary)]'} />
        </button>
      )}
    </div>
  );
});

export default SortableTaskItem;
