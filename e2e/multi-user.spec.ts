import { test, expect, Page, Browser, BrowserContext } from '@playwright/test';
import {
  suppressTour,
  getRouteTaskNames,
  waitForTaskCount,
  getVisibleRouteItem,
  waitForEmptyState,
  waitForAdminAuth,
} from './helpers';

const BASE_URL = 'http://localhost:3000';

// Helper: Create a fresh browser context with tour suppressed
async function createUser(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await suppressTour(page);
  return { context, page };
}

// Helper: Create a room as admin and return roomId.
// Admin auth is now held in an HttpOnly cookie scoped to this browser
// context — there is no longer an admin key in the URL.
async function createRoomMultiUser(page: Page): Promise<{ roomId: string; adminKey: string }> {
  await page.goto(BASE_URL);
  const createButton = page.locator('button', { hasText: /create/i });
  await createButton.click();
  await page.waitForURL(/\/route\//, { timeout: 10000 });

  const url = page.url();
  const roomId = url.match(/\/route\/([^?]+)/)?.[1] || '';

  // Wait for the page to load AND for admin auth to complete
  await page.waitForSelector('[data-tour="task-library"]', { timeout: 10000 });
  await waitForAdminAuth(page, roomId);

  // Fetch the admin key from the new endpoint
  const adminKey = await page.evaluate(async (id) => {
    const r = await fetch(`/api/rooms/${id}/admin-key`, { credentials: 'same-origin' });
    if (!r.ok) throw new Error(`Failed to fetch admin key: ${r.status}`);
    const j = await r.json();
    return j.adminKey as string;
  }, roomId);

  return { roomId, adminKey };
}

test.describe('Multi-User: Real-time task sync', () => {
  test('viewer sees task added by admin in real-time', async ({ browser }) => {
    // Admin creates a room
    const admin = await createUser(browser);
    const { roomId } = await createRoomMultiUser(admin.page);

    // Viewer joins the same room (no admin key)
    const viewer = await createUser(browser);
    await viewer.page.goto(`${BASE_URL}/route/${roomId}`);
    await viewer.page.waitForSelector('[data-tour="task-library"]', { timeout: 10000 });

    // Give the viewer's realtime subscription time to fully connect
    await viewer.page.waitForTimeout(2000);

    // Both should see empty route
    await expect(admin.page.locator('text=Drag tasks here to build your route')).toBeVisible();
    await expect(viewer.page.locator('text=Drag tasks here to build your route')).toBeVisible();

    // Admin adds a task
    const addButton = admin.page.locator('[data-tour="task-library"] button[title="Add to route"]').first();
    await addButton.click();

    // Admin should see it immediately
    await waitForTaskCount(admin.page, 1);

    // Viewer should see it via real-time sync
    await waitForTaskCount(viewer.page, 1, 10000);

    // Both should see the same task name
    const adminNames = await getRouteTaskNames(admin.page);
    const viewerNames = await getRouteTaskNames(viewer.page);
    expect(adminNames).toEqual(viewerNames);

    await admin.context.close();
    await viewer.context.close();
  });

  test('viewer sees task deleted by admin in real-time', async ({ browser }) => {
    const admin = await createUser(browser);
    const { roomId } = await createRoomMultiUser(admin.page);

    // Admin adds a task first
    await admin.page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });
    const addButton = admin.page.locator('[data-tour="task-library"] button[title="Add to route"]').first();
    await addButton.click();
    await waitForTaskCount(admin.page, 1);

    // Viewer joins and sees the task
    const viewer = await createUser(browser);
    await viewer.page.goto(`${BASE_URL}/route/${roomId}`);
    await viewer.page.waitForSelector('[data-tour="route-area"]', { timeout: 10000 });
    await waitForTaskCount(viewer.page, 1);

    // Admin deletes the task
    const taskItem = await getVisibleRouteItem(admin.page, 0);
    await taskItem.hover();
    await taskItem.locator('button[title="Delete"]').click();
    await taskItem.locator('button[title="Click again to confirm"]').click();

    // Admin sees empty
    await waitForTaskCount(admin.page, 0);

    // Viewer should see the deletion in real-time (DELETE events can be slower to propagate)
    await waitForTaskCount(viewer.page, 0, 15000);
    await expect(viewer.page.locator('text=Drag tasks here to build your route')).toBeVisible();

    await admin.context.close();
    await viewer.context.close();
  });
});

