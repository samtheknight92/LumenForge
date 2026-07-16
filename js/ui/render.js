import { $, $$, esc, titleCase } from '../core/utils.js'
import { STAT_RULES, ITEMS_PER_PAGE, DRAGONBORN_AFFINITIES, HOMEBREW_ITEM_TYPES, HOMEBREW_RARITIES, HOMEBREW_SKILL_CATEGORIES, HOMEBREW_SKILL_TYPES, HOMEBREW_SKILL_DAMAGE_MODES, HOMEBREW_ELEMENT_TYPES, HOMEBREW_DAMAGE_STAT_KEYS, TIER_LUMEN_COST, WEAPON_SKILL_TREE_INTROS, HOMEBREW_OFFHAND_TYPES, HOMEBREW_WEAPON_HANDS, HOMEBREW_BALANCE_TAGS, HOMEBREW_APPROVAL_STATUSES, HOMEBREW_SKILL_APPLY_TO, HOMEBREW_SKILL_EFFECT_KINDS, HOMEBREW_SKILL_USE_LIMITS } from '../core/constants.js'
import {
  getNextStatUpgradeCost,
  getLatestStatRefund,
  getPurchasedStatCount,
  purchasesUntilNextBand
} from '../character/stat-costs.js'
import { state, activeCharacter } from '../core/state.js'
import { raceOptions, getRace, getSkill, getItem, cache } from '../core/cache.js'
import { computeStats, statBreakdown, getEffect } from '../character/character.js'
import { offhandSlotLockReason, weaponHandednessLabel, offhandTypeLabel, canEquipToOffhand, isOffhandItem, canEquipToMainHand, getEquippedWeapon, getWeaponKind } from '../items/equipment.js'
import { activePerformanceStatuses, formatPerformanceMeta } from '../combat/instruments.js'
import {
  visibleSubcategories,
  visibleSkillCategories,
  skillsInSubcategory,
  displayCategory,
  canLearnSkill,
  displaySubcategory,
  syncFusionFilters,
  fusionFilterOptions,
  incompatibilityReason,
  isToggleSkill,
  prereqLabel,
  humanStarterWeaponOptions
} from '../skills/skills.js'
import {
  displayFusionCareerKind,
  displayFusionElement,
  displayFusionWeapon,
  hasActiveFusionFilters
} from '../skills/fusion-nav.js'
import {
  getFocusedSkillContext,
  focusedCategories,
  focusedSubcategories,
  skillIsFocused,
  isOutsideFocus
} from '../skills/focused-skills.js'
import { computeSkillLevel, skillLevelTooltip } from '../character/skill-level.js'
import { computeCombatPower, combatPowerTooltip } from '../character/combat-power.js'
import { threatLevelTooltip } from '../character/threat-level.js'
import {
  computeEncounterDifficulty,
  suggestEnemyQuantities,
  summarizeEncounter,
  generateEncounterWarnings
} from '../gm/encounter-balancer.js'
import { isTableRuleRacePassive, racePassiveTooltip } from '../character/race-passives.js'
import { knockoutStatusLabel, isKnockedOut, isDead } from '../character/knockout.js'
import { listHomebrewItems, listHomebrewSkills, listHomebrewRaces, listHomebrewBackgrounds, listHomebrewRecipes, listHomebrewMonsterTypes, listHomebrewMonsterRoles, listHomebrewMonsterSpecials, homebrewSkillTreeOptions, homebrewRaceOptionsForSkills, homebrewWeaponKindOptions, weaponKindDisplayLabel, homebrewSkillLockOptions, homebrewSkillLockSummary, isHomebrewSkill, homebrewBalanceWarning, listMonsterTemplateSkillOptions, MONSTER_IMMUNITY_EXTRA_TAGS } from '../homebrew/homebrew.js'
import {
  listBuilderTypeOptions,
  listBuilderRoleOptions,
  listBuilderThreatPresets,
  listBuilderSpecialOptions,
  buildMonsterPreviewSummary,
  suggestMonsterName,
  getBuilderAffinityView
} from '../gm/gm-monster-builder.js'
import { resolveEncounterEnemyGroups } from '../gm/encounter-enemies.js'
import { homebrewDamageStatLabel } from '../homebrew/homebrew-combat.js'
import { isGmMode } from '../gm/gm-mode.js'
import {
  filterPremadeCharacters,
  premadeCategories,
  countPremadeInRoster,
  premadeTemplateThreatLevel,
  getPremadeCharacter,
  PREMADE_SORT_OPTIONS,
  PREMADE_PAGE_SIZES,
  paginatePremadeList
} from '../character/premade-characters.js'
import { filterCatalogItems, paginateItems, isShopPurchaseItem, shopMinLevelForItem, shopPurchaseCheck, ITEM_CATALOG_CATEGORIES, catalogCategoryCounts, catalogSourceCounts, activeCatalogFilterLabels, itemHasCounter, itemCounterLabel, inventoryCounterValue } from '../items/items.js'
import { renderGuidedCreateModal } from './guided-create.js'
import { renderHowToPlayTab } from './how-to-play.js?v=5.2.2-howtoplay-fix'
import {
  manualEffectList,
  groupedManualEffects,
  groupedWeatherEffects,
  effectList,
  effectDurationLabel,
  effectTypeLabel,
  effectTone,
  effectTooltip,
  effectUsesPotency,
  effectPotencyLabel,
  characterEffectSources,
  statusStatModifiers
} from '../effects/effects.js'
import { weatherGameplayLines } from '../combat/weather-effects.js'
import { formatCurrency, formatStatModifiers, fallbackIcon, itemPriceGil, normalizeGil } from './format.js'
import { renderNumberStepper } from './number-stepper.js'
import { itemTooltip, skillTooltip, statTooltip, statUpgradeTooltip, statRefundTooltip } from './tooltips-text.js'
import {
  resolveItemPresentation,
  renderCursedBadgeHtml,
  renderItemStatusIcons,
  itemCardClass,
  itemCursedNameClass
} from '../items/item-presentation.js'
import {
  filterInventoryEntries,
  inventoryTagOptions,
  INVENTORY_SORT_OPTIONS,
  INVENTORY_FILTER_OPTIONS
} from '../items/inventory-nav.js'
import { renderActionBar } from '../combat/action-bar.js'
import { isActionBarSkill, getPinnedActionBarSkills, getSkillActivationType } from '../skills/skill-activation.js'
import { getBasicAttackSkill } from '../combat/combat.js'
import {
  formatSkillEffectBreakdownPlain,
  resolveSkillEffectBreakdown,
  skillHasEffectBreakdown
} from '../combat/damage-breakdown.js'
import { getEffectiveSkillStaminaCost } from '../skills/career-effects.js'
import { backgroundOptions, getBackground, backgroundRewardSummary, backgroundItemLabel, DEFAULT_BACKGROUND } from '../character/backgrounds.js'
import { sortInitiativeEntries, activeInitiativeEntry } from '../gm/gm-initiative.js'
import { filterCraftRecipes, canCraftRecipe, materialsStatus, craftProfessionOptions } from '../items/craft.js'
import { craftedByLabel } from '../items/craft-bonuses.js'
import {
  maxEnchantmentSlots,
  entryEnchantments,
  enchantmentTooltip,
  isEnhancementItem,
  compatibleEquippedGearForEnhancement,
  applyEnchantTargetLabel,
  enchantDisplayLabel,
  isShieldEnchant
} from '../items/enchantments.js'
import {
  computeElementalAffinity,
  elementalAffinityTooltip,
  elementalAffinityTone,
  isElementalAffinityRowVisible,
  ELEMENTS,
  normalizeBuilderElementId
} from '../combat/elemental-affinity.js'
import { filterGlossaryEntries, groupGlossaryEntries, GLOSSARY_CATEGORIES, getAllGlossaryEntries } from './glossary.js'
import {
  characterFolder,
  folderAssignOptions,
  listCharacterFolders,
  rosterFolderSections,
  isRosterFolderOpen,
  folderFilterOptions,
  filterCharactersByFolder,
  FOLDER_FILTER_ALL
} from '../character/character-folders.js'

export function render(options = { all: true }) {
  const opts = options.all
    ? { sidebar: true, header: true, content: true, tabs: true, actionBar: true }
    : { actionBar: options.actionBar !== false, ...options }
  if (opts.sidebar) {
    renderRaceSelects()
    renderCharacterList()
  }
  if (opts.header) renderHeader()
  if (opts.actionBar !== false) renderActionBar(activeCharacter())
  if (opts.tabs) syncTabBar()
  if (opts.content) renderContent()
}

function captureContentFocus() {
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return null
  if (!active.closest('#app-content') || !active.id) return null
  const capture = { id: active.id }
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    capture.selectionStart = active.selectionStart
    capture.selectionEnd = active.selectionEnd
  }
  return capture
}

function restoreContentFocus(capture) {
  if (!capture?.id) return
  const el = document.getElementById(capture.id)
  if (!(el instanceof HTMLElement)) return
  el.focus({ preventScroll: true })
  if (
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
    capture.selectionStart != null &&
    typeof el.setSelectionRange === 'function'
  ) {
    const start = capture.selectionStart
    const end = capture.selectionEnd ?? start
    try {
      el.setSelectionRange(start, end)
    } catch {
      // Some input types do not support selection ranges.
    }
  }
}

function syncTabBar() {
  $$('#tabbar button').forEach(tab => {
    const selected = tab.dataset.tab === state.tab
    tab.classList.toggle('active', selected)
    tab.setAttribute('aria-selected', selected ? 'true' : 'false')
  })
}

function renderBackgroundSelect() {
  const select = $('#new-background')
  if (!select) return
  const current = select.value || DEFAULT_BACKGROUND
  select.innerHTML = backgroundOptions().map(bg =>
    `<option value="${esc(bg.id)}">${esc(bg.icon || '✦')} ${esc(bg.name)}</option>`
  ).join('')
  if (backgroundOptions().some(bg => bg.id === current)) select.value = current
  else select.value = DEFAULT_BACKGROUND
  if (!select.dataset.ready) {
    select.dataset.ready = 'true'
    select.addEventListener('change', updateBackgroundPreview)
  }
  updateBackgroundPreview()
}

function updateBackgroundPreview() {
  const preview = $('#background-preview')
  const select = $('#new-background')
  if (!preview || !select) return
  const bg = getBackground(select.value)
  preview.innerHTML = [
    `<span class="create-preview-desc">${esc(bg.desc)}</span>`,
    `<span class="create-preview-start">Starting: ${esc(backgroundRewardSummary(bg))}.</span>`
  ].join('')
}

function renderRaceSelects() {
  const options = raceOptions().map(race => `<option value="${esc(race.id)}">${esc(race.icon || '✦')} ${esc(race.name)}</option>`).join('')
  const newRace = $('#new-race')
  if (newRace && !newRace.dataset.ready) {
    newRace.innerHTML = options
    const human = raceOptions().find(race => race.id === 'human')
    if (human) newRace.value = human.id
    newRace.dataset.ready = 'true'
    newRace.addEventListener('change', () => renderCreateExtras(newRace.value))
  }
  renderBackgroundSelect()
  renderCreateExtras(newRace?.value || 'human')
}

function renderCreateExtras(raceId) {
  const host = $('#create-extras')
  if (!host) return
  const parts = []
  if (raceId === 'dragonborn') {
    parts.push(`
      <label class="field-label" for="new-affinity">Elemental Affinity</label>
      <select id="new-affinity" class="input">
        <option value="">Choose affinity…</option>
        ${DRAGONBORN_AFFINITIES.map(affinity => `<option value="${esc(affinity)}">${esc(titleCase(affinity))}</option>`).join('')}
      </select>
    `)
  }
  if (raceId === 'human') {
    const starters = humanStarterWeaponOptions()
    parts.push(`
      <label class="field-label" for="new-starter-skill">Free Tier 1 Weapon Skill</label>
      <select id="new-starter-skill" class="input">
        <option value="">Choose starter skill…</option>
        ${starters.map(skill => `<option value="${esc(skill.id)}">${esc(skill.icon || '⚔️')} ${esc(skill.name)} (${esc(titleCase(skill.weaponType))})</option>`).join('')}
      </select>
    `)
  }
  host.innerHTML = parts.join('')
}

function renderCharacterCard(character) {
  const race = getRace(character.race)
  const skillLevel = computeSkillLevel(character)
  const combatPower = computeCombatPower(character)
  const folder = characterFolder(character)
  const folderOptions = folderAssignOptions(state, folder)
  return `
    <div class="character-card-wrap">
      <button type="button" class="character-card ${character.id === state.activeId ? 'active' : ''}" data-select-character="${esc(character.id)}">
        <strong>${esc(race?.icon || '👤')} ${esc(character.name)}</strong>
        <span>SL ${skillLevel.display} · CP ${combatPower.display} · ${skillLevel.skillCount} skills · ${character.lumens}L</span>
      </button>
      <div class="character-move-picker">
        <button
          type="button"
          class="ghost-btn tiny character-folder-move"
          data-toggle-character-move="${esc(character.id)}"
          data-tooltip="Move folder"
          title="Move folder"
          aria-label="Move ${esc(character.name)} to another folder"
          aria-expanded="false"
          aria-haspopup="menu"
        >→</button>
        <div class="character-move-menu" hidden data-character-move-menu="${esc(character.id)}" role="menu">
          ${folderOptions.map(opt => `
            <button
              type="button"
              role="menuitem"
              class="ghost-btn tiny character-move-option${opt.value === folder ? ' is-current' : ''}"
              data-move-character="${esc(character.id)}"
              data-move-folder="${esc(opt.value)}"
            >${esc(opt.label)}</button>
          `).join('')}
        </div>
      </div>
      <button type="button" class="ghost-btn tiny character-dup" data-duplicate-character="${esc(character.id)}" title="Duplicate character">⧉</button>
    </div>
  `
}

function renderFolderSummary(section, open) {
  const count = section.characters.length
  if (!section.canManage) {
    return `
      <summary class="character-folder-summary">
        <span class="character-folder-summary-text">${esc(section.label)} <span class="character-folder-count">(${count})</span></span>
      </summary>
    `
  }

  const atTop = section.folderIndex <= 0
  const atBottom = section.folderIndex >= section.folderCount - 1
  return `
    <summary class="character-folder-summary">
      <span class="character-folder-summary-text">${esc(section.label)} <span class="character-folder-count">(${count})</span></span>
      <span class="character-folder-picker">
        <button
          type="button"
          class="ghost-btn tiny character-folder-menu-btn"
          data-toggle-folder-menu="${esc(section.key)}"
          data-tooltip="Folder options"
          title="Folder options"
          aria-label="Folder options for ${esc(section.label)}"
          aria-expanded="false"
          aria-haspopup="menu"
        >⋯</button>
        <div class="character-folder-menu" hidden data-folder-menu="${esc(section.key)}" role="menu">
          <button type="button" role="menuitem" class="ghost-btn tiny character-folder-menu-option" data-folder-move-up="${esc(section.key)}" ${atTop ? 'disabled' : ''}>Move up</button>
          <button type="button" role="menuitem" class="ghost-btn tiny character-folder-menu-option" data-folder-move-down="${esc(section.key)}" ${atBottom ? 'disabled' : ''}>Move down</button>
          <button type="button" role="menuitem" class="ghost-btn tiny character-folder-menu-option" data-copy-folder="${esc(section.key)}">Copy folder</button>
          <button type="button" role="menuitem" class="ghost-btn tiny character-folder-menu-option danger-btn" data-delete-folder="${esc(section.key)}">Delete folder</button>
        </div>
      </span>
    </summary>
  `
}

function renderCharacterList() {
  const list = $('#character-list')
  if (!list) return
  if (!state.characters.length && !(state.characterFolderOrder || []).length) {
    list.innerHTML = '<div class="empty">No characters yet. Make a chaos gremlin above.</div>'
    return
  }

  const sections = rosterFolderSections(state)
  list.innerHTML = sections.map(section => {
    const open = isRosterFolderOpen(state, section.key, section.characters)
    const body = section.characters.length
      ? section.characters.map(renderCharacterCard).join('')
      : '<p class="subtle character-folder-empty">No characters here yet.</p>'
    return `
      <details class="character-folder-details" data-folder-key="${esc(section.key)}" ${open ? 'open' : ''}>
        ${renderFolderSummary(section, open)}
        <div class="character-folder-body">
          ${body}
        </div>
      </details>
    `
  }).join('')
}

function renderHeader() {
  const character = activeCharacter()
  const name = $('#current-name')
  const subtitle = $('#current-subtitle')
  const avatar = $('#current-avatar')
  const lumens = $('#lumens-pill')
  const hp = $('#hp-pill')
  const stamina = $('#stamina-pill')
  const coin = $('#coin-pill')
  if (!character) {
    name.textContent = 'No character selected'
    subtitle.textContent = 'Create or select a character to begin.'
    avatar.textContent = '?'
    lumens.textContent = '0'
    hp.textContent = '0/0'
    stamina.textContent = '0/0'
    coin.textContent = '0 Gil'
    return
  }
  const stats = computeStats(character)
  const race = getRace(character.race)
  const skillLevel = computeSkillLevel(character)
  const combatPower = computeCombatPower(character)
  name.textContent = character.name
  const koLabel = knockoutStatusLabel(character)
  subtitle.textContent = [
    race?.name || 'Unknown race',
    `Skill Level ${skillLevel.display}`,
    `Combat Power ${combatPower.display}`,
    isGmMode() ? 'GM Mode' : '',
    koLabel,
    `${character.skills.length} skills`,
    `${character.inventory.length} inventory lines`
  ].filter(Boolean).join(' · ')
  avatar.textContent = race?.icon || '👤'
  lumens.textContent = character.lumens
  hp.textContent = `${character.hp}/${stats.hp}`
  stamina.textContent = `${character.stamina}/${stats.stamina}`
  coin.textContent = formatCurrency(character.gil)
}

export function renderContent() {
  const focusCapture = captureContentFocus()
  const content = $('#app-content')
  const character = activeCharacter()
  if (!character && state.tab !== 'gm' && state.tab !== 'homebrew' && state.tab !== 'howtoplay') {
    content.innerHTML = `
      <div class="notice-card">
        <h2>Welcome to LumenForge ✨</h2>
        <p>This rebuild keeps the core idea: characters, races, lumens, skills, equipment and GM-friendly tools - but trims the clutter so it is actually usable at the table.</p>
      </div>
    `
    restoreContentFocus(focusCapture)
    return
  }

  const tabs = {
    character: () => renderCharacterTab(character),
    play: () => renderPlayTab(character),
    skills: () => renderSkillsTab(character),
    stats: () => renderStatsTab(character),
    shop: () => renderShopTab(character),
    craft: () => renderCraftTab(character),
    homebrew: () => renderHomebrewTab(),
    gm: () => renderGmTab(character),
    notes: () => renderNotesTab(character),
    howtoplay: () => renderHowToPlayTab()
  }
  content.innerHTML = (tabs[state.tab]?.() || '') + renderGuidedCreateModal()
  restoreContentFocus(focusCapture)
}

export function renderEquipSlots(character, emptyLabel = 'Empty') {
  const slots = ['weapon', 'offhand', 'armor', 'accessory']
  const offhandLocked = offhandSlotLockReason(character)
  return slots.map(slot => {
    const entry = character.inventory.find(inv => inv.uid === character.equipped[slot])
    const item = entry && getItem(entry.itemId)
    const presentation = item ? resolveItemPresentation(item, entry) : null
    const label = slot === 'offhand' ? 'Off-hand' : titleCase(slot)
    const enchantRow = entry && item ? renderEquipEnchantSlots(character, entry, item) : ''
    const rowTip = item ? itemTooltip(item, character, entry) : ''
    const lockedHint = slot === 'offhand' && offhandLocked && !item
      ? offhandLocked
      : ''
    const emptyText = lockedHint || emptyLabel
    const rowClass = [
      'equip-row equip-slot-row',
      lockedHint ? 'equip-slot-locked' : '',
      presentation?.showCurseChrome ? 'item-cursed-gm' : ''
    ].filter(Boolean).join(' ')
    const statusIcons = presentation ? renderItemStatusIcons(presentation) : ''
    const cursedBadge = presentation ? renderCursedBadgeHtml(presentation) : ''
    const cursedNameClass = presentation ? itemCursedNameClass(presentation) : ''
    const noteField = entry ? `
      <label class="field-label compact mt-12">Your notes
        <textarea class="input tiny equip-item-notes" data-entry-player-notes="${esc(entry.uid)}" rows="2" placeholder="Personal notes…">${esc(entry.playerNotes || '')}</textarea>
      </label>` : ''
    const entryActions = entry ? `
      <div class="wrap compact-actions mt-12">
        <button type="button" class="ghost-btn tiny" data-toggle-entry-star="${esc(entry.uid)}" aria-label="Star item">${entry.starred ? '⭐' : '☆'}</button>
        <button type="button" class="ghost-btn tiny" data-toggle-entry-lock="${esc(entry.uid)}" aria-label="Lock item">${entry.locked ? '🔒' : '🔓'}</button>
      </div>` : ''
    return `
      <div class="${rowClass}">
        <div class="equip-slot-copy"${rowTip ? ` data-tooltip="${esc(rowTip)}" tabindex="0"` : lockedHint ? ` data-tooltip="${esc(lockedHint)}" tabindex="0"` : ''}>
          <strong class="equip-slot-label">${label}${lockedHint ? ' <span class="subtle">(locked)</span>' : ''} ${cursedBadge} ${statusIcons}</strong>
          <div class="subtle equip-slot-item">${item ? `${fallbackIcon(item)} <span class="${cursedNameClass}">${esc(presentation.displayName)}</span> · ${formatStatModifiers(item.statModifiers)}` : emptyText}</div>
          ${entry && item ? renderItemCounterControls(entry, item, { showWhenEquipped: true }) : ''}
          ${noteField}
          ${entryActions}
          ${enchantRow}
        </div>
        ${item ? `<button type="button" class="ghost-btn tiny" data-unequip="${slot}">Unequip</button>` : ''}
      </div>
    `
  }).join('')
}

function renderEquipEnchantSlots(character, entry, item) {
  const max = maxEnchantmentSlots(entry, item)
  if (max <= 0) return ''
  const enchants = entryEnchantments(entry)
  const chips = []
  for (let i = 0; i < max; i++) {
    const ench = enchants[i]
    if (ench) {
      const tip = enchantmentTooltip(ench, item.name)
      if (isShieldEnchant(ench)) {
        chips.push(`
          <span class="enchant-slot-chip filled enchant-shield-chip" data-tooltip="${esc(tip)}" tabindex="0">
            ${esc(ench.icon || '✨')} ${esc(enchantDisplayLabel(ench))}
          </span>
          <button type="button" class="ghost-btn tiny enchant-shield-soak-btn" data-shield-soak-gear="${esc(entry.uid)}" data-enchant-id="${esc(ench.id)}" data-shield-soak-amount="1" title="Record 1 magical damage soaked">−1</button>
          <button type="button" class="ghost-btn tiny enchant-shield-soak-btn" data-shield-soak-gear="${esc(entry.uid)}" data-enchant-id="${esc(ench.id)}" data-shield-soak-amount="5" title="Record 5 magical damage soaked">−5</button>
          <button type="button" class="ghost-btn tiny enchant-remove-btn" data-remove-enchant="${esc(entry.uid)}" data-enchant-id="${esc(ench.id)}" title="Remove barrier">×</button>
        `)
      } else {
        const removeTip = `${tip}\n\nClick to remove and return to inventory.`
        chips.push(`
          <button type="button" class="enchant-slot-chip filled" data-remove-enchant="${esc(entry.uid)}" data-enchant-id="${esc(ench.id)}" data-tooltip="${esc(removeTip)}" title="Remove enchant">
            ${esc(ench.icon || '✨')} ${esc(enchantDisplayLabel(ench))}
          </button>
        `)
      }
    } else {
      chips.push(`
        <span class="enchant-slot-chip empty" data-tooltip="${esc('Empty enchant slot — use Apply on an enhancement in Inventory.')}" tabindex="0">Empty slot</span>
      `)
    }
  }
  return `<div class="enchant-slot-row">${chips.join('')}</div>`
}

function effectOptionsMarkup() {
  return groupedManualEffects().map(([group, effects]) => `
    <optgroup label="${esc(group)}">
      ${effects.map(effect => `<option value="${esc(effect.id)}">${esc(effect.icon || '✦')} ${esc(effect.name)}</option>`).join('')}
    </optgroup>
  `).join('')
}

function weatherOptionsMarkup() {
  return groupedWeatherEffects().map(effect =>
    `<option value="${esc(effect.id)}">${esc(effect.icon || '✦')} ${esc(effect.name)}</option>`
  ).join('')
}

function resolveActiveNotePage(character) {
  if (!character?.notePages?.length) return null
  const map = state.activeNotePageByCharacter || {}
  const activeId = map[character.id]
  return character.notePages.find(page => page.id === activeId) || character.notePages[0]
}

function renderEffectPill(effectId, source = '', status = null) {
  const effect = getEffect(effectId)
  if (!effect) return ''
  return `<span class="pill ${effectTone(effect)}" data-tooltip="${esc(effectTooltip(effectId, source, status))}" tabindex="0">${esc(effect.icon || '✦')} ${esc(effect.name)}</span>`
}

