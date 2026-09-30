import { esc } from '../core/utils.js'
import { getEffect } from '../character/character.js'
import { isKnockedOut, isDead } from '../character/knockout.js'
import { itemHasCounter, itemCounterLabel, inventoryCounterValue } from '../items/items.js'
import { effectTone, effectTooltip } from '../effects/effects.js'

/** Panels shared by several tabs — effect pills, item counters and the knockout panel. */

export function renderEffectPill(effectId, source = '', status = null) {
  const effect = getEffect(effectId)
  if (!effect) return ''
  return `<span class="pill ${effectTone(effect)}" data-tooltip="${esc(effectTooltip(effectId, source, status))}" tabindex="0">${esc(effect.icon || '✦')} ${esc(effect.name)}</span>`
}

export function renderItemCounterControls(entry, item, { showWhenEquipped = false } = {}) {
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

export function renderKnockoutPanel(character) {
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
