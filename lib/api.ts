function getAdminKey(roomId: string): string | null {
  return localStorage.getItem(`admin_key_${roomId}`);
}

async function apiCall(url: string, method: string, body: Record<string, any>) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }
  return res.json();
}

export async function apiRoomUpdate(
  roomId: string,
  action: string,
  payload: Record<string, any>
) {
  return apiCall(`/api/rooms/${roomId}`, 'PATCH', {
    action,
    adminKey: getAdminKey(roomId),
    ...payload,
  });
}

export async function apiStepInsert(
  roomId: string,
  stepData: Record<string, any>
) {
  return apiCall(`/api/rooms/${roomId}/steps`, 'POST', {
    adminKey: getAdminKey(roomId),
    stepData,
  });
}

export async function apiStepUpdate(
  roomId: string,
  action: string,
  payload: Record<string, any>
) {
  return apiCall(`/api/rooms/${roomId}/steps`, 'PATCH', {
    action,
    adminKey: getAdminKey(roomId),
    ...payload,
  });
}

export async function apiStepDelete(roomId: string, stepId: string) {
  return apiCall(`/api/rooms/${roomId}/steps`, 'DELETE', {
    adminKey: getAdminKey(roomId),
    stepId,
  });
}
