# Monster and NPC threat check: formulas

- **Level**: from the premade id (`_lv20_`). Level bands are 5 levels wide.
- **Effective stats**: base stats plus equipped weapon, armour, accessory and off-hand stat changes.
- **Best attack**: the larger of the weapon basic attack (average dice + Strength, or 1d4 unarmed) and the best known damage skill (dice + Magic Power or Strength, or weapon damage + Strength). Passives are skipped.
- **A player at this level**: the median NPC of the band (NPCs are built like player characters). Uses their Defence, HP, Accuracy and best damage.
- **Damage a turn**: best attack × hit chance. Hit chance = (21 − (Defence − Accuracy)) ÷ 20, clamped to 5–95%.
- **Turns to drop a player**: player HP ÷ the premade's damage a turn. **Turns a player needs**: premade HP ÷ (player damage × hit chance against the premade's Physical Defence).
- **Minimum damage**: every hit deals at least 1 (the app's MIN_ATTACK_DAMAGE), so averages are worked out per dice roll with that floor.
- **Flags**: best attack averaging 1.5 damage or less; damage a turn or HP 2.5x or 0.35x the same-category, same-band median (and at least 2 damage or 5 HP apart); a monster weaker on both counts than the median monster two bands lower.
- **Known limits**: status effects, healing, area attacks and multi-attacks are not counted. A boss with a big area skill will look weaker than it is. Check skills before reporting.
