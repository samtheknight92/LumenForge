# Skill tree balance: how it works

## Kind (from the start of the description)

Passive / Aura = passive. Toggle = toggle. Craft / Enchant = crafting. Everything else (Action, Spell, Reaction, Ultimate…) = active.

## Role (first match wins)

| Role | How it is spotted |
|---|---|
| crafting | kind is crafting |
| damage | text has an attack roll, "save or take", "each takes XdY", or applies Burn/Poison/Bleeding |
| healing | heals, restores or regains HP |
| control | applies a control status to enemies (Immobilized, Incapacitated, Fear, Charm, Mind Controlled, Knockdown, Blinded, Silenced, Weakened, Exhausted) or "save or…/difficult terrain/held" |
| support | helps allies or yourself: +Defence, shield, barrier, resist, immune, grants allies a bonus |
| utility | anything else (movement, senses, light, water breathing…) |

## Power (active skills only)

- **Damage** = average of the first dice in the text (2d6 = 7), +5.5 if it adds weapon/bite/claw damage, +2 if it adds Strength or Magic Power, times targets, plus 0.75 x control.
- **Targets**: "fire 2 shots", "four attacks", "eight cuts" etc. = that number (max 4). Area words (per creature, each enemy, radius, burst, cone, line, area) = 2.5. Otherwise 1.
- **Healing** = average healing, x2.5 if it heals all/each ally.
- **Control** = sum of (chance x turns) for each control status, x targets.

## Thresholds

- Tier peers: same tier, role, single vs multi target, and normal vs capstone (Ascension and Ultimate are only compared with each other). Groups under 4 skills are skipped. Flag at 2x the group median or more, or 0.45x or less.
- Weaker upgrade: same tree, same role, higher tier, under 90% of the parent's power.
- Role change: damage ↔ healing/support, both active. Passive/toggle follow-ons (Attunements, Masteries) are listed separately as lower priority.

## Skill ranks (from the app's rank rules)

Every rank above 1 adds +1 damage, +1d6 at Ranks 3, 6 and 9, +5% status chance (max 95%), −1 Stamina from Rank 5, free at Rank 10. Healing, support and utility skills get no healing or support boost from ranks, so a support player pays the same Lumens for less. A fair fix would be role-based rank bonuses (for example +1 healing per rank for healers, +1 turn of duration for buffs).

## Known limits

The role and power are read from the wording, so unusual wording can fool them. Always read the skill before reporting it.
