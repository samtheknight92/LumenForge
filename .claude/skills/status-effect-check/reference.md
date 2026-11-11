# Status effect check: how it works

**Which records count**: effects whose type is control, debuff, statDebuff, vulnerability, damageOverTime, buff, statBuff, protection, healOverTime, recovery, toggleBuff or heal. Passive, craft, utility, weather and aura records are per-skill notes, not statuses. Ids ending `_on_hit` or `_aura`, or starting `remove_`, are triggers.

**Text vs numbers**: "for N turns" vs the duration field; "+N Stat", "Stat −N" or "Stat reduced by N" vs the stat changes; "all stats" vs which stats actually change; "N HP per turn" vs the heal per turn.

**No end**: control, debuff or buff types with duration 0 or 99+ and no "until/while/permanent/instant" in the text.

**Overlap**:
- One status's text says it "covers" another or is a "variant" of it.
- Two different names with the same stat changes, totalling 3 or more points.
- A skill whose text talks about fear or fleeing but applies Mind Controlled, while a Fear status exists.

**Unused**: not applied by any skill or item, not a skill's own id, not named in skill-meta or js/ code, and not mentioned in any text.

**Immunities**: an `immunities` entry that is not a status, or an `x_immunity` record whose status does not exist or is not wired into its immunities list.

**Table-only rules**: "cannot cast", "must move away", "cannot approach", Advantage/Disadvantage. The app cannot enforce these, and Advantage is not defined in the Glossary.

**Stacking**: stackable damage-over-time or debuff statuses whose text gives no maximum.
