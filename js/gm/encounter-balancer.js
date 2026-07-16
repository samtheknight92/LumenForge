/**
 * Encounter Balancer — compare party Threat Level to enemy Threat Level.
 * Threat Level = Skill Level + Combat Power (same for PCs and premades).
 * Rating is guidance, not exact math — easy to retune via breakpoints.
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

/** Enemy-threat-per-player ÷ party-average-Threat-Level ratio breakpoints. */
const THREAT_RATIO_BREAKPOINTS = [0.35, 0.55, 0.7, 0.85, 1.15, 1.4, 1.7, 2.2]

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

/** Prefer explicit party TL; else Skill Level + Combat Power. */
export function resolvePartyAvgThreatLevel({
  partyAvgThreatLevel,
  partyAvgCombatPower,
  partyAvgSkillLevel
} = {}) {
  if (Number.isFinite(Number(partyAvgThreatLevel))) return Number(partyAvgThreatLevel)
  return Number(partyAvgSkillLevel || 0) + Number(partyAvgCombatPower || 0)
}

function computePressure({
  partyAverage,
  partyCount,
  enemyThreatLevel,
  enemyCount,
  soloBossCapable
}) {
  const safeAverage = Math.max(1, Number(partyAverage) || 0)
  const safePartyCount = Math.max(1, Number(partyCount) || 0)
  const safeEnemyCount = Math.max(0, Number(enemyCount) || 0)
  const totalEnemyThreat = Number(enemyThreatLevel || 0) * safeEnemyCount

  const ratio = (totalEnemyThreat / safePartyCount) / safeAverage
  let index = baseDifficultyIndex(ratio, THREAT_RATIO_BREAKPOINTS)

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

/**
 * Core comparison: party Threat Level vs enemy Threat Level.
 * `power` / `technique` mirror the overall rating for older UI call sites.
 */
export function computeEncounterDifficulty({
  partyAvgThreatLevel,
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
  const partyThreat = resolvePartyAvgThreatLevel({
    partyAvgThreatLevel,
    partyAvgCombatPower,
    partyAvgSkillLevel
  })

  const pressure = computePressure({
    partyAverage: partyThreat,
    partyCount: safePartyCount,
    enemyThreatLevel: avgThreat,
    enemyCount: safeEnemyCount,
    soloBossCapable
  })

  const mirrored = { label: pressure.label, index: pressure.index, ratio: pressure.ratio }

  return {
    label: pressure.label,
    index: pressure.index,
    power: mirrored,
    technique: mirrored,
    ratio: pressure.ratio,
    actionRatio: safeEnemyCount / safePartyCount,
    totalEnemyThreat,
    partyAvgThreatLevel: partyThreat,
    warnings: pressure.warnings
  }
}

export function suggestEnemyQuantities({
  partyAvgThreatLevel,
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
        partyAvgThreatLevel,
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
  partyAvgThreatLevel,
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
    partyAvgThreatLevel,
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
  partyAvgThreatLevel,
  partyAvgCombatPower,
  partyAvgSkillLevel,
  partyCount,
  enemyGroups = []
} = {}) {
  const warnings = []
  if (!enemyGroups.length) return warnings

  const totalEnemyCount = enemyGroups.reduce((sum, group) => sum + Number(group.count || 0), 0)
  const safePartyCount = Math.max(1, Number(partyCount) || 0)
  const partyThreat = Math.max(1, resolvePartyAvgThreatLevel({
    partyAvgThreatLevel,
    partyAvgCombatPower,
    partyAvgSkillLevel
  }))
  const safeAvgSkill = Math.max(0, Number(partyAvgSkillLevel) || 0)
  const safeAvgPower = Math.max(1, Number(partyAvgCombatPower) || 1)

  for (const group of enemyGroups) {
    if (!group.count) continue
    const enemyCp = Number(group.combatPower ?? group.base) || 0
    const enemySl = Number(group.skillLevel ?? group.abilityBonus) || 0
    const defenseHeavy = enemyCp > 0 && enemySl < enemyCp * 0.25
    const offenseHeavy = enemySl > enemyCp * 0.75 && group.threatLevel >= partyThreat
    if (defenseHeavy && group.count <= 2) {
      warnings.push(`${group.name || 'This enemy'} may be too defensive and could create a slow fight.`)
    }
    if (offenseHeavy) {
      warnings.push(`${group.name || 'This enemy'} may be able to down a player very quickly.`)
    }
  }

  if (totalEnemyCount >= safePartyCount * 3) {
    const avgThreat = enemyGroups.reduce((sum, group) => sum + Number(group.threatLevel || 0) * Number(group.count || 0), 0) / Math.max(1, totalEnemyCount)
    if (avgThreat < partyThreat * 0.5) {
      warnings.push('This fight may be safe but very slow — a lot of weak enemies to chew through.')
    }
  }

  if (totalEnemyCount >= 3 && enemyGroups.some(group => {
    const enemySl = Number(group.skillLevel ?? group.abilityBonus) || 0
    const enemyCp = Number(group.combatPower ?? group.base) || 0
    return enemySl > enemyCp * 0.5
  })) {
    warnings.push('This fight may be deadly if enemies focus one player — consider spreading their attention at the table.')
  }

  const avgThreat = enemyGroups.reduce((sum, group) => sum + Number(group.threatLevel || 0) * Number(group.count || 0), 0) / Math.max(1, totalEnemyCount)
  if (avgThreat > Math.max(1, safeAvgSkill) * 1.5 && safeAvgSkill < safeAvgPower * 0.6) {
    warnings.push('Enemies may outclass the party\'s skill breadth — few abilities, healing, or control options.')
  }

  return [...new Set(warnings)]
}
