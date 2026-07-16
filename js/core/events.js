import {
  createAndSelectCharacter,
  selectCharacter as selectCharacterById,
  learnSkill as doLearnSkill,
  refundSkill as doRefundSkill,
  toggleSkill as doToggleSkill,
  useSkill as doUseSkill,
  processTurn as doProcessTurn,
  addStatusEffect as doAddStatusEffect,
  removeStatusEffect as doRemoveStatusEffect,
  setRace as doSetRace,
  setElementalAffinity as doSetElementalAffinity,
  buyItem as doBuyItem,
  craftRecipe as doCraftRecipe,
  grantCraftRecipe as doGrantCraftRecipe,
  applyEnchantment as doApplyEnchantment,
  removeEnchantment as doRemoveEnchantment,
  recordEnchantShieldAbsorption as doRecordEnchantShieldAbsorption,
  removeInventoryEntry as doRemoveInventoryEntry,
  equipItem as doEquipItem,
  unequip as doUnequip,
  upgradeStat as doUpgradeStat,
  refundStat as doRefundStat,
  setResource as doSetResource,
  adjustResource as doAdjustResource,
  fillResource as doFillResource,
  adjustCurrency as doAdjustCurrency,
  setGil as doSetGil,
  heal as doHeal,
  restoreStamina as doRestoreStamina,
  duplicateCharacter as doDuplicateCharacter,
  deleteCharacter as doDeleteCharacter,
  exportData,
  importData,
  saveNotes as persistNotes,
  renameCharacter as doRenameCharacter,
  switchTab,
  activateGmModeToggle as doActivateGmModeToggle,
  spawnPremadeCharacter as doSpawnPremadeCharacter,
  beginNewCombat as doBeginNewCombat,
  generateNpcTurn as doGenerateNpcTurn,
  printCharacterSheet as doPrintCharacterSheet,
  toggleGmTurnCharacter as doToggleGmTurnCharacter,
  selectAllGmTurnCharacters as doSelectAllGmTurnCharacters,
  clearGmTurnCharacters as doClearGmTurnCharacters,
  setGmNpcTurnFolder as doSetGmNpcTurnFolder,
  selectGmTurnFromFolder as doSelectGmTurnFromFolder,
  addInitiativeEntry as doAddInitiativeEntry,
  addRosterToInitiativeTracker as doAddRosterToInitiativeTracker,
  addFolderToInitiativeTracker as doAddFolderToInitiativeTracker,
  removeInitiativeEntry as doRemoveInitiativeEntry,
  setCharacterFolder as doSetCharacterFolder,
  createCharacterFolder as doCreateCharacterFolder,
  rememberRosterFolderOpen as doRememberRosterFolderOpen,
  moveCharacterFolder as doMoveCharacterFolder,
  copyCharacterFolder as doCopyCharacterFolder,
  deleteCharacterFolder as doDeleteCharacterFolder,
  setGmSpawnFolder as doSetGmSpawnFolder,
  updateInitiativeEntry as doUpdateInitiativeEntry,
  setInitiativeActiveEntry as doSetInitiativeActiveEntry,
  nextInitiativeTurn as doNextInitiativeTurn,
  resetInitiativeRound as doResetInitiativeRound,
  clearInitiativeTracker as doClearInitiativeTracker,
  startHomebrewEditor as doStartHomebrewEditor,
  startHomebrewSkillEditor as doStartHomebrewSkillEditor,
  cancelHomebrewEditor as doCancelHomebrewEditor,
  saveHomebrewDraftFromForm as doSaveHomebrewDraftFromForm,
  saveHomebrewSkillDraftFromForm as doSaveHomebrewSkillDraftFromForm,
  toggleHomebrewEffectPicker as doToggleHomebrewEffectPicker,
  toggleHomebrewSkillEffectPicker as doToggleHomebrewSkillEffectPicker,
  toggleHomebrewSkillUseEffectPicker as doToggleHomebrewSkillUseEffectPicker,
  toggleHomebrewCounterOptions as doToggleHomebrewCounterOptions,
  clearHomebrewDraftCounter as doClearHomebrewDraftCounter,
  toggleHomebrewDraftEffect as doToggleHomebrewDraftEffect,
  toggleHomebrewSkillDraftEffect as doToggleHomebrewSkillDraftEffect,
  removeHomebrewDraftEffect as doRemoveHomebrewDraftEffect,
  removeHomebrewSkillDraftEffect as doRemoveHomebrewSkillDraftEffect,
  toggleHomebrewSkillUseDraftEffect as doToggleHomebrewSkillUseDraftEffect,
  removeHomebrewSkillUseDraftEffect as doRemoveHomebrewSkillUseDraftEffect,
  removeHomebrewItem as doRemoveHomebrewItem,
  restoreHomebrewItemEntry as doRestoreHomebrewItemEntry,
  removeHomebrewSkill as doRemoveHomebrewSkill,
  copyHomebrewItem as doCopyHomebrewItem,
  copyHomebrewSkill as doCopyHomebrewSkill,
  toggleHomebrewSelect as doToggleHomebrewSelect,
  toggleHomebrewSkillSelect as doToggleHomebrewSkillSelect,
  toggleHomebrewBackgroundSelect as doToggleHomebrewBackgroundSelect,
  toggleHomebrewRecipeSelect as doToggleHomebrewRecipeSelect,
  copyHomebrewBackground as doCopyHomebrewBackground,
  grantHomebrewItem as doGrantHomebrewItem,
  grantHomebrewSkill as doGrantHomebrewSkill,
  setHomebrewListFilter as doSetHomebrewListFilter,
  exportHomebrewSelection as doExportHomebrewSelection,
  exportHomebrewCampaignPack as doExportHomebrewCampaignPack,
  confirmHomebrewImportPreview as doConfirmHomebrewImportPreview,
  cancelHomebrewImportPreview as doCancelHomebrewImportPreview,
  setHomebrewImportOption as doSetHomebrewImportOption,
  toggleHomebrewShowArchived as doToggleHomebrewShowArchived,
  toggleHomebrewShowDrafts as doToggleHomebrewShowDrafts,
  startHomebrewBackgroundEditor as doStartHomebrewBackgroundEditor,
  saveHomebrewBackgroundDraftFromForm as doSaveHomebrewBackgroundDraftFromForm,
  removeHomebrewBackground as doRemoveHomebrewBackground,
  startHomebrewRecipeEditor as doStartHomebrewRecipeEditor,
  saveHomebrewRecipeDraftFromForm as doSaveHomebrewRecipeDraftFromForm,
  archiveHomebrewRecipeEntry as doArchiveHomebrewRecipeEntry,
  adjustInventoryCounter as doAdjustInventoryCounter,
  startHomebrewRaceEditor as doStartHomebrewRaceEditor,
  saveHomebrewRaceDraftFromForm as doSaveHomebrewRaceDraftFromForm,
  removeHomebrewRace as doRemoveHomebrewRace,
  copyHomebrewRace as doCopyHomebrewRace,
  toggleHomebrewRaceSelect as doToggleHomebrewRaceSelect,
  toggleHomebrewRaceEffectPicker as doToggleHomebrewRaceEffectPicker,
  toggleHomebrewRaceDraftEffect as doToggleHomebrewRaceDraftEffect,
  removeHomebrewRaceDraftEffect as doRemoveHomebrewRaceDraftEffect,
  stopPerformance as doStopPerformance,
  addEncounterPartyMemberFromRoster as doAddEncounterPartyMemberFromRoster,
  addEncounterPartyMemberManual as doAddEncounterPartyMemberManual,
  removeEncounterPartyMember as doRemoveEncounterPartyMember,
  updateEncounterPartyMember as doUpdateEncounterPartyMember,
  clearEncounterParty as doClearEncounterParty,
  addEncounterEnemy as doAddEncounterEnemy,
  removeEncounterEnemy as doRemoveEncounterEnemy,
  setEncounterEnemyCount as doSetEncounterEnemyCount,
  clearEncounterEnemies as doClearEncounterEnemies,
  focusEncounterEnemyQuantity as doFocusEncounterEnemyQuantity,
  addEncounterEnemyFromRoster as doAddEncounterEnemyFromRoster,
  addEncounterEnemyManualRow as doAddEncounterEnemyManualRow,
  updateEncounterEnemyManual as doUpdateEncounterEnemyManual,
  generateGmMonsterPreview as doGenerateGmMonsterPreview,
  randomiseGmMonsterBuilder as doRandomiseGmMonsterBuilder,
  resetGmMonsterBuilder as doResetGmMonsterBuilder,
  saveGmMonsterToRoster as doSaveGmMonsterToRoster,
  saveGmMonsterToRosterAndEncounter as doSaveGmMonsterToRosterAndEncounter,
  duplicateGmMonsterPreview as doDuplicateGmMonsterPreview,
  addGmMonsterCustomAction as doAddGmMonsterCustomAction,
  addGmMonsterCustomTrait as doAddGmMonsterCustomTrait,
  removeGmMonsterCustomAction as doRemoveGmMonsterCustomAction,
  removeGmMonsterCustomTrait as doRemoveGmMonsterCustomTrait,
  addGmMonsterAffinity as doAddGmMonsterAffinity,
  removeGmMonsterAffinity as doRemoveGmMonsterAffinity,
  toggleGmMonsterBuilderSpecial as doToggleGmMonsterBuilderSpecial,
  updateGmMonsterBuilderDraft as doUpdateGmMonsterBuilderDraft,
  startHomebrewMonsterEditor as doStartHomebrewMonsterEditor,
  saveHomebrewMonsterDraftFromForm as doSaveHomebrewMonsterDraftFromForm,
  removeHomebrewMonsterTemplate as doRemoveHomebrewMonsterTemplate,
  copyHomebrewMonsterTemplate as doCopyHomebrewMonsterTemplate,
  toggleHomebrewMonsterSelect as doToggleHomebrewMonsterSelect,
  toggleHomebrewMonsterSkillPicker as doToggleHomebrewMonsterSkillPicker,
  toggleHomebrewMonsterDraftSkill as doToggleHomebrewMonsterDraftSkill,
  removeHomebrewMonsterDraftSkill as doRemoveHomebrewMonsterDraftSkill,
  addHomebrewMonsterDraftAffinity as doAddHomebrewMonsterDraftAffinity,
  removeHomebrewMonsterDraftAffinity as doRemoveHomebrewMonsterDraftAffinity,
  toggleHomebrewMonsterDraftImmunity as doToggleHomebrewMonsterDraftImmunity,
  toggleInventoryEntryStar as doToggleInventoryEntryStar,
  toggleInventoryEntryLock as doToggleInventoryEntryLock,
  updateInventoryEntryPlayerNotes as doUpdateInventoryEntryPlayerNotes,
  setInventorySort as doSetInventorySort,
  setInventoryFilter as doSetInventoryFilter,
  setInventoryTagFilter as doSetInventoryTagFilter,
  setInventoryCursedOnly as doSetInventoryCursedOnly,
  toggleCatalogItemStar as doToggleCatalogItemStar,
  toggleSkillStar as doToggleSkillStar,
  togglePinnedSkill as doTogglePinnedSkill,
  setSkillViewMode as doSetSkillViewMode,
  toggleRecipeStar as doToggleRecipeStar,
  setActiveNotePage as doSetActiveNotePage,
  addNotePage as doAddNotePage,
  renameNotePage as doRenameNotePage,
  deleteNotePage as doDeleteNotePage,
  addQuestEntry as doAddQuestEntry,
  updateQuestEntry as doUpdateQuestEntry,
  removeQuestEntry as doRemoveQuestEntry,
  addWeatherEffect as doAddWeatherEffect,
  removeWeatherEffect as doRemoveWeatherEffect,
  setWeatherCombatRoll as doSetWeatherCombatRoll,
  rollRecoveryCheck as doRollRecoveryCheck,
  beginManualRevival as doBeginManualRevival,
  continueManualRevival as doContinueManualRevival,
  clearManualRevival as doClearManualRevival,
  openGuidedCreate as doOpenGuidedCreate,
  cancelGuidedCreate as doCancelGuidedCreate,
  guidedCreateNext as doGuidedCreateNext,
  guidedCreateBack as doGuidedCreateBack,
  guidedCreateFinish as doGuidedCreateFinish,
  startActiveEncounter as doStartActiveEncounter,
  endActiveEncounterAction as doEndActiveEncounter,
  encounterNextTurn as doEncounterNextTurn,
  encounterPrevTurn as doEncounterPrevTurn,
  encounterAdvanceRound as doEncounterAdvanceRound,
  encounterProcessActiveTurn as doEncounterProcessActive,
  encounterProcessTurn as doEncounterProcessTurn,
  encounterAdjustResource as doEncounterAdjustResource,
  encounterToggleDefeated as doEncounterToggleDefeated,
  encounterRemove as doEncounterRemove,
  encounterDuplicate as doEncounterDuplicate,
  encounterToggleExpand as doEncounterToggleExpand
} from '../ui/actions.js'
import {
  learnSkillOnDraft,
  refundSkillOnDraft,
  buyItemOnDraft,
  upgradeStatOnDraft,
  syncDraftFromIdentityForm,
} from '../ui/guided-create.js'
import { stepNumberInput } from '../ui/number-stepper.js'
import { render } from '../ui/render.js'
import { state, activeCharacter, resetItemFilters } from './state.js'
import { TAB_IDS } from './constants.js'
import { DEFAULT_BACKGROUND } from '../character/backgrounds.js'
import { closeActionBarSkillSheet, tryOpenActionBarSkillSheet } from '../combat/action-bar-sheet.js'
import { debounce, toast, toastCombat } from './utils.js'
import { trackPendingEditDebouncer } from './pending-edits.js'
import { syncHomebrewDraftFromForm, syncHomebrewSkillDraftFromForm, syncHomebrewRaceDraftFromForm, syncHomebrewMonsterDraftFromForm, alignHomebrewSkillSubcategory } from '../homebrew/homebrew.js'
import { applyTheme, applyAppearance } from '../ui/themes.js'
import { saveNow } from './storage.js'
import { subcategoriesFor, visibleSubcategories, syncFusionFilters } from '../skills/skills.js'
import { applyFusionNavigationState, resetFusionFilters, toggleFusionFilterValue } from '../skills/fusion-nav.js'
import { syncUrlState } from './url-state.js'

