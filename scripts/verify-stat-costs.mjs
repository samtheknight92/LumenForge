/**
 * Progressive stat cost verification.
 * Run: node scripts/verify-stat-costs.mjs
 */
import assert from 'assert'
import {
  getStatCostForPurchasedCount,
  getNextStatUpgradeCost,
  getLatestStatRefund,
  normalizeStatUpgradeHistory,
  appendStatPurchase,
  popStatPurchase,
  emptyStatUpgradeHistory,
  isTemplateCharacter
} from './lib/stat-costs.mjs'
import { DEFAULT_STATS } from '../js/core/constants.js'

assert.strictEqual(getStatCostForPurchasedCount('strength', 0), 10)
assert.strictEqual(getStatCostForPurchasedCount('strength', 3), 15)
assert.strictEqual(getStatCostForPurchasedCount('strength', 6), 20)
assert.strictEqual(getStatCostForPurchasedCount('accuracy', 0), 8)
assert.strictEqual(getStatCostForPurchasedCount('accuracy', 3), 12)
assert.strictEqual(getStatCostForPurchasedCount('speed', 0), 12)
assert.strictEqual(getStatCostForPurchasedCount('speed', 3), 18)

assert.strictEqual(getStatCostForPurchasedCount('hp', 0), 3)
assert.strictEqual(getStatCostForPurchasedCount('hp', 5), 5)
assert.strictEqual(getStatCostForPurchasedCount('stamina', 0), 4)
assert.strictEqual(getStatCostForPurchasedCount('stamina', 5), 6)

const player = {
  stats: { ...DEFAULT_STATS, strength: 0 },
  statUpgradeHistory: emptyStatUpgradeHistory()
}
assert.strictEqual(getNextStatUpgradeCost(player, 'strength'), 10)
appendStatPurchase(player, 'strength', 10)
appendStatPurchase(player, 'strength', 10)
appendStatPurchase(player, 'strength', 10)
assert.strictEqual(getNextStatUpgradeCost(player, 'strength'), 15)
appendStatPurchase(player, 'strength', 15)
assert.strictEqual(getLatestStatRefund(player, 'strength'), 15)
assert.strictEqual(popStatPurchase(player, 'strength'), 15)
assert.strictEqual(getNextStatUpgradeCost(player, 'strength'), 15)

// Equipment / race bonuses must not affect price (history-only).
const withFakeHighStat = {
  stats: { ...DEFAULT_STATS, strength: 20 },
  statUpgradeHistory: { ...emptyStatUpgradeHistory(), strength: [10, 10, 10] }
}
assert.strictEqual(getNextStatUpgradeCost(withFakeHighStat, 'strength'), 15)

// Legacy migration: flat base price history from raw vs default.
const legacy = {
  stats: { ...DEFAULT_STATS, strength: 1, hp: 15 },
  premadeId: null
}
const migrated = normalizeStatUpgradeHistory(legacy)
assert.strictEqual(migrated.strength.length, 4) // -3 → 1 = 4 points
assert.ok(migrated.strength.every(c => c === 10))
assert.strictEqual(migrated.hp.length, 5)
assert.ok(migrated.hp.every(c => c === 3))

const premade = { premadeId: 'goblin_1', stats: { ...DEFAULT_STATS, strength: 10 } }
assert.strictEqual(isTemplateCharacter(premade), true)
const premadeHist = normalizeStatUpgradeHistory(premade)
assert.strictEqual(premadeHist.strength.length, 0)

console.log('verify-stat-costs: ok')
