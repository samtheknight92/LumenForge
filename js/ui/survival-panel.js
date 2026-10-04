import { esc } from '../core/utils.js'
import { getSurvivalSnapshot } from '../character/character.js'
import {
  SURVIVAL_LABELS,
  SURVIVAL_RULES,
  SURVIVAL_TRACKERS,
  ensureSurvival,
  formatWeight
} from '../character/survival.js'

/** "Carrying 12 / 24 kg" pill shown on Character, Shop and the Survival panel. */
export function renderCarryPill(character) {
  if (!character?.survival?.on?.weight) return ''
  const snap = getSurvivalSnapshot(character)
  const over = snap.carried > snap.carryLimit
  const tip = `Carry limit = ${SURVIVAL_RULES.carryBase} kg + ${SURVIVAL_RULES.carryPerStrength} kg per point of Strength (at least ${SURVIVAL_RULES.carryMin} kg). Over the limit you are Encumbered; at double it you can't move.`
  return `<span class="pill ${over ? 'bad' : 'good'} carry-pill" data-tooltip="${esc(tip)}" tabindex="0">🎒 Carrying ${formatWeight(snap.carried)} / ${formatWeight(snap.carryLimit)}</span>`
}

function conditionFor(snapshot, key) {
  return snapshot.conditions.find(row => row.tracker === key) || null
}

function meter(key, value, max, condition, extra = '', footer = '') {
  const label = SURVIVAL_LABELS[key]
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  const conditionPill = condition
    ? `<span class="pill ${condition.tone}" data-tooltip="${esc(condition.desc)}" tabindex="0">${esc(condition.icon)} ${esc(condition.name)}</span>`
    : `<span class="pill good">${key === 'stress' ? 'Calm' : key === 'weight' ? 'Fine' : 'OK'}</span>`
  return `
    <div class="survival-meter survival-${key}">
      <div class="survival-meter-head">
        <strong data-tooltip="${esc(label.help)}" tabindex="0">${label.icon} ${label.name}</strong>
        <span class="survival-value">${extra || `${value}/${max}`}</span>
        ${conditionPill}
      </div>
      <div class="survival-bar"><div class="survival-fill" style="width:${pct}%"></div></div>
      ${condition ? `<p class="survival-effect">${esc(condition.desc)}</p>` : ''}
      ${footer}
    </div>
  `
}

const STEPS = [25, 10, 5, 1]

/** Main action (if any) plus a −25 … +25 step row. */
function stepButtons(key, main = null) {
  const steps = [...STEPS.map(n => [-n, `−${n}`]), ...[...STEPS].reverse().map(n => [n, `+${n}`])]
  return (main ? adjustButtons(key, [main]) : '') + adjustButtons(key, steps, 'survival-steps')
}

function adjustButtons(key, buttons, extraClass = '') {
  return `<div class="wrap survival-buttons ${extraClass}">${buttons.map(([delta, text, cls]) =>
    `<button type="button" class="${cls || 'ghost-btn'} tiny" data-survival-adjust="${key}" data-delta="${delta}">${text}</button>`).join('')}</div>`
}

