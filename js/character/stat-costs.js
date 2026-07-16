import { DEFAULT_STATS, STAT_RULES } from '../core/constants.js'

const STAT_KEYS = Object.keys(STAT_RULES)

export function emptyStatUpgradeHistory() {
  const history = {}
  for (const key of STAT_KEYS) history[key] = []
  return history
}

export function getStatBaseCost(stat) {
  return Number(STAT_RULES[stat]?.cost || 0)
}

/** HP/Stamina bands are 5 purchased points; other stats are 3. */
export function getStatBandSize(stat) {
  return stat === 'hp' || stat === 'stamina' ? 5 : 3
}

export function getPurchasedStatCount(character, stat) {
  const list = character?.statUpgradeHistory?.[stat]
  return Array.isArray(list) ? list.length : 0
}

export function getCompletedBands(purchasedCount, bandSize) {
  return Math.floor(Math.max(0, Number(purchasedCount) || 0) / Math.max(1, bandSize))
}

/** nextCost = ceil(baseCost * (1 + 0.5 * completedBands)) */
export function getStatCostForPurchasedCount(stat, purchasedCount) {
  const base = getStatBaseCost(stat)
  if (!base) return 0
  const bands = getCompletedBands(purchasedCount, getStatBandSize(stat))
  return Math.ceil(base * (1 + 0.5 * bands))
}

export function getNextStatUpgradeCost(character, stat) {
  return getStatCostForPurchasedCount(stat, getPurchasedStatCount(character, stat))
}

export function getLatestStatRefund(character, stat) {
  const list = character?.statUpgradeHistory?.[stat]
  if (!Array.isArray(list) || !list.length) return 0
  return Number(list[list.length - 1]) || 0
}

export function purchasesUntilNextBand(character, stat) {
  const band = getStatBandSize(stat)
  const purchased = getPurchasedStatCount(character, stat)
  const rem = purchased % band
  return rem === 0 ? band : band - rem
}

export function isTemplateCharacter(character) {
  return Boolean(character?.premadeId || character?.isTemplate || character?.npcTemplate)
}

/**
 * Migrate / normalize purchase history.
 * Players without history: treat raw points above DEFAULT_STATS as old flat-price purchases.
 * Premades/templates: empty paid history (template stats are not refundable).
 */
export function normalizeStatUpgradeHistory(character) {
  if (!character) return emptyStatUpgradeHistory()

  if (isTemplateCharacter(character)) {
    return emptyStatUpgradeHistory()
  }

  const incoming = character.statUpgradeHistory && typeof character.statUpgradeHistory === 'object'
    ? character.statUpgradeHistory
    : null

  const history = emptyStatUpgradeHistory()
  let hasAny = false

  if (incoming) {
    for (const key of STAT_KEYS) {
      const rows = Array.isArray(incoming[key])
        ? incoming[key].map(n => Math.max(0, Math.floor(Number(n) || 0))).filter(n => n > 0)
        : []
      history[key] = rows
      if (rows.length) hasAny = true
    }
  }

  if (hasAny) return history

  // Legacy flat-price migration from raw stats vs defaults.
  const stats = character.stats || {}
  for (const key of STAT_KEYS) {
    const raw = Number(stats[key])
    const baseline = Number(DEFAULT_STATS[key])
    if (!Number.isFinite(raw) || !Number.isFinite(baseline)) continue
    const purchased = Math.max(0, Math.floor(raw - baseline))
    const baseCost = getStatBaseCost(key)
    history[key] = Array.from({ length: purchased }, () => baseCost)
  }
  return history
}

export function appendStatPurchase(character, stat, costPaid) {
  if (!character || !STAT_RULES[stat]) return
  character.statUpgradeHistory = character.statUpgradeHistory || emptyStatUpgradeHistory()
  if (!Array.isArray(character.statUpgradeHistory[stat])) character.statUpgradeHistory[stat] = []
  character.statUpgradeHistory[stat].push(Math.max(0, Math.floor(Number(costPaid) || 0)))
}

export function popStatPurchase(character, stat) {
  if (!character?.statUpgradeHistory?.[stat]?.length) return 0
  return Number(character.statUpgradeHistory[stat].pop()) || 0
}
