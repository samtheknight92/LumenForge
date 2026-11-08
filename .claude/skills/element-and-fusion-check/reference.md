# Element and fusion check: how it works

## Element identity

For each element's magic tree, the check counts how many skills match each theme: direct damage, damage over time, lock down, disable, mind/fear, blind/vision, healing, defence/shields, movement, terrain, weaken, utility. It also lists the statuses the tree applies (from the skill's built-in effects and "apply X" in its text).

- **Signature status**: a status only that element uses. Elements with none are listed: a player cannot tell what the element is "for".
- **Overlap**: theme match (cosine similarity, 1.00 = identical mix) and status match (share of statuses both use). A pair with theme 0.90+ and status 0.40+ is flagged as duplicating identity. The top six pairs are always shown so the designer can judge.

## Weakness wheel

Read from each element's Attunement ("Fire Attunement … Ice weakness 200%"). In a fair wheel each element counters exactly one other. Note: the app's combat code calls lightning "thunder" (lightning is an alias), so the two names mean the same element.

## Pairings

- Element + element: all 28 pairs of the eight elements.
- Weapon + element: each weapon tree x each element (ranged = bow).
- Monster + element and weapon + career: counts, so uneven coverage stands out.

## Strictly better

A fusion is "strictly better" than its parents when, against each parent, it does at least as much damage (first dice x targets; area = 2.5 targets), costs the same or less Stamina, and applies every status the parent applied.

## Same-template fusions

Each fusion's text is reduced to a skeleton (element names, dice, percentages and status names replaced). Four or more fusions in one tree with the same skeleton form a group.

## Known limits

Themes and damage are read from wording. Healing or support fusions are not compared for "strictly better". Always read the skills before reporting.