/** Collapsible Survival panel on the Play tab. */
export function renderSurvivalPanel(character) {
  const survival = ensureSurvival(character)
  const on = survival.on
  const anyOn = SURVIVAL_TRACKERS.some(key => on[key])
  const snapshot = getSurvivalSnapshot(character)
  const summaryPills = snapshot.conditions.map(row =>
    `<span class="pill ${row.tone}">${esc(row.icon)} ${esc(row.name)}</span>`).join('')
  const header = `
    <button type="button" class="survival-toggle" data-survival-collapse aria-expanded="${survival.collapsed ? 'false' : 'true'}">
      <span class="kicker">Optional</span>
      <strong>🏕️ Survival</strong>
      <span class="wrap survival-summary">${anyOn ? summaryPills || '<span class="pill good">All good</span>' : '<span class="pill">Off</span>'}</span>
      <span class="survival-chevron">${survival.collapsed ? '▸' : '▾'}</span>
    </button>`
  if (survival.collapsed) {
    return `<section class="card survival-panel collapsed">${header}</section>`
  }

  const ticks = SURVIVAL_TRACKERS.map(key => `
    <label class="pill survival-tick ${on[key] ? 'good' : ''}">
      <input type="checkbox" data-survival-tracker="${key}" ${on[key] ? 'checked' : ''} />
      ${SURVIVAL_LABELS[key].icon} ${SURVIVAL_LABELS[key].name}
    </label>`).join('')

  const meters = []
  if (on.hunger) {
    meters.push(meter('hunger', survival.hunger, SURVIVAL_RULES.max, conditionFor(snapshot, 'hunger'), '',
      stepButtons('hunger', [SURVIVAL_RULES.eat, `🍖 Eat a meal +${SURVIVAL_RULES.eat}`, 'primary-btn'])))
  }
  if (on.thirst) {
    meters.push(meter('thirst', survival.thirst, SURVIVAL_RULES.max, conditionFor(snapshot, 'thirst'), '',
      stepButtons('thirst', [SURVIVAL_RULES.drink, `💧 Drink +${SURVIVAL_RULES.drink}`, 'primary-btn'])))
  }
  if (on.stress) {
    meters.push(meter('stress', survival.stress, SURVIVAL_RULES.max, conditionFor(snapshot, 'stress'), '',
      stepButtons('stress')))
  }
  if (on.weight) {
    meters.push(meter('weight', snapshot.carried, Math.max(1, snapshot.carryLimit), conditionFor(snapshot, 'weight'),
      `${formatWeight(snapshot.carried)} / ${formatWeight(snapshot.carryLimit)}`,
      '<p class="subtle survival-note">Drop things on the Character tab to lighten your load. Item weights show there and in the Shop.</p>'))
  }

  const showTravel = on.hunger || on.thirst
  const showTime = on.hunger || on.thirst || on.stress
  const travelBox = showTravel ? `
    <div class="survival-box">
      <h4>🥾 Travel</h4>
      <p class="subtle">When the GM says how far you walked, type it here. Every ${SURVIVAL_RULES.travelMetresPerHunger} m costs 1 Hunger and every ${SURVIVAL_RULES.travelMetresPerThirst} m costs 1 Thirst.</p>
      <div class="survival-form">
        <input class="input" id="survival-travel-metres" type="number" min="0" step="50" inputmode="numeric" placeholder="e.g. 1500" aria-label="Metres travelled" />
        <span class="subtle">m</span>
        <button type="button" class="primary-btn tiny" data-survival-travel>Travel</button>
      </div>
    </div>` : ''
  const timeBox = showTime ? `
    <div class="survival-box">
      <h4>⏳ Pass Time</h4>
      <p class="subtle">Waiting: Hunger −${SURVIVAL_RULES.waitingPerHour.hunger}, Thirst −${SURVIVAL_RULES.waitingPerHour.thirst} per hour. Sleeping: Hunger −${SURVIVAL_RULES.sleepingPerHour.hunger}, Thirst −${SURVIVAL_RULES.sleepingPerHour.thirst} per hour. Sleeping ${SURVIVAL_RULES.fullSleepHours}+ hours also lowers Stress by ${SURVIVAL_RULES.fullSleepStressRelief}.</p>
      <div class="survival-form">
        <input class="input" id="survival-hours" type="number" min="0" step="0.5" inputmode="decimal" placeholder="Hours" aria-label="Hours that pass" />
        <select class="input" id="survival-time-mode" aria-label="Waiting or sleeping">
          <option value="waiting">Waiting</option>
          <option value="sleeping">Sleeping</option>
        </select>
        <button type="button" class="primary-btn tiny" data-survival-pass-time>Pass Time</button>
      </div>
    </div>` : ''

  const skillNote = (on.hunger || on.thirst)
    ? '<p class="subtle survival-note">Using skills makes you hungrier and thirstier: Tier 1 costs nothing, Tier 2–3 cost 1 Thirst, Tier 4 costs 1 Hunger and 2 Thirst, Tier 5+ costs 2 Hunger and 3 Thirst. Basic attacks are free. Food and drink in your bag get an Eat or Drink button.</p>'
    : ''

  return `
    <section class="card survival-panel">
      ${header}
      <p class="subtle survival-intro">Extra tracking for groups who want more challenge. Tick only what your table uses. Bad effects apply to your stats automatically, just like weather.</p>
      <div class="wrap survival-ticks">${ticks}</div>
      ${meters.length ? `<div class="survival-meters">${meters.join('')}</div>` : ''}
      ${skillNote}
      ${travelBox || timeBox ? `<div class="survival-boxes">${travelBox}${timeBox}</div>` : ''}
    </section>
  `
}
