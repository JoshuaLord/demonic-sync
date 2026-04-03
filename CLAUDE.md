# Demonic Sync - Project Instructions

@AGENTS.md

## Quick Start

**Read this first:** `PROJECT-STATUS.md` - Contains complete current state, what's done, and what's next.

## Project Context

This is **Demonic Sync** - a collaborative OSRS Leagues 6 (Demonic Pacts League) route planning tool. We're building it incrementally using a "crawl, walk, run" approach.

**Current Status:** 🚀 **DEPLOYED TO PRODUCTION** - Stage 3 Complete + Post-Launch Enhancements

**Latest Updates (April 3, 2026):**
- ✅ Light/Dark theme toggle with ThemeProvider
- ✅ Custom presence names with real-time sync
- ✅ Live cursors showing other users
- ✅ Milestone selection popover (relics & regions)
- ✅ Guided tour with driver.js
- ✅ E2E testing with Playwright + Unit tests with Vitest
- ✅ Component refactoring for better maintainability

## Important Technical Notes

### Next.js 15+ Breaking Change
`params` in dynamic routes is a Promise - must await it:
```typescript
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // ✅ Correct
}
```

### Supabase Development
- **Local:** Docker containers on ports 54321 (API), 54322 (DB), 54323 (Studio)
- **Production:** Deployed on Supabase Cloud
- Project ID: `demonic-sync`
- Start local: `supabase start`
- Reset local DB: `supabase db reset`
- Push to production: `supabase db push`

### Admin Key Pattern
- Generate server-side: `crypto.randomBytes(32).toString('hex')`
- Pass in URL query param, then "strip and stash" to localStorage
- Client removes `?key=` from URL for clean sharing

## Development Workflow

1. **Before making changes:** Check `PROJECT-STATUS.md` for current state
2. **When implementing features:** Follow Stage 3 order (real-time sync first, then players, etc.)
3. **After changes:** Test thoroughly before moving to next feature
4. **For database changes:** Create migration, apply with `supabase db reset`, regenerate types

## Key Files

- `PROJECT-STATUS.md` - Full current state and next steps (needs updating)
- `app/page.tsx` - Landing page with room creation
- `app/route/[roomId]/page.tsx` - Route page (server component)
- `app/route/[roomId]/RouteClient.tsx` - Main route logic (client component)
- `app/route/[roomId]/components/` - Component directory:
  - `RouteHeader.tsx` - Header with stats, players, share, theme toggle
  - `RouteTaskList.tsx` - Task list with drag-drop sorting
  - `SortableTaskItem.tsx` - Individual draggable task item
  - `MilestoneRow.tsx` - Milestone display with relic/region selection
  - `PlayerModal.tsx`, `ShareModal.tsx` - Modal dialogs
  - `PresenceAvatars.tsx`, `LiveCursors.tsx` - Real-time presence UI
- `app/route/[roomId]/hooks/usePresence.ts` - Custom hook for presence tracking
- `components/ThemeToggle.tsx`, `ThemeProvider.tsx` - Theme system
- `lib/supabase.ts` - Supabase client
- `lib/milestones.ts` - Milestone calculation logic
- `lib/tour.ts` - Guided tour implementation
- `types/database.types.ts` - Auto-generated DB types
- `supabase/migrations/` - Database migrations
- `e2e/` - Playwright E2E tests
- `vitest.config.ts`, `playwright.config.ts` - Test configurations

## Reference Documents

Located in parent directory: `/Users/illumin/Documents/leagues-planner/`

**PRD Documents:**
- `Overall-PRD.md` - Product vision, user flows, edge cases
- `DB-PRD.md` - Complete database schema and technical implementation
- `UI-UX-PRD.md` - Frontend architecture, component tree, Tailwind theme
- `Implementation-Checklist.md` - Full implementation roadmap (10 phases)

**Game Data:**
- `wiki.source` - Official OSRS Wiki source for Demonic Pacts League (Leagues 6)
  - League mechanics, rules, and overview
  - Task information and region details
  - Relic/pact system information
  - Use this as reference for game-accurate data

## Implementation Status

**🚀 PRODUCTION DEPLOYMENT:**
- Deployed to Vercel + Supabase Production
- Initial Deployment: March 28, 2026
- Latest Updates: April 3, 2026 (theme toggle, presence, testing)
- Production URL: https://demonic-sync-[hash].vercel.app
- Vercel CLI available: `vercel`
- Supabase CLI available: `supabase`
- **Note:** Uncommitted changes exist (tests, tour, latest migration)

**✅ STAGE 3 COMPLETE (All Core Features Live):**
1. ✅ Real-time sync - Supabase Realtime subscriptions, instant updates
2. ✅ Multiple player columns - Up to 6 players, checkboxes, share modal
3. ✅ Official tasks database - 1,589 tasks, search/filter, split-pane, collapsible
4. ✅ Drag-and-drop reordering - @dnd-kit, drag from library, reorder in route, running totals
5. ✅ Milestone auto-injection - Relic tiers (8), Area unlocks (3), auto-calculation, checkboxes

**✅ POST-LAUNCH ENHANCEMENTS (April 2026):**
- **Theme System:** Light/Dark mode toggle with CSS variables and localStorage persistence
- **Live Presence:** Real-time user cursors and avatars with custom names
  - Persistent identity (color + name stored in localStorage)
  - Live cursor tracking with Supabase Realtime broadcasts
  - Editable presence names that sync instantly across clients
- **Milestone Selection:** Popover UI for selecting relics and regions
  - `official_relics` table with Tier 1-8 relics (T1 populated, T2-8 placeholders)
  - `official_regions` table with 8 unlockable regions
  - Selections stored in `milestone_selections` JSONB column
- **Component Architecture:** RouteClient refactored into dedicated components
  - `RouteHeader`, `RouteTaskList`, `SortableTaskItem`, `MilestoneRow`
  - `PlayerModal`, `ShareModal`, `PresenceAvatars`, `LiveCursors`
  - `DragOverlayContent` for unified drag preview
- **Guided Tour:** Interactive product tour using driver.js
  - First-time user onboarding
  - Highlights key features (route, library, drag-drop, players, share, theme)
- **Testing Infrastructure:**
  - Playwright E2E tests: drag-and-drop, multi-user, edge cases
  - Vitest unit tests for milestones logic
  - Test coverage for core functionality
- **Database Improvements:**
  - REPLICA IDENTITY FULL for realtime delete events
  - Prevents silent drop of DELETE events in filtered subscriptions

## User Preferences

- Step-by-step incremental implementation
- Test each feature before moving to next
- Desktop-only (no mobile)
- Keep it simple, avoid over-engineering
- This is a fun project, not production-grade

## Common Tasks

**Start development:**
```bash
supabase start
npm run dev
```

**Apply database changes (local):**
```bash
supabase migration new <name>
# Edit migration file
supabase db reset
supabase gen types typescript --local > types/database.types.ts
```

**Deploy to production:**
```bash
vercel --prod                    # Deploy frontend
supabase db push                 # Push database migrations
```

**View database:**
- Local: http://localhost:54323
- Production: Supabase dashboard

## When Continuing Work

**For local development:**
1. Read `PROJECT-STATUS.md` first for current state
2. Start Supabase: `supabase start`
3. Start dev server: `npm run dev`
4. Make changes and test locally

**For production updates:**
1. Test changes locally first
2. Commit and push to GitHub
3. Deploy: `vercel --prod`
4. Push DB changes: `supabase db push` (if needed)
5. Verify production deployment works
