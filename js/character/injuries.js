/**
 * Optional Injuries (lasting wounds), switched on with the Injuries tick in
 * the Survival panel. Each time a character is Knocked down they pick up a
 * random injury that weakens a stat until the player taps Heal Injury (when
 * the GM says it has healed).
 *
 * Injuries live in character.survival.injuries as [{ uid, id }]. Every tunable
 * number lives in INJURIES so the list is easy to tweak.
 */
import { STAT_RULES } from '../core/constants.js'

export const INJURIES = [
  { id: 'broken-arm', name: 'Broken Arm', icon: '🦴', statModifiers: { strength: -2 }, desc: 'Every swing hurts. −2 Strength.' },
  { id: 'cracked-rib', name: 'Cracked Rib', icon: '🩻', statModifiers: { stamina: -3 }, desc: 'Breathing hard is agony. Max Stamina −3.' },
  { id: 'concussion', name: 'Concussion', icon: '💫', statModifiers: { accuracy: -2 }, desc: 'The world won\'t stay still. −2 Accuracy.' },
  { id: 'deep-gash', name: 'Deep Gash', icon: '🩸', statModifiers: { hp: -3 }, desc: 'It keeps reopening. Max HP −3.' },
  { id: 'twisted-ankle', name: 'Twisted Ankle', icon: '🦶', statModifiers: { speed: -1 }, desc: 'You limp along. −1 Speed (5 ft less movement).' },
  { id: 'bruised-back', name: 'Bruised Back', icon: '🛡️', statModifiers: { physicalDefence: -2 }, desc: 'You can\'t twist out of the way. −2 Physical Defence.' },
  { id: 'rattled-mind', name: 'Rattled Mind', icon: '🌀', statModifiers: { magicPower: -2 }, desc: 'Your focus keeps slipping. −2 Magic Power.' },
  { id: 'ringing-ears', name: 'Ringing Ears', icon: '🔔', statModifiers: { magicalDefence: -2 }, desc: 'Your head is still spinning. −2 Magical Defence.' }
]

export const INJURY_LABEL = {
  name: 'Injuries',
  icon: '🩹',
  help: 'Get Knocked down and you pick up a random lasting injury. It weakens you until your GM says it has healed.'
}

export function getInjury(id) {
  return INJURIES.find(row => row.id === id) || null
}

export function injuriesOn(character) {
  return Boolean(character?.survival?.on?.injuries)
}

/** Clean up saved injuries: keep known ones, give each a uid. */
export function normalizeInjuries(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(row => row && getInjury(row.id))
    .map((row, i) => ({ uid: String(row.uid || `inj-${Date.now()}-${i}`), id: row.id }))
}

function listOf(character) {
  if (!Array.isArray(character.survival.injuries)) character.survival.injuries = []
  return character.survival.injuries
}

/** Add an injury (random when no id is given). Returns the injury row, or null. */
export function addInjury(character, injuryId = null, random = Math.random) {
  if (!character?.survival) return null
  const list = listOf(character)
  let injury = injuryId ? getInjury(injuryId) : null
  if (!injury) {
    const have = new Set(list.map(row => row.id))
    const fresh = INJURIES.filter(row => !have.has(row.id))
    const pool = fresh.length ? fresh : INJURIES
    injury = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
  }
  const row = { uid: `inj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, id: injury.id }
  list.push(row)
  return { ...row, ...injury }
}

/** Called when a character is newly Knocked down. Only adds an injury when the tick is on. */
export function injureOnKnockdown(character, random = Math.random) {
  if (!injuriesOn(character)) return null
  return addInjury(character, null, random)
}

export function healInjury(character, uid) {
  const list = character?.survival?.injuries
  if (!Array.isArray(list)) return null
  const index = list.findIndex(row => row.uid === uid)
  if (index < 0) return null
  const [row] = list.splice(index, 1)
  return getInjury(row.id)
}

/** The character's current injuries, with their details. Empty when the tick is off. */
export function activeInjuries(character) {
  if (!injuriesOn(character)) return []
  return (character.survival.injuries || [])
    .map(row => {
      const injury = getInjury(row.id)
      return injury ? { ...injury, uid: row.uid } : null
    })
    .filter(Boolean)
}

/**
 * Apply injury penalties to a stats object in place, adding breakdown rows.
 * Combat stats never drop below their minimum.
 */
export function applyInjuryStats(character, stats, addRow) {
  for (const injury of activeInjuries(character)) {
    for (const [stat, value] of Object.entries(injury.statModifiers)) {
      const before = Number(stats[stat] || 0)
      const min = ['hp', 'stamina'].includes(stat) ? 1 : STAT_RULES[stat]?.min ?? -Infinity
      const after = Math.max(Math.min(before, min), before + value)
      stats[stat] = after
      addRow(stat, `${injury.name} (injury)`, after - before)
    }
  }
}

/** Short "−2 Strength" style text for an injury. */
export function injuryEffectText(injury) {
  return Object.entries(injury?.statModifiers || {})
    .map(([stat, value]) => `${value > 0 ? '+' : '−'}${Math.abs(value)} ${stat === 'hp' ? 'max HP' : stat === 'stamina' ? 'max Stamina' : STAT_RULES[stat]?.label || stat}`)
    .join(', ')
}
