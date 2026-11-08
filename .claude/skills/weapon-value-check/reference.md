# Weapon value check: how the score works

## Value points

Each weapon gets a score, built from what the game already charges for things:

| Part | Points | Why |
|---|---|---|
| Average damage of the dice | x10 per point | 1 Strength adds 1 damage and costs 10 Lumens on the Stats tab, so 1 damage is worth about 1 Strength |
| Stat bonuses | Lumen price of that stat's first point: HP 3, Stamina 4, Accuracy 8, Strength 10, Magic Power 10, Physical/Magical Defence 10, Speed 12 | Same prices players pay on the Stats tab. Negative stats subtract |
| Each special perk | Its own value from `perk-values.json` (8 to 55) | A perk that adds +1d6 on every hit is worth as much as 3.5 Strength; a perk that only works against undead is worth much less. Each value has a one-line reason in the file. A perk and its twin (burn + burn_on_hit) count once |
| Each enchant slot | 5 | Room to grow, but empty until filled |

Average dice: 1d4 = 2.5, 1d6 = 3.5, 1d8 = 4.5, 1d10 = 5.5, 1d12 = 6.5, 2d6 = 7, 2d8 = 9, 2d10 = 11, 3d8 = 13.5, 4d12 = 26.

## Why perks matter

A weapon with lower dice but a strong perk can deserve a higher price. Example: Temporal Blade (2d10) and Silver Dagger (1d8) looked cheap until their perks were priced; with perks valued they sit in line with their neighbours.

## Checks and thresholds

- **Price vs value**: Gil per value point, compared with the middle (median) weapon of the same rarity. 1.6x or more = much dearer; 0.6x or less = much cheaper. The suggested price is the rarity median times the weapon's points, rounded to 100 Gil.
- **Damage dice outliers**: average damage 1.8x or more, or half or less, of the rarity median.
- **Price ladder**: same weapon kind, a weapon that costs 25%+ more but scores 5%+ less than another.
- **Rarity ladder**: same weapon kind, a rarer weapon that scores lower than a commoner one. Rarer weapons unlock later in the shop, so players expect them to be better.
- **Gaps**: weapon kind + rarity combinations with no weapon at all.

## Known limits

- Perk values are judgement calls written down in `perk-values.json`. If a flag hinges on a perk, say so and quote its value and reason. A perk missing from the table counts 15 and is listed under "Unpriced perks": add it.
- Weapon kind comes from the name (same patterns as the app), with a few ids handled by hand (Assassin's Blade, Shadow Fang, Temporal Blade and Void Dagger are daggers). If a new weapon shows up as "other", say so.
- Strikers fight unarmed, so there are no striker weapons in the shop. That is expected.
- Currency: 1 gold = 2,500 Gil, 1 silver = 100 Gil. So a price of "1 gold 50 silver" in the data is 7,500 Gil, not 1.5 gold.
