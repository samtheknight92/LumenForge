import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { importJs } from './lib/js-import.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jsonDir = join(root, 'data', 'json')

globalThis.fetch = async url => {
  const file = url.split('?')[0].split('/').pop()
  if (file === 'manifest.json') return { ok: true, json: async () => ({ version: 'verify' }) }
  const data = JSON.parse(readFileSync(join(jsonDir, file), 'utf8'))
  return { ok: true, json: async () => data }
}

const { loadGameData } = await importJs('data.js')
const { initCache, cache, getItem } = await importJs('cache.js')
const { STAT_RULES } = await importJs('constants.js')
const {
  createCharacter,
  normalizeCharacter,
  computeStats,
  statBreakdown,
  invalidateCharacterCache,
  getSurvivalSnapshot
} = await importJs('character.js')
const survival = await importJs('character/survival.js')
const { getSkillUseBlockReason } = await importJs('combat.js')

await loadGameData()
initCache()

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function fresh(on = {}) {
  const character = createCharacter('Survivor', 'human')
  character.survival.on = { ...character.survival.on, ...on }
  invalidateCharacterCache(character)
  return character
}

function statsOf(character) {
  invalidateCharacterCache(character)
  return computeStats(character)
}

// Defaults: everything off, old saves load with everything off.
const blank = fresh()
assert(Object.values(blank.survival.on).every(v => v === false), 'New characters should start with every tracker off')
assert(blank.survival.hunger === 100 && blank.survival.thirst === 100 && blank.survival.stress === 0, 'Bars should start full / calm')
const legacy = normalizeCharacter({ name: 'Old Save', race: 'human' })
assert(legacy.survival && !survival.anySurvivalOn(legacy), 'Old characters should load with survival off')
const roundTrip = normalizeCharacter(JSON.parse(JSON.stringify({ ...fresh({ hunger: true }), survival: { on: { hunger: true }, hunger: 42, thirst: 7, stress: 55 } })))
assert(roundTrip.survival.on.hunger && roundTrip.survival.hunger === 42 && roundTrip.survival.stress === 55, 'Survival values should survive save/load')

// Off trackers never change stats, even at 0.
const offButEmpty = fresh()
offButEmpty.survival.hunger = 0
const base = statsOf(fresh())
assert(JSON.stringify(statsOf(offButEmpty)) === JSON.stringify(base), 'A tracker that is off must not touch stats')

// Hunger thresholds.
const hungry = fresh({ hunger: true })
hungry.survival.hunger = 30
assert(statsOf(hungry).accuracy === base.accuracy - 2, 'Hungry (30) should give -2 Accuracy')
hungry.survival.hunger = 31
assert(statsOf(hungry).accuracy === base.accuracy, '31 Hunger should be fine')
hungry.survival.hunger = 10
const ravenous = statsOf(hungry)
for (const stat of survival.SURVIVAL_COMBAT_STATS) {
  const expected = base[stat] - 2
  assert(ravenous[stat] === expected, `Ravenous should lower ${stat} by 2`)
}
hungry.survival.hunger = 0
const starving = statsOf(hungry)
for (const stat of survival.SURVIVAL_COMBAT_STATS) {
  assert(starving[stat] === STAT_RULES[stat].min, `Starving should drop ${stat} to its minimum`)
}
assert(starving.hp === base.hp && starving.stamina === base.stamina, 'Starving should leave max HP / Stamina alone')
assert(statBreakdown(hungry, 'strength').some(row => /Starving/.test(row.label)), 'Stat breakdown should explain the survival change')

// Thirst thresholds.
const thirsty = fresh({ thirst: true })
thirsty.survival.thirst = 25
assert(statsOf(thirsty).stamina === base.stamina - 3, 'Parched should lower max Stamina by 3')
thirsty.survival.thirst = 0
assert(survival.survivalTurnHpLoss(thirsty) === 1, 'Collapsing should cost 1 HP per turn')

// Stress.
const stressed = fresh({ stress: true })
stressed.survival.stress = 50
const shaken = statsOf(stressed)
assert(shaken.magicPower === base.magicPower - 2 && shaken.accuracy === base.accuracy - 2, 'Shaken should be -2 Magic and Accuracy')
const noBlock = skill => !getSkillUseBlockReason({ ...stressed, survival: { ...stressed.survival, stress: 0 } }, skill)
const tier3 = cache.skillsFlat.find(skill => Number(skill.tier) === 3 && skill.category === 'magic' && noBlock(skill))
const tier1 = cache.skillsFlat.find(skill => Number(skill.tier) === 1 && skill.category === 'magic' && noBlock(skill))
assert(tier3 && tier1, 'Need unblocked Tier 1 and Tier 3 magic skills as fixtures')
stressed.skills.push(tier3.id, tier1.id)
assert(!/Panicked/.test(getSkillUseBlockReason(stressed, tier3)), 'Shaken should not block skills')
stressed.survival.stress = 80
assert(/Panicked/.test(getSkillUseBlockReason(stressed, tier3)), 'Panicked should block Tier 3+ skills')
assert(!/Panicked/.test(getSkillUseBlockReason(stressed, tier1)), 'Panicked should still allow Tier 1 skills')

