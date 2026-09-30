/**
 * Skill Ranks — learned skills can be trained from Rank 1 up to Rank 10.
 *
 * Price: ranking up to Rank N costs the skill's Lumen price × (1 + 0.5 × (N − 2)),
 *   so a 20L skill costs 20 → 30 → 40 … → 100 for Rank 10 (27× its price in total).
 * Skill Level: each rank above 1 adds half a Skill Level.
 * Bonuses (applied in play):
 *   · damage: +1 per rank above 1, plus +1d6 at Ranks 3, 6 and 9
 *   · status chances: +5% per rank above 1 (never above 95%)
 *   · Stamina: −1 from Rank 5, and free to use at Rank 10 (mastered)
 * Passive skills don't rank. Pure data helpers only — no imports, so combat
 * and career modules can use them without import cycles.
 */

export const MAX_SKILL_RANK = 10
export const RANK_SKILL_LEVEL_WEIGHT = 0.5
const RANK_DAMAGE_DIE_EVERY = 3
const RANK_DAMAGE_DIE_SIDES = 6
const RANK_STATUS_CHANCE_STEP = 0.05
const RANK_STATUS_CHANCE_CAP = 0.95
const RANK_STAMINA_DISCOUNT_AT = 5

export function getSkillRank(character, skillId) {
  if (!character || !skillId || !(character.skills || []).includes(skillId)) return 0
  const rank = Number(character.skillRanks?.[skillId] || 1)
  return Math.min(MAX_SKILL_RANK, Math.max(1, Math.floor(rank)))
}

/** Lumens to go from rank (nextRank − 1) to nextRank. */
export function rankUpCost(skill, nextRank) {
  const base = Number(skill?.cost || 0)
  if (nextRank < 2) return 0
  return Math.ceil(base * (1 + 0.5 * (nextRank - 2)))
}

/** Total Lumens spent on ranks above 1 (what a full refund returns on top of the skill price). */
export function totalRankSpend(skill, rank) {
  let total = 0
  for (let r = 2; r <= rank; r++) total += rankUpCost(skill, r)
  return total
}

/** Sum of (rank − 1) across learned skills — feeds Skill Level at half weight. */
export function totalExtraRanks(character) {
  let extra = 0
  for (const id of character?.skills || []) extra += Math.max(0, getSkillRank(character, id) - 1)
  return extra
}

export function rankDamageBonus(rank) {
  const r = Math.max(1, Number(rank) || 1)
  return {
    flat: r - 1,
    dice: Math.floor(r / RANK_DAMAGE_DIE_EVERY),
    sides: RANK_DAMAGE_DIE_SIDES
  }
}

export function rankStatusChance(chance, rank) {
  if (chance == null || chance >= 1) return chance
  const r = Math.max(1, Number(rank) || 1)
  return Math.min(RANK_STATUS_CHANCE_CAP, Math.max(chance, chance + RANK_STATUS_CHANCE_STEP * (r - 1)))
}

/** Stamina after rank training. Rank 10 = mastered, free to use. */
export function rankStaminaCost(cost, rank) {
  const r = Math.max(1, Number(rank) || 1)
  if (r >= MAX_SKILL_RANK) return 0
  if (r >= RANK_STAMINA_DISCOUNT_AT && cost > 0) return Math.max(1, cost - 1)
  return cost
}

/** Plain-English summary of what a rank gives, for cards and tooltips. */
export function rankBonusSummary(rank) {
  const r = Math.max(1, Number(rank) || 1)
  if (r <= 1) return 'Rank 1 — no training bonus yet.'
  const { flat, dice, sides } = rankDamageBonus(r)
  const parts = [`+${flat}${dice ? ` +${dice}d${sides}` : ''} damage`, `+${Math.round(RANK_STATUS_CHANCE_STEP * (r - 1) * 100)}% status chance`]
  if (r >= MAX_SKILL_RANK) parts.push('no Stamina cost')
  else if (r >= RANK_STAMINA_DISCOUNT_AT) parts.push('−1 Stamina')
  return `Rank ${r}: ${parts.join(', ')}.`
}
