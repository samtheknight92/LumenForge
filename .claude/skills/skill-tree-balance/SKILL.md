---
name: skill-tree-balance
description: Use when reviewing LumenForge skill balance, after adding or editing skills, or when asked whether a skill or its upgrade is too strong, too weak, or off-role for its tier.
---

# Skill tree balance

Puts every skill on a common scale (damage, healing, control, support, utility) and compares it with skills of the same tier. Also checks that each upgrade in a tree keeps its skill's role, and that rank-ups suit the skill. **Report only. Never edit game data or code unless the user asks.**

## Steps

1. From the repo root, run `node .claude/skills/skill-tree-balance/check.mjs`. Add `--tree fire` (any tree name) to focus on one tree, or `--all` for the full table of every skill's role and power. It only reads `data/json/skills.json`.
2. The report has five parts:
   - **Stronger or weaker than tier peers**: compared with active skills of the same tier, role and shape (single target or area).
   - **Area vs single-target**: whether area skills are priced fairly against single-target ones.
   - **Upgrades that change role**: a skill that needs a support/healing skill but deals damage, or the reverse.
   - **Upgrades weaker than the skill they need**: a later skill that does the same job worse.
   - **Rank-up bonuses vs role**: skills that gain little from ranking up.
3. Read each flagged skill's full text before passing it on. The role and power are guesses from the wording, so drop any flag the text explains (for example a once-per-combat skill with a big extra effect). Say how many you dropped and why.
4. Report in plain English. For each flag give **what** (skill, tree, tier), **why it matters** to a player at the table, and **one suggested fix** (new dice, Stamina, or a rewording that fits the role).
5. Finish with a short summary: skills checked, flags kept, the biggest pattern.

## Rules

- Respect Sam's fusion rule when suggesting fixes: a Tier N fusion needs exactly two normal skills of Tier N or N-1, one from each thing it blends, never another fusion.
- Never suggest anything where the GM sends something to a player's app. There is no server.
- Passives, toggles and crafting skills are not given a power number; they are only checked for role.
- No network calls, no installs.

See `reference.md` for the role rules, power formula and thresholds.
