import { esc, titleCase } from '../core/utils.js'
import { state } from '../core/state.js'
import { getSkill } from '../core/cache.js'
import { isGmMode } from '../gm/gm-mode.js'
import { filterCraftRecipes, canCraftRecipe, materialsStatus, craftProfessionOptions } from '../items/craft.js'
import { fallbackIcon } from './format.js'
import { displaySubcategory } from '../skills/skills.js'

/** Craft tab — career recipe filters and recipe cards. */

export function renderCraftTab(character) {
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
