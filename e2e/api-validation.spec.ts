import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';

/**
 * API validation tests - hits the API routes directly with bad payloads
 * to verify input validation, auth, and error responses.
 *
 * Auth is now cookie-based (HttpOnly), and every state-changing endpoint
 * requires a same-origin `Origin` header for CSRF defense.
 */

const BASE = 'http://localhost:3000';
const VALID_UUID = '00000000-0000-0000-0000-000000000000';

// Headers required to pass the Origin (CSRF) check on every request.
const ORIGIN_HEADERS = { origin: BASE };

let api: APIRequestContext;
let roomId: string;

test.beforeAll(async () => {
  // Use a random IP to avoid rate limit collisions across runs.
  const fakeIp = `198.51.100.${Math.floor(Math.random() * 255)}`;
  api = await pwRequest.newContext({
    extraHTTPHeaders: { ...ORIGIN_HEADERS, 'x-forwarded-for': fakeIp },
  });
  // Create a room — this also sets the admin HttpOnly cookie on the
  // shared APIRequestContext, which authenticates all subsequent calls.
  const res = await api.post(`${BASE}/api/rooms/create`);
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  roomId = json.roomId;
});

test.afterAll(async () => {
  await api.dispose();
});

// A second context that has *no* admin cookie, used for "unauthorized" tests.
async function unauthedContext() {
  return pwRequest.newContext({ extraHTTPHeaders: ORIGIN_HEADERS });
}

