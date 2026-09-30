import { esc, titleCase } from '../core/utils.js'
import { STAT_RULES, DRAGONBORN_AFFINITIES } from '../core/constants.js'
import { state } from '../core/state.js'
import { raceOptions, getRace, getSkill, getItem } from '../core/cache.js'
import { computeStats, getEffect } from '../character/character.js'
import { offhandSlotLockReason, canEquipToOffhand, isOffhandItem, canEquipToMainHand } from '../items/equipment.js'
import { activePerformanceStatuses, formatPerformanceMeta } from '../combat/instruments.js'
import { isToggleSkill } from '../skills/skills.js'
import { computeSkillLevel, skillLevelTooltip } from '../character/skill-level.js'
import { computeCombatPower, combatPowerTooltip } from '../character/combat-power.js'
import { isTableRuleRacePassive, racePassiveTooltip } from '../character/race-passives.js'
import { isGmMode } from '../gm/gm-mode.js'
import { renderEffectPill, renderItemCounterControls } from './shared-panels.js'
import { effectDurationLabel, effectTypeLabel, effectTone, effectTooltip, effectUsesPotency, effectPotencyLabel, characterEffectSources } from '../effects/effects.js'
import { formatStatModifiers, fallbackIcon } from './format.js'
import { itemTooltip, skillTooltip, statTooltip } from './tooltips-text.js'
import { resolveItemPresentation, renderCursedBadgeHtml, renderItemStatusIcons, itemCardClass, itemCursedNameClass } from '../items/item-presentation.js'
import { filterInventoryEntries, inventoryTagOptions, INVENTORY_SORT_OPTIONS, INVENTORY_FILTER_OPTIONS } from '../items/inventory-nav.js'
import { getBackground, backgroundRewardSummary } from '../character/backgrounds.js'
import { craftedByLabel } from '../items/craft-bonuses.js'
import { maxEnchantmentSlots, entryEnchantments, enchantmentTooltip, isEnhancementItem, compatibleEquippedGearForEnhancement, applyEnchantTargetLabel, enchantDisplayLabel, isShieldEnchant } from '../items/enchantments.js'
import { computeElementalAffinity, elementalAffinityTooltip, elementalAffinityTone, isElementalAffinityRowVisible, ELEMENTS } from '../combat/elemental-affinity.js'

/** Character tab — overview, equipment, inventory, skill & gear effects and affinities. */

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

function renderGearEffects(character) {
  const sourced = characterEffectSources(character)
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
  return `
    <section class="card effects-manager mt-16">
      <div class="kicker">Always on</div>
      <h3>Skill &amp; gear effects</h3>
      <p class="effects-manager-intro">Ongoing passives from your race, gear, weapon-matched skills and toggles. Statuses and weather you add in a fight live on the Play tab.</p>
      <div class="effect-grid">${sourceCards || '<div class="empty effects-empty">No skill/gear special effects detected yet.</div>'}</div>
    </section>
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

export function renderCharacterTab(character) {
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
        ${renderEffectsSnapshot(character)}
      </section>
    </div>

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

    ${renderElementalAffinitySection(character)}

    ${renderGearEffects(character)}

    ${renderPerformanceBanner(character)}

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
          <details class="inventory-item-notes-wrap"${entry.playerNotes ? ' open' : ''}>
            <summary>📝 Your notes</summary>
            <textarea class="input tiny inventory-item-notes" data-entry-player-notes="${esc(entry.uid)}" rows="2" placeholder="Personal notes…" aria-label="Your notes">${esc(entry.playerNotes || '')}</textarea>
          </details>
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
