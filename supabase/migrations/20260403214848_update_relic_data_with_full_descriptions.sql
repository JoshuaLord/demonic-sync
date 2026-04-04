-- Update relics with full descriptions from wiki source
-- This migration updates Tiers 2-8 with actual relic names and detailed descriptions

-- TIER 2 RELICS (3 relics)
UPDATE official_relics SET
  name = 'Hotfoot',
  description = 'Upon choosing this relic you will receive the searing boots.

While the searing boots are worn:
• Agility experience is gained based on your Agility level while you run
• Caught fish are automatically cooked
• Mined ore is automatically smelted

Additionally, regardless of your footwear:
• Picking up termites or a mark of grace from a course will automatically complete the lap granting completion XP and 10,000 coins
• Marks of grace will always have a 33% chance to spawn on all rooftop courses
• Completing a course grants two completion count and 25% bonus experience
• 100% success rate on all actions for Agility and Cooking
• You will receive 2x termites from the Colossal Wyrm Agility Course
• You will receive 10x crystal shards from Prifddinas Agility Course
• The searing boots can be retrieved from the Leagues tutor in Yama''s lair if lost'
WHERE tier = 2 AND display_order = 1;

UPDATE official_relics SET
  name = 'Friendly Forager',
  description = 'Upon choosing this relic you will receive the forager''s pouch.

While the forager''s pouch is worn or in your inventory:
• When you gather resources from Woodcutting, Fishing, Mining, and Hunter, the pouch will find and store a random grimy herb
• This herb is limited to any which your Herblore level + 25 can clean. This action also provides a small amount of Herblore experience
• The pouch will only find herbs it has room to store, but will always attempt to give you a herb you can receive
• The pouch also functions as a silklined herb sack, and shares an inventory with it

Additionally, you gain the following perks to Herblore:
• All items are processed at once
• Secondary ingredients have a 90% chance to not be consumed, this stacks additively with other sources
• Potions created will have 4 doses instead of 3

The forager''s pouch can be retrieved from the Leagues Tutor in Yama''s Lair if lost.'
WHERE tier = 2 AND display_order = 2;

UPDATE official_relics SET
  name = 'Woodsman',
  description = 'Toggleable effects:
• Hunter traps harvest directly to your bank
• Logs chopped will be automatically burned

Passive effects:
• All items are processed at once while Fletching, stackable fletching items are capped at 10x the regular amount per action
• Chopped logs are automatically burned while Woodcutting granting full Firemaking XP, this effect can be toggled above
• 100% success rate on all Hunter actions
• Hunter traps attract animals faster, give double the loot and XP
• Hunter traps always drop a random herb seed or tree seed when harvested
• Hunter rumours give double XP and Hunters loot sacks will award 2x as much loot
• All loot from jarred implings will be doubled and noted. Additionally they will no longer break upon opening
• All Quetzal Whistles will not lose charges'
WHERE tier = 2 AND display_order = 3;

-- TIER 3 RELICS (1 revealed, 2 placeholders remain)
UPDATE official_relics SET
  name = 'Evil Eye',
  description = '• Grants the evil eye
• The eye will allow you to teleport to the entrance of any boss or raid in the combat achievements list
• Barrows will have the option to go to the chest or to the surface
• You can teleport to each Moon of peril individually
• The eye ignores wilderness teleport restrictions
• The eye cannot be used to teleport to an area you haven''t unlocked
• The eye can be retrieved from the Leagues Tutor in Yama''s Lair if lost'
WHERE tier = 3 AND display_order = 1;

-- TIER 4 RELICS (1 revealed, 2 placeholders remain)
UPDATE official_relics SET
  name = 'Conniving Clues',
  description = '• When opening a reward casket, you have a 1/3 chance to receive clue contracts which can be consumed to teleport you to your current clue step
  - Beginner clues give 0-2 contracts at a time
  - Easy clues give 1-4 contracts at a time
  - Medium clues give 1-5 contracts at a time
  - Hard clues give 1-7 contracts at a time
  - Elite clues give 1-9 contracts at a time
  - Master clues give 1-10 contracts at a time
• Rewards caskets have a 1/4 chance to contain a clue scroll box of the same tier
• Clues from creatures and impling jars now have a drop rate of 1/15
• Clue vessels obtained from skilling (such as clue geodes or clue nests) are 10x more likely to drop
• All clues have the lowest possible number of steps, and will give the maximum amount of reward rolls
• Emote and Falo clue steps no longer have item requirements'
WHERE tier = 4 AND display_order = 1;

