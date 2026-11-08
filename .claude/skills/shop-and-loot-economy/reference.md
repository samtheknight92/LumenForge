# Shop and loot economy: formulas

- **Currency**: 1 gold = 2,500 Gil, 1 silver = 100 Gil (the app shows Gil).
- **Healing per Gil**: Gil ÷ points restored, for one-off restores ("Restores 25 HP"). Per-turn restores are skipped. Flag at 5x or 1/5 of the median.
- **Gear value**: stats priced like the Stats tab (HP 3, Stamina 4, Accuracy 8, Strength / Magic Power / Defences 10, Speed 12), plus 15 per perk. Compared within one slot and rarity (3+ items). Flag at 1.8x or 0.5x the median Gil per point.
- **Crafting**: sum of each material's price × quantity (prices from items, monster loot, discoverable items and crafted items). Flag when the item is worth less than its materials, or more than 6x.
- **Skill prices**: the standard prices are Tier 1 8, Tier 2 20, Tier 3 40, Tier 4 65, Tier 5 100 Lumens (the game's own price floor). Flag below the floor, or above 2.5x. Playable-race trees use their own 5/10/15/20/25 ladder and are summarised, not listed. Ascension and Ultimate skills are skipped.
- **Affordability**: the premade generator's guideline is 2,400 Gil to start plus 200 Gil per level. Shop unlock levels: common 0, uncommon 5, rare 12, epic 20, legendary 35. The check compares median gear price per rarity with Gil earned by the unlock level.
