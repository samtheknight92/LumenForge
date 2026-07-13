import { SAVE_VERSION, STORAGE_KEY, LEGACY_STORAGE_KEY, LEGACY_ACTIVE_KEY, RETIRED_SKILL_SUBCATEGORIES } from './constants.js'
import { state } from './state.js'
import { applyFusionNavigationState, parseFusionFiltersFromUrl } from '../skills/fusion-nav.js'
import { debounce, toast } from './utils.js'
import { normalizeCharacter, stripCharacterCache } from '../character/character.js'
import { serializeHomebrewForSave, applyHomebrewFromSave } from '../homebrew/homebrew.js'
import { normalizePremadePageSize } from '../character/premade-characters.js'
import { defaultGmMonsterBuilderDraft } from '../gm/gm-monster-builder.js'
import { normalizeEncounterEnemies, migrateEncounterQuantityFocusId } from '../gm/encounter-enemies.js'

/** Full app save — characters plus UI, folders, GM tools, and filters. */
export function serializeSave() {
  return {
    version: SAVE_VERSION,
    activeId: state.activeId,
    ui: {
      tab: state.tab,
      skillCategory: state.skillCategory,
      skillSubcategory: state.skillSubcategory,
      skillFusionFilters: state.skillFusionFilters,
      skillSearch: state.skillSearch,
      skillStarredOnly: state.skillStarredOnly,
      craftStarredOnly: state.craftStarredOnly,
      itemSearch: state.itemSearch,
      itemCategory: state.itemCategory,
      itemSource: state.itemSource,
      itemRarity: state.itemRarity,
      itemBuyableOnly: state.itemBuyableOnly,
      itemStarredOnly: state.itemStarredOnly,
      itemSort: state.itemSort,
      itemPage: state.itemPage,
      inventorySort: state.inventorySort,
      inventoryFilter: state.inventoryFilter,
      inventoryTagFilter: state.inventoryTagFilter,
      inventoryCursedOnly: state.inventoryCursedOnly,
      starredCatalogItemIds: state.starredCatalogItemIds,
      activeNotePageByCharacter: state.activeNotePageByCharacter,
      gmMode: state.gmMode,
      initiativeTracker: state.initiativeTracker,
      gmNpcTurnCharacterIds: state.gmNpcTurnCharacterIds,
      gmNpcTurnFolder: state.gmNpcTurnFolder,
      characterFolderNames: state.characterFolderNames,
      characterFolderOrder: state.characterFolderOrder,
      characterFolderOpen: state.characterFolderOpen,
      gmSpawnFolder: state.gmSpawnFolder,
      gmPremadeSearch: state.gmPremadeSearch,
      gmPremadeCategory: state.gmPremadeCategory,
      gmPremadeSort: state.gmPremadeSort,
      gmPremadePage: state.gmPremadePage,
      gmPremadePageSize: state.gmPremadePageSize,
      encounterParty: state.encounterParty,
      encounterEnemies: state.encounterEnemies,
      encounterQuantityFocusId: state.encounterQuantityFocusId,
      gmMonsterBuilderDraft: state.gmMonsterBuilderDraft
    },
    characters: state.characters.map(character => {
      const clean = stripCharacterCache(character)
      return { ...clean, updated: new Date().toISOString() }
    }),
    homebrew: serializeHomebrewForSave()
  }
}

/** True when the file looks like a full save from serializeSave(), not legacy characters-only export. */
export function isFullSaveExport(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
  if (!Array.isArray(parsed.characters)) return false
  return Boolean(parsed.ui) || parsed.activeId != null
}

