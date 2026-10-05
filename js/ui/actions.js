import { DEFAULT_STATS, STAT_RULES, SAVE_VERSION, HOMEBREW_ID_PREFIX } from '../core/constants.js'
import { getMaxStatReward } from '../character/max-stat-rewards.js'
import { state, activeCharacter } from '../core/state.js'
import { save, saveNow, serializeSave, applySavePayload, isFullSaveExport, recordFullExport } from '../core/storage.js'
import { flushPendingCharacterEdits } from '../core/pending-edits.js'
import { render } from './render.js'
import {
  toast,
  clamp,
  deepClone,
  uid,
  titleCase
} from '../core/utils.js'
import {
  createCharacter,
  normalizeCharacter,
  computeStats,
  invalidateCharacterCache,
  setRace as applyRace,
  setElementalAffinity as applyElementalAffinity
} from '../character/character.js'
import {
  getNextStatUpgradeCost,
  getLatestStatRefund,
  appendStatPurchase,
  popStatPurchase,
  isTemplateCharacter
} from '../character/stat-costs.js'
import {
  getSkill
} from '../skills/skills.js'
import { getRace } from '../core/cache.js'
import {
  getItem
} from '../items/items.js'
import {
  normalizeGil
} from './format.js'
import { syncUrlState } from '../core/url-state.js'
import {
  isGmMode
} from '../gm/gm-mode.js'
import { getBackground } from '../character/backgrounds.js'
import { allocateCharacterName } from '../character/character-naming.js'
import {
  applyHealingToCharacter,
  syncKnockoutAfterHpChange,
  isKnockedOut,
  isDead
} from '../character/knockout.js'
import { openPrintableCharacterSheet } from '../export/export-sheet.js'
import {
  openGuidedCreate as openGuidedCreateState,
  closeGuidedCreate as closeGuidedCreateState,
  finishGuidedCreate as finishGuidedCreateState,
  syncDraftFromIdentityForm
} from './guided-create.js'
import {
  normalizeFolderName,
  ensureFolderRegistered,
  setRosterFolderOpen,
  syncCharacterFolderOrder,
  characterFolder
} from '../character/character-folders.js'
import { sanitizeHomebrewItemsForPlayerExport } from '../homebrew/export-sanitize.js'
import {
  mergeHomebrewImport,
  isHomebrewPackFile,
  getHomebrewItem,
  getHomebrewSkill,
  collectHomebrewIdsFromCharacter,
  homebrewBackgroundsForExport,
  homebrewItemsForExport,
  homebrewSkillsForExport,
  getHomebrewRace,
  homebrewRacesForExport,
  getHomebrewBackground
} from '../homebrew/homebrew.js'
import { previewHomebrewImport } from '../homebrew/homebrew-import-preview.js'
import {
  touch,
  downloadJson
} from './action-helpers.js'

export function createAndSelectCharacter(name, raceId, options = {}) {
  const spawnFolder = isGmMode() ? normalizeFolderName(state.gmSpawnFolder) : ''
  if (spawnFolder && !options.folder) options = { ...options, folder: spawnFolder }
  const character = createCharacter(name, raceId, options)
  if (character.folder) ensureFolderRegistered(state, character.folder)
  state.characters.push(character)
  state.activeId = character.id
  touch(character)
  toast(`${character.name} created.`)
  return character
}

export function setCharacterFolder(characterId, folderName) {
  const character = state.characters.find(c => c.id === characterId)
  if (!character) return
  const folder = normalizeFolderName(folderName)
  character.folder = folder
  if (folder) ensureFolderRegistered(state, folder)
  touch(character, { sidebar: true })
}

export function createCharacterFolder(name) {
  const folder = ensureFolderRegistered(state, name)
  if (!folder) return toast('Folder name cannot be empty.')
  setRosterFolderOpen(state, folder, true)
  touch(null, { sidebar: true })
  toast(`Folder “${folder}” created — move characters into it from the Move menu on each card.`)
}

export function rememberRosterFolderOpen(sectionKey, open) {
  setRosterFolderOpen(state, sectionKey, open)
  save()
}

