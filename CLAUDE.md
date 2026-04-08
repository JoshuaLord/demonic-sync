# Demonic Sync - Project Instructions

@AGENTS.md

## Quick Start

**Read this first:** `PROJECT-STATUS.md` - Contains complete current state, what's done, and what's next.

## Project Context

This is **Demonic Sync** - a collaborative OSRS Leagues 6 (Demonic Pacts League) route planning tool. We're building it incrementally using a "crawl, walk, run" approach.

**Current Status:** 🚀 **DEPLOYED TO PRODUCTION** - Stage 3 Complete + Security & Optimization

**Latest Updates (April 4, 2026):**
- ✅ **Open Source Release** - MIT License, public GitHub repository
- ✅ **Security Hardening** - All writes via API routes with admin key validation
- ✅ **Realtime Cost Optimization** - Admin-only broadcasting, JWT-based RLS
- ✅ **Husky Pre-Push Hooks** - Types, build, unit tests, E2E, migration safety
- ✅ **Race Condition Fixes** - Multi-admin task adding now safe
- ✅ **E2E Test Improvements** - Better wait conditions, reduced flakiness

**Previous Updates (April 3, 2026):**
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
- Admin key validated server-side using timing-safe comparison

### Security Architecture (API Routes Pattern)
**All write operations flow through API routes** (implemented April 4, 2026):

1. **Client → API Route:**
   - Client calls wrapper function from `lib/api.ts`
   - Admin key included in request body
   - Example: `await api.addTaskToRoute(roomId, taskId, adminKey)`

2. **API Route → Validation:**
   - Route validates admin key using `lib/validate-admin.ts`
   - Uses timing-safe comparison to prevent timing attacks
   - Returns 401 if invalid, 403 if missing

3. **API Route → Database:**
   - If valid, uses service role client (`lib/supabase-admin.ts`)
   - Service role bypasses RLS for authorized operations
   - Returns result or error to client

**Security Benefits:**
- Admin key never sent directly to Supabase (only to our API)
- Column-level RLS hides `admin_key` column from anon role
- RLS policies locked down (no "Allow all writes")
- Timing-safe comparison prevents timing attacks
- Service role client enables admin operations without exposing key

## Development Workflow

1. **Before making changes:** Check `PROJECT-STATUS.md` for current state
2. **When implementing features:** Follow Stage 3 order (real-time sync first, then players, etc.)
3. **After changes:** Test thoroughly before moving to next feature
4. **For database changes:** Create migration, apply with `supabase db reset`, regenerate types

## Key Files

### Documentation
- `CLAUDE.md` - This file (project instructions)
- `PROJECT-STATUS.md` - Full current state and next steps (needs updating)
- `DATABASE-SAFETY.md` - **CRITICAL:** Database safety guide and best practices
- `.env.example` - Environment variables template

### Application Code
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
  - `BroadcastStatus.tsx` - Admin broadcasting status indicator
- `app/route/[roomId]/hooks/usePresence.ts` - Custom hook for presence tracking
- `app/route/[roomId]/hooks/useAdminSession.ts` - JWT session management for admins
- `components/ThemeToggle.tsx`, `ThemeProvider.tsx` - Theme system

### API Routes (Security Layer)
- `app/api/rooms/create/route.ts` - Create new room
- `app/api/rooms/[roomId]/route.ts` - Room mutations (PATCH/DELETE)
- `app/api/rooms/[roomId]/steps/route.ts` - Step mutations (POST/PATCH/DELETE)
- `app/api/rooms/[roomId]/realtime-session/route.ts` - Admin JWT generation

### Libraries & Utilities
- `lib/supabase.ts` - Supabase anon client
- `lib/supabase-admin.ts` - Supabase service role client (server-side only)
- `lib/api.ts` - Client-side API wrappers for mutations
- `lib/validate-admin.ts` - Admin key validation (timing-safe)
- `lib/jwt.ts` - JWT signing and verification
- `lib/milestones.ts` - Milestone calculation logic
- `lib/tour.ts` - Guided tour implementation

### Database & Safety
- `supabase/migrations/` - Database migrations (12 total)
- `scripts/check-migration-safety.js` - Detects destructive SQL operations
- `scripts/db-push-safe.sh` - Safe production migration push with confirmations
- `scripts/setup-hooks.sh` - Installs git hooks for safety
- `.githooks/pre-push` - Pre-push hook to check migrations

### Testing
- `e2e/` - Playwright E2E tests (3 suites)
- `lib/milestones.test.ts` - Vitest unit tests
- `vitest.config.ts`, `playwright.config.ts` - Test configurations

