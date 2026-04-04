import { test, expect, Page } from '@playwright/test';

// Helper: Suppress the guided tour
async function suppressTour(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('demonic-sync-tour-seen', 'true');
  });
}

// Helper: Create a new room as admin
async function createRoom(page: Page): Promise<string> {
  await suppressTour(page);
  await page.goto('/');

  const createButton = page.locator('button', { hasText: /create/i });
  await createButton.click();
  await page.waitForURL(/\/route\//, { timeout: 10000 });

  const url = page.url();
  const roomId = url.match(/\/route\/([^?]+)/)?.[1] || '';
  expect(roomId).toBeTruthy();

  await page.waitForSelector('[data-tour="task-library"]', { timeout: 10000 });
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

    // Get initial route task count
    const routeArea = page.locator('[data-tour="route-area"]');
    const initialCount = await routeArea.locator('.font-medium.truncate').count();

    // Ensure button exists and is ready
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { state: 'visible', timeout: 5000 });

    const addButton = page.locator('[data-tour="task-library"] button[title="Add to route"]').first();
    await addButton.click({ force: true });

    // Wait for the task to actually appear in the route (with timeout)
    await page.waitForFunction(
      (expectedCount) => {
        const routeArea = document.querySelector('[data-tour="route-area"]');
        if (!routeArea) return false;
        const tasks = routeArea.querySelectorAll('.font-medium.truncate');
        return tasks.length === expectedCount;
      },
      initialCount + 1,
      { timeout: 5000 }
    );
  }
  return taskNames;
}

test.describe('Edge Case: Drag cancelled mid-flight', () => {
  test('pressing Escape during drag restores original order', async ({ page }) => {
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });
    await addTasksViaButton(page, 3);

    const initialNames = await getRouteTaskNames(page);
    expect(initialNames.length).toBe(3);

    // Start dragging the first task
    const routeArea = page.locator('[data-tour="route-area"]');
    const firstItem = routeArea.locator('.font-medium.truncate').nth(0);
    const firstBox = await firstItem.boundingBox();
    expect(firstBox).toBeTruthy();

    await page.mouse.move(firstBox!.x + firstBox!.width / 2, firstBox!.y + firstBox!.height / 2);
    await page.mouse.down();

    // Move it partway down
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(firstBox!.x + firstBox!.width / 2, firstBox!.y + i * 20);
      await page.waitForTimeout(30);
    }

    // Press Escape to cancel the drag
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Order should be unchanged
    const afterNames = await getRouteTaskNames(page);
    expect(afterNames).toEqual(initialNames);
  });

  test('dropping outside any valid target restores state', async ({ page }) => {
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });
    await addTasksViaButton(page, 2);

    const initialNames = await getRouteTaskNames(page);

    // Start dragging the first route task
    const routeArea = page.locator('[data-tour="route-area"]');
    const firstItem = routeArea.locator('.font-medium.truncate').nth(0);
    const firstBox = await firstItem.boundingBox();
    expect(firstBox).toBeTruthy();

    await page.mouse.move(firstBox!.x + firstBox!.width / 2, firstBox!.y + firstBox!.height / 2);
    await page.mouse.down();

    // Drag way off to the top-left corner of the page (outside everything)
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(10, 10);
      await page.waitForTimeout(30);
    }

    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Tasks should still all be present (none lost)
    const afterNames = await getRouteTaskNames(page);
    expect(afterNames.length).toBe(2);
  });
});

test.describe('Edge Case: Dragging with only one task', () => {
  test('dragging the only task does not lose it', async ({ page }) => {
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });
    await addTasksViaButton(page, 1);

    const initialNames = await getRouteTaskNames(page);
    expect(initialNames.length).toBe(1);

    // Drag the single task down and back up
    const routeArea = page.locator('[data-tour="route-area"]');
    const item = routeArea.locator('.font-medium.truncate').nth(0);
    const box = await item.boundingBox();
    expect(box).toBeTruthy();

    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();

    // Move down
    for (let i = 1; i <= 5; i++) {
      await page.mouse.move(box!.x + box!.width / 2, box!.y + i * 30);
      await page.waitForTimeout(30);
    }
    // Move back up
    for (let i = 5; i >= 0; i--) {
      await page.mouse.move(box!.x + box!.width / 2, box!.y + i * 30);
      await page.waitForTimeout(30);
    }

    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Task should still be there
    const afterNames = await getRouteTaskNames(page);
    expect(afterNames).toEqual(initialNames);
  });
});

