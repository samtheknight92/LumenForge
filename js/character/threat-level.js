import { getSkill } from '../core/cache.js'
import { computeCombatPower } from './combat-power.js'
import { computeSkillLevel } from './skill-level.js'

/**
 * Threat Level — how hard is this character/foe in a fight?
 * Threat Level = Skill Level + Combat Power (same formula for PCs and premades).
 * A light skill-description scan still marks solo-boss traits (multi-hit / area / control)
 * for encounter action-economy hints — it does not add to the number.
 */
export const THREAT_ABILITY_WEIGHTS = {
  multiHit: 2,
  area: 2,
  control: 1.5,
  dot: 0.75,
  healing: 1.25,
  passive: 0.5
}

const THREAT_ABILITY_PATTERNS = {
  multiHit: /twice|two attacks|multiple attacks|multiple targets|\d+ times/i,
  area: /all enemies|each enemy|every enemy\b|area of effect|\barea\b|burst|explo/i,
  control: /stun|freeze|frozen|paraly|\broot\b|rooted|silence|blind|charm|sleep|petrify/i,
  dot: /poison|burn(?:ing)?|bleed(?:ing)?|damage over time/i,
  healing: /\bheal|regenerat|restore(?:s)? .*hp/i
}

/** Enemies with these flags can meaningfully act more than once per round. */
export function isSoloBossCapable(flags) {
  return Boolean(flags?.multiHit || flags?.area || flags?.control)
}

function scanAbilityFlags(character) {
  const flags = {}
  let passiveCount = 0
  for (const id of character?.skills || []) {
    const skill = getSkill(id)
    if (!skill) continue
    const desc = String(skill.desc || '').toLowerCase()
    for (const [flag, pattern] of Object.entries(THREAT_ABILITY_PATTERNS)) {
      if (flags[flag]) continue
      if (pattern.test(desc) || (flag === 'multiHit' && id === 'multiattack')) {
        flags[flag] = true
      }
    }
    if (desc.startsWith('passive')) passiveCount += 1
  }
  return { flags, passiveCount }
}

export function computeThreatLevel(character) {
  if (!character) {
    return {
      threatLevel: 0,
      skillLevel: 0,
      combatPower: 0,
      base: 0,
      abilityBonus: 0,
      flags: {},
      passiveCount: 0,
      soloBossCapable: false,
      display: '0'
    }
  }

  const skillInfo = computeSkillLevel(character)
  const combatInfo = computeCombatPower(character)
  const skillLevel = Number(skillInfo.skillLevel) || 0
  const combatPower = Number(combatInfo.combatPower) || 0
  const threatLevel = Math.max(0, skillLevel + combatPower)
  const { flags, passiveCount } = scanAbilityFlags(character)

  return {
    threatLevel,
    skillLevel,
    combatPower,
    /** Compat: Combat Power half of the mix (was old stat base). */
    base: combatPower,
    /** Compat: Skill Level half of the mix (was old ability keyword bonus). */
    abilityBonus: skillLevel,
    breakdown: combatInfo.breakdown,
    flags,
    passiveCount,
    soloBossCapable: isSoloBossCapable(flags),
    display: String(threatLevel)
  }
}

export function threatLevelTooltip(info) {
  const flagLabels = {
    multiHit: 'Multi-hit attacks',
    area: 'Area attacks',
    control: 'Control effects',
    dot: 'Damage over time',
    healing: 'Healing'
  }
  const activeFlags = Object.entries(info.flags || {})
    .filter(([key, value]) => value && flagLabels[key])
    .map(([key]) => `· ${flagLabels[key]}`)

  return [
    `Threat Level ${info.threatLevel}`,
    '',
    'Threat Level = Skill Level + Combat Power.',
    'Same formula for player characters and premade foes.',
    '',
    `Skill Level: ${info.skillLevel ?? info.abilityBonus ?? 0}`,
    `Combat Power: ${info.combatPower ?? info.base ?? 0}`,
    ...(activeFlags.length ? ['', 'Notable traits:', ...activeFlags] : []),
    ...(info.soloBossCapable ? ['', 'Can act like more than "one turn" — treat as boss-capable solo.'] : [])
  ].join('\n')
}
