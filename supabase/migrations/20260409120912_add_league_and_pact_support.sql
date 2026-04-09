-- Add league column (existing tasks default to 'echoes')
ALTER TABLE official_tasks ADD COLUMN league TEXT NOT NULL DEFAULT 'echoes';
ALTER TABLE official_tasks ADD CONSTRAINT official_tasks_league_check CHECK (league IN ('echoes', 'demonic'));

-- Add pact task flag
ALTER TABLE official_tasks ADD COLUMN is_pact_task BOOLEAN NOT NULL DEFAULT false;

-- Add denormalized pact flag to route_steps (needed for display without re-fetch)
ALTER TABLE route_steps ADD COLUMN is_pact_task BOOLEAN NOT NULL DEFAULT false;

-- Indexes
CREATE INDEX idx_official_tasks_league ON official_tasks(league);
CREATE INDEX idx_official_tasks_pact ON official_tasks(is_pact_task) WHERE is_pact_task = true;
