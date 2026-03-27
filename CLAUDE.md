# Demonic Sync - Project Instructions

@AGENTS.md

## Quick Start

**Read this first:** `PROJECT-STATUS.md` - Contains complete current state, what's done, and what's next.

## Project Context

This is **Demonic Sync** - a collaborative OSRS Leagues 6 route planning tool. We're building it incrementally using a "crawl, walk, run" approach.

**Current Status:** Stage 3 Nearly Complete (5/6 features) → Only Admin Key Revocation Remaining

## Important Technical Notes

### Next.js 15+ Breaking Change
`params` in dynamic routes is a Promise - must await it:
```typescript
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // ✅ Correct
}
```

### Supabase Local Development
- Always work with local Supabase (not production)
- Project ID: `demonic-sync`
- Ports: 54321 (API), 54322 (DB), 54323 (Studio)
- Start: `supabase start`
- Reset: `supabase db reset`

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

- `PROJECT-STATUS.md` - **Most important:** Full current state and next steps
- `app/page.tsx` - Landing page with room creation
- `app/route/[roomId]/page.tsx` - Route page (server component)
- `app/route/[roomId]/RouteClient.tsx` - Route interactivity (client component)
- `app/api/rooms/create/route.ts` - Room creation API
- `lib/supabase.ts` - Supabase client
- `types/database.types.ts` - Auto-generated DB types
- `supabase/migrations/` - Database migrations

## PRD Documents

Located in parent directory: `/Users/illumin/Documents/leagues-planner/`
- `Overall-PRD.md` - Product vision, user flows, edge cases
- `DB-PRD.md` - Complete database schema and technical implementation
- `UI-UX-PRD.md` - Frontend architecture, component tree, Tailwind theme
- `Implementation-Checklist.md` - Full implementation roadmap (10 phases)

## Stage 3 Implementation Status

**✅ COMPLETED (5/6):**
1. ✅ Real-time sync - Supabase Realtime subscriptions, instant updates
2. ✅ Multiple player columns - Up to 6 players, checkboxes, share modal
3. ✅ Official tasks database - 1,589 tasks, search/filter, split-pane, collapsible
4. ✅ Drag-and-drop reordering - @dnd-kit, drag from library, reorder in route, running totals
5. ✅ Milestone auto-injection - Relic tiers (8), Area unlocks (3), auto-calculation, checkboxes

**📋 REMAINING (1/6):**
6. **Admin key revocation** ⬅️ NEXT
   - Add "Regenerate Key" button to share modal
   - Create POST /api/rooms/[roomId]/revoke-key endpoint
   - Instant downgrade of old key holders to view-only

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

**Apply database changes:**
```bash
supabase migration new <name>
# Edit migration file
supabase db reset
supabase gen types typescript --local > types/database.types.ts
```

**View database:**
Visit http://localhost:54323

## When Continuing Work

1. Read `PROJECT-STATUS.md` first
2. Check what stage/feature we're on
3. Verify Supabase and dev server are running
4. Implement next feature in the order specified
5. Test thoroughly before marking complete
