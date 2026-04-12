-- Add missing relics and fix display_order to match wiki

-- First, update display_order for existing relics that need to shift
-- We need to do this carefully to avoid violating unique constraint on (tier, display_order)
-- Strategy: Move to temporary high values first, then set final values

-- Tier 3: Move existing relics to temp values first
UPDATE official_relics SET display_order = 100 WHERE tier = 3 AND name = 'Evil Eye';
UPDATE official_relics SET display_order = 101 WHERE tier = 3 AND name = 'Map of Alacrity';

-- Tier 6: Move to temp value
UPDATE official_relics SET display_order = 100 WHERE tier = 6 AND name = 'Culling Spree';

-- Tier 7: Move to temp value
UPDATE official_relics SET display_order = 100 WHERE tier = 7 AND name = 'Reloaded';

-- Tier 8: Move to temp values
UPDATE official_relics SET display_order = 100 WHERE tier = 8 AND name = 'Minion';
UPDATE official_relics SET display_order = 101 WHERE tier = 8 AND name = 'Flask of Fervour';

-- Insert missing relics
-- Tier 3: Bank Heist
INSERT INTO official_relics (tier, name, description, short_description, display_order, icon_url)
VALUES (
  3,
  'Bank Heist',
  E'Grants the banker''s briefcase\n\nThe briefcase will allow you to teleport to any bank, bank chest, or deposit box.\n• The briefcase ignores wilderness teleport restrictions.\n• The briefcase cannot be used to teleport to an area you haven''t unlocked.\n\nThe briefcase can be retrieved from the Leagues Tutor in Yama''s Lair if lost.',
  'Teleport to any bank, chest, or deposit box',
  1,
  'https://oldschool.runescape.wiki/images/Bank_Heist_%28Demonic_Pacts_League%29.png'
);

-- Tier 6: Eternal Sustenance
INSERT INTO official_relics (tier, name, description, short_description, display_order, icon_url)
VALUES (
  6,
  'Eternal Sustenance',
  'Food is no longer consumed when eaten.',
  'Food is never consumed',
  2,
  'https://oldschool.runescape.wiki/images/Eternal_Sustenance_%28Demonic_Pacts_League%29.png'
);

-- Tier 7: Flow State
INSERT INTO official_relics (tier, name, description, short_description, display_order, icon_url)
VALUES (
  7,
  'Flow State',
  E'The following all occur at a rate of 2 ticks (1.2 seconds):\n\n• Mining, Woodcutting, Fishing, Cooking, Firemaking (any logs or adding to a bonfire), offering bones at a prayer altar, Fletching, Smelting, Crafting, Farming, Magic\n• Minigame interactions are included as well (Wintertodt, Tempoross, and stealing valuables)\n\nThis effect stacks with the fletching knife and diabolical worms.',
  'All gathering and processing skills at 2-tick speed',
  1,
  'https://oldschool.runescape.wiki/images/Flow_State_%28Demonic_Pacts_League%29.png'
);

-- Tier 8: Executioner
INSERT INTO official_relics (tier, name, description, short_description, display_order, icon_url)
VALUES (
  8,
  'Executioner',
  E'Grants the Sage''s Axe, a thrown ranged weapon which can be used to execute targets below 20% hitpoints.\n\n• The axe has an attack range of 6 tiles.\n• The axe''s damage respects any ranged damage reduction effects and immunities the target has.\n• The axe will not work against Yama.\n• Throwing the axe doesn''t consume it, but the primary hit does trigger regeneration effects from Demonic Pacts.\n• Execute damage can hit additional targets with Demonic Pacts.\n• This perk will also work inside The Gauntlet.\n\nThe Sage''s Axe can be retrieved from the Leagues tutor in Yama''s lair if lost.',
  'Execute enemies below 20% HP with thrown axe',
  1,
  'https://oldschool.runescape.wiki/images/Executioner_%28Demonic_Pacts_League%29.png'
);

-- Finally, set the correct final display_order values for the shifted relics
-- Tier 3
UPDATE official_relics SET display_order = 2 WHERE tier = 3 AND name = 'Evil Eye';
UPDATE official_relics SET display_order = 3 WHERE tier = 3 AND name = 'Map of Alacrity';

-- Tier 6
UPDATE official_relics SET display_order = 3 WHERE tier = 6 AND name = 'Culling Spree';

-- Tier 7
UPDATE official_relics SET display_order = 2 WHERE tier = 7 AND name = 'Reloaded';

-- Tier 8
UPDATE official_relics SET display_order = 2 WHERE tier = 8 AND name = 'Minion';
UPDATE official_relics SET display_order = 3 WHERE tier = 8 AND name = 'Flask of Fervour';