function renderHomebrewEffectSection(draft, options = {}) {
  const {
    intro = 'Pick established game effects so passives and combat math work like official content. Unique rules stay in the description.',
    showPicker = state.homebrewShowEffectPicker,
    search = state.homebrewEffectSearch,
    toggleData = 'homebrew-toggle-effects',
    searchId = 'homebrew-effect-search',
    toggleCheckbox = 'homebrew-effect-toggle',
    removeBtn = 'homebrew-effect-remove'
  } = options
  const selected = new Set(draft?.specialEffects || [])
  const selectedPills = [...selected].map(effectId => {
    const effect = getEffect(effectId)
    if (!effect) {
      return `<span class="pill warn">${esc(effectId)} <button type="button" class="homebrew-effect-remove" data-${removeBtn}="${esc(effectId)}" aria-label="Remove">×</button></span>`
    }
    return `<span class="pill ${effectTone(effect)}" data-tooltip="${esc(effectTooltip(effectId, 'Homebrew'))}" tabindex="0">${esc(effect.icon || '✦')} ${esc(effect.name)} <button type="button" class="homebrew-effect-remove" data-${removeBtn}="${esc(effectId)}" aria-label="Remove ${esc(effect.name)}">×</button></span>`
  }).join('')

  const query = String(search || '').toLowerCase().trim()
  const filtered = effectList().filter(effect => {
    if (!query) return true
    const hay = `${effect.name} ${effect.id} ${effect.desc} ${effect.type}`.toLowerCase()
    return hay.includes(query)
  })
  const groups = new Map()
  for (const effect of filtered) {
    const group = effectTypeLabel(effect.type)
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push(effect)
  }
  const pickerRows = [...groups.entries()].map(([group, effects]) => `
    <div class="homebrew-effect-group">
      <div class="homebrew-effect-group-title">${esc(group)}</div>
      ${effects.map(effect => `
        <label class="homebrew-effect-option ${selected.has(effect.id) ? 'selected' : ''}" data-tooltip="${esc(effectTooltip(effect.id, 'Catalog effect'))}" tabindex="0">
          <input type="checkbox" data-${toggleCheckbox}="${esc(effect.id)}" ${selected.has(effect.id) ? 'checked' : ''} />
          <span class="homebrew-effect-option-copy">
            <strong>${esc(effect.icon || '✦')} ${esc(effect.name)}</strong>
            <span class="subtle">${esc(effect.desc || '')}</span>
          </span>
        </label>
      `).join('')}
    </div>
  `).join('')

  return `
    <div class="homebrew-effects span-2">
      <div class="kicker">Special effects (optional)</div>
      <p class="subtle">${esc(intro)}</p>
      <div class="wrap detail-pills homebrew-effect-selected">${selectedPills || '<span class="pill">No effects selected</span>'}</div>
      <button type="button" class="ghost-btn tiny mt-12" data-${toggleData}>${showPicker ? 'Hide effect list' : 'Add effect(s)'}</button>
      ${showPicker ? `
        <div class="homebrew-effect-picker mt-12">
          <input class="input" id="${searchId}" placeholder="Search effects…" value="${esc(search || '')}" />
          <div class="homebrew-effect-list">${pickerRows || '<div class="empty">No effects match your search.</div>'}</div>
        </div>
      ` : ''}
    </div>
  `
}

function renderHomebrewMonsterPickers(draft) {
  const selectedSkills = new Set(draft.skillIds || [])
  const skillPills = (draft.skillIds || []).map(skillId => {
    const skill = getSkill(skillId)
    if (!skill) {
      return `<span class="pill warn">${esc(skillId)} <button type="button" class="homebrew-effect-remove" data-homebrew-monster-skill-remove="${esc(skillId)}" aria-label="Remove">×</button></span>`
    }
    return `<span class="pill" data-tooltip="${esc(skillTooltip(skillId))}" tabindex="0">${esc(skill.icon || '✦')} ${esc(skill.name)} <button type="button" class="homebrew-effect-remove" data-homebrew-monster-skill-remove="${esc(skillId)}" aria-label="Remove ${esc(skill.name)}">×</button></span>`
  }).join('')

  const skillQuery = String(state.homebrewMonsterSkillSearch || '').toLowerCase().trim()
  const skillOptions = listMonsterTemplateSkillOptions().filter(skill => {
    if (!skillQuery) return true
    const hay = `${skill.name} ${skill.id} ${skill.desc || ''} ${skill.subcategory || ''}`.toLowerCase()
    return hay.includes(skillQuery)
  })
  const skillGroups = new Map()
  for (const skill of skillOptions) {
    const group = titleCase(skill.subcategory || 'Monster')
    if (!skillGroups.has(group)) skillGroups.set(group, [])
    skillGroups.get(group).push(skill)
  }
  const skillPickerRows = [...skillGroups.entries()].map(([group, skills]) => `
    <div class="homebrew-effect-group">
      <div class="homebrew-effect-group-title">${esc(group)}</div>
      ${skills.map(skill => `
        <label class="homebrew-effect-option ${selectedSkills.has(skill.id) ? 'selected' : ''}" data-tooltip="${esc(skillTooltip(skill.id))}" tabindex="0">
          <input type="checkbox" data-homebrew-monster-skill-toggle="${esc(skill.id)}" ${selectedSkills.has(skill.id) ? 'checked' : ''} />
          <span class="homebrew-effect-option-copy">
            <strong>${esc(skill.icon || '✦')} ${esc(skill.name)}</strong>
            <span class="subtle">${esc(skill.desc || '')}</span>
          </span>
        </label>
      `).join('')}
    </div>
  `).join('')

  const elementMeta = id => ELEMENTS.find(row => row.id === id) || { id, icon: '✦', label: titleCase(id) }
  const affinityPill = (tag, kind, tone) => {
    const element = normalizeBuilderElementId(tag)
    const extra = MONSTER_IMMUNITY_EXTRA_TAGS.find(row => row.id === tag)
    const label = element ? `${elementMeta(element).icon} ${elementMeta(element).label}` : (extra?.label || titleCase(tag))
    return `<span class="pill ${tone} gm-affinity-pill">${label}<button type="button" class="gm-affinity-remove" data-homebrew-monster-affinity-remove="${esc(kind)}:${esc(tag)}" aria-label="Remove">×</button></span>`
  }

  const categories = draft.categories || ['monster']
  const resistances = draft.resistances || []
  const weaknesses = draft.weaknesses || []
  const immunities = draft.immunities || []

  return `
    <div class="span-2">
      <div class="kicker">Categories</div>
      <div class="wrap mt-12">
        <label class="pill-label"><input type="checkbox" name="hbm-cat-monster" ${categories.includes('monster') ? 'checked' : ''} /> Monster</label>
        <label class="pill-label"><input type="checkbox" name="hbm-cat-npc" ${categories.includes('npc') ? 'checked' : ''} /> NPC</label>
      </div>
    </div>
    <div class="span-2 homebrew-effects">
      <div class="kicker">Monster skills</div>
      <p class="subtle">Pick from the official monster skill list — only valid skills are saved.</p>
      <div class="wrap detail-pills homebrew-effect-selected mt-12">${skillPills || '<span class="subtle">No skills selected</span>'}</div>
      <button type="button" class="ghost-btn tiny mt-12" data-homebrew-monster-toggle-skills>${state.homebrewMonsterShowSkillPicker ? 'Hide skill list' : 'Add skills'}</button>
      ${state.homebrewMonsterShowSkillPicker ? `
        <div class="homebrew-effect-picker mt-12">
          <input class="input" id="homebrew-monster-skill-search" placeholder="Search monster skills…" value="${esc(state.homebrewMonsterSkillSearch || '')}" />
          <div class="homebrew-effect-list">${skillPickerRows || '<div class="empty">No skills match your search.</div>'}</div>
        </div>
      ` : ''}
    </div>
    <div class="span-2 card gm-builder-affinity" style="padding:10px 12px">
      <div class="kicker">Resistances &amp; weaknesses</div>
      <p class="subtle">Element tags apply on the sheet at 50% resist / 200% weak. Non-element tags like magic are stored for notes.</p>
      <div class="mt-12">
        <div class="field-label">Resistances</div>
        <div class="wrap gm-builder-affinity-list">${resistances.length ? resistances.map(tag => affinityPill(tag, 'resistances', 'good')).join('') : '<span class="subtle">None</span>'}</div>
      </div>
      <div class="mt-12">
        <div class="field-label">Weaknesses</div>
        <div class="wrap gm-builder-affinity-list">${weaknesses.length ? weaknesses.map(tag => affinityPill(tag, 'weaknesses', 'bad')).join('') : '<span class="subtle">None</span>'}</div>
      </div>
      <div class="mt-12">
        <div class="field-label">Immunities</div>
        <div class="wrap gm-builder-affinity-list">${immunities.length ? immunities.map(tag => affinityPill(tag, 'immunities', 'good')).join('') : '<span class="subtle">None</span>'}</div>
        <div class="wrap mt-12">
          ${MONSTER_IMMUNITY_EXTRA_TAGS.map(row => {
            const active = immunities.includes(row.id)
            return `<button type="button" class="pill gm-special-chip ${active ? 'good' : ''}" data-homebrew-monster-immunity-toggle="${esc(row.id)}">${active ? '✓ ' : ''}${esc(row.label)}</button>`
          }).join('')}
        </div>
      </div>
      <div class="toolbar mt-12 gm-builder-affinity-add">
        <select class="input" id="homebrew-monster-affinity-element" aria-label="Element">
          ${ELEMENTS.map(element => `<option value="${esc(element.id)}">${esc(element.icon)} ${esc(element.label)}</option>`).join('')}
        </select>
        <button type="button" class="ghost-btn tiny" data-homebrew-monster-add-resist>+ Resist</button>
        <button type="button" class="ghost-btn tiny" data-homebrew-monster-add-weak>+ Weak</button>
        <button type="button" class="ghost-btn tiny" data-homebrew-monster-add-immune>+ Immune</button>
      </div>
    </div>`
}

function renderHomebrewSkillLocksSection(draft) {
  const lockedWeapons = new Set(draft.lockWeaponKinds || [])
  const lockedRaces = new Set(draft.lockRaces || [])
  const lockedSkills = new Set(draft.lockSkills || [])
  const isRacial = draft.category === 'racial'
  const weaponRows = homebrewWeaponKindOptions().map(kind => `
    <label class="pill-label homebrew-lock-chip">
      <input type="checkbox" name="hbs-lock-weapon" value="${esc(kind)}" ${lockedWeapons.has(kind) ? 'checked' : ''} />
      ${esc(weaponKindDisplayLabel(kind))}
    </label>
  `).join('')
  const raceRows = homebrewRaceOptionsForSkills().map(raceId => {
    const race = getRace(raceId)
    return `
    <label class="pill-label homebrew-lock-chip">
      <input type="checkbox" name="hbs-lock-race" value="${esc(raceId)}" ${lockedRaces.has(raceId) ? 'checked' : ''} />
      ${esc(race?.icon || '✦')} ${esc(race?.name || displaySubcategory(raceId))}
    </label>
  `
  }).join('')
  const skillRows = homebrewSkillLockOptions().map(skill => `
    <label class="pill-label homebrew-lock-chip">
      <input type="checkbox" name="hbs-lock-skill" value="${esc(skill.id)}" ${lockedSkills.has(skill.id) ? 'checked' : ''} />
      ${esc(skill.name)}${skill.source === 'homebrew' ? ' (HB)' : ''}
    </label>
  `).join('')
  return `
    <div class="homebrew-locks span-2">
      <div class="kicker">Optional locks</div>
      <p class="subtle">Pick any combination. Weapon locks grey out the action bar until equipped; race, Skill Level, and skill locks apply when learning (GM Mode bypasses).</p>
      <label class="field-label mt-12">Minimum Skill Level</label>
      <input class="input" type="number" min="1" name="hbs-lock-min-level" value="${draft.lockMinLevel !== '' && draft.lockMinLevel != null ? esc(String(draft.lockMinLevel)) : ''}" placeholder="Tier default if empty" />
      <label class="field-label mt-12">Require equipped weapon type (for actions)</label>
      <div class="homebrew-lock-grid">${weaponRows || '<span class="subtle">Create a weapon with a custom type first, or use the list above.</span>'}</div>
      ${isRacial ? `<p class="subtle mt-12">Racial skills already lock to the race chosen above — no extra race lock needed.</p>` : `
        <label class="field-label mt-12">Allowed races (learn)</label>
        <div class="homebrew-lock-grid">${raceRows}</div>
      `}
      <label class="field-label mt-12">Required skills learned first</label>
      <div class="homebrew-lock-grid homebrew-lock-grid-skills">${skillRows || '<span class="subtle">No skills in catalog yet.</span>'}</div>
    </div>
  `
}

function homebrewItemEditorClass(draft) {
  const type = String(draft?.type || '')
  const classes = ['homebrew-form', 'grid', 'two']
  if (!type.includes('weapon')) classes.push('homebrew-item-not-weapon')
  if (type !== 'offhand') classes.push('homebrew-item-not-offhand')
  return classes.join(' ')
}

function homebrewBalanceTagChips(draft, prefix) {
  const selected = new Set(draft?.balanceTags || [])
  return `
    <div class="homebrew-balance-tags span-2">
      <div class="kicker">Balance tags (optional)</div>
      <p class="subtle">Advisory only — helps flag content for GM review.</p>
      <div class="wrap mt-12">${HOMEBREW_BALANCE_TAGS.map(tag => `
        <label class="pill-label homebrew-chip">
          <input type="checkbox" name="${prefix}" value="${tag}" ${selected.has(tag) ? 'checked' : ''} />
          ${titleCase(tag)}
        </label>
      `).join('')}</div>
      ${homebrewBalanceWarning(draft) ? `<p class="subtle mt-12 pill warn">${esc(homebrewBalanceWarning(draft))}</p>` : ''}
    </div>
  `
}

function homebrewApprovalField(draft, prefix) {
  const status = draft?.approvalStatus || 'draft'
  return `
    <label class="field-label mt-12">Approval</label>
    <select class="input" name="${prefix}">
      ${HOMEBREW_APPROVAL_STATUSES.map(row => `<option value="${row.id}" ${status === row.id ? 'selected' : ''}>${esc(row.label)}</option>`).join('')}
    </select>
  `
}

function homebrewItemOffhandFields(draft) {
  const offType = draft?.offhandType || 'shield'
  return `
    <label class="field-label mt-12 hb-offhand-field">Off-hand type</label>
    <select class="input hb-offhand-field" name="hb-offhand-type">
      ${HOMEBREW_OFFHAND_TYPES.map(type => `<option value="${type}" ${offType === type ? 'selected' : ''}>${titleCase(type)}</option>`).join('')}
    </select>
  `
}

function homebrewItemHandsFields(draft) {
  const hands = draft?.hands || 'one'
  return `
    <label class="field-label mt-12 hb-weapon-field">Handedness</label>
    <select class="input hb-weapon-field" name="hb-hands">
      ${HOMEBREW_WEAPON_HANDS.map(row => `<option value="${row.id}" ${hands === row.id ? 'selected' : ''}>${esc(row.label)}</option>`).join('')}
    </select>
  `
}

function homebrewItemMetaFields(draft) {
  return `
    <div class="homebrew-item-meta span-2">
      <div class="kicker">Item flags</div>
      <div class="wrap mt-12">
        <label class="pill-label"><input type="checkbox" name="hb-stackable" ${draft?.stackable ? 'checked' : ''} /> Stackable</label>
        <label class="pill-label"><input type="checkbox" name="hb-quest-item" ${draft?.questItem ? 'checked' : ''} /> Quest item</label>
        <label class="pill-label"><input type="checkbox" name="hb-sellable" ${draft?.sellable !== false ? 'checked' : ''} /> Can be sold</label>
      </div>
      <label class="field-label mt-12">Max stack (optional)</label>
      <input class="input" type="number" min="2" name="hb-max-stack" value="${esc(draft?.maxStack === '' || draft?.maxStack == null ? '' : String(draft.maxStack))}" placeholder="e.g. 99" />
    </div>
  `
}

function homebrewItemCurseFields(draft) {
  const equipType = ['weapon', 'offhand', 'armor', 'accessory'].includes(String(draft?.type || ''))
  return `
    <div class="homebrew-item-curse span-2 ${equipType ? '' : 'hidden'}">
      <div class="kicker">Cursed equipment &amp; GM notes</div>
      <p class="subtle">Players see only the normal fields above. Hidden text appears only when GM Mode is on.</p>
      <label class="pill-label mt-12"><input type="checkbox" name="hb-is-cursed" ${draft?.isCursed ? 'checked' : ''} /> Cursed equipment</label>
      <label class="field-label mt-12">Curse style (GM only)
        <select class="input" name="hb-curse-style">
          <option value="">—</option>
          <option value="combat" ${draft?.curseStyle === 'combat' ? 'selected' : ''}>Combat — powerful upside, clear downside</option>
          <option value="narrative" ${draft?.curseStyle === 'narrative' ? 'selected' : ''}>Narrative — world reacts differently</option>
          <option value="trigger" ${draft?.curseStyle === 'trigger' ? 'selected' : ''}>Trigger — tracks toward a big reveal</option>
        </select>
      </label>
      <div class="grid two mt-12">
        <label class="field-label">Hidden GM description<textarea class="input" name="hb-hidden-gm-desc" rows="3" placeholder="What really happens…">${esc(draft?.hiddenGMDescription || '')}</textarea></label>
        <label class="field-label">Hidden GM ability<textarea class="input" name="hb-hidden-gm-ability" rows="3" placeholder="Consequence or trigger…">${esc(draft?.hiddenGMAbility || '')}</textarea></label>
      </div>
      <label class="field-label mt-12">Hidden GM notes<textarea class="input" name="hb-hidden-gm-notes" rows="2" placeholder="Reminders for the GM…">${esc(draft?.hiddenGMNotes || '')}</textarea></label>
      <p class="subtle mt-12">Mystery loot uses real catalogue items (??? Sword, ??? Ring, ??? Vial, …). Grant those from the Shop tab; swap for the real item when the party identifies it at a town.</p>
      <label class="field-label mt-12">Tags (comma-separated)</label>
      <input class="input" name="hb-tags" value="${esc(draft?.tagsText || '')}" placeholder="fire, bow, healing" />
    </div>
  `
}

function renderHomebrewImportModal() {
  const block = state.homebrewImportPreview
  if (!block?.preview) return ''
  const preview = block.preview
  const incoming = Object.entries(preview.incoming || {}).filter(([, count]) => count > 0)
    .map(([key, count]) => `${count} ${key}`).join(', ') || 'Nothing'
  const conflictRows = (preview.conflicts || []).slice(0, 12).map(row =>
    `<li>${esc(row.kind)} <strong>${esc(row.id)}</strong> — ${row.action === 'skip' ? 'will skip (official)' : 'will overwrite local'}</li>`
  ).join('')
  const mode = block.mode || 'merge'
  return `
    <div class="modal-backdrop homebrew-import-modal" data-homebrew-import-dismiss>
      <section class="card modal-card">
        <div class="card-header">
          <div>
            <div class="kicker">Import preview</div>
            <h3>Homebrew pack</h3>
          </div>
          <button type="button" class="ghost-btn tiny" data-homebrew-import-cancel>Cancel</button>
        </div>
        <p class="subtle">Incoming: ${esc(incoming)}</p>
        <p class="subtle">New: ${preview.newEntries?.length || 0} · Conflicts: ${preview.conflicts?.length || 0}</p>
        ${conflictRows ? `<ul class="subtle mt-12">${conflictRows}</ul>` : ''}
        <div class="grid one mt-16">
          <label class="pill-label"><input type="radio" name="homebrew-import-mode" value="merge" ${mode === 'merge' ? 'checked' : ''} data-homebrew-import-mode /> Merge (incoming wins on conflicts)</label>
          <label class="pill-label"><input type="radio" name="homebrew-import-mode" value="replace" ${mode === 'replace' ? 'checked' : ''} data-homebrew-import-mode /> Replace all local homebrew</label>
          <label class="pill-label"><input type="checkbox" ${block.skipConflicts ? 'checked' : ''} data-homebrew-import-skip-conflicts /> Skip conflicts (keep local IDs)</label>
        </div>
        <div class="wrap mt-16">
          <button type="button" class="primary-btn" data-homebrew-import-confirm>Import</button>
          <button type="button" class="ghost-btn" data-homebrew-import-cancel>Cancel</button>
        </div>
      </section>
    </div>
  `
}

function homebrewItemWeaponKindFields(draft) {
  const kinds = homebrewWeaponKindOptions().filter(k => k !== '__any_weapon__')
  const current = draft.weaponKind || ''
  const inList = kinds.includes(current)
  return `
    <label class="field-label mt-12 hb-weapon-field">Weapon type</label>
    <select class="input hb-weapon-field" name="hb-weapon-kind">
      <option value="" ${!current || !inList ? 'selected' : ''}>Auto-detect from name/description</option>
      ${kinds.map(kind => `<option value="${esc(kind)}" ${current === kind ? 'selected' : ''}>${esc(weaponKindDisplayLabel(kind))}</option>`).join('')}
    </select>
    <label class="field-label mt-12 hb-weapon-field">Or new custom type</label>
    <input class="input hb-weapon-field" name="hb-weapon-kind-custom" maxlength="32" list="hb-weapon-kind-list" value="${!inList && current ? esc(current) : ''}" placeholder="e.g. katana, whip, gun" />
    <datalist id="hb-weapon-kind-list">
      ${kinds.map(kind => `<option value="${esc(kind)}">${esc(weaponKindDisplayLabel(kind))}</option>`).join('')}
    </datalist>
    <p class="subtle mt-12 hb-weapon-field">Custom types appear in skill weapon locks after you save this item.</p>
  `
}

function homebrewDamageModeLabel(mode) {
  return HOMEBREW_SKILL_DAMAGE_MODES.find(row => row.id === mode)?.label || titleCase(mode || 'none')
}

function renderHomebrewSkillDamageSection(draft) {
  if (draft?.skillType !== 'activatable') return ''
  const mode = draft.damageMode || 'none'
  const needsElement = mode.includes('elemental')
  const modeActive = mode !== 'none'
  const damageStat = draft.damageStat || (needsElement ? 'magicPower' : 'strength')
  return `
    <div class="homebrew-damage span-2">
      <div class="kicker">Damage (optional)</div>
      <p class="subtle">For attack actions. Custom dice can add a stat (e.g. Physical Defence for a shield bash). Opponent effects stay in the description.</p>
      <div class="grid two mt-12">
        <label>
          <span class="field-label">Damage mode</span>
          <select class="input" name="hbs-damage-mode">
            ${HOMEBREW_SKILL_DAMAGE_MODES.map(row => `<option value="${row.id}" ${mode === row.id ? 'selected' : ''}>${esc(row.label)}</option>`).join('')}
          </select>
        </label>
        <label>
          <span class="field-label">Damage dice${modeActive ? ' *' : ''}</span>
          <input class="input" name="hbs-damage-dice" value="${esc(draft.damageDice || '')}" placeholder="${mode.startsWith('basic_plus') ? 'e.g. 100 + 10d20' : 'e.g. 100 + 10d20 or 2d6'}" />
        </label>
      </div>
      <div class="grid two mt-12">
        <label>
          <span class="field-label">Add stat to dice${modeActive ? '' : ''}</span>
          <select class="input" name="hbs-damage-stat" ${modeActive ? '' : 'disabled'}>
            <option value="none" ${!damageStat || damageStat === 'none' ? 'selected' : ''}>None (dice only)</option>
            ${HOMEBREW_DAMAGE_STAT_KEYS.map(key => `<option value="${key}" ${damageStat === key ? 'selected' : ''}>${esc(STAT_RULES[key]?.label || titleCase(key))}</option>`).join('')}
          </select>
        </label>
        <label>
          <span class="field-label">Element${needsElement ? ' *' : ''}</span>
          <select class="input" name="hbs-elemental-type">
            <option value="">${needsElement ? 'Pick element…' : 'Only for elemental damage modes'}</option>
            ${HOMEBREW_ELEMENT_TYPES.map(ele => `<option value="${ele}" ${draft.elementalType === ele ? 'selected' : ''}>${titleCase(ele)}</option>`).join('')}
          </select>
        </label>
      </div>
      ${modeActive && damageStat && damageStat !== 'none' ? `<p class="subtle mt-12">On use: dice total + ${esc(homebrewDamageStatLabel(damageStat))}.</p>` : ''}
      ${!modeActive ? '<p class="subtle mt-12">Choose a damage mode above, then enter dice (and element if elemental).</p>' : ''}
    </div>
  `
}

function renderHomebrewUseEffectSection(draft) {
  if (draft?.skillType !== 'activatable') return ''
  const rows = draft.activationEffects || []
  const selectedIds = new Set(rows.map(row => row.effectId))
  const selectedRows = rows.map(row => {
    const effect = getEffect(row.effectId)
    const potencyLabel = effectUsesPotency(effect) ? effectPotencyLabel(effect) : 'Potency'
    return `
      <div class="homebrew-use-effect-row">
        <span class="pill ${effect ? effectTone(effect) : 'warn'}">${effect ? esc(`${effect.icon || '✦'} ${effect.name}`) : esc(row.effectId)}</span>
        <label class="field-label compact">Target
          <select class="input tiny" name="hbs-use-apply-${esc(row.effectId)}">
            ${HOMEBREW_SKILL_APPLY_TO.map(opt => `<option value="${opt.id}" ${(row.applyTo || draft?.defaultApplyTo || 'self') === opt.id ? 'selected' : ''}>${esc(opt.label)}</option>`).join('')}
          </select>
        </label>
        <label class="field-label compact">Kind
          <select class="input tiny" name="hbs-use-kind-${esc(row.effectId)}">
            <option value="">Auto</option>
            ${HOMEBREW_SKILL_EFFECT_KINDS.map(kind => `<option value="${kind}" ${row.effectKind === kind ? 'selected' : ''}>${titleCase(kind)}</option>`).join('')}
          </select>
        </label>
        <label class="field-label compact">Turns
          ${renderNumberStepper({
            name: `hbs-use-duration-${row.effectId}`,
            value: String(row.duration ?? 3),
            min: 0,
            tiny: true,
            decreaseLabel: 'Decrease duration',
            increaseLabel: 'Increase duration'
          })}
        </label>
        <label class="field-label compact">${esc(potencyLabel)}
          ${renderNumberStepper({
            name: `hbs-use-potency-${row.effectId}`,
            value: row.potency == null ? '' : String(row.potency),
            placeholder: 'auto',
            tiny: true,
            decreaseLabel: 'Decrease potency',
            increaseLabel: 'Increase potency'
          })}
        </label>
        <button type="button" class="homebrew-effect-remove" data-homebrew-skill-use-effect-remove="${esc(row.effectId)}" aria-label="Remove">×</button>
      </div>
    `
  }).join('')

  const query = String(state.homebrewSkillUseEffectSearch || '').toLowerCase().trim()
  const filtered = effectList().filter(effect => {
    if (!query) return true
    const hay = `${effect.name} ${effect.id} ${effect.desc} ${effect.type}`.toLowerCase()
    return hay.includes(query)
  })
  const groups = new Map()
  for (const effect of filtered) {
    const group = effectTypeLabel(effect.type)
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push(effect)
  }
  const pickerRows = [...groups.entries()].map(([group, effects]) => `
    <div class="homebrew-effect-group">
      <div class="homebrew-effect-group-title">${esc(group)}</div>
      ${effects.map(effect => `
        <label class="homebrew-effect-option ${selectedIds.has(effect.id) ? 'selected' : ''}" data-tooltip="${esc(effectTooltip(effect.id, 'On-use effect'))}" tabindex="0">
          <input type="checkbox" data-homebrew-skill-use-effect-toggle="${esc(effect.id)}" ${selectedIds.has(effect.id) ? 'checked' : ''} />
          <span class="homebrew-effect-option-copy">
            <strong>${esc(effect.icon || '✦')} ${esc(effect.name)}</strong>
            <span class="subtle">${esc(effect.desc || '')}</span>
          </span>
        </label>
      `).join('')}
    </div>
  `).join('')

  return `
    <div class="homebrew-effects span-2">
      <div class="kicker">On-use effects (optional)</div>
      <p class="subtle">Applied when the action is used. Pick target per effect; debuffs on enemies can use One enemy when the effect is in the catalog.</p>
      <div class="homebrew-use-effect-rows">${selectedRows || '<p class="subtle">No on-use effects selected.</p>'}</div>
      <button type="button" class="ghost-btn tiny mt-12" data-homebrew-toggle-skill-use-effects>${state.homebrewSkillShowUseEffectPicker ? 'Hide effect list' : 'Add on-use effect(s)'}</button>
      ${state.homebrewSkillShowUseEffectPicker ? `
        <div class="homebrew-effect-picker mt-12">
          <input class="input" id="homebrew-skill-use-effect-search" placeholder="Search effects…" value="${esc(state.homebrewSkillUseEffectSearch || '')}" />
          <div class="homebrew-effect-list">${pickerRows || '<div class="empty">No effects match your search.</div>'}</div>
        </div>
      ` : ''}
    </div>
  `
}

