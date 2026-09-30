import { esc } from '../core/utils.js'
import { state } from '../core/state.js'
import { cache } from '../core/cache.js'
import { filterGlossaryEntries, groupGlossaryEntries, GLOSSARY_CATEGORIES, getAllGlossaryEntries } from './glossary.js'

/** Notes tab — note pages, quest tracker and the rules glossary. */

function resolveActiveNotePage(character) {
  if (!character?.notePages?.length) return null
  const map = state.activeNotePageByCharacter || {}
  const activeId = map[character.id]
  return character.notePages.find(page => page.id === activeId) || character.notePages[0]
}

function renderGlossaryEntry(entry, openByDefault) {
  return `
    <details class="glossary-entry"${openByDefault ? ' open' : ''}>
      <summary class="glossary-entry-summary">
        <strong class="glossary-entry-term">${esc(entry.term)}</strong>
        <span class="subtle glossary-entry-blurb">${esc(entry.summary)}</span>
      </summary>
      <p class="glossary-entry-body">${esc(entry.detail)}</p>
    </details>
  `
}

function renderGlossarySection() {
  const query = state.glossarySearch || ''
  const entries = filterGlossaryEntries(query, cache.effectDefinitions)
  const grouped = groupGlossaryEntries(entries)
  const openByDefault = Boolean(query.trim())
  const total = getAllGlossaryEntries(cache.effectDefinitions).length
  const countLabel = query.trim()
    ? `${entries.length} match${entries.length === 1 ? '' : 'es'}`
    : `${total} terms`

  if (!entries.length) {
    return `
      <div class="glossary-results">
        <div class="empty glossary-empty">No terms match “${esc(query)}”. Try “burn”, “force”, “freeze”, “mind control”, or “incapacitated”.</div>
      </div>
    `
  }

  const sections = grouped.map(([category, items]) => `
    <section class="glossary-category">
      <h4 class="glossary-category-title">${esc(category)}</h4>
      <div class="glossary-entries">
        ${items.map(entry => renderGlossaryEntry(entry, openByDefault)).join('')}
      </div>
    </section>
  `).join('')

  return `
    <div class="glossary-meta subtle">${esc(countLabel)} · ${GLOSSARY_CATEGORIES.length} categories</div>
    <div class="glossary-results">${sections}</div>
  `
}

export function renderNotesTab(character) {
  const statusLabel = state.notesDirty ? 'Unsaved changes' : 'Saved'
  const toneClass = state.notesDirty ? 'warn' : 'good'
  const activePage = resolveActiveNotePage(character)
  const pageList = (character.notePages || []).map(page => `
    <button type="button" class="note-page-btn ${activePage?.id === page.id ? 'active' : ''}" data-set-note-page="${esc(page.id)}">${esc(page.title)}</button>
  `).join('')
  const questRows = (character.quests || []).map(quest => `
    <div class="quest-row" data-quest-id="${esc(quest.id)}">
      <label class="quest-complete"><input type="checkbox" data-quest-completed="${esc(quest.id)}" ${quest.completed ? 'checked' : ''} /></label>
      <input class="input tiny quest-name" data-quest-name="${esc(quest.id)}" value="${esc(quest.name)}" placeholder="Quest name" />
      <input class="input tiny quest-giver" data-quest-giver="${esc(quest.id)}" value="${esc(quest.giver)}" placeholder="Giver" />
      <input class="input tiny quest-reward" data-quest-reward="${esc(quest.id)}" value="${esc(quest.reward)}" placeholder="Reward" />
      <button type="button" class="danger-btn tiny" data-remove-quest="${esc(quest.id)}">Delete</button>
    </div>
  `).join('')
  return `
    <div class="grid two notes-grid">
      <section class="card notes-card">
        <div class="card-header">
          <div>
            <div class="kicker">Campaign Notes</div>
            <h3>${esc(character.name)}'s Notes</h3>
            <p>Build plans, session reminders, loot lists, and anything your character should remember.</p>
          </div>
          <div class="wrap">
            <span id="notes-status" class="pill ${toneClass}">${statusLabel}</span>
            <button type="button" class="primary-btn tiny" data-save-notes-button>Save Notes</button>
          </div>
        </div>
        <div class="note-pages">
          <div class="note-pages-list">${pageList}</div>
          <button type="button" class="ghost-btn tiny" data-add-note-page>+ Page</button>
        </div>
        ${activePage ? `
          <label class="field-label mt-12" for="note-page-title">Page title</label>
          <input class="input" id="note-page-title" data-note-page-title="${esc(activePage.id)}" value="${esc(activePage.title)}" maxlength="80" />
          <textarea id="character-notes" class="notes-textarea">${esc(activePage.body || '')}</textarea>
          ${(character.notePages || []).length > 1 ? `<button type="button" class="danger-btn tiny mt-12" data-delete-note-page="${esc(activePage.id)}">Delete page</button>` : ''}
        ` : '<div class="empty">No notes pages.</div>'}
      </section>

      <div class="stack">
        <section class="card quest-tracker">
          <div class="card-header">
            <div>
              <div class="kicker">Quest tracker</div>
              <h3>Active quests</h3>
              <p class="subtle">Reminder list only — the table still runs the story.</p>
            </div>
            <button type="button" class="ghost-btn tiny" data-add-quest>+ Quest</button>
          </div>
          <div class="quest-tracker-list">${questRows || '<div class="empty">No quests tracked yet.</div>'}</div>
        </section>

        <section class="card glossary-card">
          <div class="card-header">
            <div>
              <div class="kicker">Rules reference</div>
              <h3>Term Dictionary</h3>
              <p>Plain-language rules, status effects, and damage types — written for casual tables and read-aloud play.</p>
            </div>
          </div>
          <label class="field-label" for="glossary-search">Search terms</label>
          <input class="input glossary-search" id="glossary-search" placeholder="e.g. burn, enchant, barrier, force damage, intimidated…" value="${esc(state.glossarySearch || '')}" />
          ${renderGlossarySection()}
        </section>
      </div>
    </div>
  `
}
