'use client';

import { supabase } from '@/lib/supabase';
import { Room, RouteStep } from '@/types';
import { useState, useEffect, useMemo, memo, useCallback, Fragment } from 'react';
import { Trash2, GripVertical, GripHorizontal, Pencil, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ArrowDownToLine, ArrowRightToLine } from 'lucide-react';
import TaskLibrary from './TaskLibrary';
import {
  calculateMilestones,
  Milestone,
  RELIC_TIERS,
  AREA_UNLOCKS,
} from '@/lib/milestones';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type PlayerNames = Record<string, string>;

interface MilestoneRowProps {
  milestone: Milestone;
  playerIds: string[];
  playerNames: PlayerNames;
  milestonePlayerState: Record<string, Record<string, boolean>>;
  isAdmin: boolean;
  mounted: boolean;
  onToggleMilestoneCheckbox: (milestoneId: string, playerId: string) => void;
}

const MilestoneRow = memo(function MilestoneRow({
  milestone,
  playerIds,
  playerNames,
  milestonePlayerState,
  isAdmin,
  mounted,
  onToggleMilestoneCheckbox
}: MilestoneRowProps) {
  const [bouncingCheckbox, setBouncingCheckbox] = useState<string | null>(null);

  const handleCheckboxToggle = useCallback((milestoneId: string, playerId: string) => {
    const checkboxKey = `${milestoneId}-${playerId}`;
    setBouncingCheckbox(checkboxKey);
    onToggleMilestoneCheckbox(milestoneId, playerId);
    setTimeout(() => setBouncingCheckbox(null), 400);
  }, [onToggleMilestoneCheckbox]);

  const isRelic = milestone.type === 'relic';
  const thresholdText = isRelic
    ? `${milestone.threshold} pts`
    : `${milestone.threshold} tasks`;

  return (
    <div className="bg-gradient-to-r from-[var(--crimson-glow)] to-transparent border-l-2 border-[var(--crimson)] rounded-md p-1.5 flex gap-2 items-center transition-all duration-200 hover:shadow-lg hover:shadow-[var(--crimson)]/30 hover:-translate-y-1">
      {/* Drag handle spacer - matches task row drag handle */}
      {isAdmin && <div className="w-[14px] flex-shrink-0"></div>}

      {/* Content area - matches task row flex-1 section */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {/* Icon - only for Area unlocks */}
        {!isRelic && (
          <div className="flex-shrink-0 w-6 h-6 rounded bg-gradient-to-br from-[var(--gold)] to-[var(--gold-deep)] flex items-center justify-center text-xs">
            🗺
          </div>
        )}

        {/* Label */}
        <span className="font-bold text-sm text-[var(--text-primary)]">
          {milestone.label}
        </span>

        {/* Badge */}
        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-[var(--success)] text-white">
          UNLOCKED
        </span>

        {/* Threshold */}
        <span className="text-xs font-mono text-[var(--text-tertiary)]">
          ({thresholdText})
        </span>

        {/* Dropdown */}
        <select
          disabled={!isAdmin}
          className="ml-auto w-36 bg-[var(--bg-surface)] border border-[var(--border-standard)] rounded-md px-2 py-1 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--gold)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {isRelic ? 'Select Relic...' : 'Select Region...'}
          </option>
        </select>
      </div>

      {/* Running total spacer - matches task row running total section */}
      <div className="flex-shrink-0" style={{ width: '52px' }}></div>

      {/* Player Checkboxes */}
      {playerIds.length > 0 && (
        <div className="flex gap-2.5">
          {playerIds.map((playerId) => {
            const state = milestonePlayerState[milestone.id]?.[playerId] || false;
            const checkboxKey = `${milestone.id}-${playerId}`;
            const isBouncing = bouncingCheckbox === checkboxKey;
            return (
              <div key={playerId} className="w-12 flex justify-center">
                <input
                  type="checkbox"
                  checked={state}
                  onChange={() => handleCheckboxToggle(milestone.id, playerId)}
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

      {/* Spacer for delete button column - matches task row delete button */}
      {mounted && isAdmin && <div className="w-5 flex-shrink-0"></div>}
    </div>
  );
});

interface SortableTaskItemProps {
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
  completedSteps
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
    disabled: !isAdmin,
    transition: {
      duration: 350,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Check if task is complete (all players checked)
  const isComplete = playerIds.length > 0 && playerIds.every((playerId) => {
    const state = (step.player_state as Record<string, boolean | null>)[playerId];
    return state === true;
  });
  const wasJustCompleted = completedSteps.has(step.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-md p-1.5 flex gap-2 items-center group task-card-hover ${
        isDragging
          ? 'bg-[var(--gold)]/10 border-2 border-[var(--gold)] shadow-lg shadow-[var(--gold)]/30 z-10 dragging'
          : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] transition-[border-color,box-shadow] duration-200'
      } ${
        isAdmin && !isDragging
          ? 'hover:border-[var(--gold)] hover:shadow-lg hover:shadow-[var(--gold)]/20 cursor-pointer'
          : isAdmin
          ? 'cursor-grabbing'
          : 'cursor-default'
      } ${
        wasJustCompleted ? 'animate-completion-flash' : ''
      } ${
        isComplete ? 'opacity-70' : ''
      }`}
    >
      {/* Drag Handle - Visual indicator only */}
      {isAdmin && (
        <div className="text-[var(--text-tertiary)] group-hover:text-[var(--gold)] flex-shrink-0 transition-colors duration-200 pointer-events-none">
          <GripVertical size={14} />
        </div>
      )}

      {/* Task Content */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {step.step_type === 'custom' ? (
          <div className="text-sm truncate text-[var(--text-primary)] font-medium italic">{step.custom_text}</div>
        ) : (
          <>
            {(step as any).task_tier && (
              <>
                {/* Fixed width tier badge */}
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
                {/* Fixed width points */}
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

      {/* Running Total */}
      <div className="flex-shrink-0 text-xs font-mono font-bold flex items-center gap-1">
        <span className="text-[var(--crimson)]">{cumulativePoints}</span>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-[var(--gold)]">{cumulativeTasks}</span>
      </div>

      {/* Player Checkboxes */}
      {playerIds.length > 0 && (
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

      {/* Delete Button */}
      {mounted && isAdmin && (
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

export default function RouteClient({
  room,
  initialSteps,
}: {
  room: Room;
  initialSteps: RouteStep[];
}) {
  const [steps, setSteps] = useState(initialSteps);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [playerNames, setPlayerNames] = useState<PlayerNames>(
    room.player_names as PlayerNames
  );
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editingPlayers, setEditingPlayers] = useState<PlayerNames>({});
  const [deleteClickedId, setDeleteClickedId] = useState<string | null>(null);
  const [milestonePlayerState, setMilestonePlayerState] = useState<Record<string, Record<string, boolean>>>(
    (room.milestone_player_state as Record<string, Record<string, boolean>>) || {}
  );
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [roomName, setRoomName] = useState(room.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState(room.name);
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
  const [libraryPosition, setLibraryPosition] = useState<'sidebar' | 'bottom'>('sidebar');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<'admin' | 'view' | null>(null);
  const [libraryWidth, setLibraryWidth] = useState(350); // pixels
  const [libraryHeight, setLibraryHeight] = useState(320); // pixels
  const [isResizing, setIsResizing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingStep, setPendingStep] = useState<RouteStep | null>(null);

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Make the route list a droppable zone for library tasks
  const { setNodeRef: setRouteDropRef } = useDroppable({
    id: 'route-list',
  });

  useEffect(() => {
    // Check for admin key in URL
    const urlParams = new URLSearchParams(window.location.search);
    const keyFromUrl = urlParams.get('key');

    if (keyFromUrl) {
      localStorage.setItem(`admin_key_${room.id}`, keyFromUrl);
      window.history.replaceState({}, '', `/route/${room.id}`);
      setIsAdmin(true);
    } else {
      const storedKey = localStorage.getItem(`admin_key_${room.id}`);
      setIsAdmin(!!storedKey);
    }

    // Load library collapsed state from localStorage
    const storedCollapsed = localStorage.getItem('library_collapsed');
    if (storedCollapsed !== null) {
      setIsLibraryCollapsed(storedCollapsed === 'true');
    }

    // Load library position from localStorage
    const storedPosition = localStorage.getItem('library_position');
    if (storedPosition === 'sidebar' || storedPosition === 'bottom') {
      setLibraryPosition(storedPosition);
    }

    // Load library width from localStorage
    const storedWidth = localStorage.getItem('library_width');
    if (storedWidth) {
      setLibraryWidth(parseInt(storedWidth, 10));
    }

    // Load library height from localStorage
    const storedHeight = localStorage.getItem('library_height');
    if (storedHeight) {
      setLibraryHeight(parseInt(storedHeight, 10));
    }

    setMounted(true);
  }, [room.id]);

  // Real-time subscription for route_steps
  useEffect(() => {
    const channel = supabase
      .channel(`room_${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'route_steps',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setSteps((current) => {
            // Prevent duplicates - check if this step already exists (from optimistic update)
            const exists = current.some(step => step.id === payload.new.id);
            if (exists) {
              return current;
            }
            // If a phantom step exists with matching task_id, skip - handleDragEnd will replace it
            const hasPhantom = current.some(
              step => step.id.startsWith('phantom-') && step.task_id === (payload.new as RouteStep).task_id
            );
            if (hasPhantom) {
              return current;
            }
            const newSteps = [...current, payload.new as RouteStep];
            return newSteps.sort((a, b) => a.step_order - b.step_order);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'route_steps',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setSteps((current) => {
            const updatedSteps = current.map((step) =>
              step.id === payload.new.id ? (payload.new as RouteStep) : step
            );
            // Re-sort after update to handle step_order changes
            return updatedSteps.sort((a, b) => a.step_order - b.step_order);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'route_steps',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setSteps((current) =>
            current.filter((step) => step.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id]);

  // Real-time subscription for room updates (player names, milestone player state, and room name)
  useEffect(() => {
    const channel = supabase
      .channel(`room_updates_${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          setPlayerNames(payload.new.player_names as PlayerNames);
          setMilestonePlayerState(
            (payload.new.milestone_player_state as Record<string, Record<string, boolean>>) || {}
          );
          setRoomName(payload.new.name as string);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id]);

  async function getNextStepOrder(): Promise<number> {
    const { data } = await supabase
      .from('route_steps')
      .select('step_order')
      .eq('room_id', room.id)
      .order('step_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? data.step_order + 1 : 0;
  }

  async function addTask(customText: string) {
    if (!customText.trim()) return;

    const nextOrder = await getNextStepOrder();

    const { error } = await supabase
      .from('route_steps')
      .insert({
        room_id: room.id,
        step_order: nextOrder,
        step_type: 'custom',
        custom_text: customText,
        player_state: {},
      });

    if (error) {
      alert('Error adding task: ' + error.message);
      return;
    }

    // Real-time subscription will handle adding to state
  }

  async function addOfficialTask(taskId: number) {
    // Fetch the task data
    const { data: task, error: fetchError } = await supabase
      .from('official_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      alert('Error fetching task data');
      return;
    }

    const nextOrder = await getNextStepOrder();

    // Copy task data into route_steps
    const { error } = await supabase
      .from('route_steps')
      .insert({
        room_id: room.id,
        step_order: nextOrder,
        step_type: 'task',
        task_id: taskId,
        task_name: task.name,
        task_description: task.description,
        task_tier: task.tier,
        task_points: task.points,
        task_region: task.region,
        player_state: {},
      });

    if (error) {
      alert('Error adding task: ' + error.message);
      return;
    }

    // Real-time subscription will handle adding to state
  }

  function openPlayerModal() {
    setEditingPlayers({ ...playerNames });
    setShowPlayerModal(true);
  }

  function getNextPlayerId(): string | null {
    for (let i = 1; i <= 6; i++) {
      const id = `p${i}`;
      if (!editingPlayers[id]) return id;
    }
    return null;
  }

  function addPlayer() {
    const nextId = getNextPlayerId();
    if (!nextId) {
      alert('Maximum 6 players allowed');
      return;
    }
    setEditingPlayers({
      ...editingPlayers,
      [nextId]: `Player ${nextId.slice(1)}`,
    });
  }

  function removePlayer(playerId: string) {
    const { [playerId]: removed, ...rest } = editingPlayers;
    setEditingPlayers(rest);
  }

  function updatePlayerName(playerId: string, name: string) {
    if (name.length > 20) return;
    setEditingPlayers({
      ...editingPlayers,
      [playerId]: name,
    });
  }

  async function savePlayers() {
    const { error } = await supabase
      .from('rooms')
      .update({ player_names: editingPlayers })
      .eq('id', room.id);

    if (error) {
      alert('Error saving players: ' + error.message);
      return;
    }

    // Real-time subscription will update playerNames
    setShowPlayerModal(false);
  }

  const toggleCheckbox = useCallback(async (stepId: string, playerId: string) => {
    if (!isAdmin) return; // Only admins can toggle

    const step = steps.find((s) => s.id === stepId);
    if (!step) return;

    const currentState = (step.player_state as Record<string, boolean | null>)[
      playerId
    ];
    const newState = currentState === true ? false : true;

    const updatedPlayerState = {
      ...(step.player_state as Record<string, boolean | null>),
      [playerId]: newState,
    };

    // Optimistic update
    setSteps((current) =>
      current.map((s) =>
        s.id === stepId ? { ...s, player_state: updatedPlayerState } : s
      )
    );

    // Check if task just became complete (all players checked)
    const playerIds = Object.keys(playerNames);
    const allChecked = playerIds.length > 0 && playerIds.every(
      (pid) => updatedPlayerState[pid] === true
    );

    if (allChecked && newState === true) {
      // Trigger completion flash
      setCompletedSteps((current) => new Set(current).add(stepId));
      setTimeout(() => {
        setCompletedSteps((current) => {
          const next = new Set(current);
          next.delete(stepId);
          return next;
        });
      }, 800); // Match animation duration
    }

    const { error } = await supabase
      .from('route_steps')
      .update({ player_state: updatedPlayerState })
      .eq('id', stepId);

    if (error) {
      alert('Error updating checkbox: ' + error.message);
      // Revert on error
      setSteps((current) =>
        current.map((s) => (s.id === stepId ? step : s))
      );
    }
  }, [isAdmin, steps]);

  const toggleMilestoneCheckbox = useCallback(async (milestoneId: string, playerId: string) => {
    if (!isAdmin) return; // Only admins can toggle

    const currentState = milestonePlayerState[milestoneId]?.[playerId] || false;
    const newState = !currentState;

    const updatedMilestoneState = {
      ...milestonePlayerState,
      [milestoneId]: {
        ...(milestonePlayerState[milestoneId] || {}),
        [playerId]: newState,
      },
    };

    // Optimistic update
    setMilestonePlayerState(updatedMilestoneState);

    const { error } = await supabase
      .from('rooms')
      .update({ milestone_player_state: updatedMilestoneState })
      .eq('id', room.id);

    if (error) {
      alert('Error updating milestone checkbox: ' + error.message);
      // Revert on error
      setMilestonePlayerState(milestonePlayerState);
    }
  }, [isAdmin, milestonePlayerState, room.id]);

  const deleteTask = useCallback(async (stepId: string) => {
    if (!isAdmin) return;

    // Clear delete confirmation state
    setDeleteClickedId(null);

    // Optimistic update
    setSteps((current) => current.filter((s) => s.id !== stepId));

    const { error } = await supabase
      .from('route_steps')
      .delete()
      .eq('id', stepId);

    if (error) {
      alert('Error deleting task: ' + error.message);
      // Reload steps on error
      const { data } = await supabase
        .from('route_steps')
        .select('*')
        .eq('room_id', room.id)
        .order('step_order', { ascending: true });
      setSteps(data || []);
    }
  }, [isAdmin, room.id]);

  function copyAdminLink() {
    const adminKey = localStorage.getItem(`admin_key_${room.id}`);
    if (!adminKey) {
      alert('Admin key not found');
      return;
    }
    const adminUrl = `${window.location.origin}/route/${room.id}?key=${adminKey}`;
    navigator.clipboard.writeText(adminUrl);
    setCopiedLink('admin');
    setTimeout(() => setCopiedLink(null), 2000);
  }

  function copyViewOnlyLink() {
    const viewUrl = `${window.location.origin}/route/${room.id}`;
    navigator.clipboard.writeText(viewUrl);
    setCopiedLink('view');
    setTimeout(() => setCopiedLink(null), 2000);
  }

  const handleDeleteClick = useCallback((stepId: string) => {
    setDeleteClickedId(stepId);
    setTimeout(() => setDeleteClickedId(null), 2000);
  }, []);

  function startEditingName() {
    setEditingNameValue(roomName);
    setIsEditingName(true);
  }

  async function saveRoomName() {
    if (!isAdmin) return;

    const trimmedName = editingNameValue.trim();
    if (!trimmedName || trimmedName === roomName) {
      setIsEditingName(false);
      return;
    }

    // Optimistic update
    setRoomName(trimmedName);
    setIsEditingName(false);

    const { error } = await supabase
      .from('rooms')
      .update({ name: trimmedName })
      .eq('id', room.id);

    if (error) {
      alert('Error updating room name: ' + error.message);
      // Revert on error
      setRoomName(roomName);
    }
  }

  function cancelEditingName() {
    setIsEditingName(false);
    setEditingNameValue(roomName);
  }

  function toggleLibrary() {
    const newState = !isLibraryCollapsed;
    setIsLibraryCollapsed(newState);
    localStorage.setItem('library_collapsed', String(newState));
  }

  function toggleLibraryPosition() {
    const newPosition = libraryPosition === 'sidebar' ? 'bottom' : 'sidebar';
    setLibraryPosition(newPosition);
    localStorage.setItem('library_position', newPosition);
  }

  function handleResizeStart() {
    setIsResizing(true);
  }

  function handleResize(e: MouseEvent) {
    if (!isResizing) return;

    if (libraryPosition === 'sidebar') {
      // Resize width from the right edge (mouse X position from right)
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(250, Math.min(600, newWidth));
      setLibraryWidth(clampedWidth);
    } else {
      // Resize height from the bottom edge (mouse Y position from bottom)
      const newHeight = window.innerHeight - e.clientY;
      const clampedHeight = Math.max(200, Math.min(600, newHeight));
      setLibraryHeight(clampedHeight);
    }
  }

  function handleResizeEnd() {
    if (isResizing) {
      setIsResizing(false);
      // Save to localStorage
      localStorage.setItem('library_width', String(libraryWidth));
      localStorage.setItem('library_height', String(libraryHeight));
    }
  }

  // Add resize event listeners
  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => handleResize(e);
      const handleMouseUp = () => handleResizeEnd();

      // Add cursor style and prevent text selection during resize
      document.body.style.cursor = libraryPosition === 'sidebar' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, libraryPosition, libraryWidth, libraryHeight]);

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveId(id);

    if (id.startsWith('library-')) {
      // Library drag - create phantom step
      const task = event.active.data.current as any;
      if (task) {
        // Create phantom step from library task data
        const phantom: RouteStep = {
          id: `phantom-${task.id}`,
          room_id: room.id,
          step_order: -1,
          step_type: 'task',
          task_id: task.id,
          task_name: task.name,
          task_description: task.description || null,
          task_tier: task.tier,
          task_points: task.points,
          task_region: task.region,
          custom_text: null,
          player_state: {},
          created_at: null,
          updated_at: null,
        };
        setPendingStep(phantom);
      }
    }
    // Route-to-route: no overlay needed, item moves in-place
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (activeIdStr.startsWith('library-') && pendingStep) {
      // Library-to-route drag
      const phantomIndex = steps.findIndex(s => s.id === pendingStep.id);

      if (phantomIndex === -1) {
        // Phantom not yet in steps - inject it
        // Find where to insert based on what we're hovering over
        if (overIdStr === 'route-list') {
          // Hovering over the droppable zone itself - add to end
          setSteps(prev => [...prev, pendingStep]);
        } else {
          const overIndex = steps.findIndex(s => s.id === overIdStr);
          if (overIndex >= 0) {
            setSteps(prev => {
              const next = [...prev];
              next.splice(overIndex, 0, pendingStep);
              return next;
            });
          }
        }
      } else if (overIdStr !== pendingStep.id && overIdStr !== 'route-list') {
        // Phantom already in steps - move it to new position
        const overIndex = steps.findIndex(s => s.id === overIdStr);
        if (overIndex >= 0 && overIndex !== phantomIndex) {
          setSteps(prev => arrayMove(prev, phantomIndex, overIndex));
        }
      }
    } else if (!activeIdStr.startsWith('library-')) {
      // Route-to-route drag - optimistically reorder during drag
      if (overIdStr === 'route-list' || activeIdStr === overIdStr) return;

      const oldIndex = steps.findIndex(s => s.id === activeIdStr);
      const newIndex = steps.findIndex(s => s.id === overIdStr);

      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        setSteps(prev => arrayMove(prev, oldIndex, newIndex));
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active } = event;
    const activeIdStr = String(active.id);

    setActiveId(null);

    if (activeIdStr.startsWith('library-') && pendingStep) {
      // Library-to-route: persist the phantom
      const phantomIndex = steps.findIndex(s => s.id === pendingStep.id);

      if (phantomIndex === -1) {
        // Phantom never entered the route (dropped outside) - nothing to do
        setPendingStep(null);
        return;
      }

      // Insert with a high step_order to avoid unique constraint collision,
      // then the reorder RPC will set the correct position
      const tempOrder = 2000000000 - Math.floor(Math.random() * 1000000);
      const { data: newStep, error: insertError } = await supabase
        .from('route_steps')
        .insert({
          room_id: room.id,
          step_order: tempOrder,
          step_type: 'task',
          task_id: pendingStep.task_id,
          task_name: pendingStep.task_name,
          task_description: pendingStep.task_description,
          task_tier: pendingStep.task_tier,
          task_points: pendingStep.task_points,
          task_region: pendingStep.task_region,
          player_state: {},
        })
        .select()
        .single();

      if (insertError || !newStep) {
        // Remove phantom on error
        setSteps(prev => prev.filter(s => s.id !== pendingStep.id));
        setPendingStep(null);
        alert('Error adding task: ' + insertError?.message);
        return;
      }

      const newStepTyped = newStep as RouteStep;

      // Replace phantom with real step in local state
      setSteps(prev => prev.map(s => s.id === pendingStep.id ? newStepTyped : s));

      // Persist the order (steps already in desired position from handleDragOver)
      const finalSteps = steps.map(s => s.id === pendingStep.id ? newStepTyped : s);
      const updates = finalSteps.map((step, index) => ({
        id: step.id,
        step_order: index,
      }));

      const { error: reorderError } = await supabase.rpc('reorder_route_steps', {
        p_room_id: room.id,
        step_updates: updates,
      });

      if (reorderError) {
        console.error('Error reordering:', reorderError);
      }

      setPendingStep(null);
      return;
    }

    // Route-to-route: steps are already in final order from handleDragOver
    // Just persist to DB
    const updates = steps.map((step, index) => ({
      id: step.id,
      step_order: index,
    }));

    const { error } = await supabase.rpc('reorder_route_steps', {
      step_updates: updates,
    });

    if (error) {
      console.error('Error reordering steps:', error);
      alert('Error reordering tasks: ' + error.message);
      // Reload steps on error
      const { data } = await supabase
        .from('route_steps')
        .select('*')
        .eq('room_id', room.id)
        .order('step_order', { ascending: true });
      setSteps(data || []);
    }
  }

  function handleDragCancel() {
    // Remove phantom from steps if present
    if (pendingStep) {
      setSteps(prev => prev.filter(s => s.id !== pendingStep.id));
      setPendingStep(null);
    }
    setActiveId(null);
  }

  const playerIds = useMemo(() => Object.keys(playerNames).sort(), [playerNames]);

  // Calculate milestones
  const milestones = useMemo(() => calculateMilestones(steps), [steps]);

  // Calculate cumulative totals for display
  const { totalPoints, totalTasks, cumulativeByStepId } = useMemo(() => {
    let points = 0;
    let tasks = 0;
    const cumulative: Record<string, { points: number; tasks: number }> = {};

    for (const step of steps) {
      if (step.step_type === 'task' && step.task_points) {
        points += step.task_points;
        tasks += 1;
      } else if (step.step_type === 'custom') {
        tasks += 1;
      }
      cumulative[step.id] = { points, tasks };
    }

    return { totalPoints: points, totalTasks: tasks, cumulativeByStepId: cumulative };
  }, [steps]);

  // Calculate progress to next milestone
  const nextMilestones = useMemo(() => {
    // Find next relic tier
    let nextRelic = null;
    for (const tier of RELIC_TIERS) {
      if (totalPoints < tier.threshold) {
        nextRelic = {
          ...tier,
          progress: totalPoints,
          remaining: tier.threshold - totalPoints,
          percentage: tier.threshold === 0 ? 100 : (totalPoints / tier.threshold) * 100,
        };
        break;
      }
    }

    // Find next area unlock
    let nextArea = null;
    for (const area of AREA_UNLOCKS) {
      if (totalTasks < area.threshold) {
        nextArea = {
          ...area,
          progress: totalTasks,
          remaining: area.threshold - totalTasks,
          percentage: (totalTasks / area.threshold) * 100,
        };
        break;
      }
    }

    return { nextRelic, nextArea };
  }, [totalPoints, totalTasks]);

  return (
    <div className="h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col">
      {/* Sharp Modern Header */}
      <div className="border-b border-[var(--border-strong)] bg-[var(--bg-elevated)] px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            {/* Editable Room Name */}
            <div suppressHydrationWarning>
              {isEditingName ? (
                <input
                  type="text"
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  onBlur={saveRoomName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRoomName();
                    if (e.key === 'Escape') cancelEditingName();
                  }}
                  autoFocus
                  maxLength={50}
                  className="text-2xl font-bold tracking-tight bg-[var(--bg-surface)] border border-[var(--gold)] rounded px-2 py-1 text-[var(--text-primary)] focus:outline-none"
                />
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {roomName}
                  </h1>
                  {mounted && isAdmin && (
                    <button
                      onClick={startEditingName}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--bg-surface)] rounded"
                      title="Edit route name"
                    >
                      <Pencil size={16} className="text-[var(--text-tertiary)]" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--bg-surface)] border border-[var(--border-standard)]" suppressHydrationWarning>
                <div className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-[var(--gold)]' : 'bg-[var(--steel)}'}`}></div>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  {mounted && (isAdmin ? 'ADMIN' : 'VIEW-ONLY')}
                </span>
              </div>

              {/* Current Totals */}
              <div className="flex items-center gap-3 text-sm font-mono font-semibold">
                <span className="text-[var(--crimson)]">
                  {totalPoints.toLocaleString()}
                </span>
                <span className="text-[var(--text-tertiary)]">pts</span>
                <div className="w-px h-4 bg-[var(--border-standard)]"></div>
                <span className="text-[var(--gold)]">
                  {totalTasks}
                </span>
                <span className="text-[var(--text-tertiary)]">tasks</span>
              </div>

              {/* Progress Bars to Next Milestones */}
              <div className="flex items-center gap-4 pl-4 border-l border-[var(--border-standard)]">
                {/* Next Relic Progress */}
                {nextMilestones.nextRelic && (
                  <div className="flex flex-col gap-1 min-w-[140px]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--crimson)] font-semibold">
                        {nextMilestones.nextRelic.label}
                      </span>
                      <span className="text-[var(--text-tertiary)] font-mono text-[10px]">
                        {nextMilestones.nextRelic.remaining} pts
                      </span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r from-[var(--crimson)] to-[var(--crimson-light)] rounded-full transition-all duration-500 ease-out ${
                          nextMilestones.nextRelic.percentage >= 90 ? 'animate-pulse' : ''
                        }`}
                        style={{ width: `${Math.min(nextMilestones.nextRelic.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Next Area Progress */}
                {nextMilestones.nextArea && (
                  <div className="flex flex-col gap-1 min-w-[140px]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--gold)] font-semibold">
                        {nextMilestones.nextArea.label}
                      </span>
                      <span className="text-[var(--text-tertiary)] font-mono text-[10px]">
                        {nextMilestones.nextArea.remaining} tasks
                      </span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] rounded-full transition-all duration-500 ease-out ${
                          nextMilestones.nextArea.percentage >= 90 ? 'animate-pulse' : ''
                        }`}
                        style={{ width: `${Math.min(nextMilestones.nextArea.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2" suppressHydrationWarning>
            {mounted && isAdmin && (
              <>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-3 py-1.5 rounded-md bg-[var(--gold)] hover:bg-[var(--gold-deep)] text-white text-sm font-semibold transition-colors"
                  title="Share route"
                >
                  Share
                </button>
                <button
                  onClick={openPlayerModal}
                  className="px-3 py-1.5 rounded-md bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-standard)] text-[var(--text-primary)] text-sm font-semibold transition-colors"
                  title="Manage Players"
                >
                  Players
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Split Pane Layout - Wrapped in DndContext for cross-pane dragging */}
      <DndContext
        id="route-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={`flex-1 ${libraryPosition === 'sidebar' ? 'flex' : 'flex flex-col'} overflow-hidden`}>
          {/* Left Pane - Route */}
          <div className={`flex-1 flex flex-col overflow-hidden ${libraryPosition === 'sidebar' ? 'border-r' : 'border-b'} border-[var(--border-standard)]`}>
            <div className="flex-1 p-4 overflow-y-auto">
              {/* Task List */}
              <div className="flex flex-col gap-2" suppressHydrationWarning>
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

                <div ref={setRouteDropRef} className="min-h-[200px] flex flex-col gap-0.5">
                  <SortableContext
                    items={steps.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
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
                        isAdmin={isAdmin}
                        mounted={mounted}
                        onToggleMilestoneCheckbox={toggleMilestoneCheckbox}
                      />
                    ))
                  }

                  {steps.map((step, index) => {
                    const cumulative = cumulativeByStepId[step.id] || { points: 0, tasks: 0 };

                    // Milestones that belong after this step
                    const milestonesAfter = milestones.filter(m => m.insertAfterIndex === index);

                    // Phantom step gets a distinct visual style
                    const isPhantom = pendingStep && step.id === pendingStep.id;

                    return (
                      <Fragment key={step.id}>
                        {isPhantom ? (
                          <div className="bg-[var(--gold)]/10 border-2 border-dashed border-[var(--gold)] rounded-md p-1.5 flex gap-2 items-center opacity-70">
                            {isAdmin && <div className="w-[14px] flex-shrink-0"></div>}
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              {(step as any).task_tier && (
                                <>
                                  <span className={`w-14 px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 text-center ${
                                    (step as any).task_tier === 'Easy'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : (step as any).task_tier === 'Medium'
                                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                      : (step as any).task_tier === 'Hard'
                                      ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                                      : (step as any).task_tier === 'Elite'
                                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                  }`}>
                                    {(step as any).task_tier}
                                  </span>
                                  <span className="w-10 text-xs text-[var(--gold)] font-mono font-bold flex-shrink-0 pl-2">
                                    {(step as any).task_points}
                                  </span>
                                </>
                              )}
                              <div className="text-sm font-medium truncate text-[var(--text-primary)]">
                                {(step as any).task_name || 'Task'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <SortableTaskItem
                            step={step}
                            playerIds={playerIds}
                            playerNames={playerNames}
                            isAdmin={isAdmin}
                            mounted={mounted}
                            deleteClickedId={deleteClickedId}
                            cumulativePoints={cumulative.points}
                            cumulativeTasks={cumulative.tasks}
                            onToggleCheckbox={toggleCheckbox}
                            onDelete={deleteTask}
                            onDeleteClick={handleDeleteClick}
                            completedSteps={completedSteps}
                          />
                        )}
                        {milestonesAfter.map(m => (
                          <MilestoneRow
                            key={m.id}
                            milestone={m}
                            playerIds={playerIds}
                            playerNames={playerNames}
                            milestonePlayerState={milestonePlayerState}
                            isAdmin={isAdmin}
                            mounted={mounted}
                            onToggleMilestoneCheckbox={toggleMilestoneCheckbox}
                          />
                        ))}
                      </Fragment>
                    );
                  })}

                  {steps.length === 0 && (
                    <p className="text-[var(--text-tertiary)] text-center py-12 text-sm">
                      No tasks yet. {isAdmin && 'Drag tasks from the library or add a custom task.'}
                    </p>
                  )}
                  </SortableContext>
                </div>
              </div>
          </div>
        </div>

        {/* Task Library */}
        <div
          className={`flex-shrink-0 bg-[var(--bg-base)] relative ${
            isLibraryCollapsed
              ? libraryPosition === 'sidebar' ? 'w-12' : 'h-12'
              : ''
          }`}
          style={
            !isLibraryCollapsed
              ? libraryPosition === 'sidebar'
                ? { width: `${libraryWidth}px` }
                : { height: `${libraryHeight}px` }
              : undefined
          }
        >
          {/* Resize Handle */}
          {!isLibraryCollapsed && (
            <div
              onMouseDown={handleResizeStart}
              className={`absolute z-10 group flex items-center justify-center ${
                libraryPosition === 'sidebar'
                  ? 'left-0 top-0 bottom-0 w-3 cursor-col-resize'
                  : 'top-0 left-0 right-0 h-3 cursor-row-resize'
              }`}
            >
              {/* Visual Line */}
              <div className={`${
                libraryPosition === 'sidebar'
                  ? 'w-0.5 h-full'
                  : 'h-0.5 w-full'
              } bg-transparent group-hover:bg-[var(--gold)]/50 transition-colors ${
                isResizing ? 'bg-[var(--gold)]' : ''
              }`} />

              {/* Grip Icon */}
              <div className="absolute opacity-50 group-hover:opacity-100 transition-opacity bg-[var(--bg-elevated)] rounded px-0.5">
                {libraryPosition === 'sidebar' ? (
                  <GripVertical size={14} className="text-[var(--gold)]" />
                ) : (
                  <GripHorizontal size={14} className="text-[var(--gold)]" />
                )}
              </div>
            </div>
          )}

          {isLibraryCollapsed ? (
            <div className={`${
              libraryPosition === 'sidebar'
                ? 'h-full flex flex-col items-center pt-4 border-l'
                : 'w-full flex flex-row justify-center items-center pl-4 border-t'
            } border-[var(--border-standard)]`}>
              <button
                onClick={toggleLibrary}
                className="p-2 hover:bg-[var(--bg-surface)] rounded transition-colors"
                title="Expand task library"
              >
                {libraryPosition === 'sidebar' ? (
                  <ChevronLeft size={20} className="text-[var(--text-tertiary)]" />
                ) : (
                  <ChevronUp size={20} className="text-[var(--text-tertiary)]" />
                )}
              </button>
            </div>
          ) : (
            <TaskLibrary
              roomId={room.id}
              isAdmin={isAdmin}
              onAddTask={addOfficialTask}
              onAddCustomTask={addTask}
              onCollapse={toggleLibrary}
              position={libraryPosition}
              routeSteps={steps}
            />
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null} />
      </DndContext>

      {/* Player Management Modal */}
      {showPlayerModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg p-6 w-96 shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">
                Manage Players
              </h2>
              <div className="space-y-2 mb-6">
                {Object.entries(editingPlayers)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([playerId, name]) => (
                    <div key={playerId} className="flex gap-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) =>
                          updatePlayerName(playerId, e.target.value)
                        }
                        maxLength={20}
                        className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-standard)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--gold)] transition-colors"
                      />
                      <button
                        onClick={() => removePlayer(playerId)}
                        className="bg-[var(--crimson)] hover:bg-[var(--crimson-deep)] px-3 py-2 rounded-md text-white text-sm font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                {Object.keys(editingPlayers).length < 6 && (
                  <button
                    onClick={addPlayer}
                    className="w-full bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-4 py-2 rounded-md border border-[var(--border-standard)] text-[var(--text-primary)] text-sm font-semibold transition-colors"
                  >
                    + Add Player
                  </button>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowPlayerModal(false)}
                  className="bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-4 py-2 rounded-md border border-[var(--border-standard)] text-[var(--text-secondary)] text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePlayers}
                  className="bg-[var(--crimson)] hover:bg-[var(--crimson-deep)] px-4 py-2 rounded-md text-white text-sm font-semibold transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Share Modal */}
      {showShareModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg p-6 w-[440px] shadow-2xl">
              <h2 className="text-xl font-bold mb-2 text-[var(--text-primary)]">
                Share Route
              </h2>
              <p className="text-sm text-[var(--text-tertiary)] mb-6">
                Click to copy a link to your clipboard
              </p>

              <div className="space-y-3 mb-6">
                {/* Admin Link */}
                <button
                  onClick={copyAdminLink}
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
                      {copiedLink === 'admin' ? '✓ Copied!' : 'Copy'}
                    </div>
                  </div>
                </button>

                {/* View-Only Link */}
                <button
                  onClick={copyViewOnlyLink}
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
                      {copiedLink === 'view' ? '✓ Copied!' : 'Copy'}
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-4 py-2 rounded-md border border-[var(--border-standard)] text-[var(--text-primary)] text-sm font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
