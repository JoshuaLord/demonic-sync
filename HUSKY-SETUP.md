# Husky Pre-Push Setup

## Overview
Husky is configured to run comprehensive checks before every `git push` to prevent broken code from reaching production.

## What Gets Checked (in order)

### 1. 📘 TypeScript Type Check (~3-5s)
- **Command:** `npm run type-check` (`tsc --noEmit`)
- **Purpose:** Catches type errors, missing imports
- **Why:** Fast first check to catch basic issues

### 2. 🏗️ Production Build (~15-30s)
- **Command:** `npm run build` (`next build`)
- **Purpose:** Full Next.js production build
- **Catches:** Missing modules, build errors, import issues
- **Example:** Would have caught the missing `RelicSelectionModal` import

### 3. 🧪 Unit Tests (~1-2s)
- **Command:** `npm run test` (Vitest)
- **Purpose:** Fast unit tests for utilities and logic
- **Coverage:** Milestone calculations, helper functions

### 4. 🎭 E2E Tests (~1-3min)
- **Command:** `npm run test:e2e` (Playwright)
- **Purpose:** Full end-to-end tests in real browser
- **Coverage:** Drag-drop, multi-user sync, edge cases
- **Note:** Automatically starts dev server

### 5. 🔒 Migration Safety (conditional)
- **Command:** `node scripts/check-migration-safety.js`
- **Purpose:** Scans for destructive SQL operations
- **When:** Only runs if migrations changed
- **Prevents:** Accidental data loss (DROP, TRUNCATE, etc.)

## Estimated Total Time
- **Happy path:** ~2-4 minutes
- **With migrations:** +5-10 seconds

## Bypassing Checks (NOT RECOMMENDED)
```bash
git push --no-verify
```

Only use this if:
- You're absolutely certain the code is safe
- Checks are failing due to infrastructure issues
- You're pushing a hotfix and will fix tests separately

## Benefits
- ✅ Catches production-breaking errors before push
- ✅ Ensures all tests pass before deployment
- ✅ Validates database migrations are safe
- ✅ Team-wide consistency (runs for everyone)
- ✅ Faster feedback than waiting for CI/CD

## Setup for New Developers
Husky hooks are automatically installed when running:
```bash
npm install
```

The `prepare` script in `package.json` runs `husky` which sets up the hooks.

## Hook Location
- **Pre-push hook:** `.husky/pre-push`
- **Husky config:** `package.json` (`"prepare": "husky"`)

## Troubleshooting

### "Husky hooks not running"
```bash
npm run prepare  # Re-run husky setup
```

### "E2E tests failing locally"
```bash
# Run tests manually to see full output
npm run test:e2e:headed

# Check if dev server is already running (should not be)
lsof -ti:3000
```

### "Tests pass locally but fail on push"
- Ensure Supabase is running: `supabase start`
- Check for unstaged changes
- Try: `npm run build && npm run test && npm run test:e2e`

## Continuous Integration
These same checks should run in CI/CD (GitHub Actions, etc.) as a final safety net.
