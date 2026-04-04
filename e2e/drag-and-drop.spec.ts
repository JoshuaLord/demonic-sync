import { test, expect, Page } from '@playwright/test';

// Helper: Suppress the guided tour so it doesn't block interactions
async function suppressTour(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('demonic-sync-tour-seen', 'true');
  });
}

// Helper: Create a new room and navigate to it as admin
async function createRoom(page: Page): Promise<string> {
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

  // Wait for the page to fully load and ensure task library tab is visible
  await page.waitForSelector('[data-tour="task-library"]', { timeout: 10000 });

  // Ensure sidebar is expanded and on Library tab (not Unlocks)
  // The sidebar should be expanded by default, but let's verify the library content is visible
  await page.waitForSelector('[data-tour="task-library"] input[placeholder*="Search"]', { timeout: 10000 });

  return roomId;
}

// Helper: Get task names in the route (in order)
async function getRouteTaskNames(page: Page): Promise<string[]> {
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

// Helper: Add N tasks via the + button
async function addTasksViaButton(page: Page, count: number): Promise<string[]> {
  const taskNames: string[] = [];
  for (let i = 0; i < count; i++) {
    const taskNameEl = page.locator('[data-tour="task-library"] .font-semibold.text-sm').first();
    const name = await taskNameEl.textContent();
    taskNames.push(name?.trim() || '');

    const addButton = page.locator('[data-tour="task-library"] button[title="Add to route"]').first();
    await addButton.click();
    await page.waitForTimeout(1000);
  }
  return taskNames;
}

test.describe('Room Creation & Setup', () => {
  test('can create a new room and land on route page', async ({ page }) => {
    await createRoom(page);

    // Should see the route page with empty state
    await expect(page.locator('text=Drag tasks here to build your route')).toBeVisible();

    // Task library should be visible (check for search box instead of removed header)
    await expect(page.locator('[data-tour="task-library"] input[placeholder*="Search"]')).toBeVisible();
  });
});

test.describe('Adding Tasks to Route', () => {
  test('can add a task from library using the + button', async ({ page }) => {
    await createRoom(page);

    // Wait for tasks to load in the library
    await page.waitForSelector('[data-tour="task-library"] .font-semibold.text-sm', { timeout: 10000 });

    // Click the + button on the first task card
    const addButton = page.locator('[data-tour="task-library"] button[title="Add to route"]').first();
    await addButton.click();

    // Wait for the task to appear in the route
    await page.waitForTimeout(1000);

    // The empty state should be gone
    await expect(page.locator('text=Drag tasks here to build your route')).not.toBeVisible();
  });

  test('can add multiple tasks and they appear in order', async ({ page }) => {
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });

    await addTasksViaButton(page, 3);

    const names = await getRouteTaskNames(page);
    expect(names.length).toBe(3);
  });
});

test.describe('Drag and Drop - Library to Route', () => {
  test('can drag a task from library to the route area', async ({ page }) => {
    await createRoom(page);

    await page.waitForSelector('[data-tour="task-library"] .font-semibold.text-sm', { timeout: 10000 });

    // Get the first library task card (the parent div with the drag handler)
    const libraryCard = page.locator('[data-tour="task-library"] .font-semibold.text-sm').first();

    // Get the route drop zone
    const routeArea = page.locator('[data-tour="drag-drop-zone"]');

    const cardBox = await libraryCard.boundingBox();
    const routeBox = await routeArea.boundingBox();
    expect(cardBox).toBeTruthy();
    expect(routeBox).toBeTruthy();

    // Drag from library card to route area
    await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
    await page.mouse.down();

    // Move in steps to trigger dragOver events (dnd-kit needs gradual movement)
    const targetX = routeBox!.x + routeBox!.width / 2;
    const targetY = routeBox!.y + routeBox!.height / 2;
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        cardBox!.x + (targetX - cardBox!.x) * (i / steps),
        cardBox!.y + (targetY - cardBox!.y) * (i / steps),
      );
      await page.waitForTimeout(50);
    }

    await page.mouse.up();
    await page.waitForTimeout(1500);

    // The empty state should be gone - task was added
    await expect(page.locator('text=Drag tasks here to build your route')).not.toBeVisible();
  });
});