test.describe('Edge Case: Library drag abandoned', () => {
  test('dragging from library but dropping outside route does not add task', async ({ page }) => {
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] .font-semibold.text-sm', { timeout: 10000 });

    // Start dragging a library task
    const libraryCard = page.locator('[data-tour="task-library"] .font-semibold.text-sm').first();
    const cardBox = await libraryCard.boundingBox();
    expect(cardBox).toBeTruthy();

    await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
    await page.mouse.down();

    // Drag it slightly but stay within the library area (don't reach the route)
    for (let i = 1; i <= 5; i++) {
      await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + i * 10);
      await page.waitForTimeout(30);
    }

    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Route should still be empty
    await expect(page.locator('text=Drag tasks here to build your route')).toBeVisible();
  });

  test('Escape during library-to-route drag cancels without adding', async ({ page }) => {
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] .font-semibold.text-sm', { timeout: 10000 });

    const libraryCard = page.locator('[data-tour="task-library"] .font-semibold.text-sm').first();
    const routeArea = page.locator('[data-tour="drag-drop-zone"]');

    const cardBox = await libraryCard.boundingBox();
    const routeBox = await routeArea.boundingBox();
    expect(cardBox).toBeTruthy();
    expect(routeBox).toBeTruthy();

    // Start dragging toward the route
    await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
    await page.mouse.down();

    const targetX = routeBox!.x + routeBox!.width / 2;
    const targetY = routeBox!.y + routeBox!.height / 2;
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(
        cardBox!.x + (targetX - cardBox!.x) * (i / 10),
        cardBox!.y + (targetY - cardBox!.y) * (i / 10),
      );
      await page.waitForTimeout(30);
    }

    // Cancel mid-drag
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Route should still be empty
    await expect(page.locator('text=Drag tasks here to build your route')).toBeVisible();
  });
});

test.describe('Edge Case: Rapid interactions', () => {
  test('rapidly adding tasks does not lose any', async ({ page }) => {
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });

    // Click + buttons rapidly with minimal wait
    const targetCount = 5;
    for (let i = 0; i < targetCount; i++) {
      const addButton = page.locator('[data-tour="task-library"] button[title="Add to route"]').first();
      await addButton.click();
      await page.waitForTimeout(400); // Faster than usual
    }

    // Wait for all tasks to settle
    await page.waitForTimeout(2000);

    const names = await getRouteTaskNames(page);
    expect(names.length).toBe(targetCount);
  });

  test('add then immediately delete does not corrupt state', async ({ page }) => {
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });

    // Add a task
    await addTasksViaButton(page, 1);

    // Immediately delete it
    const routeArea = page.locator('[data-tour="route-area"]');
    const taskItem = routeArea.locator('[data-testid="route-task-item"]').first();
    await taskItem.scrollIntoViewIfNeeded();
    await taskItem.waitFor({ state: 'visible', timeout: 5000 });
    await taskItem.hover();

    const deleteButton = taskItem.locator('button[title="Delete"]');
    await deleteButton.click();
    const confirmButton = taskItem.locator('button[title="Click again to confirm"]');
    await confirmButton.click();
    await page.waitForTimeout(1000);

    // Should be back to empty
    await expect(page.locator('text=Drag tasks here to build your route')).toBeVisible();

    // Wait for library to update (deleted task should reappear)
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 5000 });

    // Now add another task - app should still work
    await addTasksViaButton(page, 1);
    const names = await getRouteTaskNames(page);
    expect(names.length).toBe(1);
  });
});

