/**
 * Homebrew Balance check — compares a custom item or skill with the built-in
 * ones of the same rarity / tier, using plain maths (no network, no AI).
 *
 * Same scoring as the repo's review skills (.claude/skills/weapon-value-check,
 * skill-tree-balance): stats priced like the Stats tab, each weapon perk priced
 * on its own, statuses priced by how hard they shut a foe down.
 */
import { cache } from '../core/cache.js'
import { TIER_LUMEN_COST } from '../core/constants.js'

const RATE = { gold: 2500, silver: 100, copper: 1 }
export const STAT_WEIGHT = { hp: 3, stamina: 4, strength: 10, magicPower: 10, accuracy: 8, speed: 12, physicalDefence: 10, magicalDefence: 10 }
const DAMAGE_WEIGHT = 10
const SLOT_WEIGHT = 5
const UNPRICED_PERK = 15

/** Points per perk: 10 points = +1 average damage on every hit. */
export const PERK_VALUES = {
  double_strike: 55, earth_shatter: 55, lightning_arrows: 55, dragon_fire: 53, thunder_strike: 47,
  void_impact: 40, wind_slash: 40, earthquake: 40, holy_strike: 38, star_arrows: 38,
  elemental_mastery_passive: 35, chaos_strike: 35, cosmic_power: 30, lifesteal: 25, sweeping_strikes: 25,
  reality_cut: 25, burn_on_hit: 24, burn: 24, poison_on_hit: 24, poison: 24, phase_strike: 24,
  freeze_on_hit: 20, rage_mode: 20, drain_mana: 20, mana_efficiency: 20, infinite_reach: 20, time_strike: 20,
  execution: 18, creation_magic: 18, elemental_mastery: 17, armor_pierce: 16, piercing: 16, cleave: 15,
  shadow_step: 15, shock_on_hit: 15, stealth_strike: 15, stealth: 15, dimension_pierce: 15, bleeding: 12,
  anti_cavalry: 12, dragon_slayer: 12, undead_bane: 12, nature_blessing: 12, critical_strike: 10, reach: 10,
  parry_bonus: 8, piercing_light: 8
}
const TWINS = { burn: 'burn_on_hit', poison: 'poison_on_hit', stealth: 'stealth_strike' }

/** Status value in "points of damage": perTurn (up to 4 turns) or flat. */
export const STATUS_VALUE = {
  incapacitated: { perTurn: 4 }, mind_controlled: { perTurn: 4 }, stunning: { perTurn: 4 }, charm: { perTurn: 3 },
  fear: { perTurn: 2.5 }, blinded: { perTurn: 2 }, silenced: { perTurn: 2 }, knockdown: { flat: 2 },
  immobilized: { perTurn: 1.5 }, weakened: { perTurn: 1.5 }, exhausted: { perTurn: 1.5 }, cursed: { perTurn: 1.5 },
  burn: { flat: 5 }, poison: { flat: 6 }, bleeding: { flat: 3 }, acid_corrosion: { flat: 3 }
}

const toGil = price => {
  if (typeof price === 'number') return price
  return Object.entries(price || {}).reduce((t, [k, v]) => t + (RATE[k] || 0) * Number(v || 0), 0)
}
const median = list => {
  const s = [...list].sort((a, b) => a - b)
  const n = s.length
  if (!n) return 0
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2
}
const r1 = x => Math.round(x * 10) / 10
const aOrAn = word => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word
const fmtGil = g => `${Math.round(g).toLocaleString('en-GB')} Gil`

/** Average of a dice string: "2d6", "1d8+2", "100 + 10d20". */
export function averageDice(text) {
  let total = 0
  let found = false
  for (const m of String(text || '').matchAll(/(\d+)\s*d\s*(\d+)/gi)) {
    total += Number(m[1]) * (Number(m[2]) + 1) / 2
    found = true
  }
  const flat = String(text || '').replace(/\d+\s*d\s*\d+/gi, '').match(/[+-]?\s*\d+/g)
  for (const f of flat || []) total += Number(f.replace(/\s/g, ''))
  return found || flat ? total : 0
}

