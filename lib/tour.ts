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
      description: 'This is your route. Tasks you add appear here in order.',
    },
  },
  {
    element: '[data-tour="task-library"]',
    popover: {
      title: 'Task Library',
      description: 'Browse 1,589 official OSRS Leagues tasks. Search and filter by tier or region.',
    },
  },
  {
    element: '[data-tour="drag-drop-zone"]',
    popover: {
      title: 'Drag & Drop',
      description: 'Drag tasks from the library into your route, or click the + button.',
    },
  },
  {
    element: '[data-tour="players-button"]',
    popover: {
      title: 'Players',
      description: 'Add up to 6 players and track completion with checkboxes.',
    },
  },
  {
    element: '[data-tour="share-button"]',
    popover: {
      title: 'Share',
      description: 'Share your route with friends \u2014 admin or view-only.',
    },
  },
  {
    element: '[data-tour="theme-toggle"]',
    popover: {
      title: 'Theme',
      description: 'Switch between dark and light mode.',
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