export function setGmSpawnFolder(folderName) {
  state.gmSpawnFolder = normalizeFolderName(folderName)
  if (state.gmSpawnFolder) ensureFolderRegistered(state, state.gmSpawnFolder)
  save()
}

export function moveCharacterFolder(folderName, direction) {
  const folder = normalizeFolderName(folderName)
  if (!folder) return
  syncCharacterFolderOrder(state)
  const order = [...state.characterFolderOrder]
  const idx = order.indexOf(folder)
  if (idx < 0) return
  const target = direction === 'up' ? idx - 1 : idx + 1
  if (target < 0 || target >= order.length) {
    return toast(direction === 'up' ? 'Folder is already at the top.' : 'Folder is already at the bottom.')
  }
  ;[order[idx], order[target]] = [order[target], order[idx]]
  state.characterFolderOrder = order
  state.characterFolderNames = [...order]
  touch(null, { sidebar: true })
}

export function copyCharacterFolder(folderName) {
  const source = normalizeFolderName(folderName)
  if (!source) return
  const suggested = `${source} (copy)`
  const input = prompt(`Copy folder “${source}” as:`, suggested)
  if (input == null) return
  const dest = ensureFolderRegistered(state, input)
  if (!dest) return toast('Folder name cannot be empty.')
  if (dest === source) return toast('Pick a different name for the copy.')

  const originals = state.characters.filter(c => characterFolder(c) === source)
  const added = []
  for (const original of originals) {
    const copy = normalizeCharacter(deepClone(original))
    copy.id = uid('char')
    copy.name = allocateCharacterName(original.name, [
      ...state.characters.map(c => c.name),
      ...added
    ])
    copy.folder = dest
    copy.premadeId = null
    copy.created = new Date().toISOString()
    copy.updated = copy.created
    state.characters.push(copy)
    added.push(copy.name)
  }

  setRosterFolderOpen(state, dest, true)
  touch(null, { sidebar: true })
  toast(originals.length
    ? `Copied ${originals.length} character${originals.length === 1 ? '' : 's'} to “${dest}”.`
    : `Empty folder “${dest}” created.`)
}

export function deleteCharacterFolder(folderName) {
  const folder = normalizeFolderName(folderName)
  if (!folder) return
  const count = state.characters.filter(c => characterFolder(c) === folder).length
  const note = count
    ? `${count} character${count === 1 ? '' : 's'} will move to Unfiled.`
    : 'This empty folder will be removed.'
  if (!confirm(`Delete folder “${folder}”? ${note}`)) return

  for (const character of state.characters) {
    if (characterFolder(character) === folder) character.folder = ''
  }
  syncCharacterFolderOrder(state)
  state.characterFolderOrder = state.characterFolderOrder.filter(name => name !== folder)
  state.characterFolderNames = [...state.characterFolderOrder]
  if (state.characterFolderOpen) delete state.characterFolderOpen[folder]
  if (state.gmSpawnFolder === folder) state.gmSpawnFolder = ''
  touch(null, { sidebar: true })
  toast(`Folder “${folder}” deleted.`)
}

export function selectCharacter(id) {
  flushPendingCharacterEdits()
  state.activeId = id
  touch(null, { sidebar: true, header: true, content: true, actionBar: true })
}

export function setRace(raceId) {
  const character = activeCharacter()
  if (!character) return
  applyRace(character, raceId)
  touch(character)
  toast(`Race updated.`)
}

export function setElementalAffinity(affinity) {
  const character = activeCharacter()
  if (!character) return
  applyElementalAffinity(character, affinity)
  touch(character)
  toast(character.elementalAffinity ? `Elemental affinity: ${titleCase(character.elementalAffinity)}.` : 'Elemental affinity cleared.')
}

