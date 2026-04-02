'use client';

import { supabase } from '@/lib/supabase';
import { Room, RouteStep, OfficialRelic, OfficialRegion, MilestoneSelections } from '@/types';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { GripVertical, GripHorizontal, ChevronLeft, ChevronUp } from 'lucide-react';
import TaskLibrary from './TaskLibrary';
import {
  calculateMilestones,
  RELIC_TIERS,
  AREA_UNLOCKS,
} from '@/lib/milestones';
import {
  DndContext,
  closestCenter,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { snapCenterToCursor } from '@dnd-kit/modifiers';

import RouteHeader from './components/RouteHeader';
import RouteTaskList from './components/RouteTaskList';
import DragOverlayContent from './components/DragOverlayContent';
import PlayerModal from './components/PlayerModal';
import ShareModal from './components/ShareModal';
import LiveCursors from './components/LiveCursors';
import { usePresence } from './hooks/usePresence';

type PlayerNames = Record<string, string>;

export default function RouteClient({
  room,
  initialSteps,
  relics,
  regions,
}: {
  room: Room;
  initialSteps: RouteStep[];
  relics: OfficialRelic[];
  regions: OfficialRegion[];
}) {
  // ──────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────
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
  const [milestoneSelections, setMilestoneSelections] = useState<MilestoneSelections>(
    (room.milestone_selections as MilestoneSelections) || {}
  );
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [insertAnimatingIds, setInsertAnimatingIds] = useState<Set<string>>(new Set());
  const [roomName, setRoomName] = useState(room.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState(room.name);
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
  const [libraryPosition, setLibraryPosition] = useState<'sidebar' | 'bottom'>('sidebar');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<'admin' | 'view' | null>(null);
  const [libraryWidth, setLibraryWidth] = useState(350);
  const [libraryHeight, setLibraryHeight] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  // DnD state - inline preview injection
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [previewStep, setPreviewStep] = useState<RouteStep | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isOverRouteArea, setIsOverRouteArea] = useState(false);
  const [draggedRouteStep, setDraggedRouteStep] = useState<RouteStep | null>(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState<number | null>(null);

  // ──────────────────────────────────────────────
  // DnD sensors
  // ──────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ──────────────────────────────────────────────
  // Presence (live cursors)
  // ──────────────────────────────────────────────
  const { others: presenceOthers, color: presenceColor, name: presenceName, setName: setPresenceName } = usePresence(room.id);

  // ──────────────────────────────────────────────
  // Init & localStorage
  // ──────────────────────────────────────────────
  useEffect(() => {
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

    const storedCollapsed = localStorage.getItem('library_collapsed');
    if (storedCollapsed !== null) setIsLibraryCollapsed(storedCollapsed === 'true');

    const storedPosition = localStorage.getItem('library_position');
    if (storedPosition === 'sidebar' || storedPosition === 'bottom') setLibraryPosition(storedPosition);

    const storedWidth = localStorage.getItem('library_width');
    if (storedWidth) setLibraryWidth(parseInt(storedWidth, 10));

    const storedHeight = localStorage.getItem('library_height');
    if (storedHeight) setLibraryHeight(parseInt(storedHeight, 10));

    setMounted(true);
  }, [room.id]);

  // ──────────────────────────────────────────────
  // Real-time subscriptions
  // ──────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`room_${room.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'route_steps', filter: `room_id=eq.${room.id}` },
        (payload) => {
          setSteps((current) => {
            const exists = current.some(step => step.id === payload.new.id);
            if (exists) return current;
            const newSteps = [...current, payload.new as RouteStep];
            return newSteps.sort((a, b) => a.step_order - b.step_order);
          });
          // Clear preview if real-time insert matches the previewed task
          setPreviewStep((current) => {
            if (current && current.task_id === (payload.new as RouteStep).task_id) {
              setPreviewIndex(null);
              return null;
            }
            return current;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'route_steps', filter: `room_id=eq.${room.id}` },
        (payload) => {
          setSteps((current) => {
            const updatedSteps = current.map((step) =>
              step.id === payload.new.id ? (payload.new as RouteStep) : step
            );
            return updatedSteps.sort((a, b) => a.step_order - b.step_order);
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'route_steps', filter: `room_id=eq.${room.id}` },
        (payload) => {
          setSteps((current) => current.filter((step) => step.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`room_updates_${room.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          setPlayerNames(payload.new.player_names as PlayerNames);
          setMilestonePlayerState(
            (payload.new.milestone_player_state as Record<string, Record<string, boolean>>) || {}
          );
          setMilestoneSelections(
            (payload.new.milestone_selections as MilestoneSelections) || {}
          );
          setRoomName(payload.new.name as string);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id]);

  // ──────────────────────────────────────────────
  // Task CRUD
  // ──────────────────────────────────────────────
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
    if (error) alert('Error adding task: ' + error.message);
  }

  async function addOfficialTask(taskId: number) {
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
    if (error) alert('Error adding task: ' + error.message);
  }

  // ──────────────────────────────────────────────
  // Player management
  // ──────────────────────────────────────────────
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
    if (!nextId) { alert('Maximum 6 players allowed'); return; }
    setEditingPlayers({ ...editingPlayers, [nextId]: `Player ${nextId.slice(1)}` });
  }

  function removePlayer(playerId: string) {
    const { [playerId]: removed, ...rest } = editingPlayers;
    setEditingPlayers(rest);
  }

  function updatePlayerName(playerId: string, name: string) {
    if (name.length > 20) return;
    setEditingPlayers({ ...editingPlayers, [playerId]: name });
  }

  async function savePlayers() {
    const { error } = await supabase
      .from('rooms')
      .update({ player_names: editingPlayers })
      .eq('id', room.id);
    if (error) { alert('Error saving players: ' + error.message); return; }
    setShowPlayerModal(false);
  }

  // ──────────────────────────────────────────────
  // Checkbox handlers
  // ──────────────────────────────────────────────
  const toggleCheckbox = useCallback(async (stepId: string, playerId: string) => {
    if (!isAdmin) return;
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;

    const currentState = (step.player_state as Record<string, boolean | null>)[playerId];
    const newState = currentState === true ? false : true;
    const updatedPlayerState = {
      ...(step.player_state as Record<string, boolean | null>),
      [playerId]: newState,
    };

    setSteps((current) =>
      current.map((s) => s.id === stepId ? { ...s, player_state: updatedPlayerState } : s)
    );

    const pIds = Object.keys(playerNames);
    const allChecked = pIds.length > 0 && pIds.every((pid) => updatedPlayerState[pid] === true);
    if (allChecked && newState === true) {
      setCompletedSteps((current) => new Set(current).add(stepId));
      setTimeout(() => {
        setCompletedSteps((current) => { const next = new Set(current); next.delete(stepId); return next; });
      }, 800);
    }

    const { error } = await supabase
      .from('route_steps')
      .update({ player_state: updatedPlayerState })
      .eq('id', stepId);

    if (error) {
      alert('Error updating checkbox: ' + error.message);
      setSteps((current) => current.map((s) => (s.id === stepId ? step : s)));
    }
  }, [isAdmin, steps, playerNames]);

  const toggleMilestoneCheckbox = useCallback(async (milestoneId: string, playerId: string) => {
    if (!isAdmin) return;
    const currentState = milestonePlayerState[milestoneId]?.[playerId] || false;
    const updatedMilestoneState = {
      ...milestonePlayerState,
      [milestoneId]: { ...(milestonePlayerState[milestoneId] || {}), [playerId]: !currentState },
    };
    setMilestonePlayerState(updatedMilestoneState);

    const { error } = await supabase
      .from('rooms')
      .update({ milestone_player_state: updatedMilestoneState })
      .eq('id', room.id);

    if (error) {
      alert('Error updating milestone checkbox: ' + error.message);
      setMilestonePlayerState(milestonePlayerState);
    }
  }, [isAdmin, milestonePlayerState, room.id]);

  const handleMilestoneSelection = useCallback(async (milestoneId: string, selectedId: number | null) => {
    if (!isAdmin) return;
    const updatedSelections = { ...milestoneSelections };
    if (selectedId === null) delete updatedSelections[milestoneId];
    else updatedSelections[milestoneId] = selectedId;

    setMilestoneSelections(updatedSelections);

    const { error } = await supabase
      .from('rooms')
      .update({ milestone_selections: updatedSelections })
      .eq('id', room.id);

    if (error) {
      alert('Error updating milestone selection: ' + error.message);
      setMilestoneSelections(milestoneSelections);
    }
  }, [isAdmin, milestoneSelections, room.id]);

  // ──────────────────────────────────────────────
  // Delete
  // ──────────────────────────────────────────────
  const deleteTask = useCallback(async (stepId: string) => {
    if (!isAdmin) return;
    setDeleteClickedId(null);
    setSteps((current) => current.filter((s) => s.id !== stepId));

    const { error } = await supabase
      .from('route_steps')
      .delete()
      .eq('id', stepId);

    if (error) {
      alert('Error deleting task: ' + error.message);
      const { data } = await supabase
        .from('route_steps')
        .select('*')
        .eq('room_id', room.id)
        .order('step_order', { ascending: true });
      setSteps(data || []);
    }
  }, [isAdmin, room.id]);

  const handleDeleteClick = useCallback((stepId: string) => {
    setDeleteClickedId(stepId);
    setTimeout(() => setDeleteClickedId(null), 2000);
  }, []);

  // ──────────────────────────────────────────────
  // Room name editing
  // ──────────────────────────────────────────────
  function startEditingName() {
    setEditingNameValue(roomName);
    setIsEditingName(true);
  }

  async function saveRoomName() {
    if (!isAdmin) return;
    const trimmedName = editingNameValue.trim();
    if (!trimmedName || trimmedName === roomName) { setIsEditingName(false); return; }
    setRoomName(trimmedName);
    setIsEditingName(false);

    const { error } = await supabase
      .from('rooms')
      .update({ name: trimmedName })
      .eq('id', room.id);

    if (error) { alert('Error updating room name: ' + error.message); setRoomName(roomName); }
  }

  function cancelEditingName() {
    setIsEditingName(false);
    setEditingNameValue(roomName);
  }

  // ──────────────────────────────────────────────
  // Share links
  // ──────────────────────────────────────────────
  function copyAdminLink() {
    const adminKey = localStorage.getItem(`admin_key_${room.id}`);
    if (!adminKey) { alert('Admin key not found'); return; }
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

  // ──────────────────────────────────────────────
  // Library layout
  // ──────────────────────────────────────────────
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

  function handleResizeStart() { setIsResizing(true); }

  function handleResize(e: MouseEvent) {
    if (!isResizing) return;
    if (libraryPosition === 'sidebar') {
      const newWidth = window.innerWidth - e.clientX;
      setLibraryWidth(Math.max(250, Math.min(600, newWidth)));
    } else {
      const newHeight = window.innerHeight - e.clientY;
      setLibraryHeight(Math.max(200, Math.min(600, newHeight)));
    }
  }

  function handleResizeEnd() {
    if (isResizing) {
      setIsResizing(false);
      localStorage.setItem('library_width', String(libraryWidth));
      localStorage.setItem('library_height', String(libraryHeight));
    }
  }

  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => handleResize(e);
      const handleMouseUp = () => handleResizeEnd();
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

  // ──────────────────────────────────────────────
  // Custom collision detection
  // ──────────────────────────────────────────────
  // For library→route drags: use pointerWithin so the indicator follows the cursor.
  // For route→route reorders: use closestCenter (works great for sortable lists).
  // In both cases, prefer individual sortable items over the container droppable.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    // Both library and route drags use the same preview system now,
    // so use the same pointer-based collision for both.
    const pointerCollisions = pointerWithin(args);
    const itemHits = pointerCollisions.filter(c => c.id !== 'route-list');
    if (itemHits.length > 0) return itemHits;

    // Pointer is in a gap between items - pointerWithin only found the container.
    // Fall back to closestCenter to find the nearest item instead of snapping to end.
    const centerCollisions = closestCenter(args);
    const centerItems = centerCollisions.filter(c => c.id !== 'route-list');
    if (centerItems.length > 0) return centerItems;

    // No items at all (empty list) - return the container so we can drop into it
    return pointerCollisions;
  }, []);

  // ──────────────────────────────────────────────
  // Drag & Drop handlers (CLEAN - no phantom steps)
  // ──────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveId(id);

    if (id.startsWith('library-')) {
      // Store the library task data for the overlay
      const task = event.active.data.current as any;
      if (task) {
        setActiveDragData({
          id: task.id,
          name: task.name,
          tier: task.tier,
          points: task.points,
          region: task.region,
        });
      }
    } else {
      // Route task - remove from list and show as preview
      const stepIndex = steps.findIndex(s => s.id === id);
      const step = stepIndex >= 0 ? steps[stepIndex] : null;
      if (step) {
        setActiveDragData({
          id: step.task_id || step.id,
          name: (step as any).task_name || step.custom_text || 'Task',
          tier: (step as any).task_tier,
          points: (step as any).task_points,
          region: (step as any).task_region,
        });

        // Remove from steps and store for recovery
        setDraggedRouteStep(step);
        setDraggedFromIndex(stepIndex);
        setSteps(prev => prev.filter(s => s.id !== id));

        // Show as preview at original position
        setPreviewStep({
          ...step,
          id: `preview-reorder-${step.id}`,
        });
        setPreviewIndex(stepIndex);
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      setPreviewStep(null);
      setPreviewIndex(null);
      setIsOverRouteArea(false);
      return;
    }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (activeIdStr.startsWith('library-')) {
      // Library → Route: inject preview step at target position
      const task = active.data.current as any;
      if (!task) return;

      let newIndex: number;

      if (overIdStr === 'route-list') {
        newIndex = steps.length; // after last item (empty area)
      } else {
        // Find over index in the *real* steps (ignore preview)
        const overStep = steps.findIndex(s => s.id === overIdStr);
        if (overStep < 0) {
          // Over item might be the preview itself - keep current index
          setIsOverRouteArea(true);
          return;
        }

        // Direction-aware placement: as soon as cursor enters an item,
        // that item displaces out of the way immediately.
        if (previewIndex !== null && previewIndex <= overStep) {
          // Moving down - place after the hovered item
          newIndex = overStep + 1;
        } else {
          // Moving up or first hover - place before the hovered item
          newIndex = overStep;
        }
      }

      // Skip update if index hasn't changed
      if (newIndex === previewIndex && previewStep !== null) {
        setIsOverRouteArea(true);
        return;
      }

      setIsOverRouteArea(true);
      setPreviewIndex(newIndex);

      // Create preview RouteStep (only if we don't have one yet, or task changed)
      if (!previewStep || previewStep.task_id !== task.id) {
        setPreviewStep({
          id: `preview-${task.id}`,
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
          created_at: new Date().toISOString(),
        } as RouteStep);
      }
    } else {
      // Route → Route: use preview system (step already removed in handleDragStart)
      if (!draggedRouteStep) return;

      let newIndex: number;

      if (overIdStr === 'route-list') {
        newIndex = steps.length; // after last item
      } else {
        const overStep = steps.findIndex(s => s.id === overIdStr);
        if (overStep < 0) {
          // Over the preview itself - keep current index
          setIsOverRouteArea(true);
          return;
        }

        // Direction-aware placement
        if (previewIndex !== null && previewIndex <= overStep) {
          newIndex = overStep + 1;
        } else {
          newIndex = overStep;
        }
      }

      if (newIndex === previewIndex && previewStep !== null) {
        setIsOverRouteArea(true);
        return;
      }

      setIsOverRouteArea(true);
      setPreviewIndex(newIndex);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeIdStr = String(active.id);

    // Capture the visual drop position before clearing state
    const finalDropIndex = previewIndex;

    // Clear all DnD visual state
    setActiveId(null);
    setActiveDragData(null);
    setPreviewStep(null);
    setPreviewIndex(null);
    setIsOverRouteArea(false);

    if (activeIdStr.startsWith('library-')) {
      // Library → Route: insert task at drop position
      if (!over && finalDropIndex === null) return; // Dropped outside with no preview - do nothing

      const task = active.data.current as any;
      if (!task) return;

      // Use the preview position the user saw, fall back to end of list
      const insertIndex = finalDropIndex ?? steps.length;

      // Use a temp high order to avoid unique constraint collision
      const tempOrder = 2000000000 - Math.floor(Math.random() * 1000000);

      const { data: newStep, error: insertError } = await supabase
        .from('route_steps')
        .insert({
          room_id: room.id,
          step_order: tempOrder,
          step_type: 'task',
          task_id: task.id,
          task_name: task.name,
          task_description: task.description || null,
          task_tier: task.tier,
          task_points: task.points,
          task_region: task.region,
          player_state: {},
        })
        .select()
        .single();

      if (insertError || !newStep) {
        alert('Error adding task: ' + insertError?.message);
        return;
      }

      const newStepTyped = newStep as RouteStep;

      // Optimistically insert at the correct position
      const updatedSteps = [...steps];
      updatedSteps.splice(insertIndex, 0, newStepTyped);
      setSteps(updatedSteps);

      // Trigger insert animation
      setInsertAnimatingIds(prev => new Set(prev).add(newStepTyped.id));
      setTimeout(() => {
        setInsertAnimatingIds(prev => {
          const next = new Set(prev);
          next.delete(newStepTyped.id);
          return next;
        });
      }, 400);

      // Persist the order
      const updates = updatedSteps.map((step, index) => ({
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

      return;
    }

    // Route → Route: reinsert dragged step at preview position
    const droppedStep = draggedRouteStep;
    const dropIndex = finalDropIndex ?? draggedFromIndex ?? steps.length;

    // Clear route-drag state
    setDraggedRouteStep(null);
    setDraggedFromIndex(null);

    if (!droppedStep) return;

    // Reinsert at drop position
    const updatedSteps = [...steps];
    updatedSteps.splice(dropIndex, 0, droppedStep);
    setSteps(updatedSteps);

    const updates = updatedSteps.map((step, index) => ({
      id: step.id,
      step_order: index,
    }));

    const { error } = await supabase.rpc('reorder_route_steps', {
      p_room_id: room.id,
      step_updates: updates,
    });

    if (error) {
      console.error('Error reordering steps:', error);
      alert('Error reordering tasks: ' + error.message);
      const { data } = await supabase
        .from('route_steps')
        .select('*')
        .eq('room_id', room.id)
        .order('step_order', { ascending: true });
      setSteps(data || []);
    }
  }

  function handleDragCancel() {
    // Restore dragged route step to original position
    if (draggedRouteStep && draggedFromIndex !== null) {
      setSteps(prev => {
        const restored = [...prev];
        restored.splice(draggedFromIndex, 0, draggedRouteStep);
        return restored;
      });
    }

    setActiveId(null);
    setActiveDragData(null);
    setPreviewStep(null);
    setPreviewIndex(null);
    setIsOverRouteArea(false);
    setDraggedRouteStep(null);
    setDraggedFromIndex(null);
  }

  // ──────────────────────────────────────────────
  // Computed values
  // ──────────────────────────────────────────────
  const playerIds = useMemo(() => Object.keys(playerNames).sort(), [playerNames]);
  const milestones = useMemo(() => calculateMilestones(steps), [steps]);

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

  const nextMilestones = useMemo(() => {
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

  // Derived steps array with preview injected for rendering only
  const stepsWithPreview = useMemo(() => {
    if (!previewStep || previewIndex === null) return steps;
    const result = [...steps];
    result.splice(previewIndex, 0, previewStep);
    return result;
  }, [steps, previewStep, previewIndex]);

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <div className="h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col">
      <LiveCursors others={presenceOthers} />
      <RouteHeader
        roomName={roomName}
        isAdmin={isAdmin}
        mounted={mounted}
        totalPoints={totalPoints}
        totalTasks={totalTasks}
        nextRelic={nextMilestones.nextRelic}
        nextArea={nextMilestones.nextArea}
        isEditingName={isEditingName}
        editingNameValue={editingNameValue}
        onEditingNameChange={setEditingNameValue}
        onStartEditingName={startEditingName}
        onSaveRoomName={saveRoomName}
        onCancelEditingName={cancelEditingName}
        onShowShareModal={() => setShowShareModal(true)}
        onOpenPlayerModal={openPlayerModal}
        presenceOthers={presenceOthers}
        presenceColor={presenceColor}
        presenceName={presenceName}
        onPresenceNameChange={setPresenceName}
      />

      <DndContext
        id="route-dnd"
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={`flex-1 ${libraryPosition === 'sidebar' ? 'flex' : 'flex flex-col'} overflow-hidden`}>
          {/* Route Pane */}
          <div className={`flex-1 flex flex-col overflow-hidden ${libraryPosition === 'sidebar' ? 'border-r' : 'border-b'} border-[var(--border-standard)]`}>
            <div className={`flex-1 p-4 overflow-y-auto ${steps.length === 0 && !previewStep ? 'flex items-center justify-center' : ''}`}>
              <RouteTaskList
                steps={stepsWithPreview}
                milestones={milestones}
                playerIds={playerIds}
                playerNames={playerNames}
                isAdmin={isAdmin}
                mounted={mounted}
                deleteClickedId={deleteClickedId}
                cumulativeByStepId={cumulativeByStepId}
                completedSteps={completedSteps}
                insertAnimatingIds={insertAnimatingIds}
                milestonePlayerState={milestonePlayerState}
                milestoneSelections={milestoneSelections}
                relics={relics}
                regions={regions}
                previewStepId={previewStep?.id ?? null}
                onToggleCheckbox={toggleCheckbox}
                onDelete={deleteTask}
                onDeleteClick={handleDeleteClick}
                onToggleMilestoneCheckbox={toggleMilestoneCheckbox}
                onMilestoneSelection={handleMilestoneSelection}
              />
            </div>
          </div>

          {/* Task Library Pane */}
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
                <div className={`${
                  libraryPosition === 'sidebar' ? 'w-0.5 h-full' : 'h-0.5 w-full'
                } bg-transparent group-hover:bg-[var(--gold)]/50 transition-colors ${
                  isResizing ? 'bg-[var(--gold)]' : ''
                }`} />
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

        {/* Drag Overlay - hidden when preview is active (both library and route drags) */}
        <DragOverlay
          modifiers={[snapCenterToCursor]}
          dropAnimation={
            previewStep
              ? null
              : {
                  duration: 300,
                  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
                }
          }
        >
          {activeId && activeDragData && !previewStep && (
            <DragOverlayContent
              task={activeDragData}
              isOverRoute={false}
              sourceType={activeId.startsWith('library-') ? 'library' : 'route'}
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      {showPlayerModal && (
        <PlayerModal
          editingPlayers={editingPlayers}
          onUpdatePlayerName={updatePlayerName}
          onRemovePlayer={removePlayer}
          onAddPlayer={addPlayer}
          onSave={savePlayers}
          onClose={() => setShowPlayerModal(false)}
        />
      )}

      {showShareModal && (
        <ShareModal
          copiedLink={copiedLink}
          onCopyAdminLink={copyAdminLink}
          onCopyViewOnlyLink={copyViewOnlyLink}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
