/**
 * GM Tools actions: GM mode, premade spawning, NPC turns, initiative,
 * the encounter builder, the monster builder and the active encounter.
 */
import { state, activeCharacter } from '../core/state.js'
import { save } from '../core/storage.js'
import { render } from './render.js'
import { toast, clamp, deepClone, uid } from '../core/utils.js'
import {
  normalizeCharacter,
  fillCharacterToFullResources,
  computeStats,
  invalidateCharacterCache
} from '../character/character.js'
import { isGmMode, toggleGmMode as flipGmMode } from '../gm/gm-mode.js'
import { getPremadeCharacter } from '../character/premade-characters.js'
import { computeSkillLevel } from '../character/skill-level.js'
import { computeCombatPower } from '../character/combat-power.js'
import { allocateCharacterName } from '../character/character-naming.js'
import { buildNpcTurnSuggestions } from '../gm/gm-npc-turn.js'
import {
  startActiveEncounterFromBalancer,
  endActiveEncounter,
  nextEncounterTurn,
  prevEncounterTurn,
  advanceEncounterRound,
  removeEncounterCombatant,
  duplicateEncounterCombatant,
  markEncounterCombatantDefeated,
  getEncounterCombatant
} from '../gm/active-encounter.js'
import {
  createInitiativeEntry,
  nextTurnEntryId,
  activeInitiativeEntry,
  sortInitiativeEntries
} from '../gm/gm-initiative.js'
import {
  normalizeFolderName,
  ensureFolderRegistered,
  filterCharactersByFolder,
  FOLDER_FILTER_UNFILED
} from '../character/character-folders.js'
import {
  addEncounterEnemyPremade,
  addEncounterEnemyFromCharacter,
  addEncounterEnemyManual,
  removeEncounterEnemyRow,
  setEncounterEnemyCount as setEncounterEnemyRowCount,
  updateEncounterEnemyManual as patchEncounterEnemyManual,
  focusEncounterEnemyQuantity as setEncounterEnemyFocus,
  clearEncounterEnemies as clearEncounterEnemyRows
} from '../gm/encounter-enemies.js'
import {
  defaultGmMonsterBuilderDraft,
  generateMonsterCharacter,
  randomiseGmMonsterDraft,
  toggleBuilderSpecial,
  listBuilderTypeOptions,
  getBuilderAffinityView,
  getTemplateBuilderAffinityView
} from '../gm/gm-monster-builder.js'
import { normalizeBuilderElementId } from '../combat/elemental-affinity.js'
import { touch } from './action-helpers.js'
import { processTurn } from './combat-actions.js'

export function activateGmModeToggle() {
  const enabled = flipGmMode()
  for (const character of state.characters) invalidateCharacterCache(character)
  save()
  render({ all: true })
  toast(enabled
    ? 'GM Mode ON — all skills visible, no prerequisites, free skills & items.'
    : 'GM Mode OFF — normal rules restored.')
}

export function spawnPremadeCharacter(premadeId, count = 1) {
  if (!isGmMode()) return toast('Enable GM Mode to add premade characters.')
  const template = getPremadeCharacter(premadeId)
  if (!template) return toast('Unknown premade character.')

  const amount = Math.max(1, Math.min(10, Math.floor(Number(count) || 1)))
  const addedNames = []

  for (let i = 0; i < amount; i += 1) {
    const character = normalizeCharacter(deepClone(template))
    fillCharacterToFullResources(character)
    character.id = uid('char')
    character.name = allocateCharacterName(template.name, [
      ...state.characters.map(c => c.name),
      ...addedNames
    ])
    character.premadeId = null
    character.created = new Date().toISOString()
    character.updated = character.created
    const spawnFolder = normalizeFolderName(state.gmSpawnFolder)
    if (spawnFolder) {
      character.folder = spawnFolder
      ensureFolderRegistered(state, spawnFolder)
    }
    state.characters.push(character)
    addedNames.push(character.name)
    state.activeId = character.id
  }

  touch(state.characters.find(c => c.id === state.activeId))
  toast(amount === 1
    ? `${addedNames[0]} added to roster.`
    : `Added ${amount}× ${template.name}: ${addedNames.join(', ')}.`)
}