function renderItemCounterControls(entry, item, { showWhenEquipped = false } = {}) {
  if (!entry || !itemHasCounter(item)) return ''
  if (item.counterEquippedOnly && !showWhenEquipped) return ''
  const label = itemCounterLabel(item)
  const value = inventoryCounterValue(entry, item)
  const max = item.counterMax
  const maxHint = Number.isFinite(Number(max)) && Number(max) > 0 ? ` / ${Math.floor(Number(max))}` : ''
  return `
    <div class="item-counter-controls">
      <span class="item-counter-label">${esc(label)}</span>
      <button type="button" class="ghost-btn tiny item-counter-btn" data-inventory-counter="${esc(entry.uid)}" data-counter-delta="-1" aria-label="Decrease ${esc(label)}">−</button>
      <span class="item-counter-value">${value}${maxHint}</span>
      <button type="button" class="ghost-btn tiny item-counter-btn" data-inventory-counter="${esc(entry.uid)}" data-counter-delta="1" aria-label="Increase ${esc(label)}">+</button>
    </div>
  `
}

function homebrewCounterWhenLabel(draft) {
  const op = String(draft?.counterRuleOperator || 'above')
  const x = draft?.counterRuleValue ?? 0
  if (op === 'below') return `below ${x}`
  if (op === 'eq') return `${x}`
  return `above ${x}`
}

function homebrewCounterSummary(draft) {
  const label = String(draft?.counterLabel || '').trim()
  if (!label) return ''
  const rules = []
  const when = homebrewCounterWhenLabel(draft)
  if (draft.blockUnequipWithCounter) rules.push(`cannot unequip when ${when}`)
  if (draft.blockRemoveWithCounter) rules.push(`cannot remove when ${when}`)
  if (draft.counterEquippedOnly) rules.push('equipped only')
  const max = Number(draft.counterMax)
  const maxPart = Number.isFinite(max) && max > 0 ? ` · max ${Math.floor(max)}` : ''
  return `${label} · starts ${draft.counterDefault ?? 0}${maxPart}${rules.length ? ` · ${rules.join(', ')}` : ''}`
}

function renderHomebrewCounterSection(draft) {
  const hasCounter = Boolean(String(draft?.counterLabel || '').trim())
  const summary = homebrewCounterSummary(draft)
  const panelOpen = state.homebrewShowCounterOptions
  const ruleOp = draft?.counterRuleOperator || 'above'
  const ruleValue = draft?.counterRuleValue ?? 0
  return `
    <div class="homebrew-counter span-2">
      <div class="kicker">Counter (optional)</div>
      <p class="subtle">Track a tally on each inventory copy. Rules stay in the description — this is just the number at the table.</p>
      ${summary && !panelOpen ? `<div class="wrap detail-pills mt-12"><span class="pill warn">${esc(summary)}</span></div>` : ''}
      <button type="button" class="ghost-btn tiny mt-12" data-homebrew-toggle-counter>${panelOpen ? 'Hide counter options' : hasCounter ? 'Edit counter' : 'Add counter'}</button>
      ${hasCounter && !panelOpen ? `<button type="button" class="ghost-btn tiny mt-12" data-homebrew-clear-counter>Remove counter</button>` : ''}
      <div class="homebrew-counter-panel mt-12${panelOpen ? '' : ' hidden'}">
        <div class="grid three">
          <label>
            <span class="field-label">Label</span>
            <input class="input" name="hb-counter-label" maxlength="24" value="${esc(draft?.counterLabel || '')}" placeholder="Charges" />
          </label>
          <label>
            <span class="field-label">Starting value</span>
            <input class="input" type="number" min="0" name="hb-counter-default" value="${esc(String(draft?.counterDefault ?? 0))}" />
          </label>
          <label>
            <span class="field-label">Max (optional)</span>
            <input class="input" type="number" min="1" name="hb-counter-max" value="${draft?.counterMax != null ? esc(String(draft.counterMax)) : ''}" placeholder="No cap" />
          </label>
        </div>
        <div class="homebrew-counter-rules mt-12">
          <div class="homebrew-counter-when">
            <span class="field-label">While counter is</span>
            <select class="input homebrew-counter-op" name="hb-counter-rule-op" aria-label="Counter comparison">
              <option value="above" ${ruleOp === 'above' ? 'selected' : ''}>above</option>
              <option value="below" ${ruleOp === 'below' ? 'selected' : ''}>below</option>
              <option value="eq" ${ruleOp === 'eq' ? 'selected' : ''}>equal to</option>
            </select>
            <input class="input homebrew-counter-threshold" type="number" min="0" name="hb-counter-rule-value" value="${esc(String(ruleValue))}" aria-label="Counter threshold" />
          </div>
          <label class="pill-label homebrew-counter-rule">
            <input type="checkbox" name="hb-block-unequip-counter" ${draft?.blockUnequipWithCounter ? 'checked' : ''} />
            Cannot unequip
          </label>
          <label class="pill-label homebrew-counter-rule">
            <input type="checkbox" name="hb-block-remove-counter" ${draft?.blockRemoveWithCounter ? 'checked' : ''} />
            Cannot remove from inventory
          </label>
          <div class="field-label homebrew-counter-display-label">Display</div>
          <label class="pill-label homebrew-counter-rule">
            <input type="checkbox" name="hb-counter-equipped-only" ${draft?.counterEquippedOnly ? 'checked' : ''} />
            Show counter only when equipped
          </label>
        </div>
        ${hasCounter ? `<button type="button" class="ghost-btn tiny mt-12" data-homebrew-clear-counter>Remove counter from item</button>` : ''}
      </div>
    </div>
  `
}

function sourceEffectStatus(entry) {
  return {
    duration: entry.duration,
    potency: entry.potency,
    sourcePassive: true
  }
}

function renderEffectsSnapshot(character) {
  const active = character.statusEffects || []
  const weather = character.weatherEffects || []
  const sourced = characterEffectSources(character)
  const activePills = active.slice(0, 8).map(status => renderEffectPill(status.effectId, 'Applied status', status)).join('')
  const weatherPills = weather.slice(0, 4).map(status => renderEffectPill(status.effectId, 'Weather', status)).join('')
  const sourcePills = sourced.slice(0, 8).map(entry => renderEffectPill(entry.effect.id, entry.sources.join(', '), sourceEffectStatus(entry))).join('')
  const extraCount = Math.max(0, active.length + weather.length + sourced.length - 16)
  return `
    <div class="effects-snapshot">
      <div class="effect-mini-title">Effects & specials</div>
      <div class="wrap">
        ${activePills || ''}
        ${weatherPills || ''}
        ${sourcePills || ''}
        ${extraCount ? `<span class="pill">+${extraCount} more below</span>` : ''}
        ${!active.length && !weather.length && !sourced.length ? '<span class="pill">No detected effects yet</span>' : ''}
      </div>
    </div>
  `
}

function renderEffectsManager(character) {
  const sourced = characterEffectSources(character)
  const active = character.statusEffects || []
  const weather = character.weatherEffects || []
  const sourceCards = sourced.map(entry => {
    const potencyText = effectPotencyLabel(entry.effect, entry.potency)
    return `
    <article class="effect-card effect-card-source ${effectTone(entry.effect)}" data-tooltip="${esc(effectTooltip(entry.effect.id, entry.sources.join(', '), sourceEffectStatus(entry)))}" tabindex="0">
      <div class="effect-card-title"><strong>${esc(entry.effect.icon || '✦')} ${esc(entry.effect.name)}</strong><span class="pill">${esc(effectTypeLabel(entry.effect.type))}</span></div>
      <p class="effect-card-desc">${esc(entry.effect.desc)}</p>
      <div class="wrap effect-card-tags">
        <span class="pill">Duration: ${esc(effectDurationLabel(entry.duration))}</span>
        ${potencyText && effectUsesPotency(entry.effect) ? `<span class="pill warn">Potency ${esc(potencyText)}</span>` : ''}
        ${entry.effect.statModifiers ? `<span class="pill ${effectTone(entry.effect)}">${esc(formatStatModifiers(entry.effect.statModifiers))}</span>` : ''}
      </div>
      <div class="subtle effect-card-meta">From: ${esc(entry.sources.slice(0, 4).join(', '))}${entry.sources.length > 4 ? ` and ${entry.sources.length - 4} more` : ''}</div>
    </article>
  `
  }).join('')
  const activeCards = active.map(status => {
    const effect = getEffect(status.effectId)
    if (!effect) return ''
    return `
      <article class="effect-card effect-card-active ${effectTone(effect)}" data-tooltip="${esc(effectTooltip(effect.id, 'Applied status', status))}" tabindex="0">
        <div class="effect-card-title"><strong>${esc(effect.icon || '✦')} ${esc(effect.name)}</strong><button type="button" class="danger-btn tiny" data-remove-effect="${esc(status.uid)}">Remove</button></div>
        <p class="effect-card-desc">${esc(effect.desc)}</p>
        <div class="wrap effect-card-tags">
          <span class="pill">Remaining: ${esc(effectDurationLabel(status.duration))}</span>
          ${status.potency !== undefined && status.potency !== null && status.potency !== 0 ? `<span class="pill warn">Potency ${esc(status.potency)}</span>` : ''}
          ${Object.keys(statusStatModifiers(status, effect)).length ? `<span class="pill ${effectTone(effect)}">${esc(formatStatModifiers(statusStatModifiers(status, effect)))}</span>` : ''}
        </div>
          ${status.notes ? `<div class="subtle effect-card-meta">${esc(status.notes)}</div>` : ''}
          ${status.performance ? `<div class="subtle effect-card-meta good">${esc(formatPerformanceMeta(status.performance))}</div>` : ''}
        </article>
    `
  }).join('')
  const weatherCards = weather.map(status => {
    const effect = getEffect(status.effectId)
    if (!effect) return ''
    const gameplay = weatherGameplayLines(effect)
    const manaStormRoll = effect.manaStorm ? `
      <label class="field-label compact mt-12">Combat round roll (1d6)
        <select class="input tiny" data-weather-combat-roll="${esc(status.uid)}">
          <option value="">Not set</option>
          ${[1, 2, 3, 4, 5, 6].map(roll => `<option value="${roll}" ${Number(status.combatRoll) === roll ? 'selected' : ''}>${roll}</option>`).join('')}
        </select>
      </label>` : ''
    return `
      <article class="effect-card effect-card-active ${effectTone(effect)}" data-tooltip="${esc(effectTooltip(effect.id, 'Weather', status))}" tabindex="0">
        <div class="effect-card-title"><strong>${esc(effect.icon || '✦')} ${esc(effect.name)}</strong><button type="button" class="danger-btn tiny" data-remove-weather="${esc(status.uid)}">Remove</button></div>
        <p class="effect-card-desc">${esc(effect.desc)}</p>
        <div class="wrap effect-card-tags">
          <span class="pill">Remaining: ${esc(effectDurationLabel(status.duration))}</span>
          ${Object.keys(statusStatModifiers(status, effect)).length ? `<span class="pill ${effectTone(effect)}">${esc(formatStatModifiers(statusStatModifiers(status, effect)))}</span>` : ''}
          ${gameplay.map(line => `<span class="pill warn">${esc(line)}</span>`).join('')}
        </div>
        ${manaStormRoll}
        ${status.notes ? `<div class="subtle effect-card-meta">${esc(status.notes)}</div>` : ''}
      </article>
    `
  }).join('')
  return `
    <section class="card effects-manager mt-16">
      <div class="card-header effects-manager-header">
        <div>
          <div class="kicker">Rules Brain</div>
          <h3>Effects & Status Manager</h3>
          <p class="effects-manager-intro">Hover any effect to see what it does. Shows ongoing passives from gear, weapon-matched skills, active toggles, max-stat hidden rewards, and resistances — not one-shot attack spells.</p>
        </div>
        <div class="wrap">
          <button type="button" class="ghost-btn tiny" data-process-turn title="Press at the End of Turn after you act">Process Turn</button>
          <button type="button" class="ghost-btn tiny" data-begin-new-combat title="Reset once-per-combat uses like Quick Draw">New Combat</button>
        </div>
      </div>
      <p class="subtle mt-8">Press <strong>Process Turn</strong> at the <strong>End of Turn</strong> — after you move, attack, or act — to apply ticks, then reduce durations. Press <strong>New Combat</strong> when a fight starts to reset once-per-combat uses (Quick Draw, Encore, Homing Shot, Rage, Feint, and similar).</p>

      ${renderKnockoutPanel(character)}

      <div class="grid two effects-sections">
        <div class="effects-section">
          <h3 class="effects-section-title">Applied Status Effects</h3>
          <div class="effect-grid">${activeCards || '<div class="empty effects-empty">No active status effects. Suspiciously healthy.</div>'}</div>
        </div>
        <div class="effects-section">
          <h3 class="effects-section-title">Skill & Gear Effects</h3>
          <div class="effect-grid">${sourceCards || '<div class="empty effects-empty">No skill/gear special effects detected yet.</div>'}</div>
        </div>
      </div>

      <div class="effect-add-box">
        <h3 class="effects-section-title">Add Effect</h3>
        <p class="effect-add-intro">Track combat statuses, skill buffs, and potion effects here. For Temp Strength, Temp Magic, and similar, enter the duration and potency from the item or skill text (e.g. potency 3, 8 turns).</p>
        <div class="effect-add-grid">
          <label><span class="field-label">Effect</span><select class="input" id="effect-select">${effectOptionsMarkup()}</select></label>
          <label><span class="field-label">Duration</span>${renderNumberStepper({ id: 'effect-duration', min: 0, placeholder: 'Default', decreaseLabel: 'Decrease duration', increaseLabel: 'Increase duration' })}</label>
          <label><span class="field-label">Potency</span>${renderNumberStepper({ id: 'effect-potency', placeholder: 'Default', decreaseLabel: 'Decrease potency', increaseLabel: 'Increase potency' })}</label>
          <label><span class="field-label">Notes</span><input class="input" id="effect-notes" placeholder="Optional source/variant" /></label>
        </div>
        <button type="button" class="primary-btn full" data-add-effect>Add Effect</button>
      </div>

      <div class="effect-add-box weather-section mt-16">
        <h3 class="effects-section-title">Weather</h3>
        <p class="effect-add-intro">Track scene weather for the party — one scene weather at a time; manual duration like status effects.</p>
        <div class="effect-grid">${weatherCards || '<div class="empty effects-empty">No active weather.</div>'}</div>
        <div class="effect-add-grid mt-12">
          <label><span class="field-label">Weather</span><select class="input" id="weather-select">${weatherOptionsMarkup()}</select></label>
          <label><span class="field-label">Duration</span>${renderNumberStepper({ id: 'weather-duration', min: 0, placeholder: 'Ongoing', decreaseLabel: 'Decrease duration', increaseLabel: 'Increase duration' })}</label>
          <label><span class="field-label">Notes</span><input class="input" id="weather-notes" placeholder="Optional scene note" /></label>
        </div>
        <button type="button" class="primary-btn full" data-add-weather>Add weather</button>
      </div>
    </section>
  `
}

function renderKnockoutPanel(character) {
  if (!character) return ''
  if (isDead(character)) {
    return `
      <div class="effect-add-box knockout-panel warn mt-12">
        <h3 class="effects-section-title">Dead</h3>
        <p class="effect-add-intro">This character is Dead (three failed Recovery Rolls in a row). They remain on the roster for narrative or GM rulings — healing does not revive them.</p>
      </div>
    `
  }
  if (!isKnockedOut(character)) return ''
  const ok = Number(character.recoverySuccessStreak || 0)
  const fail = Number(character.recoveryFailureStreak || 0)
  const revival = character.manualRevival
  const revivalText = revival
    ? `Manual revival in progress — <strong>step ${revival.step}/2</strong>${revival.helperName ? ` (${esc(revival.helperName)})` : ''}.`
    : 'No manual revival in progress.'
  return `
    <div class="effect-add-box knockout-panel warn mt-12">
      <h3 class="effects-section-title">Knocked Out</h3>
      <p class="effect-add-intro">At 0 HP. Cannot move, attack, use items, or use skills. Remains in initiative. On your turn you may make one <strong>Recovery Roll</strong> (1d20: 11+ success). Two successes in a row → Revived at 1 HP. Three failures in a row → Dead. A failure resets the success streak and a success resets the failure streak.</p>
      <div class="wrap mt-12">
        <span class="pill warn">Success streak ${ok}/2</span>
        <span class="pill danger">Failure streak ${fail}/3</span>
      </div>
      <p class="subtle mt-12">${revivalText}</p>
      <div class="wrap mt-12">
        <button type="button" class="primary-btn tiny" data-recovery-roll>Recovery Roll (1d20)</button>
        ${!revival ? '<button type="button" class="ghost-btn tiny" data-manual-revival-start>Helper: begin revival (step 1)</button>' : ''}
        ${revival?.step === 1 ? '<button type="button" class="ghost-btn tiny" data-manual-revival-advance>Helper: continue (step 2)</button>' : ''}
        ${revival?.step === 2 ? '<button type="button" class="primary-btn tiny" data-manual-revival-advance>Helper: complete revival</button>' : ''}
        ${revival ? '<button type="button" class="danger-btn tiny" data-manual-revival-cancel>Cancel manual revival</button>' : ''}
      </div>
      <p class="subtle mt-12">Healing item or healing skill on this sheet: Revives immediately, restores the full heal amount (capped by max HP), clears Recovery streaks, and removes Knocked Out.</p>
    </div>
  `
}

function renderPlayTab(character) {
  const stats = computeStats(character)
  const weapon = getEquippedWeapon(character)
  const weaponEntry = character.inventory.find(inv => inv.uid === character.equipped.weapon)
  const basic = getBasicAttackSkill(character)
  const basicBreakdown = skillHasEffectBreakdown(basic)
    ? formatSkillEffectBreakdownPlain(resolveSkillEffectBreakdown(character, basic))
    : ''
  const pinned = getPinnedActionBarSkills(character)
  const toggleSkills = (character.activeToggles || [])
    .map(id => getSkill(id))
    .filter(Boolean)
  const statuses = (character.statusEffects || [])
    .map(status => {
      const effect = getEffect(status.id)
      if (!effect) return null
      return `<span class="pill ${effectTone(effect)}" data-tooltip="${esc(effectTooltip(effect))}" tabindex="0">${esc(effect.icon || '✦')} ${esc(effect.name)} · ${esc(effectDurationLabel(status.duration))}</span>`
    })
    .filter(Boolean)
    .join('')
  const weather = (character.weatherEffects || [])
    .map(status => {
      const effect = getEffect(status.id)
      if (!effect) return null
      return `<span class="pill warn">${esc(effect.icon || '☁')} ${esc(effect.name)}</span>`
    })
    .filter(Boolean)
    .join('')

  const combatItems = (character.inventory || []).filter(entry => {
    const item = getItem(entry.itemId)
    if (!item) return false
    const type = String(item.type || '').toLowerCase()
    const isConsumable = type.includes('consumable') || type.includes('potion') || type.includes('food')
    const equipped = Object.values(character.equipped || {}).includes(entry.uid)
    return isConsumable || itemHasCounter(item) || equipped
  })

  const pinnedHtml = pinned.length
    ? pinned.map(skill => {
        const type = getSkillActivationType(skill)
        const cost = type === 'activatable'
          ? getEffectiveSkillStaminaCost(character, skill)
          : Number(skill.staminaCost || 0)
        const active = type === 'toggle' && character.activeToggles?.includes(skill.id)
        const breakdown = skillHasEffectBreakdown(skill)
          ? formatSkillEffectBreakdownPlain(resolveSkillEffectBreakdown(character, skill))
          : ''
        const useBtn = type === 'toggle'
          ? `<button type="button" class="chip-btn tiny" data-toggle-skill="${esc(skill.id)}">${active ? 'Switch Off' : 'Switch On'}</button>`
          : type === 'activatable'
            ? `<button type="button" class="primary-btn tiny" data-use-skill="${esc(skill.id)}">Use Skill</button>`
            : ''
        return `
          <details class="play-skill-card card">
            <summary>
              <strong>${esc(skill.icon || '✦')} ${esc(skill.name)}</strong>
              <span class="pill warn">${cost} STA</span>
              ${active ? '<span class="pill good">Active</span>' : ''}
            </summary>
            <p class="mt-8">${esc(skill.desc || '')}</p>
            ${breakdown ? `<p class="subtle mt-8">${esc(breakdown)}</p>` : ''}
            <div class="wrap mt-12">${useBtn}</div>
          </details>
        `
      }).join('')
    : '<p class="subtle">Pin skills on the Skills tab to show them here.</p>'

  const itemsHtml = combatItems.length
    ? combatItems.map(entry => {
        const item = getItem(entry.itemId)
        const presentation = resolveItemPresentation(item, entry)
        const equippedSlot = Object.entries(character.equipped || {}).find(([, uid]) => uid === entry.uid)?.[0]
        return `
          <div class="play-item-row">
            <div>
              <strong>${fallbackIcon(item)} ${esc(presentation.displayName)}</strong>
              <div class="subtle">${esc(item.type)}${equippedSlot ? ` · equipped (${esc(equippedSlot)})` : ''} · qty ${entry.qty || 1}</div>
              ${renderItemCounterControls(entry, item, { showWhenEquipped: true })}
            </div>
          </div>
        `
      }).join('')
    : '<p class="subtle">No combat consumables or counter items.</p>'

  return `
    <div class="play-tab">
      <section class="card play-session-card">
        <div class="card-header">
          <div>
            <div class="kicker">Session</div>
            <h3>${esc(character.name)}</h3>
            <p class="tab-intro">Compact combat view — full inventory stays on Character.</p>
          </div>
          <div class="wrap">
            <button type="button" class="ghost-btn tiny" data-process-turn>Process Turn</button>
            <button type="button" class="primary-btn tiny" data-begin-new-combat>New Combat</button>
          </div>
        </div>
        <div class="play-resource-row wrap mt-12">
          <div class="play-resource">
            <strong>HP ${character.hp}/${stats.hp}</strong>
            <div class="wrap">
              <button type="button" class="ghost-btn tiny" data-adjust-resource="hp" data-amount="-1">−1</button>
              <button type="button" class="ghost-btn tiny" data-adjust-resource="hp" data-amount="1">+1</button>
              <button type="button" class="primary-btn tiny" data-full-resource="hp">Full</button>
            </div>
          </div>
          <div class="play-resource">
            <strong>STA ${character.stamina}/${stats.stamina}</strong>
            <div class="wrap">
              <button type="button" class="ghost-btn tiny" data-adjust-resource="stamina" data-amount="-1">−1</button>
              <button type="button" class="ghost-btn tiny" data-adjust-resource="stamina" data-amount="1">+1</button>
              <button type="button" class="primary-btn tiny" data-full-resource="stamina">Full</button>
            </div>
          </div>
        </div>
        <div class="wrap mt-12 play-stat-strip">
          <span class="pill">ACC ${stats.accuracy}</span>
          <span class="pill">SPD ${stats.speed}</span>
          <span class="pill">STR ${stats.strength}</span>
          <span class="pill">MP ${stats.magicPower}</span>
          <span class="pill">PD ${stats.physicalDefence}</span>
          <span class="pill">MD ${stats.magicalDefence}</span>
        </div>
      </section>

      <section class="card mt-16">
        <div class="kicker">Weapon</div>
        <h3>${weapon ? `${fallbackIcon(weapon)} ${esc(weapon.name)}` : 'Unarmed / Striker'}</h3>
        <p class="subtle">${weapon ? esc(weaponKindDisplayLabel(getWeaponKind(weapon) || weapon.weaponKind || '')) : 'Empty hands'}${weaponEntry ? ` · ${esc(weapon.damage || '')}` : ''}</p>
        ${basic ? `
          <div class="mt-12">
            <strong>${esc(basic.icon || '⚔')} ${esc(basic.name)}</strong>
            <p class="subtle mt-8">${esc(basic.desc || '')}</p>
            ${basicBreakdown ? `<p class="subtle mt-8">${esc(basicBreakdown)}</p>` : ''}
            <button type="button" class="primary-btn tiny mt-12" data-use-skill="${esc(basic.id)}">Basic Attack</button>
          </div>
        ` : ''}
      </section>

      <section class="card mt-16">
        <div class="kicker">Pinned skills</div>
        <h3>Ready actions</h3>
        <div class="stack mt-12">${pinnedHtml}</div>
      </section>

      <section class="card mt-16">
        <div class="kicker">Ongoing</div>
        <h3>Toggles, statuses &amp; weather</h3>
        <div class="wrap mt-12">
          ${toggleSkills.length
            ? toggleSkills.map(skill => `<span class="pill warn">${esc(skill.icon || '✦')} ${esc(skill.name)}</span>`).join('')
            : '<span class="subtle">No active toggles.</span>'}
        </div>
        <div class="wrap mt-12">${statuses || '<span class="subtle">No status effects.</span>'}</div>
        <div class="wrap mt-12">${weather || '<span class="subtle">No weather.</span>'}</div>
      </section>

      <section class="card mt-16">
        <div class="kicker">Combat kit</div>
        <h3>Consumables &amp; counters</h3>
        <div class="stack mt-12">${itemsHtml}</div>
      </section>

      ${renderKnockoutPanel(character)}
    </div>
  `
}