export const statPoints = mods => Object.entries(mods || {}).reduce((t, [k, v]) => t + Number(v || 0) * (STAT_WEIGHT[k] ?? 8), 0)

function perkPoints(ids) {
  const fam = new Map()
  for (const id of ids || []) {
    const key = TWINS[id] || id
    fam.set(key, Math.max(fam.get(key) || 0, PERK_VALUES[id] ?? UNPRICED_PERK))
  }
  return [...fam.values()].reduce((a, b) => a + b, 0)
}

/** Value points for any gear item. */
export function itemValuePoints(item) {
  const isWeapon = String(item?.type || '').includes('weapon')
  const dice = isWeapon || item?.type === 'offhand' ? averageDice(item?.damage) : 0
  return dice * DAMAGE_WEIGHT + statPoints(item?.statModifiers) + perkPoints(item?.specialEffects) + Number(item?.enchantmentSlots || 0) * SLOT_WEIGHT
}

const GEAR_TYPES = ['weapon', 'armor', 'accessory', 'offhand']
const gearSlot = item => {
  const type = String(item?.type || '').toLowerCase()
  if (type.includes('weapon')) return 'weapon'
  return GEAR_TYPES.find(t => type === t || type.startsWith(t)) || null
}
const builtInItems = () => cache.itemsFlat.filter(i => i?.source !== 'homebrew')

/**
 * Balance check for a homebrew gear item (draft or saved).
 * Returns null when there is nothing to compare, else { tone, headline, lines }.
 */
export function homebrewItemBalance(item, catalog = builtInItems()) {
  const slot = gearSlot(item)
  if (!slot) return null
  const rarity = String(item?.rarity || 'common').toLowerCase()
  const peers = catalog.filter(i => gearSlot(i) === slot && String(i.rarity || '').toLowerCase() === rarity && toGil(i.price) > 0)
  const points = itemValuePoints(item)
  const slotLabel = slot === 'armor' ? 'armour' : slot === 'offhand' ? 'off-hand' : slot
  if (peers.length < 2 || points <= 0) {
    return { tone: 'subtle', headline: 'Balance check: not enough to compare yet.', lines: [`Add damage or stat bonuses to compare with built-in ${rarity} ${slotLabel}s.`] }
  }
  const perPoint = median(peers.map(p => toGil(p.price) / Math.max(1, itemValuePoints(p))))
  const fair = Math.round(perPoint * points / 100) * 100
  const price = Number(item?.shopPriceGil ?? toGil(item?.price) ?? 0)
  const lines = [`Value: ${Math.round(points)} points (damage dice, stats priced like the Stats tab, and each perk).`, `Fair price for ${aOrAn(rarity)} ${slotLabel} like this: about ${fmtGil(fair)}.`]
  let tone = 'good'
  let headline
  if (!price) {
    headline = `Balance check: suggested price about ${fmtGil(fair)}.`
    tone = 'subtle'
  } else {
    const ratio = price / Math.max(1, fair)
    if (ratio >= 1.6) { tone = 'warn'; headline = `Balance check: pricey. ${fmtGil(price)} is ${r1(ratio)}x what built-in ${rarity} ${slotLabel}s charge for this much.` }
    else if (ratio <= 0.6) { tone = 'warn'; headline = `Balance check: a bargain. ${fmtGil(price)} is ${Math.round(ratio * 100)}% of the usual price for this much.` }
    else headline = `Balance check: fair price for ${aOrAn(rarity)} ${slotLabel}.`
  }
  if (slot === 'weapon') {
    const dice = averageDice(item?.damage)
    const medDice = median(peers.map(p => averageDice(p.damage)).filter(Boolean))
    if (dice && medDice && (dice >= medDice * 1.8 || dice <= medDice * 0.5)) {
      tone = 'warn'
      lines.push(`Damage ${item.damage} averages ${r1(dice)}; built-in ${rarity} weapons average about ${r1(medDice)}. Dice that far off decide fights whatever the price.`)
    }
  }
  const unpriced = (item?.specialEffects || []).filter(id => PERK_VALUES[id] == null)
  if (unpriced.length) lines.push(`Perks with no set value (counted as ${UNPRICED_PERK} points each): ${unpriced.join(', ')}.`)
  return { tone, headline, lines }
}