let initialized = false
let sidebarScrollLockY = 0

function closeAllCharacterMoveMenus() {
  document.querySelectorAll('[data-character-move-menu]').forEach(menu => {
    menu.hidden = true
  })
  document.querySelectorAll('[data-toggle-character-move]').forEach(button => {
    button.setAttribute('aria-expanded', 'false')
  })
}

function toggleCharacterMoveMenu(characterId) {
  const menu = document.querySelector(`[data-character-move-menu="${CSS.escape(characterId)}"]`)
  const button = document.querySelector(`[data-toggle-character-move="${CSS.escape(characterId)}"]`)
  if (!menu || !button) return
  const willOpen = menu.hidden
  closeAllCharacterMoveMenus()
  if (willOpen) {
    menu.hidden = false
    button.setAttribute('aria-expanded', 'true')
  }
}

function closeAllFolderMenus() {
  document.querySelectorAll('[data-folder-menu]').forEach(menu => {
    menu.hidden = true
  })
  document.querySelectorAll('[data-toggle-folder-menu]').forEach(button => {
    button.setAttribute('aria-expanded', 'false')
  })
}

function toggleFolderMenu(folderKey) {
  const menu = document.querySelector(`[data-folder-menu="${CSS.escape(folderKey)}"]`)
  const button = document.querySelector(`[data-toggle-folder-menu="${CSS.escape(folderKey)}"]`)
  if (!menu || !button) return
  const willOpen = menu.hidden
  closeAllFolderMenus()
  closeAllCharacterMoveMenus()
  if (willOpen) {
    menu.hidden = false
    button.setAttribute('aria-expanded', 'true')
  }
}

