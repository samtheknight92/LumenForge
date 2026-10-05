import { esc } from '../core/utils.js'
import { getEffect } from '../character/character.js'
import { isKnockedOut, isDead, deathSaveFails, DEATH_SAVE_RULES } from '../character/knockout.js'
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
        <h3 class="effects-section-title">☠️ Dead</h3>
        <p class="effect-add-intro">${esc(character.name)} failed all ${DEATH_SAVE_RULES.maxFails} death saves. Healing can't help now. If your GM brings them back (or it was a mistake), tap Bring back.</p>
        <div class="wrap mt-12">
          <button type="button" class="ghost-btn tiny" data-bring-back-from-death>Bring back (GM says so)</button>
        </div>
      </div>
    `
  }
  if (!isKnockedOut(character)) return ''
  const fails = deathSaveFails(character)
  return `
    <div class="effect-add-box knockout-panel warn mt-12">
      <h3 class="effects-section-title">💥 Knocked down</h3>
      <p class="effect-add-intro">At 0 HP you can't move, attack, use items or use skills. Roll to survive on your turn: ${DEATH_SAVE_RULES.target}+ on a d20 gets you up with 1 HP. Any healing also gets you up.</p>
      <div class="wrap mt-12">
        <span class="pill ${fails ? 'danger' : 'warn'}">Failed rolls ${fails}/${DEATH_SAVE_RULES.maxFails}</span>
        <button type="button" class="primary-btn tiny" data-death-save-open>🎲 Death saves</button>
        <button type="button" class="ghost-btn tiny" data-healed-by-ally>💚 Healed by another player</button>
      </div>
    </div>
  `
}
