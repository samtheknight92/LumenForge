---
name: new-player-path
description: Use when checking whether a brand-new LumenForge character is fun and workable on day one, for every background and every weapon or magic path, or after changing starting stats, backgrounds, Tier 1 skills or starter gear.
---

# New player path check

Builds a sensible starting character for every weapon and magic path, using the app's own starting stats, stat prices and backgrounds. It then reports what a brand-new player can actually do in their first fight. **Report only. Never edit game data or code unless the user asks.**

## Steps

1. From the repo root, run `node .claude/skills/new-player-path/check.mjs`. It reads `data/json/` and imports the app's own starting stats, stat prices and backgrounds from `js/`, read-only.
2. The report has three parts:
   - **Backgrounds**: what each one gives, with any that are far richer or poorer than the Wanderer default.
   - **Starting paths**: for each tree, the Tier 1 skills, any buttons to press, the starter weapon or spell, average damage (with and without buying the damage stat), hit chance, and turns needed to drop a level-1 monster.
   - **Flags**: paths with no active skill, paths that cannot deal damage, starting damage that can be 0, and the gap to Tier 2.
3. Think like someone at their first session who has never played a tabletop RPG. Ask what they would press, whether they'd hit, and whether they'd understand why not.
4. Report in plain English: what the new player experiences, why it matters, and one fix each. Group repeated flags (for example "6 weapon trees have only passives at Tier 1") instead of listing them one by one.

## Rules

- Hard-mode backgrounds (Isekai'd) are meant to start with nothing, so don't flag them.
- Sam cares a lot that brand-new players understand things. Prefer fixes that explain in-app (Guided Create tips, plain labels) over fixes that change the rules, unless the rule itself is the problem.
- No network calls, no installs.

See `reference.md` for the build plan and formulas.
