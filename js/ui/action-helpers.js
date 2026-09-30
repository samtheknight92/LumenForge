/**
 * Small helpers shared by the action modules.
 */
import { state, activeCharacter } from '../core/state.js'
import { save } from '../core/storage.js'
import { render } from './render.js'
import { invalidateCharacterCache } from '../character/character.js'
import { syncUrlState } from '../core/url-state.js'

export function touch(character, partial = { header: true, sidebar: true, content: true, actionBar: true }) {
  if (character) invalidateCharacterCache(character)
  save()
  render(partial)
  syncUrlState()
}

export function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function silentCharacterSave(character) {
  if (character) invalidateCharacterCache(character)
  save()
}

export function characterById(characterId) {
  if (!characterId) return activeCharacter()
  return state.characters.find(row => row.id === characterId) || null
}