function handleFolderMenuClick(event) {
  const toggleButton = event.target.closest('[data-toggle-folder-menu]')
  if (toggleButton) {
    event.preventDefault()
    event.stopPropagation()
    toggleFolderMenu(toggleButton.dataset.toggleFolderMenu)
    return true
  }

  const moveUp = event.target.closest('[data-folder-move-up]')
  if (moveUp && !moveUp.disabled) {
    event.preventDefault()
    event.stopPropagation()
    doMoveCharacterFolder(moveUp.dataset.folderMoveUp, 'up')
    closeAllFolderMenus()
    return true
  }

  const moveDown = event.target.closest('[data-folder-move-down]')
  if (moveDown && !moveDown.disabled) {
    event.preventDefault()
    event.stopPropagation()
    doMoveCharacterFolder(moveDown.dataset.folderMoveDown, 'down')
    closeAllFolderMenus()
    return true
  }

  const copyBtn = event.target.closest('[data-copy-folder]')
  if (copyBtn) {
    event.preventDefault()
    event.stopPropagation()
    doCopyCharacterFolder(copyBtn.dataset.copyFolder)
    closeAllFolderMenus()
    return true
  }

  const deleteBtn = event.target.closest('[data-delete-folder]')
  if (deleteBtn) {
    event.preventDefault()
    event.stopPropagation()
    doDeleteCharacterFolder(deleteBtn.dataset.deleteFolder)
    closeAllFolderMenus()
    return true
  }

  if (!event.target.closest('.character-folder-picker')) {
    closeAllFolderMenus()
  }
  return false
}

function handleCharacterMoveMenuClick(event) {
  const toggleButton = event.target.closest('[data-toggle-character-move]')
  if (toggleButton) {
    event.stopPropagation()
    closeAllFolderMenus()
    toggleCharacterMoveMenu(toggleButton.dataset.toggleCharacterMove)
    return true
  }

  const moveButton = event.target.closest('[data-move-character]')
  if (moveButton) {
    event.stopPropagation()
    doSetCharacterFolder(moveButton.dataset.moveCharacter, moveButton.dataset.moveFolder ?? '')
    closeAllCharacterMoveMenus()
    return true
  }

  if (!event.target.closest('.character-move-picker')) {
    closeAllCharacterMoveMenus()
  }
  return false
}

function isSidebarMobile() {
  return window.matchMedia('(max-width: 1100px)').matches
}

function isSidebarOpen() {
  const sidebar = document.querySelector('#sidebar')
  const shell = document.querySelector('.app-shell')
  if (!sidebar) return false
  if (isSidebarMobile()) return sidebar.classList.contains('open')
  return !shell?.classList.contains('sidebar-collapsed')
}

function setSidebarOpen(open) {
  const sidebar = document.querySelector('#sidebar')
  const backdrop = document.querySelector('#sidebar-backdrop')
  const shell = document.querySelector('.app-shell')
  if (!sidebar) return
  const mobile = isSidebarMobile()

  if (mobile) {
    const wasOpen = sidebar.classList.contains('open')
    sidebar.classList.toggle('open', open)
    shell?.classList.remove('sidebar-collapsed')
    document.documentElement.classList.toggle('sidebar-open', open)
    document.body.classList.toggle('sidebar-open', open)

    // Avoid body position:fixed scroll lock on mobile — it fights the virtual keyboard.
    if (!open && wasOpen) document.body.style.top = ''

    if (backdrop) {
      backdrop.hidden = !open
      backdrop.setAttribute('aria-hidden', open ? 'false' : 'true')
    }
    return
  }

  sidebar.classList.remove('open')
  shell?.classList.toggle('sidebar-collapsed', !open)
  document.documentElement.classList.remove('sidebar-open')
  document.body.classList.remove('sidebar-open')
  if (document.body.style.top) {
    document.body.style.top = ''
    window.scrollTo(0, sidebarScrollLockY)
  }
  if (backdrop) {
    backdrop.hidden = true
    backdrop.setAttribute('aria-hidden', 'true')
  }
}

let sidebarLayoutIsMobile = null

function syncSidebarLayout() {
  const sidebar = document.querySelector('#sidebar')
  const shell = document.querySelector('.app-shell')
  if (!sidebar || !shell) return
  const mobile = isSidebarMobile()
  if (mobile) {
    shell.classList.remove('sidebar-collapsed')
    sidebarLayoutIsMobile = true
    return
  }
  if (sidebarLayoutIsMobile !== false) {
    setSidebarOpen(!shell.classList.contains('sidebar-collapsed'))
  }
  sidebarLayoutIsMobile = false
}

const debouncedSkillSearch = debounce(value => {
  state.skillSearch = value
  render({ content: true })
}, 200)

const debouncedCraftSearch = debounce(value => {
  state.craftSearch = value
  render({ content: true })
}, 200)

const debouncedItemSearch = debounce(value => {
  state.itemSearch = value
  state.itemPage = 0
  render({ content: true })
}, 200)

const debouncedNotesSave = debounce((characterId, value) => {
  persistNotes(value, true, characterId)
}, 400)
trackPendingEditDebouncer(debouncedNotesSave)

const debouncedEntryNotes = debounce((characterId, entryUid, value) => {
  doUpdateInventoryEntryPlayerNotes(characterId, entryUid, value)
}, 400)
trackPendingEditDebouncer(debouncedEntryNotes)

const debouncedQuestUpdate = debounce((characterId, questId, field, value) => {
  doUpdateQuestEntry(characterId, questId, field, value)
}, 300)
trackPendingEditDebouncer(debouncedQuestUpdate)

const debouncedNotePageTitle = debounce((characterId, pageId, title) => {
  doRenameNotePage(characterId, pageId, title)
}, 300)
trackPendingEditDebouncer(debouncedNotePageTitle)

const debouncedGmPremadeSearch = debounce(value => {
  state.gmPremadeSearch = value
  state.gmPremadePage = 0
  render({ content: true })
}, 200)

const debouncedGlossarySearch = debounce(value => {
  state.glossarySearch = value
  render({ content: true })
}, 200)

const debouncedHomebrewSearch = debounce(value => {
  state.homebrewSearch = value
  render({ content: true })
}, 200)

const debouncedHomebrewEffectSearch = debounce(value => {
  syncHomebrewDraftFromForm()
  state.homebrewEffectSearch = value
  render({ content: true })
}, 200)

const debouncedHomebrewSkillEffectSearch = debounce(value => {
  syncHomebrewSkillDraftFromForm()
  state.homebrewSkillEffectSearch = value
  render({ content: true })
}, 200)

const debouncedHomebrewSkillUseEffectSearch = debounce(value => {
  syncHomebrewSkillDraftFromForm()
  state.homebrewSkillUseEffectSearch = value
  render({ content: true })
}, 200)

const debouncedHomebrewRaceEffectSearch = debounce(value => {
  syncHomebrewRaceDraftFromForm()
  state.homebrewRaceEffectSearch = value
  render({ content: true })
}, 200)

const debouncedHomebrewMonsterSkillSearch = debounce(value => {
  syncHomebrewMonsterDraftFromForm()
  state.homebrewMonsterSkillSearch = value
  render({ content: true })
}, 200)

