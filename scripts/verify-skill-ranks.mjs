#!/usr/bin/env node
/**
 * Skill rank maths: prices, Skill Level weight, damage, status chance and Stamina.
 * Run: node scripts/verify-skill-ranks.mjs
 */
import assert from 'node:assert/strict'
import {
  MAX_SKILL_RANK,
  getSkillRank,
  rankUpCost,
  totalRankSpend,
  totalExtraRanks,
  rankDamageBonus,
  rankStatusChance,
  rankStaminaCost
} from '../js/skills/skill-ranks.js'

const fireball = { id: 'fireball', cost: 20, staminaCost: 4 }
const character = { skills: ['fireball', 'fire_spark'], skillRanks: { fireball: 10, fire_spark: 3, unknown: 5 } }

assert.equal(MAX_SKILL_RANK, 10)
assert.equal(getSkillRank(character, 'fireball'), 10)
assert.equal(getSkillRank(character, 'fire_spark'), 3)
assert.equal(getSkillRank(character, 'unknown'), 0, 'unlearned skills have no rank')
assert.equal(getSkillRank({ skills: ['x'] }, 'x'), 1, 'learned skills start at Rank 1')

assert.deepEqual([2, 3, 4, 10].map(r => rankUpCost(fireball, r)), [20, 30, 40, 100])
assert.equal(totalRankSpend(fireball, 10), 540)
assert.equal(totalRankSpend(fireball, 1), 0)

assert.equal(totalExtraRanks(character), 9 + 2, 'unlearned ranks are ignored')

assert.deepEqual(rankDamageBonus(1), { flat: 0, dice: 0, sides: 6 })
assert.deepEqual(rankDamageBonus(3), { flat: 2, dice: 1, sides: 6 })
assert.deepEqual(rankDamageBonus(10), { flat: 9, dice: 3, sides: 6 })

assert.equal(rankStatusChance(0.2, 1), 0.2)
assert.ok(Math.abs(rankStatusChance(0.2, 5) - 0.4) < 1e-9)
assert.equal(rankStatusChance(0.75, 10), 0.95, 'chance caps at 95%')
assert.equal(rankStatusChance(1, 10), 1, 'guaranteed effects stay guaranteed')
assert.equal(rankStatusChance(undefined, 10), undefined)

assert.equal(rankStaminaCost(4, 4), 4)
assert.equal(rankStaminaCost(4, 5), 3)
assert.equal(rankStaminaCost(1, 9), 1, 'never below 1 before mastery')
assert.equal(rankStaminaCost(8, 10), 0, 'Rank 10 is free')

console.log('verify-skill-ranks: ok')
