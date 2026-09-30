import { esc, titleCase } from '../core/utils.js'
import { WEAPON_SKILL_TREE_INTROS } from '../core/constants.js'
import { state } from '../core/state.js'
import { visibleSubcategories, visibleSkillCategories, skillsInSubcategory, displayCategory, canLearnSkill, displaySubcategory, syncFusionFilters, fusionFilterOptions, incompatibilityReason, isToggleSkill, prereqLabel } from '../skills/skills.js'
import { displayFusionCareerKind, displayFusionElement, displayFusionWeapon, hasActiveFusionFilters } from '../skills/fusion-nav.js'
import { getFocusedSkillContext, focusedCategories, focusedSubcategories, skillIsFocused, isOutsideFocus } from '../skills/focused-skills.js'
import { isHomebrewSkill } from '../homebrew/homebrew.js'
import { isGmMode } from '../gm/gm-mode.js'
import { skillTooltip } from './tooltips-text.js'
import { isActionBarSkill } from '../skills/skill-activation.js'

/** Skills tab — category/tree navigation, fusion filters and skill cards. */

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

export function renderSkillsTab(character) {
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
        ${skill.fusionKind === 'career' || skill.fusionKind === 'career_weapons' ? '<span class="pill good">Career Fusion</span>' : ''}
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