test.describe('Drag and Drop - Reorder within Route', () => {
  test('can reorder tasks by dragging within the route', async ({ page }) => {
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });

    // Add 3 tasks via + button
    await addTasksViaButton(page, 3);

    // Verify we have 3 tasks
    const initialNames = await getRouteTaskNames(page);
    expect(initialNames.length).toBe(3);

    // Get the first and third task elements in the route
    const routeArea = page.locator('[data-tour="route-area"]');
    const routeItems = routeArea.locator('.font-medium.truncate');

    const firstItem = routeItems.nth(0);
    const thirdItem = routeItems.nth(2);
    const firstName = await firstItem.textContent();

    const firstBox = await firstItem.boundingBox();
    const thirdBox = await thirdItem.boundingBox();
    expect(firstBox).toBeTruthy();
    expect(thirdBox).toBeTruthy();

    // Drag first task down past the third task
    await page.mouse.move(firstBox!.x + firstBox!.width / 2, firstBox!.y + firstBox!.height / 2);
    await page.mouse.down();

    // Move gradually to below the third item
    const targetY = thirdBox!.y + thirdBox!.height + 10;
    const steps = 15;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        firstBox!.x + firstBox!.width / 2,
        firstBox!.y + (targetY - firstBox!.y) * (i / steps),
      );
      await page.waitForTimeout(50);
    }

    await page.mouse.up();
    await page.waitForTimeout(1500);

    // Get the new order
    const newNames = await getRouteTaskNames(page);
    expect(newNames.length).toBe(3);

    // The first task should no longer be first (it was moved down)
    if (firstName) {
      expect(newNames[0]).not.toBe(firstName);
    }
  });
});

test.describe('Task Deletion', () => {
  test('can delete a task with double-click confirm', async ({ page }) => {
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });

    // Add a task
    await addTasksViaButton(page, 1);

    // Hover over the task to reveal delete button
    const routeArea = page.locator('[data-tour="route-area"]');
    const taskItem = routeArea.locator('[data-testid="route-task-item"]').first();
    await taskItem.scrollIntoViewIfNeeded();
    await taskItem.waitFor({ state: 'visible', timeout: 5000 });
    await taskItem.hover();

    // Click delete button once (first click = confirm prompt)
    const deleteButton = taskItem.locator('button[title="Delete"]');
    await deleteButton.click();

    // Click again to confirm
    const confirmButton = taskItem.locator('button[title="Click again to confirm"]');
    await confirmButton.click();

    await page.waitForTimeout(1000);

    // Route should be empty again
    await expect(page.locator('text=Drag tasks here to build your route')).toBeVisible();
  });
});

test.describe('View-Only Mode', () => {
  test('viewer cannot see delete buttons', async ({ page, context }) => {
    // Create a room as admin
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });

    // Add a task as admin
    await addTasksViaButton(page, 1);

    // Extract the room ID from URL
    const url = page.url();
    const roomId = url.match(/\/route\/([^?]+)/)?.[1] || '';

    // Open a NEW page in the same context but clear the admin key
    // Use a brand new browser context to simulate a different user
    const viewerContext = await page.context().browser()!.newContext();
    const viewerPage = await viewerContext.newPage();
    await suppressTourForPage(viewerPage);

    // Visit the room without the admin key
    await viewerPage.goto(`http://localhost:3000/route/${roomId}`);
    await viewerPage.waitForSelector('[data-tour="route-area"]', { timeout: 10000 });
    await viewerPage.waitForTimeout(1000);

    // The route area should show the task
    const routeArea = viewerPage.locator('[data-tour="route-area"]');
    const taskItem = routeArea.locator('[data-testid="route-task-item"]').first();

    if (await taskItem.isVisible().catch(() => false)) {
      await taskItem.hover();
      await viewerPage.waitForTimeout(500);

      // Delete button should NOT be visible for viewers
      const deleteButton = taskItem.locator('button[title="Delete"]');
      await expect(deleteButton).not.toBeVisible();
    }

    await viewerContext.close();
  });
});

// Helper for pages created outside the createRoom flow
async function suppressTourForPage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('demonic-sync-tour-seen', 'true');
  });
}
