import { STAT_RULES, DEFAULT_STATS } from '../core/constants.js'
import { computeThreatLevel } from '../character/threat-level.js'

/**
 * computeStats() mutates whatever object it's given, stashing the result on
 * `_cache.stats`. Always build a clean, cache-free character for every trial.
 */
export function freshCharacter(base, stats) {
  return { ...base, stats, _cache: undefined }
}

export function buildSheetStats(shape, multiplier) {
  const stats = { ...DEFAULT_STATS }
  for (const [stat, weight] of Object.entries(shape)) {
    if (!weight || weight <= 0) continue
    const rule = STAT_RULES[stat]
    if (!rule) continue
    const raw = DEFAULT_STATS[stat] + multiplier * weight
    stats[stat] = Math.min(rule.max, Math.max(rule.min, raw))
  }
  for (const stat of Object.keys(stats)) {
    stats[stat] = Math.round(stats[stat])
  }
  return stats
}

/**
 * Binary-search a stat-shape multiplier until computeThreatLevel() hits the target.
 */
export function solveStatsForThreatLevel({ characterBase, shape, targetThreat, computeThreatLevelFn = computeThreatLevel }) {
  const base = { ...characterBase, _cache: undefined }

  const threatAt = multiplier => {
    const stats = buildSheetStats(shape, multiplier)
    const info = computeThreatLevelFn(freshCharacter(base, stats))
    return { multiplier, stats, info }
  }

  let lo = -4
  let hi = 4
  let loTrial = threatAt(lo)
  let hiTrial = threatAt(hi)
  let guard = 0
  while (hiTrial.info.threatLevel < targetThreat && guard < 60) {
    hi *= 2
    hiTrial = threatAt(hi)
    guard += 1
  }
  guard = 0
  while (loTrial.info.threatLevel > targetThreat && guard < 60) {
    lo *= 2
    loTrial = threatAt(lo)
    guard += 1
  }

  let best = loTrial.info.threatLevel === targetThreat ? loTrial : hiTrial
  if (Math.abs(loTrial.info.threatLevel - targetThreat) < Math.abs(best.info.threatLevel - targetThreat)) best = loTrial
  for (let i = 0; i < 70; i += 1) {
    const mid = (lo + hi) / 2
    const midTrial = threatAt(mid)
    if (Math.abs(midTrial.info.threatLevel - targetThreat) < Math.abs(best.info.threatLevel - targetThreat)) {
      best = midTrial
    }
    if (midTrial.info.threatLevel < targetThreat) {
      lo = mid
      loTrial = midTrial
    } else {
      hi = mid
      hiTrial = midTrial
    }
  }
  if (Math.abs(hiTrial.info.threatLevel - targetThreat) < Math.abs(best.info.threatLevel - targetThreat)) best = hiTrial
  if (Math.abs(loTrial.info.threatLevel - targetThreat) < Math.abs(best.info.threatLevel - targetThreat)) best = loTrial

  const [primaryStat] = Object.entries(shape).sort((a, b) => b[1] - a[1])[0] || []
  if (primaryStat && STAT_RULES[primaryStat]) {
    let guardNudge = 0
    while (best.info.threatLevel !== targetThreat && guardNudge < 300) {
      const direction = best.info.threatLevel < targetThreat ? 1 : -1
      const rule = STAT_RULES[primaryStat]
      const nextValue = Math.min(rule.max, Math.max(rule.min, best.stats[primaryStat] + direction))
      if (nextValue === best.stats[primaryStat]) break
      const trialStats = { ...best.stats, [primaryStat]: nextValue }
      const trialInfo = computeThreatLevelFn(freshCharacter(base, trialStats))
      const currentGap = Math.abs(best.info.threatLevel - targetThreat)
      const trialGap = Math.abs(trialInfo.threatLevel - targetThreat)
      if (trialGap > currentGap) break
      best = { stats: trialStats, info: trialInfo }
      guardNudge += 1
      if (trialGap === 0) break
    }
  }

  return { stats: best.stats, achievedThreatLevel: best.info.threatLevel, info: best.info }
}
