'use client';

import { supabase } from '@/lib/supabase';
import { SafeRoom, RouteStep, OfficialRelic, OfficialRegion, MilestoneSelections } from '@/types';
import { apiRoomUpdate, apiStepInsert, apiStepUpdate, apiStepDelete, apiAuthenticate, apiFetchAdminKey } from '@/lib/api';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GripVertical, GripHorizontal, X, BookOpen, Trophy, Map, Crown, Eye, Clock } from 'lucide-react';
import TaskLibrary from './TaskLibrary';
import BuildPlanner from './components/BuildPlanner';
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

import { startTour, hasSeenTour } from '@/lib/tour';
import { saveRecentRoom, getRecentRooms, removeRecentRoom, timeAgo, RecentRoom } from '@/lib/recent-rooms';
import 'driver.js/dist/driver.css';

import RouteHeader from './components/RouteHeader';
import RouteTaskList from './components/RouteTaskList';
import DragOverlayContent from './components/DragOverlayContent';
import PlayerModal from './components/PlayerModal';
import ShareModal from './components/ShareModal';
import PremiumModal from './components/PremiumModal';
import LiveCursors from './components/LiveCursors';
import Tooltip from './components/Tooltip';
import { usePresence } from './hooks/usePresence';
import { usePremium } from './hooks/usePremium';
import { useRouter } from 'next/navigation';

type PlayerNames = Record<string, string>;

interface DragTaskData {
  id: number | string;
  name: string;
  tier?: string | null;
  points?: number | null;
  region?: string | null;
}