// ---------- skills ----------

const AREA_RE = /per (?:creature|target|enemy)|each (?:enemy|creature|target)|all enemies|\barea\b|radius|burst|cone|\bline\b/i
function targetsFromText(desc) {
  const words = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 }
  const d = String(desc || '').toLowerCase().replace(/\b(two|three|four|five|six|seven|eight)\b/g, w => words[w])
  const multi = d.match(/(?:fire|make|throw) (\d+)\b|(\d+) (?:\w+ )?(?:shots|arrows|attacks|attack rolls|strikes|hits|cuts|axes)\b/)
  if (multi) return Math.min(4, Number(multi[1] || multi[2]))
  return AREA_RE.test(d) ? 2.5 : 1
}
function statusPoints(effects) {
  return (effects || []).filter(a => a && a.applyTo !== 'self' && a.applyTo !== 'ally' && a.applyTo !== 'oneAlly' && a.applyTo !== 'allAllies').reduce((t, a) => {
    const v = STATUS_VALUE[a.effectId]
    if (!v) return t
    const chance = a.chance == null ? 1 : Math.min(1, Number(a.chance))
    return t + chance * (v.flat ?? v.perTurn * Math.min(4, Math.max(1, Number(a.duration || 1))))
  }, 0)
}
const limitFactor = (desc, useLimit) => {
  if (useLimit === 'oncePerRest' || /per day|per long rest|once per rest/i.test(desc || '')) return 0.4
  if (useLimit === 'oncePerCombat' || /once per (?:combat|scene|encounter)/i.test(desc || '')) return 0.6
  return 1
}

/** Damage power of a built-in skill, read from its description (same model as skill-tree-balance). */
function builtInPower(skill) {
  const d = String(skill?.desc || '').toLowerCase()
  if (/^(passive|aura|toggle|craft|enchant)/.test(d)) return 0
  if (!/attack roll|save or take|each takes|takes \d+d\d+/.test(d) || /no damage/.test(d)) return 0
  const first = d.match(/(\d+)d(\d+)/)
  let dmg = first ? Number(first[1]) * (Number(first[2]) + 1) / 2 : 0
  if (/weapon damage|basic attack|gore damage|bite damage|claw damage/.test(d)) dmg += 5.5
  if (/\+\s*(magic power|strength)/.test(d) || /weapon damage|basic attack/.test(d)) dmg += 2
  if (!dmg) return 0
  const t = targetsFromText(d)
  return (dmg + statusPoints(skill.activationEffects)) * t * limitFactor(d)
}

let powerCache = null
function tierMedians() {
  const size = cache.skillsFlat.length
  if (powerCache?.size === size) return powerCache.medians
  const groups = {}
  for (const s of cache.skillsFlat) {
    if (s?.source === 'homebrew' || ['ascension', 'ultimate'].includes(s.category)) continue
    const p = builtInPower(s)
    if (!p) continue
    const key = `${s.tier}|${targetsFromText(s.desc) > 1 ? 'multi' : 'single'}`
    ;(groups[key] ||= []).push(p)
  }
  const medians = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, median(v)]))
  powerCache = { size, medians }
  return medians
}

