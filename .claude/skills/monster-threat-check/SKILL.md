---
name: monster-threat-check
description: Use when reviewing LumenForge premade monsters, NPCs and pedestrians, or the premade generator, to check that each one hits and survives about as well as others of its level, and that higher levels really are tougher.
---

# Monster and NPC threat check

Checks every premade against others of the same level: how hard it hits, how long it lasts, and whether the level ladder makes sense for a GM picking enemies by level. **Report only. Never edit game data or code unless the user asks.**

## Steps

1. From the repo root, run `node .claude/skills/monster-threat-check/check.mjs` (add `--all` for every flag). It only reads `data/json/`.
2. The report has five parts:
   - **Level curve**: monsters' median HP and damage per level band, how many turns they take to drop a player, and how many turns a player needs to drop them.
   - **Barely hurt anyone**: premades whose best attack averages 1.5 damage or less (every hit deals at least 1, the app's minimum).
   - **Out of line with same-level peers**: damage or HP far from others of the same category and level band.
   - **Higher level but weaker**: monsters that are weaker than ones two bands lower.
   - **One-hit monsters**.
3. Look at the level curve first. A healthy curve has fights lasting a few turns on both sides at every band. Point out where it breaks.
4. Check flagged premades' skills and notes before reporting. A "weak" premade may be a support or a pedestrian by design, and a "strong" one may be a boss.
5. Report in plain English, grouped. Where the cause is the premade generator rather than single premades, say so once and suggest fixing the generator.

## Rules

- Premades are built by the generator in `scripts/lib/premade-generator.mjs`. A pattern across many premades is a generator fix, not 40 hand edits.
- The app has no server: GMs run enemies on their own screen. Don't suggest syncing enemies to players.
- No network calls, no installs.

See `reference.md` for the formulas.