export default function RouteClient({
  room,
  initialSteps,
  relics,
  regions,
}: {
  room: SafeRoom;
  initialSteps: RouteStep[];
  relics: OfficialRelic[];
  regions: OfficialRegion[];
}) {
  const router = useRouter();

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
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [libraryWidth, setLibraryWidth] = useState(350);
  const [libraryHeight, setLibraryHeight] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'library' | 'unlocks' | 'routes'>('library');
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);

  const tourTriggered = useRef(false);
  const milestoneUpdateInflight = useRef(0);

  // DnD state - inline preview injection
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<DragTaskData | null>(null);
  const [previewStep, setPreviewStep] = useState<RouteStep | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
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
  // Premium features (cursor broadcasting)
  // ──────────────────────────────────────────────
  const { isPremium, mounted: premiumMounted, unlock } = usePremium();

  // ──────────────────────────────────────────────
  // Presence (live cursors) - admin-only with premium.
  // Authentication is via the HttpOnly cookie set during sign-in;
  // the hook never sees the raw admin key.
  // ──────────────────────────────────────────────
  const presence = usePresence({ roomId: room.id, isAdmin, hasPremium: isPremium });
  const { others: presenceOthers, color: presenceColor, name: presenceName, setName: setPresenceName } = presence;

  // ──────────────────────────────────────────────
  // Init & localStorage
  // ──────────────────────────────────────────────
  useEffect(() => {
    const presenceCookie = `dsa_${room.id}=1`;
    const hasAdminCookie = typeof document !== 'undefined' &&
      document.cookie.split('; ').some(c => c === presenceCookie);

    const urlParams = new URLSearchParams(window.location.search);
    const keyFromUrl = urlParams.get('key');

    if (keyFromUrl) {
      // Exchange the share-link key for an HttpOnly cookie session,
      // then strip it from the URL so it never lingers in history.
      apiAuthenticate(room.id, keyFromUrl)
        .then(() => setIsAdmin(true))
        .catch(() => setIsAdmin(false))
        .finally(() => {
          window.history.replaceState({}, '', `/route/${room.id}`);
        });
    } else {
      setIsAdmin(hasAdminCookie);
    }

    // One-time cleanup: remove any legacy admin key left in localStorage
    // from prior versions of the app.
    try {
      localStorage.removeItem(`admin_key_${room.id}`);
    } catch { /* ignore */ }

    const storedCollapsed = localStorage.getItem('library_collapsed');
    if (storedCollapsed !== null) setIsLibraryCollapsed(storedCollapsed === 'true');

    const storedPosition = localStorage.getItem('library_position');
    if (storedPosition === 'sidebar' || storedPosition === 'bottom') setLibraryPosition(storedPosition);

    const storedWidth = localStorage.getItem('library_width');
    if (storedWidth) setLibraryWidth(parseInt(storedWidth, 10));

    const storedHeight = localStorage.getItem('library_height');
    if (storedHeight) setLibraryHeight(parseInt(storedHeight, 10));

    const storedTab = localStorage.getItem('sidebar_tab');
    if (storedTab === 'library' || storedTab === 'unlocks' || storedTab === 'routes') setSidebarTab(storedTab);

    setMounted(true);
  }, [room.id]);

  // ──────────────────────────────────────────────
  // Save to recent rooms (on mount & when name/admin changes)
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    saveRecentRoom({
      roomId: room.id,
      name: roomName,
      lastVisited: new Date().toISOString(),
      isAdmin,
    });
    setRecentRooms(getRecentRooms());
  }, [mounted, roomName, isAdmin, room.id]);

  // ──────────────────────────────────────────────
  // Guided tour auto-trigger (admin only)
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!mounted || !isAdmin || tourTriggered.current) return;
    if (steps.length === 0 && !hasSeenTour()) {
      tourTriggered.current = true;
      const timer = setTimeout(() => startTour(), 500);
      return () => clearTimeout(timer);
    }
  }, [mounted, isAdmin, steps.length]);

  const handleStartTour = useCallback(() => {
    startTour();
  }, []);

  // ──────────────────────────────────────────────
  // Premium unlock handlers
  // ──────────────────────────────────────────────
  const handleUnlockPremium = useCallback(() => {
    setShowPremiumModal(true);
  }, []);

  const handlePremiumUnlock = useCallback(async (code: string): Promise<boolean> => {
    const isValid = await unlock(code);
    if (isValid) {
      setShowPremiumModal(false);
    }
    return isValid;
  }, [unlock]);

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
          // Skip Realtime updates for milestone_selections while our own
          // API calls are inflight — prevents stale server responses from
          // overwriting optimistic local state.
          if (milestoneUpdateInflight.current === 0) {
            setMilestoneSelections(
              (payload.new.milestone_selections as MilestoneSelections) || {}
            );
          }
          setRoomName(payload.new.name as string);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id]);

  // ──────────────────────────────────────────────
  // Task CRUD
  // ──────────────────────────────────────────────
  // Note: step_order is now calculated server-side to prevent race conditions
  async function addTask(customText: string) {
    if (!customText.trim()) return;
    try {
      const result = await apiStepInsert(room.id, {
        step_type: 'custom',
        custom_text: customText,
        player_state: {},
      });
      const newStep = result.step as RouteStep;
      setSteps((current) => {
        if (current.some(s => s.id === newStep.id)) return current;
        return [...current, newStep].sort((a, b) => a.step_order - b.step_order);
      });
    } catch (err: any) {
      alert('Error adding task: ' + err.message);
    }
  }

  async function addOfficialTask(taskId: number) {
    // Read-only fetch of official task data (anon key is fine for reads)
    const { data: task, error: fetchError } = await supabase
      .from('official_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      alert('Error fetching task data');
      return;
    }

    try {
      const result = await apiStepInsert(room.id, {
        step_type: 'task',
        task_id: taskId,
        task_name: task.name,
        task_description: task.description,
        task_tier: task.tier,
        task_points: task.points,
        task_region: task.region,
        is_pact_task: task.is_pact_task ?? false,
        player_state: {},
      });
      const newStep = result.step as RouteStep;
      setSteps((current) => {
        if (current.some(s => s.id === newStep.id)) return current;
        return [...current, newStep].sort((a, b) => a.step_order - b.step_order);
      });
    } catch (err: any) {
      alert('Error adding task: ' + err.message);
    }
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
    const previousPlayerNames = playerNames;
    setPlayerNames(editingPlayers);
    setShowPlayerModal(false);

    try {
      await apiRoomUpdate(room.id, 'update_players', { playerNames: editingPlayers });
    } catch (err: any) {
      alert('Error saving players: ' + err.message);
      setPlayerNames(previousPlayerNames);
    }
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

    try {
      await apiStepUpdate(room.id, 'update_checkbox', { stepId, playerState: updatedPlayerState });
    } catch (err: any) {
      alert('Error updating checkbox: ' + err.message);
      setSteps((current) => current.map((s) => (s.id === stepId ? step : s)));
    }
  }, [isAdmin, steps, playerNames, room.id]);

  const toggleMilestoneCheckbox = useCallback(async (milestoneId: string, playerId: string) => {
    if (!isAdmin) return;
    const currentState = milestonePlayerState[milestoneId]?.[playerId] || false;
    const updatedMilestoneState = {
      ...milestonePlayerState,
      [milestoneId]: { ...(milestonePlayerState[milestoneId] || {}), [playerId]: !currentState },
    };
    setMilestonePlayerState(updatedMilestoneState);

    try {
      await apiRoomUpdate(room.id, 'update_milestone_state', { milestonePlayerState: updatedMilestoneState });
    } catch (err: any) {
      alert('Error updating milestone checkbox: ' + err.message);
      setMilestonePlayerState(milestonePlayerState);
    }
  }, [isAdmin, milestonePlayerState, room.id]);

  const handleMilestoneSelection = useCallback(async (milestoneId: string, selectedId: number | null) => {
    if (!isAdmin) return;

    const RELOADED_RELIC_ID = 19;
    let updatedSelections: MilestoneSelections = {};
    setMilestoneSelections(prev => {
      const next = { ...prev };
      if (selectedId === null) delete next[milestoneId];
      else next[milestoneId] = selectedId;

      // When switching T7 away from Reloaded, clear the bonus selection
      // atomically in the same update to avoid race conditions.
      if (
        milestoneId === 'relic_t7' &&
        prev['relic_t7'] === RELOADED_RELIC_ID &&
        selectedId !== RELOADED_RELIC_ID
      ) {
        delete next['relic_reloaded'];
      }

      updatedSelections = next;
      return next;
    });

    milestoneUpdateInflight.current++;
    try {
      await apiRoomUpdate(room.id, 'update_milestone_selections', { milestoneSelections: updatedSelections });
    } catch (err: any) {
      alert('Error updating milestone selection: ' + err.message);
    } finally {
      milestoneUpdateInflight.current--;
    }
  }, [isAdmin, room.id]);

  // ──────────────────────────────────────────────
  // Delete
  // ──────────────────────────────────────────────
  const deleteTask = useCallback(async (stepId: string) => {
    if (!isAdmin) return;
    setDeleteClickedId(null);
    setSteps((current) => current.filter((s) => s.id !== stepId));

    try {
      await apiStepDelete(room.id, stepId);
    } catch (err: any) {
      alert('Error deleting task: ' + err.message);
      // Refetch steps on error to restore correct state
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

    try {
      await apiRoomUpdate(room.id, 'update_name', { name: trimmedName });
    } catch (err: any) {
      alert('Error updating room name: ' + err.message);
      setRoomName(roomName);
    }
  }

  function cancelEditingName() {
    setIsEditingName(false);
    setEditingNameValue(roomName);
  }

  // ──────────────────────────────────────────────
  // Share links
  // ──────────────────────────────────────────────
  async function copyAdminLink() {
    try {
      // Admin key is fetched on demand from a cookie-authenticated endpoint;
      // it is no longer persisted in JS-accessible storage.
      const adminKey = await apiFetchAdminKey(room.id);
      const adminUrl = `${window.location.origin}/route/${room.id}?key=${adminKey}`;
      await navigator.clipboard.writeText(adminUrl);
      setCopiedLink('admin');
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      alert('Failed to copy to clipboard. Please try again.');
    }
  }

  async function copyViewOnlyLink() {
    const viewUrl = `${window.location.origin}/route/${room.id}`;
    try {
      await navigator.clipboard.writeText(viewUrl);
      setCopiedLink('view');
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      alert('Failed to copy to clipboard. Please copy the URL manually.');
    }
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

  function switchSidebarTab(tab: 'library' | 'unlocks' | 'routes') {
    setSidebarTab(tab);
    localStorage.setItem('sidebar_tab', tab);
    // Refresh recent rooms when switching to routes tab
    if (tab === 'routes') {
      setRecentRooms(getRecentRooms());
    }
    // Auto-expand if collapsed
    if (isLibraryCollapsed) {
      setIsLibraryCollapsed(false);
      localStorage.setItem('library_collapsed', 'false');
    }
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
  // Prefer individual sortable items over the container droppable.
  // When the pointer is below all items, return the container so
  // handleDragOver appends at the end instead of snapping to the nearest item.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    const itemHits = pointerCollisions.filter(c => c.id !== 'route-list');
    if (itemHits.length > 0) return itemHits;

    // Pointer is inside the container but not over any item.
    // If below the last item, return the container for "append at end".
    if (pointerCollisions.some(c => c.id === 'route-list')) {
      let maxBottom = 0;
      for (const container of args.droppableContainers) {
        if (container.id === 'route-list') continue;
        const rect = container.rect.current;
        if (rect) {
          maxBottom = Math.max(maxBottom, rect.top + rect.height);
        }
      }
      if ((args.pointerCoordinates?.y ?? 0) > maxBottom) {
        return pointerCollisions;
      }
    }

    // Pointer is in a gap between items — fall back to closestCenter
    const centerCollisions = closestCenter(args);
    const centerItems = centerCollisions.filter(c => c.id !== 'route-list');
    if (centerItems.length > 0) return centerItems;

    // Empty list — return the container
    return pointerCollisions;
  }, []);

  // ──────────────────────────────────────────────
  // Drag & Drop handlers
  // ──────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveId(id);

    if (id.startsWith('library-')) {
      // Store the library task data for the overlay
      const task = event.active.data.current as DragTaskData | undefined;
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
          name: step.task_name || step.custom_text || 'Task',
          tier: step.task_tier,
          points: step.task_points,
          region: step.task_region,
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

  // Compute the drop index for a drag hovering over a target.
  // When previewIndex is null (first hover from library), uses the pointer's
  // position relative to the hovered item's midpoint to decide above vs below.
  function resolveDropIndex(
    overIdStr: string,
    over: DragOverEvent['over'] & {},
    event: DragOverEvent,
  ): number | null {
    if (overIdStr === 'route-list') {
      return steps.length;
    }

    const overStep = steps.findIndex(s => s.id === overIdStr);
    if (overStep < 0) return null; // over the preview itself — keep current

    if (previewIndex !== null) {
      // Direction-aware: cursor entering an item displaces it immediately
      return previewIndex <= overStep ? overStep + 1 : overStep;
    }

    // First hover — use pointer vs item midpoint
    const midY = over.rect.top + over.rect.height / 2;
    const pointerY = event.activatorEvent instanceof PointerEvent
      ? event.activatorEvent.clientY + (event.delta?.y ?? 0)
      : midY;
    return pointerY > midY ? overStep + 1 : overStep;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      setPreviewStep(null);
      setPreviewIndex(null);
      return;
    }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (activeIdStr.startsWith('library-')) {
      // Library → Route: inject preview step at target position
      const task = active.data.current as DragTaskData & { description?: string | null } | undefined;
      if (!task) return;

      const newIndex = resolveDropIndex(overIdStr, over, event);
      if (newIndex === null) return;

      // Skip update if index hasn't changed
      if (newIndex === previewIndex && previewStep !== null) return;

      setPreviewIndex(newIndex);

      // Create preview RouteStep (only if we don't have one yet, or task changed)
      if (!previewStep || previewStep.task_id !== task.id) {
        setPreviewStep({
          id: `preview-${task.id}`,
          room_id: room.id,
          step_order: -1,
          step_type: 'task',
          task_id: task.id as number,
          task_name: task.name,
          task_description: task.description || null,
          task_tier: task.tier || null,
          task_points: task.points || null,
          task_region: task.region || null,
          custom_text: null,
          player_state: {},
          created_at: new Date().toISOString(),
        } as RouteStep);
      }
    } else {
      // Route → Route: preview system (step already removed in handleDragStart)
      if (!draggedRouteStep) return;

      const newIndex = resolveDropIndex(overIdStr, over, event);
      if (newIndex === null) return;

      if (newIndex === previewIndex && previewStep !== null) return;

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

    if (activeIdStr.startsWith('library-')) {
      // Library → Route: insert task at drop position
      if (!over && finalDropIndex === null) return; // Dropped outside with no preview - do nothing

      const task = active.data.current as DragTaskData & { description?: string | null } | undefined;
      if (!task) return;

      // Use the preview position the user saw, fall back to end of list
      const insertIndex = finalDropIndex ?? steps.length;

      // Server will append to end, then we reorder to correct position
      let newStepTyped: RouteStep;
      try {
        const result = await apiStepInsert(room.id, {
          step_type: 'task',
          task_id: task.id,
          task_name: task.name,
          task_description: task.description || null,
          task_tier: task.tier,
          task_points: task.points,
          task_region: task.region,
          is_pact_task: (task as DragTaskData & { is_pact_task?: boolean }).is_pact_task ?? false,
          player_state: {},
        });
        newStepTyped = result.step as RouteStep;
      } catch (err: any) {
        alert('Error adding task: ' + err.message);
        return;
      }

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

      try {
        await apiStepUpdate(room.id, 'reorder', { stepUpdates: updates });
      } catch (err: any) {
        console.error('Error reordering:', err);
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

    try {
      await apiStepUpdate(room.id, 'reorder', { stepUpdates: updates });
    } catch (err: any) {
      console.error('Error reordering steps:', err);
      alert('Error reordering tasks: ' + err.message);
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
    let pactTasks = 0;
    const cumulative: Record<string, { points: number; tasks: number; pactTasks: number }> = {};

    for (const step of steps) {
      // Only official tasks count towards points and task count (area unlocks)
      // Custom tasks do NOT count towards area unlocks
      if (step.step_type === 'task' && step.task_points) {
        points += step.task_points;
        tasks += 1;
        if (step.is_pact_task) {
          pactTasks += 1;
        }
      }
      cumulative[step.id] = { points, tasks, pactTasks };
    }

    return { totalPoints: points, totalTasks: tasks, cumulativeByStepId: cumulative };
  }, [steps]);

  const totalPactPoints = useMemo(() =>
    steps.filter(s => s.is_pact_task).length,
  [steps]);

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
        totalPactPoints={totalPactPoints}
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
        onStartTour={handleStartTour}
        canBroadcast={presence.canBroadcast}
        queuePosition={presence.queuePosition}
        totalAdmins={presence.totalAdmins}
        hasPremium={isPremium}
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
          <div data-tour="drag-drop-zone" className={`flex-1 flex flex-col overflow-hidden relative z-10 ${libraryPosition === 'sidebar' ? 'border-r' : 'border-b'} border-[var(--border-standard)]`}>
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

          {/* Sidebar Pane (Library or Planner) */}
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
              /* Collapsed: Vertical icon strip */
              <div className={`h-full w-full ${
                libraryPosition === 'sidebar'
                  ? 'border-l border-[var(--border-standard)] flex flex-col items-center py-3 gap-2'
                  : 'border-t border-[var(--border-standard)] flex flex-row justify-center items-center px-3 gap-2'
              } bg-[var(--bg-elevated)]`}>
                <Tooltip text="Task Library" position="left">
                  <button
                    onClick={() => switchSidebarTab('library')}
                    className="p-2 rounded transition-all text-[var(--text-tertiary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                  >
                    <BookOpen size={18} />
                  </button>
                </Tooltip>
                <Tooltip text="Unlocks" position="left">
                  <button
                    onClick={() => switchSidebarTab('unlocks')}
                    className="p-2 rounded transition-all text-[var(--text-tertiary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                  >
                    <Trophy size={18} />
                  </button>
                </Tooltip>
                <Tooltip text="Routes" position="left">
                  <button
                    onClick={() => switchSidebarTab('routes')}
                    className="p-2 rounded transition-all text-[var(--text-tertiary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                  >
                    <Map size={18} />
                  </button>
                </Tooltip>
              </div>
            ) : (
              /* Expanded: Content with top tab bar */
              <div className="h-full w-full flex flex-col border-l border-[var(--border-standard)]">
                {/* Tab Bar at Top */}
                <div className="flex-shrink-0 flex items-center gap-1 px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-standard)]">
                  <button
                    onClick={() => switchSidebarTab('library')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all ${
                      sidebarTab === 'library'
                        ? 'bg-[var(--crimson)] text-white shadow-md'
                        : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <BookOpen size={16} />
                    <span className="text-sm font-semibold">Library</span>
                  </button>
                  <button
                    onClick={() => switchSidebarTab('unlocks')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all ${
                      sidebarTab === 'unlocks'
                        ? 'bg-[var(--crimson)] text-white shadow-md'
                        : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Trophy size={16} />
                    <span className="text-sm font-semibold">Unlocks</span>
                  </button>
                  <button
                    onClick={() => switchSidebarTab('routes')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all ${
                      sidebarTab === 'routes'
                        ? 'bg-[var(--crimson)] text-white shadow-md'
                        : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Map size={16} />
                    <span className="text-sm font-semibold">Routes</span>
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={toggleLibrary}
                    className="ml-auto p-1.5 hover:bg-[var(--bg-surface)] rounded transition-colors"
                    title="Close sidebar"
                  >
                    <X size={16} className="text-[var(--text-tertiary)]" />
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-0">
                  {sidebarTab === 'library' ? (
                    <TaskLibrary
                      roomId={room.id}
                      isAdmin={isAdmin}
                      onAddTask={addOfficialTask}
                      onAddCustomTask={addTask}
                      onCollapse={toggleLibrary}
                      position={libraryPosition}
                      routeSteps={steps}
                    />
                  ) : sidebarTab === 'unlocks' ? (
                    <BuildPlanner
                      relics={relics}
                      regions={regions}
                      milestoneSelections={milestoneSelections}
                      isAdmin={isAdmin}
                      onMilestoneSelection={handleMilestoneSelection}
                      onCollapse={toggleLibrary}
                      position={libraryPosition}
                    />
                  ) : (
                    /* Routes panel */
                    <div className="h-full flex flex-col overflow-y-auto p-3 gap-2">
                      {recentRooms.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-tertiary)] gap-2 py-8">
                          <Map size={32} />
                          <p className="text-sm">No recent routes</p>
                        </div>
                      ) : (
                        recentRooms.map((r) => {
                          const isCurrent = r.roomId === room.id;
                          return (
                            <div
                              key={r.roomId}
                              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                                isCurrent
                                  ? 'bg-[var(--crimson)]/10 border-[var(--crimson)]/30'
                                  : 'bg-[var(--bg-surface)] border-[var(--border-standard)] hover:border-[var(--border-strong)] cursor-pointer'
                              }`}
                              onClick={() => { if (!isCurrent) router.push(`/route/${r.roomId}`); }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-semibold truncate ${isCurrent ? 'text-[var(--crimson)]' : 'text-[var(--text-primary)]'}`}>
                                    {r.name}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-[10px] font-bold uppercase text-[var(--crimson)] bg-[var(--crimson)]/10 px-1.5 py-0.5 rounded">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {r.isAdmin ? (
                                    <Crown size={12} className="text-[var(--gold)] flex-shrink-0" />
                                  ) : (
                                    <Eye size={12} className="text-[var(--steel)] flex-shrink-0" />
                                  )}
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    {r.isAdmin ? 'Admin' : 'Viewer'}
                                  </span>
                                  <span className="text-[var(--border-standard)]">·</span>
                                  <Clock size={12} className="text-[var(--text-tertiary)] flex-shrink-0" />
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    {timeAgo(r.lastVisited)}
                                  </span>
                                </div>
                              </div>
                              {!isCurrent && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeRecentRoom(r.roomId);
                                    setRecentRooms(getRecentRooms());
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--bg-hover)] rounded transition-all flex-shrink-0"
                                  title="Remove from recent"
                                >
                                  <X size={14} className="text-[var(--text-tertiary)]" />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
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
          hasPremium={isPremium}
          onUnlockPremium={() => setShowPremiumModal(true)}
        />
      )}

      {showPremiumModal && (
        <PremiumModal
          onClose={() => setShowPremiumModal(false)}
          onUnlock={handlePremiumUnlock}
        />
      )}
    </div>
  );
}
