/**
 * Optional survival trackers: Hunger, Thirst, Stress, Weight and Injuries.
 *
 * Each tracker has its own on/off tick (all off by default). Hunger and
 * Thirst run 100 → 0, Stress runs 0 → 100, and Weight compares carried gear
 * with a Strength-based limit. The conditions they cause feed computeStats
 * automatically, the same way weather does.
 *
 * Every tunable number lives in SURVIVAL_RULES so the rules are easy to tweak.
 */
import { getItem } from '../core/cache.js'
import { STAT_RULES } from '../core/constants.js'
import { getWeaponKind, getOffhandType, isTwoHandedWeapon } from '../items/equipment.js'
import { INJURY_LABEL, normalizeInjuries, applyInjuryStats } from './injuries.js'

export const SURVIVAL_TRACKERS = ['hunger', 'thirst', 'stress', 'weight', 'injuries']

export const SURVIVAL_RULES = {
  max: 100,
  eat: 40,
  drink: 50,
  /** Metres walked per point lost. */
  travelMetresPerHunger: 500,
  travelMetresPerThirst: 250,
  /** Points lost per hour of Pass Time. */
  waitingPerHour: { hunger: 2, thirst: 4 },
  sleepingPerHour: { hunger: 1, thirst: 2 },
  fullSleepHours: 6,
  fullSleepStressRelief: 30,
  /** Hunger / Thirst lost when a skill of this tier is used (tier 5 covers 5 and up). */
  skillDrainByTier: {
    1: { hunger: 0, thirst: 0 },
    2: { hunger: 0, thirst: 1 },
    3: { hunger: 0, thirst: 1 },
    4: { hunger: 1, thirst: 2 },
    5: { hunger: 2, thirst: 3 }
  },
  /** Carry limit in kg = base + perStrength × Strength (never below min). */
  carryBase: 30,
  carryPerStrength: 2,
  carryMin: 15
}

/** The combat stats "all stats" penalties touch (HP and Stamina are left alone). */
export const SURVIVAL_COMBAT_STATS = ['strength', 'magicPower', 'accuracy', 'speed', 'physicalDefence', 'magicalDefence']

const allStats = value => Object.fromEntries(SURVIVAL_COMBAT_STATS.map(stat => [stat, value]))

/**
 * Conditions per tracker, worst first. `at` is the threshold:
 * Hunger/Thirst trigger at or below it, Stress at or above it.
 */
export const SURVIVAL_CONDITIONS = {
  hunger: [
    { id: 'starving', at: 0, name: 'Starving', icon: '💀', tone: 'bad', minimiseStats: true, desc: 'Starving: Strength, Magic, Accuracy, Speed and both Defences drop to their minimum until you eat.' },
    { id: 'ravenous', at: 10, name: 'Ravenous', icon: '😫', tone: 'bad', statModifiers: allStats(-2), desc: 'Ravenous: so hungry it hurts. All combat stats −2.' },
    { id: 'hungry', at: 30, name: 'Hungry', icon: '🍽️', tone: 'warn', statModifiers: { accuracy: -2 }, desc: 'Hungry: your focus slips. −2 Accuracy, and the GM may give −2 to checks for noticing things.' }
  ],
  thirst: [
    { id: 'collapsing', at: 0, name: 'Collapsing', icon: '🥵', tone: 'bad', statModifiers: allStats(-2), hpLossPerTurn: 1, desc: 'Collapsing: all combat stats −2 and you lose 1 HP every time you Process Turn until you drink.' },
    { id: 'dehydrated', at: 10, name: 'Dehydrated', icon: '🏜️', tone: 'bad', statModifiers: allStats(-2), desc: 'Dehydrated: dizzy and weak. All combat stats −2.' },
    { id: 'parched', at: 30, name: 'Parched', icon: '💧', tone: 'warn', statModifiers: { stamina: -3 }, desc: 'Parched: you tire quickly. Max Stamina −3.' }
  ],
  stress: [
    { id: 'broken', at: 100, name: 'Broken', icon: '💔', tone: 'bad', statModifiers: { magicPower: -2, accuracy: -2 }, blockSkillTier: 3, loseTurn: true, desc: 'Broken: you freeze up and lose your next turn. Also −2 Magic and Accuracy, and no Tier 3+ skills.' },
    { id: 'panicked', at: 80, name: 'Panicked', icon: '😱', tone: 'bad', statModifiers: { magicPower: -2, accuracy: -2 }, blockSkillTier: 3, desc: 'Panicked: you can\'t use Tier 3 or higher skills. Also −2 Magic and Accuracy.' },
    { id: 'shaken', at: 50, name: 'Shaken', icon: '😰', tone: 'warn', statModifiers: { magicPower: -2, accuracy: -2 }, desc: 'Shaken: your hands won\'t stop trembling. −2 Magic and Accuracy.' }
  ],
  weight: [
    { id: 'overloaded', at: 2, name: 'Overloaded', icon: '🪨', tone: 'bad', halveSpeed: true, statModifiers: { physicalDefence: -2 }, cannotMove: true, desc: 'Overloaded (double your limit): you can\'t move until you drop something. Speed halved, −2 Physical Defence.' },
    { id: 'encumbered', at: 1, name: 'Encumbered', icon: '🎒', tone: 'warn', halveSpeed: true, statModifiers: { physicalDefence: -2 }, desc: 'Encumbered (over your limit): Speed halved and −2 Physical Defence, as you\'re easier to hit.' }
  ]
}

