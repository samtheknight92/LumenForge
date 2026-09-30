/**
 * Homebrew editor actions: item, skill, race, background, recipe and
 * monster-template drafts, plus homebrew import, export and granting.
 */
import { state } from '../core/state.js'
import { saveNow } from '../core/storage.js'
import { render } from './render.js'
import { toast } from '../core/utils.js'
import { getSkill } from '../skills/skills.js'
import { addItemToInventory } from '../items/items.js'
import { isGmMode } from '../gm/gm-mode.js'
import {
  upsertHomebrewItem,
  deleteHomebrewItem,
  archiveHomebrewItem,
  restoreHomebrewItem,
  duplicateHomebrewItem,
  buildHomebrewPack,
  mergeHomebrewImport,
  listHomebrewItems,
  getHomebrewItem,
  listHomebrewSkills,
  getHomebrewSkill,
  draftFromHomebrewItem,
  draftFromHomebrewSkill,
  emptyHomebrewDraft,
  emptyHomebrewSkillDraft,
  charactersUsingHomebrewItem,
  charactersUsingHomebrewSkill,
  stripHomebrewFromCharacters,
  parseHomebrewDraftForm,
  parseHomebrewSkillDraftForm,
  syncHomebrewDraftFromForm,
  syncHomebrewSkillDraftFromForm,
  upsertHomebrewSkill,
  deleteHomebrewSkill,
  archiveHomebrewSkill,
  duplicateHomebrewSkill,
  listHomebrewRaces,
  getHomebrewRace,
  draftFromHomebrewRace,
  emptyHomebrewRaceDraft,
  upsertHomebrewRace,
  deleteHomebrewRace,
  duplicateHomebrewRace,
  charactersUsingHomebrewRace,
  homebrewSkillsForRace,
  syncHomebrewRaceDraftFromForm,
  listHomebrewBackgrounds,
  getHomebrewBackground,
  draftFromHomebrewBackground,
  emptyHomebrewBackgroundDraft,
  upsertHomebrewBackground,
  deleteHomebrewBackground,
  archiveHomebrewBackground,
  duplicateHomebrewBackground,
  charactersUsingHomebrewBackground,
  parseHomebrewBackgroundDraftForm,
  listHomebrewRecipes,
  getHomebrewRecipe,
  draftFromHomebrewRecipe,
  emptyHomebrewRecipeDraft,
  upsertHomebrewRecipe,
  archiveHomebrewRecipe,
  parseHomebrewRecipeDraftForm,
  emptyHomebrewMonsterDraft,
  draftFromHomebrewMonsterTemplate,
  upsertHomebrewMonsterTemplate,
  deleteHomebrewMonsterTemplate,
  duplicateHomebrewMonsterTemplate,
  listHomebrewMonsterTypes,
  listHomebrewMonsterRoles,
  listHomebrewMonsterSpecials,
  getHomebrewMonsterType,
  getHomebrewMonsterRole,
  getHomebrewMonsterSpecial,
  homebrewMonsterDraftToUpsertPayload,
  syncHomebrewMonsterDraftFromForm,
  normalizeAffinityTagList
} from '../homebrew/homebrew.js'
import { touch, downloadJson } from './action-helpers.js'

function syncHomebrewEditorFromDom() {
  syncHomebrewDraftFromForm()
}

export function startHomebrewEditor(itemId = null) {
  state.homebrewEditorKind = 'item'
  state.homebrewSkillEditingId = null
  state.homebrewSkillDraft = null
  state.homebrewRaceEditingId = null
  state.homebrewRaceDraft = null
  state.homebrewRaceShowEffectPicker = false
  state.homebrewRaceEffectSearch = ''
  state.homebrewSkillShowEffectPicker = false
  state.homebrewSkillEffectSearch = ''
  state.homebrewSkillShowUseEffectPicker = false
  state.homebrewSkillUseEffectSearch = ''
  state.homebrewEditingId = itemId
  state.homebrewDraft = itemId ? draftFromHomebrewItem(getHomebrewItem(itemId)) : emptyHomebrewDraft()
  state.homebrewShowEffectPicker = false
  state.homebrewEffectSearch = ''
  state.homebrewShowCounterOptions = Boolean(state.homebrewDraft?.counterLabel)
  render({ content: true })
}

export function startHomebrewSkillEditor(skillId = null) {
  state.homebrewEditorKind = 'skill'
  state.homebrewEditingId = null
  state.homebrewDraft = null
  state.homebrewRaceEditingId = null
  state.homebrewRaceDraft = null
  state.homebrewRaceShowEffectPicker = false
  state.homebrewRaceEffectSearch = ''
  state.homebrewShowEffectPicker = false
  state.homebrewEffectSearch = ''
  state.homebrewShowCounterOptions = false
  state.homebrewSkillEditingId = skillId
  state.homebrewSkillDraft = skillId ? draftFromHomebrewSkill(getHomebrewSkill(skillId)) : emptyHomebrewSkillDraft()
  state.homebrewSkillShowEffectPicker = false
  state.homebrewSkillEffectSearch = ''
  state.homebrewSkillShowUseEffectPicker = false
  state.homebrewSkillUseEffectSearch = ''
  render({ content: true })
}

