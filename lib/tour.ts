import { driver } from 'driver.js';

const TOUR_SEEN_KEY = 'demonic-sync-tour-seen';

export function hasSeenTour(): boolean {
  return localStorage.getItem(TOUR_SEEN_KEY) === 'true';
}

export function markTourSeen(): void {
  localStorage.setItem(TOUR_SEEN_KEY, 'true');
}

const TOUR_STEPS = [
  {
    element: '[data-tour="route-area"]',
    popover: {
      title: 'Your Route',
      description: 'This is your route. Tasks you add appear here in order. Milestones (relics and area unlocks) are automatically injected based on your progress.',
    },
  },
  {
    element: '[data-tour="task-library"]',
    popover: {
      title: 'Sidebar Tabs',
      description: 'Browse 1,589 official tasks in the Library tab, plan your build in Unlocks, or access recent routes. Use the tabs to switch between views.',
    },
  },
  {
    element: '[data-tour="drag-drop-zone"]',
    popover: {
      title: 'Drag & Drop',
      description: 'Drag tasks from the library into your route, or click the + button. You can also reorder tasks by dragging them within the route.',
    },
  },
  {
    element: '[data-tour="players-button"]',
    popover: {
      title: 'Players',
      description: 'Add up to 6 players and track completion with checkboxes. Perfect for group planning.',
    },
  },
  {
    element: '[data-tour="share-button"]',
    popover: {
      title: 'Share',
      description: 'Share your route with admin or view-only links. Updates sync in real-time across all viewers.',
    },
  },
  {
    element: '[data-tour="theme-toggle"]',
    popover: {
      title: 'Theme',
      description: 'Switch between dark and light mode. Your preference is saved locally.',
    },
  },
];

export function startTour(): void {
  // Filter out steps whose target elements aren't in the DOM
  const activeSteps = TOUR_STEPS.filter(
    (step) => document.querySelector(step.element) !== null
  );

  if (activeSteps.length === 0) return;

  const driverObj = driver({
    showProgress: true,
    animate: true,
    overlayColor: 'rgba(0, 0, 0, 0.6)',
    stagePadding: 8,
    stageRadius: 8,
    popoverClass: 'demonic-tour-popover',
    steps: activeSteps,
    onDestroyed: () => {
      markTourSeen();
    },
  });

  driverObj.drive();
}
