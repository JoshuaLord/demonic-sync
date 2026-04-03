# Database Safety Guide

**CRITICAL:** We have production data that must not be lost. Follow these rules carefully.

## ⛔ NEVER DO THESE

1. **NEVER run `supabase db reset` on production** - This wipes all data!
2. **NEVER run `DROP TABLE` migrations without explicit plan**
3. **NEVER push untested migrations directly to production**
4. **NEVER delete the `.env.local` file without backing it up**

## ✅ Safe Migration Workflow

### For Local Development

```bash
# 1. Create a new migration
supabase migration new descriptive_name

# 2. Write your migration (ADD-ONLY, no destructive operations)
# Edit: supabase/migrations/YYYYMMDD_descriptive_name.sql

# 3. Test locally (this is SAFE - only affects local Docker DB)
supabase db reset

# 4. Verify it works
npm run dev

# 5. Check migration safety
npm run db:check

# 6. Commit the migration
git add supabase/migrations/
git commit -m "Add migration: descriptive_name"
```

### For Production Deployment

```bash
# 1. Ensure all changes are committed
git status

# 2. Run safety checks
npm run db:check

# 3. Use the SAFE push script (includes confirmations)
npm run db:push:safe

# 4. Verify production is working
# Visit your production URL and test features
```

## 🔒 Built-in Safety Guards

### 1. Migration Safety Checker
**File:** `scripts/check-migration-safety.js`

Automatically scans migrations for:
- DROP TABLE
- TRUNCATE
- DELETE without WHERE
- ALTER TABLE DROP COLUMN
- Other destructive operations

**Usage:**
```bash
npm run db:check
```

### 2. Safe Push Script
**File:** `scripts/db-push-safe.sh`

Multi-step confirmation process:
1. ✓ Checks git status
2. ✓ Runs migration safety checker
3. ✓ Shows pending migrations
4. ✓ Requires typing "PUSH" to confirm
5. ✓ Executes `supabase db push`

**Usage:**
```bash
npm run db:push:safe
```

### 3. Blocked Commands
The following npm scripts are blocked to prevent accidents:

- `npm run db:reset` - Blocked (use local Supabase CLI directly)
- `npm run db:push` - Redirects to `db:push:safe`

## 📋 Migration Best Practices

### ✅ Safe Operations (Encouraged)

```sql
-- Add new columns (with defaults for existing rows)
ALTER TABLE rooms ADD COLUMN new_field TEXT DEFAULT '';

-- Create new tables
CREATE TABLE new_feature (...);

-- Add indexes
CREATE INDEX idx_name ON table_name(column);

-- Create or replace functions
CREATE OR REPLACE FUNCTION my_function() RETURNS ...;

-- Add constraints (carefully)
ALTER TABLE rooms ADD CONSTRAINT check_name CHECK (length(name) > 0);
```

### ⚠️ Dangerous Operations (Require Extra Care)

```sql
-- Renaming columns (breaks code until deployed)
ALTER TABLE rooms RENAME COLUMN old_name TO new_name;

-- Changing column types (may fail on existing data)
ALTER TABLE rooms ALTER COLUMN points TYPE BIGINT;

-- Adding NOT NULL to existing columns
-- (must have DEFAULT or backfill first)
ALTER TABLE rooms ALTER COLUMN field SET NOT NULL;
```

### ❌ Destructive Operations (Almost Never Do)

```sql
-- Dropping tables (loses all data)
DROP TABLE old_table;

-- Dropping columns (loses data)
ALTER TABLE rooms DROP COLUMN old_field;

-- Truncating (deletes all rows)
TRUNCATE TABLE temp_data;

-- Unqualified deletes (deletes all rows)
DELETE FROM rooms;
```

## 🔄 Reverting Bad Migrations

If you push a bad migration:

### Option 1: Forward-Fix (Preferred)
```bash
# Create a new migration that fixes the issue
supabase migration new fix_previous_migration

# Write corrective SQL
# Push the fix
npm run db:push:safe
```

### Option 2: Rollback (If caught immediately)
```bash
# Contact Supabase support or use dashboard
# Manual rollback to previous migration
```

### Option 3: Point-in-Time Recovery (Last Resort)
- Requires Supabase Pro plan
- Use Supabase Dashboard > Database > Backups
- Can restore to any point in the last 7 days

## 💾 Backup Strategy

### Automated Backups (Supabase)
- **Free Plan:** Daily backups, 7-day retention
- **Pro Plan:** Point-in-time recovery

### Manual Backups (Before Big Changes)
```bash
# Create a backup before major migrations
npm run db:backup

# This creates: backup-YYYYMMDD-HHMMSS.sql
```

### Restore from Backup
```bash
# Local restore (for testing)
supabase db reset
psql -h localhost -p 54322 -U postgres < backup-file.sql

# Production restore (use Supabase Dashboard)
```

## 🚨 Emergency Procedures

### If Production Data is Lost

1. **STOP** - Don't push more changes
2. **Check Supabase Dashboard** - Recent backups available?
3. **Point-in-Time Recovery** - Restore to before incident
4. **Contact Support** - Supabase support can help recover
5. **Document** - What happened, how to prevent

### If Migration Fails on Production

1. **Check Supabase Logs** - Database > Logs
2. **Don't panic** - Failed migrations don't apply (atomic)
3. **Fix locally** - Test fix with `supabase db reset`
4. **Push fix** - Use `npm run db:push:safe`

## 📚 Additional Resources

- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL ALTER TABLE Docs](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Our CLAUDE.md](./CLAUDE.md) - Project setup and commands

## 🎯 Quick Reference

| Task | Command | Safe for Prod? |
|------|---------|----------------|
| Create migration | `supabase migration new name` | ✅ (doesn't apply yet) |
| Test locally | `supabase db reset` | ✅ (local only) |
| Check safety | `npm run db:check` | ✅ (read-only) |
| Push to prod | `npm run db:push:safe` | ⚠️ (with checks) |
| Reset local | `supabase db reset` | ✅ (local only) |
| Reset prod | ❌ NEVER | ❌ DATA LOSS |
| Backup | `npm run db:backup` | ✅ (read-only) |

---

**Remember:** It's easier to prevent data loss than to recover from it. When in doubt, ask for review before pushing to production! 🛡️