export function generateNpcTurn() {
  const selectedIds = state.gmNpcTurnCharacterIds.filter(id =>
    state.characters.some(character => character.id === id)
  )
  const fallbackId = activeCharacter()?.id || state.characters[0]?.id
  const ids = selectedIds.length ? selectedIds : (fallbackId ? [fallbackId] : [])
  if (!ids.length) return toast('Add characters to the roster first.')

  const characters = ids.map(id => state.characters.find(c => c.id === id)).filter(Boolean)
  state.lastNpcTurns = buildNpcTurnSuggestions(characters)
  render({ content: true })
  toast(characters.length === 1
    ? `Turn suggestion for ${characters[0].name}.`
    : `Turn suggestions for ${characters.map(c => c.name).join(', ')}.`)
}

export function toggleGmTurnCharacter(characterId, checked) {
  const ids = new Set(state.gmNpcTurnCharacterIds)
  if (checked) ids.add(characterId)
  else ids.delete(characterId)
  state.gmNpcTurnCharacterIds = [...ids]
  save()
  render({ content: true })
}

export function selectAllGmTurnCharacters() {
  state.gmNpcTurnCharacterIds = state.characters.map(c => c.id)
  render({ content: true })
}

export function clearGmTurnCharacters() {
  state.gmNpcTurnCharacterIds = []
  render({ content: true })
}

export function setGmNpcTurnFolder(folderKey) {
  state.gmNpcTurnFolder = folderKey || ''
  save()
  render({ content: true })
}

export function selectGmTurnFromFolder(folderKey) {
  const key = folderKey || state.gmNpcTurnFolder
  const characters = filterCharactersByFolder(state.characters, key)
  if (!characters.length) {
    return toast(`No characters in “${initiativeFolderLabel(key)}”.`)
  }
  state.gmNpcTurnFolder = key
  state.gmNpcTurnCharacterIds = characters.map(character => character.id)
  save()
  render({ content: true })
}

function initiativeFolderLabel(folderKey) {
  return folderKey === FOLDER_FILTER_UNFILED ? 'Unfiled' : folderKey
}

export function addInitiativeEntry(name = '') {
  state.initiativeTracker.entries.push(createInitiativeEntry(name))
  save()
  render({ content: true })
}

export function addRosterToInitiativeTracker() {
  addCharactersToInitiativeTracker(state.characters)
}

export function addFolderToInitiativeTracker(folderKey) {
  const characters = filterCharactersByFolder(state.characters, folderKey)
  if (!characters.length) return toast(`No characters in “${initiativeFolderLabel(folderKey)}”.`)
  addCharactersToInitiativeTracker(characters, initiativeFolderLabel(folderKey))
}

function addCharactersToInitiativeTracker(characters, folderLabel = '') {
  const existing = new Set(state.initiativeTracker.entries.map(entry => entry.name.toLowerCase()))
  let added = 0
  for (const character of characters) {
    if (existing.has(character.name.toLowerCase())) continue
    state.initiativeTracker.entries.push(createInitiativeEntry(character.name, ''))
    existing.add(character.name.toLowerCase())
    added += 1
  }
  save()
  render({ content: true })
  if (added) {
    toast(folderLabel
      ? `Added ${added} from “${folderLabel}”.`
      : `Added ${added} character${added === 1 ? '' : 's'} to initiative.`)
    return
  }
  toast(folderLabel
    ? `Everyone in “${folderLabel}” is already listed.`
    : 'Everyone on the roster is already listed.')
}

export function removeInitiativeEntry(entryId) {
  state.initiativeTracker.entries = state.initiativeTracker.entries.filter(entry => entry.id !== entryId)
  if (state.initiativeTracker.activeEntryId === entryId) {
    state.initiativeTracker.activeEntryId = sortInitiativeEntries(state.initiativeTracker.entries)[0]?.id || null
  }
  save()
  render({ content: true })
}

export function updateInitiativeEntry(entryId, patch) {
  const entry = state.initiativeTracker.entries.find(item => item.id === entryId)
  if (!entry) return
  if (patch.name != null) entry.name = String(patch.name)
  if (patch.initiative != null) {
    entry.initiative = patch.initiative === '' ? '' : Number(patch.initiative)
  }
  save()
  render({ content: true })
}

export function setInitiativeActiveEntry(entryId) {
  state.initiativeTracker.activeEntryId = entryId || null
  save()
  render({ content: true })
}