-- TIER 5 RELICS (2 revealed)
UPDATE official_relics SET
  name = 'Nature''s Accord',
  description = '• Grants the fairy mushroom

Active effects:
• Farming patches and plants no longer have any level requirements to harvest, plant, or make

Additionally, you gain the following perks to Farming:
• You will receive 10x yield from all farming patches and it will automatically be noted
• XP is granted for all additional resources gathered
• Your plants will never die
• You have a 20% chance to not use a seed or sapling when planting crops in patches

• The fairy mushroom will allow you to teleport to any fairy ring, spirit tree, or tool leprechaun
• Unlocking this will autocomplete the Tree Gnome Village quest
• This item ignores wilderness teleport restrictions
• This item cannot be used to teleport to an area you haven''t unlocked
• The fairy mushroom can be retrieved from the Leagues tutor in Yama''s Lair if lost'
WHERE tier = 5 AND display_order = 1;

UPDATE official_relics SET
  name = 'Larcenist',
  description = 'You will gain the following benefits while Thieving:
• 100% success rate on all actions
• Automatically re-pickpocket an NPC
• Automatically re-steal from a stall
• Items obtained from pickpocketing and stalls are noted
• Stalls never deplete and guards will never catch you thieving from them
• The amount of coin pouches you can carry is increased by 10x

Additionally, while Thieving, loot is increased by 10x for the following:
• Pickpocketing (not including clue scrolls)
• Stealing from stalls
• Stealing house valuables in Varlamore'
WHERE tier = 5 AND display_order = 2;

-- TIER 6 RELICS (1 revealed, 2 placeholders remain)
UPDATE official_relics SET
  name = 'Culling Spree',
  description = '• Players may choose their slayer task from a list of 3 choices, with at least 1 boss task if possible
• Task kill count is selectable for all tasks (5-200)
• Superior slayer monsters have a 50% chance of spawning another superior on death
• Superior monsters always drop between 1 and 3 elite clue scrolls
• All effects of a Slayer helmet(i) are gained without needing to wear one
• All slayer reward shop perks are free
• The Rune pouch, Herb sack and Looting bag are purchasable from the slayer reward store'
WHERE tier = 6 AND display_order = 1;

-- TIER 7 RELICS (1 only - delete extra placeholder)
DELETE FROM official_relics WHERE tier = 7 AND display_order = 2;

UPDATE official_relics SET
  name = 'Reloaded',
  description = '• Choose another relic from any tier below this one'
WHERE tier = 7 AND display_order = 1;

-- TIER 8 RELICS (2 revealed, 1 placeholder remains)
UPDATE official_relics SET
  name = 'Minion',
  description = '• Grants the minion whistle
• The whistle will allow you to summon a powerful minion which lasts for 30 minutes
• When you are in multi-combat it will cast an AoE attack if the target is weakest to range or magic

The minion''s stats are:
• Min hit: 3
• Max hit: 10
• Attack speed: 1.8
• Accuracy: 45,000

• The whistle can consume up to 5 unique equippable Zamorak items by using them on the whistle, increasing your minion''s max hit by 2 per unique item
• The minion will try to automatically loot items from creatures you kill (including fired ranged ammo). A minimum value threshold and whether or not these should be noted is configurable on the whistle
• The minion will deal damage to targets which are immune to thralls
• The minion will not fight in PvP and will not fight against Yama
• The minion whistle can be retrieved from the Leagues Tutor in Yama''s Lair if lost'
WHERE tier = 8 AND display_order = 1;

UPDATE official_relics SET
  name = 'Flask of Fervour',
  description = '• Grants the flask of fervour

When the Flask is consumed:
• Your Hitpoints will be restored to full
• Your prayer points will be restored to full
• Your special attack energy will be restored to full

Over the next 2.4 seconds the sigil will:
• Trigger three explosions which deal 60% of your base Prayer level (30% in PvP) to all enemies within 3 tiles of you as typeless damage
• Reduce all damage you take to 0
• Not deal damage to Yama

This item has a base cooldown of 3 minutes:
• For every 10 damage you deal in a single hit, reduce the cooldown by 0.6s

The flask of fervour can be retrieved from the Leagues Tutor in Yama''s Lair if lost.'
WHERE tier = 8 AND display_order = 2;
