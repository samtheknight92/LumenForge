import { esc } from '../core/utils.js'
import { getEffect } from '../character/character.js'
import { itemHasCounter, itemCounterLabel, inventoryCounterValue } from '../items/items.js'
import { effectTone, effectTooltip } from '../effects/effects.js'

/** Panels shared by several tabs — effect pills and item counters. */

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
