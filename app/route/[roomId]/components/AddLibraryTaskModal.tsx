'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface OfficialTask {
  id: number;
  name: string;
  description: string | null;
  points: number;
  tier: string;
  region: string;
  is_pact_task: boolean;
}

interface RouteStepRef {
  task_id: number | null;
}

export interface AddLibraryTaskModalProps {
  onClose: () => void;
  onInsert: (task: OfficialTask, position: 'above' | 'below') => void;
  routeSteps: RouteStepRef[];
}

export default function AddLibraryTaskModal({
  onClose,
  onInsert,
  routeSteps,
}: AddLibraryTaskModalProps) {
  const [tasks, setTasks] = useState<OfficialTask[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch tasks on mount
  useEffect(() => {
    searchRef.current?.focus();

    async function fetchTasks() {
      const { data, error } = await supabase
        .from('official_tasks')
        .select('id, name, description, points, tier, region, is_pact_task')
        .order('id', { ascending: true });

      if (!error && data) {
        setTasks(data as OfficialTask[]);
      }
      setLoading(false);
    }
    fetchTasks();
  }, []);

  // IDs of tasks already in the route
  const routeTaskIds = useMemo(() => {
    const ids = new Set<number>();
    for (const step of routeSteps) {
      if (step.task_id !== null) ids.add(step.task_id);
    }
    return ids;
  }, [routeSteps]);

  // Filter by search and exclude tasks already in route
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tasks
      .filter((t) => !routeTaskIds.has(t.id))
      .filter((t) => {
        if (!q) return true;
        return (
          t.name.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.region.toLowerCase().includes(q) ||
          t.tier.toLowerCase().includes(q)
        );
      })
      .slice(0, 50);
  }, [tasks, search, routeTaskIds]);

  const selectedTask = selectedId !== null ? tasks.find((t) => t.id === selectedId) ?? null : null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add Library Task"
        className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg p-6 w-[480px] max-h-[80vh] flex flex-col shadow-2xl"
      >
        <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">
          Add Library Task
        </h2>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedId(null); }}
            placeholder="Search tasks by name, region, or tier..."
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-standard)] rounded-md pl-8 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold)] transition-colors"
          />
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-y-auto border border-[var(--border-standard)] rounded-md mb-4">
          {loading ? (
            <div className="p-4 text-center text-sm text-[var(--text-muted)]">Loading tasks...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-[var(--text-muted)]">
              {search ? 'No matching tasks found' : 'All tasks are already in your route'}
            </div>
          ) : (
            filtered.map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedId(task.id === selectedId ? null : task.id)}
                className={`w-full text-left px-3 py-2 border-b border-[var(--border-subtle)] last:border-b-0 transition-colors ${
                  task.id === selectedId
                    ? 'bg-[var(--gold)]/10 border-l-2 border-l-[var(--gold)]'
                    : 'hover:bg-[var(--bg-hover)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-14 px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 text-center ${
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
                  <span className="w-10 text-xs text-[var(--gold)] font-mono font-bold flex-shrink-0">
                    {task.points}
                  </span>
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {task.name}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0 ml-auto">
                    {task.region}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-4 py-2 rounded-md border border-[var(--border-standard)] text-[var(--text-secondary)] text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selectedTask && onInsert(selectedTask, 'above')}
            disabled={!selectedTask}
            className="bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-4 py-2 rounded-md border border-[var(--gold)] text-[var(--gold)] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Insert Above
          </button>
          <button
            onClick={() => selectedTask && onInsert(selectedTask, 'below')}
            disabled={!selectedTask}
            className="bg-[var(--crimson)] hover:bg-[var(--crimson-deep)] px-4 py-2 rounded-md text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Insert Below
          </button>
        </div>
      </div>
    </div>
  );
}