test.describe('API: UUID validation (#10)', () => {
  test('PATCH /api/rooms/[roomId] rejects non-UUID', async () => {
    const res = await api.patch(`${BASE}/api/rooms/notauuid`, {
      data: { action: 'update_name', name: 'x' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/rooms/[roomId]/steps rejects non-UUID', async () => {
    const res = await api.post(`${BASE}/api/rooms/notauuid/steps`, {
      data: { stepData: { step_type: 'task' } },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/rooms/[roomId]/realtime-session rejects non-UUID', async () => {
    const res = await api.post(`${BASE}/api/rooms/notauuid/realtime-session`, {
      data: { sessionId: 'abc123' },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('API: Malformed JSON (#2)', () => {
  test('PATCH /api/rooms/[roomId] returns 400 on bad JSON', async () => {
    const res = await api.patch(`${BASE}/api/rooms/${roomId}`, {
      headers: { 'content-type': 'application/json' },
      data: Buffer.from('not json{{'),
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/rooms/[roomId]/steps returns 400 on bad JSON', async () => {
    const res = await api.post(`${BASE}/api/rooms/${roomId}/steps`, {
      headers: { 'content-type': 'application/json' },
      data: Buffer.from('not json{{'),
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('API: Auth & cookie + CSRF (#1, #4)', () => {
  test('PATCH without admin cookie returns 403', async () => {
    const ctx = await unauthedContext();
    const res = await ctx.patch(`${BASE}/api/rooms/${roomId}`, {
      data: { action: 'update_name', name: 'x' },
    });
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test('PATCH with no Origin header is rejected (CSRF)', async () => {
    // Build a context that overrides Origin to a foreign site.
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { origin: 'https://evil.example' },
    });
    const res = await ctx.patch(`${BASE}/api/rooms/${roomId}`, {
      data: { action: 'update_name', name: 'x' },
    });
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test('realtime-session requires admin cookie', async () => {
    const ctx = await unauthedContext();
    const patchRes = await ctx.patch(`${BASE}/api/rooms/${roomId}/realtime-session`, {
      data: { sessionId: 'abc123' },
    });
    expect(patchRes.status()).toBe(403);

    const delRes = await ctx.delete(`${BASE}/api/rooms/${roomId}/realtime-session`, {
      data: { sessionId: 'abc123' },
    });
    expect(delRes.status()).toBe(403);
    await ctx.dispose();
  });
});

test.describe('API: Input validation (#5-8)', () => {
  test('update_name rejects 101+ chars (#5)', async () => {
    const res = await api.patch(`${BASE}/api/rooms/${roomId}`, {
      data: { action: 'update_name', name: 'x'.repeat(101) },
    });
    expect(res.status()).toBe(400);
  });

  test('update_name accepts valid name', async () => {
    const res = await api.patch(`${BASE}/api/rooms/${roomId}`, {
      data: { action: 'update_name', name: 'Valid Name' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('update_players rejects invalid player ID (#6)', async () => {
    const res = await api.patch(`${BASE}/api/rooms/${roomId}`, {
      data: { action: 'update_players', playerNames: { p7: 'Bob' } },
    });
    expect(res.status()).toBe(400);
  });

  test('update_players rejects 51-char name (#6)', async () => {
    const res = await api.patch(`${BASE}/api/rooms/${roomId}`, {
      data: { action: 'update_players', playerNames: { p1: 'x'.repeat(51) } },
    });
    expect(res.status()).toBe(400);
  });

  test('update_players rejects empty name', async () => {
    const res = await api.patch(`${BASE}/api/rooms/${roomId}`, {
      data: { action: 'update_players', playerNames: { p1: '' } },
    });
    expect(res.status()).toBe(400);
  });

  test('update_players rejects whitespace-only name', async () => {
    const res = await api.patch(`${BASE}/api/rooms/${roomId}`, {
      data: { action: 'update_players', playerNames: { p1: '   ' } },
    });
    expect(res.status()).toBe(400);
  });

  test('POST step rejects invalid step_type (#7)', async () => {
    const res = await api.post(`${BASE}/api/rooms/${roomId}/steps`, {
      data: { stepData: { step_type: 'hack' } },
    });
    expect(res.status()).toBe(400);
  });

  test('POST step rejects task_name > 500 chars (#7)', async () => {
    const res = await api.post(`${BASE}/api/rooms/${roomId}/steps`, {
      data: { stepData: { step_type: 'task', task_name: 'x'.repeat(501) } },
    });
    expect(res.status()).toBe(400);
  });

  test('PATCH reorder rejects negative step_order (#8)', async () => {
    const res = await api.patch(`${BASE}/api/rooms/${roomId}/steps`, {
      data: {
        action: 'reorder',
        stepUpdates: [{ id: 'abc', step_order: -1 }],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('PATCH reorder rejects > 500 items (#8)', async () => {
    const stepUpdates = Array.from({ length: 501 }, (_, i) => ({ id: `${i}`, step_order: i }));
    const res = await api.patch(`${BASE}/api/rooms/${roomId}/steps`, {
      data: { action: 'reorder', stepUpdates },
    });
    expect(res.status()).toBe(400);
  });

  test('PATCH update_checkbox rejects non-boolean playerState (#7)', async () => {
    const res = await api.patch(`${BASE}/api/rooms/${roomId}/steps`, {
      data: {
        action: 'update_checkbox',
        stepId: 'some-id',
        playerState: { p1: 'yes' },
      },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('API: sessionId validation (#11)', () => {
  test('rejects sessionId with special chars', async () => {
    const res = await api.post(`${BASE}/api/rooms/${roomId}/realtime-session`, {
      data: { sessionId: 'abc!@#$' },
    });
    expect(res.status()).toBe(400);
  });

  test('rejects sessionId > 64 chars', async () => {
    const res = await api.post(`${BASE}/api/rooms/${roomId}/realtime-session`, {
      data: { sessionId: 'a'.repeat(65) },
    });
    expect(res.status()).toBe(400);
  });

  test('accepts valid alphanumeric sessionId', async () => {
    const res = await api.post(`${BASE}/api/rooms/${roomId}/realtime-session`, {
      data: { sessionId: 'abc123XYZ' },
    });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('API: Rate limiting (#18)', () => {
  test('exceeding rate limit returns 429', async () => {
    // Rate limit is 10 in production, 100 in development
    // Use a unique x-forwarded-for so we don't pollute the unknown bucket.
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { ...ORIGIN_HEADERS, 'x-forwarded-for': '203.0.113.42' },
    });
    const limit = process.env.NODE_ENV === 'production' ? 11 : 101;
    let lastStatus = 0;
    for (let i = 0; i < limit; i++) {
      const res = await ctx.post(`${BASE}/api/rooms/create`);
      lastStatus = res.status();
    }
    expect(lastStatus).toBe(429);
    await ctx.dispose();
  });
});
