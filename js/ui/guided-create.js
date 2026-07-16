/**
 * Guided Character Creator — in-memory draft until Finish.
 */
import { DRAGONBORN_AFFINITIES, STAT_RULES } from '../core/constants.js'
import { state } from '../core/state.js'
import { uid, toast, deepClone, esc, titleCase } from '../core/utils.js'
import { createCharacter, normalizeCharacter, computeStats } from '../character/character.js'
import { getSkill, flattenSkills, getItem, raceOptions, getRace, itemSources } from '../core/cache.js'
import { canLearnSkill, humanStarterWeaponOptions } from '../skills/skills.js'
import { PLAYSTYLE_TREE_HINTS } from '../skills/focused-skills.js'
import { getNextStatUpgradeCost, appendStatPurchase } from '../character/stat-costs.js'
import { shopPurchaseCheck, addItemToInventory } from '../items/items.js'
import { itemPriceGil, normalizeGil } from './format.js'
import { backgroundOptions, getBackground, DEFAULT_BACKGROUND } from '../character/backgrounds.js'
import { computeSkillLevel } from '../character/skill-level.js'
import { computeCombatPower } from '../character/combat-power.js'
import { getBasicAttackSkill } from '../combat/combat.js'

export const GUIDED_PLAYSTYLES = [
  { id: 'melee', label: 'Melee', blurb: 'Close combat weapons' },
  { id: 'ranged', label: 'Ranged', blurb: 'Bows and distance' },
  { id: 'magic', label: 'Magic', blurb: 'Elemental spellcraft' },
  { id: 'defensive', label: 'Defensive', blurb: 'Guard and endure' },
  { id: 'support', label: 'Support', blurb: 'Heal, buff, help' },
  { id: 'mixed', label: 'Mixed', blurb: 'A bit of everything' },
  { id: 'explore', label: 'Let me explore everything', blurb: 'No filters — browse freely' }
]

const STEP_LABELS = ['Identity', 'Playstyle', 'Skills', 'Equipment', 'Spend Lumens', 'Review']

export function emptyGuidedCreateState() {
  return {
    open: false,
    step: 1,
    draftCharacter: null,
    playstyle: '',
    dirty: false,
    browseSkills: false,
    browseItems: false,
    form: { name: '', raceId: 'human', background: DEFAULT_BACKGROUND, elementalAffinity: '', humanStarterSkill: '' }
  }
}

export function recommendedTier1Skills(playstyle) {
  const hint = PLAYSTYLE_TREE_HINTS[playstyle] || PLAYSTYLE_TREE_HINTS.explore
  if (playstyle === 'explore' || !playstyle) {
    return flattenSkills().filter(s => Number(s.tier || 1) === 1).slice(0, 40)
  }
  const out = []
  const seen = new Set()
  for (const skill of flattenSkills()) {
    if (Number(skill.tier || 1) !== 1 || seen.has(skill.id)) continue
    const match =
      (skill.category === 'weapons' && hint.weapons?.includes(skill.subcategory)) ||
      (skill.category === 'magic' && hint.magic?.includes(skill.subcategory)) ||
      (skill.category === 'careers' && hint.careers?.includes(skill.subcategory))
    if (!match) continue
    seen.add(skill.id)
    out.push(skill)
  }
  return out.slice(0, 36)
}

export function recommendedItems(playstyle) {
  const hint = PLAYSTYLE_TREE_HINTS[playstyle] || PLAYSTYLE_TREE_HINTS.explore
  const wantKinds = new Set(
    playstyle === 'explore' || !playstyle
      ? ['sword', 'ranged', 'staff', 'dagger', 'axe', 'hammer', 'polearm']
      : (hint.weapons?.length ? hint.weapons : ['sword'])
  )
  const items = []
  for (const item of itemSources()) {
    if (!item || item.archived) continue
    const type = String(item.type || '').toLowerCase()
    const price = itemPriceGil(item)
    if (price <= 0 || price > 900) continue
    const kind = item.weaponKind === 'bow' ? 'ranged' : item.weaponKind
    if (type.includes('weapon') && kind && wantKinds.has(kind)) items.push(item)
    else if ((type.includes('armor') || type.includes('accessory')) && price <= 500) {
      if (['defensive', 'support', 'mixed', 'explore', 'melee'].includes(playstyle || 'explore')) items.push(item)
    } else if ((type.includes('consumable') || type.includes('potion')) && price <= 200) items.push(item)
  }
  return items.slice(0, 30)
}