export function startHomebrewRaceEditor(raceId = null) {
  state.homebrewEditorKind = 'race'
  state.homebrewEditingId = null
  state.homebrewDraft = null
  state.homebrewSkillEditingId = null
  state.homebrewSkillDraft = null
  state.homebrewShowEffectPicker = false
  state.homebrewEffectSearch = ''
  state.homebrewShowCounterOptions = false
  state.homebrewSkillShowEffectPicker = false
  state.homebrewSkillEffectSearch = ''
  state.homebrewSkillShowUseEffectPicker = false
  state.homebrewSkillUseEffectSearch = ''
  state.homebrewRaceEditingId = raceId
  state.homebrewRaceDraft = raceId ? draftFromHomebrewRace(getHomebrewRace(raceId)) : emptyHomebrewRaceDraft()
  state.homebrewRaceShowEffectPicker = false
  state.homebrewRaceEffectSearch = ''
  render({ content: true })
}

export function cancelHomebrewEditor() {
  state.homebrewEditorKind = null
  state.homebrewEditingId = null
  state.homebrewDraft = null
  state.homebrewShowEffectPicker = false
  state.homebrewEffectSearch = ''
  state.homebrewShowCounterOptions = false
  state.homebrewSkillEditingId = null
  state.homebrewSkillDraft = null
  state.homebrewSkillShowEffectPicker = false
  state.homebrewSkillEffectSearch = ''
  state.homebrewSkillShowUseEffectPicker = false
  state.homebrewSkillUseEffectSearch = ''
  state.homebrewRaceEditingId = null
  state.homebrewRaceDraft = null
  state.homebrewRaceShowEffectPicker = false
  state.homebrewRaceEffectSearch = ''
  state.homebrewMonsterEditingId = null
  state.homebrewMonsterDraft = null
  state.homebrewMonsterEditorKind = null
  state.homebrewBackgroundEditingId = null
  state.homebrewBackgroundDraft = null
  state.homebrewRecipeEditingId = null
  state.homebrewRecipeDraft = null
  render({ content: true })
}

export function toggleHomebrewEffectPicker() {
  syncHomebrewEditorFromDom()
  state.homebrewShowEffectPicker = !state.homebrewShowEffectPicker
  render({ content: true })
}

export function toggleHomebrewCounterOptions() {
  syncHomebrewEditorFromDom()
  state.homebrewShowCounterOptions = !state.homebrewShowCounterOptions
  render({ content: true })
}

export function clearHomebrewDraftCounter() {
  syncHomebrewEditorFromDom()
  if (!state.homebrewDraft) return
  state.homebrewDraft = {
    ...state.homebrewDraft,
    counterLabel: '',
    counterDefault: 0,
    counterMax: null,
    blockUnequipWithCounter: false,
    blockRemoveWithCounter: false,
    counterEquippedOnly: false,
    counterRuleOperator: 'above',
    counterRuleValue: 0
  }
  state.homebrewShowCounterOptions = false
  render({ content: true })
}

export function toggleHomebrewDraftEffect(effectId) {
  syncHomebrewEditorFromDom()
  if (!state.homebrewDraft || !effectId) return
  const selected = new Set(state.homebrewDraft.specialEffects || [])
  if (selected.has(effectId)) selected.delete(effectId)
  else selected.add(effectId)
  state.homebrewDraft.specialEffects = [...selected]
  render({ content: true })
}

export function removeHomebrewDraftEffect(effectId) {
  syncHomebrewEditorFromDom()
  if (!state.homebrewDraft) return
  state.homebrewDraft.specialEffects = (state.homebrewDraft.specialEffects || []).filter(id => id !== effectId)
  render({ content: true })
}

export function saveHomebrewDraftFromForm(form) {
  try {
    const draft = parseHomebrewDraftForm(form)
    if (state.homebrewEditingId) draft.id = state.homebrewEditingId
    draft.specialEffects = [...(state.homebrewDraft?.specialEffects || [])]
    const item = upsertHomebrewItem(draft)
    state.homebrewEditorKind = null
    state.homebrewEditingId = null
    state.homebrewDraft = null
    state.homebrewShowEffectPicker = false
    state.homebrewEffectSearch = ''
    state.homebrewShowCounterOptions = false
    render({ content: true })
    toast(`Saved ${item.name}.`)
  } catch (error) {
    toast(error.message || 'Could not save homebrew item.')
  }
}

export function setHomebrewImportOption(field, value) {
  if (!state.homebrewImportPreview) return
  state.homebrewImportPreview[field] = value
  render({ content: true })
}

export function cancelHomebrewImportPreview() {
  state.homebrewImportPreview = null
  render({ content: true })
}

