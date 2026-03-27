// Generate seed.sql from task JSON data
const fs = require('fs');

// Tier to points mapping
const TIER_POINTS = {
  1: 10,   // Easy
  2: 40,   // Medium
  3: 80,   // Hard
  4: 200,  // Elite
  5: 400,  // Master
};

// Region name mappings
const REGION_MAP = {
  'Fremennik Province': 'Fremennik',
  'Fremennik Provinces': 'Fremennik',
  'Kharidian Desert': 'Desert',
  'Kourend & Kebos': 'Kourend',
};

console.log('Reading task data...');
const tasksPath = '../../full-task-scraper/generated/league-5-raging-echoes/LEAGUE_5.full.json';
const rawData = fs.readFileSync(tasksPath, 'utf-8');
const tasks = JSON.parse(rawData);

console.log(`Found ${tasks.length} tasks to process`);

// Generate SQL INSERT statements
let sql = '-- Seed data for official_tasks\n';
sql += '-- Auto-generated from LEAGUE_5.full.json\n\n';

// Process in batches for readability
const batchSize = 50;
for (let i = 0; i < tasks.length; i += batchSize) {
  const batch = tasks.slice(i, i + batchSize);

  sql += `-- Batch ${Math.floor(i / batchSize) + 1}\n`;
  sql += 'INSERT INTO official_tasks (id, name, description, points, tier, region, skill) VALUES\n';

  const values = batch.map((task, idx) => {
    const id = task.structId;
    const name = task.name.replace(/'/g, "''"); // Escape quotes
    const description = task.description ? task.description.replace(/'/g, "''") : null;
    const points = TIER_POINTS[task.tier] || 10;
    const tier = task.tierName;
    const region = REGION_MAP[task.area] || task.area;
    const skill = task.skill || 'All';

    return `  (${id}, '${name}', ${description ? `'${description}'` : 'NULL'}, ${points}, '${tier}', '${region}', '${skill}')`;
  });

  sql += values.join(',\n');
  sql += '\nON CONFLICT (id) DO NOTHING;\n\n';
}

// Write to seed.sql
const outputPath = '../supabase/seed.sql';
fs.writeFileSync(outputPath, sql);

console.log(`✅ Generated ${outputPath} with ${tasks.length} tasks`);
