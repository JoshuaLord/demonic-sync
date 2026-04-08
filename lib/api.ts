// Client-side API wrappers. Authentication is via the HttpOnly cookie set
// when the admin authenticated; we never read or send the admin key from JS.

async function apiCall(url: string, method: string, body?: Record<string, unknown>) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }
  return res.json();
}

/**
 * Exchange a one-time admin key (from a share link) for an HttpOnly cookie
 * session. After this call resolves, JS no longer needs the key for any
 * subsequent operation.
 */
export async function apiAuthenticate(roomId: string, adminKey: string) {
  return apiCall(`/api/rooms/${roomId}/auth`, 'POST', { adminKey });
}

export async function apiSignOut(roomId: string) {
  return apiCall(`/api/rooms/${roomId}/auth`, 'DELETE');
}

/**
 * On-demand fetch of the admin key for the share modal. Requires the
 * caller to already hold the admin cookie. The key is returned only to
 * the legitimate session, never persisted in storage.
 */
export async function apiFetchAdminKey(roomId: string): Promise<string> {
  const data = await apiCall(`/api/rooms/${roomId}/admin-key`, 'GET');
  return data.adminKey as string;
}

export async function apiRoomUpdate(
  roomId: string,
  action: string,
  payload: Record<string, unknown>
) {
  return apiCall(`/api/rooms/${roomId}`, 'PATCH', { action, ...payload });
}

export async function apiStepInsert(
  roomId: string,
  stepData: Record<string, unknown>
) {
  return apiCall(`/api/rooms/${roomId}/steps`, 'POST', { stepData });
}

export async function apiStepUpdate(
  roomId: string,
  action: string,
  payload: Record<string, unknown>
) {
  return apiCall(`/api/rooms/${roomId}/steps`, 'PATCH', { action, ...payload });
}

export async function apiStepDelete(roomId: string, stepId: string) {
  return apiCall(`/api/rooms/${roomId}/steps`, 'DELETE', { stepId });
}
