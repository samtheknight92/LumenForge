import { $, $$, esc, titleCase } from '../core/utils.js'
import { STAT_RULES, DRAGONBORN_AFFINITIES } from '../core/constants.js'
import { state, activeCharacter } from '../core/state.js'
import { raceOptions, getRace, getSkill, cache } from '../core/cache.js'
import { computeStats } from '../character/character.js'
import {
  humanStarterWeaponOptions
} from '../skills/skills.js'
import { computeSkillLevel } from '../character/skill-level.js'
import { computeCombatPower } from '../character/combat-power.js'
import { threatLevelTooltip } from '../character/threat-level.js'
import {
  computeEncounterDifficulty,
  suggestEnemyQuantities,
  summarizeEncounter,
  generateEncounterWarnings
} from '../gm/encounter-balancer.js'
import { knockoutStatusLabel } from '../character/knockout.js'
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
import { renderGuidedCreateModal } from './guided-create.js'
import { renderHowToPlayTab } from './how-to-play.js?v=5.2.2-howtoplay-fix'
import { renderNotesTab } from './notes-tab.js'
import { renderShopTab } from './shop-tab.js'
import { renderCraftTab } from './craft-tab.js'
import { renderStatsTab } from './stats-tab.js'
import { renderHomebrewTab } from './homebrew-tab.js'
import { renderSkillsTab } from './skills-tab.js'
import { renderPlayTab } from './play-tab.js'
import { renderCharacterTab } from './character-tab.js'
import {
  manualEffectList
} from '../effects/effects.js'
import { formatCurrency } from './format.js'
import { renderActionBar } from '../combat/action-bar.js'
import { backgroundOptions, getBackground, backgroundRewardSummary, DEFAULT_BACKGROUND } from '../character/backgrounds.js'
import { sortInitiativeEntries, activeInitiativeEntry } from '../gm/gm-initiative.js'
import {
  ELEMENTS
} from '../combat/elemental-affinity.js'
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