function renderElementalAffinitySection(character) {
  const profile = computeElementalAffinity(character)
  const affected = ELEMENTS
    .map(element => profile.elements[element.id])
    .filter(isElementalAffinityRowVisible)
  if (!affected.length) return ''

  const rows = affected.map(row => `
    <div class="elemental-affinity-row ${elementalAffinityTone(row)}" data-tooltip="${esc(elementalAffinityTooltip(row))}" tabindex="0">
      <span class="elemental-affinity-name">${esc(row.icon)} ${esc(row.name)}</span>
      <span class="elemental-affinity-status">${esc(row.statusLabel)}</span>
    </div>
  `).join('')

  return `
    <section class="card elemental-affinity-card mt-16">
      <div class="kicker">Defences</div>
      <h3>Elemental Affinity</h3>
      <p class="subtle elemental-affinity-intro">Resist and weakness stack in levels (25% = 2, 50% = 1, 200% weak = 1, 400% = 2). Opposing levels cancel before the final tier is shown.</p>
      <div class="elemental-affinity-grid">${rows}</div>
    </section>
  `
}

function renderCharacterTab(character) {
  const race = getRace(character.race)
  const background = getBackground(character.background)
  const stats = computeStats(character)
  const skillLevel = computeSkillLevel(character)
  const combatPower = computeCombatPower(character)
  const unlocked = character.skills.map(getSkill).filter(Boolean)
  const passives = (race?.passiveTraits || []).map(trait => {
    const tableRule = isTableRuleRacePassive(trait)
    const pillClass = tableRule ? 'pill warn' : 'pill good'
    const prefix = tableRule ? 'Table rule · ' : ''
    return `<span class="${pillClass}" data-tooltip="${esc(racePassiveTooltip(trait))}" tabindex="0">${esc(prefix + trait)}</span>`
  }).join('')
  const raceEffectPills = (race?.specialEffects || []).map(id => renderEffectPill(id, race?.name || 'Race')).join('')
  const passiveRow = [passives, raceEffectPills].filter(Boolean).join('') || '<span class="pill">No race passives</span>'
  return `
    <div class="grid two">
      <section class="card">
        <div class="card-header">
          <div>
            <div class="kicker">Character Sheet</div>
            <h3>${esc(race?.icon || '👤')} ${esc(character.name)}</h3>
            <p>${esc(race?.description || 'Choose a race to unlock passives and racial skills.')}</p>
          </div>
          <button type="button" class="ghost-btn tiny" data-export-character>Export</button>
        </div>
        <label class="field-label">Rename</label>
        <input class="input" id="rename-character" value="${esc(character.name)}" />
        <label class="field-label">Race</label>
        <select class="input" id="change-race">
          ${raceOptions().map(option => `<option value="${esc(option.id)}" ${option.id === character.race ? 'selected' : ''}>${esc(option.icon || '✦')} ${esc(option.name)}</option>`).join('')}
        </select>
        ${character.race === 'dragonborn' ? `
          <label class="field-label mt-12" for="change-affinity">Elemental Affinity</label>
          <select class="input" id="change-affinity">
            <option value="">None selected</option>
            ${DRAGONBORN_AFFINITIES.map(affinity => `<option value="${esc(affinity)}" ${character.elementalAffinity === affinity ? 'selected' : ''}>${esc(titleCase(affinity))}</option>`).join('')}
          </select>
        ` : ''}
        ${character.elementalAffinity ? `<div class="subtle mt-12">Draconic heritage: ${esc(titleCase(character.elementalAffinity))} affinity</div>` : ''}
        <div class="wrap mt-12">
          <span class="pill" data-tooltip="${esc(`${background.name}\n${background.desc}\n\nStarting package: ${backgroundRewardSummary(background)}`)}" tabindex="0">${esc(background.icon || '✦')} ${esc(background.name)}</span>
        </div>
        <div class="wrap mt-12">${passiveRow}</div>
      </section>

      <section class="card">
        <div class="kicker">Progression &amp; Power</div>
        <div class="level-split-grid">
          <div class="level-split-item">
            <h3 data-tooltip="${esc(skillLevelTooltip(skillLevel))}" tabindex="0">Skill Level ${skillLevel.display}</h3>
            <div class="level-xp-meta subtle">${skillLevel.skillCount} skills · +1 Level per skill</div>
            <div class="progress-bar level-xp-bar"><div class="progress-fill" style="width:0%"></div></div>
          </div>
          <div class="level-split-item">
            <h3 data-tooltip="${esc(combatPowerTooltip(combatPower))}" tabindex="0">Combat Power ${combatPower.display}</h3>
            <div class="level-xp-meta subtle">${combatPower.fraction > 0 ? `${combatPower.pct}% toward Combat Power ${combatPower.combatPower + 1}` : 'Whole level reached'}</div>
            <div class="progress-bar level-xp-bar"><div class="progress-fill" style="width:${combatPower.pct}%"></div></div>
          </div>
        </div>
        <div class="wrap mt-14">
          <span class="pill gold">${character.lumens} Lumens</span>
          <span class="pill">${formatCurrency(character.gil)}</span>
          <span class="pill good">${character.hp}/${stats.hp} HP</span>
          <span class="pill warn">${character.stamina}/${stats.stamina} Stamina</span>
        </div>
        ${renderEffectsSnapshot(character)}
      </section>
    </div>

    ${renderElementalAffinitySection(character)}

    ${renderEffectsManager(character)}

    ${renderPerformanceBanner(character)}

    <div class="grid three char-gear-grid mt-16">
      <section class="card">
        <h3>Core Stats</h3>
        <div class="grid three core-stats-grid">
          ${Object.entries(STAT_RULES).map(([stat, rule]) => `<div class="stat-row stat-row-compact" data-tooltip="${esc(statTooltip(rule))}" tabindex="0"><strong>${esc(rule.label)}</strong><div class="stat-value">${stats[stat]}</div></div>`).join('')}
        </div>
      </section>
      <section class="card equipment-card">
        <h3 class="gear-section-title">Equipment</h3>
        <div class="stack gear-stack">${renderEquipSlots(character, 'Nothing equipped')}</div>
      </section>
      <section class="card inventory-card">
        <h3 class="gear-section-title">Inventory</h3>
        ${renderInventoryToolbar(character)}
        <div class="stack gear-stack">${renderInventoryRows(character)}</div>
      </section>
    </div>

    <section class="card mt-16">
      <h3>Unlocked Skills</h3>
      ${unlocked.length ? `<div class="wrap">${unlocked.map(skill => `<span class="pill ${isToggleSkill(skill) ? 'warn' : 'good'}" data-tooltip="${esc(skillTooltip(skill, character))}" tabindex="0">${esc(skill.icon || '✦')} ${esc(skill.name)}</span>`).join('')}</div>` : '<div class="empty">No skills yet. Time to spend shiny brain-money.</div>'}
    </section>
  `
}

function renderPerformanceBanner(character) {
  const rows = activePerformanceStatuses(character)
  if (!rows.length) return ''
  const pills = rows.map(status => {
    const effect = getEffect(status.effectId)
    const name = effect?.name || titleCase(String(status.effectId || 'song').replace(/_buff|_debuff/g, ''))
    const turns = Number.isFinite(Number(status.duration)) ? status.duration : '?'
    const perf = formatPerformanceMeta(status.performance)
    const tip = [
      `Performing: ${name}`,
      `${turns} turn${turns === 1 ? '' : 's'} remaining on your sheet`,
      perf ? perf : 'Vocal performance',
      '',
      'Keep performing each turn or end the song. Harmony joiners are counted at the table.'
    ].join('\n')
    return `<span class="pill warn" data-tooltip="${esc(tip)}" tabindex="0">🎵 ${esc(name)} (${turns}t)${perf ? ` · ${esc(perf)}` : ''}</span>`
  }).join('')
  return `
    <section class="card performance-banner mt-16">
      <div class="kicker">Musician</div>
      <h3 class="performance-banner-title">Now performing</h3>
      <div class="wrap">${pills}</div>
    </section>
  `
}

