'use client';

import { memo, useState, useCallback } from 'react';
import { Trash2, GripVertical, Pencil } from 'lucide-react';
import { RouteStep } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Tooltip from './Tooltip';

type PlayerNames = Record<string, string>;

export interface SortableTaskItemProps {
  step: RouteStep;
  playerIds: string[];
  playerNames: PlayerNames;
  isAdmin: boolean;
  deleteClickedId: string | null;
  cumulativePoints: number;
  cumulativeTasks: number;
  cumulativePactTasks: number;
  onToggleCheckbox: (stepId: string, playerId: string) => void;
  onDelete: (stepId: string) => void;
  onDeleteClick: (stepId: string) => void;
  onEdit?: (stepId: string, currentText: string) => void;
  completedSteps: Set<string>;
  isInsertAnimating?: boolean;
  isPreviewStep?: boolean;
}

const SortableTaskItem = memo(function SortableTaskItem({
  step,
  playerIds,
  playerNames,
  isAdmin,
  deleteClickedId,
  cumulativePoints,
  cumulativeTasks,
  cumulativePactTasks,
  onToggleCheckbox,
  onDelete,
  onDeleteClick,
  onEdit,
  completedSteps,
  isInsertAnimating,
  isPreviewStep,
}: SortableTaskItemProps) {
  const [bouncingCheckbox, setBouncingCheckbox] = useState<string | null>(null);
  const [editClickCount, setEditClickCount] = useState(0);
  const [editClickTimeout, setEditClickTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleCheckboxToggle = useCallback((stepId: string, playerId: string) => {
    const checkboxKey = `${stepId}-${playerId}`;
    setBouncingCheckbox(checkboxKey);
    onToggleCheckbox(stepId, playerId);
    setTimeout(() => setBouncingCheckbox(null), 400);
  }, [onToggleCheckbox]);

  const handleEditClick = useCallback(() => {
    if (!onEdit || step.step_type !== 'custom' || !step.custom_text) return;

    if (editClickTimeout) {
      clearTimeout(editClickTimeout);
    }

    const newCount = editClickCount + 1;
    setEditClickCount(newCount);

    if (newCount === 2) {
      // Double click detected
      onEdit(step.id, step.custom_text);
      setEditClickCount(0);
      setEditClickTimeout(null);
    } else {
      // Wait for potential second click
      const timeout = setTimeout(() => {
        setEditClickCount(0);
        setEditClickTimeout(null);
      }, 300);
      setEditClickTimeout(timeout);
    }
  }, [onEdit, step.id, step.step_type, step.custom_text, editClickCount, editClickTimeout]);

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
      {!isPreviewStep && (
        <div className="text-[var(--text-tertiary)] group-hover:text-[var(--gold)] flex-shrink-0 transition-colors duration-200 pointer-events-none" style={{ visibility: isAdmin ? 'visible' : 'hidden' }}>
          <GripVertical size={14} />
        </div>
      )}

      <div className="flex-1 min-w-0 flex items-center gap-2">
        {step.step_type === 'custom' ? (
          <div className="text-sm text-[var(--text-primary)] font-medium italic whitespace-pre-wrap break-words">{step.custom_text}</div>
        ) : (
          <>
            {step.task_tier && (
              <>
                <span
                  className={`w-14 px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 text-center ${
                    step.task_tier === 'Easy'
                      ? 'bg-[var(--tier-easy-bg)] text-[var(--tier-easy-text)]'
                      : step.task_tier === 'Medium'
                      ? 'bg-[var(--tier-medium-bg)] text-[var(--tier-medium-text)]'
                      : step.task_tier === 'Hard'
                      ? 'bg-[var(--tier-hard-bg)] text-[var(--tier-hard-text)]'
                      : step.task_tier === 'Elite'
                      ? 'bg-[var(--tier-elite-bg)] text-[var(--tier-elite-text)]'
                      : 'bg-[var(--tier-master-bg)] text-[var(--tier-master-text)]'
                  }`}
                >
                  {step.task_tier}
                </span>
                {step.is_pact_task && (
                  <span className="px-1 py-0.5 rounded text-[10px] font-bold flex-shrink-0 bg-[var(--pact-bg)] text-[var(--pact-text)]">
                    PACT
                  </span>
                )}
                <span className="w-10 text-xs text-[var(--gold)] font-mono font-bold flex-shrink-0 pl-2">
                  {step.task_points}
                </span>
              </>
            )}
            <div className="text-sm font-medium truncate text-[var(--text-primary)]">
              {step.task_name || `Task #${step.task_id}`}
            </div>
            {step.task_region && (
              <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
                {step.task_region}
              </span>
            )}
          </>
        )}
      </div>

      {!isPreviewStep && step.step_type !== 'custom' && (
        <div className="flex-shrink-0 text-xs font-mono font-bold flex items-center gap-1">
          <span className="text-[var(--crimson)]">{cumulativePoints}</span>
          <span className="text-[var(--text-muted)]">/</span>
          <span className="text-[var(--gold)]">{cumulativeTasks}</span>
          <span className="text-[var(--text-muted)]">/</span>
          <span className="text-[var(--pact-text)]">{cumulativePactTasks}</span>
        </div>
      )}

      {playerIds.length > 0 && !isPreviewStep && (
        <div className="flex gap-2.5">
          {playerIds.map((playerId, index) => {
            const state = (
              step.player_state as Record<string, boolean | null>
            )[playerId];
            const checkboxKey = `${step.id}-${playerId}`;
            const isBouncing = bouncingCheckbox === checkboxKey;
            return (
              <div
                key={playerId}
                className="flex justify-center"
                style={{ width: `var(--player-${index + 1}-width)` }}
              >
                <input
                  type="checkbox"
                  checked={state === true}
                  onChange={() => handleCheckboxToggle(step.id, playerId)}
                  disabled={!isAdmin}
                  aria-label={`Toggle ${playerNames[playerId] || playerId} completion`}
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

      {!isPreviewStep && step.step_type === 'custom' && (
        <Tooltip text="Double-Click to Edit" position="top">
          <button
            onClick={handleEditClick}
            className="opacity-0 group-hover:opacity-100 transition-all w-5 h-5 rounded flex items-center justify-center flex-shrink-0 bg-[var(--bg-surface)] hover:bg-[var(--gold)] border border-[var(--border-standard)]"
            title="Edit custom task"
            aria-label="Edit custom task"
            style={{ visibility: isAdmin ? 'visible' : 'hidden' }}
          >
            <Pencil size={10} className="text-[var(--text-tertiary)]" />
          </button>
        </Tooltip>
      )}

      {!isPreviewStep && step.step_type !== 'custom' && (
        <div className="w-5 h-5 flex-shrink-0" style={{ visibility: isAdmin ? 'visible' : 'hidden' }} />
      )}

      {!isPreviewStep && (
        <Tooltip text="Double-Click to Remove" position="top">
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
            aria-label={deleteClickedId === step.id ? 'Confirm delete task' : 'Delete task'}
            style={{ visibility: isAdmin ? 'visible' : 'hidden' }}
          >
            <Trash2 size={10} className={deleteClickedId === step.id ? 'text-white' : 'text-[var(--text-tertiary)]'} />
          </button>
        </Tooltip>
      )}
    </div>
  );
});

export default SortableTaskItem;
