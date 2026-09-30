import { getSkill } from '../core/cache.js'
import { totalExtraRanks, RANK_SKILL_LEVEL_WEIGHT } from '../skills/skill-ranks.js'

/**
 * Skill Level — "how many skills has this character learned?"
 * 1 learned skill = +1 Skill Level (any tier); each skill rank above 1 = +½. Starts at 0.
 * Stat purchases, HP/Stamina, and gear never contribute — see combat-power.js.
 */
export function computeSkillLevel(character) {
  if (!character) {
    return {
      skillCount: 0,
      skillLevels: 0,
      skillLevel: 0,
      fraction: 0,
      pct: 0,
      display: '0'
    }
  }

  let skillCount = 0
  const byCategory = {}
  for (const id of character.skills || []) {
    const skill = getSkill(id)
    if (!skill) continue
    skillCount += 1
    const cat = skill.category || 'other'
    byCategory[cat] = (byCategory[cat] || 0) + 1
  }

  const extraRanks = totalExtraRanks(character)
  const rankLevels = extraRanks * RANK_SKILL_LEVEL_WEIGHT
  const raw = skillCount + rankLevels
  const skillLevel = Math.floor(raw)
  const fraction = raw - skillLevel

  return {
    skillCount,
    extraRanks,
    rankLevels,
    /** Alias of skillCount — kept for older call sites that expected a progress sum. */
    skillLevels: skillCount,
    byCategory,
    skillLevel,
    fraction,
    pct: Math.round(fraction * 100),
    display: String(skillLevel)
  }
}

export function skillLevelTooltip(info) {
  const categoryLines = Object.entries(info.byCategory || {})
    .sort((a, b) => b[1] - a[1])
    .map(([category, value]) => `· ${category}: +${value}`)

  return [
    `Skill Level ${info.skillLevel}`,
    '1 skill learned = +1 Skill Level (any tier). Each skill rank above 1 = +½.',
    'Tier gates: T2@5 · T3@12 · T4@20 · T5@35 · T6@50.',
    'HP/stat purchases and gear do NOT count toward Skill Level.',
    '',
    `${info.skillCount} skills learned`,
    ...(info.extraRanks ? [`${info.extraRanks} skill rank${info.extraRanks === 1 ? '' : 's'} trained (+${info.rankLevels})`] : []),
    ...(info.fraction > 0 ? [`${info.pct}% toward Skill Level ${info.skillLevel + 1}`] : []),
    ...(categoryLines.length ? ['', ...categoryLines] : [])
  ].join('\n')
}
