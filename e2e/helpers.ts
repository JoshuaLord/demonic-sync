import { Page, expect } from '@playwright/test';

/**
 * Suppress the guided tour so it doesn't block interactions
 */
export async function suppressTour(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('demonic-sync-tour-seen', 'true');
  });
}

/**
 * Wait for admin authentication to complete after navigating with ?key=.
 * Checks for the presence of the non-HttpOnly companion cookie (dsa_<roomId>)
 * which indicates the auth exchange succeeded.
 */
export async function waitForAdminAuth(page: Page, roomId: string, timeout = 5000) {
  const cookieName = `dsa_${roomId}`;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const cookies = await page.context().cookies();
    if (cookies.some(c => c.name === cookieName && c.value === '1')) {
      // Give the React state update a moment to propagate
      await page.waitForTimeout(200);
      return;
    }
    await page.waitForTimeout(100);
  }

  throw new Error(`Admin auth did not complete within ${timeout}ms`);
}

/**
 * Create a new room and navigate to it as admin
 * Returns the room ID
 */
export async function createRoom(page: Page): Promise<string> {
  await suppressTour(page);
  await page.goto('/');

  // Click the create room button
  const createButton = page.locator('button', { hasText: /create/i });
  await createButton.click();

  // Wait for navigation to the route page
  await page.waitForURL(/\/route\//, { timeout: 10000 });

  const url = page.url();
  const roomId = url.match(/\/route\/([^?]+)/)?.[1] || '';
  expect(roomId).toBeTruthy();

  // Wait for the page to fully load
  await page.waitForSelector('[data-tour="task-library"]', { timeout: 10000 });
  await page.waitForSelector('[data-tour="task-library"] input[placeholder*="Search"]', { timeout: 10000 });

  // Wait for admin auth to complete (cookie is set by /api/rooms/create response)
  await waitForAdminAuth(page, roomId);

  return roomId;
}

/**
 * Get task names in the route (in order)
 */
export async function getRouteTaskNames(page: Page): Promise<string[]> {
  const routeArea = page.locator('[data-tour="route-area"]');
  const nameElements = routeArea.locator('.font-medium.truncate');
  const names: string[] = [];
  const count = await nameElements.count();
  for (let i = 0; i < count; i++) {
    const text = await nameElements.nth(i).textContent();
    if (text) names.push(text.trim());
  }
  return names;
}

/**
 * Wait for a specific task count in the route
 * Polls the DOM until the expected count is reached or timeout
 */
export async function waitForTaskCount(page: Page, count: number, timeout = 10000): Promise<string[]> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const names = await getRouteTaskNames(page);
    if (names.length === count) return names;
    await page.waitForTimeout(300);
  }

  // Final check with helpful error message
  const names = await getRouteTaskNames(page);
  expect(names.length, `Expected ${count} tasks but found ${names.length}`).toBe(count);
  return names;
}

/**
 * Add N tasks via the + button, waiting for each to appear
 * Returns the names of the tasks that were added
 */
export async function addTasksViaButton(page: Page, count: number): Promise<string[]> {
  const addedTaskNames: string[] = [];

  // Wait for task library to be ready
  await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });

  for (let i = 0; i < count; i++) {
    // Get the current task count before adding
    const beforeCount = (await getRouteTaskNames(page)).length;

    // Get the name of the task we're about to add
    const taskNameEl = page.locator('[data-tour="task-library"] .font-semibold.text-sm').first();
    const name = await taskNameEl.textContent();
    if (name) addedTaskNames.push(name.trim());

    // Click the + button
    const addButton = page.locator('[data-tour="task-library"] button[title="Add to route"]').first();
    await addButton.click();

    // Wait for the task to actually appear in the route
    await waitForTaskCount(page, beforeCount + 1);
  }

  return addedTaskNames;
}

/**
 * Get a route task item and ensure it's visible
 */
export async function getVisibleRouteItem(page: Page, index = 0) {
  const routeArea = page.locator('[data-tour="route-area"]');
  const taskItem = routeArea.locator('[data-testid="route-task-item"]').nth(index);
  await taskItem.scrollIntoViewIfNeeded();
  await taskItem.waitFor({ state: 'visible', timeout: 5000 });
  return taskItem;
}

/**
 * Wait for the empty state to be visible/hidden
 */
export async function waitForEmptyState(page: Page, visible: boolean, timeout = 5000) {
  const emptyState = page.locator('text=Drag tasks here to build your route');
  if (visible) {
    await expect(emptyState).toBeVisible({ timeout });
  } else {
    await expect(emptyState).not.toBeVisible({ timeout });
  }
}
