/** Shared progression constants for app + Node build scripts. */

/**
 * Skill Level gates (1 learned skill = +1 Skill Level, starting at 0).
 * Same ladder as js/core/constants.js.
 */
export const TIER_MIN_LEVEL = { 1: 0, 2: 5, 3: 12, 4: 20, 5: 35, 6: 50 }

/** Ascension & Ultimate use the same Skill Level ladder. Tier 6 = Ultimate only. */
export const CAPSTONE_TIER_MIN_LEVEL = { 3: 12, 4: 20, 5: 35, 6: 50 }

export function capstoneTierMinLevel(skill) {
  const tier = Number(skill?.tier || 1)
  const category = skill?.category
  if (category !== 'ascension' && category !== 'ultimate') return null
  if (tier === 6 && category !== 'ultimate') return 99
  return CAPSTONE_TIER_MIN_LEVEL[tier] ?? null
}

export function characterLevelFromTotal(total) {
  return Math.floor(Number(total || 0)) + 1
}

/** Shop stock unlocks by rarity — aligned with Skill Level tier milestones. */
export const SHOP_MIN_LEVEL_BY_RARITY = { common: 0, uncommon: 5, rare: 12, epic: 20, legendary: 35 }

export function shopMinLevelForItem(item) {
  if (Number.isFinite(Number(item?.shopMinLevel))) return Number(item.shopMinLevel)
  return SHOP_MIN_LEVEL_BY_RARITY[String(item?.rarity || 'common').toLowerCase()] ?? 0
}

/** Standard Lumen cost floor by tier. */
export const TIER_LUMEN_COST = { 1: 8, 2: 20, 3: 40, 4: 65, 5: 100 }

const TIER_LUMEN_COST_OLD = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 }

/** Highest typical legacy cost per tier before rebalance (standard + modest premiums). */
export const LEGACY_COST_CAP = { 1: 10, 2: 12, 3: 50, 4: 50, 5: 80 }

export function minLevelForTier(tier) {
  return TIER_MIN_LEVEL[Number(tier || 1)] ?? 0
}

export function minLevelToLearnSkill(skill) {
  const tier = Number(skill?.tier || 1)
  const capstoneGate = capstoneTierMinLevel(skill)
  const tierGate = capstoneGate ?? TIER_MIN_LEVEL[tier] ?? 0
  const explicit = skill?.prerequisites?.type === 'LEVEL' ? Number(skill.prerequisites.level || 0) : 0
  return Math.max(tierGate, explicit)
}

export function suggestedLumenCost(tier, legacyCost) {
  const t = Number(tier || 1)
  const floor = TIER_LUMEN_COST[t] ?? 8
  const legacy = Number(legacyCost)
  if (!Number.isFinite(legacy) || legacy <= 0) return floor
  const oldFloor = TIER_LUMEN_COST_OLD[t] ?? floor
  if (legacy <= oldFloor) return floor
  return Math.max(floor, legacy)
}

export function adjustSkillCost(skill) {
  return suggestedLumenCost(skill?.tier, skill?.cost)
}
