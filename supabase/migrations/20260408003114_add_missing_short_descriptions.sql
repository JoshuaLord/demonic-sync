-- Add missing short descriptions for relics

-- Tier 3
UPDATE official_relics SET short_description = 'Teleport to agility shortcuts anywhere'
WHERE tier = 3 AND name = 'Map of Alacrity';

-- Tier 4
UPDATE official_relics SET short_description = 'Easier clues with teleports and better rewards'
WHERE tier = 4 AND name = 'Conniving Clues';

UPDATE official_relics SET short_description = 'Demon butler gathers and processes resources passively'
WHERE tier = 4 AND name = 'Butler''s Bell';

-- Tier 5
UPDATE official_relics SET short_description = 'Convert bones and crops into soul shards for Prayer/RC'
WHERE tier = 5 AND name = 'Soul Harvest';

-- Tier 6
UPDATE official_relics SET short_description = 'Choose slayer tasks and get buffed superiors'
WHERE tier = 6 AND name = 'Culling Spree';
