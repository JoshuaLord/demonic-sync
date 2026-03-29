-- Create official_relics table
CREATE TABLE IF NOT EXISTS official_relics (
  id SERIAL PRIMARY KEY,
  tier INTEGER NOT NULL CHECK (tier >= 1 AND tier <= 8),
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tier, display_order)
);

CREATE INDEX idx_official_relics_tier ON official_relics(tier);

-- Create official_regions table
CREATE TABLE IF NOT EXISTS official_regions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_official_regions_display_order ON official_regions(display_order);

-- Enable RLS (public read-only)
ALTER TABLE official_relics ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read official relics"
  ON official_relics FOR SELECT USING (true);

CREATE POLICY "Anyone can read official regions"
  ON official_regions FOR SELECT USING (true);

-- Seed Tier 1 relics (known from wiki.source)
INSERT INTO official_relics (tier, name, description, display_order) VALUES
  (1, 'Endless Harvest', 'Gather resources without depleting them', 1),
  (1, 'Barbarian Gathering', 'Enhanced gathering with Barbarian Training benefits', 2),
  (1, 'Abundance', 'Receive additional resources when gathering', 3);

-- Seed Tiers 2-6 with placeholder relics (3 each)
INSERT INTO official_relics (tier, name, description, display_order) VALUES
  (2, 'TBA - Relic 1', 'To be announced', 1),
  (2, 'TBA - Relic 2', 'To be announced', 2),
  (2, 'TBA - Relic 3', 'To be announced', 3),
  (3, 'TBA - Relic 1', 'To be announced', 1),
  (3, 'TBA - Relic 2', 'To be announced', 2),
  (3, 'TBA - Relic 3', 'To be announced', 3),
  (4, 'TBA - Relic 1', 'To be announced', 1),
  (4, 'TBA - Relic 2', 'To be announced', 2),
  (4, 'TBA - Relic 3', 'To be announced', 3),
  (5, 'TBA - Relic 1', 'To be announced', 1),
  (5, 'TBA - Relic 2', 'To be announced', 2),
  (5, 'TBA - Relic 3', 'To be announced', 3),
  (6, 'TBA - Relic 1', 'To be announced', 1),
  (6, 'TBA - Relic 2', 'To be announced', 2),
  (6, 'TBA - Relic 3', 'To be announced', 3);

-- Seed Tier 7 with placeholder relics (2 relics only)
INSERT INTO official_relics (tier, name, description, display_order) VALUES
  (7, 'TBA - Relic 1', 'To be announced', 1),
  (7, 'TBA - Relic 2', 'To be announced', 2);

-- Seed Tier 8 with placeholder relics (3 relics)
INSERT INTO official_relics (tier, name, description, display_order) VALUES
  (8, 'TBA - Relic 1', 'To be announced', 1),
  (8, 'TBA - Relic 2', 'To be announced', 2),
  (8, 'TBA - Relic 3', 'To be announced', 3);

-- Seed 8 unlockable regions
INSERT INTO official_regions (name, display_order) VALUES
  ('Asgarnia', 1),
  ('Fremennik', 2),
  ('Kandarin', 3),
  ('Desert', 4),
  ('Morytania', 5),
  ('Tirannwn', 6),
  ('Wilderness', 7),
  ('Kourend', 8);

-- Add milestone_selections JSONB column to rooms table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'milestone_selections'
  ) THEN
    ALTER TABLE rooms ADD COLUMN milestone_selections JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
