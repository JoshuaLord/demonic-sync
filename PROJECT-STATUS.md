# Demonic Sync - Project Status

**Last Updated:** March 27, 2026
**Current Stage:** Stage 3 Nearly Complete (5/6 features done - only Admin Key Revocation remaining)

---

## ✅ What's Been Completed

### Stage 1: "Hello World" Setup ✅
- Next.js project created
- Supabase running locally (Docker)
- Test database connection working
- Environment variables configured

### Stage 2: "One Room, One Task" ✅
**All features tested and verified working:**

#### Database ✅
- `rooms` table (id, name, admin_key, player_names, milestone_selections)
- `route_steps` table (id, room_id, step_order, step_type, custom_text, player_state)
- Row Level Security (RLS) enabled
- Realtime enabled (not yet used by frontend)
- TypeScript types generated

#### Backend ✅
- `POST /api/rooms/create` - Creates rooms with admin keys
- Room creation working
- Admin key generation (64-char hex)

#### Frontend ✅
- Landing page with "Create New Route" button
- Room creation flow
- Route page at `/route/[roomId]`
- Admin key "strip and stash" (removes `?key=` from URL)
- Admin mode vs View-only mode detection
- Add tasks (custom text only for now)
- Task list display
- Persistence (tasks survive page refresh)

**Verified Working:**
- ✅ Create room
- ✅ Add tasks
- ✅ Refresh page - tasks persist
- ✅ View-only mode (incognito without admin key)
- ✅ Data in Supabase Studio

### Stage 3: Real-time Collaboration
**Features 1-5 Complete ✅ | Feature 6 Remaining**

#### Feature 1: Real-time Sync ✅
- Supabase Realtime subscriptions for `route_steps` and `rooms` tables
- INSERT/UPDATE/DELETE events sync instantly across all clients
- Task additions appear without page refresh
- Player name changes broadcast to all viewers
- Checkbox state updates sync in real-time
- Optimistic UI updates for instant feedback

#### Feature 2: Player Management ✅
- Player management modal (⚙️ Players button)
- Add/remove up to 6 players with custom names (max 20 chars)
- Player column headers displayed above task list
- Individual checkboxes for each player on each task
- "Copy Admin Link" button for easy sharing with friends
- Read-only mode: Viewers can see checkboxes but can't toggle them
- All changes stored in JSONB fields (`player_names`, `player_state`)
- Real-time sync keeps all clients in sync

**Verified Working:**
- ✅ Add/edit/remove players in real-time
- ✅ Toggle checkboxes (admin only)
- ✅ Copy admin link and share with multiple users
- ✅ View-only mode prevents checkbox edits
- ✅ All changes sync instantly across multiple browser windows
- ✅ No hydration errors

#### Feature 3: Official Tasks Database ✅
- `official_tasks` table with 1,589 real OSRS Leagues 5 tasks
- Task data: name, description, points (10/40/80/200/400), tier, region, skill
- Split-pane layout: active route (left) + task library (right)
- Search bar with real-time filtering by task name/description
- Filter chips for Tier (Easy/Medium/Hard/Elite/Master) and Region
- Task cards show tier badge (color-coded), points, and region
- "+" button to add tasks from library to route (admin only)
- Task data copied directly into route_steps (no JOINs needed)
- Delete tasks with double-click confirmation and visual feedback
- Trash icon expands and pulses on first click to signal confirmation needed
- Real-time sync works for all task operations

**Verified Working:**
- ✅ Import 1,589 tasks from web scraper JSON
- ✅ Search and filter tasks by name, tier, and region
- ✅ Add official tasks to route with full details
- ✅ Display task name, tier badge, points, and region
- ✅ Delete tasks with two-click confirmation
- ✅ All task operations sync in real-time
- ✅ Task library scrolls independently from route
- ✅ Task library can collapse/expand for more space

#### Feature 4: Drag-and-Drop Reordering ✅
- @dnd-kit library fully integrated (@dnd-kit/core, sortable, utilities, modifiers)
- Drag tasks from library directly into route
- Reorder tasks within route by dragging
- Visual drag handles and drag overlay for smooth UX
- Batch update `step_order` values in database
- Running totals (cumulative points and tasks) displayed on each task row
- Race condition fix applied to reordering logic (migration: 20260327223115)
- Real-time sync works during drag operations

**Verified Working:**
- ✅ Drag tasks from task library into route
- ✅ Reorder tasks within route by dragging
- ✅ Running totals update automatically as tasks move
- ✅ Database updates preserve order with UNIQUE constraint
- ✅ Drag operations sync across all clients in real-time
- ✅ Smooth animations and visual feedback during drag

#### Feature 5: Milestone Auto-Injection ✅
- Milestone calculation logic in `lib/milestones.ts`
- Relic tiers: 8 tiers (0, 750, 1500, 2500, 5000, 8000, 16000, 25000 points)
- Area unlocks: 3 unlocks (90, 200, 400 tasks)
- Auto-calculate milestones based on cumulative progress
- Milestone rows inject automatically at threshold positions
- Milestone checkboxes per player (stored in `milestone_player_state` JSONB)
- Visual distinction: gradient backgrounds, badges, icons
- Milestones update dynamically as route changes

**Verified Working:**
- ✅ Milestones auto-inject when thresholds are reached
- ✅ Relic tiers display based on cumulative points
- ✅ Area unlocks display based on task count
- ✅ Milestone checkboxes work per player
- ✅ Milestone state syncs in real-time
- ✅ Running totals drive milestone calculations
- ✅ Milestones reposition when tasks are reordered

---

