// Import official tasks from scraper JSON into Supabase
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Tier to points mapping
const TIER_POINTS = {
  1: 10,   // Easy
  2: 40,   // Medium
  3: 80,   // Hard
  4: 200,  // Elite
  5: 400,  // Master
};

async function importTasks() {
  console.log('Reading task data...');

  const tasksPath = '../full-task-scraper/generated/league-5-raging-echoes/LEAGUE_5.full.json';
  const rawData = fs.readFileSync(tasksPath, 'utf-8');
  const tasks = JSON.parse(rawData);

  console.log(`Found ${tasks.length} tasks to import`);

  // Transform tasks to match our schema
  const transformedTasks = tasks.map((task) => ({
    id: task.structId,
    name: task.name,
    description: task.description,
    points: TIER_POINTS[task.tier] || 10,
    tier: task.tierName,
    region: task.area,
    skill: task.skill || 'All',
  }));

  // Delete existing tasks
  console.log('Clearing existing tasks...');
  const { error: deleteError } = await supabase
    .from('official_tasks')
    .delete()
    .neq('id', 0); // Delete all

  if (deleteError) {
    console.error('Error clearing tasks:', deleteError);
    return;
  }

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < transformedTasks.length; i += batchSize) {
    const batch = transformedTasks.slice(i, i + batchSize);
    console.log(`Inserting batch ${i / batchSize + 1}/${Math.ceil(transformedTasks.length / batchSize)}...`);

    const { error } = await supabase
      .from('official_tasks')
      .insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      return;
    }
  }

  console.log('✅ Successfully imported all tasks!');
  process.exit(0);
}

importTasks().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
