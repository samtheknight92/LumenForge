/**
 * Effects that skills/consumables apply and players may need to track manually
 * (Add Effect picker on the Character tab).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { CAPSTONE_ACTIVATION_EFFECTS } from '../capstone-activation-effects.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..', '..')

/** One-shot or instant effects — not tracked as a status on the sheet. */
export const MANUAL_EFFECT_EXCLUDE_IDS = new Set([
  'cleave',
  'critical_chance',
  'lightning_bolt',
  'purify',
  'shadow_step',
  'clean_bandage_heal',
  'fusion_field_spark_heal',
  'lay_on_hands_heal',
  'second_wind_heal',
  'cast_fireball',
  'teleport',
  'unlock_doors',
  'climb_assistance',
  'dragon_breath',
  'light_source',
  'full_heal',
  'remove_all_debuffs',
  'remove_poison',
  'fire_damage',
  'undead_damage',
  'magic_damage',
  'fire_immunity_permanent',
  'regeneration_permanent'
])

export function isInstantHealEffect(effect) {
  if (!effect) return false
  const type = String(effect.type || '').toLowerCase()
  const duration = Number(effect.duration)
  if (/^heal_\d+$/.test(effect.id) || /^restore_stamina_\d+$/.test(effect.id)) return true
  return type.includes('heal') && !type.includes('overtime') && duration === 0
}

/** Whether a skill/consumable effect should appear in Add Effect when applied at the table. */
export function isTrackableAppliedEffect(effect) {
  if (!effect || MANUAL_EFFECT_EXCLUDE_IDS.has(effect.id)) return false
  if (isInstantHealEffect(effect)) return false
  if (String(effect.id).startsWith('permanent_')) return false
  const type = String(effect.type || '').toLowerCase()
  if (type === 'damage') return false
  if (type === 'special' && Number(effect.duration) === 0) return false
  if (type === 'utility' && Number(effect.duration) === 0) return false
  return true
}

function walkSkills(value, out = []) {
  if (Array.isArray(value)) {
    for (const skill of value) {
      if (skill && typeof skill === 'object') out.push(skill)
    }
    return out
  }
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) walkSkills(child, out)
  }
  return out
}

function walkItems(value, out = []) {
  if (Array.isArray(value)) {
    for (const child of value) walkItems(child, out)
    return out
  }
  if (value && typeof value === 'object') {
    if (value.id && value.name) out.push(value)
    for (const child of Object.values(value)) walkItems(child, out)
  }
  return out
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(root, 'data', 'json', `${name}.json`), 'utf8'))
}

function addRequired(map, effectId, source, effects) {
  const effect = effects[effectId]
  if (!effect || !isTrackableAppliedEffect(effect)) return
  if (!map.has(effectId)) map.set(effectId, new Set())
  map.get(effectId).add(source)
}

/** All effect IDs applied by built skills or consumables that belong in Add Effect. */
export function collectRequiredManualEffectIds(effects, options = {}) {
  const skills = options.skills ?? readJson('skills')
  const itemFiles = options.itemFiles ?? ['items', 'profession-items', 'discoverable-items']
  const required = new Map()

  for (const skill of walkSkills(skills)) {
    for (const row of skill.activationEffects || []) {
      addRequired(required, row.effectId, `skill:${skill.id}`, effects)
    }
  }

  for (const [skillId, rows] of Object.entries(CAPSTONE_ACTIVATION_EFFECTS)) {
    for (const row of rows) {
      addRequired(required, row.effectId, `capstone:${skillId}`, effects)
    }
  }

  for (const file of itemFiles) {
    const data = readJson(file)
    for (const item of walkItems(data)) {
      if (item.type !== 'consumable') continue
      for (const effectId of item.specialEffects || []) {
        addRequired(required, effectId, `consumable:${item.id}`, effects)
      }
    }
  }

  return required
}

export function loadPlayerManualEffectIdsFromSource() {
  const source = fs.readFileSync(path.join(root, 'js', 'effects', 'effects.js'), 'utf8')
  const match = source.match(/export const PLAYER_MANUAL_EFFECT_IDS = \[([\s\S]*?)\]/)
  if (!match) throw new Error('PLAYER_MANUAL_EFFECT_IDS not found in js/effects/effects.js')
  return [...match[1].matchAll(/'([^']+)'/g)].map(row => row[1])
}
