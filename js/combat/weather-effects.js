import { getEffect } from '../character/character.js'
import { elementsFromFusionType } from '../skills/fusion-nav.js'

const ELEMENT_SET = new Set([
  'fire', 'ice', 'lightning', 'thunder', 'earth', 'wind', 'water', 'darkness', 'light'
])

const ELEMENT_LABELS = {
  fire: 'Fire',
  ice: 'Ice',
  lightning: 'Lightning',
  thunder: 'Lightning',
  water: 'Water',
  earth: 'Earth',
  wind: 'Wind',
  darkness: 'Darkness',
  light: 'Light'
}

export function normalizeWeatherElement(value) {
  const key = String(value || '').trim().toLowerCase()
  if (key === 'thunder') return 'lightning'
  return key
}

export function resolveSkillElements(skill) {
  if (!skill) return []
  const elements = new Set()
  const elementalType = normalizeWeatherElement(skill.elementalType)
  if (elementalType && ELEMENT_SET.has(elementalType)) elements.add(elementalType)

  const sub = String(skill.subcategory || '').toLowerCase()
  const normalizedSub = normalizeWeatherElement(sub)
  if (skill.category === 'magic' && normalizedSub && ELEMENT_SET.has(normalizedSub)) {
    elements.add(normalizedSub)
  }

  for (const element of elementsFromFusionType(skill.fusionType)) {
    const normalized = normalizeWeatherElement(element)
    if (normalized && ELEMENT_SET.has(normalized)) elements.add(normalized)
  }

  return [...elements]
}

export function isMagicCategorySkill(skill) {
  if (!skill) return false
  if (skill.category === 'magic') return true
  if (/^spell:/i.test(String(skill.desc || ''))) return true
  const fusion = String(skill.fusionType || '').toLowerCase()
  if (!fusion) return false
  const parts = fusion.split('_')
  if (parts.length >= 2 && ELEMENT_SET.has(parts[0]) && ELEMENT_SET.has(parts[1])) return true
  if (parts.length >= 2 && ELEMENT_SET.has(parts[1])) return true
  return false
}

export function manaStormAccuracyDelta(combatRoll) {
  const roll = Number(combatRoll)
  if (!Number.isFinite(roll) || roll < 1 || roll > 6) return 0
  if (roll <= 2) return -2
  if (roll >= 5) return 2
  return 0
}

function elementAccuracyForWeather(effect, skill) {
  const mods = effect?.elementAccuracyModifiers
  if (!mods || typeof mods !== 'object') return 0
  const elements = resolveSkillElements(skill)
  let total = 0
  for (const element of elements) {
    const key = normalizeWeatherElement(element)
    if (mods[key] != null) total += Number(mods[key] || 0)
  }
  return total
}

/** Per-skill accuracy bonuses from active weather (element-scoped + mana storm). */
export function weatherAccuracyBonuses(character, skill) {
  if (!character || !skill) return []
  const rows = []
  for (const entry of character.weatherEffects || []) {
    const effect = getEffect(entry.effectId)
    if (!effect || String(effect.type || '').toLowerCase() !== 'weather') continue

    if (effect.manaStorm && isMagicCategorySkill(skill)) {
      const delta = manaStormAccuracyDelta(entry.combatRoll)
      if (delta) {
        rows.push({
          stat: 'accuracy',
          value: delta,
          sourceId: effect.id,
          sourceName: `${effect.name} (weather)`
        })
      }
      continue
    }

    const elementDelta = elementAccuracyForWeather(effect, skill)
    if (elementDelta) {
      rows.push({
        stat: 'accuracy',
        value: elementDelta,
        sourceId: effect.id,
        sourceName: `${effect.name} (weather)`
      })
    }
  }
  return rows
}

export function weatherProcessTurnStaminaDrain(character) {
  let total = 0
  for (const entry of character?.weatherEffects || []) {
    const effect = getEffect(entry.effectId)
    const drain = Number(effect?.processTurnStaminaDrain || 0)
    if (drain > 0) total += drain
  }
  return total
}

function formatSigned(value) {
  const n = Number(value)
  if (!n) return '0'
  return n > 0 ? `+${n}` : String(n)
}

export function weatherGameplayLines(effect) {
  if (!effect) return []
  const lines = []
  const globalMods = effect.statModifiers || {}
  const globalBits = Object.entries(globalMods)
    .filter(([, value]) => value)
    .map(([stat, value]) => `${formatSigned(value)} ${stat}`)
  if (globalBits.length) lines.push(`Everyone: ${globalBits.join(', ')}`)

  const elementMods = effect.elementAccuracyModifiers || {}
  for (const [element, value] of Object.entries(elementMods)) {
    if (!value) continue
    const label = ELEMENT_LABELS[normalizeWeatherElement(element)] || element
    lines.push(`${label} skills: ${formatSigned(value)} Accuracy`)
  }

  if (effect.processTurnStaminaDrain) {
    lines.push(`End of Turn: −${effect.processTurnStaminaDrain} Stamina (apply to whole party at the table)`)
  }

  if (effect.manaStorm) {
    lines.push('Combat round: roll 1d6 — 1–2 Magic −2 Acc, 3–4 none, 5–6 Magic +2 Acc')
  }

  return lines
}
