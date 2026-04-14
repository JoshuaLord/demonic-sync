#!/usr/bin/env node

/**
 * Scrapes all Demonic Pacts League tasks from the OSRS Wiki
 * and generates a SQL migration to seed the official_tasks table.
 *
 * Usage: node scripts/scrape-demonic-tasks.js > migration.sql
 *
 * Wiki IDs are offset by 100000 to avoid conflicts with echoes tasks (IDs 739-5970).
 * Old synthetic pact tasks (IDs 10001-10075) are deleted first.
 */

const ID_OFFSET = 100000;
const WIKI_API =
  'https://oldschool.runescape.wiki/api.php?action=parse&page=Demonic_Pacts_League/Tasks&prop=wikitext&format=json';

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

// Strip wiki markup: [[Link|Text]] -> Text, [[Link]] -> Link, {{SCP|...}} -> empty, {{DPL|...}} -> empty
function cleanWikiMarkup(str) {
  // Remove {{SCP|...}} and {{DPL|...}} templates
  str = str.replace(/\{\{(?:SCP|DPL)\|[^}]*\}\}/g, '');
  // Remove any remaining {{...}} templates
  str = str.replace(/\{\{[^}]*\}\}/g, '');
  // [[Link|Display]] -> Display
  str = str.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2');
  // [[Link]] -> Link
  str = str.replace(/\[\[([^\]]*)\]\]/g, '$1');
  // Clean up extra spaces
  str = str.replace(/\s{2,}/g, ' ').trim();
  // Remove leading/trailing commas, pipes, "or", "and", "one of"
  str = str.replace(/^[\s,|]+/, '').replace(/[\s,|]+$/, '');
  // Remove leftover connectors like "one of , , , or" or "and one of , , or"
  str = str.replace(/^(and\s+)?(one of\s*)?[\s,|]*(or|and)?[\s,|]*$/i, '');
  str = str.trim();
  return str;
}

