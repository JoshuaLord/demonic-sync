'use client';

type PlayerNames = Record<string, string>;

export interface PlayerModalProps {
  editingPlayers: PlayerNames;
  onUpdatePlayerName: (playerId: string, name: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onAddPlayer: () => void;
  onSave: () => void;
  onClose: () => void;
}

export default function PlayerModal({
  editingPlayers,
  onUpdatePlayerName,
  onRemovePlayer,
  onAddPlayer,
  onSave,
  onClose,
}: PlayerModalProps) {
  return (
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
                  onChange={(e) => onUpdatePlayerName(playerId, e.target.value)}
                  maxLength={20}
                  className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-standard)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--gold)] transition-colors"
                />
                <button
                  onClick={() => onRemovePlayer(playerId)}
                  className="bg-[var(--crimson)] hover:bg-[var(--crimson-deep)] px-3 py-2 rounded-md text-white text-sm font-semibold transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          {Object.keys(editingPlayers).length < 6 && (
            <button
              onClick={onAddPlayer}
              className="w-full bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-4 py-2 rounded-md border border-[var(--border-standard)] text-[var(--text-primary)] text-sm font-semibold transition-colors"
            >
              + Add Player
            </button>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] px-4 py-2 rounded-md border border-[var(--border-standard)] text-[var(--text-secondary)] text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="bg-[var(--crimson)] hover:bg-[var(--crimson-deep)] px-4 py-2 rounded-md text-white text-sm font-semibold transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