export function nextInitiativeTurn() {
  const { entries, activeEntryId } = state.initiativeTracker
  if (!entries.length) return toast('Add combatants to the initiative list first.')
  const nextId = nextTurnEntryId(entries, activeEntryId)
  state.initiativeTracker.activeEntryId = nextId
  save()
  render({ content: true })
  const active = activeInitiativeEntry(entries, nextId)
  if (active) toast(`${active.name}'s turn.`)
}

export function resetInitiativeRound() {
  const first = sortInitiativeEntries(state.initiativeTracker.entries)[0]
  state.initiativeTracker.activeEntryId = first?.id || null
  save()
  render({ content: true })
  if (first) toast(`Round reset — ${first.name} goes first.`)
}

export function clearInitiativeTracker() {
  state.initiativeTracker = { entries: [], activeEntryId: null }
  save()
  render({ content: true })
  toast('Initiative list cleared.')
}

export function addEncounterPartyMemberFromRoster(characterId) {
  const character = state.characters.find(c => c.id === characterId)
  if (!character) return toast('Pick a character from the roster first.')
  state.encounterParty.push({
    id: uid('party'),
    name: character.name,
    skillLevel: computeSkillLevel(character).skillLevel,
    combatPower: computeCombatPower(character).combatPower,
    source: 'roster',
    characterId: character.id
  })
  save()
  render({ content: true })
}

export function addEncounterPartyMemberManual() {
  state.encounterParty.push({
    id: uid('party'),
    name: `Player ${state.encounterParty.length + 1}`,
    skillLevel: 0,
    combatPower: 1,
    source: 'manual',
    characterId: null
  })
  save()
  render({ content: true })
}

export function removeEncounterPartyMember(rowId) {
  state.encounterParty = state.encounterParty.filter(row => row.id !== rowId)
  save()
  render({ content: true })
}

export function updateEncounterPartyMember(rowId, field, value) {
  const row = state.encounterParty.find(r => r.id === rowId)
  if (!row) return
  if (field === 'name') row.name = String(value || '').trim() || row.name
  else if (field === 'skillLevel') row.skillLevel = Math.max(0, Math.round(Number(value) || 0))
  else if (field === 'combatPower') row.combatPower = Math.max(0, Math.round(Number(value) || 0))
  save()
  render({ content: true })
}

export function clearEncounterParty() {
  if (!state.encounterParty.length) return
  state.encounterParty = []
  save()
  render({ content: true })
  toast('Party cleared.')
}

export function addEncounterEnemy(premadeId) {
  const result = addEncounterEnemyPremade(premadeId)
  if (!result.ok) return toast(result.message)
  save()
  render({ content: true })
}

export function removeEncounterEnemy(rowId) {
  removeEncounterEnemyRow(rowId)
  save()
  render({ content: true })
}

export function setEncounterEnemyCount(rowId, count) {
  setEncounterEnemyRowCount(rowId, count)
  save()
  render({ content: true })
}

export function updateEncounterEnemyManual(rowId, field, value) {
  patchEncounterEnemyManual(rowId, field, value)
  save()
  render({ content: true })
}

export function addEncounterEnemyFromRoster(characterId) {
  const result = addEncounterEnemyFromCharacter(characterId)
  if (!result.ok) return toast(result.message)
  save()
  render({ content: true })
  toast('Added to encounter.')
}

export function addEncounterEnemyManualRow() {
  addEncounterEnemyManual('Enemy', 10)
  save()
  render({ content: true })
}

export function clearEncounterEnemies() {
  if (!state.encounterEnemies.length) return
  clearEncounterEnemyRows()
  save()
  render({ content: true })
  toast('Encounter cleared.')
}

export function focusEncounterEnemyQuantity(rowId) {
  setEncounterEnemyFocus(rowId)
  render({ content: true })
}

export function updateGmMonsterBuilderDraft(patch = {}) {
  const draft = { ...state.gmMonsterBuilderDraft, ...patch }
  if (patch.category && patch.category !== state.gmMonsterBuilderDraft.category) {
    const types = listBuilderTypeOptions(patch.category)
    if (!types.some(row => row.id === draft.typeId)) {
      draft.typeId = types[0]?.id || ''
    }
  }
  state.gmMonsterBuilderDraft = draft
  save()
  render({ content: true })
}

