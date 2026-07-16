/**
 * Node-friendly re-export of progressive stat cost helpers.
 * Keep in sync with js/character/stat-costs.js (same formulas).
 */
export {
  emptyStatUpgradeHistory,
  getStatBaseCost,
  getStatBandSize,
  getPurchasedStatCount,
  getCompletedBands,
  getStatCostForPurchasedCount,
  getNextStatUpgradeCost,
  getLatestStatRefund,
  purchasesUntilNextBand,
  isTemplateCharacter,
  normalizeStatUpgradeHistory,
  appendStatPurchase,
  popStatPurchase
} from '../../js/character/stat-costs.js'