## 🚀 What's Next: Stage 3

**Status:** 5/6 features complete ✅

### Feature Implementation Status:

1. ✅ **Real-time sync** - COMPLETE
2. ✅ **Multiple player columns with checkboxes** - COMPLETE
3. ✅ **Official tasks database** - COMPLETE
4. ✅ **Drag-and-drop reordering** - COMPLETE
5. ✅ **Milestone auto-injection** - COMPLETE
6. ❌ **Admin key revocation** ⬅️ ONLY REMAINING FEATURE

### Next Up: Admin Key Revocation

**Goal:** Allow admins to regenerate their admin key, instantly revoking access from anyone with the old key.

**Implementation Plan:**
- Add "Regenerate Key" button to share modal (with confirmation)
- Create POST endpoint: `/api/rooms/[roomId]/revoke-key`
- Generate new 64-char hex admin key on server
- Update `rooms.admin_key` in database
- Return new admin key to client
- Client updates localStorage with new key
- Anyone with old key gets downgraded to view-only on next page load

**Files to Modify:**
- `app/route/[roomId]/RouteClient.tsx` - Add button to share modal
- `app/api/rooms/[roomId]/revoke-key/route.ts` - New API endpoint

---

## 📁 Current Project Structure

```
demonic-sync/
├── app/
│   ├── page.tsx                      # Landing page
│   ├── route/[roomId]/
│   │   ├── page.tsx                  # Route page (server)
│   │   └── RouteClient.tsx           # Route page (client)
│   └── api/rooms/create/route.ts     # Room creation API
├── lib/
│   └── supabase.ts                   # Supabase client
├── types/
│   ├── database.types.ts             # Generated types
│   └── index.ts                      # Helper types
├── supabase/
│   └── migrations/
│       ├── 20260326213940_hello_world.sql
│       └── 20260326215728_create_rooms_and_steps.sql
├── .env.local                        # Local env vars
└── package.json
```

---

## 🔧 How to Run

### Start Supabase (if not running)
```bash
cd /Users/illumin/Documents/leagues-planner/demonic-sync
supabase start
```

### Start Dev Server
```bash
npm run dev
```

Visit: **http://localhost:3000**

### Access Supabase Studio
Visit: **http://localhost:54323**

---

## 🗄️ Database Schema

### `rooms`
```sql
- id (UUID, PK)
- name (TEXT) - default "Untitled Route"
- admin_key (TEXT, UNIQUE) - 64-char hex
- player_names (JSONB) - {"p1": "Player 1"}
- milestone_selections (JSONB) - {}
- created_at, updated_at (TIMESTAMP)
```

### `route_steps`
```sql
- id (UUID, PK)
- room_id (UUID, FK → rooms.id)
- step_order (INTEGER) - zero-based index
- step_type (TEXT) - 'task' or 'custom'
- task_id (INTEGER) - null for custom steps
- custom_text (TEXT) - null for tasks
- player_state (JSONB) - {}
- created_at, updated_at (TIMESTAMP)
- UNIQUE(room_id, step_order)
```

---

## 🎯 Milestone Thresholds (Hardcoded)

**Relic Tiers (Point-Based):**
- T1: 0 points
- T2: 750 points
- T3: 1500 points
- T4: 2500 points
- T5: 5000 points
- T6: 8000 points
- T7: 16000 points
- T8: 25000 points

**Area Unlocks (Task-Count-Based):**
- Area 1: 90 tasks
- Area 2: 200 tasks
- Area 3: 400 tasks

---

## 🐛 Known Issues / Technical Notes

### Next.js 15+ Breaking Change
- `params` in dynamic routes is now a Promise
- Must `await params` before accessing properties
- Already fixed in `app/route/[roomId]/page.tsx`

### Supabase Local Setup
- Project ID: `demonic-sync`
- Default ports: 54321 (API), 54322 (DB), 54323 (Studio)
- Data persists in Docker volumes between restarts
- Use `supabase db reset` to apply migrations

---

## 📝 Environment Variables

`.env.local` contains:
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<generated-key>
SUPABASE_SERVICE_ROLE_KEY=<generated-key>
```

Keys are regenerated each time you run `supabase start` (local only).

---

## 🎓 What We Learned

1. **"Crawl, walk, run" approach works** - Building incrementally reduces overwhelm
2. **Test each stage** - Verify everything works before moving forward
3. **Next.js 15+ has breaking changes** - Always check for async params
4. **Local Supabase is powerful** - Full database, realtime, and auth locally

---

## 🔜 Next Session Plan

**Goal:** Implement Admin Key Revocation (Stage 3, Feature #6 - FINAL FEATURE!)

**Steps:**
1. Add "Regenerate Key" button to share modal with confirmation dialog
2. Create API endpoint `/api/rooms/[roomId]/revoke-key`
3. Generate new admin key, update database
4. Update client localStorage with new key
5. Test: Share old admin link, regenerate key, verify old link becomes view-only

**Estimated Time:** 30-45 minutes

**Files to Create/Modify:**
- `app/route/[roomId]/RouteClient.tsx` - Add regenerate button to share modal
- `app/api/rooms/[roomId]/revoke-key/route.ts` - New API endpoint

---

## 📚 Reference Documents

All PRDs are in `/Users/illumin/Documents/leagues-planner/`:
- `Overall-PRD.md` - Product vision and user flows
- `DB-PRD.md` - Database schema and technical details
- `UI-UX-PRD.md` - Frontend architecture and design system
- `Implementation-Checklist.md` - Full implementation roadmap

---

**Ready to continue with Stage 3!** 🚀