/** Damage power of a homebrew skill, from its structured fields. */
export function homebrewSkillPower(skill) {
  const mode = skill?.damageMode || 'none'
  if (skill?.skillType !== 'activatable' || mode === 'none') return 0
  let dmg = averageDice(skill.damageDice)
  if (mode.startsWith('basic_plus')) dmg += 5.5 + 2
  else if (skill.damageStat && skill.damageStat !== 'none') dmg += 2
  const applyTo = skill.defaultApplyTo || ''
  const targets = applyTo === 'allEnemies' || applyTo === 'area' ? 2.5 : targetsFromText(skill.desc)
  return (dmg + statusPoints((skill.activationEffects || []).map(a => ({ ...a, applyTo: a.applyTo || applyTo })))) * targets * limitFactor(skill.desc, skill.useLimit)
}

/**
 * Balance check for a homebrew skill (draft or saved).
 * Returns { tone, headline, lines }.
 */
export function homebrewSkillBalance(skill) {
  const tier = Math.max(1, Math.min(5, Number(skill?.tier || 1)))
  const lines = []
  let tone = 'good'
  const headlineParts = []
  const usual = TIER_LUMEN_COST[tier]
  const cost = Number(skill?.cost ?? usual)
  if (usual && (cost < usual * 0.6 || cost > usual * 2)) {
    tone = 'warn'
    headlineParts.push(`costs ${cost} Lumens; Tier ${tier} skills usually cost ${usual}`)
  }
  // Stat bonuses priced like the Stats tab (first point of each stat).
  const statLumens = statPoints(skill?.statModifiers)
  if (statLumens > 0 && statLumens > Math.max(cost, 1) * 2) {
    tone = 'warn'
    lines.push(`Its stat bonuses would cost about ${Math.round(statLumens)} Lumens on the Stats tab, more than twice the skill's price of ${cost}.`)
  }
  const power = homebrewSkillPower(skill)
  if (power > 0) {
    const applyTo = skill.defaultApplyTo || ''
    const multi = applyTo === 'allEnemies' || applyTo === 'area' || targetsFromText(skill.desc) > 1
    const medians = tierMedians()
    const sameShape = medians[`${tier}|${multi ? 'multi' : 'single'}`]
    const med = sameShape || medians[`${tier}|${multi ? 'single' : 'multi'}`]
    if (med) {
      const ratio = power / med
      const peerLabel = sameShape ? (multi ? 'area' : 'single-target') : 'damage'
      lines.push(`Damage power ${r1(power)} vs about ${r1(med)} for built-in Tier ${tier} ${peerLabel} attacks (dice + stat, x targets, + status effects).`)
      if (ratio >= 2) { tone = 'warn'; headlineParts.push(`about ${r1(ratio)}x stronger than a typical Tier ${tier} attack`) }
      else if (ratio <= 0.45) { tone = 'warn'; headlineParts.push(`about ${Math.round(ratio * 100)}% of a typical Tier ${tier} attack`) }
    }
    const stamina = Number(skill.staminaCost || 0)
    if (stamina === 0 && !skill.useLimit) { tone = 'warn'; lines.push('It deals damage but costs no Stamina and has no use limit, so it can be used every turn for free.') }
  }
  const headline = headlineParts.length
    ? `Balance check: ${headlineParts.join('; ')}.`
    : power > 0 ? `Balance check: in line with Tier ${tier}.` : `Balance check: price in line with Tier ${tier}.`
  if (!power && skill?.skillType === 'activatable' && skill?.damageMode && skill.damageMode !== 'none') lines.push('Add damage dice to compare its damage with built-in skills.')
  return { tone, headline, lines }
}

/** Small HTML block for the editor and the import preview. `esc` is the app's HTML escaper. */
export function renderBalanceCheck(result, esc) {
  if (!result) return ''
  const pill = result.tone === 'warn' ? 'warn' : result.tone === 'good' ? 'good' : ''
  return `
    <div class="homebrew-balance-check" role="status">
      <p class="pill ${pill}">${result.tone === 'warn' ? '⚠️ ' : result.tone === 'good' ? '✓ ' : ''}${esc(result.headline)}</p>
      ${result.lines.length ? `<ul class="subtle">${result.lines.map(line => `<li>${esc(line)}</li>`).join('')}</ul>` : ''}
    </div>
  `
}