export const SURVIVAL_LABELS = {
  hunger: { name: 'Hunger', icon: '🍖', help: 'Full at 100. Goes down as you travel, wait and use big skills. Eat to refill it.' },
  thirst: { name: 'Thirst', icon: '💧', help: 'Full at 100. Drops about twice as fast as Hunger. Drink to refill it.' },
  stress: { name: 'Stress', icon: '🧠', help: 'Calm at 0. Add Stress when scary things happen (the GM will say). A good sleep brings it down.' },
  weight: { name: 'Weight', icon: '🎒', help: 'Everything you carry has a weight. Go over your limit (based on Strength) and you slow down.' },
  injuries: INJURY_LABEL
}

const clampValue = value => Math.max(0, Math.min(SURVIVAL_RULES.max, Math.round(Number(value) || 0)))

export function defaultSurvival() {
  return {
    on: { hunger: false, thirst: false, stress: false, weight: false, injuries: false },
    hunger: SURVIVAL_RULES.max,
    thirst: SURVIVAL_RULES.max,
    stress: 0,
    injuries: [],
    collapsed: true
  }
}

/** Clean up saved survival data; old characters load with everything off. */
export function normalizeSurvival(raw) {
  const base = defaultSurvival()
  if (!raw || typeof raw !== 'object') return base
  const on = {}
  for (const key of SURVIVAL_TRACKERS) on[key] = Boolean(raw.on?.[key])
  return {
    on,
    hunger: raw.hunger === undefined ? base.hunger : clampValue(raw.hunger),
    thirst: raw.thirst === undefined ? base.thirst : clampValue(raw.thirst),
    stress: raw.stress === undefined ? base.stress : clampValue(raw.stress),
    injuries: normalizeInjuries(raw.injuries),
    collapsed: raw.collapsed === undefined ? base.collapsed : Boolean(raw.collapsed)
  }
}

export function ensureSurvival(character) {
  if (!character) return defaultSurvival()
  if (!character.survival || typeof character.survival !== 'object' || !character.survival.on) {
    character.survival = normalizeSurvival(character.survival)
  }
  return character.survival
}

export function survivalOn(character, key) {
  return Boolean(character?.survival?.on?.[key])
}

export function anySurvivalOn(character) {
  return SURVIVAL_TRACKERS.some(key => survivalOn(character, key))
}

// ---------- Item weights ----------

const textOf = item => `${item?.id || ''} ${item?.name || ''}`.toLowerCase()

function weaponWeight(item) {
  const text = textOf(item)
  const kind = getWeaponKind(item)
  const twoHanded = isTwoHandedWeapon(item)
  if (/\b(gauntlet|claw|knuckle|fist)/.test(text)) return 1
  if (/\bclub\b/.test(text)) return 2
  if (kind === 'dagger' || /\b(dagger|fang|talon|main gauche|knife)\b/.test(text)) return 0.5
  if (/\bcrossbow\b/.test(text)) return 3
  if (kind === 'ranged') return 1
  if (/\b(wand|rod)\b/.test(text)) return 0.5
  if (kind === 'staff') return 2
  if (kind === 'polearm') return 3.5
  if (kind === 'axe') return twoHanded || /\b(battle|double|executioner|berserker|cleaver|chaos|demon)\b/.test(text) ? 4 : 2
  if (kind === 'hammer') return twoHanded || /\b(war|titan|thunder|earth|frost|crusher|maul)\b/.test(text) ? 5 : 2.5
  if (kind === 'sword') return twoHanded ? 3.5 : 1.5
  return twoHanded ? 3.5 : 1.5
}