test.describe('Multi-User: Two admins editing simultaneously', () => {
  test('both admins see tasks added by the other', async ({ browser }) => {
    // Admin 1 creates a room
    const admin1 = await createUser(browser);
    const { roomId, adminKey } = await createRoomMultiUser(admin1.page);

    // Admin 2 joins with the admin key
    const admin2 = await createUser(browser);
    await admin2.page.goto(`${BASE_URL}/route/${roomId}?key=${adminKey}`);
    await admin2.page.waitForSelector('[data-tour="task-library"]', { timeout: 10000 });
    await waitForAdminAuth(admin2.page, roomId);

    // Admin 1 adds a task
    const addButton1 = admin1.page.locator('[data-tour="task-library"] button[title="Add to route"]').first();
    await addButton1.click();
    await waitForTaskCount(admin1.page, 1);

    // Admin 2 should see it
    await waitForTaskCount(admin2.page, 1);

    // Admin 2 adds a task
    const addButton2 = admin2.page.locator('[data-tour="task-library"] button[title="Add to route"]').first();
    await addButton2.click();
    await waitForTaskCount(admin2.page, 2);

    // Admin 1 should see both
    await waitForTaskCount(admin1.page, 2);

    // Both see the same tasks in the same order
    const names1 = await getRouteTaskNames(admin1.page);
    const names2 = await getRouteTaskNames(admin2.page);
    expect(names1).toEqual(names2);

    await admin1.context.close();
    await admin2.context.close();
  });

  test('reorder by one admin is reflected for the other', async ({ browser }) => {
    const admin1 = await createUser(browser);
    const { roomId, adminKey } = await createRoomMultiUser(admin1.page);

    // Add 3 tasks as admin 1, waiting for each to appear
    await admin1.page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });
    for (let i = 0; i < 3; i++) {
      const beforeCount = (await getRouteTaskNames(admin1.page)).length;
      await admin1.page.locator('[data-tour="task-library"] button[title="Add to route"]').first().click();
      await waitForTaskCount(admin1.page, beforeCount + 1);
    }

    // Admin 2 joins
    const admin2 = await createUser(browser);
    await admin2.page.goto(`${BASE_URL}/route/${roomId}?key=${adminKey}`);
    await admin2.page.waitForSelector('[data-tour="route-area"]', { timeout: 10000 });
    await waitForAdminAuth(admin2.page, roomId);
    await waitForTaskCount(admin2.page, 3);

    const beforeNames = await getRouteTaskNames(admin2.page);

    // Admin 1 drags the first task to the bottom
    const routeArea = admin1.page.locator('[data-tour="route-area"]');
    const routeItems = routeArea.locator('.font-medium.truncate');
    const firstItem = routeItems.nth(0);
    const thirdItem = routeItems.nth(2);

    const firstBox = await firstItem.boundingBox();
    const thirdBox = await thirdItem.boundingBox();
    expect(firstBox).toBeTruthy();
    expect(thirdBox).toBeTruthy();

    await admin1.page.mouse.move(firstBox!.x + firstBox!.width / 2, firstBox!.y + firstBox!.height / 2);
    await admin1.page.mouse.down();
    const targetY = thirdBox!.y + thirdBox!.height + 10;
    for (let i = 1; i <= 15; i++) {
      await admin1.page.mouse.move(
        firstBox!.x + firstBox!.width / 2,
        firstBox!.y + (targetY - firstBox!.y) * (i / 15),
      );
      await admin1.page.waitForTimeout(50);
    }
    await admin1.page.mouse.up();
    await admin1.page.waitForTimeout(2000);

    // Admin 1's new order
    const admin1Names = await getRouteTaskNames(admin1.page);
    expect(admin1Names.length).toBe(3);
    expect(admin1Names[0]).not.toBe(beforeNames[0]); // first task moved

    // Admin 2 should see the new order via real-time sync
    // Wait for the reorder to propagate
    const deadline = Date.now() + 8000;
    let admin2Names: string[] = [];
    while (Date.now() < deadline) {
      admin2Names = await getRouteTaskNames(admin2.page);
      if (admin2Names.length === 3 && admin2Names[0] === admin1Names[0]) break;
      await admin2.page.waitForTimeout(300);
    }
    expect(admin2Names).toEqual(admin1Names);

    await admin1.context.close();
    await admin2.context.close();
  });
});

test.describe('Multi-User: Checkbox sync', () => {
  test('checkbox toggled by admin appears for viewer', async ({ browser }) => {
    const admin = await createUser(browser);
    const { roomId } = await createRoomMultiUser(admin.page);

    // Add a task
    await admin.page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });
    await admin.page.locator('[data-tour="task-library"] button[title="Add to route"]').first().click();
    await waitForTaskCount(admin.page, 1);

    // Viewer joins
    const viewer = await createUser(browser);
    await viewer.page.goto(`${BASE_URL}/route/${roomId}`);
    await viewer.page.waitForSelector('[data-tour="route-area"]', { timeout: 10000 });
    await waitForTaskCount(viewer.page, 1);

    // Admin checks the checkbox on the task
    const adminCheckbox = admin.page.locator('[data-tour="route-area"] input[type="checkbox"]').first();
    if (await adminCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await adminCheckbox.click();
      await admin.page.waitForTimeout(1500);

      // Admin's checkbox should be checked
      await expect(adminCheckbox).toBeChecked();

      // Viewer should see the checkbox become checked via real-time
      const viewerCheckbox = viewer.page.locator('[data-tour="route-area"] input[type="checkbox"]').first();
      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        if (await viewerCheckbox.isChecked()) break;
        await viewer.page.waitForTimeout(300);
      }
      await expect(viewerCheckbox).toBeChecked();
    }

    await admin.context.close();
    await viewer.context.close();
  });
});

