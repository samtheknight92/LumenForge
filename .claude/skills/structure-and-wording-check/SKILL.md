---
name: structure-and-wording-check
description: Use when reviewing LumenForge rules, skill or item text for vague wording, mixed terms, or rules a player and GM could read two ways, or after writing new descriptions.
---

# Structure and wording check

Reads every player-facing text (skills, items, status effects, races, How to Play and the Glossary) and flags wording that is vague, inconsistent, or open to two readings. Every flag comes with the exact text and a suggested rewrite. **Report only. Never edit game data or code unless the user asks.**

## Steps

1. From the repo root, run `node .claude/skills/structure-and-wording-check/check.mjs`. It shows 6 examples per group; add `--all` for every one, or `--max 10`. It only reads files.
2. The report groups issues as:
   - **Mixed terms**: one idea written several ways (Armour/Armor, turns/rounds, once per combat/scene, Saving Roll/save, Stamina/mana).
   - **Vague wording**: words with no number behind them ("nearby", "small", "slows").
   - **Bonus with no duration**.
   - **Text and app disagree**: the description promises a status or chance that the app does not roll.
   - **One chance, two statuses**: is it one roll or two?
   - **Status named but not defined**, **Used in skills, never explained**, **Rules that disagree with each other**.
3. Check a few examples from each group by reading the full text, and drop any false alarms. Say how many you dropped.
4. Report in plain English, biggest groups first. For each group: why it matters to a new player, then the exact text and a rewrite for the top examples. Where one rule change would fix a whole group (for example "define round = turn in the Glossary"), suggest that instead of 50 separate edits.
5. Finish with the total count and the three changes that would help new players most.

## Rules

- Quote the text exactly as it is in the data. Rewrites should keep the game's British spelling ("Defence", "Armour") and plain tone.
- "Text and app disagree" is the most serious group: the player reads one thing and the button does another. Put it first if it has results.
- No network calls, no installs.

See `reference.md` for the house style the rewrites follow and how each check works.