const clickActions = {
  selectCharacter(target) {
    selectCharacterById(target.dataset.selectCharacter)
    setSidebarOpen(false)
  },
  duplicateCharacter(target) { doDuplicateCharacter(target.dataset.duplicateCharacter) },
  learnSkill(target) { doLearnSkill(target.dataset.learnSkill) },
  refundSkill(target) { doRefundSkill(target.dataset.refundSkill) },
  toggleSkill(target) { doToggleSkill(target.dataset.toggleSkill) },
  useSkill(target) { doUseSkill(target.dataset.useSkill) },
  skillViewMode(target) { doSetSkillViewMode(target.dataset.skillViewMode) },
  skillCategory(target) {
    state.skillCategory = target.dataset.skillCategory || state.skillCategory
    const character = activeCharacter()
    state.skillSubcategory = visibleSubcategories(state.skillCategory, character)[0] || subcategoriesFor(state.skillCategory, character)[0] || ''
    resetFusionFilters(state)
    applyFusionNavigationState(state)
    syncFusionFilters(character)
    render({ content: true })
    syncUrlState()
  },
  skillSubcategory(target) {
    state.skillSubcategory = target.dataset.skillSubcategory || state.skillSubcategory
    resetFusionFilters(state)
    applyFusionNavigationState(state)
    syncFusionFilters(activeCharacter())
    render({ content: true })
    syncUrlState()
  },
  fusionFilter(target) {
    const dim = target.dataset.fusionFilterDim
    const value = target.dataset.fusionFilterValue
    if (!dim || !value) return
    state.skillFusionFilters = toggleFusionFilterValue(state.skillFusionFilters, dim, value)
    render({ content: true })
    syncUrlState()
  },
  clearFusionFilters() {
    resetFusionFilters(state)
    render({ content: true })
    syncUrlState()
  },
  upgradeStat(target) { doUpgradeStat(target.dataset.upgradeStat) },
  refundStat(target) { doRefundStat(target.dataset.refundStat) },
  buyItem(target) { doBuyItem(target.dataset.buyItem, false) },
  grantItem(target) { doBuyItem(target.dataset.grantItem, true) },
  craftRecipe(target) { doCraftRecipe(target.dataset.craftRecipe) },
  grantCraftRecipe(target) { doGrantCraftRecipe(target.dataset.grantCraftRecipe) },
  removeItem(target) { doRemoveInventoryEntry(target.dataset.removeItem) },
  equipItem(target) { doEquipItem(target.dataset.equipItem) },
  equipOffhand(target) { doEquipItem(target.dataset.equipOffhand, 'offhand') },
  beginNewCombat() { doBeginNewCombat() },
  stopPerformance() { doStopPerformance() },
  unequip(target) { doUnequip(target.dataset.unequip) },
  removeEnchant(target) {
    doRemoveEnchantment(target.dataset.removeEnchant, target.dataset.enchantId)
  },
  applyEnchantGear(target) {
    doApplyEnchantment(target.dataset.applyEnchantGear, target.dataset.applyEnchantScroll)
  },
  shieldSoakGear(target) {
    doRecordEnchantShieldAbsorption(
      target.dataset.shieldSoakGear,
      target.dataset.enchantId,
      target.dataset.shieldSoakAmount
    )
  },
  resetItemFilters() {
    resetItemFilters()
    render({ content: true })
  },
  itemPagePrev() {
    state.itemPage = Math.max(0, state.itemPage - 1)
    render({ content: true })
    syncUrlState()
  },
  itemPageNext() {
    state.itemPage += 1
    render({ content: true })
    syncUrlState()
  },
  gmPremadePagePrev() {
    state.gmPremadePage = Math.max(0, state.gmPremadePage - 1)
    render({ content: true })
  },
  gmPremadePageNext() {
    state.gmPremadePage += 1
    render({ content: true })
  },
  saveNotesButton: () => {
    const notes = document.querySelector('#character-notes')
    persistNotes(notes?.value || '', false)
  },
  healFull() { doHeal() },
  staminaFull() { doRestoreStamina() },
  processTurn() { doProcessTurn() },
  recoveryRoll() { doRollRecoveryCheck() },
  manualRevivalStart() {
    const name = prompt('Helper name (optional):', '') || ''
    doBeginManualRevival(name)
  },
  manualRevivalAdvance() { doContinueManualRevival() },
  manualRevivalCancel() { doClearManualRevival() },
  removeEffect(target) { doRemoveStatusEffect(target.dataset.removeEffect) },
  addEffect() {
    doAddStatusEffect(
      document.querySelector('#effect-select')?.value,
      document.querySelector('#effect-duration')?.value,
      document.querySelector('#effect-potency')?.value,
      document.querySelector('#effect-notes')?.value || ''
    )
  },
  adjustResource(target) {
    doAdjustResource(target.dataset.adjustResource, Number(target.dataset.amount || 0))
  },
  fullResource(target) { doFillResource(target.dataset.fullResource) },
  coin(target) { doAdjustCurrency(Number(target.dataset.coin || 0)) },
  exportCharacter() { exportData(false) },
  exportAllBottom() { exportData(true) },
  deleteActive() {
    const character = activeCharacter()
    if (character) doDeleteCharacter(character.id)
  },
  toggleGmMode() { doActivateGmModeToggle() },
  spawnPremade(target) {
    const premadeId = target.dataset.spawnPremade
    const countInput = target.closest('.premade-card')?.querySelector('[data-premade-count-for]')
    const count = Math.max(1, Math.min(10, Number(countInput?.value || 1)))
    doSpawnPremadeCharacter(premadeId, count)
  },
  generateNpcTurn() { doGenerateNpcTurn() },
  printCharacterSheet() { doPrintCharacterSheet() },
  selectAllGmTurn() { doSelectAllGmTurnCharacters() },
  clearGmTurn() { doClearGmTurnCharacters() },
  selectGmTurnFromFolder() {
    const folderKey = document.querySelector('#gm-turn-folder-select')?.value
    if (!folderKey) return toast('Pick a roster folder first.')
    doSelectGmTurnFromFolder(folderKey)
  },
  addInitiativeEntry() { doAddInitiativeEntry() },
  addRosterInitiative() { doAddRosterToInitiativeTracker() },
  addInitiativeFromFolder() {
    const folderKey = document.querySelector('#initiative-folder-select')?.value
    if (!folderKey) return toast('Pick a roster folder first.')
    doAddFolderToInitiativeTracker(folderKey)
  },
  setInitiativeActive(target) { doSetInitiativeActiveEntry(target.dataset.setInitiativeActive) },
  initiativeNext() { doNextInitiativeTurn() },
  initiativeResetRound() { doResetInitiativeRound() },
  clearInitiative() { doClearInitiativeTracker() },
  gmPremadeCategory(target) {
    state.gmPremadeCategory = target.dataset.gmPremadeCategory || 'all'
    state.gmPremadePage = 0
    render({ content: true })
  },
  addEncounterRoster() {
    const characterId = document.querySelector('#encounter-roster-select')?.value
    if (!characterId) return toast('Pick a roster character first.')
    doAddEncounterPartyMemberFromRoster(characterId)
  },
  addEncounterManual() { doAddEncounterPartyMemberManual() },
  removeEncounterParty(target) { doRemoveEncounterPartyMember(target.dataset.removeEncounterParty) },
  clearEncounterParty() { doClearEncounterParty() },
  addEncounterEnemy(target) { doAddEncounterEnemy(target.dataset.addEncounterEnemy) },
  removeEncounterEnemy(target) { doRemoveEncounterEnemy(target.dataset.removeEncounterEnemy) },
  clearEncounterEnemies() { doClearEncounterEnemies() },
  focusEncounterEnemy(target) { doFocusEncounterEnemyQuantity(target.dataset.focusEncounterEnemy) },
  addEncounterEnemyRoster() {
    const characterId = document.querySelector('#encounter-enemy-roster-select')?.value
    if (!characterId) return toast('Pick a roster character first.')
    doAddEncounterEnemyFromRoster(characterId)
  },
  addEncounterEnemyManual() { doAddEncounterEnemyManualRow() },
  generateGmMonster() { doGenerateGmMonsterPreview() },
  randomiseGmMonster() { doRandomiseGmMonsterBuilder() },
  resetGmMonster() { doResetGmMonsterBuilder() },
  saveGmMonster() { doSaveGmMonsterToRoster() },
  saveGmMonsterEncounter() { doSaveGmMonsterToRosterAndEncounter() },
  duplicateGmMonster() { doDuplicateGmMonsterPreview() },
  gmMonsterCustomAction() { doAddGmMonsterCustomAction() },
  gmMonsterCustomTrait() { doAddGmMonsterCustomTrait() },
  gmMonsterCustomActionRemove(target) {
    doRemoveGmMonsterCustomAction(Number(target.dataset.gmMonsterCustomActionRemove))
  },
  gmMonsterCustomTraitRemove(target) {
    doRemoveGmMonsterCustomTrait(Number(target.dataset.gmMonsterCustomTraitRemove))
  },
  gmMonsterAddResist() {
    const element = document.querySelector('#gm-builder-affinity-element')?.value
    doAddGmMonsterAffinity('resistances', element)
  },
  gmMonsterAddWeak() {
    const element = document.querySelector('#gm-builder-affinity-element')?.value
    doAddGmMonsterAffinity('weaknesses', element)
  },
  gmMonsterAffinityRemove(target) {
    const [kind, element] = String(target.dataset.gmMonsterAffinityRemove || '').split(':')
    doRemoveGmMonsterAffinity(kind, element)
  },
  gmBuilderCategory(target) {
    doUpdateGmMonsterBuilderDraft({ category: target.dataset.gmBuilderCategory, previewCharacter: null })
  },
  gmBuilderSpecial(target) {
    doToggleGmMonsterBuilderSpecial(target.dataset.gmBuilderSpecial)
  },
  homebrewMonsterNew(target) {
    doStartHomebrewMonsterEditor(target.dataset.homebrewMonsterNew)
  },
  homebrewMonsterEdit(target) {
    doStartHomebrewMonsterEditor(target.dataset.homebrewMonsterEdit, target.dataset.homebrewMonsterId)
  },
  homebrewMonsterDelete(target) {
    doRemoveHomebrewMonsterTemplate(target.dataset.homebrewMonsterDelete, target.dataset.homebrewMonsterId)
  },
  homebrewMonsterDuplicate(target) {
    doCopyHomebrewMonsterTemplate(target.dataset.homebrewMonsterDuplicate, target.dataset.homebrewMonsterId)
  },
  setTheme(target) {
    applyTheme(target.dataset.setTheme)
  },
  setAppearance(target) {
    applyAppearance(target.dataset.setAppearance)
  },
  createCharacterFolder() {
    const name = prompt('Folder name (e.g. Forest Ambush, Boss Room):', '')
    if (name != null) doCreateCharacterFolder(name)
  },
  homebrewNew() { doStartHomebrewEditor() },
  homebrewSkillNew() { doStartHomebrewSkillEditor() },
  homebrewRaceNew() { doStartHomebrewRaceEditor() },
  homebrewEdit(target) { doStartHomebrewEditor(target.dataset.homebrewEdit) },
  homebrewSkillEdit(target) { doStartHomebrewSkillEditor(target.dataset.homebrewSkillEdit) },
  homebrewRaceEdit(target) { doStartHomebrewRaceEditor(target.dataset.homebrewRaceEdit) },
  homebrewDelete(target) { doRemoveHomebrewItem(target.dataset.homebrewDelete) },
  homebrewRestore(target) { doRestoreHomebrewItemEntry(target.dataset.homebrewRestore) },
  homebrewSkillDelete(target) { doRemoveHomebrewSkill(target.dataset.homebrewSkillDelete) },
  homebrewRaceDelete(target) { doRemoveHomebrewRace(target.dataset.homebrewRaceDelete) },
  homebrewDuplicate(target) { doCopyHomebrewItem(target.dataset.homebrewDuplicate) },
  homebrewSkillDuplicate(target) { doCopyHomebrewSkill(target.dataset.homebrewSkillDuplicate) },
  homebrewRaceDuplicate(target) { doCopyHomebrewRace(target.dataset.homebrewRaceDuplicate) },
  homebrewExportSelected() { doExportHomebrewSelection(false) },
  homebrewExportAll() { doExportHomebrewSelection(true) },
  homebrewExportCampaign() { doExportHomebrewCampaignPack() },
  homebrewToggleArchived() { doToggleHomebrewShowArchived() },
  homebrewToggleDrafts() { doToggleHomebrewShowDrafts() },
  homebrewImportConfirm() { doConfirmHomebrewImportPreview() },
  homebrewImportCancel() { doCancelHomebrewImportPreview() },
  homebrewBackgroundNew() { doStartHomebrewBackgroundEditor() },
  homebrewBackgroundEdit(target) { doStartHomebrewBackgroundEditor(target.dataset.homebrewBackgroundEdit) },
  homebrewBackgroundDuplicate(target) { doCopyHomebrewBackground(target.dataset.homebrewBackgroundDuplicate) },
  homebrewBackgroundDelete(target) { doRemoveHomebrewBackground(target.dataset.homebrewBackgroundDelete) },
  homebrewRecipeNew() { doStartHomebrewRecipeEditor() },
  homebrewRecipeEdit(target) { doStartHomebrewRecipeEditor(target.dataset.homebrewRecipeEdit) },
  homebrewRecipeDelete(target) { doArchiveHomebrewRecipeEntry(target.dataset.homebrewRecipeDelete) },
  homebrewCancel() { doCancelHomebrewEditor() },
  homebrewToggleEffects() { doToggleHomebrewEffectPicker() },
  homebrewToggleSkillEffects() { doToggleHomebrewSkillEffectPicker() },
  homebrewToggleSkillUseEffects() { doToggleHomebrewSkillUseEffectPicker() },
  homebrewEffectRemove(target) { doRemoveHomebrewDraftEffect(target.dataset.homebrewEffectRemove) },
  homebrewSkillEffectRemove(target) { doRemoveHomebrewSkillDraftEffect(target.dataset.homebrewSkillEffectRemove) },
  homebrewSkillUseEffectRemove(target) { doRemoveHomebrewSkillUseDraftEffect(target.dataset.homebrewSkillUseEffectRemove) },
  homebrewToggleCounter() { doToggleHomebrewCounterOptions() },
  homebrewClearCounter() { doClearHomebrewDraftCounter() },
  homebrewToggleRaceEffects() { doToggleHomebrewRaceEffectPicker() },
  homebrewRaceEffectRemove(target) { doRemoveHomebrewRaceDraftEffect(target.dataset.homebrewRaceEffectRemove) },
  homebrewFilter(target) { doSetHomebrewListFilter(target.dataset.homebrewFilter) },
  grantHomebrew(target) {
    const itemId = target.dataset.grantHomebrew
    const select = document.querySelector(`#homebrew-grant-${CSS.escape(itemId)}`)
    doGrantHomebrewItem(itemId, select?.value)
  },
  grantHomebrewSkill(target) {
    const skillId = target.dataset.grantHomebrewSkill
    const select = document.querySelector(`#homebrew-skill-grant-${CSS.escape(skillId)}`)
    doGrantHomebrewSkill(skillId, select?.value)
  },
  homebrewSelect(target) {
    doToggleHomebrewSelect(target.dataset.homebrewSelect, target.checked)
  },
  homebrewSkillSelect(target) {
    doToggleHomebrewSkillSelect(target.dataset.homebrewSkillSelect, target.checked)
  },
  homebrewBackgroundSelect(target) {
    doToggleHomebrewBackgroundSelect(target.dataset.homebrewBackgroundSelect, target.checked)
  },
  homebrewRecipeSelect(target) {
    doToggleHomebrewRecipeSelect(target.dataset.homebrewRecipeSelect, target.checked)
  },
  homebrewImportDismiss() { doCancelHomebrewImportPreview() },
  homebrewRaceSelect(target) {
    doToggleHomebrewRaceSelect(target.dataset.homebrewRaceSelect, target.checked)
  },
  homebrewMonsterSelect(target) {
    doToggleHomebrewMonsterSelect(target.dataset.homebrewMonsterSelect, target.checked)
  },
  homebrewMonsterToggleSkills() { doToggleHomebrewMonsterSkillPicker() },
  homebrewMonsterAddResist() {
    const element = document.querySelector('#homebrew-monster-affinity-element')?.value
    doAddHomebrewMonsterDraftAffinity('resistances', element)
  },
  homebrewMonsterAddWeak() {
    const element = document.querySelector('#homebrew-monster-affinity-element')?.value
    doAddHomebrewMonsterDraftAffinity('weaknesses', element)
  },
  homebrewMonsterAddImmune() {
    const element = document.querySelector('#homebrew-monster-affinity-element')?.value
    doAddHomebrewMonsterDraftAffinity('immunities', element)
  },
  homebrewMonsterAffinityRemove(target) {
    const [kind, tag] = String(target.dataset.homebrewMonsterAffinityRemove || '').split(':')
    doRemoveHomebrewMonsterDraftAffinity(kind, tag)
  },
  homebrewMonsterSkillRemove(target) {
    doRemoveHomebrewMonsterDraftSkill(target.dataset.homebrewMonsterSkillRemove)
  },
  homebrewMonsterImmunityToggle(target) {
    doToggleHomebrewMonsterDraftImmunity(target.dataset.homebrewMonsterImmunityToggle)
  },
  inventoryCounter(target) {
    doAdjustInventoryCounter(target.dataset.inventoryCounter, Number(target.dataset.counterDelta || 0))
  },
  toggleEntryStar(target) { doToggleInventoryEntryStar(target.dataset.toggleEntryStar) },
  toggleEntryLock(target) { doToggleInventoryEntryLock(target.dataset.toggleEntryLock) },
  toggleCatalogStar(target) { doToggleCatalogItemStar(target.dataset.toggleCatalogStar) },
  toggleSkillPin(target) { doTogglePinnedSkill(target.dataset.toggleSkillPin) },
  toggleSkillStar(target) { doToggleSkillStar(target.dataset.toggleSkillStar) },
  toggleRecipeStar(target) { doToggleRecipeStar(target.dataset.toggleRecipeStar) },
  setNotePage(target) { doSetActiveNotePage(target.dataset.setNotePage) },
  addNotePage() { doAddNotePage() },
  deleteNotePage(target) { doDeleteNotePage(target.dataset.deleteNotePage) },
  addQuest() { doAddQuestEntry() },
  removeQuest(target) { doRemoveQuestEntry(target.dataset.removeQuest) },
  addWeather() {
    doAddWeatherEffect(
      document.querySelector('#weather-select')?.value,
      document.querySelector('#weather-duration')?.value,
      document.querySelector('#weather-notes')?.value || ''
    )
  },
  removeWeather(target) { doRemoveWeatherEffect(target.dataset.removeWeather) },
  weatherCombatRoll(target) { doSetWeatherCombatRoll(target.dataset.weatherCombatRoll, target.value) },
  numberStepperDelta(target) {
    const wrap = target.closest('.number-stepper')
    const input = wrap?.querySelector('input[type="number"]')
    if (!input) return
    stepNumberInput(input, Number(target.dataset.numberStepperDelta || 0))
  },
  startActiveEncounter() { doStartActiveEncounter() },
  endActiveEncounter() { doEndActiveEncounter() },
  encounterNextTurn() { doEncounterNextTurn() },
  encounterPrevTurn() { doEncounterPrevTurn() },
  encounterAdvanceRound() { doEncounterAdvanceRound() },
  encounterProcessActive() { doEncounterProcessActive() },
  encounterProcessTurn(target) { doEncounterProcessTurn(target.dataset.encounterProcessTurn) },
  encounterAdjustHp(target) {
    doEncounterAdjustResource(target.dataset.encounterAdjustHp, 'hp', Number(target.dataset.amount || 0))
  },
  encounterAdjustSta(target) {
    doEncounterAdjustResource(target.dataset.encounterAdjustSta, 'stamina', Number(target.dataset.amount || 0))
  },
  encounterToggleDefeated(target) { doEncounterToggleDefeated(target.dataset.encounterToggleDefeated) },
  encounterRemove(target) { doEncounterRemove(target.dataset.encounterRemove) },
  encounterDuplicate(target) { doEncounterDuplicate(target.dataset.encounterDuplicate) },
  encounterExpand(target) { doEncounterToggleExpand(target.dataset.encounterExpand) },
  encounterFilter(target) {
    state.encounterCombatantFilter = target.dataset.encounterFilter || 'all'
    render({ content: true })
  },
  guidedNext() { doGuidedCreateNext() },
  guidedBack() { doGuidedCreateBack() },
  guidedFinish() { doGuidedCreateFinish() },
  guidedCancel() { doCancelGuidedCreate() },
  guidedDismiss(target, event) {
    if (event.target === target) doCancelGuidedCreate()
  },
  guidedPlaystyle(target) {
    if (!state.guidedCreate) return
    state.guidedCreate.playstyle = target.dataset.guidedPlaystyle || ''
    state.guidedCreate.dirty = true
    render({ content: true })
  },
  guidedBrowseSkills() {
    if (!state.guidedCreate) return
    state.guidedCreate.browseSkills = !state.guidedCreate.browseSkills
    render({ content: true })
  },
  guidedBrowseItems() {
    if (!state.guidedCreate) return
    state.guidedCreate.browseItems = !state.guidedCreate.browseItems
    render({ content: true })
  },
  guidedLearnSkill(target) {
    const draft = state.guidedCreate?.draftCharacter
    if (!draft) return
    const result = learnSkillOnDraft(draft, target.dataset.guidedLearnSkill)
    if (!result.ok) return toast(result.reason)
    state.guidedCreate.dirty = true
    render({ content: true })
  },
  guidedRefundSkill(target) {
    const draft = state.guidedCreate?.draftCharacter
    if (!draft) return
    refundSkillOnDraft(draft, target.dataset.guidedRefundSkill)
    state.guidedCreate.dirty = true
    render({ content: true })
  },
  guidedBuyItem(target) {
    const draft = state.guidedCreate?.draftCharacter
    if (!draft) return
    const result = buyItemOnDraft(draft, target.dataset.guidedBuyItem)
    if (!result.ok) return toast(result.reason)
    state.guidedCreate.dirty = true
    render({ content: true })
  },
  guidedUpgradeStat(target) {
    const draft = state.guidedCreate?.draftCharacter
    if (!draft) return
    const result = upgradeStatOnDraft(draft, target.dataset.guidedUpgradeStat)
    if (!result.ok) return toast(result.reason)
    state.guidedCreate.dirty = true
    render({ content: true })
  }
}

