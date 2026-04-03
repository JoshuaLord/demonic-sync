#!/bin/bash

# Safe Database Push Script
# Adds safety checks before pushing migrations to production

set -e

echo "🔒 SAFE DATABASE PUSH TO PRODUCTION"
echo "===================================="
echo ""

# Check if we're targeting production
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ Error: SUPABASE_ACCESS_TOKEN not set"
  echo "   This script requires authentication to push to production."
  exit 1
fi

# Step 1: Check for uncommitted changes
echo "1️⃣  Checking for uncommitted changes..."
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "   ⚠️  Warning: You have uncommitted changes"
  read -p "   Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "   Aborted."
    exit 1
  fi
fi
echo "   ✓ Git status clean"
echo ""

# Step 2: Run migration safety checker
echo "2️⃣  Running migration safety checks..."
node scripts/check-migration-safety.js
echo ""

# Step 3: Show pending migrations
echo "3️⃣  Pending migrations to be applied:"
echo ""
supabase db diff --linked --schema public 2>/dev/null || echo "   (Using migration files in supabase/migrations/)"

# List migration files
MIGRATIONS_DIR="supabase/migrations"
PENDING_MIGRATIONS=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | tail -5 || echo "")
if [ -n "$PENDING_MIGRATIONS" ]; then
  echo "   Latest migration files:"
  echo "$PENDING_MIGRATIONS" | while read -r file; do
    echo "   - $(basename "$file")"
  done
else
  echo "   (No migration files found)"
fi
echo ""

# Step 4: Confirm before pushing
echo "4️⃣  ⚠️  FINAL CONFIRMATION ⚠️"
echo "   You are about to push migrations to PRODUCTION"
echo "   This will modify the live database used by real users."
echo ""
read -p "   Type 'PUSH' to confirm: " -r
echo ""

if [ "$REPLY" != "PUSH" ]; then
  echo "❌ Aborted. Migration push cancelled."
  exit 1
fi

# Step 5: Push migrations
echo "5️⃣  Pushing migrations to production..."
echo ""
supabase db push

echo ""
echo "✅ SUCCESS! Migrations pushed to production."
echo ""
echo "📋 Post-deployment checklist:"
echo "   □ Test the production site"
echo "   □ Verify realtime features still work"
echo "   □ Check for any errors in Supabase logs"
echo ""
