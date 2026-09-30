import { esc } from '../core/utils.js'
import { getSkill } from '../core/cache.js'
import { getEffect } from '../character/character.js'
import { formatPerformanceMeta } from '../combat/instruments.js'
import { groupedManualEffects, groupedWeatherEffects, effectDurationLabel, effectTone, effectTooltip, statusStatModifiers } from '../effects/effects.js'
import { weatherGameplayLines } from '../combat/weather-effects.js'
import { formatStatModifiers } from './format.js'
import { renderNumberStepper } from './number-stepper.js'

function effectOptionsMarkup() {
  return groupedManualEffects().map(([group, effects]) => `
    <optgroup label="${esc(group)}">
      ${effects.map(effect => `<option value="${esc(effect.id)}">${esc(effect.icon || '✦')} ${esc(effect.name)}</option>`).join('')}
    </optgroup>
  `).join('')
}

function weatherOptionsMarkup() {
  return groupedWeatherEffects().map(effect =>
    `<option value="${esc(effect.id)}">${esc(effect.icon || '✦')} ${esc(effect.name)}</option>`
  ).join('')
}

/** Status & weather panel on the Play tab — applied statuses, active toggles, weather, and the add forms. */
export function renderStatusPanel(character) {
  const active = character.statusEffects || []
  const weather = character.weatherEffects || []
  const toggleSkills = (character.activeToggles || []).map(id => getSkill(id)).filter(Boolean)
  const activeCards = active.map(status => {
    const effect = getEffect(status.effectId)
    if (!effect) return ''
    return `
      <article class="effect-card effect-card-active ${effectTone(effect)}" data-tooltip="${esc(effectTooltip(effect.id, 'Applied status', status))}" tabindex="0">
        <div class="effect-card-title"><strong>${esc(effect.icon || '✦')} ${esc(effect.name)}</strong><button type="button" class="danger-btn tiny" data-remove-effect="${esc(status.uid)}">Remove</button></div>
        <p class="effect-card-desc">${esc(effect.desc)}</p>
        <div class="wrap effect-card-tags">
          <span class="pill">Remaining: ${esc(effectDurationLabel(status.duration))}</span>
          ${status.potency !== undefined && status.potency !== null && status.potency !== 0 ? `<span class="pill warn">Potency ${esc(status.potency)}</span>` : ''}
          ${Object.keys(statusStatModifiers(status, effect)).length ? `<span class="pill ${effectTone(effect)}">${esc(formatStatModifiers(statusStatModifiers(status, effect)))}</span>` : ''}
        </div>
          ${status.notes ? `<div class="subtle effect-card-meta">${esc(status.notes)}</div>` : ''}
          ${status.performance ? `<div class="subtle effect-card-meta good">${esc(formatPerformanceMeta(status.performance))}</div>` : ''}
        </article>
    `
  }).join('')
  const weatherCards = weather.map(status => {
    const effect = getEffect(status.effectId)
    if (!effect) return ''
    const gameplay = weatherGameplayLines(effect)
    const manaStormRoll = effect.manaStorm ? `
      <label class="field-label compact mt-12">Combat round roll (1d6)
        <select class="input tiny" data-weather-combat-roll="${esc(status.uid)}">
          <option value="">Not set</option>
          ${[1, 2, 3, 4, 5, 6].map(roll => `<option value="${roll}" ${Number(status.combatRoll) === roll ? 'selected' : ''}>${roll}</option>`).join('')}
        </select>
      </label>` : ''
    return `
      <article class="effect-card effect-card-active ${effectTone(effect)}" data-tooltip="${esc(effectTooltip(effect.id, 'Weather', status))}" tabindex="0">
        <div class="effect-card-title"><strong>${esc(effect.icon || '✦')} ${esc(effect.name)}</strong><button type="button" class="danger-btn tiny" data-remove-weather="${esc(status.uid)}">Remove</button></div>
        <p class="effect-card-desc">${esc(effect.desc)}</p>
        <div class="wrap effect-card-tags">
          <span class="pill">Remaining: ${esc(effectDurationLabel(status.duration))}</span>
          ${Object.keys(statusStatModifiers(status, effect)).length ? `<span class="pill ${effectTone(effect)}">${esc(formatStatModifiers(statusStatModifiers(status, effect)))}</span>` : ''}
          ${gameplay.map(line => `<span class="pill warn">${esc(line)}</span>`).join('')}
        </div>
        ${manaStormRoll}
        ${status.notes ? `<div class="subtle effect-card-meta">${esc(status.notes)}</div>` : ''}
      </article>
    `
  }).join('')
  return `
    <section class="card effects-manager status-panel">
      <div class="kicker">In combat</div>
      <h3>Status effects &amp; weather</h3>
      <p class="effects-manager-intro">Hover any effect to see what it does. <strong>Process Turn</strong> ticks durations down; <strong>New Combat</strong> resets once-per-combat uses.</p>
      ${toggleSkills.length ? `<div class="wrap mt-8">${toggleSkills.map(skill => `<span class="pill warn">${esc(skill.icon || '✦')} ${esc(skill.name)} (on)</span>`).join('')}</div>` : ''}
        <div class="effects-section">
          <h3 class="effects-section-title">Applied status effects</h3>
          <div class="effect-grid">${activeCards || '<div class="empty effects-empty">No active status effects. Suspiciously healthy.</div>'}</div>
        </div>
      <div class="effect-add-pair">
      <div class="effect-add-box">
        <h3 class="effects-section-title">Add Effect</h3>
        <p class="effect-add-intro">Track combat statuses, skill buffs, and potion effects here. For Temp Strength, Temp Magic, and similar, enter the duration and potency from the item or skill text (e.g. potency 3, 8 turns).</p>
        <div class="effect-add-grid">
          <label><span class="field-label">Effect</span><select class="input" id="effect-select">${effectOptionsMarkup()}</select></label>
          <label><span class="field-label">Duration</span>${renderNumberStepper({ id: 'effect-duration', min: 0, placeholder: 'Default', decreaseLabel: 'Decrease duration', increaseLabel: 'Increase duration' })}</label>
          <label><span class="field-label">Potency</span>${renderNumberStepper({ id: 'effect-potency', placeholder: 'Default', decreaseLabel: 'Decrease potency', increaseLabel: 'Increase potency' })}</label>
          <label><span class="field-label">Notes</span><input class="input" id="effect-notes" placeholder="Optional source/variant" /></label>
        </div>
        <button type="button" class="primary-btn full" data-add-effect>Add Effect</button>
      </div>

      <div class="effect-add-box weather-section">
        <h3 class="effects-section-title">Weather</h3>
        <p class="effect-add-intro">Track scene weather for the party — one scene weather at a time; manual duration like status effects.</p>
        <div class="effect-grid">${weatherCards || '<div class="empty effects-empty">No active weather.</div>'}</div>
        <div class="effect-add-grid mt-12">
          <label><span class="field-label">Weather</span><select class="input" id="weather-select">${weatherOptionsMarkup()}</select></label>
          <label><span class="field-label">Duration</span>${renderNumberStepper({ id: 'weather-duration', min: 0, placeholder: 'Ongoing', decreaseLabel: 'Decrease duration', increaseLabel: 'Increase duration' })}</label>
          <label><span class="field-label">Notes</span><input class="input" id="weather-notes" placeholder="Optional scene note" /></label>
        </div>
        <button type="button" class="primary-btn full" data-add-weather>Add weather</button>
      </div>
      </div>
    </section>
  `
}
