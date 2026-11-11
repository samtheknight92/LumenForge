# New player path: build plan and formulas

- **Starting stats**: `DEFAULT_STATS` from the app (HP 10, Stamina 10, Strength −3, Magic Power −3, Accuracy −3, Speed 2, Defences 8).
- **Budget**: Wanderer, 113 Lumens and 2,400 Gil (the defaults).
- **Plan**: learn every Tier 1 skill of the tree. Then buy, in order, the damage stat (Strength, or Magic Power for magic and staff) up to 0, Accuracy up to 0, the damage stat to +1, then HP up to 15. Stat prices come from the app's own progressive cost (`getStatCostForPurchasedCount`).
- **Weapon**: the cheapest common weapon of that kind. Strikers fight unarmed (1d4).
- **Spell**: the first Tier 1 skill of the element with dice in its text, plus Magic Power.
- **Hit chance**: d20 + Accuracy against the monster's Defence (Physical for weapons, Magical for spells), clamped between 5% and 95%.
- **Typical first enemy**: median stats of level-1 premade monsters.
- **Turns to drop**: monster HP ÷ (average damage × hit chance).
- **Background value**: Gil ÷ 2,400 + Lumens ÷ 113, compared with Wanderer (2.0). Flagged at more than ±25%. Starting items are listed but not counted.
- **Gap to Tier 2**: Tier 2 needs Skill Level 5 (5 skills learned), while each tree has 2 Tier 1 skills.