export function confirmHomebrewImportPreview() {
  const block = state.homebrewImportPreview
  if (!block?.parsed) return
  const replace = block.mode === 'replace'
  const skipConflicts = Boolean(block.skipConflicts)
  const result = mergeHomebrewImport(block.parsed, { replace, skipConflicts })
  state.homebrewImportPreview = null
  render({ all: true })
  const parts = []
  if (result.items) parts.push(`${result.items} item${result.items === 1 ? '' : 's'}`)
  if (result.skills) parts.push(`${result.skills} skill${result.skills === 1 ? '' : 's'}`)
  if (result.races) parts.push(`${result.races} race${result.races === 1 ? '' : 's'}`)
  if (result.backgrounds) parts.push(`${result.backgrounds} background${result.backgrounds === 1 ? '' : 's'}`)
  if (result.recipes) parts.push(`${result.recipes} recipe${result.recipes === 1 ? '' : 's'}`)
  if (result.monsterTypes) parts.push(`${result.monsterTypes} monster type${result.monsterTypes === 1 ? '' : 's'}`)
  if (result.monsterRoles) parts.push(`${result.monsterRoles} combat role${result.monsterRoles === 1 ? '' : 's'}`)
  if (result.monsterSpecials) parts.push(`${result.monsterSpecials} special${result.monsterSpecials === 1 ? '' : 's'}`)
  const skipped = result.skipped ? ` (${result.skipped} skipped)` : ''
  toast(`Imported ${parts.join(', ') || '0 entries'}${skipped}.`)
}

export function toggleHomebrewShowArchived() {
  state.homebrewShowArchived = !state.homebrewShowArchived
  render({ content: true })
}

export function toggleHomebrewShowDrafts() {
  state.homebrewShowDrafts = !state.homebrewShowDrafts
  render({ content: true })
}

export function removeHomebrewItem(itemId) {
  const item = getHomebrewItem(itemId)
  if (!item) return
  const users = charactersUsingHomebrewItem(itemId)
  if (users.length) {
    const choice = prompt(
      `${item.name} is on ${users.length} character sheet(s).\n\nType ARCHIVE to hide it (sheets keep working), STRIP to remove from all sheets then delete, or cancel.`,
      'ARCHIVE'
    )
    if (!choice) return
    const action = choice.trim().toUpperCase()
    if (action === 'ARCHIVE') {
      archiveHomebrewItem(itemId, true)
      render({ content: true })
      return toast(`${item.name} archived.`)
    }
    if (action === 'STRIP') {
      stripHomebrewFromCharacters(itemId, 'item')
      deleteHomebrewItem(itemId)
      delete state.homebrewSelected[itemId]
      saveNow()
      render({ content: true })
      return toast(`${item.name} removed from characters and deleted.`)
    }
    return
  }
  if (!confirm(`Archive homebrew item "${item.name}"?\n\nOK = Archive (recommended)\nCancel = keep`)) {
    if (confirm(`Permanently delete "${item.name}" instead?`)) {
      deleteHomebrewItem(itemId)
      delete state.homebrewSelected[itemId]
      render({ content: true })
      toast('Homebrew item deleted.')
    }
    return
  }
  archiveHomebrewItem(itemId, true)
  render({ content: true })
  toast(`${item.name} archived.`)
}

export function restoreHomebrewItemEntry(itemId) {
  if (!restoreHomebrewItem(itemId)) return toast('Could not restore item.')
  render({ content: true })
  toast('Item restored.')
}

export function copyHomebrewItem(itemId) {
  const copy = duplicateHomebrewItem(itemId)
  if (!copy) return toast('Could not duplicate item.')
  render({ content: true })
  toast(`Duplicated as ${copy.name}.`)
}

export function toggleHomebrewSelect(itemId, checked) {
  if (checked) state.homebrewSelected[itemId] = true
  else delete state.homebrewSelected[itemId]
  render({ content: true })
}

export function grantHomebrewItem(itemId, characterId) {
  const item = getHomebrewItem(itemId)
  const targetId = characterId || state.activeId
  const character = state.characters.find(row => row.id === targetId)
  if (!item || !character) return toast('Pick a character first.')
  if (!isGmMode() && targetId !== state.activeId) return toast('You can only grant to your active character.')
  addItemToInventory(character, itemId, 1)
  touch(character)
  toast(`${item.name} added to ${character.name}.`)
}

export function grantHomebrewSkill(skillId, characterId) {
  const skill = getHomebrewSkill(skillId)
  const targetId = characterId || state.activeId
  const character = state.characters.find(row => row.id === targetId)
  if (!skill || !character) return toast('Pick a character first.')
  if (!isGmMode() && targetId !== state.activeId) return toast('You can only grant to your active character.')
  if (character.skills.includes(skillId)) return toast(`${character.name} already knows ${skill.name}.`)
  character.skills.push(skillId)
  touch(character)
  toast(`${skill.name} granted to ${character.name}.`)
}