function armourWeight(item) {
  const text = textOf(item)
  if (/\bboots?\b/.test(text)) return 1.5
  if (/\b(gauntlet|glove)/.test(text)) return 1
  if (/\b(helm|helmet|hood|hat|crown)\b/.test(text)) return 1.5
  if (/\bshield\b/.test(text)) return 6
  if (/\b(robe|cloak|cloth|garb|vest)/.test(text)) return 2
  if (/\b(plate|knight|titan|stone|guardian)\b/.test(text)) return 20
  if (/\b(chain|scale|mail|carapace|dragon|void|ice)\b/.test(text)) return 12
  return 6
}

function offhandWeight(item) {
  const text = textOf(item)
  const kind = getOffhandType(item)
  if (kind === 'shield') {
    if (/\b(tower|titan|wall|aegis|guardian)\b/.test(text)) return 8
    if (/\b(buckler|targe|pot-lid)\b/.test(text)) return 2
    return 4
  }
  if (kind === 'instrument') return /\b(drum|harp|lute|bowl)\b/.test(text) ? 2 : 0.5
  if (kind === 'tome') return /\b(orb|wand)\b/.test(text) ? 0.5 : 1
  if (/\b(censer|totem|reliquary|bell)\b/.test(text)) return 1.5
  return 0.5
}

function accessoryWeight(item) {
  const text = textOf(item)
  if (/\biron boots\b/.test(text)) return 3
  if (/\bboots?\b/.test(text)) return 1
  if (/\b(cloak|belt|gauntlet|glove)/.test(text)) return 0.5
  if (/\b(ring|coin)\b/.test(text)) return 0.1
  return 0.2
}

function consumableWeight(item) {
  const text = textOf(item)
  if (/\brope\b/.test(text)) return 2
  if (/\b(feast|banquet|casserole)\b/.test(text)) return 1.5
  if (/\b(ration|bread|stew|roast|pie|steak|soup|meal|broth|wine)\b/.test(text)) return 0.5
  if (/\b(scroll|feather|lockpick|leaf|seed|spore|petal)\b/.test(text)) return 0.1
  if (/\b(heart)\b/.test(text)) return 1
  return 0.3
}

/** Weight of one item in kg. An explicit `weight` on the item always wins. */
export function itemWeight(item) {
  if (!item) return 0
  const explicit = Number(item.weight)
  if (item.weight !== undefined && item.weight !== null && item.weight !== '' && Number.isFinite(explicit)) {
    return Math.max(0, explicit)
  }
  const type = String(item.type || '').toLowerCase()
  const text = textOf(item)
  if (type.includes('weapon')) return weaponWeight(item)
  if (type === 'offhand' || (getOffhandType(item) && !type.includes('weapon'))) return offhandWeight(item)
  if (type.includes('armor') || type.includes('armour')) return armourWeight(item)
  if (type === 'accessory') return accessoryWeight(item)
  if (type === 'consumable' || type === 'food' || type === 'herb') return consumableWeight(item)
  if (type === 'material') {
    if (/\b(ore|bones?|wood)\b/.test(text)) return 2
    if (/\b(leather|scales?|hide)\b/.test(text)) return 1
    return 0.3
  }
  if (type === 'organ') return 1
  if (/\b(tablet|codex|crown|anchor)\b/.test(text)) return 1
  if (type === 'tool') return 0.5
  return 0.2
}

