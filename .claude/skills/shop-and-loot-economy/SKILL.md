---
name: shop-and-loot-economy
description: Use when reviewing LumenForge prices, crafting, loot or skill costs as a whole, to find healing and gear priced off the curve, crafting that loses or prints money, skills priced off their tier, and gear players cannot afford when it unlocks.
---

# Shop and loot economy check

Looks at the money side of the game: what things cost in Gil and Lumens, what crafting is worth, and whether a player can afford what unlocks. Weapons have their own skill (`weapon-value-check`); this one covers everything else. **Report only. Never edit game data or code unless the user asks.**

## Steps

1. From the repo root, run `node .claude/skills/shop-and-loot-economy/check.mjs` (add `--all` to list everything). It only reads `data/json/`.
2. The report has five parts:
   - **Healing and Stamina per Gil**, with outliers.
   - **Gear priced away from its neighbours**: armour, accessories and off-hands.
   - **Crafting that loses money or prints it**: material cost compared with the item's value.
   - **Skill prices**: Lumen ranges per tier, plus skills priced far off their tier.
   - **Can players afford what unlocks?**: compared with the app's own Gil-per-level guideline for premade characters.
3. Read the flagged items' text before reporting. A dear item may have a big extra the score misses, such as a scroll that also cures poison. Say so when that's the case.
4. Report in plain English: what a player would notice, why it matters, and one fix each.

## Rules

- The GM decides how much Gil and how many Lumens players earn. The affordability section is a guideline check, not a rule. Never suggest the GM sending money into a player's app.
- Instruments (lute, drum and so on) are valued for their Musician perks, which the score cannot see. Treat instrument flags with care.
- No network calls, no installs.

See `reference.md` for the formulas.