function parseTaskRow(line) {
  const match = line.match(/\{\{DPLTaskRow\|(.+)\}\}/);
  if (!match) return null;

  const parts = match[1];

  // Replace nested {{ }} and [[ ]] temporarily so pipe splitting works correctly
  const placeholders = [];
  let cleaned = parts;

  // Replace {{...}} first (handle nested by matching innermost)
  cleaned = cleaned.replace(/\{\{[^{}]*\}\}/g, (m) => {
    placeholders.push(m);
    return `__PH_${placeholders.length - 1}__`;
  });
  // Second pass for any remaining
  cleaned = cleaned.replace(/\{\{[^{}]*\}\}/g, (m) => {
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

  const name = cleanWikiMarkup(restore(segments[0])).trim();
  const description = cleanWikiMarkup(restore(segments[1] || '')).trim();

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
  const points = TIER_POINTS[tierRaw];
  if (!points) return null; // Skip tasks with unknown tier

  const region = kv.region || 'General';
  const skill = cleanWikiMarkup(kv.s || '') || null;
  const isPactTask = (kv.pactTask || '').toLowerCase() === 'yes';
  const wikiId = parseInt(kv.id, 10);
  if (isNaN(wikiId)) return null; // Skip tasks without valid ID

  return {
    id: wikiId + ID_OFFSET,
    wikiId,
    name,
    description,
    tier,
    points,
    region,
    skill,
    isPactTask,
  };
}

async function main() {
  console.error('Fetching tasks from OSRS Wiki...');

  const res = await fetch(WIKI_API);
  if (!res.ok) {
    console.error(`Failed to fetch wiki: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const data = await res.json();
  const wikitext = data.parse.wikitext['*'];
  const lines = wikitext.split('\n');

  const tasks = [];
  const seenIds = new Set();

  for (const line of lines) {
    const task = parseTaskRow(line);
    if (!task) continue;
    if (seenIds.has(task.wikiId)) {
      console.error(`Duplicate wiki ID ${task.wikiId}: "${task.name}" (skipping)`);
      continue;
    }
    seenIds.add(task.wikiId);
    tasks.push(task);
  }

  console.error(`Parsed ${tasks.length} tasks`);
  console.error(
    `  Pact tasks: ${tasks.filter((t) => t.isPactTask).length}`
  );
  console.error(
    `  Regular tasks: ${tasks.filter((t) => !t.isPactTask).length}`
  );

  // Stats by tier
  const byTier = {};
  for (const t of tasks) {
    byTier[t.tier] = (byTier[t.tier] || 0) + 1;
  }
  console.error('  By tier:', JSON.stringify(byTier));

  // Stats by region
  const byRegion = {};
  for (const t of tasks) {
    byRegion[t.region] = (byRegion[t.region] || 0) + 1;
  }
  console.error('  By region:', JSON.stringify(byRegion));

  // Generate SQL
  const sql = [];
  sql.push('-- Demonic Pacts League tasks scraped from OSRS Wiki');
  sql.push('-- Generated on ' + new Date().toISOString().split('T')[0]);
  sql.push('-- Total tasks: ' + tasks.length);
  sql.push(`-- ID offset: ${ID_OFFSET} (wiki_id + ${ID_OFFSET})`);
  sql.push('');
  sql.push('-- Temporarily disable RLS so migration role can write');
  sql.push('ALTER TABLE official_tasks DISABLE ROW LEVEL SECURITY;');
  sql.push('ALTER TABLE route_steps DISABLE ROW LEVEL SECURITY;');
  sql.push('');
  sql.push('-- Step 1: Remove any existing demonic tasks with offset IDs (for re-runs)');
  sql.push(
    `DELETE FROM official_tasks WHERE id BETWEEN ${ID_OFFSET} AND ${ID_OFFSET + 99999} AND league = 'demonic';`
  );
  sql.push('');

  // Step 2: Insert new tasks in batches of 50
  sql.push('-- Step 2: Insert all Demonic Pacts League tasks');
  const BATCH_SIZE = 50;
  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE);
    sql.push(
      'INSERT INTO official_tasks (id, name, description, tier, points, region, skill, league, is_pact_task) VALUES'
    );

    const valueLines = batch.map((t, j) => {
      const comma = j < batch.length - 1 ? ',' : ';';
      const skillVal = t.skill ? `'${escapeSql(t.skill)}'` : 'NULL';
      return `  (${t.id}, '${escapeSql(t.name)}', '${escapeSql(t.description)}', '${t.tier}', ${t.points}, '${escapeSql(t.region)}', ${skillVal}, 'demonic', ${t.isPactTask})${comma}`;
    });

    sql.push(...valueLines);
    sql.push('');
  }

  // Step 3: Remap route_steps referencing old synthetic IDs
  sql.push('-- Step 3: Remap route_steps from old synthetic IDs (10001-10075) to new wiki IDs');
  sql.push('UPDATE route_steps rs');
  sql.push('SET task_id = nt.id');
  sql.push('FROM official_tasks nt');
  sql.push("WHERE rs.task_id BETWEEN 10001 AND 10075");
  sql.push("  AND nt.league = 'demonic'");
  sql.push(`  AND nt.id BETWEEN ${ID_OFFSET} AND ${ID_OFFSET + 99999}`);
  sql.push('  AND LOWER(TRIM(rs.task_name)) = LOWER(TRIM(nt.name));');
  sql.push('');

  // Step 4: Delete old synthetic tasks
  sql.push('-- Step 4: Remove old synthetic pact tasks (IDs 10001-10075)');
  sql.push('DELETE FROM official_tasks WHERE id BETWEEN 10001 AND 10075;');
  sql.push('');

  // Step 5: Re-enable RLS
  sql.push('-- Step 5: Re-enable RLS');
  sql.push('ALTER TABLE official_tasks ENABLE ROW LEVEL SECURITY;');
  sql.push('ALTER TABLE route_steps ENABLE ROW LEVEL SECURITY;');
  sql.push('');

  console.log(sql.join('\n'));
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
