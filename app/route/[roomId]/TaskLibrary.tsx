'use client';

import { supabase } from '@/lib/supabase';
import { useState, useEffect, useMemo, memo } from 'react';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

interface OfficialTask {
  id: number;
  name: string;
  description: string | null;
  points: number;
  tier: string;
  region: string;
  skill: string | null;
  category: string | null;
  league: string;
  is_pact_task: boolean;
}

interface RouteStep {
  id: string;
  task_id: number | null;
  step_type: string;
  // ... other fields we don't need for filtering
}

interface TaskLibraryProps {
  roomId: string;
  isAdmin: boolean;
  onAddTask: (taskId: number) => void;
  onAddCustomTask: (text: string) => void;
  onCollapse?: () => void;
  position?: 'sidebar' | 'bottom';
  routeSteps: RouteStep[];
}

interface DraggableTaskCardProps {
  task: OfficialTask;
  isAdmin: boolean;
  onAddTask: (taskId: number) => void;
}

const DraggableTaskCard = memo(function DraggableTaskCard({ task, isAdmin, onAddTask }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${task.id}`,
    disabled: !isAdmin,
    data: task,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : isAdmin ? 'grab' : 'default',
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded p-2.5 transition-all duration-200 group relative ${
        isAdmin
          ? 'cursor-pointer hover:border-[var(--gold)] hover:shadow-lg hover:shadow-[var(--gold)]/20 hover:scale-[1.02] hover:-translate-y-0.5'
          : 'cursor-default opacity-75'
      } ${isDragging ? 'z-50' : ''}`}
    >
      {/* Add Button */}
      {isAdmin && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddTask(task.id);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          className="absolute bottom-1.5 right-1.5 text-emerald-500 hover:text-emerald-400 transition-colors pointer-events-auto z-10 cursor-pointer"
          title="Add to route"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      )}

      {/* Header Row: Tier + Pact Badge + Region + Points */}
      <div className="flex items-center gap-1.5 mb-1.5 pointer-events-none">
        <span
          className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ${
            task.tier === 'Easy'
              ? 'bg-[var(--tier-easy-bg)] text-[var(--tier-easy-text)]'
              : task.tier === 'Medium'
              ? 'bg-[var(--tier-medium-bg)] text-[var(--tier-medium-text)]'
              : task.tier === 'Hard'
              ? 'bg-[var(--tier-hard-bg)] text-[var(--tier-hard-text)]'
              : task.tier === 'Elite'
              ? 'bg-[var(--tier-elite-bg)] text-[var(--tier-elite-text)]'
              : 'bg-[var(--tier-master-bg)] text-[var(--tier-master-text)]'
          }`}
        >
          {task.tier}
        </span>
        {task.is_pact_task && (
          <span className="px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 bg-[var(--pact-bg)] text-[var(--pact-text)]">
            PACT
          </span>
        )}
        <span className="text-xs text-[var(--text-tertiary)] truncate flex-1">{task.region}</span>
        <span className="text-xs text-[var(--gold)] font-bold flex-shrink-0">{task.points}</span>
      </div>

      {/* Task Name */}
      <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 pointer-events-none">
        {task.name}
      </h3>
    </div>
  );
});

export default function TaskLibrary({ roomId, isAdmin, onAddTask, onAddCustomTask, onCollapse, position = 'sidebar', routeSteps }: TaskLibraryProps) {
  const [tasks, setTasks] = useState<OfficialTask[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCustomTaskModal, setShowCustomTaskModal] = useState(false);
  const [customTaskText, setCustomTaskText] = useState('');
  const [bouncingChip, setBouncingChip] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<'demonic' | 'echoes'>('demonic');
  const [showPactOnly, setShowPactOnly] = useState(false);

  // Fetch tasks filtered by league
  useEffect(() => {
    async function fetchTasks() {
      setLoading(true);
      const { data, error } = await supabase
        .from('official_tasks')
        .select('*')
        .eq('league', selectedLeague)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }

      setTasks(data || []);
      setLoading(false);
    }

    fetchTasks();
  }, [selectedLeague]);

  // Reset pact filter when switching leagues
  useEffect(() => {
    if (selectedLeague !== 'demonic') {
      setShowPactOnly(false);
    }
  }, [selectedLeague]);

  // Apply filters with useMemo to avoid dependency array issues
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Filter out tasks already added to route
    const usedTaskIds = new Set(
      routeSteps
        .filter(step => step.task_id !== null)
        .map(step => step.task_id)
    );
    result = result.filter(task => !usedTaskIds.has(task.id));

    // Pact-only filter
    if (showPactOnly) {
      result = result.filter(task => task.is_pact_task);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (task) =>
          task.name.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }

    // Region filter (multi-select)
    if (selectedRegions.length > 0) {
      result = result.filter((task) => selectedRegions.includes(task.region));
    }

    // Tier filter (multi-select)
    if (selectedTiers.length > 0) {
      result = result.filter((task) => selectedTiers.includes(task.tier));
    }

    // Skill filter
    if (selectedSkill) {
      result = result.filter((task) => task.skill === selectedSkill);
    }

    return result;
  }, [tasks, routeSteps, searchQuery, selectedRegions, selectedTiers, selectedSkill, showPactOnly]);

  // Get unique values for filters
  const regions = useMemo(() => Array.from(new Set(tasks.map((t) => t.region))).sort((a, b) => {
    if (a === 'Global') return -1;
    if (b === 'Global') return 1;
    if (a === 'General') return -1;
    if (b === 'General') return 1;
    return a.localeCompare(b);
  }), [tasks]);
  const tiers = ['Easy', 'Medium', 'Hard', 'Elite', 'Master'];
  const skills = useMemo(() => Array.from(new Set(tasks.map((t) => t.skill).filter(Boolean))).sort(), [tasks]);

  // Toggle functions for multi-select with bounce animation
  const toggleTier = (tier: string) => {
    setSelectedTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]
    );
    setBouncingChip(`tier-${tier}`);
    setTimeout(() => setBouncingChip(null), 300);
  };

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
    setBouncingChip(`region-${region}`);
    setTimeout(() => setBouncingChip(null), 300);
  };

  const clearTiers = () => setSelectedTiers([]);
  const clearRegions = () => setSelectedRegions([]);

  // Get region-specific color (based on OSRS region themes)
  const getRegionColor = (region: string): string => {
    switch (region) {
      case 'Asgarnia':
        return 'bg-blue-600'; // Blue (Falador, ice theme)
      case 'Fremennik':
        return 'bg-cyan-500'; // Cyan (northern, icy)
      case 'Kandarin':
        return 'bg-green-600'; // Green (forests, nature)
      case 'Desert':
      case 'Kharidian Desert':
        return 'bg-orange-500'; // Orange (sandy desert)
      case 'Morytania':
        return 'bg-purple-700'; // Purple (gothic, dark)
      case 'Tirannwn':
        return 'bg-teal-500'; // Teal (elven, crystal)
      case 'Wilderness':
        return 'bg-red-700'; // Red (dangerous, pvp)
      case 'Kourend':
      case 'Great Kourend':
        return 'bg-indigo-600'; // Indigo (Zeah kingdoms)
      case 'Karamja':
        return 'bg-emerald-600'; // Emerald (jungle, tropical)
      case 'Misthalin':
        return 'bg-amber-600'; // Amber (Varrock, Lumbridge)
      case 'Varlamore':
        return 'bg-rose-600'; // Rose (new region, hunter theme)
      default:
        return 'bg-[var(--crimson)]'; // Default crimson for General/Global
    }
  };

  const handleAddCustomTask = () => {
    if (!customTaskText.trim()) return;
    onAddCustomTask(customTaskText.trim());
    setCustomTaskText('');
    setShowCustomTaskModal(false);
  };

  // Sort tasks by tier, then region
  const tierOrder: Record<string, number> = { 'Easy': 1, 'Medium': 2, 'Hard': 3, 'Elite': 4, 'Master': 5 };
  const sortedTasks = useMemo(() => [...filteredTasks].sort((a, b) => {
    // Sort by tier first
    const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
    if (tierDiff !== 0) return tierDiff;

    // Then by region (Global/General first, then alphabetical)
    if (a.region === 'Global' && b.region !== 'Global') return -1;
    if (b.region === 'Global' && a.region !== 'Global') return 1;
    if (a.region === 'General' && b.region !== 'General') return -1;
    if (b.region === 'General' && a.region !== 'General') return 1;
    return a.region.localeCompare(b.region);
  }), [filteredTasks]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)]" data-tour="task-library">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-standard)]">
        {/* League Toggle */}
        <div className="flex gap-1.5 mb-2">
          <button
            onClick={() => setSelectedLeague('demonic')}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-colors ${
              selectedLeague === 'demonic'
                ? 'bg-[var(--crimson)] text-white shadow-md'
                : 'bg-[var(--bg-surface)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            Demonic Pacts
          </button>
          <button
            onClick={() => setSelectedLeague('echoes')}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition-colors ${
              selectedLeague === 'echoes'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-[var(--bg-surface)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            Raging Echoes
          </button>
        </div>

        {/* Compact Filters */}
        <div className="space-y-2 mb-2">
          {/* Tier Filter - Multi-Select */}
          <div>
            <div className="flex gap-1.5">
              {tiers.map((tier) => (
                <button
                  key={tier}
                  onClick={() => toggleTier(tier)}
                  className={`flex-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    bouncingChip === `tier-${tier}` ? 'animate-chip-bounce' : ''
                  } ${
                    selectedTiers.includes(tier)
                      ? tier === 'Easy'
                        ? 'bg-emerald-600 text-white'
                        : tier === 'Medium'
                        ? 'bg-amber-500 text-white'
                        : tier === 'Hard'
                        ? 'bg-orange-600 text-white'
                        : tier === 'Elite'
                        ? 'bg-purple-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-[var(--bg-surface)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--border-subtle)]"></div>

          {/* Region Filter - Multi-Select */}
          <div>
            <div className="grid grid-cols-4 gap-1 max-h-20 overflow-y-auto">
              {regions.map((region) => (
                <button
                  key={region}
                  onClick={() => toggleRegion(region)}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    bouncingChip === `region-${region}` ? 'animate-chip-bounce' : ''
                  } ${
                    selectedRegions.includes(region)
                      ? `${getRegionColor(region)} text-white`
                      : 'bg-[var(--bg-surface)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {region}
                </button>
              ))}
              {/* Pact Tasks Filter Button (only for demonic league) */}
              {selectedLeague === 'demonic' && (
                <button
                  onClick={() => {
                    setShowPactOnly(!showPactOnly);
                    setBouncingChip('pact-filter');
                    setTimeout(() => setBouncingChip(null), 300);
                  }}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    bouncingChip === 'pact-filter' ? 'animate-chip-bounce' : ''
                  } ${
                    showPactOnly
                      ? 'bg-[var(--pact-bar-from)] text-white'
                      : 'bg-[var(--bg-surface)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  Pact Tasks
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--border-subtle)]"></div>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search tasks... (${filteredTasks.length}/${tasks.length})`}
          className="w-full bg-[var(--bg-surface)] border border-[var(--border-standard)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] mt-2 focus:outline-none focus:border-[var(--gold)]"
        />
      </div>

      {/* Task List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {loading ? (
          <p className="text-[var(--text-muted)] text-center py-8">Loading tasks...</p>
        ) : (
          <div className={position === 'bottom' ? 'grid grid-cols-3 gap-2' : 'space-y-2'}>
            {/* Add Custom Task Card - First Item */}
            {isAdmin && (
              <button
                onClick={() => setShowCustomTaskModal(true)}
                className="w-full bg-[var(--crimson)]/10 border-2 border-dashed border-[var(--crimson)] rounded py-2 px-3 hover:bg-[var(--crimson)]/20 hover:border-solid hover:shadow-lg hover:shadow-[var(--crimson)]/20 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 group cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus size={16} className="text-[var(--crimson)]" strokeWidth={2.5} />
                <span className="font-semibold text-xs text-[var(--crimson)]">
                  Add Custom Task
                </span>
              </button>
            )}

            {filteredTasks.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-8">No tasks found</p>
            ) : (
              sortedTasks.map((task) => (
                <DraggableTaskCard
                  key={task.id}
                  task={task}
                  isAdmin={isAdmin}
                  onAddTask={onAddTask}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Custom Task Modal */}
      {showCustomTaskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg p-6 w-[400px] shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">
              Add Custom Task
            </h2>
            <textarea
              value={customTaskText}
              onChange={(e) => setCustomTaskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCustomTask(); }
                if (e.key === 'Escape') setShowCustomTaskModal(false);
              }}
              placeholder="Enter task description..."
              maxLength={500}
              rows={3}
              autoFocus
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-standard)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold)] transition-colors mb-4 resize-y min-h-[4.5rem]"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCustomTaskModal(false)}
                className="bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-4 py-2 rounded-md border border-[var(--border-standard)] text-[var(--text-secondary)] text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomTask}
                disabled={!customTaskText.trim()}
                className="bg-[var(--crimson)] hover:bg-[var(--crimson-deep)] px-4 py-2 rounded-md text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