export function canDraftAffordSkill(draft, skill) {
  return Boolean(draft && skill && draft.lumens >= Number(skill.cost || 0))
}

export function canDraftAffordItem(draft, item) {
  return Boolean(draft && item && normalizeGil(draft.gil) >= itemPriceGil(item))
}

export function learnSkillOnDraft(draft, skillId) {
  const skill = getSkill(skillId)
  const check = canLearnSkill(draft, skill)
  if (!check.ok) return { ok: false, reason: check.reason }
  if (draft.lumens < skill.cost) return { ok: false, reason: 'Not enough Lumens' }
  draft.skills.push(skill.id)
  draft.lumens -= skill.cost
  return { ok: true }
}

export function refundSkillOnDraft(draft, skillId) {
  const skill = getSkill(skillId)
  if (!draft?.skills?.includes(skillId) || !skill) return { ok: false, reason: 'Not learned' }
  draft.skills = draft.skills.filter(id => id !== skillId)
  draft.activeToggles = (draft.activeToggles || []).filter(id => id !== skillId)
  draft.lumens += skill.cost
  return { ok: true }
}

export function buyItemOnDraft(draft, itemId) {
  const item = getItem(itemId)
  if (!item) return { ok: false, reason: 'Unknown item' }
  const check = shopPurchaseCheck(draft, item, { free: false })
  if (!check.ok) return { ok: false, reason: check.reason }
  draft.gil = normalizeGil(draft.gil) - itemPriceGil(item)
  addItemToInventory(draft, itemId, 1)
  return { ok: true }
}

export function upgradeStatOnDraft(draft, stat) {
  const rule = STAT_RULES[stat]
  if (!rule || !draft) return { ok: false, reason: 'Bad stat' }
  if (draft.stats[stat] >= rule.max) return { ok: false, reason: 'At cap' }
  const cost = getNextStatUpgradeCost(draft, stat)
  if (draft.lumens < cost) return { ok: false, reason: `Need ${cost}L` }
  draft.stats[stat] += 1
  draft.lumens -= cost
  appendStatPurchase(draft, stat, cost)
  if (stat === 'hp') draft.hp += 1
  if (stat === 'stamina') draft.stamina += 1
  return { ok: true }
}

export function openGuidedCreate() {
  state.guidedCreate = emptyGuidedCreateState()
  state.guidedCreate.open = true
}

export function closeGuidedCreate({ force = false } = {}) {
  const gc = state.guidedCreate
  if (!gc?.open) return true
  if (!force && gc.dirty && typeof confirm === 'function' && !confirm('Discard guided create draft?')) return false
  state.guidedCreate = emptyGuidedCreateState()
  return true
}

