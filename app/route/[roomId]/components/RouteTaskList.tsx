'use client';

import { Fragment } from 'react';
import { RouteStep, OfficialRelic, OfficialRegion, MilestoneSelections } from '@/types';
import { Milestone } from '@/lib/milestones';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableTaskItem from './SortableTaskItem';
import MilestoneRow from './MilestoneRow';

type PlayerNames = Record<string, string>;

export interface RouteTaskListProps {
  steps: RouteStep[];
  milestones: Milestone[];
  playerIds: string[];
  playerNames: PlayerNames;
  isAdmin: boolean;
  mounted: boolean;
  deleteClickedId: string | null;
  cumulativeByStepId: Record<string, { points: number; tasks: number }>;
  completedSteps: Set<string>;
  insertAnimatingIds: Set<string>;
  milestonePlayerState: Record<string, Record<string, boolean>>;
  milestoneSelections: MilestoneSelections;
  relics: OfficialRelic[];
  regions: OfficialRegion[];
  previewStepId: string | null;
  // Callbacks
  onToggleCheckbox: (stepId: string, playerId: string) => void;
  onDelete: (stepId: string) => void;
  onDeleteClick: (stepId: string) => void;
  onToggleMilestoneCheckbox: (milestoneId: string, playerId: string) => void;
  onMilestoneSelection: (milestoneId: string, selectedId: number | null) => void;
}

export default function RouteTaskList({
  steps,
  milestones,
  playerIds,
  playerNames,
  isAdmin,
  mounted,
  deleteClickedId,
  cumulativeByStepId,
  completedSteps,
  insertAnimatingIds,
  milestonePlayerState,
  milestoneSelections,
  relics,
  regions,
  previewStepId,
  onToggleCheckbox,
  onDelete,
  onDeleteClick,
  onToggleMilestoneCheckbox,
  onMilestoneSelection,
}: RouteTaskListProps) {
  const { setNodeRef: setRouteDropRef } = useDroppable({
    id: 'route-list',
  });

  // For empty state check, filter out preview step
  const realSteps = previewStepId ? steps.filter(s => s.id !== previewStepId) : steps;

  return (
    <div className="flex flex-col gap-2" data-tour="route-area" suppressHydrationWarning>
      {/* Column Headers */}
      {playerIds.length > 0 && steps.length > 0 && (
        <div className="flex gap-2 items-center mb-3 pb-2 border-b border-[var(--border-subtle)]" suppressHydrationWarning>
          {isAdmin && (
            <div className="w-[14px] flex-shrink-0"></div>
          )}
          <div className="flex-1 text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wide">
            Task
          </div>
          <div className="text-xs font-mono font-bold text-[var(--text-tertiary)] uppercase tracking-wide flex-shrink-0">
            Total
          </div>
          <div className="flex gap-2.5">
            {playerIds.map((playerId) => (
              <div
                key={playerId}
                className="w-12 text-center text-xs font-bold text-[var(--text-secondary)] truncate"
              >
                {playerNames[playerId]}
              </div>
            ))}
          </div>
          {mounted && isAdmin && (
            <div className="w-5 flex-shrink-0"></div>
          )}
        </div>
      )}

      <div ref={setRouteDropRef} className={`flex flex-col gap-0.5 ${realSteps.length === 0 ? 'flex-1 min-h-full' : ''}`}>
        {/* Milestones before first task */}
        {milestones
          .filter(m => m.insertAfterIndex === -1)
          .map(m => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              playerIds={playerIds}
              playerNames={playerNames}
              milestonePlayerState={milestonePlayerState}
              milestoneSelections={milestoneSelections}
              relics={relics}
              regions={regions}
              isAdmin={isAdmin}
              mounted={mounted}
              onToggleMilestoneCheckbox={onToggleMilestoneCheckbox}
              onMilestoneSelection={onMilestoneSelection}
            />
          ))
        }

        <SortableContext
          items={steps.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {steps.map((step, index) => {
            const isPreview = step.id === previewStepId;
            const cumulative = cumulativeByStepId[step.id] || { points: 0, tasks: 0 };
            const milestonesAfter = isPreview ? [] : milestones.filter(m => m.insertAfterIndex === index);

            return (
              <Fragment key={step.id}>
                <SortableTaskItem
                  step={step}
                  playerIds={playerIds}
                  playerNames={playerNames}
                  isAdmin={isAdmin}
                  mounted={mounted}
                  deleteClickedId={deleteClickedId}
                  cumulativePoints={cumulative.points}
                  cumulativeTasks={cumulative.tasks}
                  onToggleCheckbox={onToggleCheckbox}
                  onDelete={onDelete}
                  onDeleteClick={onDeleteClick}
                  completedSteps={completedSteps}
                  isInsertAnimating={insertAnimatingIds.has(step.id)}
                  isPreviewStep={isPreview}
                />
                {milestonesAfter.map(m => (
                  <MilestoneRow
                    key={m.id}
                    milestone={m}
                    playerIds={playerIds}
                    playerNames={playerNames}
                    milestonePlayerState={milestonePlayerState}
                    milestoneSelections={milestoneSelections}
                    relics={relics}
                    regions={regions}
                    isAdmin={isAdmin}
                    mounted={mounted}
                    onToggleMilestoneCheckbox={onToggleMilestoneCheckbox}
                    onMilestoneSelection={onMilestoneSelection}
                  />
                ))}
              </Fragment>
            );
          })}
        </SortableContext>

        {realSteps.length === 0 && !previewStepId && (
          <div className="flex-1 min-h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg text-sm transition-colors duration-200 border-[var(--border-standard)] text-[var(--text-muted)]">
            Drag tasks here to build your route
          </div>
        )}
      </div>
    </div>
  );
}