### Build & Types
- `types/database.types.ts` - Auto-generated DB types from Supabase
- `types/index.ts` - Custom TypeScript types
- `package.json` - Dependencies and npm scripts (includes safety commands)

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
- Latest Updates: April 4, 2026 (security hardening, cost optimization, open source)
- Repository: https://github.com/AurorasDad/demonic-sync
- License: MIT (Open Source)
- Production URL: https://demonic-sync-[hash].vercel.app
- Vercel CLI available: `vercel`
- Supabase CLI available: `supabase`
- **Status:** All changes committed (working tree clean)

**✅ STAGE 3 COMPLETE (All Core Features Live):**
1. ✅ Real-time sync - Supabase Realtime subscriptions, instant updates
2. ✅ Multiple player columns - Up to 6 players, checkboxes, share modal
3. ✅ Official tasks database - 1,589 tasks, search/filter, split-pane, collapsible
4. ✅ Drag-and-drop reordering - @dnd-kit, drag from library, reorder in route, running totals
5. ✅ Milestone auto-injection - Relic tiers (8), Area unlocks (3), auto-calculation, checkboxes

**✅ POST-LAUNCH ENHANCEMENTS (April 3-4, 2026):**
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
  - `PlayerModal`, `ShareModal`, `PresenceAvatars`, `LiveCursors`, `BroadcastStatus`
  - `DragOverlayContent` for unified drag preview
- **Guided Tour:** Interactive product tour using driver.js
  - First-time user onboarding
  - Highlights key features (route, library, drag-drop, players, share, theme)
- **Testing Infrastructure:**
  - Playwright E2E tests: drag-and-drop, multi-user, edge cases
  - Vitest unit tests for milestones logic
  - Husky pre-push hooks: types, build, unit tests, E2E, migration safety
  - Test coverage for core functionality
- **Security Hardening (April 4):**
  - All writes moved to API routes with server-side validation
  - Admin key validation using timing-safe comparison
  - RLS policies locked down (removed "Allow all writes")
  - Column-level permissions hide `admin_key` from anon role
  - Security headers (X-Frame-Options, Referrer-Policy, Permissions-Policy)
  - SafeRoom type excludes admin_key for client safety
- **Realtime Cost Optimization (April 4):**
  - Admin-only broadcasting (viewers only receive postgres_changes)
  - JWT-based RLS on `realtime.messages` table
  - 4-admin broadcasting cap with queue system
  - Throttle increased from 50ms to 100ms for efficiency
  - "Paused when alone" failsafe to prevent solo broadcasting
  - Near-zero cost for view-only users
- **Open Source Release (April 4):**
  - MIT License added
  - Repository: https://github.com/AurorasDad/demonic-sync
  - Community contributions welcome
- **Database Improvements:**
  - REPLICA IDENTITY FULL for realtime delete events
  - RLS policies on `realtime.messages` for cost control
  - Race condition fixes for multi-admin scenarios

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
supabase db reset  # SAFE: Only affects local Docker DB
supabase gen types typescript --local > types/database.types.ts
```

**Deploy to production:**
```bash
# Frontend deployment
vercel --prod

# Database migrations (WITH SAFETY CHECKS)
npm run db:push:safe  # Recommended - includes safety checks & confirmations
# OR manually:
npm run db:check      # Check for destructive operations
supabase db push      # Push migrations (no safety checks)
```

## 🔒 Database Safety (IMPORTANT!)

**⛔ NEVER DO THIS:**
- `supabase db reset` on production (wipes all data!)
- Push migrations without testing locally first
- Use `DROP TABLE` or `TRUNCATE` without explicit plan

**✅ SAFE WORKFLOW:**
1. Create migration: `supabase migration new name`
2. Test locally: `supabase db reset` (local only!)
3. Check safety: `npm run db:check`
4. Commit migration: `git add supabase/migrations/ && git commit`
5. Push to production: `npm run db:push:safe`

**Automated Safety Checks (Husky):**
- Pre-push hook runs automatically on `git push`
- Checks: TypeScript types, build, unit tests, E2E tests, migration safety
- Prevents pushing code with errors or destructive migrations
- Can be bypassed with `--no-verify` (NOT RECOMMENDED)

**See [DATABASE-SAFETY.md](./DATABASE-SAFETY.md) for complete safety guide**

**View database:**
- Local: http://localhost:54323
- Production: Supabase dashboard

## When Continuing Work

**For local development:**
1. Check latest code: `git pull origin main`
2. Start Supabase: `supabase start`
3. Start dev server: `npm run dev`
4. Make changes and test locally
5. Run tests: `npm run test && npm run test:e2e`

**For production updates:**
1. Test changes locally first
2. Commit and push to GitHub (pre-push hooks will run automatically)
3. Deploy: `vercel --prod`
4. Push DB changes: `npm run db:push:safe` (if migrations exist)
5. Verify production deployment works

**For contributors:**
- Repository: https://github.com/AurorasDad/demonic-sync
- License: MIT (Open Source)
- Fork, make changes, submit PR
- Husky hooks will ensure code quality before push
