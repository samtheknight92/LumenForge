import { getSkill } from '../core/cache.js'
import { tierLevelValue, formatLevelValue } from './level.js'

/**
 * Skill Level — "how advanced/trained is this character?"
 * Built ONLY from learned skills (weapon/magic/career/race/fusion/ascension/ultimate
 * all live in the same flat `character.skills` list). Stat purchases, HP/Stamina,
 * and gear never contribute here — see combat-power.js for that side of the split.
 */
export function computeSkillLevel(character) {
  if (!character) {
    return {
      skillCount: 0,
      skillLevels: 0,
      skillLevel: 1,
      fraction: 0,
      pct: 0,
      display: '1'
    }
  }

  let skillCount = 0
  let skillLevels = 0
  const byCategory = {}
  for (const id of character.skills || []) {
    const skill = getSkill(id)
    if (!skill) continue
    skillCount += 1
    const contribution = tierLevelValue(skill.tier)
    skillLevels += contribution
    byCategory[skill.category || 'other'] = (byCategory[skill.category || 'other'] || 0) + contribution
  }

  const progressFloor = Math.floor(skillLevels)
  const skillLevel = progressFloor + 1
  const fraction = skillLevels - progressFloor

  return {
    skillCount,
    skillLevels,
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
    .map(([category, value]) => `· ${category}: +${formatLevelValue(value)}`)

  return [
    `Skill Level ${info.skillLevel}`,
    info.fraction > 0 ? `${info.pct}% toward Skill Level ${info.skillLevel + 1}` : 'Whole level reached',
    '',
    'Based only on learned skills — tier 5 skill = +1 level (tier N = N ÷ 5).',
    'HP/stat purchases and gear do NOT count toward Skill Level.',
    '',
    `${info.skillCount} skills learned (+${formatLevelValue(info.skillLevels)} total)`,
    ...(categoryLines.length ? ['', ...categoryLines] : [])
  ].join('\n')
}
