-- Create a simple test table
CREATE TABLE test_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (but allow all for now)
ALTER TABLE test_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON test_messages
  FOR ALL USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE test_messages;