export function syncHomebrewSkillEditorFromDom() {
  syncHomebrewSkillDraftFromForm()
}

export function toggleHomebrewSkillEffectPicker() {
  syncHomebrewSkillEditorFromDom()
  state.homebrewSkillShowEffectPicker = !state.homebrewSkillShowEffectPicker
  render({ content: true })
}

export function toggleHomebrewSkillDraftEffect(effectId) {
  syncHomebrewSkillEditorFromDom()
  if (!state.homebrewSkillDraft || !effectId) return
  const selected = new Set(state.homebrewSkillDraft.specialEffects || [])
  if (selected.has(effectId)) selected.delete(effectId)
  else selected.add(effectId)
  state.homebrewSkillDraft.specialEffects = [...selected]
  render({ content: true })
}

export function removeHomebrewSkillDraftEffect(effectId) {
  syncHomebrewSkillEditorFromDom()
  if (!state.homebrewSkillDraft) return
  state.homebrewSkillDraft.specialEffects = (state.homebrewSkillDraft.specialEffects || []).filter(id => id !== effectId)
  render({ content: true })
}

export function toggleHomebrewSkillUseEffectPicker() {
  syncHomebrewSkillEditorFromDom()
  state.homebrewSkillShowUseEffectPicker = !state.homebrewSkillShowUseEffectPicker
  render({ content: true })
}

export function toggleHomebrewSkillUseDraftEffect(effectId) {
  syncHomebrewSkillEditorFromDom()
  if (!state.homebrewSkillDraft || !effectId) return
  const list = [...(state.homebrewSkillDraft.activationEffects || [])]
  const idx = list.findIndex(row => row.effectId === effectId)
  if (idx >= 0) list.splice(idx, 1)
  else list.push({ effectId, duration: 3, potency: undefined })
  state.homebrewSkillDraft.activationEffects = list
  render({ content: true })
}

export function removeHomebrewSkillUseDraftEffect(effectId) {
  syncHomebrewSkillEditorFromDom()
  if (!state.homebrewSkillDraft) return
  state.homebrewSkillDraft.activationEffects = (state.homebrewSkillDraft.activationEffects || [])
    .filter(row => row.effectId !== effectId)
  render({ content: true })
}

export function saveHomebrewSkillDraftFromForm(form) {
  try {
    const draft = parseHomebrewSkillDraftForm(form, state.homebrewSkillDraft)
    if (state.homebrewSkillEditingId) draft.id = state.homebrewSkillEditingId
    draft.specialEffects = [...(state.homebrewSkillDraft?.specialEffects || [])]
    draft.lockWeaponKinds = [...(draft.lockWeaponKinds || [])]
    draft.lockRaces = [...(draft.lockRaces || [])]
    draft.lockSkills = [...(draft.lockSkills || [])]
    const skill = upsertHomebrewSkill(draft)
    state.homebrewEditorKind = null
    state.homebrewSkillEditingId = null
    state.homebrewSkillDraft = null
    state.homebrewSkillShowEffectPicker = false
    state.homebrewSkillEffectSearch = ''
    state.homebrewSkillShowUseEffectPicker = false
    state.homebrewSkillUseEffectSearch = ''
    render({ content: true })
    toast(`Saved ${skill.name}.`)
  } catch (error) {
    toast(error.message || 'Could not save homebrew skill.')
  }
}

export function removeHomebrewSkill(skillId) {
  const skill = getHomebrewSkill(skillId)
  if (!skill) return
  const users = charactersUsingHomebrewSkill(skillId)
  if (users.length) {
    const choice = prompt(
      `${skill.name} is on ${users.length} character sheet(s).\n\nType ARCHIVE to hide it, STRIP to remove from all sheets then delete, or cancel.`,
      'ARCHIVE'
    )
    if (!choice) return
    const action = choice.trim().toUpperCase()
    if (action === 'ARCHIVE') {
      archiveHomebrewSkill(skillId, true)
      render({ content: true })
      return toast(`${skill.name} archived.`)
    }
    if (action === 'STRIP') {
      stripHomebrewFromCharacters(skillId, 'skill')
      deleteHomebrewSkill(skillId)
      delete state.homebrewSkillSelected[skillId]
      saveNow()
      render({ content: true })
      return toast(`${skill.name} removed from characters and deleted.`)
    }
    return
  }
  if (confirm(`Archive homebrew skill "${skill.name}"?`)) {
    archiveHomebrewSkill(skillId, true)
    render({ content: true })
    return toast(`${skill.name} archived.`)
  }
  if (confirm(`Permanently delete "${skill.name}" instead?`)) {
    deleteHomebrewSkill(skillId)
    delete state.homebrewSkillSelected[skillId]
    render({ content: true })
    toast('Homebrew skill deleted.')
  }
}

