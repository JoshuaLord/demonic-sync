'use client';

interface DragOverlayContentProps {
  task: {
    id: number;
    name: string;
    tier?: string;
    points?: number;
    region?: string;
  };
  isOverRoute: boolean;
  sourceType: 'library' | 'route';
}

function getTierClasses(tier: string): string {
  switch (tier) {
    case 'Easy': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'Medium': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'Hard': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    case 'Elite': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
    default: return 'bg-red-500/10 text-red-600 dark:text-red-400';
  }
}

export default function DragOverlayContent({ task, isOverRoute, sourceType }: DragOverlayContentProps) {
  // Route source: always show as route row
  if (sourceType === 'route') {
    return (
      <div className="rounded-md p-1.5 flex gap-2 items-center bg-[var(--bg-elevated)] border-2 border-[var(--gold)] shadow-xl shadow-[var(--gold)]/30 animate-overlay-enter">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {task.tier && (
            <>
              <span className={`w-14 px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 text-center ${getTierClasses(task.tier)}`}>
                {task.tier}
              </span>
              <span className="w-10 text-xs text-[var(--gold)] font-mono font-bold flex-shrink-0 pl-2">
                {task.points}
              </span>
            </>
          )}
          <div className="text-sm font-medium truncate text-[var(--text-primary)]">
            {task.name}
          </div>
          {task.region && (
            <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
              {task.region}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Library source: morph between card and row style
  return (
    <div
      className={`rounded-md animate-overlay-enter transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
        isOverRoute
          ? 'p-1.5 bg-[var(--bg-elevated)] border-2 border-[var(--gold)] shadow-xl shadow-[var(--gold)]/40 min-w-[400px]'
          : 'p-2.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl shadow-black/40 w-[220px]'
      }`}
    >
      {isOverRoute ? (
        // Route row style
        <div className="flex items-center gap-2">
          {task.tier && (
            <>
              <span className={`w-14 px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 text-center ${getTierClasses(task.tier)}`}>
                {task.tier}
              </span>
              <span className="w-10 text-xs text-[var(--gold)] font-mono font-bold flex-shrink-0 pl-2">
                {task.points}
              </span>
            </>
          )}
          <div className="text-sm font-medium truncate text-[var(--text-primary)]">
            {task.name}
          </div>
          {task.region && (
            <span className="text-xs text-[var(--text-tertiary)] flex-shrink-0">
              {task.region}
            </span>
          )}
        </div>
      ) : (
        // Library card style
        <>
          <div className="flex items-center gap-1.5 mb-1.5">
            {task.tier && (
              <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ${getTierClasses(task.tier)}`}>
                {task.tier}
              </span>
            )}
            {task.region && (
              <span className="text-xs text-[var(--text-tertiary)] truncate flex-1">{task.region}</span>
            )}
            {task.points && (
              <span className="text-xs text-[var(--gold)] font-bold flex-shrink-0">{task.points}</span>
            )}
          </div>
          <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2">
            {task.name}
          </h3>
        </>
      )}
    </div>
  );
}
