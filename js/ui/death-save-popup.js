import { esc } from '../core/utils.js'
import { state } from '../core/state.js'
import {
  DEATH_SAVE_RULES,
  deathSaveFails,
  deathSavePopupOpen,
  isDead
} from '../character/knockout.js'
import { getInjury, injuriesOn, injuryEffectText } from '../character/injuries.js'

/** One pip per chance: a skull for each failed roll, a heart for each chance left. */
function chancePips(character) {
  const fails = deathSaveFails(character)
  return Array.from({ length: DEATH_SAVE_RULES.maxFails }, (_, i) => i < fails
    ? '<span class="death-pip used" aria-label="Failed">💀</span>'
    : '<span class="death-pip" aria-label="Chance left">❤️</span>').join('')
}

function injuryLine(character) {
  if (!injuriesOn(character) || !character.lastKnockdownInjury) return ''
  const injury = getInjury(character.lastKnockdownInjury)
  if (!injury) return ''
  return `<p class="death-injury"><span class="pill bad">${esc(injury.icon)} ${esc(injury.name)}</span> You got hurt on the way down: ${esc(injuryEffectText(injury))}. It lasts until your GM says it has healed.</p>`
}

function knockedDown(character) {
  const note = state.deathSaveNote?.characterId === character.id ? state.deathSaveNote : null
  return `
    <div class="modal-backdrop death-save-backdrop">
      <section class="card modal-card death-save-card" role="dialog" aria-modal="true" aria-labelledby="death-save-title">
        <div class="death-save-burst" aria-hidden="true">💥</div>
        <h2 id="death-save-title">Knocked down!</h2>
        <p class="death-save-sub">${DEATH_SAVE_RULES.maxFails} chances to not die</p>
        <div class="death-pips">${chancePips(character)}</div>
        <p class="subtle death-save-help">Roll a d20. <strong>${DEATH_SAVE_RULES.target} or more</strong> and you get back up with 1 HP. Fail ${DEATH_SAVE_RULES.maxFails} times and your hero dies. Roll once on each of your turns.</p>
        ${note ? `<p class="death-save-note ${esc(note.tone)}">${esc(note.text)}</p>` : ''}
        ${injuryLine(character)}
        <div class="death-save-actions">
          <button type="button" class="primary-btn" data-recovery-roll>🎲 Roll to survive</button>
          <button type="button" class="ghost-btn death-ally" data-healed-by-ally>💚 Healed by another player</button>
          <button type="button" class="ghost-btn" data-death-save-ignore>Ignore</button>
        </div>
        <p class="subtle death-save-dice">Rolled real dice?
          <button type="button" class="ghost-btn tiny" data-death-save-result="pass">✔ I passed</button>
          <button type="button" class="ghost-btn tiny" data-death-save-result="fail">✖ I failed</button>
        </p>
        <p class="subtle death-save-foot">Ignore keeps you at 0 HP and closes this, in case it was a mistake or the story needs it.</p>
      </section>
    </div>
  `
}

function deathScreen(character) {
  return `
    <div class="modal-backdrop death-save-backdrop dead">
      <section class="card modal-card death-save-card death-screen" role="dialog" aria-modal="true" aria-labelledby="death-screen-title">
        <div class="death-save-burst" aria-hidden="true">☠️</div>
        <h2 id="death-screen-title">${esc(character.name)} has died</h2>
        <div class="death-pips">${chancePips(character)}</div>
        <p class="subtle death-save-help">All ${DEATH_SAVE_RULES.maxFails} chances are gone. Their story ends here, unless your GM says otherwise.</p>
        <div class="death-save-actions">
          <button type="button" class="danger-btn" data-accept-death>Accept death</button>
        </div>
      </section>
    </div>
  `
}

/** The Knocked down popup or the death screen for the active character ('' when neither applies). */
export function renderDeathSavePopup(character) {
  if (!character || state.guidedCreate?.open) return ''
  if (isDead(character)) return state.deathScreen === character.id ? deathScreen(character) : ''
  return deathSavePopupOpen(character) ? knockedDown(character) : ''
}
