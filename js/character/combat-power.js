import { DEFAULT_STATS } from '../core/constants.js'
import { computeStats } from './character.js'
import { getEquippedWeapon, getEquippedOffhand } from '../items/equipment.js'
import { damageAverage } from '../ui/format.js'

/**
 * Combat Power — "how dangerous/survivable is this character in a fight?"
 * Built from FINAL effective combat stats (computeStats already folds in race,
 * equipped weapon/armour/accessory statModifiers, passive skill bonuses,
 * enchantments, active toggles and status effects) plus a small tunable nod to
 * equipped weapon damage dice, which effective stats don't otherwise capture.
 *
 * Uses the same per-point weights the old combined Level used for stat
 * purchases (HP/Stamina lighter, other stats heavier) so the numbers land in a
 * familiar, comparable range to Skill Level and enemy Threat Level.
 */
export const COMBAT_POWER_STAT_WEIGHTS = {
  hp: 0.2,
  stamina: 0.2,
  strength: 0.4,
  magicPower: 0.4,
  accuracy: 0.4,
  speed: 0.4,
  physicalDefence: 0.4,
  magicalDefence: 0.4
}

/** Weight applied to average weapon damage-dice value. Tune here. */
export const WEAPON_DAMAGE_WEIGHT = 0.3

function estimateWeaponDamageBonus(character) {
  const weapon = getEquippedWeapon(character)
  const offhand = getEquippedOffhand(character)
  return damageAverage(weapon) + damageAverage(offhand) * 0.5
}

/** Core stat -> power number, reusable by Combat Power (players) and Threat Level (enemies). */
export function combatPowerFromStats(stats) {
  let total = 0
  const breakdown = {}
  for (const [stat, weight] of Object.entries(COMBAT_POWER_STAT_WEIGHTS)) {
    const base = Number(DEFAULT_STATS[stat] ?? 0)
    const value = Number(stats?.[stat] ?? base)
    const contribution = Math.max(0, value - base) * weight
    if (contribution) breakdown[stat] = contribution
    total += contribution
  }
  return { total, breakdown }
}

export function computeCombatPower(character) {
  if (!character) {
    return { combatPower: 1, raw: 0, fraction: 0, pct: 0, breakdown: {}, weaponBonus: 0 }
  }

  const stats = computeStats(character)
  const { total: statTotal, breakdown } = combatPowerFromStats(stats)
  const weaponBonus = estimateWeaponDamageBonus(character) * WEAPON_DAMAGE_WEIGHT
  const total = statTotal + weaponBonus

  const progressFloor = Math.floor(total)
  const combatPower = progressFloor + 1
  const fraction = total - progressFloor

  return {
    combatPower,
    raw: total,
    stats,
    breakdown,
    weaponBonus,
    fraction,
    pct: Math.round(fraction * 100),
    display: String(combatPower)
  }
}

export function combatPowerTooltip(info) {
  const statLines = Object.entries(info.breakdown || {})
    .sort((a, b) => b[1] - a[1])
    .map(([stat, value]) => `· ${stat}: +${(Math.round(value * 10) / 10).toFixed(1)}`)

  return [
    `Combat Power ${info.combatPower}`,
    info.fraction > 0 ? `${info.pct}% toward Combat Power ${info.combatPower + 1}` : 'Whole level reached',
    '',
    'Based on final effective stats — HP, Stamina, Strength, Magic Power, Accuracy,',
    'Speed, Physical/Magical Defence — including gear, passives, enchantments and',
    'active status effects. Skills you have NOT learned do not count.',
    ...(info.weaponBonus ? ['', `Equipped weapon damage bonus: +${(Math.round(info.weaponBonus * 10) / 10).toFixed(1)}`] : []),
    ...(statLines.length ? ['', 'Stat contributions:', ...statLines] : [])
  ].join('\n')
}
