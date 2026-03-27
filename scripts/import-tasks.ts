import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(__dirname, '../.env.local') });

// Tier to points mapping
const TIER_TO_POINTS: Record<number, number> = {
  1: 10,
  2: 40,
  3: 80,
  4: 200,
  5: 400,
};

interface LeagueTask {
  structId: number;
  sortId: number;
  name: string;
  description: string;
  area: string;
  category: string;
  skill: string | null;
  tier: number;
  tierName: string;
  completionPercent?: number;
}

async function importTasks() {
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read League 5 task data
  const tasksPath = path.join(
    __dirname,
    '../../full-task-scraper/generated/league-5-raging-echoes/LEAGUE_5.full.json'
  );

  console.log('Reading tasks from:', tasksPath);
  const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf-8')) as LeagueTask[];
  console.log(`Found ${tasksData.length} tasks`);

  // Transform tasks for database
  const tasksForDb = tasksData.map((task) => ({
    id: task.sortId,
    name: task.name,
    description: task.description || null,
    points: TIER_TO_POINTS[task.tier],
    tier: task.tierName,
    region: task.area,
    skill: task.skill || null,
    category: task.category || null,
    completion_percent: task.completionPercent || null,
  }));

  // Insert in batches (Supabase has a limit)
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < tasksForDb.length; i += BATCH_SIZE) {
    const batch = tasksForDb.slice(i, i + BATCH_SIZE);

    console.log(`Inserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tasksForDb.length / BATCH_SIZE)}...`);

    const { error } = await supabase
      .from('official_tasks')
      .insert(batch);

    if (error) {
      console.error('Error inserting batch:', error);
      process.exit(1);
    }

    inserted += batch.length;
    console.log(`Inserted ${inserted}/${tasksForDb.length} tasks`);
  }

  console.log('\n✅ Successfully imported all tasks!');
  console.log(`Total tasks: ${tasksForDb.length}`);

  // Show some stats
  const tierCounts = tasksForDb.reduce((acc, task) => {
    acc[task.tier] = (acc[task.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\nTasks by tier:');
  Object.entries(tierCounts).forEach(([tier, count]) => {
    console.log(`  ${tier}: ${count}`);
  });
}

importTasks().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
