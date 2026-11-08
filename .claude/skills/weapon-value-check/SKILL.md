---
name: weapon-value-check
description: Use when reviewing LumenForge weapon prices or stats, or after adding or editing a weapon, to flag weapons that are much cheaper or dearer than their neighbours of the same rarity and kind.
---

# Weapon value check

Checks every shop weapon's damage, stat bonuses, perks and enchant slots against its price, and flags the ones that are out of line with their neighbours. **Report only. Never edit game data or code unless the user asks.**

## Steps

1. From the repo root, run `node .claude/skills/weapon-value-check/check.mjs`. It only reads `data/json/items.json`. If that file looks stale, say so (it is rebuilt from `data/items-data.js` by `npm run build-data`); do not rebuild it yourself.
2. Read the report. It has five parts: the value table, price-vs-value flags, damage dice outliers, price ladder breaks, rarity ladder breaks, and gaps.
3. Before passing on a flag, open the weapon's text and its perk in `data/json/effects.json`. The score counts every perk as equal, so a flag can be explained by a very strong or very weak perk. Say so when that is the case.
4. Report to the user in plain English, grouped by weapon. For each flag give:
   - **What**: the weapon and what looks off.
   - **Why it matters**: what a player would notice (for example "nobody buys the Demon Axe because the cheaper Berserker Axe hits harder").
   - **Suggested fix**: a price, or a stat/damage change. One fix, not a menu.
5. End with a one-line summary: how many weapons checked, how many flagged.

## Rules

- Prices are shown in Gil, as the app shows them.
- "Tier" for weapons means rarity (common, uncommon, rare, epic, legendary). Kind is sword, axe, dagger, polearm, hammer, staff or ranged.
- A flag is a question for the designer, not a verdict. Weapons can be deliberately cheap (a starter) or dear (a prestige item); say so when the name or text suggests it.
- No network calls, no installs.

See `reference.md` for how the score is worked out and the thresholds.
