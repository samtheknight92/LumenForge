---
name: element-and-fusion-check
description: Use when reviewing LumenForge's eight elements or its fusion skills, or after adding fusions, to find elements that overlap, missing pairings, broken fusion rules, and fusions strictly better than their parts.
---

# Element and fusion check

Looks at the eight magic elements (fire, ice, lightning, earth, wind, water, darkness, light) and all fusion skills. **Report only. Never edit game data or code unless the user asks.**

## Steps

1. From the repo root, run `node .claude/skills/element-and-fusion-check/check.mjs` (add `--all` to list every item). It only reads `data/json/skills.json` and `data/json/effects.json`.
2. The report has seven parts:
   1. **What each element is about**: its main skill types and statuses, and which statuses only it uses.
   2. **Elements that overlap most**: pairs that play alike. Flag an element that duplicates another's identity.
   3. **Weakness wheel**: who is weak to whom, from each element's Attunement skill.
   4. **Missing or uneven pairings**: element+element, weapon+element, monster+element, weapon+career.
   5. **Fusion rule**: Sam's rule (below). Any break is a must-fix.
   6. **Strictly better than both parts**: fusions that make their two parent skills pointless.
   7. **Same-template fusions**: fusions that are the same sentence with the element swapped.
3. Read the flagged skills before reporting, and drop false alarms. For overlap, name the exact skills that cause it (for example "Water's Blood Boil applies Burn, fire's signature").
4. Report in plain English: what, why it matters to players, and one suggested fix each.

## Sam's fusion rule

A Tier N fusion needs exactly two normal skills of Tier N or N-1, one from each thing it blends. Never another fusion. Pick the two parents that match what the fusion does. Any suggested fix must keep this rule.

## Rules

- A fusion should be better than either part (it costs two skills to unlock), but not better at everything for less Stamina. Suggest a trade-off: higher Stamina, a once-per-combat limit, or dropping one parent's status.
- Never suggest anything where the GM sends something to a player's app.
- No network calls, no installs.

See `reference.md` for how each part is worked out.