// Skill drain by tier.
const drainer = fresh({ hunger: true, thirst: true })
const tierSkill = tier => ({ id: `t${tier}`, tier })
survival.applySkillSurvivalDrain(drainer, tierSkill(1))
assert(drainer.survival.hunger === 100 && drainer.survival.thirst === 100, 'Tier 1 skills should be free')
survival.applySkillSurvivalDrain(drainer, tierSkill(2))
assert(drainer.survival.thirst === 99 && drainer.survival.hunger === 100, 'Tier 2 should cost 1 Thirst')
survival.applySkillSurvivalDrain(drainer, tierSkill(4))
assert(drainer.survival.thirst === 97 && drainer.survival.hunger === 99, 'Tier 4 should cost 1 Hunger and 2 Thirst')
survival.applySkillSurvivalDrain(drainer, tierSkill(6))
assert(drainer.survival.thirst === 94 && drainer.survival.hunger === 97, 'Tier 5+ should cost 2 Hunger and 3 Thirst')

// Travel and Pass Time.
const walker = fresh({ hunger: true, thirst: true, stress: true })
survival.applyTravel(walker, 1500)
assert(walker.survival.hunger === 97 && walker.survival.thirst === 94, '1500 m should cost 3 Hunger and 6 Thirst')
survival.applyPassTime(walker, 2, 'waiting')
assert(walker.survival.hunger === 93 && walker.survival.thirst === 86, 'Waiting 2h should cost 4 Hunger and 8 Thirst')
walker.survival.stress = 50
survival.applyPassTime(walker, 8, 'sleeping')
assert(walker.survival.hunger === 85 && walker.survival.thirst === 70, 'Sleeping 8h should cost 8 Hunger and 16 Thirst')
assert(walker.survival.stress === 20, 'A full sleep should lower Stress by 30')
survival.applyPassTime(walker, 3, 'sleeping')
assert(walker.survival.stress === 20, 'A short nap should not lower Stress')
const hungerOnly = fresh({ hunger: true })
survival.applyTravel(hungerOnly, 1000)
assert(hungerOnly.survival.thirst === 100, 'Thirst should not drain while it is off')

// Weights: every catalogue item has a sensible weight.
for (const item of cache.itemsFlat) {
  const kg = survival.itemWeight(item)
  assert(Number.isFinite(kg) && kg > 0 && kg <= 25, `${item.name} has an odd weight (${kg})`)
}
assert(survival.itemWeight({ type: 'weapon', name: 'Rock', weight: 9 }) === 9, 'An explicit weight should win')
const plate = cache.itemsFlat.find(item => /plate mail/i.test(item.name))
const ring = cache.itemsFlat.find(item => /^ring of/i.test(item.name))
assert(survival.itemWeight(plate) > survival.itemWeight(ring) * 50, 'Plate armour should weigh far more than a ring')

// Encumbrance.
const packer = fresh({ weight: true })
const limit = survival.carryLimitFromStrength(statsOf(packer).strength)
assert(getSurvivalSnapshot(packer).carryLimit === limit, 'Carry limit should come from Strength')
packer.inventory.push({ uid: 'heavy', itemId: plate.id, qty: Math.ceil((limit + 1) / survival.itemWeight(plate)) })
const encumbered = statsOf(packer)
const snap = getSurvivalSnapshot(packer)
assert(snap.conditions.some(row => row.id === 'encumbered' || row.id === 'overloaded'), 'Carrying too much should encumber')
assert(encumbered.speed === Math.max(STAT_RULES.speed.min, Math.floor(base.speed / 2)), 'Encumbered should halve Speed')
assert(encumbered.physicalDefence === base.physicalDefence - 2, 'Encumbered should give -2 Physical Defence')
packer.inventory.find(row => row.uid === 'heavy').qty = Math.ceil((limit * 2) / survival.itemWeight(plate))
statsOf(packer)
assert(getSurvivalSnapshot(packer).conditions.some(row => row.id === 'overloaded'), 'Double the limit should be Overloaded')

// Food and drink.
const apple = getItem('apple') || cache.itemsFlat.find(item => /^apple$/i.test(item.name))
const wine = cache.itemsFlat.find(item => /^wine$/i.test(item.name))
const bread = cache.itemsFlat.find(item => /^bread$/i.test(item.name))
const sword = cache.itemsFlat.find(item => /iron sword/i.test(item.name))
assert(survival.itemNourishment(apple)?.hunger > 0, 'Apples should feed you')
assert(survival.itemNourishment(bread)?.hunger === survival.SURVIVAL_RULES.eat, 'Bread should count as a meal')
assert(survival.itemNourishment(wine)?.thirst > 0, 'Wine should count as a drink')
assert(!survival.itemNourishment(sword), 'Swords are not food')
const eater = fresh({ hunger: true })
eater.survival.hunger = 20
survival.applyNourishment(eater, bread)
assert(eater.survival.hunger === 60, 'Eating bread should add 40 Hunger')
assert(survival.nourishmentActionLabel(fresh(), bread) === '', 'No Eat button while Hunger is off')

console.log('verify-survival: ok')