function renderFusionFilterBar(character) {
  if (state.skillCategory !== 'fusion') return ''
  syncFusionFilters(character)
  const options = fusionFilterOptions(state.skillSubcategory, character)
  const filters = state.skillFusionFilters || { weapons: [], elements: [], kinds: [] }
  const rows = []

  if (options.weapons.length) {
    rows.push({
      label: 'Weapon',
      dim: 'weapons',
      items: options.weapons.map(value => ({
        value,
        label: displayFusionWeapon(value),
        active: filters.weapons.includes(value)
      }))
    })
  }
  if (options.elements.length) {
    rows.push({
      label: 'Element',
      dim: 'elements',
      items: options.elements.map(value => ({
        value,
        label: displayFusionElement(value),
        active: filters.elements.includes(value)
      }))
    })
  }
  if (options.kinds.length) {
    rows.push({
      label: 'Type',
      dim: 'kinds',
      items: options.kinds.map(value => ({
        value,
        label: displayFusionCareerKind(value),
        active: filters.kinds.includes(value)
      }))
    })
  }

  if (!rows.length) return ''

  const hint = hasActiveFusionFilters(filters)
    ? 'Showing skills that match your selections. Click again to deselect.'
    : 'Click to filter — leave all off to show every available skill.'

  return `
    <div class="fusion-filters card" aria-label="Fusion filters">
      <div class="fusion-filters-head">
        <span class="kicker">Filter</span>
        <span class="subtle fusion-filters-hint">${esc(hint)}</span>
        ${hasActiveFusionFilters(filters) ? '<button type="button" class="ghost-btn tiny" data-clear-fusion-filters="">Clear</button>' : ''}
      </div>
      ${rows.map(row => `
        <div class="fusion-filter-row">
          <span class="fusion-filter-label">${esc(row.label)}</span>
          <div class="fusion-filter-chips">
            ${row.items.map(item => `
              <button type="button"
                class="fusion-filter-chip ${item.active ? 'active' : ''}"
                data-fusion-filter=""
                data-fusion-filter-dim="${esc(row.dim)}"
                data-fusion-filter-value="${esc(item.value)}"
                aria-pressed="${item.active ? 'true' : 'false'}">${esc(item.label)}</button>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `
}

function renderSkillsTab(character) {
  const viewMode = character.skillViewMode === 'browse' ? 'browse' : 'focused'
  const focusedCtx = viewMode === 'focused' ? getFocusedSkillContext(character) : null
  const searching = Boolean(state.skillSearch)

  let categories = visibleSkillCategories(character)
  if (focusedCtx && !searching) categories = focusedCategories(focusedCtx, categories)

  if (!categories.length) {
    return '<div class="empty">No skill trees available yet. Learn prerequisite skills to reveal more.</div>'
  }
  if (!categories.includes(state.skillCategory)) state.skillCategory = categories[0]
  let subs = visibleSubcategories(state.skillCategory, character)
  if (focusedCtx && !searching) subs = focusedSubcategories(focusedCtx, state.skillCategory, subs)
  if (!subs.includes(state.skillSubcategory)) state.skillSubcategory = subs[0] || ''
  syncFusionFilters(character)
  const fusionFiltersHtml = renderFusionFilterBar(character)

  let list
  let searchOutsideHits = []
  if (searching) {
    // Full catalogue search even in Focused mode
    const q = state.skillSearch.toLowerCase()
    const allCats = visibleSkillCategories(character)
    const hits = []
    for (const category of allCats) {
      for (const sub of visibleSubcategories(category, character)) {
        for (const skill of skillsInSubcategory(category, sub, character)) {
          const haystack = [skill.name, skill.desc, skill.id, ...(skill.tags || [])].join(' ').toLowerCase()
          if (!haystack.includes(q)) continue
          if (state.skillStarredOnly && !(character.starredSkillIds || []).includes(skill.id)) continue
          hits.push(skill)
        }
      }
    }
    const seen = new Set()
    list = hits.filter(skill => {
      if (seen.has(skill.id)) return false
      seen.add(skill.id)
      return true
    })
    if (focusedCtx) {
      searchOutsideHits = list.filter(skill => isOutsideFocus(focusedCtx, skill))
    }
  } else {
    list = skillsInSubcategory(state.skillCategory, state.skillSubcategory, character)
      .filter(skill => {
        if (state.skillStarredOnly && !(character.starredSkillIds || []).includes(skill.id)) return false
        if (focusedCtx && !skillIsFocused(focusedCtx, skill)) return false
        return true
      })
  }

  const byTier = new Map()
  list.forEach(skill => {
    if (!byTier.has(skill.tier)) byTier.set(skill.tier, [])
    byTier.get(skill.tier).push(skill)
  })

  const learnedInTree = list.filter(skill => character.skills.includes(skill.id)).length
  const costRemaining = isGmMode()
    ? 0
    : list.filter(skill => !character.skills.includes(skill.id)).reduce((sum, skill) => sum + skill.cost, 0)

  const treeIntro = state.skillCategory === 'weapons' && WEAPON_SKILL_TREE_INTROS[state.skillSubcategory]
  const introHtml = treeIntro && !searching
    ? `<aside class="card skill-tree-intro" aria-label="${esc(displaySubcategory(state.skillSubcategory))} rules">
        <div class="kicker">${esc(displaySubcategory(state.skillSubcategory))} at the table</div>
        <ul class="skill-tree-intro-list">
          ${treeIntro.map(line => `<li>${line}</li>`).join('')}
        </ul>
      </aside>`
    : ''

  const sparseHint = focusedCtx?.isSparse && !searching
    ? `<p class="subtle mt-8">New sheet — showing starter weapon, magic, and career paths. Switch to <strong>Browse All</strong> anytime.</p>`
    : ''

  return `
    <div class="toolbar skills-toolbar">
      <div class="segmented skill-view-mode" role="group" aria-label="Skills view">
        <button type="button" data-skill-view-mode="focused" class="${viewMode === 'focused' ? 'active' : ''}">Focused</button>
        <button type="button" data-skill-view-mode="browse" class="${viewMode === 'browse' ? 'active' : ''}">Browse All</button>
      </div>
      <input class="input" id="skill-search" placeholder="Search skills, effects, prerequisites..." value="${esc(state.skillSearch)}" />
      <label class="pill ${state.skillStarredOnly ? 'good' : ''} shop-filter-toggle" title="Show only starred skills">
        <input type="checkbox" id="skill-starred-only" ${state.skillStarredOnly ? 'checked' : ''} />
        ⭐ Starred
      </label>
      <span class="pill good">${learnedInTree}/${list.length}${searching ? ' matches' : ' in tree'}</span>
      <span class="pill gold">${isGmMode() ? 'Free (GM)' : `${costRemaining}L remaining`}</span>
    </div>
    ${sparseHint}
    ${searching && viewMode === 'focused' && searchOutsideHits.length
      ? `<p class="subtle mt-8">${searchOutsideHits.length} result${searchOutsideHits.length === 1 ? '' : 's'} outside Focused (marked below).</p>`
      : ''}
    ${searching ? '' : `<div class="segmented">${categories.map(category => `<button type="button" data-skill-category="${esc(category)}" class="${category === state.skillCategory ? 'active' : ''}">${displayCategory(category)}</button>`).join('')}</div>
    <div class="segmented">${subs.map(sub => `<button type="button" data-skill-subcategory="${esc(sub)}" class="${sub === state.skillSubcategory ? 'active' : ''}">${displaySubcategory(sub)}</button>`).join('')}</div>
    ${fusionFiltersHtml}`}
    ${introHtml}
    <div class="skill-tree">
      ${[...byTier.entries()].sort((a, b) => a[0] - b[0]).map(([tier, skills]) => `
        <section class="tier-lane">
          <h3>Tier ${tier}</h3>
          <div class="skill-grid">${skills.map(skill => renderSkillCard(character, skill, {
            outsideFocus: searching && focusedCtx && isOutsideFocus(focusedCtx, skill)
          })).join('')}</div>
        </section>
      `).join('') || `<div class="empty">${state.skillCategory === 'fusion' && hasActiveFusionFilters(state.skillFusionFilters) ? 'No skills match these filters — try fewer selections or Clear.' : 'No skills matched your search.'}</div>`}
    </div>
  `
}

function renderSkillCard(character, skill, options = {}) {
  const unlocked = character.skills.includes(skill.id)
  const check = canLearnSkill(character, skill)
  const active = character.activeToggles.includes(skill.id)
  const conflict = incompatibilityReason(character, skill)
  const cls = unlocked ? 'unlocked' : check.ok ? 'available' : conflict ? 'incompatible' : 'locked'
  const pinned = (character.pinnedSkillIds || []).includes(skill.id)
  const starred = (character.starredSkillIds || []).includes(skill.id)
  const pinBtn = unlocked && isActionBarSkill(skill)
    ? `<button type="button" class="ghost-btn tiny" data-toggle-skill-pin="${esc(skill.id)}" aria-label="Pin skill">${pinned ? '📌' : '📍'}</button>`
    : ''
  const starBtn = `<button type="button" class="ghost-btn tiny" data-toggle-skill-star="${esc(skill.id)}" aria-label="Star skill">${starred ? '⭐' : '☆'}</button>`
  const action = unlocked
    ? `<button type="button" class="ghost-btn tiny" data-refund-skill="${esc(skill.id)}">Refund</button>${isToggleSkill(skill) ? `<button type="button" class="chip-btn tiny" data-toggle-skill="${esc(skill.id)}">${active ? 'Switch Off' : 'Switch On'}</button>` : ''}`
    : `<button type="button" class="primary-btn tiny" data-learn-skill="${esc(skill.id)}" ${check.ok ? '' : 'disabled'}>Learn</button>`
  return `
    <article class="skill-card ${cls}" data-tooltip="${esc(skillTooltip(skill, unlocked ? character : null))}" tabindex="0">
      <div class="skill-top">
        <div class="skill-icon">${esc(skill.icon || '✦')}</div>
        <div>
          <h4>${esc(skill.name)}</h4>
          <div class="wrap mt-12">
            <span class="pill gold">${isGmMode() && !unlocked ? 'Free' : `${skill.cost}L`}</span>
            <span class="pill warn">${Number(skill.staminaCost || 0)} STA</span>
            <span class="pill">Tier ${Number(skill.tier || 1)}</span>
            ${active ? '<span class="pill good">Active</span>' : ''}
            ${options.outsideFocus ? '<span class="pill subtle-pill">Outside focus</span>' : ''}
          </div>
        </div>
      </div>
      <p>${esc(skill.desc)}</p>
      <div class="wrap detail-pills">
        ${isToggleSkill(skill) ? '<span class="pill warn">Toggle</span>' : ''}
        ${skill.elementalType ? `<span class="pill">${titleCase(skill.elementalType)}</span>` : ''}
        ${skill.fusionKind === 'career' ? '<span class="pill good">Career Fusion</span>' : ''}
        ${isHomebrewSkill(skill) ? '<span class="pill warn">Homebrew</span>' : ''}
        ${skill.lootType ? `<span class="pill">${titleCase(skill.lootType)}</span>` : ''}
        ${(skill.tags || []).map(tag => `<span class="pill subtle-pill">${esc(tag)}</span>`).join('')}
        ${conflict ? '<span class="pill bad">Conflict</span>' : ''}
      </div>
      <div class="spacer"></div>
      <div class="subtle">${esc(prereqLabel(skill))}</div>
      ${!unlocked && !check.ok ? `<div class="pill bad">${esc(check.reason)}</div>` : ''}
      <div class="skill-actions">${starBtn}${pinBtn}${action}</div>
    </article>
  `
}

function renderResourceManager(character) {
  const stats = computeStats(character)
  const resourceControl = (resource, label, value, max, quick = [1, 5, 10]) => `
    <div class="resource-editor" data-tooltip="${esc(`${label}
Current value can be adjusted directly or with the quick buttons. Maximum: ${max}`)}" tabindex="0">
      <div>
        <strong>${label}</strong>
        <div class="subtle">Current / max: ${value}/${max}</div>
      </div>
      <div class="resource-control-row">
        ${quick.map(amount => `<button type="button" class="ghost-btn tiny" data-adjust-resource="${resource}" data-amount="-${amount}">-${amount}</button>`).join('')}
        <input class="input mini-input" type="number" min="0" max="${max}" value="${value}" data-resource-input="${resource}" />
        ${quick.map(amount => `<button type="button" class="ghost-btn tiny" data-adjust-resource="${resource}" data-amount="${amount}">+${amount}</button>`).join('')}
        <button type="button" class="primary-btn tiny" data-full-resource="${resource}">Full</button>
      </div>
    </div>
  `
  return `
    <section class="card resource-card">
      <div class="card-header">
        <div>
          <div class="kicker">Live Resource Editor</div>
          <h3>HP, Stamina, Lumens & Gil</h3>
          <p class="tab-intro">Use this during play to damage, heal, reward, spend, pay, rob, or otherwise lovingly bully the character.</p>
        </div>
        <span class="pill gold">${formatCurrency(character.gil)}</span>
      </div>
      <div class="stack">
        ${resourceControl('hp', 'HP', character.hp, stats.hp)}
        ${resourceControl('stamina', 'Stamina', character.stamina, stats.stamina)}
        <div class="resource-editor" data-tooltip="${esc('Lumens\nSpend or award any amount. Use the direct box for exact values instead of being trapped in +5/+25 jail.')}" tabindex="0">
          <div>
            <strong>Lumens</strong>
            <div class="subtle">Current: ${character.lumens}</div>
          </div>
          <div class="resource-control-row">
            ${[-25, -10, -5, -1].map(amount => `<button type="button" class="${amount < 0 ? 'danger-btn' : 'ghost-btn'} tiny" data-adjust-resource="lumens" data-amount="${amount}">${amount}</button>`).join('')}
            <input class="input mini-input" type="number" min="0" value="${character.lumens}" data-resource-input="lumens" />
            ${[1, 5, 10, 25].map(amount => `<button type="button" class="ghost-btn tiny" data-adjust-resource="lumens" data-amount="${amount}">+${amount}</button>`).join('')}
          </div>
        </div>
        <div class="resource-editor" data-tooltip="${esc('Gil\nSingle currency for the whole economy. Edit the exact amount or use quick add/remove buttons.')}" tabindex="0">
          <div>
            <strong>Gil</strong>
            <div class="subtle">Current: ${formatCurrency(character.gil)}</div>
          </div>
          <div class="money-grid">
            <label><span class="field-label">Amount</span><input class="input mini-input" type="number" min="0" value="${normalizeGil(character.gil)}" data-gil-input /></label>
            <div class="wrap">
              <button type="button" class="danger-btn tiny" data-coin="-1000">-1k</button>
              <button type="button" class="danger-btn tiny" data-coin="-100">-100</button>
              <button type="button" class="danger-btn tiny" data-coin="-10">-10</button>
              <button type="button" class="ghost-btn tiny" data-coin="10">+10</button>
              <button type="button" class="ghost-btn tiny" data-coin="100">+100</button>
              <button type="button" class="ghost-btn tiny" data-coin="1000">+1k</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
}

function renderStatsTab(character) {
  const computed = computeStats(character)
  return `
    ${renderResourceManager(character)}
    <p class="subtle mt-12">Early stat upgrades are cheaper. The price rises as you repeatedly improve the same stat. Gear and skill bonuses do not change the upgrade price.</p>
    <div class="grid two stat-upgrade-grid mt-16">
      ${Object.entries(STAT_RULES).map(([stat, rule]) => {
        const rows = statBreakdown(character, stat).map(row => `<span class="pill ${row.value >= 0 ? 'good' : 'bad'}">${esc(row.label)} ${row.value >= 0 ? '+' : ''}${row.value}</span>`).join('')
        const nextCost = getNextStatUpgradeCost(character, stat)
        const purchased = getPurchasedStatCount(character, stat)
        const untilBand = purchasesUntilNextBand(character, stat)
        const refund = getLatestStatRefund(character, stat)
        return `
          <section class="card stat-upgrade-card">
            <div class="stat-row stat-row-upgrade" data-tooltip="${esc(statTooltip(rule, { includeCost: true }))}" tabindex="0">
              <div class="stat-upgrade-head">
                <div class="kicker">Next: ${isGmMode() ? 'Free' : `${nextCost} Lumens`}</div>
                <h3>${esc(rule.label)}</h3>
              </div>
              <div class="stat-value">${computed[stat]}</div>
            </div>
            <div class="subtle mt-8">Purchased: ${purchased} · Next band in ${untilBand} · Refund: ${isGmMode() ? '—' : `${refund}L`}</div>
            <div class="wrap mt-12 stat-breakdown-pills">${rows}</div>
            <div class="stat-actions">
              <button type="button" class="ghost-btn" data-refund-stat="${esc(stat)}" data-tooltip="${esc(statRefundTooltip(stat, rule, character))}" tabindex="0">− Refund${isGmMode() || !refund ? '' : ` (${refund}L)`}</button>
              <button type="button" class="primary-btn" data-upgrade-stat="${esc(stat)}" data-tooltip="${esc(statUpgradeTooltip(stat, rule, character))}" tabindex="0">Upgrade (${isGmMode() ? 'Free' : `${nextCost}L`})</button>
            </div>
          </section>
        `
      }).join('')}
    </div>
  `
}

function renderInventoryToolbar(character) {
  const tagOptions = inventoryTagOptions(character)
  const gmOn = isGmMode()
  return `
    <div class="inventory-filters mt-12">
      <div class="wrap">
        <label class="field-label compact">Sort
          <select class="input tiny" id="inventory-sort">
            ${INVENTORY_SORT_OPTIONS.map(row => `<option value="${esc(row.id)}" ${state.inventorySort === row.id ? 'selected' : ''}>${esc(row.label)}</option>`).join('')}
          </select>
        </label>
        <label class="field-label compact">Filter
          <select class="input tiny" id="inventory-filter">
            ${INVENTORY_FILTER_OPTIONS.map(row => `<option value="${esc(row.id)}" ${state.inventoryFilter === row.id ? 'selected' : ''}>${esc(row.label)}</option>`).join('')}
          </select>
        </label>
        ${tagOptions.length ? `
          <label class="field-label compact">Tag
            <select class="input tiny" id="inventory-tag-filter">
              <option value="">All tags</option>
              ${tagOptions.map(tag => `<option value="${esc(tag)}" ${state.inventoryTagFilter === tag ? 'selected' : ''}>${esc(tag)}</option>`).join('')}
            </select>
          </label>
        ` : ''}
        ${gmOn ? `<label class="pill-label"><input type="checkbox" id="inventory-cursed-only" ${state.inventoryCursedOnly ? 'checked' : ''} /> Cursed only</label>` : ''}
      </div>
    </div>`
}

function renderInventoryRows(character) {
  const rows = filterInventoryEntries(character).map(entry => {
    const item = getItem(entry.itemId)
    if (!item) return ''
    const equippedSlot = Object.entries(character.equipped || {}).find(([, uidValue]) => uidValue === entry.uid)?.[0]
    const type = String(item.type || '').toLowerCase()
    const canEquipWeapon = canEquipToMainHand(item)
    const canEquipArmor = type.includes('armor')
    const canEquipAccessory = type.includes('accessory')
    const offhandCheck = isOffhandItem(item) ? canEquipToOffhand(character, item) : { ok: false }
    const canEquipOffhand = offhandCheck.ok && !equippedSlot
    const canEquip = (canEquipWeapon || canEquipArmor || canEquipAccessory) && !equippedSlot
    const crafted = craftedByLabel(entry, character)
    const enchantTargets = isEnhancementItem(item) && !equippedSlot
      ? compatibleEquippedGearForEnhancement(character, item)
      : []
    const presentation = resolveItemPresentation(item, entry)
    const statusIcons = renderItemStatusIcons(presentation)
    const cursedBadge = renderCursedBadgeHtml(presentation)
    const cursedNameClass = itemCursedNameClass(presentation)
    return `
      <div class="inventory-row inventory-item-row ${itemCardClass(presentation, '')}" data-tooltip="${esc(itemTooltip(item, character, entry))}" tabindex="0">
        <div class="inventory-item-copy">
          <strong class="inventory-item-name">${fallbackIcon(item)} <span class="${cursedNameClass}">${esc(presentation.displayName)}</span> ${cursedBadge} ${statusIcons} ${entry.qty > 1 ? `x${entry.qty}` : ''}</strong>
          <div class="subtle inventory-item-meta">${esc(item.type || 'item')} · ${esc(item.rarity || 'common')} ${equippedSlot ? `· ${titleCase(equippedSlot)}` : ''}</div>
          ${crafted ? `<div class="wrap inventory-item-tags"><span class="pill good">${esc(crafted)}</span></div>` : ''}
          ${(item.tags || []).length ? `<div class="wrap inventory-item-tags">${(item.tags || []).map(tag => `<span class="pill subtle-pill">${esc(tag)}</span>`).join('')}</div>` : ''}
          ${renderItemCounterControls(entry, item, { showWhenEquipped: Boolean(equippedSlot) })}
          <div class="subtle inventory-item-desc detail-line">${esc(presentation.displayDesc || 'No description provided.')}</div>
          <label class="field-label compact mt-12">Your notes
            <textarea class="input tiny inventory-item-notes" data-entry-player-notes="${esc(entry.uid)}" rows="2" placeholder="Personal notes…">${esc(entry.playerNotes || '')}</textarea>
          </label>
        </div>
        <div class="wrap inventory-item-actions">
          <button type="button" class="ghost-btn tiny" data-toggle-entry-star="${esc(entry.uid)}" aria-label="Star item">${entry.starred ? '⭐' : '☆'}</button>
          <button type="button" class="ghost-btn tiny" data-toggle-entry-lock="${esc(entry.uid)}" aria-label="Lock item">${entry.locked ? '🔒' : '🔓'}</button>
          ${enchantTargets.map(row => `<button type="button" class="primary-btn tiny" data-apply-enchant-gear="${esc(row.entry.uid)}" data-apply-enchant-scroll="${esc(entry.uid)}">${esc(applyEnchantTargetLabel(row.slot))}</button>`).join('')}
          ${canEquip ? `<button type="button" class="primary-btn tiny" data-equip-item="${esc(entry.uid)}">Equip</button>` : ''}
          ${canEquipOffhand ? `<button type="button" class="offhand-btn tiny" data-equip-offhand="${esc(entry.uid)}" title="${esc(offhandCheck.reason)}">Off-hand</button>` : ''}
          <button type="button" class="danger-btn tiny" data-remove-item="${esc(entry.uid)}" ${entry.locked ? 'disabled' : ''}>Remove</button>
        </div>
      </div>
    `
  }).join('')
  return rows || '<div class="empty gear-empty">Inventory empty. Visit the Shop tab to gear up.</div>'
}

function renderHomebrewTab() {
  const q = String(state.homebrewSearch || '').toLowerCase().trim()
  const items = listHomebrewItems().filter(item => {
    if (!q) return true
    return `${item.name} ${item.id} ${item.desc} ${item.type}`.toLowerCase().includes(q)
  })
  const skills = listHomebrewSkills().filter(skill => {
    if (!q) return true
    return `${skill.name} ${skill.id} ${skill.desc} ${skill.category} ${skill.subcategory}`.toLowerCase().includes(q)
  })
  const races = listHomebrewRaces().filter(race => {
    if (!q) return true
    return `${race.name} ${race.id} ${race.description}`.toLowerCase().includes(q)
  })
  const monsterTypes = listHomebrewMonsterTypes().filter(row => {
    if (!q) return true
    return `${row.name} ${row.id} ${row.description}`.toLowerCase().includes(q)
  })
  const monsterRoles = listHomebrewMonsterRoles().filter(row => {
    if (!q) return true
    return `${row.name} ${row.id} ${row.description}`.toLowerCase().includes(q)
  })
  const monsterSpecials = listHomebrewMonsterSpecials().filter(row => {
    if (!q) return true
    return `${row.name} ${row.id} ${row.description}`.toLowerCase().includes(q)
  })
  const backgrounds = listHomebrewBackgrounds().filter(row => {
    if (!q) return true
    return `${row.name} ${row.id} ${row.description}`.toLowerCase().includes(q)
  })
  const recipes = listHomebrewRecipes().filter(row => {
    if (!q) return true
    return `${row.name} ${row.id} ${row.desc} ${row.profession}`.toLowerCase().includes(q)
  })
  const filter = state.homebrewListFilter || 'all'
  const showItems = filter === 'all' || filter === 'items'
  const showSkills = filter === 'all' || filter === 'skills'
  const showRaces = filter === 'all' || filter === 'races'
  const showBackgrounds = filter === 'all' || filter === 'backgrounds'
  const showRecipes = filter === 'all' || filter === 'recipes'
  const showMonsterTypes = filter === 'all' || filter === 'monsterTypes'
  const showMonsterRoles = filter === 'all' || filter === 'monsterRoles'
  const showMonsterSpecials = filter === 'all' || filter === 'monsterSpecials'
  const draft = state.homebrewDraft
  const skillDraft = state.homebrewSkillDraft
  const raceDraft = state.homebrewRaceDraft
  const backgroundDraft = state.homebrewBackgroundDraft
  const recipeDraft = state.homebrewRecipeDraft
  const monsterDraft = state.homebrewMonsterDraft
  const grantOptions = state.characters.map(c =>
    `<option value="${esc(c.id)}" ${c.id === state.activeId ? 'selected' : ''}>${esc(c.name)}</option>`
  ).join('')
  const statFields = (draft, prefix = 'hb') => ['strength', 'magicPower', 'accuracy', 'speed', 'hp', 'stamina', 'physicalDefence', 'magicalDefence']
    .map(key => {
      const rule = STAT_RULES[key]
      const label = rule?.label || titleCase(key)
      const value = draft?.statModifiers?.[key] ?? ''
      return `
        <div class="number-stepper-field">
          <span class="field-label">${esc(label)}</span>
          ${renderNumberStepper({
            name: `${prefix}-stat-${key}`,
            value: value === '' ? '' : String(value),
            placeholder: '0',
            decreaseLabel: `Decrease ${label}`,
            increaseLabel: `Increase ${label}`
          })}
        </div>
      `
    }).join('')

  const listRows = showItems ? items.map(item => {
    const checked = Boolean(state.homebrewSelected[item.id])
    const shopLabel = item.listInShop && item.shopPriceGil
      ? formatCurrency(item.shopPriceGil)
      : 'Grant only'
    const presentation = resolveItemPresentation(item, null)
    const cursedBadge = renderCursedBadgeHtml(presentation)
    const cursedNameClass = itemCursedNameClass(presentation)
    return `
      <article class="item-card homebrew-row ${itemCardClass(presentation, '')}" data-tooltip="${esc(itemTooltip(item, activeCharacter()))}" tabindex="0">
        <div class="item-title">
          <label class="homebrew-check"><input type="checkbox" data-homebrew-select="${esc(item.id)}" ${checked ? 'checked' : ''} /> ${fallbackIcon(item)} <strong class="${cursedNameClass}">${esc(presentation.displayName)}</strong></label>
          ${cursedBadge}
          <span class="pill warn">Item</span>
        </div>
        <div class="item-meta">${esc(item.type)} · ${esc(item.rarity || 'common')} · ${esc(shopLabel)}${item.damage ? ` · ${esc(item.damage)}` : ''}${item.weaponKind ? ` · ${esc(weaponKindDisplayLabel(item.weaponKind))}` : ''}${item.offhandType ? ` · ${titleCase(item.offhandType)}` : ''}${itemHasCounter(item) ? ` · Counter: ${esc(itemCounterLabel(item))}` : ''}${item.archived ? ' · Archived' : ''}${item.approvalStatus && item.approvalStatus !== 'approved' ? ` · ${titleCase(item.approvalStatus)}` : ''}</div>
        <p class="subtle">${esc(presentation.displayDesc || 'No description.')}</p>
        <div class="wrap detail-pills">${Object.entries(item.statModifiers || {}).map(([k, v]) => `<span class="pill good">${titleCase(k)} ${v >= 0 ? '+' : ''}${v}</span>`).join('')}${(item.specialEffects || []).map(id => renderEffectPill(id, item.name)).join('')}${(item.tags || []).map(tag => `<span class="pill subtle-pill">${esc(tag)}</span>`).join('') || (!Object.keys(item.statModifiers || {}).length ? '<span class="pill">No stat modifiers</span>' : '')}</div>
        <div class="skill-actions">
          <select class="input tiny" id="homebrew-grant-${esc(item.id)}" aria-label="Grant target for ${esc(item.name)}">
            ${grantOptions || '<option value="">No characters</option>'}
          </select>
          <span class="wrap compact-actions">
            <button type="button" class="primary-btn tiny" data-grant-homebrew="${esc(item.id)}" ${grantOptions ? '' : 'disabled'}>Add to character</button>
            <button type="button" class="ghost-btn tiny" data-homebrew-edit="${esc(item.id)}">Edit</button>
            <button type="button" class="ghost-btn tiny" data-homebrew-duplicate="${esc(item.id)}">Duplicate</button>
            ${item.archived ? `<button type="button" class="ghost-btn tiny" data-homebrew-restore="${esc(item.id)}">Restore</button>` : `<button type="button" class="danger-btn tiny" data-homebrew-delete="${esc(item.id)}">Archive</button>`}
          </span>
        </div>
      </article>
    `
  }).join('') : ''

  const skillRows = showSkills ? skills.map(skill => {
    const checked = Boolean(state.homebrewSkillSelected[skill.id])
    const typeLabel = HOMEBREW_SKILL_TYPES.find(row => row.id === skill.skillType)?.label || titleCase(skill.skillType || 'passive')
    const damageLabel = skill.damageMode && skill.damageMode !== 'none'
      ? ` · ${homebrewDamageModeLabel(skill.damageMode)}${skill.damageDice ? ` ${skill.damageDice}` : ''}${skill.damageStat ? ` + ${homebrewDamageStatLabel(skill.damageStat)}` : ''}`
      : ''
    const useFx = (skill.activationEffects || []).length
      ? ` · ${skill.activationEffects.length} on-use effect${skill.activationEffects.length === 1 ? '' : 's'}`
      : ''
    const lockLabel = homebrewSkillLockSummary(skill)
    const lockMeta = lockLabel ? ` · ${lockLabel}` : ''
    return `
      <article class="item-card homebrew-row">
        <div class="item-title">
          <label class="homebrew-check"><input type="checkbox" data-homebrew-skill-select="${esc(skill.id)}" ${checked ? 'checked' : ''} /> ${esc(skill.icon || '✦')} <strong>${esc(skill.name)}</strong></label>
          <span class="pill good">Skill</span>
        </div>
        <div class="item-meta">${displayCategory(skill.category)} · ${displaySubcategory(skill.subcategory || 'custom')} · Tier ${skill.tier} · ${skill.cost}L · ${esc(typeLabel)}${esc(damageLabel)}${esc(useFx)}${esc(lockMeta)}</div>
        <p class="subtle">${esc(skill.desc || 'No description.')}</p>
        <div class="wrap detail-pills">${Object.entries(skill.statModifiers || {}).map(([k, v]) => `<span class="pill good">${titleCase(k)} ${v >= 0 ? '+' : ''}${v}</span>`).join('')}${(skill.specialEffects || []).map(id => renderEffectPill(id, skill.name)).join('') || (!Object.keys(skill.statModifiers || {}).length ? '<span class="pill">No stat modifiers</span>' : '')}</div>
        <div class="skill-actions">
          <select class="input tiny" id="homebrew-skill-grant-${esc(skill.id)}" aria-label="Grant target for ${esc(skill.name)}">
            ${grantOptions || '<option value="">No characters</option>'}
          </select>
          <span class="wrap compact-actions">
            <button type="button" class="primary-btn tiny" data-grant-homebrew-skill="${esc(skill.id)}" ${grantOptions ? '' : 'disabled'}>Grant skill</button>
            <button type="button" class="ghost-btn tiny" data-homebrew-skill-edit="${esc(skill.id)}">Edit</button>
            <button type="button" class="ghost-btn tiny" data-homebrew-skill-duplicate="${esc(skill.id)}">Duplicate</button>
            <button type="button" class="danger-btn tiny" data-homebrew-skill-delete="${esc(skill.id)}">Delete</button>
          </span>
        </div>
      </article>
    `
  }).join('') : ''

  const raceRows = showRaces ? races.map(race => {
    const checked = Boolean(state.homebrewRaceSelected[race.id])
    const skillCount = listHomebrewSkills().filter(skill => skill.category === 'racial' && skill.subcategory === race.id).length
    const passives = (race.passiveTraits || []).map(trait => `<span class="pill good">${esc(trait)}</span>`).join('')
    const effectPills = (race.specialEffects || []).map(id => renderEffectPill(id, race.name)).join('')
    return `
      <article class="item-card homebrew-row">
        <div class="item-title">
          <label class="homebrew-check"><input type="checkbox" data-homebrew-race-select="${esc(race.id)}" ${checked ? 'checked' : ''} /> ${esc(race.icon || '✦')} <strong>${esc(race.name)}</strong></label>
          <span class="pill">Race</span>
        </div>
        <div class="item-meta">${esc(race.id)} · ${skillCount} racial skill${skillCount === 1 ? '' : 's'}</div>
        <p class="subtle">${esc(race.description || 'No description.')}</p>
        <div class="wrap detail-pills">${Object.entries(race.statModifiers || {}).map(([k, v]) => `<span class="pill good">${titleCase(k)} ${v >= 0 ? '+' : ''}${v}</span>`).join('')}${effectPills}${passives}${(!Object.keys(race.statModifiers || {}).length && !passives && !effectPills ? '<span class="pill">No stat modifiers</span>' : '')}</div>
        <div class="skill-actions">
          <span class="wrap compact-actions">
            <button type="button" class="ghost-btn tiny" data-homebrew-race-edit="${esc(race.id)}">Edit</button>
            <button type="button" class="ghost-btn tiny" data-homebrew-race-duplicate="${esc(race.id)}">Duplicate</button>
            <button type="button" class="danger-btn tiny" data-homebrew-race-delete="${esc(race.id)}">Delete</button>
          </span>
        </div>
      </article>
    `
  }).join('') : ''

  const backgroundRows = showBackgrounds ? backgrounds.map(row => {
    const checked = Boolean(state.homebrewBackgroundSelected?.[row.id])
    const itemSummary = (row.items || []).map(backgroundItemLabel).join(', ')
    return `
      <article class="item-card homebrew-row">
        <div class="item-title">
          <label class="homebrew-check"><input type="checkbox" data-homebrew-background-select="${esc(row.id)}" ${checked ? 'checked' : ''} /> ${esc(row.icon || '✦')} <strong>${esc(row.name)}</strong></label>
          <span class="pill">Background</span>
        </div>
        <div class="item-meta">${formatCurrency(row.gil)} · ${row.lumens} Lumens${row.hardMode ? ' · Hard mode' : ''}${row.archived ? ' · Archived' : ''}</div>
        <p class="subtle">${esc(row.description || 'No description.')}</p>
        <p class="subtle">${esc(itemSummary || 'No starting items')}</p>
        <div class="skill-actions">
          <span class="wrap compact-actions">
            <button type="button" class="ghost-btn tiny" data-homebrew-background-edit="${esc(row.id)}">Edit</button>
            <button type="button" class="ghost-btn tiny" data-homebrew-background-duplicate="${esc(row.id)}">Duplicate</button>
            <button type="button" class="danger-btn tiny" data-homebrew-background-delete="${esc(row.id)}">Archive</button>
          </span>
        </div>
      </article>
    `
  }).join('') : ''

  const recipeRows = showRecipes ? recipes.map(row => {
    const checked = Boolean(state.homebrewRecipeSelected?.[row.id])
    const output = getItem(row.outputItemId)
    return `
      <article class="item-card homebrew-row">
        <div class="item-title">
          <label class="homebrew-check"><input type="checkbox" data-homebrew-recipe-select="${esc(row.id)}" ${checked ? 'checked' : ''} /> <strong>${esc(row.name)}</strong></label>
          <span class="pill">Recipe</span>
        </div>
        <div class="item-meta">${titleCase(row.profession || 'craft')} · Tier ${row.tier}${output ? ` · → ${esc(output.name)}` : ''}</div>
        <p class="subtle">${esc(row.desc || 'No description.')}</p>
        <div class="skill-actions">
          <span class="wrap compact-actions">
            <button type="button" class="ghost-btn tiny" data-homebrew-recipe-edit="${esc(row.id)}">Edit</button>
            <button type="button" class="danger-btn tiny" data-homebrew-recipe-delete="${esc(row.id)}">Archive</button>
          </span>
        </div>
      </article>
    `
  }).join('') : ''

  const monsterTemplateRows = (rows, kind, label) => rows.map(row => {
    const checked = Boolean(state.homebrewMonsterSelected[row.id])
    return `
      <article class="item-card homebrew-row">
        <div class="item-title">
          <label class="homebrew-check"><input type="checkbox" data-homebrew-monster-select="${esc(row.id)}" ${checked ? 'checked' : ''} /> ${esc(row.icon || '✦')} <strong>${esc(row.name)}</strong></label>
          <span class="pill warn">${esc(label)}</span>
        </div>
        <div class="item-meta">${esc(row.id)}${row.skillIds?.length ? ` · ${row.skillIds.length} skill${row.skillIds.length === 1 ? '' : 's'}` : ''}</div>
        <p class="subtle">${esc(row.description || 'No description.')}</p>
        <div class="wrap detail-pills">${Object.entries(row.statModifiers || {}).map(([k, v]) => `<span class="pill good">${titleCase(k)} ${v >= 0 ? '+' : ''}${v}</span>`).join('') || '<span class="pill">No stat modifiers</span>'}</div>
        <div class="skill-actions">
          <span class="wrap compact-actions">
            <button type="button" class="ghost-btn tiny" data-homebrew-monster-edit="${esc(kind)}" data-homebrew-monster-id="${esc(row.id)}">Edit</button>
            <button type="button" class="ghost-btn tiny" data-homebrew-monster-duplicate="${esc(kind)}" data-homebrew-monster-id="${esc(row.id)}">Duplicate</button>
            <button type="button" class="danger-btn tiny" data-homebrew-monster-delete="${esc(kind)}" data-homebrew-monster-id="${esc(row.id)}">Delete</button>
          </span>
        </div>
      </article>
    `
  }).join('')

  const monsterTypeRows = showMonsterTypes ? monsterTemplateRows(monsterTypes, 'monsterTypes', 'Monster Type') : ''
  const monsterRoleRows = showMonsterRoles ? monsterTemplateRows(monsterRoles, 'monsterRoles', 'Combat Role') : ''
  const monsterSpecialRows = showMonsterSpecials ? monsterTemplateRows(monsterSpecials, 'monsterSpecials', 'Special') : ''

  const itemEditor = draft && state.homebrewEditorKind === 'item' ? `
    <section class="card homebrew-editor mt-16">
      <div class="card-header">
        <div>
          <div class="kicker">${state.homebrewEditingId ? 'Edit item' : 'New item'}</div>
          <h3>${state.homebrewEditingId ? esc(draft.name || 'Edit') : 'Create homebrew item'}</h3>
        </div>
        <button type="button" class="ghost-btn tiny" data-homebrew-cancel>Cancel</button>
      </div>
      <form id="homebrew-form" class="${homebrewItemEditorClass(draft)}">
        <input type="hidden" name="hb-id" value="${esc(draft.id || '')}" />
        <div>
          <label class="field-label">Name *</label>
          <input class="input" name="hb-name" required maxlength="80" value="${esc(draft.name || '')}" placeholder="Lucky Charm" />
          <label class="field-label mt-12">Icon (emoji)</label>
          <input class="input" name="hb-icon" maxlength="8" value="${esc(draft.icon || '✦')}" />
          <label class="field-label mt-12">Type *</label>
          <select class="input" name="hb-type">
            ${HOMEBREW_ITEM_TYPES.map(type => `<option value="${type}" ${draft.type === type ? 'selected' : ''}>${titleCase(type)}</option>`).join('')}
          </select>
          <label class="field-label mt-12">Rarity</label>
          <select class="input" name="hb-rarity">
            ${HOMEBREW_RARITIES.map(r => `<option value="${r}" ${draft.rarity === r ? 'selected' : ''}>${titleCase(r)}</option>`).join('')}
          </select>
          <label class="field-label mt-12 hb-weapon-field hb-offhand-field">Damage (weapons / off-hand, e.g. 1d8)</label>
          <input class="input hb-weapon-field hb-offhand-field" name="hb-damage" value="${esc(draft.damage || '')}" placeholder="1d8" />
          ${homebrewItemWeaponKindFields(draft)}
          ${homebrewItemHandsFields(draft)}
          ${homebrewItemOffhandFields(draft)}
        </div>
        <div>
          <label class="field-label">Description *</label>
          <textarea class="input homebrew-desc" name="hb-desc" required maxlength="2000" rows="6" placeholder="What it does at the table…">${esc(draft.desc || '')}</textarea>
          <label class="field-label mt-12 pill-label">
            <input type="checkbox" name="hb-list-in-shop" ${draft.listInShop ? 'checked' : ''} />
            List in Shop (Gil price)
          </label>
          <label class="field-label mt-12">Shop price (Gil)</label>
          <input class="input" type="number" min="0" name="hb-price" value="${esc(String(draft.shopPriceGil || 0))}" />
          <p class="subtle mt-12">Leave shop unchecked for grant-only loot (Homebrew tab → Add to character).</p>
        </div>
        <div class="homebrew-stats span-2">
          <div class="kicker">Optional stat modifiers</div>
          <div class="grid four">${statFields(draft, 'hb')}</div>
        </div>
        ${renderHomebrewEffectSection(draft)}
        ${renderHomebrewCounterSection(draft)}
        ${homebrewItemMetaFields(draft)}
        ${homebrewItemCurseFields(draft)}
        ${homebrewApprovalField(draft, 'hb-approval-status')}
        ${homebrewBalanceTagChips(draft, 'hb-balance')}
        <div class="span-2">
          <button type="submit" class="primary-btn">Save item</button>
        </div>
      </form>
    </section>
  ` : ''

  const skillEditor = skillDraft && state.homebrewEditorKind === 'skill' ? (() => {
    const skillCategory = skillDraft.category || 'weapons'
    const isRacial = skillCategory === 'racial'
    const treeOptions = isRacial ? homebrewRaceOptionsForSkills() : homebrewSkillTreeOptions(skillCategory)
    const treeListId = `homebrew-skill-tree-list-${skillCategory}`
    const treeField = isRacial ? `
          <label class="field-label mt-12">Race *</label>
          <select class="input" name="hbs-subcategory" required>
            ${treeOptions.map(raceId => {
              const race = getRace(raceId)
              return `<option value="${esc(raceId)}" ${skillDraft.subcategory === raceId ? 'selected' : ''}>${esc(race?.icon || '✦')} ${esc(race?.name || displaySubcategory(raceId))}</option>`
            }).join('')}
          </select>
          <p class="subtle mt-12">Racial skills only appear for characters of this race. Create custom races below, or pick an official race.</p>
        ` : `
          <label class="field-label mt-12">Tree / group</label>
          <input class="input" name="hbs-subcategory" maxlength="32" list="${treeListId}" value="${esc(skillDraft.subcategory || 'sword')}" placeholder="sword" />
          <datalist id="${treeListId}">
            ${treeOptions.map(sub => `<option value="${esc(sub)}">${esc(displaySubcategory(sub))}</option>`).join('')}
          </datalist>
          <p class="subtle mt-12">Pick an existing weapon, magic school, career, or fusion tree — or type a new group name.</p>
        `
    return `
    <section class="card homebrew-editor mt-16">
      <div class="card-header">
        <div>
          <div class="kicker">${state.homebrewSkillEditingId ? 'Edit skill' : 'New skill'}</div>
          <h3>${state.homebrewSkillEditingId ? esc(skillDraft.name || 'Edit') : 'Create homebrew skill'}</h3>
        </div>
        <button type="button" class="ghost-btn tiny" data-homebrew-cancel>Cancel</button>
      </div>
      <form id="homebrew-skill-form" class="homebrew-form grid two">
        <input type="hidden" name="hbs-id" value="${esc(skillDraft.id || '')}" />
        <div>
          <label class="field-label">Name *</label>
          <input class="input" name="hbs-name" required maxlength="80" value="${esc(skillDraft.name || '')}" placeholder="Lucky Strike" />
          <label class="field-label mt-12">Icon (emoji)</label>
          <input class="input" name="hbs-icon" maxlength="8" value="${esc(skillDraft.icon || '✦')}" />
          <label class="field-label mt-12">Category *</label>
          <select class="input" name="hbs-category">
            ${HOMEBREW_SKILL_CATEGORIES.map(cat => `<option value="${cat}" ${skillDraft.category === cat ? 'selected' : ''}>${displayCategory(cat)}</option>`).join('')}
          </select>
          ${treeField}
        </div>
        <div>
          <label class="field-label">Description *</label>
          <textarea class="input homebrew-desc" name="hbs-desc" required maxlength="2000" rows="6" placeholder="Passive: … / Action: … — plain language for the table">${esc(skillDraft.desc || '')}</textarea>
          <div class="grid three mt-12">
            <label>
              <span class="field-label">Tier</span>
              <select class="input" name="hbs-tier">
                ${[1, 2, 3, 4, 5].map(t => `<option value="${t}" ${Number(skillDraft.tier) === t ? 'selected' : ''}>Tier ${t}</option>`).join('')}
              </select>
            </label>
            <label>
              <span class="field-label">Lumen cost</span>
              <input class="input" type="number" min="0" name="hbs-cost" value="${esc(String(skillDraft.cost ?? TIER_LUMEN_COST[skillDraft.tier] ?? 8))}" />
            </label>
            <label>
              <span class="field-label">Type</span>
              <select class="input" name="hbs-skill-type">
                ${HOMEBREW_SKILL_TYPES.map(row => `<option value="${row.id}" ${skillDraft.skillType === row.id ? 'selected' : ''}>${esc(row.label)}</option>`).join('')}
              </select>
            </label>
          </div>
          <label class="field-label mt-12">Stamina cost (actions / toggles)</label>
          <input class="input" type="number" min="0" name="hbs-stamina" value="${esc(String(skillDraft.staminaCost ?? 0))}" />
          <label class="field-label mt-12">Default target (activatable)</label>
          <select class="input" name="hbs-default-apply-to">
            ${HOMEBREW_SKILL_APPLY_TO.map(opt => `<option value="${opt.id}" ${(skillDraft.defaultApplyTo || 'self') === opt.id ? 'selected' : ''}>${esc(opt.label)}</option>`).join('')}
          </select>
          <label class="field-label mt-12">Use limit</label>
          <select class="input" name="hbs-use-limit">
            ${HOMEBREW_SKILL_USE_LIMITS.map(opt => `<option value="${opt.id}" ${(skillDraft.useLimit || '') === opt.id ? 'selected' : ''}>${esc(opt.label)}</option>`).join('')}
          </select>
        </div>
        ${renderHomebrewSkillDamageSection(skillDraft)}
        ${renderHomebrewUseEffectSection(skillDraft)}
        <div class="homebrew-stats span-2">
          <div class="kicker">Optional passive stat modifiers</div>
          <div class="grid four">${statFields(skillDraft, 'hbs')}</div>
        </div>
        ${renderHomebrewEffectSection(skillDraft, {
          intro: 'Passive effects while learned (resistances, stat hooks, etc.).',
          showPicker: state.homebrewSkillShowEffectPicker,
          search: state.homebrewSkillEffectSearch,
          toggleData: 'homebrew-toggle-skill-effects',
          searchId: 'homebrew-skill-effect-search',
          toggleCheckbox: 'homebrew-skill-effect-toggle',
          removeBtn: 'homebrew-skill-effect-remove'
        })}
        ${renderHomebrewSkillLocksSection(skillDraft)}
        ${homebrewApprovalField(skillDraft, 'hbs-approval-status')}
        ${homebrewBalanceTagChips(skillDraft, 'hbs-balance')}
        <label class="field-label mt-12 span-2">Tags (comma-separated)</label>
        <input class="input span-2" name="hbs-tags" value="${esc(skillDraft.tagsText || '')}" placeholder="fire, control, healing" />
        <div class="span-2">
          <button type="submit" class="primary-btn">Save skill</button>
        </div>
      </form>
    </section>
  `
  })() : ''

  const raceEditor = raceDraft && state.homebrewEditorKind === 'race' ? `
    <section class="card homebrew-editor mt-16">
      <div class="card-header">
        <div>
          <div class="kicker">${state.homebrewRaceEditingId ? 'Edit race' : 'New race'}</div>
          <h3>${state.homebrewRaceEditingId ? esc(raceDraft.name || 'Edit') : 'Create homebrew race'}</h3>
        </div>
        <button type="button" class="ghost-btn tiny" data-homebrew-cancel>Cancel</button>
      </div>
      <form id="homebrew-race-form" class="homebrew-form grid two">
        <input type="hidden" name="hbr-id" value="${esc(raceDraft.id || '')}" />
        <div>
          <label class="field-label">Name *</label>
          <input class="input" name="hbr-name" required maxlength="80" value="${esc(raceDraft.name || '')}" placeholder="Fae Folk" />
          <label class="field-label mt-12">Icon (emoji)</label>
          <input class="input" name="hbr-icon" maxlength="8" value="${esc(raceDraft.icon || '✦')}" />
          <label class="field-label mt-12">Description *</label>
          <textarea class="input homebrew-desc" name="hbr-description" required maxlength="2000" rows="6" placeholder="What makes this race special at the table…">${esc(raceDraft.description || '')}</textarea>
        </div>
        <div>
          <label class="field-label">Passive traits (one per line)</label>
          <textarea class="input homebrew-desc" name="hbr-passives" maxlength="2000" rows="6" placeholder="Keen Senses: +1 Accuracy when scouting">${esc(raceDraft.passiveTraitsText || '')}</textarea>
          <p class="subtle mt-12">Plain-language table rules. Shown on the Character tab like official race passives.</p>
        </div>
        <div class="homebrew-stats span-2">
          <div class="kicker">Optional starting stat modifiers</div>
          <div class="grid four">${statFields(raceDraft, 'hbr')}</div>
        </div>
        ${renderHomebrewEffectSection(raceDraft, {
          intro: 'Pick immunities, resistances, and other passive hooks from the catalog — applied while this race is selected (like gear effects).',
          showPicker: state.homebrewRaceShowEffectPicker,
          search: state.homebrewRaceEffectSearch,
          toggleData: 'homebrew-toggle-race-effects',
          searchId: 'homebrew-race-effect-search',
          toggleCheckbox: 'homebrew-race-effect-toggle',
          removeBtn: 'homebrew-race-effect-remove'
        })}
        ${homebrewApprovalField(raceDraft, 'hbr-approval-status')}
        ${homebrewBalanceTagChips(raceDraft, 'hbr-balance')}
        <div class="span-2">
          <button type="submit" class="primary-btn">Save race</button>
        </div>
      </form>
    </section>
  ` : ''

  const monsterEditor = monsterDraft && ['monsterTypes', 'monsterRoles', 'monsterSpecials'].includes(state.homebrewEditorKind) ? (() => {
    const kind = state.homebrewMonsterEditorKind || state.homebrewEditorKind || 'monsterTypes'
    const kindLabel = kind === 'monsterRoles' ? 'Combat Role' : kind === 'monsterSpecials' ? 'Special' : 'Monster Type'
    const statFieldsMonster = ['strength', 'magicPower', 'accuracy', 'speed', 'hp', 'stamina', 'physicalDefence', 'magicalDefence']
      .map(key => {
        const rule = STAT_RULES[key]
        const label = rule?.label || titleCase(key)
        const value = monsterDraft?.statModifiers?.[key] ?? ''
        return `<div class="number-stepper-field"><span class="field-label">${esc(label)}</span>${renderNumberStepper({ name: `hbm-stat-${key}`, value: value === '' ? '' : String(value), placeholder: '0', decreaseLabel: `Decrease ${label}`, increaseLabel: `Increase ${label}` })}</div>`
      }).join('')
    return `
    <section class="card homebrew-editor mt-16">
      <div class="card-header">
        <div>
          <div class="kicker">${state.homebrewMonsterEditingId ? `Edit ${kindLabel.toLowerCase()}` : `New ${kindLabel.toLowerCase()}`}</div>
          <h3>${state.homebrewMonsterEditingId ? esc(monsterDraft.name || 'Edit') : `Create ${kindLabel.toLowerCase()}`}</h3>
        </div>
        <button type="button" class="ghost-btn tiny" data-homebrew-cancel>Cancel</button>
      </div>
      <form id="homebrew-monster-form" class="homebrew-form grid two">
        <input type="hidden" name="hbm-id" value="${esc(monsterDraft.id || '')}" />
        <div>
          <label class="field-label">Name *</label>
          <input class="input" name="hbm-name" required maxlength="80" value="${esc(monsterDraft.name || '')}" />
          <label class="field-label mt-12">Icon</label>
          <input class="input" name="hbm-icon" maxlength="8" value="${esc(monsterDraft.icon || '✦')}" />
        </div>
        <div>
          <label class="field-label">Description</label>
          <textarea class="input" name="hbm-desc" rows="6">${esc(monsterDraft.description || '')}</textarea>
        </div>
        ${renderHomebrewMonsterPickers(monsterDraft)}
        <div class="homebrew-stats span-2"><div class="kicker">Stat shape weights</div><div class="grid four">${statFieldsMonster}</div></div>
        <div class="span-2 grid two">
          <label class="field-label">Behaviour<textarea class="input" name="hbm-behaviour" rows="3">${esc(monsterDraft.behaviourNotes || '')}</textarea></label>
          <label class="field-label">Actions<textarea class="input" name="hbm-actions" rows="3">${esc(monsterDraft.actionNotes || '')}</textarea></label>
          <label class="field-label">Loot<textarea class="input" name="hbm-loot" rows="2">${esc(monsterDraft.lootNotes || '')}</textarea></label>
          <label class="field-label pill-label mt-12"><input type="checkbox" name="hbm-humanoid" ${monsterDraft.isHumanoid ? 'checked' : ''} /> Humanoid monster</label>
        </div>
        <div class="span-2"><button type="submit" class="primary-btn">Save template</button></div>
      </form>
    </section>`
  })() : ''

  const backgroundEditor = backgroundDraft && state.homebrewEditorKind === 'background' ? `
    <section class="card homebrew-editor mt-16">
      <div class="card-header">
        <div>
          <div class="kicker">${state.homebrewBackgroundEditingId ? 'Edit background' : 'New background'}</div>
          <h3>${state.homebrewBackgroundEditingId ? esc(backgroundDraft.name || 'Edit') : 'Create homebrew background'}</h3>
        </div>
        <button type="button" class="ghost-btn tiny" data-homebrew-cancel>Cancel</button>
      </div>
      <form id="homebrew-background-form" class="homebrew-form grid two">
        <input type="hidden" name="hbb-id" value="${esc(backgroundDraft.id || '')}" />
        <div>
          <label class="field-label">Name *</label>
          <input class="input" name="hbb-name" required maxlength="80" value="${esc(backgroundDraft.name || '')}" />
          <label class="field-label mt-12">Icon</label>
          <input class="input" name="hbb-icon" maxlength="8" value="${esc(backgroundDraft.icon || '✦')}" />
          <label class="field-label mt-12">Starting Gil</label>
          <input class="input" type="number" min="0" name="hbb-gil" value="${esc(String(backgroundDraft.gil ?? 0))}" />
          <label class="field-label mt-12">Starting Lumens</label>
          <input class="input" type="number" min="0" name="hbb-lumens" value="${esc(String(backgroundDraft.lumens ?? 0))}" />
        </div>
        <div>
          <label class="field-label">Description *</label>
          <textarea class="input homebrew-desc" name="hbb-description" required rows="5">${esc(backgroundDraft.description || '')}</textarea>
          <label class="field-label mt-12">Starting items (one per line: item_id x2)</label>
          <textarea class="input" name="hbb-items" rows="4" placeholder="health_potion x2">${esc(backgroundDraft.itemsText || '')}</textarea>
          <label class="field-label mt-12">Table note (optional)</label>
          <textarea class="input" name="hbb-table-note" rows="2">${esc(backgroundDraft.tableNote || '')}</textarea>
          <label class="pill-label mt-12"><input type="checkbox" name="hbb-hard-mode" ${backgroundDraft.hardMode ? 'checked' : ''} /> Hard mode background</label>
        </div>
        ${homebrewApprovalField(backgroundDraft, 'hbb-approval-status')}
        ${homebrewBalanceTagChips(backgroundDraft, 'hbb-balance')}
        <div class="span-2"><button type="submit" class="primary-btn">Save background</button></div>
      </form>
    </section>
  ` : ''

  const recipeEditor = recipeDraft && state.homebrewEditorKind === 'recipe' ? `
    <section class="card homebrew-editor mt-16">
      <div class="card-header">
        <div>
          <div class="kicker">${state.homebrewRecipeEditingId ? 'Edit recipe' : 'New recipe'}</div>
          <h3>${state.homebrewRecipeEditingId ? esc(recipeDraft.name || 'Edit') : 'Create homebrew recipe'}</h3>
        </div>
        <button type="button" class="ghost-btn tiny" data-homebrew-cancel>Cancel</button>
      </div>
      <form id="homebrew-recipe-form" class="homebrew-form grid two">
        <input type="hidden" name="hbrcp-id" value="${esc(recipeDraft.id || '')}" />
        <div>
          <label class="field-label">Name *</label>
          <input class="input" name="hbrcp-name" required value="${esc(recipeDraft.name || '')}" />
          <label class="field-label mt-12">Profession</label>
          <input class="input" name="hbrcp-profession" value="${esc(recipeDraft.profession || 'blacksmith')}" />
          <label class="field-label mt-12">Tier</label>
          <input class="input" type="number" min="1" max="5" name="hbrcp-tier" value="${esc(String(recipeDraft.tier || 1))}" />
          <label class="field-label mt-12">Output item ID</label>
          <input class="input" name="hbrcp-output" value="${esc(recipeDraft.outputItemId || '')}" placeholder="custom_shield" />
        </div>
        <div>
          <label class="field-label">Description</label>
          <textarea class="input" name="hbrcp-desc" rows="4">${esc(recipeDraft.desc || '')}</textarea>
          <label class="field-label mt-12">Materials (one per line)</label>
          <textarea class="input" name="hbrcp-materials" rows="4" placeholder="iron_ingot x3">${esc(recipeDraft.materialsText || '')}</textarea>
          <label class="field-label mt-12">Required skills (comma-separated IDs)</label>
          <input class="input" name="hbrcp-skills" value="${esc(recipeDraft.requiredSkillsText || '')}" />
        </div>
        ${homebrewApprovalField(recipeDraft, 'hbrcp-approval-status')}
        ${homebrewBalanceTagChips(recipeDraft, 'hbrcp-balance')}
        <label class="field-label mt-12 span-2">Tags (comma-separated)</label>
        <input class="input span-2" name="hbrcp-tags" value="${esc(recipeDraft.tagsText || '')}" placeholder="armor, blacksmith" />
        <div class="span-2"><button type="submit" class="primary-btn">Save recipe</button></div>
      </form>
    </section>
  ` : ''

  const emptyCopy = filter === 'skills'
    ? 'No homebrew skills yet.'
    : filter === 'items'
      ? 'No homebrew items yet.'
      : filter === 'races'
        ? 'No homebrew races yet.'
        : filter === 'backgrounds'
          ? 'No homebrew backgrounds yet.'
          : filter === 'recipes'
            ? 'No homebrew recipes yet.'
        : filter === 'monsterTypes'
          ? 'No custom monster types yet.'
          : filter === 'monsterRoles'
            ? 'No custom combat roles yet.'
            : filter === 'monsterSpecials'
              ? 'No custom specials yet.'
              : 'No homebrew yet.'
  const emptyBtn = filter === 'skills'
    ? `<button type="button" class="primary-btn tiny" data-homebrew-skill-new>Create your first skill</button>`
    : filter === 'items'
      ? `<button type="button" class="primary-btn tiny" data-homebrew-new>Create your first item</button>`
      : filter === 'races'
        ? `<button type="button" class="primary-btn tiny" data-homebrew-race-new>Create your first race</button>`
        : filter === 'monsterTypes'
          ? `<button type="button" class="primary-btn tiny" data-homebrew-monster-new="monsterTypes">Create monster type</button>`
          : filter === 'monsterRoles'
            ? `<button type="button" class="primary-btn tiny" data-homebrew-monster-new="monsterRoles">Create combat role</button>`
            : filter === 'monsterSpecials'
              ? `<button type="button" class="primary-btn tiny" data-homebrew-monster-new="monsterSpecials">Create special</button>`
              : `<button type="button" class="primary-btn tiny" data-homebrew-new>Create an item</button> <button type="button" class="primary-btn tiny" data-homebrew-skill-new>Create a skill</button> <button type="button" class="primary-btn tiny" data-homebrew-race-new>Create a race</button>`

  return `
    <section class="card catalogue-card">
      <div class="card-header">
        <div>
          <div class="kicker">Custom content</div>
          <h3>Homebrew</h3>
          <p class="tab-intro">Custom items, skills, and races for your table — stored in this browser. Export packs to share. Races appear in character creation and get their own tab under Skills → Race; racial skills must pick a real race.</p>
        </div>
        <span class="pill good">${items.length} item${items.length === 1 ? '' : 's'} · ${skills.length} skill${skills.length === 1 ? '' : 's'} · ${races.length} race${races.length === 1 ? '' : 's'} · ${backgrounds.length} bg · ${recipes.length} recipe${recipes.length === 1 ? '' : 's'} · ${monsterTypes.length + monsterRoles.length + monsterSpecials.length} GM tpl</span>
      </div>
      <div class="toolbar item-toolbar">
        <input class="input" id="homebrew-search" placeholder="Search homebrew…" value="${esc(state.homebrewSearch || '')}" />
        <button type="button" class="primary-btn tiny" data-homebrew-new>+ Item</button>
        <button type="button" class="primary-btn tiny" data-homebrew-skill-new>+ Skill</button>
        <button type="button" class="primary-btn tiny" data-homebrew-race-new>+ Race</button>
        <button type="button" class="primary-btn tiny" data-homebrew-background-new>+ Background</button>
        <button type="button" class="primary-btn tiny" data-homebrew-recipe-new>+ Recipe</button>
        <button type="button" class="ghost-btn tiny" data-homebrew-monster-new="monsterTypes">+ M.Type</button>
        <button type="button" class="ghost-btn tiny" data-homebrew-monster-new="monsterRoles">+ Role</button>
        <button type="button" class="ghost-btn tiny" data-homebrew-monster-new="monsterSpecials">+ Special</button>
        <label class="ghost-btn tiny file-label">Import pack<input id="import-homebrew-pack" type="file" accept="application/json" hidden /></label>
        <button type="button" class="ghost-btn tiny" data-homebrew-export-selected>Export selected</button>
        <button type="button" class="ghost-btn tiny" data-homebrew-export-all>Export all</button>
        <button type="button" class="ghost-btn tiny" data-homebrew-export-campaign>Campaign pack</button>
        <button type="button" class="ghost-btn tiny ${state.homebrewShowArchived ? 'active' : ''}" data-homebrew-toggle-archived>Show archived</button>
        <button type="button" class="ghost-btn tiny ${state.homebrewShowDrafts ? 'active' : ''}" data-homebrew-toggle-drafts>Show drafts</button>
      </div>
      <div class="segmented homebrew-filter">
        <button type="button" data-homebrew-filter="all" class="${filter === 'all' ? 'active' : ''}">All</button>
        <button type="button" data-homebrew-filter="items" class="${filter === 'items' ? 'active' : ''}">Items</button>
        <button type="button" data-homebrew-filter="skills" class="${filter === 'skills' ? 'active' : ''}">Skills</button>
        <button type="button" data-homebrew-filter="races" class="${filter === 'races' ? 'active' : ''}">Races</button>
        <button type="button" data-homebrew-filter="backgrounds" class="${filter === 'backgrounds' ? 'active' : ''}">Backgrounds</button>
        <button type="button" data-homebrew-filter="recipes" class="${filter === 'recipes' ? 'active' : ''}">Recipes</button>
        <button type="button" data-homebrew-filter="monsterTypes" class="${filter === 'monsterTypes' ? 'active' : ''}">Monster Types</button>
        <button type="button" data-homebrew-filter="monsterRoles" class="${filter === 'monsterRoles' ? 'active' : ''}">Combat Roles</button>
        <button type="button" data-homebrew-filter="monsterSpecials" class="${filter === 'monsterSpecials' ? 'active' : ''}">Specials</button>
      </div>
      ${renderHomebrewImportModal()}
      ${itemEditor}
      ${skillEditor}
      ${raceEditor}
      ${backgroundEditor}
      ${recipeEditor}
      ${monsterEditor}
      <div class="item-grid mt-16">
        ${listRows}${skillRows}${raceRows}${backgroundRows}${recipeRows}${monsterTypeRows}${monsterRoleRows}${monsterSpecialRows || (!listRows && !skillRows && !raceRows && !backgroundRows && !recipeRows && !monsterTypeRows && !monsterRoleRows ? `<div class="empty">${emptyCopy} ${emptyBtn}</div>` : '')}
      </div>
    </section>
  `
}

function renderShopTab(character) {
  const items = filterCatalogItems(character)
  const pageData = paginateItems(items)
  const categoryCounts = catalogCategoryCounts(character)
  const sourceCounts = catalogSourceCounts(character)
  const rarityOptions = cache.itemRarityOptions || ['all']
  const activeFilters = activeCatalogFilterLabels()
  const sourceOptions = [
    ['shop', 'Shop'],
    ['homebrew', 'Homebrew'],
    ['profession', 'Profession'],
    ['discoverable', 'Discoverable'],
    ['loot', 'Loot'],
    ['all', 'All sources']
  ]
  const categoryOptions = ITEM_CATALOG_CATEGORIES.filter(row =>
    row.id === 'all' || row.id === state.itemCategory || (categoryCounts[row.id] || 0) > 0
  )
  const sortOptions = [
    ['name', 'Name A–Z'],
    ['priceAsc', 'Cheapest first'],
    ['priceDesc', 'Most expensive'],
    ['rarityDesc', 'Rarest first'],
    ['damageDesc', 'Highest damage'],
    ['strengthDesc', 'Best Strength'],
    ['magicDesc', 'Best Magic'],
    ['defenceDesc', 'Best Defence'],
    ['sourceType', 'Source, then type']
  ]
  return `
    <section class="card catalogue-card">
      <div class="card-header">
        <div>
          <div class="kicker">Item Catalogue</div>
          <h3>Shop</h3>
          <p class="tab-intro">Browse gear by category — food includes shop snacks like apples and cheese, not just chef recipes. Stock unlocks by rarity at your Skill Level. Hover cards for details; Grant is GM-only free loot.</p>
        </div>
        <span class="pill gold">${formatCurrency(character.gil)}</span>
      </div>
      <div class="shop-filters">
        <div class="shop-filters-primary">
          <input class="input shop-search" id="item-search" placeholder="Search name, effect, stat, food, potion, sword…" value="${esc(state.itemSearch)}" />
          <select class="input" id="item-source" title="Where the item comes from">
            ${sourceOptions.map(([value, label]) => {
              const count = value === 'all' ? sourceCounts.all : (sourceCounts[value] || 0)
              return `<option value="${value}" ${state.itemSource === value ? 'selected' : ''}>${esc(label)} (${count})</option>`
            }).join('')}
          </select>
          <select class="input" id="item-category" title="Friendly item groups — Food & drink includes shop consumables">
            ${categoryOptions.map(row => {
              const count = row.id === 'all' ? categoryCounts.all : (categoryCounts[row.id] || 0)
              return `<option value="${esc(row.id)}" ${state.itemCategory === row.id ? 'selected' : ''}>${esc(row.label)} (${count})</option>`
            }).join('')}
          </select>
          <select class="input" id="item-rarity" title="Item rarity">
            ${rarityOptions.map(rarity => `<option value="${esc(rarity)}" ${state.itemRarity === rarity ? 'selected' : ''}>${rarity === 'all' ? 'Any rarity' : titleCase(rarity)}</option>`).join('')}
          </select>
        </div>
        <div class="shop-filters-secondary">
          <select class="input" id="item-sort">
            ${sortOptions.map(([value, label]) => `<option value="${value}" ${state.itemSort === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}
          </select>
          <label class="pill ${state.itemBuyableOnly ? 'good' : ''} shop-filter-toggle" title="Shop stock you can afford at your Skill Level — profession/loot items are craft-only or GM grant">
            <input type="checkbox" id="item-buyable-only" ${state.itemBuyableOnly ? 'checked' : ''} ${isGmMode() ? 'disabled' : ''} />
            Buyable only
          </label>
          <label class="pill ${state.itemStarredOnly ? 'good' : ''} shop-filter-toggle" title="Show wishlist items only">
            <input type="checkbox" id="item-starred-only" ${state.itemStarredOnly ? 'checked' : ''} />
            ⭐ Starred
          </label>
          ${activeFilters.length ? `<span class="pill warn shop-active-filters">Filters: ${activeFilters.map(label => esc(label)).join(' · ')}</span>` : ''}
        </div>
      </div>
      <div class="catalogue-summary">
        <span class="pill good">${pageData.total} match${pageData.total === 1 ? '' : 'es'}</span>
        <span class="pill">Page ${pageData.page + 1}/${pageData.totalPages} · ${ITEMS_PER_PAGE} per page</span>
        <button type="button" class="ghost-btn tiny" data-item-page-prev ${pageData.page <= 0 ? 'disabled' : ''}>Prev</button>
        <button type="button" class="ghost-btn tiny" data-item-page-next ${pageData.page >= pageData.totalPages - 1 ? 'disabled' : ''}>Next</button>
        <button type="button" class="ghost-btn tiny" data-reset-item-filters>Reset filters</button>
      </div>
      <div class="item-grid">${pageData.items.map(item => renderItemCard(item, character)).join('') || `<div class="empty">${state.itemBuyableOnly && state.itemSource !== 'shop' ? 'Buyable only applies to Shop stock — switch source to Shop, or turn off the filter to browse profession/loot catalogues.' : 'No items matched. Try Shop source, turn off Buyable only, or pick All categories.'}</div>`}</div>
    </section>
  `
}

function renderCraftTab(character) {
  const recipes = filterCraftRecipes(character, {
    search: state.craftSearch,
    profession: state.craftProfession,
    learnedOnly: state.craftLearnedOnly && !isGmMode(),
    starredOnly: state.craftStarredOnly
  })
  const professions = craftProfessionOptions()
  const gmFree = isGmMode()
  return `
    <section class="card catalogue-card">
      <div class="card-header">
        <div>
          <div class="kicker">Career Crafting</div>
          <h3>Craft</h3>
          <p class="tab-intro">Craft items from career recipes. Materials are taken from your inventory. ${gmFree ? 'GM Mode: Grant adds items instantly; Craft skips materials and skill gates but keeps craft bonuses on gear.' : 'Learn career skills on the Skills tab to unlock recipes.'}</p>
        </div>
        <span class="pill">${recipes.length} recipe${recipes.length === 1 ? '' : 's'}</span>
      </div>
      <div class="toolbar item-toolbar">
        <input class="input" id="craft-search" placeholder="Search recipes, materials, careers..." value="${esc(state.craftSearch)}" />
        <select class="input" id="craft-profession">
          ${professions.map(profession => `<option value="${esc(profession)}" ${state.craftProfession === profession ? 'selected' : ''}>${profession === 'all' ? 'All careers' : displaySubcategory(profession)}</option>`).join('')}
        </select>
        <label class="pill ${state.craftLearnedOnly ? 'good' : ''}" style="display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .6rem;">
          <input type="checkbox" id="craft-learned-only" ${state.craftLearnedOnly ? 'checked' : ''} ${gmFree ? 'disabled' : ''} />
          Unlocked only
        </label>
        <label class="pill ${state.craftStarredOnly ? 'good' : ''}" style="display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .6rem;">
          <input type="checkbox" id="craft-starred-only" ${state.craftStarredOnly ? 'checked' : ''} />
          ⭐ Starred
        </label>
      </div>
      <div class="item-grid mt-16">
        ${recipes.map(recipe => renderCraftRecipeCard(recipe, character)).join('') || '<div class="empty">No recipes matched. Learn a tier-1 career skill to unlock crafting.</div>'}
      </div>
    </section>
  `
}

function renderCraftRecipeCard(recipe, character) {
  const check = canCraftRecipe(character, recipe)
  const mats = materialsStatus(character, recipe)
  const skillLabels = (recipe.requiredSkills || []).map(id => getSkill(id)?.name || titleCase(id)).join(', ')
  const matPills = mats.map(mat => `<span class="pill ${mat.ok || isGmMode() ? 'good' : 'bad'}">${esc(mat.name)} ${mat.have}/${mat.need}</span>`).join('')
  const starred = (character.starredRecipeIds || []).includes(recipe.id)
  return `
    <article class="item-card">
      <div class="item-title">
        <strong>${fallbackIcon(recipe)} ${esc(recipe.name)}</strong>
        <span class="pill">${esc(recipe.tier || recipe.rarity || 'craft')}</span>
        <button type="button" class="ghost-btn tiny item-star-btn" data-toggle-recipe-star="${esc(recipe.id)}" aria-label="Star recipe">${starred ? '⭐' : '☆'}</button>
      </div>
      <div class="item-meta">${esc(displaySubcategory(recipe.profession || 'career'))} · ${esc(recipe.type || 'item')}</div>
      <p class="subtle">${esc(recipe.desc || 'No description provided.')}</p>
      <div class="wrap detail-pills">
        <span class="pill">Requires: ${esc(skillLabels || '—')}</span>
        ${(recipe.tags || []).map(tag => `<span class="pill subtle-pill">${esc(tag)}</span>`).join('')}
        ${matPills || '<span class="pill">No materials</span>'}
      </div>
      <div class="skill-actions">
        <span class="pill ${check.ok ? 'good' : 'warn'}">${esc(check.reason)}</span>
        <span class="wrap compact-actions">
          ${isGmMode() ? `<button type="button" class="ghost-btn tiny" data-grant-craft-recipe="${esc(recipe.id)}">Grant</button>` : ''}
          <button type="button" class="primary-btn tiny" data-craft-recipe="${esc(recipe.id)}" ${check.ok ? '' : 'disabled'}>Craft</button>
        </span>
      </div>
    </article>
  `
}

function renderItemCard(item, character = activeCharacter()) {
  const price = itemPriceGil(item)
  const gmFree = isGmMode()
  const purchase = shopPurchaseCheck(character, item, { free: gmFree })
  const shopLocked = isShopPurchaseItem(item) && !gmFree && character && computeSkillLevel(character).skillLevel < shopMinLevelForItem(item)
  const canBuy = isShopPurchaseItem(item) || gmFree
  const affordLocked = isShopPurchaseItem(item) && !gmFree && character && itemPriceGil(item) > normalizeGil(character.gil)
  const presentation = resolveItemPresentation(item, null)
  const starred = (state.starredCatalogItemIds || []).includes(item.id)
  const statPills = Object.entries(item.statModifiers || {}).map(([stat, value]) => `<span class="pill ${value >= 0 ? 'good' : 'bad'}">${titleCase(stat)} ${value >= 0 ? '+' : ''}${value}</span>`).join('')
  const effectPills = (item.specialEffects || []).slice(0, 3).map(effect => `<span class="pill warn">${titleCase(effect)}</span>`).join('')
  const handsLabel = weaponHandednessLabel(item)
  const offhandLabel = offhandTypeLabel(item)
  const levelPill = isShopPurchaseItem(item) && !gmFree
    ? `<span class="pill ${shopLocked ? 'warn' : 'good'}">${shopLocked ? `SL ${shopMinLevelForItem(item)}+` : 'Unlocked'}</span>`
    : ''
  const craftPill = item.source === 'profession' && !gmFree
    ? '<span class="pill">Craft only</span>'
    : ''
  const homebrewPill = item.source === 'homebrew'
    ? `<span class="pill warn">${item.listInShop && price ? 'Homebrew · Shop' : 'Homebrew · Grant only'}</span>`
    : ''
  const affordPill = affordLocked
    ? '<span class="pill warn">Too expensive</span>'
    : ''
  const cursedBadge = renderCursedBadgeHtml(presentation)
  const cursedNameClass = itemCursedNameClass(presentation)
  return `
    <article class="item-card ${itemCardClass(presentation, '')}" data-tooltip="${esc(itemTooltip(item, character))}" tabindex="0">
      <div class="item-title">
        <strong class="${cursedNameClass}">${fallbackIcon(item)} ${esc(presentation.displayName)}</strong>
        ${cursedBadge}
        <span class="pill">${esc(item.rarity || 'common')}</span>
        <button type="button" class="ghost-btn tiny item-star-btn" data-toggle-catalog-star="${esc(item.id)}" aria-label="Star item">${starred ? '⭐' : '☆'}</button>
      </div>
      <div class="item-meta">${esc(item.type || 'item')} · ${esc(item.source || 'shop')}${item.damage ? ` · ${esc(item.damage)}` : ''}${handsLabel ? ` · ${esc(handsLabel)}` : ''}${offhandLabel ? ` · ${esc(offhandLabel)}` : ''}</div>
      <p class="subtle">${esc(presentation.displayDesc || 'No description provided.')}</p>
      <div class="wrap detail-pills">
        ${statPills || '<span class="pill">No stat modifiers</span>'}
        ${effectPills}
        ${levelPill}
        ${craftPill}
        ${homebrewPill}
        ${affordPill}
        ${(item.tags || []).map(tag => `<span class="pill subtle-pill">${esc(tag)}</span>`).join('')}
        ${Number(item.enchantmentSlots || 0) ? `<span class="pill good">${item.enchantmentSlots} enchant slot${Number(item.enchantmentSlots) === 1 ? '' : 's'}</span>` : ''}
      </div>
      <div class="skill-actions">
        <span class="pill gold">${gmFree ? 'Free (GM)' : price ? formatCurrency(price) : 'Free/loot'}</span>
        <span class="wrap compact-actions">
          <button type="button" class="ghost-btn tiny" data-grant-item="${esc(item.id)}">Grant</button>
          ${canBuy ? `<button type="button" class="primary-btn tiny" data-buy-item="${esc(item.id)}" ${purchase.ok ? '' : 'disabled'}>${gmFree ? 'Take' : 'Buy'}</button>` : ''}
        </span>
      </div>
    </article>
  `
}

function gmPanel(title, body, { kicker = '', open = false, extraClass = '' } = {}) {
  return `
    <details class="gm-panel card ${extraClass}"${open ? ' open' : ''}>
      <summary class="gm-panel-summary">
        ${kicker ? `<span class="kicker">${kicker}</span>` : ''}
        <span class="gm-panel-title">${title}</span>
      </summary>
      <div class="gm-panel-body">${body}</div>
    </details>
  `
}

function renderPremadeBrowser({ avgCombatPower = 0, avgSkillLevel = 0, avgThreatLevel = 0, partyCount = 0 } = {}) {
  const list = filterPremadeCharacters({
    search: state.gmPremadeSearch,
    category: state.gmPremadeCategory,
    sort: state.gmPremadeSort
  })
  const pageData = paginatePremadeList(list)
  const categories = premadeCategories()
  const sortOptions = PREMADE_SORT_OPTIONS
  const rosterCount = state.characters.length

  return `
    <section class="card">
      <div class="gm-strip">
        <div class="gm-strip-copy">
          <div class="kicker">Premade Characters</div>
          <h3>NPCs, Monsters & Pedestrians</h3>
        </div>
        <span class="pill good">${pageData.total} templates</span>
      </div>
      <div class="toolbar mt-12">
        <input class="input" id="gm-premade-search" placeholder="Search..." value="${esc(state.gmPremadeSearch)}" />
        <select class="input" id="gm-premade-sort" aria-label="Sort premade characters">
          ${sortOptions.map(([value, label]) => `<option value="${esc(value)}" ${state.gmPremadeSort === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}
        </select>
        <select class="input" id="gm-premade-page-size" aria-label="Premades per page">
          ${PREMADE_PAGE_SIZES.map(size => `<option value="${size}" ${pageData.pageSize === size ? 'selected' : ''}>${size}/page</option>`).join('')}
        </select>
        <select class="input" id="gm-spawn-folder" aria-label="Folder for spawned characters">
          <option value="">Spawn to: Unfiled</option>
          ${listCharacterFolders(state).map(name => `
            <option value="${esc(name)}" ${state.gmSpawnFolder === name ? 'selected' : ''}>Spawn to: ${esc(name)}</option>
          `).join('')}
        </select>
      </div>
      <div class="segmented mt-12">${categories.map(category => `
        <button type="button" data-gm-premade-category="${esc(category)}" class="${category === state.gmPremadeCategory ? 'active' : ''}">${titleCase(category)}</button>
      `).join('')}</div>
      <div class="catalogue-summary mt-12">
        <span class="pill">${rosterCount} in roster</span>
        <span class="pill">Page ${pageData.page + 1}/${pageData.totalPages}</span>
        <button type="button" class="ghost-btn tiny" data-gm-premade-page-prev ${pageData.page <= 0 ? 'disabled' : ''}>Prev</button>
        <button type="button" class="ghost-btn tiny" data-gm-premade-page-next ${pageData.page >= pageData.totalPages - 1 ? 'disabled' : ''}>Next</button>
      </div>
      <div class="premade-grid mt-12">
        ${pageData.items.map(({ entry, threat }) => {
          const inRoster = countPremadeInRoster(entry.premadeId)
          const race = getRace(entry.race)
          const skillCount = Array.isArray(entry.skills) ? entry.skills.length : 0
          const threatInfo = premadeTemplateThreatLevel(entry)
          const difficulty = partyCount
            ? computeEncounterDifficulty({ partyAvgThreatLevel: avgThreatLevel || (avgSkillLevel + avgCombatPower), partyAvgCombatPower: avgCombatPower, partyAvgSkillLevel: avgSkillLevel, partyCount, enemyThreatLevel: threat, enemyCount: 1, soloBossCapable: threatInfo.soloBossCapable })
            : null
          const inEncounter = state.encounterEnemies.find(e =>
            e.source === 'premade' ? e.premadeId === entry.premadeId : false
          )
          const notes = entry.notes || ''
          return `
            <article class="premade-card">
              <div class="premade-card-top">
                <strong>${esc(race?.icon || '👤')} ${esc(entry.name)}</strong>
                <span class="pill level-pill" data-tooltip="${esc(threatLevelTooltip(threatInfo))}" tabindex="0">TL ${threat}</span>
              </div>
              <div class="wrap">
                <span class="pill">${esc(entry.category || 'npc')}</span>
                <span class="pill subtle-pill">${skillCount} sk</span>
                ${entry.lumens > 0 ? `<span class="pill gold">${entry.lumens}L</span>` : ''}
                ${entry.gil > 0 ? `<span class="pill">${formatCurrency(entry.gil)}</span>` : ''}
                ${difficulty ? `<span class="pill ${difficultyPillClass(difficulty.index)}">${esc(difficulty.label)}</span>` : ''}
                ${inRoster ? `<span class="pill good">×${inRoster}</span>` : ''}
                ${inEncounter ? `<span class="pill good">enc ${inEncounter.count}</span>` : ''}
              </div>
              ${notes ? `<p class="subtle premade-card-notes" title="${esc(notes)}">${esc(notes)}</p>` : ''}
              <div class="skill-actions premade-spawn-row">
                <label class="premade-count-label">
                  <span class="field-label">Qty</span>
                  <input type="number" class="input tiny premade-count-input" min="1" max="10" value="1" data-premade-count-for="${esc(entry.premadeId)}" aria-label="How many ${esc(entry.name)} to add" />
                </label>
                <button type="button" class="primary-btn tiny" data-spawn-premade="${esc(entry.premadeId)}">Roster</button>
                <button type="button" class="ghost-btn tiny" data-add-encounter-enemy="${esc(entry.premadeId)}">Encounter</button>
              </div>
            </article>
          `
        }).join('') || '<div class="empty">No premade characters matched your search.</div>'}
      </div>
    </section>
  `
}

function renderNpcTurnSuggestionCard(result) {
  const skillsHtml = result.suggestions.length
    ? result.suggestions.map((skill, index) => `
        <div class="npc-turn-skill">
          ${result.suggestions.length > 1 ? `<span class="subtle">${index + 1}.</span>` : ''}
          <strong>${esc(skill.name)}</strong>
          <span class="subtle">· ${skill.cost} stamina</span>
          ${skill.blocked ? `<span class="pill warn tiny-pill">${esc(skill.blocked)}</span>` : ''}
        </div>
      `).join('')
    : '<div class="subtle">No activatable attacks on action bar.</div>'

  return `
    <article class="npc-turn-result ${result.hasMultiattack ? 'has-multiattack' : ''}">
      <div class="npc-turn-result-head">
        <strong>${esc(result.characterName)}</strong>
        <span class="subtle">HP ${esc(result.hp)} · STA ${esc(result.stamina)}</span>
      </div>
      ${result.hasMultiattack ? '<span class="pill subtle-pill tiny-pill">Multiattack</span>' : ''}
      ${skillsHtml}
    </article>
  `
}

function combatFolderOptions() {
  return folderFilterOptions(state).filter(opt => opt.value !== FOLDER_FILTER_ALL)
}

function resolveCombatFolderKey(savedKey) {
  const options = combatFolderOptions()
  if (savedKey && options.some(opt => opt.value === savedKey)) return savedKey
  return options[0]?.value || ''
}

function renderCombatFolderPicker({ selectId, buttonDataKey, buttonLabel, selectedValue }) {
  if (!state.characters.length) return ''

  const options = combatFolderOptions()
  const selected = resolveCombatFolderKey(selectedValue)
  return `
    <div class="initiative-folder-picker wrap mt-10">
      <select class="input" id="${selectId}" aria-label="Roster folder">
        ${options.map(opt => `<option value="${esc(opt.value)}" ${opt.value === selected ? 'selected' : ''}>${esc(opt.label)}</option>`).join('')}
      </select>
      <button type="button" class="ghost-btn tiny" data-${buttonDataKey}>${esc(buttonLabel)}</button>
    </div>
  `
}

function renderInitiativeFolderPicker() {
  return renderCombatFolderPicker({
    selectId: 'initiative-folder-select',
    buttonDataKey: 'add-initiative-from-folder',
    buttonLabel: 'Add from folder',
    selectedValue: resolveCombatFolderKey(state.gmNpcTurnFolder)
  })
}

function renderGmNpcTurnPanel() {
  const roster = state.characters
  const selectedIds = new Set(state.gmNpcTurnCharacterIds)
  const folderKey = resolveCombatFolderKey(state.gmNpcTurnFolder)
  const folderCharacters = filterCharactersByFolder(roster, folderKey)
  const results = state.lastNpcTurns || []
  const suggestionHtml = results.length
    ? `<div class="npc-turn-results">${results.map(renderNpcTurnSuggestionCard).join('')}</div>`
    : ''

  const checkGrid = folderCharacters.length
    ? folderCharacters.map(character => `
        <label class="gm-check-row">
          <input type="checkbox" data-gm-turn-character="${esc(character.id)}" ${selectedIds.has(character.id) ? 'checked' : ''} />
          <span>${esc(character.name)}</span>
        </label>
      `).join('')
    : '<p class="subtle">No characters in this folder.</p>'

  return gmPanel('NPC Turn Suggestions', `
      <div class="gm-turn-picker">
        <div class="section-title-row">
          <span class="field-label">Characters</span>
          <button type="button" class="ghost-btn tiny" data-clear-gm-turn ${selectedIds.size ? '' : 'disabled'}>Clear</button>
        </div>
        ${renderCombatFolderPicker({
          selectId: 'gm-turn-folder-select',
          buttonDataKey: 'select-gm-turn-from-folder',
          buttonLabel: 'Select folder',
          selectedValue: folderKey
        })}
        <div class="gm-check-grid mt-10">${checkGrid}</div>
      </div>
      <div class="wrap mt-12">
        <button type="button" class="primary-btn tiny" data-generate-npc-turn ${roster.length ? '' : 'disabled'}>Suggest Turn${selectedIds.size > 1 ? 's' : ''}</button>
        ${selectedIds.size ? `<span class="pill">${selectedIds.size} selected</span>` : '<span class="subtle">Uses active character if none picked</span>'}
      </div>
      ${suggestionHtml ? `<div class="mt-12">${suggestionHtml}</div>` : ''}
    `, { kicker: 'Combat Helper' })
}

function renderGmInitiativeTracker() {
  const { entries, activeEntryId } = state.initiativeTracker
  const sorted = sortInitiativeEntries(entries)
  const active = activeInitiativeEntry(entries, activeEntryId)

  const sortedList = sorted.length
    ? `<ol class="initiative-order-list">
        ${sorted.map((entry, index) => {
          const isActive = entry.id === active?.id
          const initLabel = entry.initiative === '' || entry.initiative == null ? '—' : entry.initiative
          return `
            <li class="initiative-order-item ${isActive ? 'is-active-turn' : ''}">
              <button type="button" class="initiative-turn-btn ${isActive ? 'active' : ''}" data-set-initiative-active="${esc(entry.id)}" title="Set as current turn">
                <span class="initiative-rank">${index + 1}</span>
                <span class="initiative-name">${esc(entry.name || 'Unnamed')}</span>
                <span class="initiative-score">${esc(String(initLabel))}</span>
              </button>
            </li>
          `
        }).join('')}
      </ol>`
    : '<p class="subtle">Add combatants and enter initiative.</p>'

  const editorRows = sorted.length
    ? sorted.map((entry, index) => `
        <div class="initiative-edit-row">
          <span class="initiative-edit-rank" aria-hidden="true">${index + 1}</span>
          <input class="input" type="text" value="${esc(entry.name)}" data-initiative-name="${esc(entry.id)}" placeholder="Name" aria-label="Initiative name for ${esc(entry.name || 'entry')}" />
          <input class="input initiative-value-input" type="number" value="${entry.initiative === '' || entry.initiative == null ? '' : entry.initiative}" data-initiative-value="${esc(entry.id)}" placeholder="Init" aria-label="Initiative value for ${esc(entry.name || 'entry')}" />
          <button type="button" class="ghost-btn tiny" data-remove-initiative="${esc(entry.id)}" aria-label="Remove ${esc(entry.name || 'entry')}">×</button>
        </div>
      `).join('')
    : ''

  const activeBanner = active
    ? `<p class="gm-active-turn pill warn">Now: <strong>${esc(active.name || 'Unnamed')}</strong> · init ${active.initiative === '' || active.initiative == null ? '—' : active.initiative}</p>`
    : ''

  return gmPanel('Initiative Tracker', `
      ${activeBanner}
      <div class="initiative-layout">
        <div class="initiative-sorted">
          <div class="section-title-row">
            <span class="field-label">Turn order</span>
          </div>
          ${sortedList}
        </div>
        <div class="initiative-editor">
          <div class="section-title-row">
            <span class="field-label">Combatants</span>
            <div class="wrap compact-actions">
              <button type="button" class="ghost-btn tiny" data-add-initiative-entry>Blank</button>
              <button type="button" class="ghost-btn tiny" data-add-roster-initiative ${state.characters.length ? '' : 'disabled'}>All</button>
            </div>
          </div>
          ${renderInitiativeFolderPicker()}
          <div class="initiative-edit-rows">${editorRows || '<p class="subtle">Add from folder, all roster, or blank.</p>'}</div>
        </div>
      </div>
      <div class="wrap mt-12">
        <button type="button" class="primary-btn tiny" data-initiative-next ${entries.length ? '' : 'disabled'}>Next</button>
        <button type="button" class="ghost-btn tiny" data-initiative-reset-round ${entries.length ? '' : 'disabled'}>Reset round</button>
        <button type="button" class="ghost-btn tiny" data-clear-initiative ${entries.length ? '' : 'disabled'}>Clear</button>
      </div>
    `, { kicker: 'Combat Helper', open: true })
}

function renderGmBuilderAffinitySection(draft) {
  const view = getBuilderAffinityView(draft)
  const pill = (row, kind) => `
    <span class="pill gm-affinity-pill ${kind === 'weaknesses' ? 'bad' : 'good'}">
      ${esc(row.icon)} ${esc(row.label)}
      <button type="button" class="gm-affinity-remove" data-gm-monster-affinity-remove="${esc(kind)}:${esc(row.id)}" aria-label="Remove ${esc(row.label)}">×</button>
    </span>`

  return `
    <section class="card gm-builder-affinity mt-12">
      <div class="kicker">Elemental resist &amp; weak</div>
      <p class="subtle">From type and specials, plus your tweaks. Shown at 50% resist / 200% weak on the sheet.</p>
      <div class="mt-12">
        <div class="field-label">Resistances</div>
        <div class="wrap gm-builder-affinity-list">
          ${view.resistances.length ? view.resistances.map(row => pill(row, 'resistances')).join('') : '<span class="subtle">None</span>'}
        </div>
      </div>
      <div class="mt-12">
        <div class="field-label">Weaknesses</div>
        <div class="wrap gm-builder-affinity-list">
          ${view.weaknesses.length ? view.weaknesses.map(row => pill(row, 'weaknesses')).join('') : '<span class="subtle">None</span>'}
        </div>
      </div>
      <div class="toolbar mt-12 gm-builder-affinity-add">
        <select class="input" id="gm-builder-affinity-element" aria-label="Element">
          ${ELEMENTS.map(element => `<option value="${esc(element.id)}">${esc(element.icon)} ${esc(element.label)}</option>`).join('')}
        </select>
        <button type="button" class="ghost-btn tiny" data-gm-monster-add-resist>+ Resist</button>
        <button type="button" class="ghost-btn tiny" data-gm-monster-add-weak>+ Weak</button>
      </div>
    </section>`
}

function renderGmBuilderCustomEntries(draft) {
  const actions = draft.customActions || []
  const traits = draft.customTraits || []
  if (!actions.length && !traits.length) return ''

  const row = (text, removeAttr, index) => `
    <li class="gm-builder-custom-row">
      <span class="subtle">${esc(text)}</span>
      <button type="button" class="danger-btn tiny" ${removeAttr}="${index}" aria-label="Remove">Remove</button>
    </li>`

  return `
    <section class="card gm-builder-custom mt-12">
      <div class="kicker">Custom table text</div>
      <p class="subtle">Saved into creature notes when you generate preview or save.</p>
      ${actions.length ? `
        <div class="mt-12">
          <div class="field-label">Actions</div>
          <ul class="gm-builder-custom-list">
            ${actions.map((text, i) => row(text, 'data-gm-monster-custom-action-remove', i)).join('')}
          </ul>
        </div>
      ` : ''}
      ${traits.length ? `
        <div class="mt-12">
          <div class="field-label">Traits</div>
          <ul class="gm-builder-custom-list">
            ${traits.map((text, i) => row(text, 'data-gm-monster-custom-trait-remove', i)).join('')}
          </ul>
        </div>
      ` : ''}
    </section>`
}

function renderGmMonsterBuilder() {
  const draft = state.gmMonsterBuilderDraft
  const types = listBuilderTypeOptions(draft.category)
  const roles = listBuilderRoleOptions()
  const presets = listBuilderThreatPresets()
  const specials = listBuilderSpecialOptions()
  const preview = draft.previewCharacter
  const summary = preview ? buildMonsterPreviewSummary(preview) : null
  const suggestedName = suggestMonsterName(draft)

  const statGrid = summary ? ['hp', 'stamina', 'strength', 'magicPower', 'accuracy', 'speed', 'physicalDefence', 'magicalDefence']
    .map(key => {
      const rule = STAT_RULES[key]
      const value = summary.stats[key]
      return `<span class="pill">${esc(rule?.label || titleCase(key))} ${value}</span>`
    }).join('') : ''

  return gmPanel('Monster / NPC Builder', `
    <p class="subtle">Stack templates into a real character — preview TL/CP/SL, then save to roster or encounter.</p>
    <div class="toolbar mt-12">
      <input class="input" id="gm-builder-name" placeholder="Name (optional)" value="${esc(draft.name)}" aria-label="Creature name" />
      <div class="segmented gm-builder-category">
        <button type="button" data-gm-builder-category="monster" class="${draft.category === 'monster' ? 'active' : ''}">Monster</button>
        <button type="button" data-gm-builder-category="npc" class="${draft.category === 'npc' ? 'active' : ''}">NPC</button>
      </div>
    </div>
    <div class="grid three mt-12">
      <label class="field-label">Creature type
        <select class="input" id="gm-builder-type" aria-label="Creature type">
          ${types.map(row => `<option value="${esc(row.id)}" ${draft.typeId === row.id ? 'selected' : ''}>${esc(row.icon || '')} ${esc(row.name)}</option>`).join('')}
        </select>
      </label>
      <label class="field-label">Combat role
        <select class="input" id="gm-builder-role" aria-label="Combat role">
          ${roles.map(row => `<option value="${esc(row.id)}" ${draft.roleId === row.id ? 'selected' : ''}>${esc(row.icon || '')} ${esc(row.name)}</option>`).join('')}
        </select>
      </label>
      <label class="field-label">Threat preset
        <select class="input" id="gm-builder-threat" aria-label="Threat preset">
          ${presets.map(row => `<option value="${esc(row.id)}" ${draft.threatPresetId === row.id ? 'selected' : ''}>${esc(row.label)} (TL ${row.min}–${row.max})</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="mt-12">
      <div class="field-label">Specials</div>
      <div class="wrap gm-builder-specials">
        ${specials.map(row => {
          const active = (draft.specialIds || []).includes(row.id)
          return `<button type="button" class="pill gm-special-chip ${active ? 'good' : ''}" data-gm-builder-special="${esc(row.id)}">${esc(row.icon || '✦')} ${esc(row.name)}</button>`
        }).join('')}
      </div>
    </div>
    ${renderGmBuilderAffinitySection(draft)}
    ${renderGmBuilderCustomEntries(draft)}
    ${summary ? `
      <section class="card gm-builder-preview mt-12">
        <div class="gm-strip">
          <div class="gm-strip-copy">
            <strong>${esc(summary.name)}</strong>
            <span class="subtle">${esc(suggestedName !== summary.name ? `Suggested: ${suggestedName}` : '')}</span>
          </div>
          <div class="wrap">
            <span class="pill level-pill">TL ${summary.threatLevel}${summary.targetThreatLevel ? ` / ${summary.targetThreatLevel}` : ''}</span>
            <span class="pill warn">CP ${summary.combatPower}</span>
            <span class="pill good">SL ${summary.skillLevel}</span>
          </div>
        </div>
        <div class="wrap mt-12">${statGrid}</div>
        ${summary.traits.length ? `<div class="wrap mt-12">${summary.traits.map(t => `<span class="pill subtle-pill">${esc(t)}</span>`).join('')}</div>` : ''}
        ${summary.customActions?.length ? `<p class="subtle mt-12">Actions: ${summary.customActions.map(a => esc(a)).join(' · ')}</p>` : ''}
        ${summary.skillNames.length ? `<p class="subtle mt-12">${summary.skillNames.length} skills: ${esc(summary.skillNames.slice(0, 8).join(', '))}${summary.skillNames.length > 8 ? '…' : ''}</p>` : ''}
        ${summary.behaviour ? `<p class="subtle mt-12">${esc(summary.behaviour)}</p>` : ''}
      </section>
    ` : '<p class="subtle mt-12">Generate a preview to see stats and skills.</p>'}
    <div class="wrap mt-12 gm-builder-actions">
      <button type="button" class="primary-btn tiny" data-generate-gm-monster>Generate Preview</button>
      <button type="button" class="ghost-btn tiny" data-randomise-gm-monster>Randomise</button>
      <button type="button" class="primary-btn tiny" data-save-gm-monster ${summary ? '' : 'disabled'}>Save to Roster</button>
      <button type="button" class="ghost-btn tiny" data-save-gm-monster-encounter ${summary ? '' : 'disabled'}>Save + Encounter</button>
      <button type="button" class="ghost-btn tiny" data-reset-gm-monster>Reset</button>
      <button type="button" class="ghost-btn tiny" data-duplicate-gm-monster ${summary ? '' : 'disabled'}>Duplicate Preview</button>
      <button type="button" class="ghost-btn tiny" data-gm-monster-custom-action>Add Action</button>
      <button type="button" class="ghost-btn tiny" data-gm-monster-custom-trait>Add Trait</button>
    </div>
  `, { kicker: 'GM Builder', open: true })
}

function renderGmTab(character) {
  const gmOn = isGmMode()
  if (!gmOn) {
    return `
      <div class="gm-tools">
        <section class="card gm-strip">
          <div class="gm-strip-copy">
            <div class="kicker">GM Mode</div>
            <h3>Activate to unlock GM tools</h3>
          </div>
          <button type="button" class="primary-btn tiny" data-toggle-gm-mode>Activate GM Mode</button>
        </section>
      </div>
    `
  }

  const party = state.encounterParty
  const partyCount = party.length
  const avgSkillLevel = partyCount ? party.reduce((sum, row) => sum + row.skillLevel, 0) / partyCount : 0
  const avgCombatPower = partyCount ? party.reduce((sum, row) => sum + row.combatPower, 0) / partyCount : 0
  const avgThreatLevel = avgSkillLevel + avgCombatPower
  const totalCombatPower = party.reduce((sum, row) => sum + row.combatPower, 0)

  const rosterOptions = state.characters.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')

  const partyRows = party.length
    ? party.map(row => {
        const rowThreat = Number(row.skillLevel || 0) + Number(row.combatPower || 0)
        return `
        <div class="encounter-party-row">
          <input class="input" type="text" value="${esc(row.name)}" data-encounter-party-name="${esc(row.id)}" placeholder="Name" aria-label="Party member name" />
          <label class="encounter-inline-field"><span class="field-label">SL</span><input class="input tiny" type="number" min="0" value="${row.skillLevel}" data-encounter-party-skill="${esc(row.id)}" aria-label="Skill Level" /></label>
          <label class="encounter-inline-field"><span class="field-label">CP</span><input class="input tiny" type="number" min="0" value="${row.combatPower}" data-encounter-party-power="${esc(row.id)}" aria-label="Combat Power" /></label>
          <span class="pill subtle-pill tiny-pill" title="Threat Level = Skill Level + Combat Power">TL ${rowThreat}</span>
          <button type="button" class="ghost-btn tiny" data-remove-encounter-party="${esc(row.id)}" aria-label="Remove ${esc(row.name)}">×</button>
        </div>
      `
      }).join('')
    : '<p class="subtle">Add party members to see averages.</p>'

  const enemyGroups = resolveEncounterEnemyGroups(state.encounterEnemies)

  const encounterSummary = enemyGroups.length
    ? summarizeEncounter({ partyAvgThreatLevel: avgThreatLevel, partyAvgCombatPower: avgCombatPower, partyAvgSkillLevel: avgSkillLevel, partyCount, enemyGroups })
    : null

  const encounterWarnings = enemyGroups.length
    ? generateEncounterWarnings({ partyAvgThreatLevel: avgThreatLevel, partyAvgCombatPower: avgCombatPower, partyAvgSkillLevel: avgSkillLevel, partyCount, enemyGroups })
    : []

  const encounterRows = enemyGroups.length
    ? enemyGroups.map(group => {
        const row = state.encounterEnemies.find(r => r.id === group.id)
        const manual = row?.source === 'manual'
        return `
        <div class="encounter-enemy-row">
          ${manual
            ? `<input class="input" type="text" value="${esc(group.name)}" data-encounter-enemy-name="${esc(group.id)}" placeholder="Name" aria-label="Enemy name" />
               <label class="encounter-inline-field"><span class="field-label">TL</span><input class="input tiny" type="number" min="1" max="50" value="${group.threatLevel}" data-encounter-enemy-threat="${esc(group.id)}" aria-label="Threat level" /></label>`
            : `<span class="encounter-enemy-name">${esc(group.name)} <span class="subtle">TL ${group.threatLevel}</span>${group.source === 'character' ? ' <span class="pill subtle-pill tiny-pill">roster</span>' : ''}</span>`}
          <div class="number-stepper number-stepper-tiny">
            <button type="button" class="number-stepper-btn" data-number-stepper-delta="-1" aria-label="Decrease quantity of ${esc(group.name)}">−</button>
            <input class="input tiny" type="number" min="1" max="50" value="${group.count}" data-encounter-enemy-count="${esc(group.id)}" aria-label="Quantity of ${esc(group.name)}" />
            <button type="button" class="number-stepper-btn" data-number-stepper-delta="1" aria-label="Increase quantity of ${esc(group.name)}">+</button>
          </div>
          <button type="button" class="ghost-btn tiny" data-focus-encounter-enemy="${esc(group.id)}">Guide</button>
          <button type="button" class="ghost-btn tiny" data-remove-encounter-enemy="${esc(group.id)}" aria-label="Remove ${esc(group.name)}">×</button>
        </div>
      `
      }).join('')
    : '<p class="subtle">Add enemies from templates below or from saved roster characters.</p>'

  const focusId = state.encounterQuantityFocusId || enemyGroups[0]?.id || ''
  const focusGroup = enemyGroups.find(group => group.id === focusId) || null
  const quantityTable = focusGroup && partyCount
    ? suggestEnemyQuantities({ partyAvgThreatLevel: avgThreatLevel, partyAvgCombatPower: avgCombatPower, partyAvgSkillLevel: avgSkillLevel, partyCount, enemyThreatLevel: focusGroup.threatLevel, soloBossCapable: focusGroup.soloBossCapable, maxQty: 10 })
    : []

  return `
    <div class="gm-tools">
    <div class="gm-tools-bar grid two">
      <section class="card gm-mode-card-active gm-strip">
        <div class="gm-strip-copy">
          <div class="kicker">GM Mode</div>
          <h3>Active</h3>
        </div>
        <button type="button" class="danger-btn tiny" data-toggle-gm-mode>Deactivate</button>
      </section>

      <section class="card gm-strip">
        <div class="gm-strip-copy">
          <div class="kicker">Save</div>
          <h3>Utilities</h3>
        </div>
        <div class="wrap gm-save-actions">
          <button type="button" class="ghost-btn tiny" data-export-character ${character ? '' : 'disabled'}>Export PC</button>
          <button type="button" class="ghost-btn tiny" data-print-character-sheet ${character ? '' : 'disabled'}>Print</button>
          <button type="button" class="ghost-btn tiny" data-export-all-bottom>Export Save</button>
          <button type="button" class="danger-btn tiny" data-delete-active ${character ? '' : 'disabled'}>Delete PC</button>
        </div>
      </section>
    </div>

    ${renderGmMonsterBuilder()}

    <section class="card gm-saving-roll-card">
      <div class="kicker">Quick reference</div>
      <h3>Saving Rolls</h3>
      <p class="subtle mt-8">1d20, meet or beat. Call the difficulty out loud.</p>
      <div class="gm-save-ladder wrap mt-10">
        <span class="pill">Super Easy 3</span>
        <span class="pill">Easy 8</span>
        <span class="pill">Normal 11</span>
        <span class="pill">Hard 14</span>
        <span class="pill">Extreme 17</span>
      </div>
      <p class="subtle mt-10">Modifiers: Advantage / Disadvantage, a fitting high stat, or ±1–2 from gear, footing, weather, or help. Accuracy attacks are not Saving Rolls. Knocked Out Recovery stays 11+.</p>
    </section>

    ${renderGmInitiativeTracker()}

    ${renderGmNpcTurnPanel()}

    <div class="grid two gm-encounter-grid">
      <section class="card">
        <div class="kicker">Encounter Balancer</div>
        <h3>Party</h3>
        <div class="toolbar mt-12">
          <select class="input" id="encounter-roster-select" aria-label="Pick a roster character to add">
            <option value="">Pick roster PC…</option>
            ${rosterOptions}
          </select>
          <button type="button" class="ghost-btn tiny" data-add-encounter-roster ${state.characters.length ? '' : 'disabled'}>+ Roster</button>
          <button type="button" class="ghost-btn tiny" data-add-encounter-manual>+ Row</button>
          ${party.length ? '<button type="button" class="ghost-btn tiny" data-clear-encounter-party>Clear</button>' : ''}
        </div>
        <div class="stack mt-12">${partyRows}</div>
        <div class="wrap mt-12">
          <span class="pill">${partyCount} PC${partyCount === 1 ? '' : 's'}</span>
          <span class="pill good">SL ${formatOneDecimal(avgSkillLevel)}</span>
          <span class="pill warn">CP ${formatOneDecimal(avgCombatPower)}</span>
          <span class="pill level-pill">TL ${formatOneDecimal(avgThreatLevel)}</span>
          <span class="pill gold">ΣCP ${formatOneDecimal(totalCombatPower)}</span>
        </div>
      </section>

      <section class="card">
        <div class="kicker">Encounter</div>
        <h3>Enemies</h3>
        <div class="toolbar mt-12">
          <select class="input" id="encounter-enemy-roster-select" aria-label="Pick a roster character to add as enemy">
            <option value="">Pick roster NPC/monster…</option>
            ${rosterOptions}
          </select>
          <button type="button" class="ghost-btn tiny" data-add-encounter-enemy-roster ${state.characters.length ? '' : 'disabled'}>+ Roster</button>
          <button type="button" class="ghost-btn tiny" data-add-encounter-enemy-manual>+ Manual</button>
        </div>
        <div class="stack mt-12">${encounterRows}</div>
        ${encounterSummary ? `
          <div class="wrap mt-12">
            <span class="pill">${encounterSummary.totalEnemyCount} foe${encounterSummary.totalEnemyCount === 1 ? '' : 's'}</span>
            <span class="pill warn">Enemy TL Σ ${formatOneDecimal(encounterSummary.totalEnemyThreat)}</span>
            <span class="pill level-pill">Party TL ${formatOneDecimal(avgThreatLevel)}</span>
            <span class="pill ${difficultyPillClass(encounterSummary.index)}">${esc(encounterSummary.label)}</span>
          </div>
        ` : ''}
        ${encounterWarnings.length ? `
          <div class="gm-warning-list">
            ${encounterWarnings.map(warning => `<div>${esc(warning)}</div>`).join('')}
          </div>
        ` : ''}
        ${enemyGroups.length ? `
          <div class="wrap mt-12">
            <button type="button" class="primary-btn tiny" data-start-active-encounter>Start Encounter</button>
            <button type="button" class="ghost-btn tiny mt-12" data-clear-encounter-enemies>Clear encounter</button>
          </div>
        ` : ''}
      </section>
    </div>

    ${renderActiveEncounterPanel()}

    ${focusGroup && quantityTable.length ? gmPanel(`Qty guide — ${esc(focusGroup.name)}`, `
        <p class="subtle">Party: ${partyCount} PC${partyCount === 1 ? '' : 's'}, avg TL ${formatOneDecimal(avgThreatLevel)} (SL ${formatOneDecimal(avgSkillLevel)} + CP ${formatOneDecimal(avgCombatPower)})</p>
        <div class="encounter-quantity-table gm-quantity-scroll">
          <div class="encounter-quantity-row encounter-quantity-header">
            <span>Qty</span><span>Difficulty</span>
          </div>
          ${quantityTable.map(row => `
            <div class="encounter-quantity-row">
              <span>${row.enemyCount}</span>
              <span class="pill ${difficultyPillClass(row.index)}">${esc(row.label)}</span>
            </div>
          `).join('')}
        </div>
      `, { kicker: 'Balancer' }) : ''}

    ${renderPremadeBrowser({ avgCombatPower, avgSkillLevel, avgThreatLevel, partyCount })}
    </div>
  `
}

function renderActiveEncounterPanel() {
  const enc = state.activeEncounter
  if (!enc) {
    return `
      <section class="card mt-16">
        <div class="kicker">Live Encounter</div>
        <h3>No active encounter</h3>
        <p class="subtle">Use Start Encounter on the balancer to spawn temporary combatant copies.</p>
      </section>
    `
  }
  const filter = state.encounterCombatantFilter || 'all'
  const search = String(state.encounterCombatantSearch || '').toLowerCase()
  let list = enc.combatants || []
  if (filter === 'defeated') list = list.filter(c => c.defeated || c.hp <= 0 || c.dead)
  else if (filter === 'active') list = list.filter(c => !(c.defeated || c.hp <= 0 || c.dead))
  if (search) list = list.filter(c => String(c.name || '').toLowerCase().includes(search))

  const cards = list.map(c => {
    const stats = computeStats(c)
    const expanded = Boolean(state.encounterExpandedIds?.[c.id])
    const isActive = enc.activeCombatantId === c.id
    const defeated = c.defeated || c.hp <= 0 || c.dead
    const generated = c.encounterSource?.generated ? '<span class="pill subtle-pill">generated</span>' : ''
    const skillsHtml = expanded
      ? (c.skills || []).slice(0, 20).map(id => {
          const skill = getSkill(id)
          if (!skill) return ''
          return `<div class="wrap mt-8"><span>${esc(skill.name)}</span>
            <button type="button" class="ghost-btn tiny" data-encounter-use-skill="${esc(c.id)}" data-skill-id="${esc(skill.id)}">Use</button></div>`
        }).join('') || '<p class="subtle">No skills.</p>'
      : ''
    return `
      <article class="card encounter-combatant-card ${defeated ? 'defeated' : ''} ${isActive ? 'is-active-turn' : ''}">
        <div class="card-header">
          <div>
            <strong>${esc(c.name)}</strong> ${generated}
            ${defeated ? '<span class="pill bad">Defeated</span>' : ''}
            ${isActive ? '<span class="pill good">Active</span>' : ''}
          </div>
          <button type="button" class="ghost-btn tiny" data-encounter-expand="${esc(c.id)}">${expanded ? 'Collapse' : 'Expand'}</button>
        </div>
        <div class="subtle">HP ${c.hp}/${stats.hp} · STA ${c.stamina}/${stats.stamina}</div>
        <div class="wrap mt-8">
          <span class="pill">ACC ${stats.accuracy}</span>
          <span class="pill">SPD ${stats.speed}</span>
          <span class="pill">PD ${stats.physicalDefence}</span>
          <span class="pill">MD ${stats.magicalDefence}</span>
        </div>
        <div class="wrap mt-8">
          <button type="button" class="ghost-btn tiny" data-encounter-adjust-hp="${esc(c.id)}" data-amount="-1">HP−</button>
          <button type="button" class="ghost-btn tiny" data-encounter-adjust-hp="${esc(c.id)}" data-amount="1">HP+</button>
          <button type="button" class="ghost-btn tiny" data-encounter-adjust-sta="${esc(c.id)}" data-amount="-1">STA−</button>
          <button type="button" class="ghost-btn tiny" data-encounter-adjust-sta="${esc(c.id)}" data-amount="1">STA+</button>
          <button type="button" class="ghost-btn tiny" data-encounter-process-turn="${esc(c.id)}">Process Turn</button>
          <button type="button" class="ghost-btn tiny" data-encounter-toggle-defeated="${esc(c.id)}">${defeated ? 'Undefeated' : 'Mark defeated'}</button>
          <button type="button" class="ghost-btn tiny" data-encounter-duplicate="${esc(c.id)}">Duplicate</button>
          <button type="button" class="danger-btn tiny" data-encounter-remove="${esc(c.id)}">Remove</button>
        </div>
        ${expanded ? `<div class="mt-12">${skillsHtml}</div>` : ''}
      </article>
    `
  }).join('')

  return `
    <section class="card mt-16">
      <div class="kicker">Live Encounter</div>
      <h3>${esc(enc.name)} · Round ${enc.round}</h3>
      <div class="encounter-sticky-bar wrap mt-8">
        <button type="button" class="primary-btn tiny" data-start-active-encounter>Restart from balancer</button>
        <button type="button" class="ghost-btn tiny" data-encounter-next-turn>Next Turn</button>
        <button type="button" class="ghost-btn tiny" data-encounter-prev-turn>Previous Turn</button>
        <button type="button" class="ghost-btn tiny" data-encounter-advance-round>Advance Round</button>
        <button type="button" class="ghost-btn tiny" data-encounter-process-active>Process Active Enemy Turn</button>
        <button type="button" class="danger-btn tiny" data-end-active-encounter>End Encounter</button>
      </div>
      <div class="toolbar mt-8">
        <input class="input" data-encounter-search placeholder="Search combatants…" value="${esc(state.encounterCombatantSearch || '')}" />
        <div class="segmented">
          <button type="button" data-encounter-filter="all" class="${filter === 'all' ? 'active' : ''}">All</button>
          <button type="button" data-encounter-filter="active" class="${filter === 'active' ? 'active' : ''}">Active</button>
          <button type="button" data-encounter-filter="defeated" class="${filter === 'defeated' ? 'active' : ''}">Defeated</button>
        </div>
      </div>
      <div class="encounter-combatant-grid mt-12">${cards || '<p class="subtle">No combatants match.</p>'}</div>
    </section>
  `
}

function formatOneDecimal(value) {
  const rounded = Math.round(Number(value || 0) * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/** Difficulty index (0-8, Breeze..Deadly) -> pill color. Low = safe (good), mid = neutral, high = dangerous (bad). */
function difficultyPillClass(index) {
  if (index <= 2) return 'good'
  if (index <= 4) return ''
  if (index <= 6) return 'warn'
  return 'bad'
}

function renderGlossaryEntry(entry, openByDefault) {
  return `
    <details class="glossary-entry"${openByDefault ? ' open' : ''}>
      <summary class="glossary-entry-summary">
        <strong class="glossary-entry-term">${esc(entry.term)}</strong>
        <span class="subtle glossary-entry-blurb">${esc(entry.summary)}</span>
      </summary>
      <p class="glossary-entry-body">${esc(entry.detail)}</p>
    </details>
  `
}

function renderGlossarySection() {
  const query = state.glossarySearch || ''
  const entries = filterGlossaryEntries(query, cache.effectDefinitions)
  const grouped = groupGlossaryEntries(entries)
  const openByDefault = Boolean(query.trim())
  const total = getAllGlossaryEntries(cache.effectDefinitions).length
  const countLabel = query.trim()
    ? `${entries.length} match${entries.length === 1 ? '' : 'es'}`
    : `${total} terms`

  if (!entries.length) {
    return `
      <div class="glossary-results">
        <div class="empty glossary-empty">No terms match “${esc(query)}”. Try “burn”, “force”, “freeze”, “mind control”, or “incapacitated”.</div>
      </div>
    `
  }

  const sections = grouped.map(([category, items]) => `
    <section class="glossary-category">
      <h4 class="glossary-category-title">${esc(category)}</h4>
      <div class="glossary-entries">
        ${items.map(entry => renderGlossaryEntry(entry, openByDefault)).join('')}
      </div>
    </section>
  `).join('')

  return `
    <div class="glossary-meta subtle">${esc(countLabel)} · ${GLOSSARY_CATEGORIES.length} categories</div>
    <div class="glossary-results">${sections}</div>
  `
}

function renderNotesTab(character) {
  const statusLabel = state.notesDirty ? 'Unsaved changes' : 'Saved'
  const toneClass = state.notesDirty ? 'warn' : 'good'
  const activePage = resolveActiveNotePage(character)
  const pageList = (character.notePages || []).map(page => `
    <button type="button" class="note-page-btn ${activePage?.id === page.id ? 'active' : ''}" data-set-note-page="${esc(page.id)}">${esc(page.title)}</button>
  `).join('')
  const questRows = (character.quests || []).map(quest => `
    <div class="quest-row" data-quest-id="${esc(quest.id)}">
      <label class="quest-complete"><input type="checkbox" data-quest-completed="${esc(quest.id)}" ${quest.completed ? 'checked' : ''} /></label>
      <input class="input tiny quest-name" data-quest-name="${esc(quest.id)}" value="${esc(quest.name)}" placeholder="Quest name" />
      <input class="input tiny quest-giver" data-quest-giver="${esc(quest.id)}" value="${esc(quest.giver)}" placeholder="Giver" />
      <input class="input tiny quest-reward" data-quest-reward="${esc(quest.id)}" value="${esc(quest.reward)}" placeholder="Reward" />
      <button type="button" class="danger-btn tiny" data-remove-quest="${esc(quest.id)}">Delete</button>
    </div>
  `).join('')
  return `
    <div class="grid two notes-grid">
      <section class="card notes-card">
        <div class="card-header">
          <div>
            <div class="kicker">Campaign Notes</div>
            <h3>${esc(character.name)}'s Notes</h3>
            <p>Build plans, session reminders, loot lists, and anything your character should remember.</p>
          </div>
          <div class="wrap">
            <span id="notes-status" class="pill ${toneClass}">${statusLabel}</span>
            <button type="button" class="primary-btn tiny" data-save-notes-button>Save Notes</button>
          </div>
        </div>
        <div class="note-pages">
          <div class="note-pages-list">${pageList}</div>
          <button type="button" class="ghost-btn tiny" data-add-note-page>+ Page</button>
        </div>
        ${activePage ? `
          <label class="field-label mt-12" for="note-page-title">Page title</label>
          <input class="input" id="note-page-title" data-note-page-title="${esc(activePage.id)}" value="${esc(activePage.title)}" maxlength="80" />
          <textarea id="character-notes" class="notes-textarea">${esc(activePage.body || '')}</textarea>
          ${(character.notePages || []).length > 1 ? `<button type="button" class="danger-btn tiny mt-12" data-delete-note-page="${esc(activePage.id)}">Delete page</button>` : ''}
        ` : '<div class="empty">No notes pages.</div>'}
      </section>

      <div class="stack">
        <section class="card quest-tracker">
          <div class="card-header">
            <div>
              <div class="kicker">Quest tracker</div>
              <h3>Active quests</h3>
              <p class="subtle">Reminder list only — the table still runs the story.</p>
            </div>
            <button type="button" class="ghost-btn tiny" data-add-quest>+ Quest</button>
          </div>
          <div class="quest-tracker-list">${questRows || '<div class="empty">No quests tracked yet.</div>'}</div>
        </section>

        <section class="card glossary-card">
          <div class="card-header">
            <div>
              <div class="kicker">Rules reference</div>
              <h3>Term Dictionary</h3>
              <p>Plain-language rules, status effects, and damage types — written for casual tables and read-aloud play.</p>
            </div>
          </div>
          <label class="field-label" for="glossary-search">Search terms</label>
          <input class="input glossary-search" id="glossary-search" placeholder="e.g. burn, enchant, barrier, force damage, intimidated…" value="${esc(state.glossarySearch || '')}" />
          ${renderGlossarySection()}
        </section>
      </div>
    </div>
  `
}