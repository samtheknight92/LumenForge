---
name: status-effect-check
description: Use when reviewing LumenForge status effects (Burn, Weakened, Fear and so on), or after adding or editing one, to find statuses whose text and numbers disagree, never end, overlap, clash or go unused.
---

# Status effect check

Checks every status a player or GM can put on a character. **Report only. Never edit game data or code unless the user asks.**

## Steps

1. From the repo root, run `node .claude/skills/status-effect-check/check.mjs` (add `--all` to list everything). It only reads `data/json/` and searches `js/` for where statuses are switched on.
2. The report groups issues as:
   - **Text and app numbers disagree**: the description says one number, the app applies another.
   - **Statuses with no end**: no duration and no "until…" in the text.
   - **Statuses that overlap**: two statuses for one idea, or a skill that describes one status but applies another.
   - **Two statuses with the same name**.
   - **Statuses nothing uses**, and statuses used but not defined.
   - **Immunity problems**: an immunity that blocks nothing.
   - **Rules only the table can enforce**: fine, but should say so.
   - **Stacking damage with no cap**.
3. Check each flag against the full text before reporting it. Some same-name pairs are deliberate: a skill's own record plus the buff it gives. Say so when that's the case, but still flag it if the two records carry different numbers.
4. Report in plain English: what the player sees, why it causes confusion at the table, and one fix each.

## Rules

- Statuses are tracked by each player on their own sheet. There is no server, so never suggest the GM applying statuses to a player's app.
- Weapon perks ending in "on hit" and auras are triggers, not statuses, so they are skipped. Immunities and resistances are lasting traits, so they are not flagged for having no end.
- No network calls, no installs.

See `reference.md` for details of each check.
