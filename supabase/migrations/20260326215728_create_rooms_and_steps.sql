-- Create rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Untitled Route',
  admin_key TEXT NOT NULL UNIQUE,
  player_names JSONB NOT NULL DEFAULT '{"p1": "Player 1"}'::jsonb,
  milestone_selections JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create route_steps table
CREATE TABLE route_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('task', 'custom')),
  task_id INTEGER,
  custom_text TEXT,
  player_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE (room_id, step_order)
);

-- Create indexes
CREATE INDEX idx_route_steps_room_order ON route_steps(room_id, step_order);
CREATE INDEX idx_rooms_admin_key ON rooms(admin_key);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_steps ENABLE ROW LEVEL SECURITY;

-- Public read access for everyone
CREATE POLICY "Public read access" ON rooms
  FOR SELECT USING (true);

CREATE POLICY "Public read access" ON route_steps
  FOR SELECT USING (true);

-- For now, allow all writes (we'll add admin key validation later)
CREATE POLICY "Allow all writes" ON rooms
  FOR ALL USING (true);

CREATE POLICY "Allow all writes" ON route_steps
  FOR ALL USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE route_steps;