export function generateGmMonsterPreview() {
  if (!isGmMode()) return toast('Enable GM Mode first.')
  const draft = state.gmMonsterBuilderDraft
  const character = generateMonsterCharacter(draft)
  state.gmMonsterBuilderDraft = { ...draft, previewCharacter: character }
  save()
  render({ content: true })
  toast(`Preview: ${character.name} (TL ${character.gmBuilder?.achievedThreatLevel ?? '?'})`)
}

export function randomiseGmMonsterBuilder() {
  if (!isGmMode()) return toast('Enable GM Mode first.')
  state.gmMonsterBuilderDraft = {
    ...randomiseGmMonsterDraft(state.gmMonsterBuilderDraft),
    previewCharacter: null
  }
  generateGmMonsterPreview()
}

export function resetGmMonsterBuilder() {
  state.gmMonsterBuilderDraft = defaultGmMonsterBuilderDraft()
  save()
  render({ content: true })
  toast('Builder reset.')
}

export function saveGmMonsterToRoster() {
  if (!isGmMode()) return toast('Enable GM Mode first.')
  const draft = state.gmMonsterBuilderDraft
  const preview = draft.previewCharacter || generateMonsterCharacter(draft)
  const character = normalizeCharacter(deepClone(preview))
  fillCharacterToFullResources(character)
  character.id = uid('char')
  character.name = allocateCharacterName(character.name, state.characters.map(c => c.name))
  character.premadeId = null
  character.created = new Date().toISOString()
  character.updated = character.created
  const spawnFolder = normalizeFolderName(state.gmSpawnFolder)
  if (spawnFolder) {
    character.folder = spawnFolder
    ensureFolderRegistered(state, spawnFolder)
  }
  state.characters.push(character)
  state.activeId = character.id
  touch(state.characters.find(c => c.id === character.id))
  save()
  render({ all: true })
  toast(`${character.name} added to roster.`)
  return character.id
}

export function saveGmMonsterToRosterAndEncounter() {
  const characterId = saveGmMonsterToRoster()
  if (!characterId) return
  addEncounterEnemyFromCharacter(characterId)
  save()
  render({ content: true })
  toast('Saved to roster and encounter.')
}

export function duplicateGmMonsterPreview() {
  const preview = state.gmMonsterBuilderDraft.previewCharacter
  if (!preview) return toast('Generate a preview first.')
  state.gmMonsterBuilderDraft = {
    ...state.gmMonsterBuilderDraft,
    name: `${preview.name} copy`,
    previewCharacter: null
  }
  save()
  render({ content: true })
}

export function addGmMonsterCustomAction() {
  const text = prompt('Custom action (shown in notes):', '')
  if (text == null) return
  const trimmed = String(text).trim()
  if (!trimmed) return
  const customActions = [...(state.gmMonsterBuilderDraft.customActions || []), trimmed]
  updateGmMonsterBuilderDraft({ customActions, previewCharacter: null })
}

export function addGmMonsterCustomTrait() {
  const text = prompt('Custom trait (shown in notes):', '')
  if (text == null) return
  const trimmed = String(text).trim()
  if (!trimmed) return
  const customTraits = [...(state.gmMonsterBuilderDraft.customTraits || []), trimmed]
  updateGmMonsterBuilderDraft({ customTraits, previewCharacter: null })
}

export function removeGmMonsterCustomAction(index) {
  const customActions = [...(state.gmMonsterBuilderDraft.customActions || [])]
  if (index < 0 || index >= customActions.length) return
  customActions.splice(index, 1)
  updateGmMonsterBuilderDraft({ customActions, previewCharacter: null })
}

export function removeGmMonsterCustomTrait(index) {
  const customTraits = [...(state.gmMonsterBuilderDraft.customTraits || [])]
  if (index < 0 || index >= customTraits.length) return
  customTraits.splice(index, 1)
  updateGmMonsterBuilderDraft({ customTraits, previewCharacter: null })
}

function cloneGmAffinityEdits(edits) {
  return {
    resistances: [...(edits?.resistances || [])],
    weaknesses: [...(edits?.weaknesses || [])],
    immunities: [...(edits?.immunities || [])]
  }
}