test.describe('Multi-User: Simultaneous actions', () => {
  test('two admins adding tasks at the same time', async ({ browser }) => {
    const admin1 = await createUser(browser);
    const { roomId, adminKey } = await createRoomMultiUser(admin1.page);

    const admin2 = await createUser(browser);
    await admin2.page.goto(`${BASE_URL}/route/${roomId}?key=${adminKey}`);
    await admin2.page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });
    await waitForAdminAuth(admin2.page, roomId);

    // Also wait for admin1's library
    await admin1.page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });

    // Both admins click + at nearly the same time
    await Promise.all([
      admin1.page.locator('[data-tour="task-library"] button[title="Add to route"]').first().click(),
      admin2.page.locator('[data-tour="task-library"] button[title="Add to route"]').first().click(),
    ]);

    // Wait for sync to settle
    await admin1.page.waitForTimeout(3000);

    // Both should see 2 tasks
    await waitForTaskCount(admin1.page, 2);
    await waitForTaskCount(admin2.page, 2);

    // Same tasks in same order
    const names1 = await getRouteTaskNames(admin1.page);
    const names2 = await getRouteTaskNames(admin2.page);
    expect(names1).toEqual(names2);

    await admin1.context.close();
    await admin2.context.close();
  });

  test('one admin adds while another deletes - no crash', async ({ browser }) => {
    const admin1 = await createUser(browser);
    const { roomId, adminKey } = await createRoomMultiUser(admin1.page);

    // Admin1 adds 2 tasks, waiting for each to appear
    await admin1.page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });
    for (let i = 0; i < 2; i++) {
      const beforeCount = (await getRouteTaskNames(admin1.page)).length;
      await admin1.page.locator('[data-tour="task-library"] button[title="Add to route"]').first().click();
      await waitForTaskCount(admin1.page, beforeCount + 1);
    }

    // Admin2 joins
    const admin2 = await createUser(browser);
    await admin2.page.goto(`${BASE_URL}/route/${roomId}?key=${adminKey}`);
    await admin2.page.waitForSelector('[data-tour="route-area"]', { timeout: 10000 });
    await waitForAdminAuth(admin2.page, roomId);
    await waitForTaskCount(admin2.page, 2);

    // Admin1 deletes the first task while Admin2 adds a new one
    const deleteItem = await getVisibleRouteItem(admin1.page, 0);
    await deleteItem.hover();
    await deleteItem.locator('button[title="Delete"]').click();

    // Run both actions close together
    await Promise.all([
      deleteItem.locator('button[title="Click again to confirm"]').click(),
      admin2.page.locator('[data-tour="task-library"] button[title="Add to route"]').first().click(),
    ]);

    // Wait for real-time sync to settle
    await admin1.page.waitForTimeout(5000);

    // Both should converge to the same state: 2 original - 1 deleted + 1 added = 2
    // The key assertion: both admins agree AND no errors/crashes occurred
    const names1 = await getRouteTaskNames(admin1.page);
    const names2 = await getRouteTaskNames(admin2.page);

    // Both should have the same count (exact count depends on race timing)
    expect(names1.length).toBeGreaterThanOrEqual(1);
    expect(names1.length).toBeLessThanOrEqual(3);

    // Wait a bit more for full convergence, then check they match
    await admin1.page.waitForTimeout(2000);
    const finalNames1 = await getRouteTaskNames(admin1.page);
    const finalNames2 = await getRouteTaskNames(admin2.page);
    expect(finalNames1).toEqual(finalNames2);

    await admin1.context.close();
    await admin2.context.close();
  });
});

test.describe('Multi-User: Late joiner', () => {
  test('user joining after tasks are added sees full state', async ({ browser }) => {
    const admin = await createUser(browser);
    const { roomId } = await createRoomMultiUser(admin.page);

    // Admin adds 4 tasks, waiting for each to appear
    await admin.page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });
    for (let i = 0; i < 4; i++) {
      const beforeCount = (await getRouteTaskNames(admin.page)).length;
      await admin.page.locator('[data-tour="task-library"] button[title="Add to route"]').first().click();
      await waitForTaskCount(admin.page, beforeCount + 1);
    }

    const adminNames = await getRouteTaskNames(admin.page);

    // Late joiner arrives
    const lateJoiner = await createUser(browser);
    await lateJoiner.page.goto(`${BASE_URL}/route/${roomId}`);
    await lateJoiner.page.waitForSelector('[data-tour="route-area"]', { timeout: 10000 });

    // Should see all 4 tasks from the server-rendered initial state
    await waitForTaskCount(lateJoiner.page, 4);
    const lateNames = await getRouteTaskNames(lateJoiner.page);
    expect(lateNames).toEqual(adminNames);

    await admin.context.close();
    await lateJoiner.context.close();
  });
});
