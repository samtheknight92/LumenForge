/**
 * Encounter Balancer — dual pressure (Power + Technique) shared by the enemy
 * comparison list and quantity guide. Combined rating = average of both indices
 * (rounded). Not exact — consistent GM guidance, easy to retune via constants.
 */

export const DIFFICULTY_LABELS = [
  'Breeze',
  'Super Easy',
  'Easy',
  'Kinda Easy',
  'Mediocre',
  'A Little Hard',
  'Hard',
  'Very Hard',
  'Deadly'
]

/** Enemy-threat-per-player ÷ party-average-Combat-Power ratio breakpoints. */
const POWER_RATIO_BREAKPOINTS = [0.35, 0.55, 0.7, 0.85, 1.15, 1.4, 1.7, 2.2]

/** Enemy-threat-per-player ÷ party-average-Skill-Level ratio breakpoints. */
const TECHNIQUE_RATIO_BREAKPOINTS = [0.35, 0.55, 0.7, 0.85, 1.15, 1.4, 1.7, 2.2]

const MAX_INDEX = DIFFICULTY_LABELS.length - 1

const ACTION_ECONOMY = {
  muchFewer: 0.6,
  muchMore: 2.5,
  more: 1.5
}

function clampIndex(index) {
  return Math.max(0, Math.min(MAX_INDEX, index))
}

function baseDifficultyIndex(ratio, breakpoints) {
  const found = breakpoints.findIndex(breakpoint => ratio < breakpoint)
  return found === -1 ? MAX_INDEX : found
}

function computePressure({
  partyAverage,
  partyCount,
  enemyThreatLevel,
  enemyCount,
  soloBossCapable,
  breakpoints
}) {
  const safeAverage = Math.max(1, Number(partyAverage) || 0)
  const safePartyCount = Math.max(1, Number(partyCount) || 0)
  const safeEnemyCount = Math.max(0, Number(enemyCount) || 0)
  const totalEnemyThreat = Number(enemyThreatLevel || 0) * safeEnemyCount

  const ratio = (totalEnemyThreat / safePartyCount) / safeAverage
  let index = baseDifficultyIndex(ratio, breakpoints)

  const actionRatio = safeEnemyCount / safePartyCount
  const warnings = []
  const isSolo = safeEnemyCount === 1

  if (!isSolo) {
    if (actionRatio <= ACTION_ECONOMY.muchFewer) {
      index = clampIndex(index - 1)
    } else if (actionRatio >= ACTION_ECONOMY.muchMore) {
      index = clampIndex(index + 2)
      warnings.push('Enemy side has many more actions than the players. This may be more dangerous than the rating suggests.')
    } else if (actionRatio >= ACTION_ECONOMY.more) {
      index = clampIndex(index + 1)
    }
  }

  if (isSolo && !soloBossCapable && index >= 5) {
    index = clampIndex(index - 1)
    warnings.push('This solo boss may be overwhelmed by the party unless it has extra actions, minions, or special mechanics.')
  }

  return {
    label: DIFFICULTY_LABELS[index],
    index,
    ratio,
    warnings
  }
}

function combinePressures(power, technique) {
  const index = clampIndex(Math.round((power.index + technique.index) / 2))
  const warnings = [...new Set([...(power.warnings || []), ...(technique.warnings || [])])]
  return {
    label: DIFFICULTY_LABELS[index],
    index,
    warnings
  }
}

/**
 * Core comparison: power (Combat Power) and technique (Skill Level) pressures
 * plus combined overall rating.
 */
export function computeEncounterDifficulty({
  partyAvgCombatPower,
  partyAvgSkillLevel,
  partyCount,
  enemyThreatLevel,
  enemyCount = 1,
  soloBossCapable = false
} = {}) {
  const safePartyCount = Math.max(1, Number(partyCount) || 0)
  const safeEnemyCount = Math.max(0, Number(enemyCount) || 0)
  const totalEnemyThreat = Number(enemyThreatLevel || 0) * safeEnemyCount
  const avgThreat = safeEnemyCount ? totalEnemyThreat / safeEnemyCount : 0

  const power = computePressure({
    partyAverage: partyAvgCombatPower,
    partyCount: safePartyCount,
    enemyThreatLevel: avgThreat,
    enemyCount: safeEnemyCount,
    soloBossCapable,
    breakpoints: POWER_RATIO_BREAKPOINTS
  })

  const technique = computePressure({
    partyAverage: partyAvgSkillLevel ?? partyAvgCombatPower,
    partyCount: safePartyCount,
    enemyThreatLevel: avgThreat,
    enemyCount: safeEnemyCount,
    soloBossCapable,
    breakpoints: TECHNIQUE_RATIO_BREAKPOINTS
  })

  const combined = combinePressures(power, technique)

  return {
    label: combined.label,
    index: combined.index,
    power: { label: power.label, index: power.index, ratio: power.ratio },
    technique: { label: technique.label, index: technique.index, ratio: technique.ratio },
    ratio: power.ratio,
    actionRatio: safeEnemyCount / safePartyCount,
    totalEnemyThreat,
    warnings: combined.warnings
  }
}