export function copyHomebrewSkill(skillId) {
  const copy = duplicateHomebrewSkill(skillId)
  if (!copy) return toast('Could not duplicate skill.')
  render({ content: true })
  toast(`Duplicated as ${copy.name}.`)
}

export function toggleHomebrewSkillSelect(skillId, checked) {
  if (checked) state.homebrewSkillSelected[skillId] = true
  else delete state.homebrewSkillSelected[skillId]
  render({ content: true })
}

export function toggleHomebrewBackgroundSelect(backgroundId, checked) {
  if (checked) state.homebrewBackgroundSelected[backgroundId] = true
  else delete state.homebrewBackgroundSelected[backgroundId]
  render({ content: true })
}

export function toggleHomebrewRecipeSelect(recipeId, checked) {
  if (checked) state.homebrewRecipeSelected[recipeId] = true
  else delete state.homebrewRecipeSelected[recipeId]
  render({ content: true })
}

export function copyHomebrewBackground(backgroundId) {
  const copy = duplicateHomebrewBackground(backgroundId)
  if (!copy) return toast('Could not duplicate background.')
  render({ content: true })
  toast(`Duplicated as ${copy.name}.`)
}

export function setHomebrewListFilter(filter) {
  state.homebrewListFilter = filter
  render({ content: true })
}

export function exportHomebrewSelection(all = false) {
  const itemIds = all ? listHomebrewItems().map(item => item.id) : Object.keys(state.homebrewSelected)
  const skillIds = all ? listHomebrewSkills().map(skill => skill.id) : Object.keys(state.homebrewSkillSelected)
  const raceIds = all ? listHomebrewRaces().map(race => race.id) : Object.keys(state.homebrewRaceSelected)
  const backgroundIds = all ? listHomebrewBackgrounds().map(row => row.id) : Object.keys(state.homebrewBackgroundSelected || {})
  const recipeIds = all ? listHomebrewRecipes().map(row => row.id) : Object.keys(state.homebrewRecipeSelected || {})
  const selectedMonsterIds = all
    ? [
      ...listHomebrewMonsterTypes().map(row => row.id),
      ...listHomebrewMonsterRoles().map(row => row.id),
      ...listHomebrewMonsterSpecials().map(row => row.id)
    ]
    : Object.keys(state.homebrewMonsterSelected)
  const exportMonsterTypeIds = selectedMonsterIds.filter(id => getHomebrewMonsterType(id))
  const exportMonsterRoleIds = selectedMonsterIds.filter(id => getHomebrewMonsterRole(id))
  const exportMonsterSpecialIds = selectedMonsterIds.filter(id => getHomebrewMonsterSpecial(id))

  if (!itemIds.length && !skillIds.length && !raceIds.length && !backgroundIds.length && !recipeIds.length
    && !exportMonsterTypeIds.length && !exportMonsterRoleIds.length && !exportMonsterSpecialIds.length) {
    return toast('Select at least one homebrew entry to export.')
  }

  let includeDependencies = false
  if (!all && skillIds.length) {
    const missingRaceIds = new Set()
    for (const skillId of skillIds) {
      const skill = getHomebrewSkill(skillId)
      if (skill?.category === 'racial' && skill.subcategory?.startsWith('custom_')) {
        if (!raceIds.includes(skill.subcategory) && getHomebrewRace(skill.subcategory)) {
          missingRaceIds.add(skill.subcategory)
        }
      }
    }
    if (missingRaceIds.size) {
      const names = [...missingRaceIds].map(id => getHomebrewRace(id)?.name || id).join(', ')
      includeDependencies = confirm(
        `Some selected skills need homebrew race(s): ${names}.\n\nOK = include those races in the pack.\nCancel = export skills only (import may be incomplete).`
      )
      if (includeDependencies) {
        for (const id of missingRaceIds) {
          if (!raceIds.includes(id)) raceIds.push(id)
        }
      }
    }
  }

  const name = prompt('Pack name (optional):', 'Homebrew pack') || 'Homebrew pack'
  const author = prompt('Author name (optional):', '') || ''
  const pack = buildHomebrewPack({
    name,
    author,
    itemIds,
    skillIds,
    raceIds,
    backgroundIds,
    recipeIds,
    monsterTypeIds: exportMonsterTypeIds,
    monsterRoleIds: exportMonsterRoleIds,
    monsterSpecialIds: exportMonsterSpecialIds
  })
  const total = itemIds.length + skillIds.length + raceIds.length + backgroundIds.length + recipeIds.length
    + exportMonsterTypeIds.length + exportMonsterRoleIds.length + exportMonsterSpecialIds.length
  downloadJson(pack, `${name.replace(/[^a-z0-9_.-]+/gi, '_') || 'homebrew'}.json`)
  toast(`Exported ${total} entr${total === 1 ? 'y' : 'ies'}.`)
}

