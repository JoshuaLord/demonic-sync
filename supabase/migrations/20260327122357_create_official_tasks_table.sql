-- Create official_tasks table for OSRS Leagues task data
CREATE TABLE IF NOT EXISTS official_tasks (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL CHECK (points IN (10, 40, 80, 200, 400)),
  tier TEXT NOT NULL CHECK (tier IN ('Easy', 'Medium', 'Hard', 'Elite', 'Master')),
  region TEXT NOT NULL,
  skill TEXT,
  category TEXT,
  completion_percent NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX idx_official_tasks_region ON official_tasks(region);
CREATE INDEX idx_official_tasks_tier ON official_tasks(tier);
CREATE INDEX idx_official_tasks_skill ON official_tasks(skill);
CREATE INDEX idx_official_tasks_points ON official_tasks(points);
CREATE INDEX idx_official_tasks_name ON official_tasks USING gin(to_tsvector('english', name));

-- Enable RLS (read-only for all users)
ALTER TABLE official_tasks ENABLE ROW LEVEL SECURITY;

-- Allow all users to read official tasks
CREATE POLICY "Anyone can read official tasks"
  ON official_tasks
  FOR SELECT
  USING (true);
