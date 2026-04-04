-- Add short_description column for compact display in selection UI
ALTER TABLE official_relics ADD COLUMN IF NOT EXISTS short_description TEXT;

-- Add short descriptions for all relics

-- TIER 1
UPDATE official_relics SET short_description = 'Auto-bank resources and gather endlessly with 2x multiplier' WHERE tier = 1 AND name = 'Endless Harvest';
UPDATE official_relics SET short_description = 'Gather with bare hands, gain Strength & Agility XP, 50% failure retry' WHERE tier = 1 AND name = 'Barbarian Gathering';
UPDATE official_relics SET short_description = '+10 skill boost, 2x XP multiplier, earn coins from XP' WHERE tier = 1 AND name = 'Abundance';

-- TIER 2
UPDATE official_relics SET short_description = 'Auto-cook fish, auto-smelt ore, 100% Agility success, 10x shards' WHERE tier = 2 AND name = 'Hotfoot';
UPDATE official_relics SET short_description = 'Auto-find herbs while gathering, 4-dose potions, process all at once' WHERE tier = 2 AND name = 'Friendly Forager';
UPDATE official_relics SET short_description = 'Auto-burn logs, 100% Hunter success, 2x loot, jarred implings never break' WHERE tier = 2 AND name = 'Woodsman';

-- TIER 3
UPDATE official_relics SET short_description = 'Teleport to any boss or raid entrance in combat achievements' WHERE tier = 3 AND name = 'Evil Eye';

-- TIER 4
UPDATE official_relics SET short_description = 'Clue teleport contracts, 10x vessels, min steps, max rewards' WHERE tier = 4 AND name = 'Conniving Clues';

-- TIER 5
UPDATE official_relics SET short_description = '10x farming yield, plants never die, teleport to fairy rings & leprechauns' WHERE tier = 5 AND name = 'Nature''s Accord';
UPDATE official_relics SET short_description = '100% Thieving success, auto re-pickpocket, 10x loot, noted items' WHERE tier = 5 AND name = 'Larcenist';

-- TIER 6
UPDATE official_relics SET short_description = 'Choose slayer tasks, 50% superior chain spawn, free Slayer helmet (i)' WHERE tier = 6 AND name = 'Culling Spree';

-- TIER 7
UPDATE official_relics SET short_description = 'Choose another relic from any tier below this one' WHERE tier = 7 AND name = 'Reloaded';

-- TIER 8
UPDATE official_relics SET short_description = 'Summon a powerful minion that auto-loots and deals AoE damage' WHERE tier = 8 AND name = 'Minion';
UPDATE official_relics SET short_description = 'Full restore HP/Prayer/Spec, trigger explosions, 3min cooldown' WHERE tier = 8 AND name = 'Flask of Fervour';

-- Add comment
COMMENT ON COLUMN official_relics.short_description IS 'Brief one-line summary for selection UI';