export function exportHomebrewCampaignPack() {
  const itemIds = listHomebrewItems().filter(row => row.approvalStatus === 'approved').map(row => row.id)
  const skillIds = listHomebrewSkills().filter(row => row.approvalStatus === 'approved').map(row => row.id)
  const raceIds = listHomebrewRaces().filter(row => row.approvalStatus === 'approved').map(row => row.id)
  const backgroundIds = listHomebrewBackgrounds().filter(row => row.approvalStatus === 'approved').map(row => row.id)
  const recipeIds = listHomebrewRecipes().filter(row => row.approvalStatus === 'approved').map(row => row.id)
  const monsterTypeIds = listHomebrewMonsterTypes().filter(row => row.approvalStatus === 'approved').map(row => row.id)
  const monsterRoleIds = listHomebrewMonsterRoles().filter(row => row.approvalStatus === 'approved').map(row => row.id)
  const monsterSpecialIds = listHomebrewMonsterSpecials().filter(row => row.approvalStatus === 'approved').map(row => row.id)
  const total = itemIds.length + skillIds.length + raceIds.length + backgroundIds.length + recipeIds.length
    + monsterTypeIds.length + monsterRoleIds.length + monsterSpecialIds.length
  if (!total) return toast('No approved homebrew to export.')
  const name = prompt('Campaign pack name:', 'Campaign pack') || 'Campaign pack'
  const pack = buildHomebrewPack({
    name,
    author: '',
    itemIds,
    skillIds,
    raceIds,
    backgroundIds,
    recipeIds,
    monsterTypeIds,
    monsterRoleIds,
    monsterSpecialIds,
    approvedOnly: true
  })
  downloadJson(pack, `${name.replace(/[^a-z0-9_.-]+/gi, '_') || 'campaign'}.json`)
  toast(`Exported ${total} approved entr${total === 1 ? 'y' : 'ies'}.`)
}

export function startHomebrewBackgroundEditor(backgroundId = null) {
  state.homebrewEditorKind = 'background'
  state.homebrewBackgroundEditingId = backgroundId
  state.homebrewBackgroundDraft = backgroundId
    ? draftFromHomebrewBackground(getHomebrewBackground(backgroundId))
    : emptyHomebrewBackgroundDraft()
  cancelHomebrewEditorSideEffects()
  render({ content: true })
}

export function saveHomebrewBackgroundDraftFromForm(form) {
  try {
    const draft = parseHomebrewBackgroundDraftForm(form)
    if (state.homebrewBackgroundEditingId) draft.id = state.homebrewBackgroundEditingId
    const background = upsertHomebrewBackground(draft)
    state.homebrewEditorKind = null
    state.homebrewBackgroundEditingId = null
    state.homebrewBackgroundDraft = null
    render({ content: true })
    toast(`Saved ${background.name}.`)
  } catch (error) {
    toast(error.message || 'Could not save background.')
  }
}

export function removeHomebrewBackground(backgroundId) {
  const background = getHomebrewBackground(backgroundId)
  if (!background) return
  const users = charactersUsingHomebrewBackground(backgroundId)
  if (users.length) {
    const choice = prompt(`${background.name} is used by ${users.length} character(s). Type ARCHIVE or STRIP.`, 'ARCHIVE')
    if (!choice) return
    if (choice.trim().toUpperCase() === 'STRIP') {
      stripHomebrewFromCharacters(backgroundId, 'background')
      deleteHomebrewBackground(backgroundId)
      saveNow()
      render({ content: true })
      return toast('Background removed from characters and deleted.')
    }
    if (choice.trim().toUpperCase() === 'ARCHIVE') {
      archiveHomebrewBackground(backgroundId, true)
      render({ content: true })
      return toast('Background archived.')
    }
    return
  }
  if (confirm(`Archive background "${background.name}"?`)) {
    archiveHomebrewBackground(backgroundId, true)
    render({ content: true })
    return toast('Background archived.')
  }
  if (confirm(`Permanently delete "${background.name}"?`)) {
    deleteHomebrewBackground(backgroundId)
    render({ content: true })
    toast('Background deleted.')
  }
}

export function startHomebrewRecipeEditor(recipeId = null) {
  state.homebrewEditorKind = 'recipe'
  state.homebrewRecipeEditingId = recipeId
  state.homebrewRecipeDraft = recipeId ? draftFromHomebrewRecipe(getHomebrewRecipe(recipeId)) : emptyHomebrewRecipeDraft()
  cancelHomebrewEditorSideEffects()
  render({ content: true })
}

export function saveHomebrewRecipeDraftFromForm(form) {
  try {
    const draft = parseHomebrewRecipeDraftForm(form)
    if (state.homebrewRecipeEditingId) draft.id = state.homebrewRecipeEditingId
    const recipe = upsertHomebrewRecipe({
      ...draft,
      requiredSkills: String(draft.requiredSkillsText || '').split(/[\n,]+/).map(row => row.trim()).filter(Boolean)
    })
    state.homebrewEditorKind = null
    state.homebrewRecipeEditingId = null
    state.homebrewRecipeDraft = null
    render({ content: true })
    toast(`Saved ${recipe.name}.`)
  } catch (error) {
    toast(error.message || 'Could not save recipe.')
  }
}

