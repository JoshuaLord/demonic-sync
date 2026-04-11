#!/usr/bin/env node

/**
 * Premium Code Hash Generator
 *
 * This script generates a SHA-256 hash from a secret premium code.
 * The hash is stored in NEXT_PUBLIC_PREMIUM_CODE_HASH environment variable.
 *
 * Usage:
 *   node scripts/generate-premium-hash.js
 *
 * The script will prompt for a secret code and output the hash.
 */

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function hashCode(code) {
  return crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');
}

console.log('\n🔐 Premium Code Hash Generator\n');
console.log('This will generate a SHA-256 hash from your secret premium code.');
console.log('The hash can be safely stored in your environment variables.\n');

rl.question('Enter your secret premium code: ', (code) => {
  if (!code || code.trim().length === 0) {
    console.error('\n❌ Error: Code cannot be empty\n');
    rl.close();
    process.exit(1);
  }

  const hash = hashCode(code.trim());

  console.log('\n✅ Hash generated successfully!\n');
  console.log('Add this to your .env.local file:\n');
  console.log(`NEXT_PUBLIC_PREMIUM_CODE_HASH=${hash}\n`);
  console.log('For production (Vercel), add this environment variable:');
  console.log(`  Name:  NEXT_PUBLIC_PREMIUM_CODE_HASH`);
  console.log(`  Value: ${hash}\n`);
  console.log('⚠️  Keep your secret code safe! Share it only with premium users.\n');

  rl.close();
});
