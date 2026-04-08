-- Update Tier 1 relics with images (already have names/descriptions)
UPDATE official_relics SET icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Endless_Harvest_(Demonic_Pacts_League).png'
WHERE tier = 1 AND display_order = 1;

UPDATE official_relics SET icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Barbarian_Gathering_(Demonic_Pacts_League).png'
WHERE tier = 1 AND display_order = 2;

UPDATE official_relics SET icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Abundance_(Demonic_Pacts_League).png'
WHERE tier = 1 AND display_order = 3;

-- Update Tier 2 relics
UPDATE official_relics SET
  name = 'Hotfoot',
  description = 'Auto-cook fish, auto-smelt ore, gain Agility XP while running. Searing boots grant 100% success on Agility/Cooking.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Hotfoot_(Demonic_Pacts_League).png'
WHERE tier = 2 AND display_order = 1;

UPDATE official_relics SET
  name = 'Friendly Forager',
  description = 'Find random herbs while gathering. All Herblore processing at once, 90% chance to save secondaries, 4-dose potions.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Friendly_Forager_(Demonic_Pacts_League).png'
WHERE tier = 2 AND display_order = 2;

UPDATE official_relics SET
  name = 'Woodsman',
  description = 'Auto-burn logs while Woodcutting. 100% Hunter success, faster/double Hunter traps, all Fletching at once.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Woodsman_(Demonic_Pacts_League).png'
WHERE tier = 2 AND display_order = 3;

-- Update Tier 3 relics (only 2 relics in this tier)
UPDATE official_relics SET
  name = 'Evil Eye',
  description = 'Teleport to any boss or raid entrance in the combat achievements list. Ignores wilderness restrictions.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Evil_Eye_(Demonic_Pacts_League).png'
WHERE tier = 3 AND display_order = 1;

UPDATE official_relics SET
  name = 'Map of Alacrity',
  description = 'Teleport to agility shortcuts. Ignores wilderness restrictions.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Map_of_Alacrity_(Demonic_Pacts_League).png'
WHERE tier = 3 AND display_order = 2;

-- Delete extra Tier 3 placeholder (only 2 relics exist)
DELETE FROM official_relics WHERE tier = 3 AND display_order = 3;

-- Update Tier 4 relics
UPDATE official_relics SET
  name = 'Transmutation',
  description = 'Transform resources into higher/lower tiers. High/Low alchemy become upgrade/downgrade spells. Infinite nature runes.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Transmutation_(Demonic_Pacts_League).png'
WHERE tier = 4 AND display_order = 1;

UPDATE official_relics SET
  name = 'Conniving Clues',
  description = 'Clue teleport contracts, 1/4 chance for clue from caskets, 10x more clue vessels, minimum steps with max rewards.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Conniving_Clues_(Demonic_Pacts_League).png'
WHERE tier = 4 AND display_order = 2;

UPDATE official_relics SET
  name = 'Butler''s Bell',
  description = 'Summon demon butler to gather/process resources passively (works offline). Shares XP with you.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Butler''s_Bell_(Demonic_Pacts_League).png'
WHERE tier = 4 AND display_order = 3;

-- Update Tier 5 relics
UPDATE official_relics SET
  name = 'Nature''s Accord',
  description = 'Teleport to fairy rings, spirit trees, tool leprechauns. 10x Farming yield, plants never die, no Farming level requirements.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Nature''s_Accord_(Demonic_Pacts_League).png'
WHERE tier = 5 AND display_order = 1;

UPDATE official_relics SET
  name = 'Larcenist',
  description = '100% Thieving success, auto-repickpocket, noted loot, 10x Thieving loot, stalls never deplete.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Larcenist_(Demonic_Pacts_League).png'
WHERE tier = 5 AND display_order = 2;

UPDATE official_relics SET
  name = 'Soul Harvest',
  description = 'Convert bones/ashes and farming crops into soul shards. Use shards for Runecraft or Prayer training.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Soul_Harvest_(Demonic_Pacts_League).png'
WHERE tier = 5 AND display_order = 3;

-- Update Tier 6 relics (only 2 relics in this tier)
UPDATE official_relics SET
  name = 'Grimoire',
  description = 'Freely swap spellbooks, acts as Book of the Dead. Unlocks all prayers and spells regardless of requirements.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Grimoire_(Demonic_Pacts_League).png'
WHERE tier = 6 AND display_order = 1;

UPDATE official_relics SET
  name = 'Culling Spree',
  description = 'Choose slayer tasks from 3 choices, pick task count (5-200), 50% superior spawn chance, free slayer perks.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Culling_Spree_(Demonic_Pacts_League).png'
WHERE tier = 6 AND display_order = 2;

-- Delete extra Tier 6 placeholder (only 2 relics exist)
DELETE FROM official_relics WHERE tier = 6 AND display_order = 3;

-- Update Tier 7 relic (only 1 relic in this tier)
UPDATE official_relics SET
  name = 'Reloaded',
  description = 'Choose another relic from any tier below this one.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Reloaded_(Demonic_Pacts_League).png'
WHERE tier = 7 AND display_order = 1;

-- Delete extra Tier 7 placeholder (only 1 relic exists)
DELETE FROM official_relics WHERE tier = 7 AND display_order = 2;

-- Update Tier 8 relics (only 2 relics in this tier)
UPDATE official_relics SET
  name = 'Minion',
  description = 'Summon powerful minion for 30 minutes. Auto-loots items, deals AoE damage, can be buffed with Zamorak items.',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Minion_(Demonic_Pacts_League).png'
WHERE tier = 8 AND display_order = 1;

UPDATE official_relics SET
  name = 'Flask of Fervour',
  description = 'Restore HP/Prayer/Special attack to full. Trigger 3 explosions, take no damage for 2.4s. 3min cooldown (reduced by damage dealt).',
  icon_url = 'https://oldschool.runescape.wiki/w/Special:FilePath/Flask_of_Fervour_(Demonic_Pacts_League).png'
WHERE tier = 8 AND display_order = 2;

-- Delete extra Tier 8 placeholder (only 2 relics exist)
DELETE FROM official_relics WHERE tier = 8 AND display_order = 3;
