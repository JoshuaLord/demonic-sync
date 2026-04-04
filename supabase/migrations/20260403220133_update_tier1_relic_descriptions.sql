-- Update Tier 1 relics with full detailed descriptions from wiki source

UPDATE official_relics SET
  description = '• Toggleable effect: All resources gathered will be sent to the bank
• You can endlessly gather from fishing spots, trees, and mining rocks even if they deplete after your initial interaction
• Resources gathered from Fishing, Woodcutting, and Mining are multiplied by 2
• XP is granted for all additional resources gathered'
WHERE tier = 1 AND name = 'Endless Harvest';

UPDATE official_relics SET
  description = '• Grants the knapsack
  - Up to 3 different types of gathered items (wood, fish, metallic ore and coal) can be placed in the knapsack, which has a total maximum capacity of 140
  - Toggleable effect: dispose option will ask what to destroy
  - The knapsack can be retrieved from the Leagues Tutor in Yama''s lair if lost

• You become capable of chopping wood, mining rocks and fishing with your bare hands without requiring any tools or bait
  - Your hands are equivalent to the crystal version of the respective tools where those exist

• Whenever you gain Fishing, Woodcutting or Mining XP while gathering you will also receive an additional 10% XP in both Strength and Agility

• On failing to mine a rock, catch a fish or chop a tree you will have a separate 50% chance to succeed instead'
WHERE tier = 1 AND name = 'Barbarian Gathering';

UPDATE official_relics SET
  description = '• Toggleable effect: Coins generated will be put into your inventory
• All non-combat skills are permanently boosted by 10
• Every time you receive an XP drop, gain an additional 2 XP in the same skill. This is affected by the league passive XP modifier
• For every XP gained, gain 2x as many coins. These can go either to your bank or inventory if there is room, which can be toggled above'
WHERE tier = 1 AND name = 'Abundance';