function applyUiFromSave(ui) {
  if (!ui || typeof ui !== 'object') return
  if (ui.tab) state.tab = ui.tab === 'encounter' ? 'gm' : ui.tab
  if (ui.skillCategory) state.skillCategory = ui.skillCategory
  if (ui.skillSubcategory) {
    state.skillSubcategory = RETIRED_SKILL_SUBCATEGORIES[ui.skillSubcategory] || ui.skillSubcategory
  }
  if (ui.skillFusionFilters && typeof ui.skillFusionFilters === 'object') {
    state.skillFusionFilters = ui.skillFusionFilters
  } else if (ui.skillFusionNest) {
    state.skillFusionFilters = parseFusionFiltersFromUrl({ fnest: ui.skillFusionNest })
  }
  applyFusionNavigationState(state)
  if (ui.skillSearch != null) state.skillSearch = String(ui.skillSearch)
  if (ui.skillStarredOnly != null) state.skillStarredOnly = Boolean(ui.skillStarredOnly)
  if (ui.craftStarredOnly != null) state.craftStarredOnly = Boolean(ui.craftStarredOnly)
  if (ui.itemSearch != null) state.itemSearch = String(ui.itemSearch)
  if (ui.itemCategory) state.itemCategory = ui.itemCategory
  if (ui.itemSource) state.itemSource = ui.itemSource
  if (ui.itemRarity) state.itemRarity = ui.itemRarity
  if (ui.itemBuyableOnly != null) state.itemBuyableOnly = Boolean(ui.itemBuyableOnly)
  if (ui.itemStarredOnly != null) state.itemStarredOnly = Boolean(ui.itemStarredOnly)
  if (ui.itemSort) state.itemSort = ui.itemSort
  if (ui.itemPage != null) state.itemPage = Number(ui.itemPage) || 0
  if (ui.inventorySort) state.inventorySort = ui.inventorySort
  if (ui.inventoryFilter) state.inventoryFilter = ui.inventoryFilter
  if (ui.inventoryTagFilter != null) state.inventoryTagFilter = String(ui.inventoryTagFilter || '')
  if (ui.inventoryCursedOnly != null) state.inventoryCursedOnly = Boolean(ui.inventoryCursedOnly)
  if (Array.isArray(ui.starredCatalogItemIds)) state.starredCatalogItemIds = ui.starredCatalogItemIds.map(String)
  if (ui.activeNotePageByCharacter && typeof ui.activeNotePageByCharacter === 'object') {
    state.activeNotePageByCharacter = { ...ui.activeNotePageByCharacter }
  }
  if (ui.gmMode != null) state.gmMode = Boolean(ui.gmMode)
  if (ui.initiativeTracker) {
    state.initiativeTracker = {
      entries: Array.isArray(ui.initiativeTracker.entries)
        ? ui.initiativeTracker.entries.map(entry => ({
          id: entry.id || `init_${Math.random().toString(36).slice(2, 9)}`,
          name: String(entry.name || ''),
          initiative: entry.initiative === '' || entry.initiative == null ? '' : Number(entry.initiative)
        }))
        : [],
      activeEntryId: ui.initiativeTracker.activeEntryId || null
    }
  }
  if (Array.isArray(ui.gmNpcTurnCharacterIds)) {
    state.gmNpcTurnCharacterIds = ui.gmNpcTurnCharacterIds
  }
  if (ui.gmNpcTurnFolder != null) {
    state.gmNpcTurnFolder = String(ui.gmNpcTurnFolder || '').trim()
  }
  if (Array.isArray(ui.characterFolderNames)) {
    state.characterFolderNames = ui.characterFolderNames
      .map(name => String(name || '').trim())
      .filter(Boolean)
  }
  if (Array.isArray(ui.characterFolderOrder)) {
    state.characterFolderOrder = ui.characterFolderOrder
      .map(name => String(name || '').trim())
      .filter(Boolean)
  } else if (Array.isArray(ui.characterFolderNames)) {
    state.characterFolderOrder = [...state.characterFolderNames]
  }
  if (ui.characterFolderOpen && typeof ui.characterFolderOpen === 'object') {
    state.characterFolderOpen = ui.characterFolderOpen
  } else if (ui.characterFolderFilter && ui.characterFolderFilter !== 'all') {
    const legacy = String(ui.characterFolderFilter)
    state.characterFolderOpen = { [legacy]: true }
  }
  if (ui.gmSpawnFolder != null) {
    state.gmSpawnFolder = String(ui.gmSpawnFolder || '').trim()
  }
  /** encounterSearch/Category/Sort are the old (pre-fusion) filter fields for the separate "Browse Enemies" list — fall back to them if a save predates the merged premade browser. */
  if (ui.gmPremadeSearch != null) state.gmPremadeSearch = String(ui.gmPremadeSearch)
  else if (ui.encounterSearch != null) state.gmPremadeSearch = String(ui.encounterSearch)
  if (ui.gmPremadeCategory) state.gmPremadeCategory = ui.gmPremadeCategory
  else if (ui.encounterCategory) state.gmPremadeCategory = ui.encounterCategory
  if (ui.gmPremadeSort) state.gmPremadeSort = ui.gmPremadeSort
  else if (ui.encounterSort) state.gmPremadeSort = ui.encounterSort
  if (ui.gmPremadePage != null) state.gmPremadePage = Math.max(0, Number(ui.gmPremadePage) || 0)
  if (ui.gmPremadePageSize != null) state.gmPremadePageSize = normalizePremadePageSize(ui.gmPremadePageSize)
  if (Array.isArray(ui.encounterParty)) {
    state.encounterParty = ui.encounterParty
      .filter(row => row && typeof row === 'object')
      .map(row => ({
        id: String(row.id || `party_${Math.random().toString(36).slice(2, 9)}`),
        name: String(row.name || 'Hero'),
        skillLevel: Math.max(1, Math.round(Number(row.skillLevel) || 1)),
        combatPower: Math.max(1, Math.round(Number(row.combatPower) || 1)),
        source: row.source === 'roster' ? 'roster' : 'manual',
        characterId: row.characterId || null
      }))
  }
  if (Array.isArray(ui.encounterEnemies)) {
    state.encounterEnemies = normalizeEncounterEnemies(ui.encounterEnemies)
    migrateEncounterQuantityFocusId()
  }
  if (ui.encounterQuantityFocusId != null) state.encounterQuantityFocusId = String(ui.encounterQuantityFocusId || '')
  migrateEncounterQuantityFocusId()
  if (ui.gmMonsterBuilderDraft && typeof ui.gmMonsterBuilderDraft === 'object') {
    const draft = ui.gmMonsterBuilderDraft
    state.gmMonsterBuilderDraft = defaultGmMonsterBuilderDraft({
      name: String(draft.name || ''),
      category: draft.category === 'npc' ? 'npc' : 'monster',
      typeId: String(draft.typeId || ''),
      roleId: String(draft.roleId || ''),
      threatPresetId: String(draft.threatPresetId || 'mediocre'),
      specialIds: Array.isArray(draft.specialIds) ? draft.specialIds.map(String) : [],
      previewCharacter: null,
      customActions: Array.isArray(draft.customActions) ? draft.customActions.map(String) : [],
      customTraits: Array.isArray(draft.customTraits) ? draft.customTraits.map(String) : [],
      affinityAdded: normalizeAffinityEdits(draft.affinityAdded),
      affinityRemoved: normalizeAffinityEdits(draft.affinityRemoved)
    })
  }
}