function invokeDataAction(event, actions) {
  let node = event.target instanceof Element ? event.target : null
  while (node && node !== document.documentElement) {
    if (node.dataset) {
      for (const [key, handler] of Object.entries(actions)) {
        if (node.dataset[key] !== undefined) {
          handler(node, event)
          return true
        }
      }
    }
    node = node.parentElement
  }
  return false
}

function handleCreateCharacter() {
  const nameInput = document.querySelector('#new-name')
  const raceInput = document.querySelector('#new-race')
  const name = nameInput?.value?.trim() || ''
  const raceId = raceInput?.value || ''
  if (!name) return toast('Give the poor little hero a name first.')
  const options = {}
  if (raceId === 'dragonborn') {
    const affinity = document.querySelector('#new-affinity')?.value || ''
    if (!affinity) return toast('Dragonborn must choose an elemental affinity.')
    options.elementalAffinity = affinity
  }
  if (raceId === 'human') {
    const starter = document.querySelector('#new-starter-skill')?.value || ''
    if (!starter) return toast('Humans get one free Tier 1 weapon skill — pick yours.')
    options.humanStarterSkill = starter
  }
  options.background = document.querySelector('#new-background')?.value || DEFAULT_BACKGROUND
  createAndSelectCharacter(name, raceId, options)
  if (nameInput) nameInput.value = ''
}

