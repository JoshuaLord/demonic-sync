-- Add icon_url column to official_relics table for storing relic images
ALTER TABLE official_relics ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Add comment to column for documentation
COMMENT ON COLUMN official_relics.icon_url IS 'URL to the relic icon image, typically from OSRS Wiki';
