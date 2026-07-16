import { TAB_IDS, RETIRED_SKILL_SUBCATEGORIES } from './constants.js'
import { parseUrlState } from './url-state.js'
import { applyFusionNavigationState, EMPTY_FUSION_FILTERS, parseFusionFiltersFromUrl, filtersForRetiredFusionSubcategory } from '../skills/fusion-nav.js'

export const state = {
  characters: [],
  activeId: null,
  tab: 'character',
  skillCategory: 'weapons',
  skillSubcategory: 'sword',
  skillFusionFilters: EMPTY_FUSION_FILTERS(),
  skillSearch: '',
  skillStarredOnly: false,
  itemSearch: '',
  itemCategory: 'all',
  itemSource: 'shop',
  itemRarity: 'all',
  itemBuyableOnly: true,
  itemStarredOnly: false,
  itemSort: 'name',
  itemPage: 0,
  inventorySort: 'newest',
  inventoryFilter: 'all',
  inventoryTagFilter: '',
  inventoryCursedOnly: false,
  starredCatalogItemIds: [],
  activeNotePageByCharacter: {},
  craftSearch: '',
  craftProfession: 'all',
  craftLearnedOnly: true,
  craftStarredOnly: false,
  dice: { count: 1, sides: 20, modifier: 0 },
  lastRoll: null,
  notesDirty: false,
  gmMode: false,
  gmPremadeSearch: '',
  gmPremadeCategory: 'all',
  gmPremadeSort: 'threat-desc',
  gmPremadePage: 0,
  gmPremadePageSize: 12,
  glossarySearch: '',
  gmNpcTurnCharacterIds: [],
  gmNpcTurnFolder: '',
  lastNpcTurns: [],
  characterFolderNames: [],
  characterFolderOrder: [],
  characterFolderOpen: {},
  gmSpawnFolder: '',
  encounterParty: [],
  encounterEnemies: [],
  encounterQuantityFocusId: '',
  homebrewSearch: '',
  homebrewSelected: {},
  homebrewEditingId: null,
  homebrewDraft: null,
  homebrewShowEffectPicker: false,
  homebrewEffectSearch: '',
  homebrewShowCounterOptions: false,
  homebrewEditorKind: null,
  homebrewListFilter: 'all',
  homebrewSkillDraft: null,
  homebrewSkillEditingId: null,
  homebrewSkillShowEffectPicker: false,
  homebrewSkillEffectSearch: '',
  homebrewSkillShowUseEffectPicker: false,
  homebrewSkillUseEffectSearch: '',
  homebrewSkillSelected: {},
  homebrewRaceDraft: null,
  homebrewRaceEditingId: null,
  homebrewRaceSelected: {},
  homebrewRaceShowEffectPicker: false,
  homebrewRaceEffectSearch: '',
  initiativeTracker: {
    entries: [],
    activeEntryId: null
  },
  gmMonsterBuilderDraft: {
    name: '',
    category: 'monster',
    typeId: 'goblinoid',
    roleId: 'brute',
    threatPresetId: 'mediocre',
    specialIds: [],
    previewCharacter: null,
    customActions: [],
    customTraits: [],
    affinityAdded: { resistances: [], weaknesses: [], immunities: [] },
    affinityRemoved: { resistances: [], weaknesses: [], immunities: [] }
  },
  homebrewMonsterDraft: null,
  homebrewMonsterEditingId: null,
  homebrewMonsterEditorKind: null,
  homebrewMonsterSelected: {},
  homebrewBackgroundDraft: null,
  homebrewBackgroundEditingId: null,
  homebrewBackgroundSelected: {},
  homebrewRecipeDraft: null,
  homebrewRecipeEditingId: null,
  homebrewRecipeSelected: {},
  homebrewShowArchived: false,
  homebrewShowDrafts: true,
  homebrewImportPreview: null,
  homebrewMonsterShowSkillPicker: false,
  homebrewMonsterSkillSearch: '',
  guidedCreate: {
    open: false,
    step: 1,
    draftCharacter: null,
    playstyle: '',
    dirty: false,
    browseSkills: false,
    browseItems: false,
    form: { name: '', raceId: 'human', background: 'wanderer', elementalAffinity: '', humanStarterSkill: '' }
  },
  activeEncounter: null,
  encounterCombatantFilter: 'all',
  encounterCombatantSearch: '',
  encounterExpandedIds: {}
}

export function activeCharacter() {
  return state.characters.find(character => character.id === state.activeId) || null
}

export function applyUrlState() {
  const fromUrl = parseUrlState()
  let tab = fromUrl.tab || ''
  if (tab === 'inventory') tab = 'shop'
  if (tab === 'encounter') tab = 'gm'
  if (tab && TAB_IDS.includes(tab)) state.tab = tab
  if (fromUrl.skillCategory) {
    state.skillCategory = fromUrl.skillCategory === 'monster' ? 'racial' : fromUrl.skillCategory
  }
  if (fromUrl.skillSubcategory) {
    state.skillSubcategory = RETIRED_SKILL_SUBCATEGORIES[fromUrl.skillSubcategory] || fromUrl.skillSubcategory
  }
  if (fromUrl.skillFusionFilters) {
    state.skillFusionFilters = fromUrl.skillFusionFilters
  } else {
    const filterHint = filtersForRetiredFusionSubcategory(fromUrl.skillSubcategory)
    if (filterHint) {
      state.skillFusionFilters = { ...EMPTY_FUSION_FILTERS(), ...filterHint }
    }
  }
  applyFusionNavigationState(state)
  if (fromUrl.itemSource) state.itemSource = fromUrl.itemSource
  if (fromUrl.itemPage != null) state.itemPage = fromUrl.itemPage
}

export function resetItemFilters() {
  state.itemSearch = ''
  state.itemCategory = 'all'
  state.itemSource = 'shop'
  state.itemRarity = 'all'
  state.itemBuyableOnly = true
  state.itemStarredOnly = false
  state.itemSort = 'name'
  state.itemPage = 0
}