function handleTabShortcut(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return false
  if (/^(INPUT|TEXTAREA|SELECT)$/i.test(event.target?.tagName || '')) return false
  if (event.target?.isContentEditable) return false
  if (!/^[1-9]$/.test(event.key)) return false
  const nextTab = TAB_IDS[Number(event.key) - 1]
  if (!nextTab) return false
  event.preventDefault()
  switchTab(nextTab)
  return true
}

function initStaticEvents() {
  document.querySelector('#create-character')?.addEventListener('click', handleCreateCharacter)
  document.querySelector('#guided-create')?.addEventListener('click', () => doOpenGuidedCreate())

  document.querySelector('#new-name')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') handleCreateCharacter()
  })

  document.querySelector('#new-name')?.addEventListener('focus', () => {
    if (!isSidebarMobile()) return
    requestAnimationFrame(() => {
      document.querySelector('#new-name')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  })

  document.querySelector('#tabbar')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-tab]')
    if (!button) return
    switchTab(button.dataset.tab)
  })

  document.querySelector('#export-all')?.addEventListener('click', () => exportData(true))
  document.querySelector('#import-save')?.addEventListener('change', async event => {
    await importData(event.target.files?.[0])
    event.target.value = ''
  })

  document.addEventListener('submit', event => {
    if (event.target?.id === 'homebrew-form') {
      event.preventDefault()
      doSaveHomebrewDraftFromForm(event.target)
      return
    }
    if (event.target?.id === 'homebrew-skill-form') {
      event.preventDefault()
      doSaveHomebrewSkillDraftFromForm(event.target)
      return
    }
    if (event.target?.id === 'homebrew-race-form') {
      event.preventDefault()
      doSaveHomebrewRaceDraftFromForm(event.target)
      return
    }
    if (event.target?.id === 'homebrew-monster-form') {
      event.preventDefault()
      doSaveHomebrewMonsterDraftFromForm(event.target)
      return
    }
    if (event.target?.id === 'homebrew-background-form') {
      event.preventDefault()
      doSaveHomebrewBackgroundDraftFromForm(event.target)
      return
    }
    if (event.target?.id === 'homebrew-recipe-form') {
      event.preventDefault()
      doSaveHomebrewRecipeDraftFromForm(event.target)
    }
  })

  document.querySelector('#open-sidebar')?.addEventListener('click', event => {
    event.stopPropagation()
    setSidebarOpen(!isSidebarOpen())
  })
  document.querySelector('#collapse-sidebar')?.addEventListener('click', event => {
    event.stopPropagation()
    setSidebarOpen(!isSidebarOpen())
  })
  document.querySelector('#sidebar-backdrop')?.addEventListener('click', () => {
    setSidebarOpen(false)
  })

  syncSidebarLayout()
  window.addEventListener('resize', syncSidebarLayout, { passive: true })
  window.addEventListener('beforeunload', () => {
    debouncedNotesSave.flush?.()
    debouncedEntryNotes.flush?.()
    debouncedQuestUpdate.flush?.()
    debouncedNotePageTitle.flush?.()
  })

  document.addEventListener('touchmove', event => {
    if (!document.body.classList.contains('sidebar-open')) return
    if (event.target.closest('#sidebar')) return
    event.preventDefault()
  }, { passive: false })

  document.addEventListener('click', event => {
    if (!isSidebarMobile()) return
    if (!isSidebarOpen()) return
    if (event.target.closest('#sidebar') || event.target.closest('#open-sidebar')) return
    const focused = document.activeElement
    if (focused instanceof HTMLElement && focused.closest('#sidebar')) return
    setSidebarOpen(false)
  })

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (state.guidedCreate?.open) {
        doCancelGuidedCreate()
        return
      }
      if (!document.querySelector('#action-bar-skill-sheet')?.hidden) {
        closeActionBarSkillSheet()
        return
      }
      if (isSidebarOpen()) {
        setSidebarOpen(false)
        return
      }
    }
    if (handleTabShortcut(event)) return
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      const notes = document.querySelector('#character-notes')
      if (notes) {
        debouncedNotesSave.flush?.()
        persistNotes(notes.value || '', false, state.activeId)
      }
      saveNow()
      toast('Saved.')
    }
  })
}

