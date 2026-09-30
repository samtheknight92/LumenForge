/**
 * Notes tab actions: the free-text notes, note pages and quest log.
 */
import { state, activeCharacter } from '../core/state.js'
import { save } from '../core/storage.js'
import { render } from './render.js'
import { toast, uid } from '../core/utils.js'
import { touch, silentCharacterSave, characterById } from './action-helpers.js'

export function saveNotes(value, silent = false, characterId = null) {
  const character = characterById(characterId)
  if (!character) return
  const page = activeNotePage(character)
  if (!page) return
  page.body = String(value || '')
  silentCharacterSave(character)
  state.notesDirty = false
  if (!silent) toast('Notes saved.')
  else if (character.id === state.activeId) {
    const status = document.querySelector('#notes-status')
    if (status) {
      status.textContent = 'Saved'
      status.className = 'pill good'
    }
  }
}

export function activeNotePage(character) {
  if (!character?.notePages?.length) return null
  const map = state.activeNotePageByCharacter || {}
  const activeId = map[character.id]
  return character.notePages.find(page => page.id === activeId) || character.notePages[0]
}

export function setActiveNotePage(pageId) {
  const character = activeCharacter()
  if (!character) return
  state.activeNotePageByCharacter = { ...(state.activeNotePageByCharacter || {}), [character.id]: pageId }
  save()
  render({ content: true })
}

export function addNotePage() {
  const character = activeCharacter()
  if (!character) return
  const page = { id: uid('note'), title: `Session ${character.notePages.length + 1}`, body: '' }
  character.notePages = [...(character.notePages || []), page]
  state.activeNotePageByCharacter = { ...(state.activeNotePageByCharacter || {}), [character.id]: page.id }
  touch(character)
}

export function renameNotePage(characterId, pageId, title) {
  const character = characterById(characterId)
  if (!character) return
  const page = character.notePages?.find(row => row.id === pageId)
  if (!page) return
  page.title = String(title || 'Notes').trim().slice(0, 80) || 'Notes'
  silentCharacterSave(character)
}

export function deleteNotePage(pageId) {
  const character = activeCharacter()
  if (!character || !character.notePages?.length) return
  if (character.notePages.length <= 1) return toast('Keep at least one notes page.')
  character.notePages = character.notePages.filter(row => row.id !== pageId)
  const next = activeNotePage(character)
  if (next) state.activeNotePageByCharacter = { ...(state.activeNotePageByCharacter || {}), [character.id]: next.id }
  touch(character)
}

export function saveNotePageBody(pageId, body, characterId = null) {
  const character = characterById(characterId)
  if (!character) return
  const page = character.notePages?.find(row => row.id === pageId)
  if (!page) return
  page.body = String(body || '')
  silentCharacterSave(character)
  state.notesDirty = false
}

export function addQuestEntry() {
  const character = activeCharacter()
  if (!character) return
  character.quests = [...(character.quests || []), { id: uid('quest'), name: 'New quest', giver: '', reward: '', completed: false }]
  touch(character)
}

export function updateQuestEntry(characterId, questId, field, value) {
  const character = characterById(characterId)
  if (!character) return
  const quest = character.quests?.find(row => row.id === questId)
  if (!quest) return
  if (field === 'completed') quest.completed = Boolean(value)
  else quest[field] = String(value || '').trim()
  silentCharacterSave(character)
}

export function removeQuestEntry(questId) {
  const character = activeCharacter()
  if (!character) return
  character.quests = (character.quests || []).filter(row => row.id !== questId)
  touch(character)
}
