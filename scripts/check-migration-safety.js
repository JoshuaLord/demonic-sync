#!/usr/bin/env node

/**
 * Migration Safety Checker
 * Scans migration files for potentially destructive operations
 * Run before pushing migrations to production
 */

const fs = require('fs');
const path = require('path');

const DESTRUCTIVE_PATTERNS = [
  { pattern: /DROP\s+TABLE/gi, message: 'DROP TABLE detected' },
  { pattern: /DROP\s+DATABASE/gi, message: 'DROP DATABASE detected' },
  { pattern: /TRUNCATE\s+TABLE/gi, message: 'TRUNCATE TABLE detected' },
  { pattern: /DELETE\s+FROM\s+\w+\s*;/gi, message: 'DELETE without WHERE clause detected' },
  // Only flag UPDATE without WHERE that ends with semicolon immediately after SET
  { pattern: /UPDATE\s+\w+\s+SET\s+[^;]*(?<!WHERE[^;]*)\s*;/gi, message: 'UPDATE statement (review for WHERE clause)' },
  { pattern: /ALTER\s+TABLE\s+\w+\s+DROP\s+COLUMN/gi, message: 'ALTER TABLE DROP COLUMN detected' },
];

const SAFE_PATTERNS = [
  /CREATE\s+TABLE/gi,
  /ALTER\s+TABLE\s+\w+\s+ADD\s+COLUMN/gi,
  /CREATE\s+INDEX/gi,
  /CREATE\s+OR\s+REPLACE\s+FUNCTION/gi,
];

function checkMigrationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const warnings = [];

  // Check for destructive patterns
  for (const { pattern, message } of DESTRUCTIVE_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      warnings.push({
        file: fileName,
        severity: 'ERROR',
        message: `${message}: ${matches[0]}`,
      });
    }
  }

  return warnings;
}

function checkAllMigrations() {
  const migrationsDir = path.join(__dirname, '../supabase/migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found');
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('🔍 Checking migrations for destructive operations...\n');

  let hasErrors = false;
  const allWarnings = [];

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const warnings = checkMigrationFile(filePath);

    if (warnings.length > 0) {
      allWarnings.push(...warnings);
      hasErrors = true;
    }
  }

  if (allWarnings.length > 0) {
    console.error('⚠️  DESTRUCTIVE OPERATIONS DETECTED:\n');
    allWarnings.forEach(w => {
      console.error(`  ❌ ${w.file}`);
      console.error(`     ${w.message}\n`);
    });
    console.error('🛑 MIGRATION CHECK FAILED');
    console.error('   These operations could destroy production data!');
    console.error('   Please review carefully before proceeding.\n');
    process.exit(1);
  }

  console.log('✅ All migrations appear safe (no destructive operations detected)');
  console.log(`   Checked ${files.length} migration file(s)\n`);
}

checkAllMigrations();