export function suggestEnemyQuantities({
  partyAvgCombatPower,
  partyAvgSkillLevel,
  partyCount,
  enemyThreatLevel,
  soloBossCapable = false,
  maxQty = 10
} = {}) {
  return Array.from({ length: Math.max(1, maxQty) }, (_, i) => {
    const enemyCount = i + 1
    return {
      enemyCount,
      ...computeEncounterDifficulty({
        partyAvgCombatPower,
        partyAvgSkillLevel,
        partyCount,
        enemyThreatLevel,
        enemyCount,
        soloBossCapable
      })
    }
  })
}

export function summarizeEncounter({
  partyAvgCombatPower,
  partyAvgSkillLevel,
  partyCount,
  enemyGroups = []
} = {}) {
  const totalEnemyThreat = enemyGroups.reduce((sum, group) => sum + Number(group.threatLevel || 0) * Number(group.count || 0), 0)
  const totalEnemyCount = enemyGroups.reduce((sum, group) => sum + Number(group.count || 0), 0)
  const soloBossCapable = enemyGroups.length === 1
    ? Boolean(enemyGroups[0]?.soloBossCapable)
    : enemyGroups.some(group => group.soloBossCapable)

  const difficulty = computeEncounterDifficulty({
    partyAvgCombatPower,
    partyAvgSkillLevel,
    partyCount,
    enemyThreatLevel: totalEnemyCount ? totalEnemyThreat / totalEnemyCount : 0,
    enemyCount: totalEnemyCount,
    soloBossCapable
  })

  return { ...difficulty, totalEnemyThreat, totalEnemyCount }
}

export function generateEncounterWarnings({
  partyAvgCombatPower,
  partyAvgSkillLevel,
  partyCount,
  enemyGroups = []
} = {}) {
  const warnings = []
  if (!enemyGroups.length) return warnings

  const totalEnemyCount = enemyGroups.reduce((sum, group) => sum + Number(group.count || 0), 0)
  const safePartyCount = Math.max(1, Number(partyCount) || 0)
  const safeAvgPower = Math.max(1, Number(partyAvgCombatPower) || 0)
  const safeAvgSkill = Math.max(1, Number(partyAvgSkillLevel) || safeAvgPower)

  for (const group of enemyGroups) {
    if (!group.count) continue
    const defenseHeavy = group.base > 0 && group.abilityBonus < group.base * 0.25
    const offenseHeavy = group.abilityBonus > group.base * 0.75 && group.threatLevel >= safeAvgPower
    if (defenseHeavy && group.count <= 2) {
      warnings.push(`${group.name || 'This enemy'} may be too defensive and could create a slow fight.`)
    }
    if (offenseHeavy) {
      warnings.push(`${group.name || 'This enemy'} may be able to down a player very quickly.`)
    }
  }

  if (totalEnemyCount >= safePartyCount * 3) {
    const avgThreat = enemyGroups.reduce((sum, group) => sum + Number(group.threatLevel || 0) * Number(group.count || 0), 0) / Math.max(1, totalEnemyCount)
    if (avgThreat < safeAvgPower * 0.5) {
      warnings.push('This fight may be safe but very slow — a lot of weak enemies to chew through.')
    }
  }

  if (totalEnemyCount >= 3 && enemyGroups.some(group => group.abilityBonus > group.base * 0.5)) {
    warnings.push('This fight may be deadly if enemies focus one player — consider spreading their attention at the table.')
  }

  const avgThreat = enemyGroups.reduce((sum, group) => sum + Number(group.threatLevel || 0) * Number(group.count || 0), 0) / Math.max(1, totalEnemyCount)
  if (avgThreat > safeAvgSkill * 1.5 && safeAvgSkill < safeAvgPower * 0.6) {
    warnings.push('Enemies may outclass the party\'s skill breadth — few abilities, healing, or control options.')
  }

  return [...new Set(warnings)]
}