export function formatWeight(kg) {
  const value = Math.round(Number(kg || 0) * 10) / 10
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} kg`
}

export function carriedWeight(character) {
  let total = 0
  for (const entry of character?.inventory || []) {
    const item = getItem(entry.itemId)
    if (!item) continue
    total += itemWeight(item) * Math.max(1, Number(entry.qty || 1))
  }
  return Math.round(total * 10) / 10
}

export function carryLimitFromStrength(strength) {
  const limit = SURVIVAL_RULES.carryBase + SURVIVAL_RULES.carryPerStrength * Number(strength || 0)
  return Math.max(SURVIVAL_RULES.carryMin, limit)
}

// ---------- Conditions ----------

function trackerCondition(key, value) {
  const list = SURVIVAL_CONDITIONS[key] || []
  if (key === 'stress') return list.find(row => value >= row.at) || null
  return list.find(row => value <= row.at) || null
}

/**
 * Active survival conditions. `strength` (before survival penalties) sets the
 * carry limit; omit it to skip the Weight check.
 */
export function survivalConditions(character, strength = null) {
  const survival = character?.survival
  if (!survival?.on) return []
  const out = []
  for (const key of ['hunger', 'thirst', 'stress']) {
    if (!survival.on[key]) continue
    const condition = trackerCondition(key, Number(survival[key]))
    if (condition) out.push({ ...condition, tracker: key })
  }
  if (survival.on.weight && strength !== null) {
    const ratio = carriedWeight(character) / carryLimitFromStrength(strength)
    const [overloaded, encumbered] = SURVIVAL_CONDITIONS.weight
    const condition = ratio >= overloaded.at ? overloaded : ratio > encumbered.at ? encumbered : null
    if (condition) out.push({ ...condition, tracker: 'weight' })
  }
  return out
}

/**
 * Apply survival conditions to a stats object in place. Returns breakdown rows
 * per stat: { [stat]: [{ label, value }] }.
 */
export function applySurvivalStats(character, stats) {
  const rows = {}
  if (!character?.survival?.on) return { rows, carryLimit: carryLimitFromStrength(stats.strength), conditions: [] }
  const carryLimit = carryLimitFromStrength(stats.strength)
  const conditions = survivalConditions(character, stats.strength)
  const addRow = (stat, label, value) => {
    if (!value) return
    rows[stat] = rows[stat] || []
    rows[stat].push({ label, value })
  }
  for (const condition of conditions) {
    for (const [stat, value] of Object.entries(condition.statModifiers || {})) {
      stats[stat] = (stats[stat] || 0) + Number(value || 0)
      addRow(stat, `${condition.name} (survival)`, Number(value || 0))
    }
  }
  for (const condition of conditions) {
    if (!condition.halveSpeed) continue
    const before = Number(stats.speed || 0)
    const after = Math.max(STAT_RULES.speed.min, Math.floor(before / 2))
    stats.speed = after
    addRow('speed', `${condition.name}: Speed halved (survival)`, after - before)
  }
  for (const condition of conditions) {
    if (!condition.minimiseStats) continue
    for (const stat of SURVIVAL_COMBAT_STATS) {
      const before = Number(stats[stat] || 0)
      const after = STAT_RULES[stat].min
      if (before > after) {
        stats[stat] = after
        addRow(stat, `${condition.name}: dropped to minimum (survival)`, after - before)
      }
    }
  }
  applyInjuryStats(character, stats, addRow)
  return { rows, carryLimit, conditions }
}

export function survivalSkillBlockReason(character, skill) {
  if (!character || !skill) return ''
  const tier = Number(skill.tier || 1)
  for (const condition of survivalConditions(character)) {
    if (condition.blockSkillTier && tier >= condition.blockSkillTier) {
      return `${condition.name}: can't use Tier ${condition.blockSkillTier}+ skills (Stress ${character.survival.stress})`
    }
  }
  return ''
}

// ---------- Changing the bars ----------

function drainLine(parts) {
  return parts.filter(Boolean).join(', ')
}

/** Lower Hunger / Thirst by the given amounts (only for trackers that are on). */
function drain(character, hunger, thirst) {
  const survival = ensureSurvival(character)
  const parts = []
  if (survival.on.hunger && hunger > 0) {
    survival.hunger = clampValue(survival.hunger - hunger)
    parts.push(`Hunger −${hunger}`)
  }
  if (survival.on.thirst && thirst > 0) {
    survival.thirst = clampValue(survival.thirst - thirst)
    parts.push(`Thirst −${thirst}`)
  }
  return drainLine(parts)
}

export function skillSurvivalDrain(skill) {
  const tier = Math.max(1, Math.min(5, Math.floor(Number(skill?.tier || 1))))
  return SURVIVAL_RULES.skillDrainByTier[tier] || { hunger: 0, thirst: 0 }
}

/** Drain from using a skill. Returns a short note ('' when nothing changed). */
export function applySkillSurvivalDrain(character, skill) {
  if (!survivalOn(character, 'hunger') && !survivalOn(character, 'thirst')) return ''
  const cost = skillSurvivalDrain(skill)
  return drain(character, cost.hunger, cost.thirst)
}

export function travelDrain(metres) {
  const m = Math.max(0, Number(metres) || 0)
  return {
    hunger: Math.floor(m / SURVIVAL_RULES.travelMetresPerHunger),
    thirst: Math.floor(m / SURVIVAL_RULES.travelMetresPerThirst)
  }
}