export function archiveHomebrewRecipeEntry(recipeId) {
  if (!archiveHomebrewRecipe(recipeId, true)) return toast('Could not archive recipe.')
  render({ content: true })
  toast('Recipe archived.')
}

function cancelHomebrewEditorSideEffects() {
  state.homebrewEditingId = null
  state.homebrewDraft = null
  state.homebrewSkillEditingId = null
  state.homebrewSkillDraft = null
  state.homebrewRaceEditingId = null
  state.homebrewRaceDraft = null
  state.homebrewMonsterEditingId = null
  state.homebrewMonsterDraft = null
  state.homebrewMonsterEditorKind = null
}

export function saveHomebrewRaceDraftFromForm(form) {
  try {
    syncHomebrewRaceDraftFromForm(form)
    const draft = { ...state.homebrewRaceDraft }
    if (state.homebrewRaceEditingId) draft.id = state.homebrewRaceEditingId
    const race = upsertHomebrewRace({
      ...draft,
      passiveTraits: String(draft.passiveTraitsText || '').split(/\r?\n/).map(row => row.trim()).filter(Boolean),
      specialEffects: [...(draft.specialEffects || [])]
    })
    state.homebrewEditorKind = null
    state.homebrewRaceEditingId = null
    state.homebrewRaceDraft = null
    state.homebrewRaceShowEffectPicker = false
    state.homebrewRaceEffectSearch = ''
    render({ content: true })
    toast(`Saved race "${race.name}".`)
  } catch (error) {
    toast(error.message || 'Could not save homebrew race.')
  }
}

export function removeHomebrewRace(raceId) {
  const race = getHomebrewRace(raceId)
  if (!race) return
  const users = charactersUsingHomebrewRace(raceId)
  const linkedSkills = homebrewSkillsForRace(raceId)
  if (users.length) {
    if (!confirm(`Delete "${race.name}"? ${users.length} character${users.length === 1 ? '' : 's'} use this race.`)) return
  } else if (linkedSkills.length) {
    if (!confirm(`Delete "${race.name}"? ${linkedSkills.length} racial skill${linkedSkills.length === 1 ? '' : 's'} are tied to it.`)) return
  } else if (!confirm(`Delete homebrew race "${race.name}"?`)) return
  deleteHomebrewRace(raceId)
  delete state.homebrewRaceSelected[raceId]
  render({ content: true })
  toast('Homebrew race deleted.')
}

export function copyHomebrewRace(raceId) {
  const copy = duplicateHomebrewRace(raceId)
  if (!copy) return toast('Could not duplicate race.')
  render({ content: true })
  toast(`Duplicated as ${copy.name}.`)
}

export function startHomebrewMonsterEditor(kind = 'monsterTypes', templateId = null) {
  state.homebrewEditorKind = kind
  state.homebrewMonsterEditorKind = kind
  state.homebrewEditingId = null
  state.homebrewDraft = null
  state.homebrewSkillEditingId = null
  state.homebrewSkillDraft = null
  state.homebrewRaceEditingId = null
  state.homebrewRaceDraft = null
  state.homebrewMonsterEditingId = templateId
  state.homebrewMonsterShowSkillPicker = false
  state.homebrewMonsterSkillSearch = ''
  state.homebrewMonsterDraft = templateId
    ? draftFromHomebrewMonsterTemplate(kind, templateId)
    : emptyHomebrewMonsterDraft(kind)
  render({ content: true })
}

export function syncHomebrewMonsterEditorFromDom() {
  syncHomebrewMonsterDraftFromForm()
}

export function toggleHomebrewMonsterSkillPicker() {
  syncHomebrewMonsterEditorFromDom()
  state.homebrewMonsterShowSkillPicker = !state.homebrewMonsterShowSkillPicker
  render({ content: true })
}

export function toggleHomebrewMonsterDraftSkill(skillId) {
  syncHomebrewMonsterEditorFromDom()
  if (!state.homebrewMonsterDraft || !skillId || !getSkill(skillId)) return
  const ids = new Set(state.homebrewMonsterDraft.skillIds || [])
  if (ids.has(skillId)) ids.delete(skillId)
  else ids.add(skillId)
  state.homebrewMonsterDraft.skillIds = [...ids]
  render({ content: true })
}

export function removeHomebrewMonsterDraftSkill(skillId) {
  syncHomebrewMonsterEditorFromDom()
  if (!state.homebrewMonsterDraft) return
  state.homebrewMonsterDraft.skillIds = (state.homebrewMonsterDraft.skillIds || []).filter(id => id !== skillId)
  render({ content: true })
}

