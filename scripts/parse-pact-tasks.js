#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SOURCE_FILE = path.resolve(__dirname, '../../wiki-pacts.source');
const START_ID = 10001;

const TIER_POINTS = {
  easy: 10,
  medium: 40,
  hard: 80,
  elite: 200,
  master: 400,
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function escapeSql(str) {
  return str.replace(/'/g, "''");
}

// Strip wiki markup like [[Link|Text]] -> Text, [[Link]] -> Link, {{SCP|...}} -> empty
function cleanWikiMarkup(str) {
  // Remove {{SCP|...}} templates (may be nested)
  str = str.replace(/\{\{SCP\|[^}]*\}\}/g, '');
  // [[Link|Display]] -> Display
  str = str.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2');
  // [[Link]] -> Link
  str = str.replace(/\[\[([^\]]*)\]\]/g, '$1');
  // Clean up extra spaces and leading/trailing commas
  str = str.replace(/\s{2,}/g, ' ').trim();
  return str;
}

const raw = fs.readFileSync(SOURCE_FILE, 'utf-8');
const lines = raw.split('\n');

const tasks = [];
let id = START_ID;

for (const line of lines) {
  const match = line.match(/^\{\{DPLTaskRow\|(.+)\}\}$/);
  if (!match) continue;

  const parts = match[1];

  // Replace nested {{ }} and [[ ]] temporarily so pipe splitting works correctly
  const placeholders = [];
  let cleaned = parts;

  // Replace {{...}} first
  cleaned = cleaned.replace(/\{\{[^}]*\}\}/g, (m) => {
    placeholders.push(m);
    return `__PH_${placeholders.length - 1}__`;
  });

  // Replace [[...]] (these can contain pipes)
  cleaned = cleaned.replace(/\[\[[^\]]*\]\]/g, (m) => {
    placeholders.push(m);
    return `__PH_${placeholders.length - 1}__`;
  });

  const segments = cleaned.split('|');

  const restore = (s) =>
    s.replace(/__PH_(\d+)__/g, (_, i) => placeholders[parseInt(i)]);

  const name = cleanWikiMarkup(restore(segments[0]));
  const description = cleanWikiMarkup(restore(segments[1]));

  // Parse key=value pairs from remaining segments
  const kv = {};
  for (let i = 2; i < segments.length; i++) {
    const eqIdx = segments[i].indexOf('=');
    if (eqIdx !== -1) {
      const key = segments[i].slice(0, eqIdx).trim();
      const val = restore(segments[i].slice(eqIdx + 1).trim());
      kv[key] = val;
    }
  }

  const tierRaw = (kv.tier || '').toLowerCase();
  const tier = capitalize(tierRaw);
  const points = TIER_POINTS[tierRaw] || 0;
  const region = kv.region || 'General';
  const skills = cleanWikiMarkup(kv.s || '');

  tasks.push({ id, name, description, tier, points, region, skills });
  id++;
}

// Generate SQL
const sqlLines = [];
sqlLines.push('-- Pact tasks for Demonic Pacts League');
sqlLines.push('-- Generated on ' + new Date().toISOString().split('T')[0]);
sqlLines.push('-- Total tasks: ' + tasks.length);
sqlLines.push('');
sqlLines.push(
  "INSERT INTO official_tasks (id, name, description, tier, points, region, skills, league, is_pact_task) VALUES"
);

const valueLines = tasks.map((t, i) => {
  const comma = i < tasks.length - 1 ? ',' : '';
  return "  (" + t.id + ", '" + escapeSql(t.name) + "', '" + escapeSql(t.description) + "', '" + escapeSql(t.tier) + "', " + t.points + ", '" + escapeSql(t.region) + "', '" + escapeSql(t.skills) + "', 'demonic', true)" + comma;
});

sqlLines.push(...valueLines);
sqlLines.push('ON CONFLICT (id) DO NOTHING;');

console.log(sqlLines.join('\n'));