/** GM Mode — add recipe output to inventory (no skills, materials, or craft metadata). */
export function upgradeStat(stat) {
  const character = activeCharacter()
  const rule = STAT_RULES[stat]
  if (!character || !rule) return
  if (character.stats[stat] >= rule.max) return toast(`${rule.label} is already at its cap.`)
  const gm = isGmMode()
  const nextCost = getNextStatUpgradeCost(character, stat)
  if (!gm && character.lumens < nextCost) return toast(`Not enough lumens for that upgrade (need ${nextCost}).`)
  const wasBelowCap = character.stats[stat] < rule.max
  character.stats[stat] += 1
  if (gm) {
    // Free GM edits do not create refundable history.
  } else {
    character.lumens -= nextCost
    appendStatPurchase(character, stat, nextCost)
  }
  if (stat === 'hp') character.hp += 1
  if (stat === 'stamina') character.stamina += 1
  touch(character)
  const reward = getMaxStatReward(stat)
  if (wasBelowCap && character.stats[stat] >= rule.max && reward) {
    toast(`Hidden reward unlocked: ${reward.icon} ${reward.name}. See Skill & Gear Effects on the Character tab.`)
  }
}

export function refundStat(stat) {
  const character = activeCharacter()
  const rule = STAT_RULES[stat]
  if (!character || !rule) return
  if (character.stats[stat] <= DEFAULT_STATS[stat]) return toast(`${rule.label} is already at its starting value.`)
  const gm = isGmMode()
  if (!gm && isTemplateCharacter(character)) {
    return toast('Template / premade stats cannot be refunded for Lumens. Enable GM Mode to edit freely.')
  }
  const refundAmount = gm ? 0 : getLatestStatRefund(character, stat)
  if (!gm && refundAmount <= 0) {
    return toast(`No refundable ${rule.label} purchases left (template or GM free points).`)
  }
  character.stats[stat] -= 1
  if (!gm) {
    popStatPurchase(character, stat)
    character.lumens += refundAmount
  }
  const computed = computeStats(character)
  character.hp = clamp(character.hp, 0, computed.hp)
  character.stamina = clamp(character.stamina, 0, computed.stamina)
  touch(character)
}

export function setResource(resource, value) {
  const character = activeCharacter()
  if (!character) return
  const stats = computeStats(character)
  const cleanValue = Math.floor(Number(value || 0))
  if (resource === 'hp') {
    if (isDead(character) && cleanValue > 0) {
      return toast('Dead. If your GM brings them back, tap ☠️ Dead on your HP bar, then Bring back.')
    }
    const previousHp = Number(character.hp || 0)
    const wasKo = isKnockedOut(character)
    if (wasKo && cleanValue > previousHp) {
      const result = applyHealingToCharacter(character, cleanValue - previousHp, computeStats)
      touch(character, { header: true, content: true, actionBar: true })
      if (result.revived) toast(`Back on your feet with ${result.healed} HP.`)
      return
    }
    character.hp = clamp(cleanValue, 0, stats.hp)
    const sync = syncKnockoutAfterHpChange(character, { previousHp })
    if (sync.injury) {
      // An injury can lower max Stamina, so keep current Stamina inside it.
      invalidateCharacterCache(character)
      character.stamina = clamp(character.stamina, 0, computeStats(character).stamina)
    }
    touch(character, { header: true, content: true, actionBar: true })
    // Being Knocked down opens its own popup, so only getting back up needs a toast.
    if (sync.revived) toast('Back on your feet!')
    return
  }
  if (resource === 'stamina') character.stamina = clamp(cleanValue, 0, stats.stamina)
  if (resource === 'lumens') character.lumens = Math.max(0, cleanValue)
  touch(character, { header: true, content: true, actionBar: true })
}

export function adjustResource(resource, amount) {
  const character = activeCharacter()
  if (!character) return
  const current = resource === 'hp' ? character.hp : resource === 'stamina' ? character.stamina : character.lumens
  setResource(resource, current + Number(amount || 0))
}

export function fillResource(resource) {
  const character = activeCharacter()
  if (!character) return
  const stats = computeStats(character)
  if (resource === 'hp') setResource('hp', stats.hp)
  if (resource === 'stamina') setResource('stamina', stats.stamina)
}

export function adjustCurrency(amount) {
  const character = activeCharacter()
  if (!character) return
  character.gil = normalizeGil(character.gil) + Math.floor(Number(amount || 0))
  if (character.gil < 0) character.gil = 0
  touch(character, { header: true, content: true })
}

export function setGil(value) {
  const character = activeCharacter()
  if (!character) return
  character.gil = normalizeGil(value)
  touch(character, { header: true, content: true })
}

