import { describe, it, expect } from 'vitest';
import {
  calculateCumulativeProgress,
  calculateMilestones,
  mergeStepsWithMilestones,
  isMilestone,
  RELIC_TIERS,
  AREA_UNLOCKS,
  type Milestone,
} from './milestones';

// Helper to create a task step
function task(id: string, points: number): { id: string; task_points: number; step_type: string } {
  return { id, task_points: points, step_type: 'task' };
}

function customTask(id: string): { id: string; task_points: null; step_type: string } {
  return { id, task_points: null, step_type: 'custom' };
}

describe('calculateCumulativeProgress', () => {
  it('returns empty arrays for no steps', () => {
    const result = calculateCumulativeProgress([]);
    expect(result.pointsAtIndex).toEqual([]);
    expect(result.tasksAtIndex).toEqual([]);
  });

  it('accumulates points correctly for task steps', () => {
    const steps = [task('a', 100), task('b', 200), task('c', 50)];
    const result = calculateCumulativeProgress(steps);
    expect(result.pointsAtIndex).toEqual([100, 300, 350]);
    expect(result.tasksAtIndex).toEqual([1, 2, 3]);
  });

  it('counts custom tasks towards task count but not points', () => {
    const steps = [task('a', 100), customTask('b'), task('c', 200)];
    const result = calculateCumulativeProgress(steps);
    expect(result.pointsAtIndex).toEqual([100, 100, 300]);
    expect(result.tasksAtIndex).toEqual([1, 2, 3]);
  });

  it('handles tasks with null/zero points', () => {
    const steps = [
      { id: 'a', task_points: null, step_type: 'task' },
      { id: 'b', task_points: 0, step_type: 'task' },
      task('c', 500),
    ];
    const result = calculateCumulativeProgress(steps);
    // null and 0 are falsy, so no points added for first two
    expect(result.pointsAtIndex).toEqual([0, 0, 500]);
    // null/0 points means task_points is falsy, so task count doesn't increment either
    expect(result.tasksAtIndex).toEqual([0, 0, 1]);
  });

  it('ignores non-task, non-custom step types', () => {
    const steps = [
      task('a', 100),
      { id: 'note', task_points: null, step_type: 'note' },
      task('b', 200),
    ];
    const result = calculateCumulativeProgress(steps);
    expect(result.pointsAtIndex).toEqual([100, 100, 300]);
    expect(result.tasksAtIndex).toEqual([1, 1, 2]);
  });
});

describe('calculateMilestones', () => {
  it('always includes Relic Tier 1 even with no steps', () => {
    const milestones = calculateMilestones([]);
    expect(milestones).toHaveLength(1);
    expect(milestones[0]).toMatchObject({
      id: 'relic_t1',
      type: 'relic',
      tier: 1,
      threshold: 0,
      insertAfterIndex: -1,
      isReached: true,
    });
  });

  it('injects relic milestones at correct positions', () => {
    // Create steps that reach 750 points (Tier 2 threshold)
    const steps = [task('a', 400), task('b', 400)]; // 400, 800 cumulative
    const milestones = calculateMilestones(steps);

    const relicT2 = milestones.find((m) => m.id === 'relic_t2');
    expect(relicT2).toBeDefined();
    expect(relicT2!.insertAfterIndex).toBe(1); // After second task (800 >= 750)
    expect(relicT2!.currentProgress).toBe(800);
  });

  it('injects area unlocks at correct positions based on task count', () => {
    // Create 90 tasks to reach Area Unlock 1
    const steps = Array.from({ length: 91 }, (_, i) => task(`t${i}`, 10));
    const milestones = calculateMilestones(steps);

    const areaU1 = milestones.find((m) => m.id === 'area_u1');
    expect(areaU1).toBeDefined();
    expect(areaU1!.type).toBe('area');
    expect(areaU1!.insertAfterIndex).toBe(89); // 90th task (index 89) reaches 90 tasks
    expect(areaU1!.currentProgress).toBe(90);
  });

  it('does not include milestones that have not been reached', () => {
    const steps = [task('a', 100)]; // Only 100 points, 1 task
    const milestones = calculateMilestones(steps);

    // Should only have Relic Tier 1 (always shown)
    expect(milestones).toHaveLength(1);
    expect(milestones[0].id).toBe('relic_t1');
  });

  it('includes multiple relic tiers when enough points', () => {
    // 1500 points total - should reach T1, T2, T3
    const steps = [task('a', 800), task('b', 800)]; // 800, 1600
    const milestones = calculateMilestones(steps);

    const relicIds = milestones.filter((m) => m.type === 'relic').map((m) => m.id);
    expect(relicIds).toContain('relic_t1');
    expect(relicIds).toContain('relic_t2');
    expect(relicIds).toContain('relic_t3');
    expect(relicIds).not.toContain('relic_t4'); // 2500 not reached
  });

  it('handles reaching all relic tiers', () => {
    // Create enough points to reach all 8 tiers (25000+)
    const steps = Array.from({ length: 26 }, (_, i) => task(`t${i}`, 1000));
    const milestones = calculateMilestones(steps);

    const relicMilestones = milestones.filter((m) => m.type === 'relic');
    expect(relicMilestones).toHaveLength(8);
  });
});