test.describe('Edge Case: Drag to extremes of the list', () => {
  test('dragging last task to top of list works', async ({ page }) => {
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });
    await addTasksViaButton(page, 3);

    const initialNames = await getRouteTaskNames(page);
    const lastName = initialNames[2];

    const routeArea = page.locator('[data-tour="route-area"]');
    const routeItems = routeArea.locator('.font-medium.truncate');

    const lastItem = routeItems.nth(2);
    const firstItem = routeItems.nth(0);

    const lastBox = await lastItem.boundingBox();
    const firstBox = await firstItem.boundingBox();
    expect(lastBox).toBeTruthy();
    expect(firstBox).toBeTruthy();

    // Drag last task up above the first task
    await page.mouse.move(lastBox!.x + lastBox!.width / 2, lastBox!.y + lastBox!.height / 2);
    await page.mouse.down();

    const targetY = firstBox!.y - 20;
    const steps = 15;
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        lastBox!.x + lastBox!.width / 2,
        lastBox!.y + (targetY - lastBox!.y) * (i / steps),
      );
      await page.waitForTimeout(50);
    }

    await page.mouse.up();
    await page.waitForTimeout(1500);

    const newNames = await getRouteTaskNames(page);
    expect(newNames.length).toBe(3);

    // The last task should now be first
    expect(newNames[0]).toBe(lastName);
  });
});

test.describe('Edge Case: Very fast drag movement', () => {
  test('fast mouse flick during drag does not lose the task', async ({ page }) => {
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });
    await addTasksViaButton(page, 2);

    const routeArea = page.locator('[data-tour="route-area"]');
    const firstItem = routeArea.locator('.font-medium.truncate').nth(0);
    const box = await firstItem.boundingBox();
    expect(box).toBeTruthy();

    // Start drag
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();

    // Flick: jump instantly 300px down then back up (no gradual steps)
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 300);
    await page.mouse.move(box!.x + box!.width / 2, box!.y - 100);
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 200);

    await page.mouse.up();
    await page.waitForTimeout(1500);

    // Both tasks should still exist (none lost)
    const names = await getRouteTaskNames(page);
    expect(names.length).toBe(2);
  });
});

test.describe('Edge Case: Page interaction after drag', () => {
  test('app remains fully functional after a completed drag', async ({ page }) => {
    await createRoom(page);
    await page.waitForSelector('[data-tour="task-library"] button[title="Add to route"]', { timeout: 10000 });

    // Add via drag first
    const libraryCard = page.locator('[data-tour="task-library"] .font-semibold.text-sm').first();
    const routeArea = page.locator('[data-tour="drag-drop-zone"]');

    const cardBox = await libraryCard.boundingBox();
    const routeBox = await routeArea.boundingBox();
    expect(cardBox).toBeTruthy();
    expect(routeBox).toBeTruthy();

    await page.mouse.move(cardBox!.x + cardBox!.width / 2, cardBox!.y + cardBox!.height / 2);
    await page.mouse.down();
    const targetX = routeBox!.x + routeBox!.width / 2;
    const targetY = routeBox!.y + routeBox!.height / 2;
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(
        cardBox!.x + (targetX - cardBox!.x) * (i / 10),
        cardBox!.y + (targetY - cardBox!.y) * (i / 10),
      );
      await page.waitForTimeout(50);
    }
    await page.mouse.up();
    await page.waitForTimeout(1500);

    // Now verify the + button still works (app not stuck in drag state)
    const addButton = page.locator('[data-tour="task-library"] button[title="Add to route"]').first();
    await addButton.click();
    await page.waitForTimeout(1000);

    const names = await getRouteTaskNames(page);
    expect(names.length).toBe(2);

    // And verify delete still works
    const routeTaskArea = page.locator('[data-tour="route-area"]');
    const taskItem = routeTaskArea.locator('[data-testid="route-task-item"]').first();
    await taskItem.scrollIntoViewIfNeeded();
    await taskItem.waitFor({ state: 'visible', timeout: 5000 });
    await taskItem.hover();
    const deleteButton = taskItem.locator('button[title="Delete"]');
    await deleteButton.click();
    const confirmButton = taskItem.locator('button[title="Click again to confirm"]');
    await confirmButton.click();
    await page.waitForTimeout(1000);

    const namesAfterDelete = await getRouteTaskNames(page);
    expect(namesAfterDelete.length).toBe(1);
  });
});