/** @deprecated Use setGil. */
export function setCurrencyPart(_part, value) {
  setGil(value)
}

export function heal(amount = 9999) {
  const character = activeCharacter()
  if (!character) return
  const result = applyHealingToCharacter(character, amount, computeStats)
  if (result.blocked) return toast(result.reason === 'Dead' ? 'Dead — healing does not revive.' : 'Cannot heal.')
  touch(character, { header: true, content: true, actionBar: true })
  if (result.revived) toast(`Revived — restored ${result.healed} HP. Recovery streaks cleared.`)
}

export function restoreStamina(amount = 9999) {
  const character = activeCharacter()
  if (!character) return
  const stats = computeStats(character)
  character.stamina = clamp(character.stamina + amount, 0, stats.stamina)
  touch(character, { header: true, content: true })
}

export function duplicateCharacter(id) {
  const original = state.characters.find(character => character.id === id)
  if (!original) return
  const copy = normalizeCharacter(deepClone(original))
  copy.id = uid('char')
  copy.name = allocateCharacterName(original.name, state.characters.map(c => c.name))
  copy.premadeId = null
  copy.created = new Date().toISOString()
  state.characters.push(copy)
  state.activeId = copy.id
  touch(copy)
  toast(`${copy.name} added to roster.`)
}

export function deleteCharacter(id) {
  const character = state.characters.find(c => c.id === id)
  if (!character) return
  if (!confirm(`Delete ${character.name}? This cannot be undone.`)) return
  flushPendingCharacterEdits()
  state.characters = state.characters.filter(c => c.id !== id)
  if (state.activeId === id) state.activeId = state.characters[0]?.id || null
  touch(null)
  toast('Character deleted.')
}

export function exportData(all = true) {
  if (all) {
    const payload = serializeSave()
    downloadJson(payload, 'lumenforge-save.json')
    recordFullExport()
    return
  }
  const character = activeCharacter()
  if (!character) return toast('No character to export.')
  const homebrewIds = [...collectHomebrewIdsFromCharacter(character)]
  const exportRaceIds = []
  const exportItemIds = []
  const exportSkillIds = []
  const exportBackgroundIds = []
  for (const id of homebrewIds) {
    if (getHomebrewRace(id)) exportRaceIds.push(id)
    else if (getHomebrewSkill(id)) exportSkillIds.push(id)
    else if (getHomebrewBackground(id)) exportBackgroundIds.push(id)
    else if (getHomebrewItem(id)) exportItemIds.push(id)
  }
  const payload = {
    version: SAVE_VERSION,
    characters: [normalizeCharacter(deepClone(character))],
    homebrew: {
      items: sanitizeHomebrewItemsForPlayerExport(homebrewItemsForExport(exportItemIds)),
      skills: homebrewSkillsForExport(exportSkillIds),
      races: homebrewRacesForExport(exportRaceIds),
      backgrounds: homebrewBackgroundsForExport(exportBackgroundIds)
    }
  }
  downloadJson(payload, `${character.name || 'character'}-lumenforge.json`.replace(/[^a-z0-9_.-]+/gi, '_'))
}

