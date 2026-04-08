-- Fix incorrect short descriptions for Transmutation and Grimoire

-- Tier 4 - Transmutation had Conniving Clues' description
UPDATE official_relics SET short_description = 'Transform resources up/down tiers with infinite nature runes'
WHERE tier = 4 AND name = 'Transmutation';

-- Tier 6 - Grimoire had Culling Spree's description
UPDATE official_relics SET short_description = 'Swap spellbooks freely and unlock all prayers/spells'
WHERE tier = 6 AND name = 'Grimoire';