function initDelegatedEvents() {
  document.addEventListener('pointerdown', event => {
    const removeBtn = event.target.closest('[data-remove-initiative]')
    if (!removeBtn) return
    event.preventDefault()
    doRemoveInitiativeEntry(removeBtn.dataset.removeInitiative)
  })

  document.addEventListener('click', event => {
    if (tryOpenActionBarSkillSheet(event)) return
    if (handleFolderMenuClick(event)) return
    if (handleCharacterMoveMenuClick(event)) return
    invokeDataAction(event, clickActions)
  })

  document.addEventListener('input', event => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return

    if (target.id === 'skill-search') {
      debouncedSkillSearch(target.value || '')
      return
    }
    if (target.matches('[data-guided-name]')) {
      if (!state.guidedCreate) return
      state.guidedCreate.form.name = target.value || ''
      state.guidedCreate.dirty = true
      return
    }
    if (target.matches('[data-encounter-search]')) {
      state.encounterCombatantSearch = target.value || ''
      render({ content: true })
      return
    }
    if (target.id === 'gm-premade-search') {
      debouncedGmPremadeSearch(target.value || '')
      return
    }
    if (target.id === 'item-search') {
      debouncedItemSearch(target.value || '')
      return
    }
    if (target.id === 'craft-search') {
      debouncedCraftSearch(target.value || '')
      return
    }
    if (target.id === 'homebrew-search') {
      debouncedHomebrewSearch(target.value || '')
      return
    }
    if (target.id === 'homebrew-effect-search') {
      debouncedHomebrewEffectSearch(target.value || '')
      return
    }
    if (target.id === 'homebrew-skill-effect-search') {
      debouncedHomebrewSkillEffectSearch(target.value || '')
      return
    }
    if (target.id === 'homebrew-skill-use-effect-search') {
      debouncedHomebrewSkillUseEffectSearch(target.value || '')
      return
    }
    if (target.id === 'homebrew-race-effect-search') {
      debouncedHomebrewRaceEffectSearch(target.value || '')
      return
    }
    if (target.id === 'homebrew-monster-skill-search') {
      debouncedHomebrewMonsterSkillSearch(target.value || '')
      return
    }
    if (target.id === 'glossary-search') {
      debouncedGlossarySearch(target.value || '')
      return
    }
    if (target.id === 'character-notes') {
      state.notesDirty = true
      debouncedNotesSave(state.activeId, target.value || '')
      return
    }
    if (target.matches('[data-entry-player-notes]')) {
      debouncedEntryNotes(state.activeId, target.dataset.entryPlayerNotes, target.value || '')
      return
    }
    if (target.matches('[data-note-page-title]')) {
      debouncedNotePageTitle(state.activeId, target.dataset.notePageTitle, target.value || '')
      return
    }
    if (target.matches('[data-quest-name]')) {
      debouncedQuestUpdate(state.activeId, target.dataset.questName, 'name', target.value || '')
      return
    }
    if (target.matches('[data-quest-giver]')) {
      debouncedQuestUpdate(state.activeId, target.dataset.questGiver, 'giver', target.value || '')
      return
    }
    if (target.matches('[data-quest-reward]')) {
      debouncedQuestUpdate(state.activeId, target.dataset.questReward, 'reward', target.value || '')
    }
  })

  document.addEventListener('change', event => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return

    if (target.matches('[data-resource-input]')) {
      doSetResource(target.dataset.resourceInput, Number(target.value || 0))
      return
    }
    if (target.matches('[data-gil-input]')) {
      doSetGil(Number(target.value || 0))
      return
    }
    if (target.matches('[data-money-input]')) {
      doSetGil(Number(target.value || 0))
      return
    }

    if (target.id === 'item-category') {
      state.itemCategory = target.value || 'all'
      state.itemPage = 0
      render({ content: true })
      return
    }
    if (target.id === 'item-source') {
      state.itemSource = target.value
      state.itemPage = 0
      render({ content: true })
      return
    }
    if (target.id === 'item-rarity') {
      state.itemRarity = target.value
      state.itemPage = 0
      render({ content: true })
      return
    }
    if (target.id === 'item-sort') {
      state.itemSort = target.value
      render({ content: true })
      return
    }
    if (target.id === 'item-buyable-only') {
      state.itemBuyableOnly = Boolean(target.checked)
      state.itemPage = 0
      render({ content: true })
      return
    }
    if (target.id === 'item-starred-only') {
      state.itemStarredOnly = Boolean(target.checked)
      state.itemPage = 0
      render({ content: true })
      return
    }
    if (target.id === 'skill-starred-only') {
      state.skillStarredOnly = Boolean(target.checked)
      render({ content: true })
      return
    }
    if (target.matches('[data-guided-race]')) {
      if (!state.guidedCreate) return
      state.guidedCreate.form.raceId = target.value || 'human'
      state.guidedCreate.form.elementalAffinity = ''
      state.guidedCreate.form.humanStarterSkill = ''
      state.guidedCreate.dirty = true
      render({ content: true })
      return
    }
    if (target.matches('[data-guided-background]')) {
      if (!state.guidedCreate) return
      state.guidedCreate.form.background = target.value || 'wanderer'
      state.guidedCreate.dirty = true
      return
    }
    if (target.matches('[data-guided-affinity]')) {
      if (!state.guidedCreate) return
      state.guidedCreate.form.elementalAffinity = target.value || ''
      state.guidedCreate.dirty = true
      return
    }
    if (target.matches('[data-guided-human-skill]')) {
      if (!state.guidedCreate) return
      state.guidedCreate.form.humanStarterSkill = target.value || ''
      state.guidedCreate.dirty = true
      return
    }
    if (target.id === 'craft-starred-only') {
      state.craftStarredOnly = Boolean(target.checked)
      render({ content: true })
      return
    }
    if (target.id === 'inventory-sort') {
      doSetInventorySort(target.value)
      return
    }
    if (target.id === 'inventory-filter') {
      doSetInventoryFilter(target.value)
      return
    }
    if (target.id === 'inventory-tag-filter') {
      doSetInventoryTagFilter(target.value)
      return
    }
    if (target.id === 'inventory-cursed-only') {
      doSetInventoryCursedOnly(Boolean(target.checked))
      return
    }
    if (target.matches('[data-quest-completed]')) {
      doUpdateQuestEntry(state.activeId, target.dataset.questCompleted, 'completed', target.checked)
      return
    }
    if (target.id === 'craft-profession') {
      state.craftProfession = target.value || 'all'
      render({ content: true })
      return
    }
    if (target.id === 'craft-learned-only') {
      state.craftLearnedOnly = Boolean(target.checked)
      render({ content: true })
      return
    }
    if (target.id === 'import-homebrew-pack') {
      importData(target.files?.[0]).then(() => { target.value = '' })
      return
    }
    if (target.id === 'change-race') {
      doSetRace(target.value)
      return
    }
    if (target.id === 'change-affinity') {
      doSetElementalAffinity(target.value)
      return
    }
    if (target.id === 'rename-character') doRenameCharacter(target.value)
    if (target.id === 'gm-spawn-folder') {
      doSetGmSpawnFolder(target.value)
    }
    if (target.id === 'gm-premade-sort') {
      state.gmPremadeSort = target.value || 'threat-desc'
      state.gmPremadePage = 0
      render({ content: true })
    }
    if (target.id === 'gm-premade-page-size') {
      state.gmPremadePageSize = Number(target.value) || 12
      state.gmPremadePage = 0
      render({ content: true })
    }
    if (target.dataset.encounterPartyName) {
      doUpdateEncounterPartyMember(target.dataset.encounterPartyName, 'name', target.value)
    }
    if (target.dataset.encounterPartySkill) {
      doUpdateEncounterPartyMember(target.dataset.encounterPartySkill, 'skillLevel', target.value)
    }
    if (target.dataset.encounterPartyPower) {
      doUpdateEncounterPartyMember(target.dataset.encounterPartyPower, 'combatPower', target.value)
    }
    if (target.dataset.encounterEnemyCount) {
      doSetEncounterEnemyCount(target.dataset.encounterEnemyCount, target.value)
    }
    if (target.dataset.encounterEnemyName) {
      doUpdateEncounterEnemyManual(target.dataset.encounterEnemyName, 'name', target.value)
    }
    if (target.dataset.encounterEnemyThreat) {
      doUpdateEncounterEnemyManual(target.dataset.encounterEnemyThreat, 'threatLevel', target.value)
    }
    if (target.id === 'gm-builder-name') {
      doUpdateGmMonsterBuilderDraft({ name: target.value, previewCharacter: null })
    }
    if (target.id === 'gm-builder-type') {
      doUpdateGmMonsterBuilderDraft({ typeId: target.value, previewCharacter: null })
    }
    if (target.id === 'gm-builder-role') {
      doUpdateGmMonsterBuilderDraft({ roleId: target.value, previewCharacter: null })
    }
    if (target.id === 'gm-builder-threat') {
      doUpdateGmMonsterBuilderDraft({ threatPresetId: target.value, previewCharacter: null })
    }
    if (target.id === 'gm-turn-folder-select') {
      doSetGmNpcTurnFolder(target.value)
    }
    if (target.id === 'initiative-folder-select') {
      doSetGmNpcTurnFolder(target.value)
    }
  })

  document.addEventListener('toggle', event => {
    const details = event.target
    if (!(details instanceof HTMLDetailsElement)) return
    if (!details.classList.contains('character-folder-details')) return
    const key = details.dataset.folderKey
    if (!key) return
    doRememberRosterFolderOpen(key, details.open)
  }, true)

  document.addEventListener('change', event => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return

    if (target.dataset.gmTurnCharacter) {
      doToggleGmTurnCharacter(target.dataset.gmTurnCharacter, target.checked)
      return
    }
    if (target.dataset.initiativeName) {
      doUpdateInitiativeEntry(target.dataset.initiativeName, { name: target.value })
      return
    }
    if (target.dataset.initiativeValue) {
      doUpdateInitiativeEntry(target.dataset.initiativeValue, { initiative: target.value })
      return
    }
    if (target.dataset.weatherCombatRoll) {
      doSetWeatherCombatRoll(target.dataset.weatherCombatRoll, target.value)
      return
    }
    if (target.dataset.homebrewEffectToggle) {
      doToggleHomebrewDraftEffect(target.dataset.homebrewEffectToggle)
      return
    }
    if (target.dataset.homebrewSkillEffectToggle) {
      doToggleHomebrewSkillDraftEffect(target.dataset.homebrewSkillEffectToggle)
      return
    }
    if (target.dataset.homebrewSkillUseEffectToggle) {
      doToggleHomebrewSkillUseDraftEffect(target.dataset.homebrewSkillUseEffectToggle)
      return
    }
    if (target.dataset.homebrewRaceEffectToggle) {
      doToggleHomebrewRaceDraftEffect(target.dataset.homebrewRaceEffectToggle)
      return
    }
    if (target.dataset.homebrewMonsterSkillToggle) {
      doToggleHomebrewMonsterDraftSkill(target.dataset.homebrewMonsterSkillToggle)
      return
    }
    if (target.matches('#homebrew-skill-form [name="hbs-category"], #homebrew-skill-form [name="hbs-skill-type"], #homebrew-skill-form [name="hbs-damage-mode"]')) {
      syncHomebrewSkillDraftFromForm(target.closest('#homebrew-skill-form'))
      if (target.name === 'hbs-category') alignHomebrewSkillSubcategory(state.homebrewSkillDraft)
      render({ content: true })
      return
    }
    if (target.matches('#homebrew-form [name="hb-type"]')) {
      syncHomebrewDraftFromForm(target.closest('#homebrew-form'))
      render({ content: true })
      return
    }
    if (target.dataset.homebrewBackgroundSelect) {
      doToggleHomebrewBackgroundSelect(target.dataset.homebrewBackgroundSelect, target.checked)
      return
    }
    if (target.dataset.homebrewRecipeSelect) {
      doToggleHomebrewRecipeSelect(target.dataset.homebrewRecipeSelect, target.checked)
      return
    }
    if (target.matches('[data-homebrew-import-mode]')) {
      doSetHomebrewImportOption('mode', target.value)
      return
    }
    if (target.matches('[data-homebrew-import-skip-conflicts]')) {
      doSetHomebrewImportOption('skipConflicts', target.checked)
    }
  })
}

export function initEvents() {
  if (initialized) return
  initialized = true
  initStaticEvents()
  initDelegatedEvents()
}