export async function importData(file) {
  if (!file) return
  try {
    const parsed = JSON.parse(await file.text())

    if (isHomebrewPackFile(parsed) && !Array.isArray(parsed.characters)) {
      state.homebrewImportPreview = {
        parsed,
        preview: previewHomebrewImport(parsed),
        mode: 'merge',
        skipConflicts: false
      }
      render({ content: true })
      return
    }

    const nestedHomebrew = parsed.homebrew
    if (nestedHomebrew?.items?.length || nestedHomebrew?.skills?.length || nestedHomebrew?.races?.length
      || nestedHomebrew?.backgrounds?.length) {
      if (!isFullSaveExport(parsed)) {
        mergeHomebrewImport(nestedHomebrew, { replace: false })
      }
    }

    const imported = Array.isArray(parsed) ? parsed : parsed.characters
    if (!Array.isArray(imported)) throw new Error('No characters array')

    const missing = []
    const missingBackgrounds = []
    for (const character of imported.map(normalizeCharacter)) {
      for (const itemId of collectHomebrewIdsFromCharacter(character)) {
        if (String(itemId).startsWith(HOMEBREW_ID_PREFIX) && !getItem(itemId) && !getHomebrewRace(itemId)
          && !getHomebrewBackground(itemId)) missing.push(itemId)
      }
      for (const skillId of character.skills || []) {
        if (String(skillId).startsWith(HOMEBREW_ID_PREFIX) && !getSkill(skillId)) missing.push(skillId)
      }
      if (String(character.race || '').startsWith(HOMEBREW_ID_PREFIX) && !getRace(character.race)) missing.push(character.race)
      const bgId = String(character.background || '')
      if (bgId.startsWith(HOMEBREW_ID_PREFIX) && !getBackground(bgId)) {
        missingBackgrounds.push(bgId)
        missing.push(bgId)
      }
    }
    if (missing.length) {
      throw new Error(`Missing homebrew content: ${[...new Set(missing)].join(', ')}`)
    }

    const fullSave = isFullSaveExport(parsed)
    const hasExisting = state.characters.length > 0
    let replace = false

    if (fullSave) {
      if (!hasExisting) replace = true
      else {
        replace = confirm(
          'This is a full save file.\n\nOK = Replace entire save (characters, folders, GM tools, UI, homebrew).\nCancel = Merge imported characters by ID (keeps your current folders and GM state).'
        )
      }
    }

    flushPendingCharacterEdits()
    applySavePayload(parsed, { replace })
    saveNow()
    render({ all: true })
    syncUrlState()
    const count = imported.length
    const bgWarn = missingBackgrounds.length
      ? ` Warning: missing custom background(s): ${[...new Set(missingBackgrounds)].join(', ')}.`
      : ''
    toast(
      (replace
        ? `Restored full save (${count} character${count === 1 ? '' : 's'}).`
        : `Merged ${count} character${count === 1 ? '' : 's'} into your roster.`) + bgWarn
    )
  } catch (error) {
    console.error(error)
    toast(error.message?.includes('Missing homebrew')
      ? error.message
      : 'Import failed. That file does not look like a LumenForge save.')
  }
}

export function renameCharacter(name) {
  const character = activeCharacter()
  if (!character) return
  character.name = name.trim() || character.name
  touch(character, { sidebar: true, header: true, content: true })
}

export function switchTab(tab) {
  if (tab === 'inventory') tab = 'shop'
  state.tab = tab
  render({ content: true, tabs: true })
  syncUrlState()
}

export function printCharacterSheet() {
  const character = activeCharacter()
  if (!character) return toast('Select a character first.')
  openPrintableCharacterSheet(character)
}

/* ---------------------------------------------------------------------- */
/* Encounter Balancer                                                      */
/* ---------------------------------------------------------------------- */

export function openGuidedCreate(prefill = {}) {
  openGuidedCreateState(prefill)
  render({ content: true })
}

export function cancelGuidedCreate() {
  if (!closeGuidedCreateState({ force: false })) return
  render({ content: true })
}

export function guidedCreateNext() {
  const gc = state.guidedCreate
  if (!gc?.open) return
  if (gc.step === 1) {
    const f = gc.form
    if (!String(f.name || "").trim()) return toast("Enter a name.")
    if (f.raceId === "dragonborn" && !f.elementalAffinity) return toast("Pick an elemental affinity.")
    if (f.raceId === "human" && !f.humanStarterSkill) return toast("Pick a starter weapon skill.")
    syncDraftFromIdentityForm()
  }
  if (gc.step === 2 && !gc.playstyle) return toast("Pick a playstyle (or Explore).")
  if (gc.step < 6) {
    if (gc.step >= 2) syncDraftFromIdentityForm()
    gc.step += 1
    gc.dirty = true
  }
  render({ content: true })
}

export function guidedCreateBack() {
  const gc = state.guidedCreate
  if (!gc?.open) return
  gc.step = Math.max(1, gc.step - 1)
  render({ content: true })
}

export function guidedCreateFinish() {
  const created = finishGuidedCreateState()
  if (!created) return
  save()
  render({ all: true })
}
