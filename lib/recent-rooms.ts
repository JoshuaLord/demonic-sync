const STORAGE_KEY = 'recent_rooms';
const MAX_ROOMS = 20;

export interface RecentRoom {
  roomId: string;
  name: string;
  lastVisited: string; // ISO 8601
  isAdmin: boolean;
}

export function getRecentRooms(): RecentRoom[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveRecentRoom(room: RecentRoom): void {
  try {
    const rooms = getRecentRooms();
    const existing = rooms.findIndex((r) => r.roomId === room.roomId);
    if (existing >= 0) {
      rooms.splice(existing, 1);
    }
    rooms.unshift(room);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms.slice(0, MAX_ROOMS)));
  } catch {
    // localStorage unavailable - graceful degradation
  }
}

export function removeRecentRoom(roomId: string): void {
  try {
    const rooms = getRecentRooms().filter((r) => r.roomId !== roomId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch {
    // localStorage unavailable
  }
}

export function timeAgo(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
