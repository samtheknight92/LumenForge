import { esc, titleCase } from '../core/utils.js'
import { STAT_RULES, HOMEBREW_ITEM_TYPES, HOMEBREW_RARITIES, HOMEBREW_SKILL_CATEGORIES, HOMEBREW_SKILL_TYPES, HOMEBREW_SKILL_DAMAGE_MODES, HOMEBREW_ELEMENT_TYPES, HOMEBREW_DAMAGE_STAT_KEYS, TIER_LUMEN_COST, HOMEBREW_OFFHAND_TYPES, HOMEBREW_WEAPON_HANDS, HOMEBREW_BALANCE_TAGS, HOMEBREW_APPROVAL_STATUSES, HOMEBREW_SKILL_APPLY_TO, HOMEBREW_SKILL_EFFECT_KINDS, HOMEBREW_SKILL_USE_LIMITS } from '../core/constants.js'
import { state, activeCharacter } from '../core/state.js'
import { getRace, getSkill, getItem } from '../core/cache.js'
import { getEffect } from '../character/character.js'
import { displayCategory, displaySubcategory } from '../skills/skills.js'
import { listHomebrewItems, listHomebrewSkills, listHomebrewRaces, listHomebrewBackgrounds, listHomebrewRecipes, listHomebrewMonsterTypes, listHomebrewMonsterRoles, listHomebrewMonsterSpecials, homebrewSkillTreeOptions, homebrewRaceOptionsForSkills, homebrewWeaponKindOptions, weaponKindDisplayLabel, homebrewSkillLockOptions, homebrewSkillLockSummary, homebrewBalanceWarning, listMonsterTemplateSkillOptions, MONSTER_IMMUNITY_EXTRA_TAGS } from '../homebrew/homebrew.js'
import { homebrewDamageStatLabel } from '../homebrew/homebrew-combat.js'
import { itemHasCounter, itemCounterLabel } from '../items/items.js'
import { renderEffectPill } from './shared-panels.js'
import { effectList, effectTypeLabel, effectTone, effectTooltip, effectUsesPotency, effectPotencyLabel } from '../effects/effects.js'
import { formatCurrency, fallbackIcon } from './format.js'
import { renderNumberStepper } from './number-stepper.js'
import { itemTooltip, skillTooltip } from './tooltips-text.js'
import { resolveItemPresentation, renderCursedBadgeHtml, itemCardClass, itemCursedNameClass } from '../items/item-presentation.js'
import { backgroundItemLabel } from '../character/backgrounds.js'
import { ELEMENTS, normalizeBuilderElementId } from '../combat/elemental-affinity.js'

/** Homebrew tab — custom item, skill, race, background, recipe and monster editors, plus pack import. */

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

export function renderHomebrewTab() {
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