export function syncDraftFromIdentityForm() {
  const gc = state.guidedCreate
  if (!gc) return null
  const f = gc.form || {}
  const options = { background: f.background || DEFAULT_BACKGROUND }
  if (f.raceId === 'dragonborn' && f.elementalAffinity) options.elementalAffinity = f.elementalAffinity
  if (f.raceId === 'human' && f.humanStarterSkill) options.humanStarterSkill = f.humanStarterSkill
  const name = String(f.name || 'New Hero').trim() || 'New Hero'
  const prev = gc.draftCharacter
  const draft = normalizeCharacter(createCharacter(name, f.raceId || 'human', options))
  draft.id = prev?.id || uid('draft')
  if (prev && prev.race === draft.race) {
    draft.skills = [...new Set([...(draft.skills || []), ...(prev.skills || []).filter(id => !(draft.skills || []).includes(id))])]
    // Prefer explicit human starter
    if (options.humanStarterSkill && !draft.skills.includes(options.humanStarterSkill)) {
      draft.skills.push(options.humanStarterSkill)
    }
    draft.inventory = deepClone(prev.inventory || [])
    draft.equipped = { ...(prev.equipped || draft.equipped) }
    draft.stats = { ...prev.stats }
    draft.lumens = Math.min(prev.lumens, draft.lumens + 50) && prev.lumens
    draft.lumens = prev.lumens
    draft.gil = prev.gil
    draft.statUpgradeHistory = prev.statUpgradeHistory
    draft.hp = prev.hp
    draft.stamina = prev.stamina
  }
  gc.draftCharacter = draft
  return draft
}

export function finishGuidedCreate() {
  const gc = state.guidedCreate
  syncDraftFromIdentityForm()
  const draft = gc?.draftCharacter
  if (!draft) {
    toast('Nothing to finish.')
    return null
  }
  draft.guidedPlaystyle = gc.playstyle || ''
  draft.skillViewMode = 'focused'
  const finished = normalizeCharacter({
    ...deepClone(draft),
    id: uid('char'),
    premadeId: undefined
  })
  delete finished.premadeId
  state.characters.push(finished)
  state.activeId = finished.id
  state.guidedCreate = emptyGuidedCreateState()
  toast(`${finished.name} created.`)
  return finished
}

export function renderGuidedCreateModal() {
  const gc = state.guidedCreate
  if (!gc?.open) return ''
  const step = Math.max(1, Math.min(6, Number(gc.step) || 1))
  const progress = STEP_LABELS.map((label, i) =>
    `<span class="pill ${i + 1 === step ? 'active good' : ''}">${i + 1}. ${esc(label)}</span>`
  ).join('')

  let body = ''
  if (step === 1) body = renderGuidedStepIdentity(gc)
  else if (step === 2) body = renderGuidedStepPlaystyle(gc)
  else if (step === 3) body = renderGuidedStepSkills(gc)
  else if (step === 4) body = renderGuidedStepEquipment(gc)
  else if (step === 5) body = renderGuidedStepSpend(gc)
  else body = renderGuidedStepReview(gc)

  const backDisabled = step <= 1 ? 'disabled' : ''
  const nextLabel = step >= 6 ? 'Finish Character' : 'Next'
  const nextAction = step >= 6 ? 'data-guided-finish' : 'data-guided-next'

  return `
    <div class="modal-backdrop guided-create-modal" data-guided-dismiss>
      <section class="card modal-card" role="dialog" aria-modal="true" aria-label="Guided Create" tabindex="-1" data-guided-modal-card>
        <div class="card-header">
          <div>
            <div class="kicker">Guided Create</div>
            <h3>Step ${step} of 6</h3>
          </div>
          <button type="button" class="ghost-btn tiny" data-guided-cancel>Cancel</button>
        </div>
        <div class="guided-progress">${progress}</div>
        <div class="guided-create-body">${body}</div>
        <div class="wrap mt-12" style="justify-content:space-between">
          <button type="button" class="ghost-btn" data-guided-back ${backDisabled}>Back</button>
          <button type="button" class="primary-btn" ${nextAction}>${nextLabel}</button>
        </div>
      </section>
    </div>
  `
}

