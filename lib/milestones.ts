// Milestone calculation and injection logic

export type MilestoneType = 'relic' | 'area' | 'karamja';

export interface Milestone {
  id: string; // Unique ID for React keys (e.g., 'relic_t2', 'area_u1', 'karamja')
  type: MilestoneType;
  tier: number; // Relic tier (1-8), Area unlock (1-3), or 0 for Karamja
  threshold: number; // Points or task count required
  label: string; // Display name (e.g., 'Relic Tier 2', 'Area Unlock 1', 'Starter Area')
  insertAfterIndex: number; // Insert milestone after this task index (-1 = before first task)
  currentProgress: number; // Current points/tasks at this position
  isReached: boolean; // Whether threshold is met
}

// Relic tier thresholds (point-based)
export const RELIC_TIERS = [
  { tier: 1, threshold: 0, label: 'Relic Tier 1' },
  { tier: 2, threshold: 600, label: 'Relic Tier 2' },
  { tier: 3, threshold: 1500, label: 'Relic Tier 3' },
  { tier: 4, threshold: 2500, label: 'Relic Tier 4' },
  { tier: 5, threshold: 5000, label: 'Relic Tier 5' },
  { tier: 6, threshold: 8000, label: 'Relic Tier 6' },
  { tier: 7, threshold: 16000, label: 'Relic Tier 7' },
  { tier: 8, threshold: 25000, label: 'Relic Tier 8' },
];

// Karamja starter area (task-count-based, auto-unlocked)
export const KARAMJA_UNLOCK = {
  threshold: 80,
  label: 'Starter Area',
};

// Area unlock thresholds (task-count-based)
export const AREA_UNLOCKS = [
  { tier: 1, threshold: 90, label: 'Area Unlock 1' },
  { tier: 2, threshold: 200, label: 'Area Unlock 2' },
  { tier: 3, threshold: 400, label: 'Area Unlock 3' },
];

interface RouteStep {
  id: string;
  task_points?: number | null;
  step_type: string;
}

/**
 * Calculate cumulative points and task counts for each position in the route
 */
export function calculateCumulativeProgress(steps: RouteStep[]): {
  pointsAtIndex: number[];
  tasksAtIndex: number[];
} {
  const pointsAtIndex: number[] = [];
  const tasksAtIndex: number[] = [];

  let cumulativePoints = 0;
  let cumulativeTasks = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Add points and task count from official tasks only
    // Custom tasks do NOT count towards area unlocks
    if (step.step_type === 'task' && step.task_points) {
      cumulativePoints += step.task_points;
      cumulativeTasks += 1;
    }

    pointsAtIndex.push(cumulativePoints);
    tasksAtIndex.push(cumulativeTasks);
  }

  return { pointsAtIndex, tasksAtIndex };
}

/**
 * Determine which milestones should be injected and where
 * Only returns milestones that have been reached
 */
export function calculateMilestones(steps: RouteStep[]): Milestone[] {
  const milestones: Milestone[] = [];
  const { pointsAtIndex, tasksAtIndex } = calculateCumulativeProgress(steps);

  // Special case: Always show Tier 1 at the beginning (0 points = always reached)
  milestones.push({
    id: 'relic_t1',
    type: 'relic',
    tier: 1,
    threshold: 0,
    label: 'Relic Tier 1',
    insertAfterIndex: -1, // Before all tasks
    currentProgress: 0,
    isReached: true,
  });

  // Find where to inject relic milestones (tiers 2-8)
  // Only add milestones that have been reached
  for (let t = 1; t < RELIC_TIERS.length; t++) {
    const relicTier = RELIC_TIERS[t];

    // Find the first task index where cumulative points >= threshold
    for (let i = 0; i < pointsAtIndex.length; i++) {
      if (pointsAtIndex[i] >= relicTier.threshold) {
        milestones.push({
          id: `relic_t${relicTier.tier}`,
          type: 'relic',
          tier: relicTier.tier,
          threshold: relicTier.threshold,
          label: relicTier.label,
          insertAfterIndex: i,
          currentProgress: pointsAtIndex[i],
          isReached: true,
        });
        break; // Only add once when reached
      }
    }
  }

  // Find where to inject Karamja starter area milestone
  // Only add if reached (80 tasks completed)
  for (let i = 0; i < tasksAtIndex.length; i++) {
    if (tasksAtIndex[i] >= KARAMJA_UNLOCK.threshold) {
      milestones.push({
        id: 'karamja',
        type: 'karamja',
        tier: 0, // Special tier for Karamja (not part of the 3 area unlocks)
        threshold: KARAMJA_UNLOCK.threshold,
        label: KARAMJA_UNLOCK.label,
        insertAfterIndex: i,
        currentProgress: tasksAtIndex[i],
        isReached: true,
      });
      break; // Only add once when reached
    }
  }

  // Find where to inject area unlock milestones
  // Only add milestones that have been reached
  for (const areaUnlock of AREA_UNLOCKS) {
    // Find the first task index where cumulative tasks >= threshold
    for (let i = 0; i < tasksAtIndex.length; i++) {
      if (tasksAtIndex[i] >= areaUnlock.threshold) {
        milestones.push({
          id: `area_u${areaUnlock.tier}`,
          type: 'area',
          tier: areaUnlock.tier,
          threshold: areaUnlock.threshold,
          label: areaUnlock.label,
          insertAfterIndex: i,
          currentProgress: tasksAtIndex[i],
          isReached: true,
        });
        break; // Only add once when reached
      }
    }
  }

  return milestones;
}

/**
 * Merge milestones into the task list for display
 * Returns an array of tasks and milestones in the correct order
 */
export function mergeStepsWithMilestones<T extends RouteStep>(
  steps: T[],
  milestones: Milestone[]
): Array<T | Milestone> {
  const result: Array<T | Milestone> = [];

  // Sort milestones by insertAfterIndex
  const sortedMilestones = [...milestones].sort(
    (a, b) => a.insertAfterIndex - b.insertAfterIndex
  );

  let milestoneIndex = 0;

  // Insert milestones that go before all tasks (insertAfterIndex = -1)
  while (
    milestoneIndex < sortedMilestones.length &&
    sortedMilestones[milestoneIndex].insertAfterIndex === -1
  ) {
    result.push(sortedMilestones[milestoneIndex]);
    milestoneIndex++;
  }

  // Interleave tasks and milestones
  for (let i = 0; i < steps.length; i++) {
    result.push(steps[i]);

    // Insert any milestones that come after this task
    while (
      milestoneIndex < sortedMilestones.length &&
      sortedMilestones[milestoneIndex].insertAfterIndex === i
    ) {
      result.push(sortedMilestones[milestoneIndex]);
      milestoneIndex++;
    }
  }

  // Add any remaining milestones at the end
  while (milestoneIndex < sortedMilestones.length) {
    result.push(sortedMilestones[milestoneIndex]);
    milestoneIndex++;
  }

  return result;
}

/**
 * Type guard to check if an item is a milestone
 */
export function isMilestone(item: any): item is Milestone {
  return item && 'type' in item && (item.type === 'relic' || item.type === 'area' || item.type === 'karamja');
}
