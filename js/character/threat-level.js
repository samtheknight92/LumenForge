import { getSkill } from '../core/cache.js'
import { computeStats } from './character.js'
import { combatPowerFromStats } from './combat-power.js'

/**
 * Threat Level — "how hard is this enemy to beat in combat?"
 * Not meant to be perfectly exact — just consistent, and built from the same
 * stat-power math as player Combat Power (combatPowerFromStats), plus a
 * lightweight keyword scan over the enemy's learned skill descriptions to
 * account for things raw stats miss: multi-hit, area attacks, control effects,
 * damage-over-time, healing, and "passive-heavy" kits. Every weight below is a
 * named constant so a GM/dev can retune the curve without touching the logic.
 */
export const THREAT_ABILITY_WEIGHTS = {
  multiHit: 1.5,
  area: 1.5,
  control: 1,
  dot: 0.5,
  healing: 1,
  passive: 0.3
}

const THREAT_ABILITY_PATTERNS = {
  multiHit: /twice|two attacks|multiple attacks|multiple targets|\d+ times/i,
  area: /all enemies|each enemy|every enemy\b|area of effect|\barea\b|burst|explo/i,
  control: /stun|freeze|frozen|paraly|\broot\b|rooted|silence|blind|charm|sleep|petrify/i,
  dot: /poison|burn(?:ing)?|bleed(?:ing)?|damage over time/i,
  healing: /\bheal|regenerat|restore(?:s)? .*hp/i
}

/** Enemies with these flags can meaningfully act more than once per round, so a solo fight isn't automatically "easier than it looks". */
export function isSoloBossCapable(flags) {
  return Boolean(flags?.multiHit || flags?.area || flags?.control)
}

export function computeThreatLevel(character) {
  if (!character) {
    return { threatLevel: 1, base: 0, abilityBonus: 0, flags: {}, passiveCount: 0 }
  }

  const stats = computeStats(character)
  const { total: base, breakdown } = combatPowerFromStats(stats)

  let abilityBonus = 0
  let passiveCount = 0
  const flags = {}
  for (const id of character.skills || []) {
    const skill = getSkill(id)
    if (!skill) continue
    const desc = String(skill.desc || '').toLowerCase()

    for (const [flag, pattern] of Object.entries(THREAT_ABILITY_PATTERNS)) {
      if (flags[flag]) continue
      if (pattern.test(desc) || (flag === 'multiHit' && id === 'multiattack')) {
        abilityBonus += THREAT_ABILITY_WEIGHTS[flag]
        flags[flag] = true
      }
    }
    if (desc.startsWith('passive')) {
      passiveCount += 1
      abilityBonus += THREAT_ABILITY_WEIGHTS.passive
    }
  }

  const total = base + abilityBonus
  const threatLevel = Math.max(1, Math.round(total))

  return {
    threatLevel,
    base,
    abilityBonus,
    breakdown,
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
    'Approximate — built from effective combat stats plus a scan of learned',
    'skills for dangerous traits. Useful for comparison, not exact math.',
    '',
    `Stat power: ${(Math.round(info.base * 10) / 10).toFixed(1)}`,
    `Ability bonus: +${(Math.round(info.abilityBonus * 10) / 10).toFixed(1)}${info.passiveCount ? ` (${info.passiveCount} passive skill${info.passiveCount === 1 ? '' : 's'})` : ''}`,
    ...(activeFlags.length ? ['', 'Notable traits:', ...activeFlags] : []),
    ...(info.soloBossCapable ? ['', 'Can act like more than "one turn" — treat as boss-capable solo.'] : [])
  ].join('\n')
}