function renderGuidedStepIdentity(gc) {
  const f = gc.form || {}
  const races = raceOptions().filter(r => r.id !== 'monster')
  const race = getRace(f.raceId || 'human')
  const bg = getBackground(f.background || DEFAULT_BACKGROUND)
  let extras = ''
  if (f.raceId === 'dragonborn') {
    extras = `<label class="field-label">Elemental affinity
      <select class="input" data-guided-affinity>
        <option value="">Choose…</option>
        ${DRAGONBORN_AFFINITIES.map(a => `<option value="${esc(a)}" ${f.elementalAffinity === a ? 'selected' : ''}>${titleCase(a)}</option>`).join('')}
      </select>
    </label>`
  }
  if (f.raceId === 'human') {
    const opts = humanStarterWeaponOptions()
    extras = `<label class="field-label">Starter weapon skill
      <select class="input" data-guided-human-skill>
        <option value="">Choose…</option>
        ${opts.map(o => `<option value="${esc(o.id)}" ${f.humanStarterSkill === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}
      </select>
    </label>`
  }
  return `
    <div class="stack">
      <label class="field-label">Name<input class="input" data-guided-name value="${esc(f.name || '')}" placeholder="Character name" /></label>
      <label class="field-label">Race
        <select class="input" data-guided-race>
          ${races.map(r => `<option value="${esc(r.id)}" ${r.id === (f.raceId || 'human') ? 'selected' : ''}>${esc(r.icon || '')} ${esc(r.name)}</option>`).join('')}
        </select>
      </label>
      <p class="subtle">${esc(race?.desc || '')}</p>
      <label class="field-label">Background
        <select class="input" data-guided-background>
          ${backgroundOptions().map(b => `<option value="${esc(b.id)}" ${b.id === (f.background || DEFAULT_BACKGROUND) ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}
        </select>
      </label>
      <p class="subtle">${esc(bg?.desc || '')}</p>
      ${extras}
    </div>
  `
}

function renderGuidedStepPlaystyle(gc) {
  return `
    <p class="subtle">How would you like this character to play? Recommendations only — nothing is locked.</p>
    <div class="guided-choice-grid mt-12">
      ${GUIDED_PLAYSTYLES.map(p => `
        <button type="button" class="ghost-btn guided-choice-btn ${gc.playstyle === p.id ? 'active' : ''}" data-guided-playstyle="${esc(p.id)}">
          <strong>${esc(p.label)}</strong>
          <div class="subtle">${esc(p.blurb)}</div>
        </button>
      `).join('')}
    </div>
  `
}

function renderGuidedStepSkills(gc) {
  const draft = gc.draftCharacter || syncDraftFromIdentityForm()
  if (!draft) return '<p class="subtle">Set identity first.</p>'
  const list = gc.browseSkills
    ? flattenSkills().filter(s => Number(s.tier || 1) === 1).slice(0, 50)
    : recommendedTier1Skills(gc.playstyle || 'explore')
  return `
    <p class="subtle">Remaining Lumens: <strong>${draft.lumens}</strong>.</p>
    <div class="wrap mt-8">
      <button type="button" class="ghost-btn tiny" data-guided-browse-skills>${gc.browseSkills ? 'Show recommendations' : 'Browse more Tier 1'}</button>
    </div>
    <div class="skill-grid mt-12">
      ${list.map(skill => {
        const learned = draft.skills.includes(skill.id)
        const check = canLearnSkill(draft, skill)
        return `
          <article class="skill-card ${learned ? 'unlocked' : ''}">
            <h4>${esc(skill.icon || '✦')} ${esc(skill.name)}</h4>
            <div class="wrap"><span class="pill gold">${skill.cost}L</span></div>
            <p class="subtle">${esc(skill.desc || '')}</p>
            ${learned
              ? `<button type="button" class="ghost-btn tiny" data-guided-refund-skill="${esc(skill.id)}">Remove</button>`
              : `<button type="button" class="primary-btn tiny" data-guided-learn-skill="${esc(skill.id)}" ${check.ok ? '' : 'disabled'}>Learn</button>`}
          </article>
        `
      }).join('')}
    </div>
  `
}

function renderGuidedStepEquipment(gc) {
  const draft = gc.draftCharacter
  if (!draft) return '<p class="subtle">Set identity first.</p>'
  const list = gc.browseItems
    ? itemSources().filter(i => itemPriceGil(i) > 0 && itemPriceGil(i) <= 1200).slice(0, 40)
    : recommendedItems(gc.playstyle || 'explore')
  return `
    <p class="subtle">Remaining Gil: <strong>${normalizeGil(draft.gil)}</strong>.</p>
    <div class="wrap mt-8">
      <button type="button" class="ghost-btn tiny" data-guided-browse-items>${gc.browseItems ? 'Show recommendations' : 'Browse more gear'}</button>
    </div>
    <div class="stack mt-12">
      ${list.map(item => `
        <div class="play-item-row">
          <div>
            <strong>${esc(item.name)}</strong>
            <div class="subtle">${esc(item.type)} · ${itemPriceGil(item)} Gil</div>
          </div>
          <button type="button" class="primary-btn tiny" data-guided-buy-item="${esc(item.id)}">Buy</button>
        </div>
      `).join('')}
    </div>
  `
}

function renderGuidedStepSpend(gc) {
  const draft = gc.draftCharacter
  if (!draft) return ''
  const skills = recommendedTier1Skills(gc.playstyle || 'mixed').slice(0, 12)
  return `
    <p class="subtle">Remaining Lumens: <strong>${draft.lumens}</strong>.</p>
    <div class="grid two mt-12">
      ${Object.entries(STAT_RULES).map(([stat, rule]) => `
        <div class="card">
          <strong>${esc(rule.label)}</strong> ${draft.stats[stat]}
          <div class="subtle">Next: ${getNextStatUpgradeCost(draft, stat)}L</div>
          <button type="button" class="primary-btn tiny mt-8" data-guided-upgrade-stat="${esc(stat)}">Upgrade</button>
        </div>
      `).join('')}
    </div>
    <div class="wrap mt-16">
      ${skills.filter(s => !draft.skills.includes(s.id)).map(skill =>
        `<button type="button" class="ghost-btn tiny" data-guided-learn-skill="${esc(skill.id)}">${esc(skill.name)} (${skill.cost}L)</button>`
      ).join('')}
    </div>
  `
}

function renderGuidedStepReview(gc) {
  const draft = gc.draftCharacter
  if (!draft) return ''
  const stats = computeStats(draft)
  const sl = computeSkillLevel(draft)
  const cp = computeCombatPower(draft)
  const basic = getBasicAttackSkill(draft)
  const race = getRace(draft.race)
  const cpVal = cp?.total ?? cp?.combatPower ?? cp
  const equipped = Object.entries(draft.equipped || {}).map(([slot, entryUid]) => {
    const entry = draft.inventory.find(e => e.uid === entryUid)
    const item = entry && getItem(entry.itemId)
    return item ? `${titleCase(slot)}: ${item.name}` : null
  }).filter(Boolean)
  return `
    <div class="stack">
      <p><strong>${esc(draft.name)}</strong> · ${esc(race?.name || draft.race)}</p>
      <p class="subtle">Playstyle: ${esc(gc.playstyle || '—')} · SL ${esc(sl.display || String(sl.skillLevel))} · CP ${esc(String(cpVal))}</p>
      <div class="wrap">
        <span class="pill">HP ${draft.hp}/${stats.hp}</span>
        <span class="pill">STA ${draft.stamina}/${stats.stamina}</span>
        <span class="pill">ACC ${stats.accuracy}</span>
        <span class="pill">SPD ${stats.speed}</span>
        <span class="pill">STR ${stats.strength}</span>
        <span class="pill">MP ${stats.magicPower}</span>
        <span class="pill">PD ${stats.physicalDefence}</span>
        <span class="pill">MD ${stats.magicalDefence}</span>
      </div>
      <p><strong>Skills:</strong> ${(draft.skills || []).map(id => getSkill(id)?.name || id).join(', ') || '—'}</p>
      <p><strong>Equipped:</strong> ${equipped.join('; ') || '—'}</p>
      <p><strong>Wallet:</strong> ${draft.lumens}L · ${normalizeGil(draft.gil)} Gil</p>
      <p><strong>Basic Attack:</strong> ${esc(basic?.name || '—')}</p>
    </div>
  `
}