function normalizeAffinityEdits(edits) {
  const empty = { resistances: [], weaknesses: [], immunities: [] }
  if (!edits || typeof edits !== 'object') return empty
  return {
    resistances: Array.isArray(edits.resistances) ? edits.resistances.map(String) : [],
    weaknesses: Array.isArray(edits.weaknesses) ? edits.weaknesses.map(String) : [],
    immunities: Array.isArray(edits.immunities) ? edits.immunities.map(String) : []
  }
}

function mergeCharactersById(imported) {
  const byId = new Map(state.characters.map(character => [character.id, character]))
  imported.forEach(character => byId.set(character.id, character))
  return [...byId.values()]
}

/**
 * Apply parsed save JSON.
 * @param {object} parsed - Full save or legacy { version, characters }
 * @param {{ replace?: boolean }} options - replace=true restores entire save; false merges characters by id
 */
export function applySavePayload(parsed, { replace = false } = {}) {
  const characters = Array.isArray(parsed) ? parsed : parsed.characters
  if (!Array.isArray(characters)) throw new Error('No characters array')
  const normalized = characters.map(normalizeCharacter)

  if (replace) {
    state.characters = normalized
    state.activeId = parsed.activeId || normalized[0]?.id || null
    if (parsed.ui) applyUiFromSave(parsed.ui)
    if (parsed.homebrew) applyHomebrewFromSave(parsed.homebrew)
  } else {
    state.characters = mergeCharactersById(normalized)
    if (parsed.activeId && state.characters.some(character => character.id === parsed.activeId)) {
      state.activeId = parsed.activeId
    }
  }

  if (!state.characters.some(character => character.id === state.activeId)) {
    state.activeId = state.characters[0]?.id || null
  }
}

function writeSave() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeSave()))
}

export const save = debounce(writeSave, 300)
export function saveNow() {
  save.cancel?.()
  writeSave()
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === SAVE_VERSION) {
        applySavePayload(parsed, { replace: true })
      } else {
        migrateLegacy(parsed)
      }
    } else {
      migrateFromLegacyKeys()
    }
    if (!state.characters.some(character => character.id === state.activeId)) {
      state.activeId = state.characters[0]?.id || null
    }
  } catch (error) {
    console.error(error)
    state.characters = []
    state.activeId = null
    toast('Save data could not be loaded, so I started clean.')
  }
}

function migrateLegacy(parsed) {
  const characters = Array.isArray(parsed) ? parsed : parsed.characters
  if (!Array.isArray(characters)) throw new Error('Invalid save')
  state.characters = characters.map(normalizeCharacter)
  state.activeId = parsed.activeId || localStorage.getItem(LEGACY_ACTIVE_KEY)
}

function migrateFromLegacyKeys() {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!raw) return
  state.characters = JSON.parse(raw).map(normalizeCharacter)
  state.activeId = localStorage.getItem(LEGACY_ACTIVE_KEY)
  saveNow()
}

window.addEventListener('beforeunload', saveNow)
