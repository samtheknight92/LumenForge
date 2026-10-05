/**
 * Survival tracker actions: on/off ticks, eating and drinking, Stress,
 * Travel and Pass Time.
 */
import { activeCharacter } from '../core/state.js'
import { toast } from '../core/utils.js'
import { getItem } from '../core/cache.js'
import { computeStats, invalidateCharacterCache } from '../character/character.js'
import {
  SURVIVAL_LABELS,
  SURVIVAL_RULES,
  SURVIVAL_TRACKERS,
  ensureSurvival,
  adjustSurvivalValue,
  applyTravel,
  applyPassTime,
  applyNourishment,
  nourishmentActionLabel
} from '../character/survival.js'
import { addInjury, healInjury, injuryEffectText } from '../character/injuries.js'
import { touch } from './action-helpers.js'

/** Keep current HP / Stamina within the (possibly changed) maximums. */
function settle(character) {
  invalidateCharacterCache(character)
  const stats = computeStats(character)
  character.hp = Math.min(character.hp, stats.hp)
  character.stamina = Math.min(character.stamina, stats.stamina)
  touch(character)
}

export function setSurvivalTracker(key, on) {
  const character = activeCharacter()
  if (!character || !SURVIVAL_TRACKERS.includes(key)) return
  const survival = ensureSurvival(character)
  survival.on[key] = Boolean(on)
  if (on) survival.collapsed = false
  settle(character)
  toast(`${SURVIVAL_LABELS[key].name} tracking ${on ? 'on' : 'off'}.`)
}

export function healInjuryAction(uid) {
  const character = activeCharacter()
  if (!character) return
  const injury = healInjury(character, uid)
  if (!injury) return
  settle(character)
  toast(`${injury.icon} ${injury.name} healed.`)
}

/** Add an injury the GM describes (random when nothing is picked). */
export function addInjuryAction(injuryId) {
  const character = activeCharacter()
  if (!character) return
  ensureSurvival(character)
  const injury = addInjury(character, injuryId || null)
  if (!injury) return
  settle(character)
  toast(`${injury.icon} ${injury.name}: ${injuryEffectText(injury)}.`)
}

export function toggleSurvivalPanel() {
  const character = activeCharacter()
  if (!character) return
  const survival = ensureSurvival(character)
  survival.collapsed = !survival.collapsed
  touch(character, { content: true })
}

export function adjustSurvival(key, delta) {
  const character = activeCharacter()
  if (!character) return
  const changed = adjustSurvivalValue(character, key, delta)
  settle(character)
  if (key === 'hunger' && delta === SURVIVAL_RULES.eat) toast(`You eat. Hunger +${changed} (now ${character.survival.hunger}).`)
  else if (key === 'thirst' && delta === SURVIVAL_RULES.drink) toast(`You drink. Thirst +${changed} (now ${character.survival.thirst}).`)
}

export function travel(metres) {
  const character = activeCharacter()
  if (!character) return
  const m = Math.floor(Number(metres) || 0)
  if (m <= 0) return toast('Type how far you travelled in metres first (the GM will tell you).')
  const note = applyTravel(character, m)
  settle(character)
  toast(note ? `Travelled ${m.toLocaleString()} m: ${note}.` : `Travelled ${m.toLocaleString()} m. Not far enough to get hungrier or thirstier.`)
}

export function passTime(hours, mode) {
  const character = activeCharacter()
  if (!character) return
  const h = Math.round((Number(hours) || 0) * 2) / 2
  if (h <= 0) return toast('Type how many hours pass first.')
  const label = mode === 'sleeping' ? 'Slept' : 'Waited'
  const note = applyPassTime(character, h, mode === 'sleeping' ? 'sleeping' : 'waiting')
  settle(character)
  toast(`${label} ${h} hour${h === 1 ? '' : 's'}${note ? `: ${note}` : ''}.`)
}

/** Eat or drink one of an inventory stack. */
export function consumeForSurvival(entryUid) {
  const character = activeCharacter()
  if (!character) return
  const entry = character.inventory.find(row => row.uid === entryUid)
  const item = entry && getItem(entry.itemId)
  if (!item) return
  const verb = nourishmentActionLabel(character, item)
  if (!verb) return toast(`${item.name} won't help the trackers you have on.`)
  if (entry.locked) return toast('This item is locked. Unlock it first.')
  const note = applyNourishment(character, item)
  if ((entry.qty || 1) > 1) entry.qty -= 1
  else {
    for (const slot of Object.keys(character.equipped || {})) {
      if (character.equipped[slot] === entry.uid) character.equipped[slot] = null
    }
    character.inventory = character.inventory.filter(row => row.uid !== entry.uid)
  }
  settle(character)
  toast(`${verb === 'Eat' ? 'Ate' : 'Drank'} ${item.name}${note ? `: ${note}` : ''}.`)
}