function toggleHomebrewMonsterDraftTag(kind, tag) {
  syncHomebrewMonsterEditorFromDom()
  if (!state.homebrewMonsterDraft || !tag) return
  const list = [...(state.homebrewMonsterDraft[kind] || [])]
  const idx = list.indexOf(tag)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(tag)
  state.homebrewMonsterDraft[kind] = normalizeAffinityTagList(list)
  render({ content: true })
}

export function addHomebrewMonsterDraftAffinity(kind, rawTag) {
  syncHomebrewMonsterEditorFromDom()
  if (!state.homebrewMonsterDraft) return
  const tag = normalizeAffinityTagList([rawTag])[0]
  if (!tag) return toast('Pick a valid tag.')
  const list = state.homebrewMonsterDraft[kind] || []
  if (list.includes(tag)) return toast('Already on the list.')
  const opposite = kind === 'resistances' ? 'weaknesses' : kind === 'weaknesses' ? 'resistances' : null
  if (opposite) {
    state.homebrewMonsterDraft[opposite] = (state.homebrewMonsterDraft[opposite] || []).filter(row => row !== tag)
  }
  state.homebrewMonsterDraft[kind] = normalizeAffinityTagList([...list, tag])
  render({ content: true })
}

export function removeHomebrewMonsterDraftAffinity(kind, tag) {
  syncHomebrewMonsterEditorFromDom()
  if (!state.homebrewMonsterDraft || !tag) return
  state.homebrewMonsterDraft[kind] = (state.homebrewMonsterDraft[kind] || []).filter(row => row !== tag)
  render({ content: true })
}

export function toggleHomebrewMonsterDraftImmunity(tag) {
  toggleHomebrewMonsterDraftTag('immunities', tag)
}

export function saveHomebrewMonsterDraftFromForm(form) {
  try {
    syncHomebrewMonsterDraftFromForm(form)
    const kind = state.homebrewMonsterEditorKind || 'monsterTypes'
    const draft = state.homebrewMonsterDraft
    if (!draft?.name?.trim()) throw new Error('Name is required.')
    if (state.homebrewMonsterEditingId) draft.id = state.homebrewMonsterEditingId
    const row = upsertHomebrewMonsterTemplate(homebrewMonsterDraftToUpsertPayload(draft), kind)
    state.homebrewEditorKind = null
    state.homebrewMonsterEditorKind = null
    state.homebrewMonsterEditingId = null
    state.homebrewMonsterDraft = null
    state.homebrewMonsterShowSkillPicker = false
    state.homebrewMonsterSkillSearch = ''
    render({ content: true })
    toast(`Saved ${row.name}.`)
  } catch (error) {
    toast(error.message || 'Could not save template.')
  }
}

export function removeHomebrewMonsterTemplate(kind, templateId) {
  const getters = {
    monsterTypes: getHomebrewMonsterType,
    monsterRoles: getHomebrewMonsterRole,
    monsterSpecials: getHomebrewMonsterSpecial
  }
  const row = getters[kind]?.(templateId)
  if (!row) return
  if (!confirm(`Delete "${row.name}"?`)) return
  deleteHomebrewMonsterTemplate(kind, templateId)
  delete state.homebrewMonsterSelected[templateId]
  render({ content: true })
  toast('Template deleted.')
}

export function copyHomebrewMonsterTemplate(kind, templateId) {
  const copy = duplicateHomebrewMonsterTemplate(kind, templateId)
  if (!copy) return toast('Could not duplicate template.')
  render({ content: true })
  toast(`Duplicated as ${copy.name}.`)
}

export function toggleHomebrewMonsterSelect(templateId, checked) {
  if (checked) state.homebrewMonsterSelected[templateId] = true
  else delete state.homebrewMonsterSelected[templateId]
  render({ content: true })
}

export function toggleHomebrewRaceSelect(raceId, checked) {
  if (checked) state.homebrewRaceSelected[raceId] = true
  else delete state.homebrewRaceSelected[raceId]
  render({ content: true })
}

export function syncHomebrewRaceEditorFromDom() {
  syncHomebrewRaceDraftFromForm()
}

export function toggleHomebrewRaceEffectPicker() {
  syncHomebrewRaceEditorFromDom()
  state.homebrewRaceShowEffectPicker = !state.homebrewRaceShowEffectPicker
  render({ content: true })
}

export function toggleHomebrewRaceDraftEffect(effectId) {
  syncHomebrewRaceEditorFromDom()
  if (!state.homebrewRaceDraft || !effectId) return
  const selected = new Set(state.homebrewRaceDraft.specialEffects || [])
  if (selected.has(effectId)) selected.delete(effectId)
  else selected.add(effectId)
  state.homebrewRaceDraft.specialEffects = [...selected]
  render({ content: true })
}

export function removeHomebrewRaceDraftEffect(effectId) {
  syncHomebrewRaceEditorFromDom()
  if (!state.homebrewRaceDraft) return
  state.homebrewRaceDraft.specialEffects = (state.homebrewRaceDraft.specialEffects || []).filter(id => id !== effectId)
  render({ content: true })
}