export function addGmMonsterAffinity(kind, elementId) {
  const id = normalizeBuilderElementId(elementId)
  if (!id) return toast('Pick a valid element.')
  if (kind !== 'resistances' && kind !== 'weaknesses') return

  const draft = state.gmMonsterBuilderDraft
  const view = getBuilderAffinityView(draft)
  const current = kind === 'weaknesses' ? view.weaknesses : view.resistances
  if (current.some(row => row.id === id)) return toast('Already on the list.')

  const affinityAdded = cloneGmAffinityEdits(draft.affinityAdded)
  const affinityRemoved = cloneGmAffinityEdits(draft.affinityRemoved)
  const opposite = kind === 'resistances' ? 'weaknesses' : 'resistances'
  const templateView = getTemplateBuilderAffinityView(draft)

  affinityRemoved[kind] = affinityRemoved[kind].filter(element => element !== id)
  if (!templateView[kind].some(row => row.id === id)) {
    affinityAdded[kind] = [...affinityAdded[kind], id]
  }

  const oppositeList = opposite === 'weaknesses' ? view.weaknesses : view.resistances
  if (oppositeList.some(row => row.id === id)) {
    if (!affinityRemoved[opposite].includes(id)) affinityRemoved[opposite] = [...affinityRemoved[opposite], id]
  } else {
    affinityAdded[opposite] = affinityAdded[opposite].filter(element => element !== id)
  }

  updateGmMonsterBuilderDraft({ affinityAdded, affinityRemoved, previewCharacter: null })
}

export function removeGmMonsterAffinity(kind, elementId) {
  const id = normalizeBuilderElementId(elementId)
  if (!id) return
  if (kind !== 'resistances' && kind !== 'weaknesses') return

  const draft = state.gmMonsterBuilderDraft
  const templateView = getTemplateBuilderAffinityView(draft)
  const affinityAdded = cloneGmAffinityEdits(draft.affinityAdded)
  const affinityRemoved = cloneGmAffinityEdits(draft.affinityRemoved)

  if (templateView[kind].some(row => row.id === id)) {
    if (!affinityRemoved[kind].includes(id)) affinityRemoved[kind] = [...affinityRemoved[kind], id]
  } else {
    affinityAdded[kind] = affinityAdded[kind].filter(element => element !== id)
  }

  updateGmMonsterBuilderDraft({ affinityAdded, affinityRemoved, previewCharacter: null })
}

export function toggleGmMonsterBuilderSpecial(specialId) {
  state.gmMonsterBuilderDraft = toggleBuilderSpecial(state.gmMonsterBuilderDraft, specialId)
  state.gmMonsterBuilderDraft.previewCharacter = null
  save()
  render({ content: true })
}

export function startActiveEncounter() {
  startActiveEncounterFromBalancer()
  save()
  render({ content: true })
}

export function endActiveEncounterAction() {
  endActiveEncounter({ confirmEnd: true })
  save()
  render({ content: true })
}

export function encounterNextTurn() {
  nextEncounterTurn()
  save()
  render({ content: true })
}

export function encounterPrevTurn() {
  prevEncounterTurn()
  save()
  render({ content: true })
}

export function encounterAdvanceRound() {
  advanceEncounterRound()
  save()
  render({ content: true })
}

export function encounterProcessActiveTurn() {
  const enc = state.activeEncounter
  const combatant = getEncounterCombatant(enc?.activeCombatantId)
  if (!combatant) return toast("No active enemy.")
  processTurn(combatant)
  save()
  render({ content: true })
}

export function encounterProcessTurn(id) {
  const combatant = getEncounterCombatant(id)
  if (!combatant) return
  processTurn(combatant)
  save()
  render({ content: true })
}

export function encounterAdjustResource(id, resource, amount) {
  const combatant = getEncounterCombatant(id)
  if (!combatant) return
  const stats = computeStats(combatant)
  if (resource === "hp") combatant.hp = clamp(combatant.hp + amount, 0, stats.hp)
  if (resource === "stamina") combatant.stamina = clamp(combatant.stamina + amount, 0, stats.stamina)
  save()
  render({ content: true })
}

export function encounterToggleDefeated(id) {
  const c = getEncounterCombatant(id)
  if (!c) return
  markEncounterCombatantDefeated(id, !c.defeated)
  save()
  render({ content: true })
}

export function encounterRemove(id) {
  removeEncounterCombatant(id)
  save()
  render({ content: true })
}

export function encounterDuplicate(id) {
  duplicateEncounterCombatant(id)
  save()
  render({ content: true })
}

export function encounterToggleExpand(id) {
  state.encounterExpandedIds = state.encounterExpandedIds || {}
  state.encounterExpandedIds[id] = !state.encounterExpandedIds[id]
  render({ content: true })
}