describe('mergeStepsWithMilestones', () => {
  it('returns only milestones when there are no steps', () => {
    const milestone: Milestone = {
      id: 'relic_t1',
      type: 'relic',
      tier: 1,
      threshold: 0,
      label: 'Relic Tier 1',
      insertAfterIndex: -1,
      currentProgress: 0,
      isReached: true,
    };
    const result = mergeStepsWithMilestones([], [milestone]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(milestone);
  });

  it('returns only steps when there are no milestones', () => {
    const steps = [task('a', 100), task('b', 200)];
    const result = mergeStepsWithMilestones(steps, []);
    expect(result).toEqual(steps);
  });

  it('inserts milestone before all tasks when insertAfterIndex is -1', () => {
    const steps = [task('a', 100)];
    const milestone: Milestone = {
      id: 'relic_t1',
      type: 'relic',
      tier: 1,
      threshold: 0,
      label: 'Relic Tier 1',
      insertAfterIndex: -1,
      currentProgress: 0,
      isReached: true,
    };
    const result = mergeStepsWithMilestones(steps, [milestone]);
    expect(result).toHaveLength(2);
    expect(isMilestone(result[0])).toBe(true);
    expect(result[1]).toBe(steps[0]);
  });

  it('inserts milestones at correct positions between tasks', () => {
    const steps = [task('a', 100), task('b', 200), task('c', 300)];
    const milestone: Milestone = {
      id: 'relic_t2',
      type: 'relic',
      tier: 2,
      threshold: 750,
      label: 'Relic Tier 2',
      insertAfterIndex: 1, // After task 'b'
      currentProgress: 300,
      isReached: true,
    };
    const result = mergeStepsWithMilestones(steps, [milestone]);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe(steps[0]); // task a
    expect(result[1]).toBe(steps[1]); // task b
    expect(isMilestone(result[2])).toBe(true); // milestone
    expect(result[2]).toBe(milestone);
    expect(result[3]).toBe(steps[2]); // task c
  });

  it('handles multiple milestones at the same position', () => {
    const steps = [task('a', 5000)];
    const m1: Milestone = {
      id: 'relic_t2',
      type: 'relic',
      tier: 2,
      threshold: 750,
      label: 'Relic Tier 2',
      insertAfterIndex: 0,
      currentProgress: 5000,
      isReached: true,
    };
    const m2: Milestone = {
      id: 'area_u1',
      type: 'area',
      tier: 1,
      threshold: 90,
      label: 'Area Unlock 1',
      insertAfterIndex: 0,
      currentProgress: 1,
      isReached: true,
    };
    const result = mergeStepsWithMilestones(steps, [m1, m2]);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(steps[0]);
    // Both milestones come after the task
    expect(isMilestone(result[1])).toBe(true);
    expect(isMilestone(result[2])).toBe(true);
  });

  it('sorts milestones by insertAfterIndex', () => {
    const steps = [task('a', 100), task('b', 200)];
    // Pass milestones in reverse order
    const m_after1: Milestone = {
      id: 'relic_t3',
      type: 'relic',
      tier: 3,
      threshold: 1500,
      label: 'Relic Tier 3',
      insertAfterIndex: 1,
      currentProgress: 300,
      isReached: true,
    };
    const m_before: Milestone = {
      id: 'relic_t1',
      type: 'relic',
      tier: 1,
      threshold: 0,
      label: 'Relic Tier 1',
      insertAfterIndex: -1,
      currentProgress: 0,
      isReached: true,
    };
    const result = mergeStepsWithMilestones(steps, [m_after1, m_before]);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe(m_before); // Before all tasks
    expect(result[1]).toBe(steps[0]); // task a
    expect(result[2]).toBe(steps[1]); // task b
    expect(result[3]).toBe(m_after1); // After task b
  });
});

describe('isMilestone', () => {
  it('returns true for relic milestones', () => {
    expect(isMilestone({ type: 'relic', tier: 1 })).toBe(true);
  });

  it('returns true for area milestones', () => {
    expect(isMilestone({ type: 'area', tier: 1 })).toBe(true);
  });

  it('returns false for task steps', () => {
    expect(isMilestone(task('a', 100))).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isMilestone(null)).toBeFalsy();
    expect(isMilestone(undefined)).toBeFalsy();
  });
});

describe('constants', () => {
  it('has 8 relic tiers with increasing thresholds', () => {
    expect(RELIC_TIERS).toHaveLength(8);
    for (let i = 1; i < RELIC_TIERS.length; i++) {
      expect(RELIC_TIERS[i].threshold).toBeGreaterThan(RELIC_TIERS[i - 1].threshold);
    }
  });

  it('has 3 area unlocks with increasing thresholds', () => {
    expect(AREA_UNLOCKS).toHaveLength(3);
    for (let i = 1; i < AREA_UNLOCKS.length; i++) {
      expect(AREA_UNLOCKS[i].threshold).toBeGreaterThan(AREA_UNLOCKS[i - 1].threshold);
    }
  });

  it('has correct relic tier thresholds', () => {
    const expected = [0, 750, 1500, 2500, 5000, 8000, 16000, 25000];
    expect(RELIC_TIERS.map((t) => t.threshold)).toEqual(expected);
  });

  it('has correct area unlock thresholds', () => {
    expect(AREA_UNLOCKS.map((a) => a.threshold)).toEqual([90, 200, 400]);
  });
});
