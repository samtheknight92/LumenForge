import { $, $$, esc, titleCase } from '../core/utils.js'
import { DRAGONBORN_AFFINITIES } from '../core/constants.js'
import { state, activeCharacter } from '../core/state.js'
import { raceOptions, getRace } from '../core/cache.js'
import { computeStats } from '../character/character.js'
import {
  humanStarterWeaponOptions
} from '../skills/skills.js'
import { computeSkillLevel } from '../character/skill-level.js'
import { computeCombatPower } from '../character/combat-power.js'
import { knockoutStatusLabel } from '../character/knockout.js'
import { isGmMode } from '../gm/gm-mode.js'
import { renderGuidedCreateModal } from './guided-create.js'
import { renderHowToPlayTab } from './how-to-play.js?v=5.4.0-survival'
import { renderNotesTab } from './notes-tab.js'
import { renderShopTab } from './shop-tab.js?v=5.4.0-survival'
import { renderCraftTab } from './craft-tab.js'
import { renderStatsTab } from './stats-tab.js'
import { renderGmTab } from './gm-tab.js'
import { renderHomebrewTab } from './homebrew-tab.js'
import { renderSkillsTab } from './skills-tab.js?v=5.4.0-survival'
import { renderPlayTab } from './play-tab.js?v=5.4.0-survival'
import { renderCharacterTab } from './character-tab.js?v=5.4.0-survival'
import { formatCurrency } from './format.js'
import { renderActionBar } from '../combat/action-bar.js'
import { backgroundOptions, getBackground, backgroundRewardSummary, DEFAULT_BACKGROUND } from '../character/backgrounds.js'
import {
  characterFolder,
  folderAssignOptions,
  rosterFolderSections,
  isRosterFolderOpen
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
  if (opts.content) {
    renderContent()
    renderGuidedCreateHost()
  }
}

/**
 * Guided Create lives in its own layer outside the page content, so it always sits
 * above the sidebar and the action bar (and shows even before any character exists).
 */
function renderGuidedCreateHost() {
  const host = $('#guided-create-root')
  if (!host) return
  const open = Boolean(state.guidedCreate?.open)
  const prevBody = host.querySelector('.guided-create-body')
  const prevStep = host.querySelector('[data-guided-step]')?.dataset.guidedStep
  const scrollTop = prevBody?.scrollTop || 0
  const focusId = host.contains(document.activeElement) ? document.activeElement.id : ''
  host.innerHTML = renderGuidedCreateModal()
  document.body.classList.toggle('guided-open', open)
  if (!open) return
  const body = host.querySelector('.guided-create-body')
  // Keep the list where it was after tapping Learn / Buy / +, but start new steps at the top.
  if (body && String(state.guidedCreate.step) === prevStep) body.scrollTop = scrollTop
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true })
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
  content.innerHTML = tabs[state.tab]?.() || ''
  restoreContentFocus(focusCapture)
}

/** Difficulty index (0-8, Breeze..Deadly) -> pill color. Low = safe (good), mid = neutral, high = dangerous (bad). */