export function applyTravel(character, metres) {
  const cost = travelDrain(metres)
  return drain(character, cost.hunger, cost.thirst)
}

export function passTimeDrain(hours, mode) {
  const h = Math.max(0, Number(hours) || 0)
  const rates = mode === 'sleeping' ? SURVIVAL_RULES.sleepingPerHour : SURVIVAL_RULES.waitingPerHour
  return { hunger: Math.round(rates.hunger * h), thirst: Math.round(rates.thirst * h) }
}

export function applyPassTime(character, hours, mode) {
  const survival = ensureSurvival(character)
  const cost = passTimeDrain(hours, mode)
  const parts = [drain(character, cost.hunger, cost.thirst)]
  if (mode === 'sleeping' && Number(hours) >= SURVIVAL_RULES.fullSleepHours && survival.on.stress && survival.stress > 0) {
    const relief = Math.min(survival.stress, SURVIVAL_RULES.fullSleepStressRelief)
    survival.stress = clampValue(survival.stress - relief)
    parts.push(`Stress −${relief}`)
  }
  return drainLine(parts)
}

export function adjustSurvivalValue(character, key, delta) {
  const survival = ensureSurvival(character)
  if (!['hunger', 'thirst', 'stress'].includes(key)) return 0
  const before = survival[key]
  survival[key] = clampValue(before + Number(delta || 0))
  return survival[key] - before
}

/** HP lost at End of Turn from survival conditions (Collapsing). */
export function survivalTurnHpLoss(character) {
  return survivalConditions(character).reduce((sum, row) => sum + Number(row.hpLossPerTurn || 0), 0)
}

// ---------- Food & drink items ----------

const DRINK_PATTERN = /\b(wine|ale|beer|tea|water|juice|milk|beverage|drink|mead|cider)\b/
const FEAST_PATTERN = /\b(feast|banquet|casserole)\b/
const MEAL_PATTERN = /\b(bread|ration|jerky|stew|soup|roast|pie|steak|meal|broth|meat)\b/
const SNACK_PATTERN = /\b(apple|cheese|berr(y|ies)|fruit|treats?|mushroom|root|nuts?)\b/

/** What eating or drinking this item restores: { hunger, thirst } or null. */
export function itemNourishment(item) {
  if (!item) return null
  const type = String(item.type || '').toLowerCase()
  const category = String(item.category || '').toLowerCase()
  const text = textOf(item)
  const edibleType = type === 'food' || type === 'consumable' || category === 'food' || category === 'beverage'
  if (!edibleType) return null
  if (/\bholy\b/.test(text)) return null
  if (category === 'beverage' || DRINK_PATTERN.test(text)) return { hunger: 0, thirst: 40 }
  if (FEAST_PATTERN.test(text)) return { hunger: 60, thirst: 10 }
  if (type === 'food' || category === 'food' || MEAL_PATTERN.test(text)) {
    return { hunger: SURVIVAL_RULES.eat, thirst: /\b(soup|broth|stew)\b/.test(text) ? 15 : 0 }
  }
  if (SNACK_PATTERN.test(text) || ['fruit', 'fungi', 'root'].includes(category)) return { hunger: 20, thirst: 0 }
  return null
}

/** Eat or drink an item: refills the bars that are on. Returns the note ('' when nothing). */
export function applyNourishment(character, item) {
  const gain = itemNourishment(item)
  if (!gain) return ''
  const parts = []
  if (gain.hunger && survivalOn(character, 'hunger')) {
    const delta = adjustSurvivalValue(character, 'hunger', gain.hunger)
    parts.push(`Hunger +${delta}`)
  }
  if (gain.thirst && survivalOn(character, 'thirst')) {
    const delta = adjustSurvivalValue(character, 'thirst', gain.thirst)
    parts.push(`Thirst +${delta}`)
  }
  return drainLine(parts)
}

/** Label for the eat/drink button on an item, or '' when it can't help the bars that are on. */
export function nourishmentActionLabel(character, item) {
  const gain = itemNourishment(item)
  if (!gain) return ''
  const helpsHunger = gain.hunger && survivalOn(character, 'hunger')
  const helpsThirst = gain.thirst && survivalOn(character, 'thirst')
  if (!helpsHunger && !helpsThirst) return ''
  return gain.hunger ? 'Eat' : 'Drink'
}
