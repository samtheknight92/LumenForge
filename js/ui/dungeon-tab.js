import { esc } from '../core/utils.js'
import { state } from '../core/state.js'
import { isGmMode } from '../gm/gm-mode.js'
import {
  DUNGEON_MIN_ROOMS,
  DUNGEON_MAX_ROOMS,
  DUNGEON_THEMES,
  BOSS_RULE,
  clampRoomCount,
  keyPiecesNeeded,
  roomRule,
  roomTierLabel,
  dungeonTheme,
  keyPiecesFound
} from '../gm/dungeon-maker.js'

/** Dungeon tab (GM Mode only): roll a dice-grid dungeon and see what every room does. */

/** How tough a fight should be, as a share of the party's total Threat Level. */
const FIGHT_SHARE = {
  '2:single': 0.5,
  '2:twin': 0.75,
  '2:grand': 1,
  '6:single': 0.75,
  '6:twin': 1,
  '6:grand': 1
}

function partyThreatTotal() {
  return (state.encounterParty || []).reduce((sum, row) => sum + Number(row.skillLevel || 0) + Number(row.combatPower || 0), 0)
}

function fightLine(share) {
  const total = partyThreatTotal()
  if (!total) return `<p class="subtle">Tip: add your party in GM Tools (Encounter Balancer) and this shows the exact Threat Level to aim for.</p>`
  return `<p><strong>Aim for monsters adding up to about Threat Level ${Math.round(total * share)}</strong> <span class="subtle">(your party's total is ${Math.round(total)})</span>.</p>`
}

function renderControls() {
  const count = clampRoomCount(state.dungeonRoomCount)
  return `
    <section class="card dungeon-controls">
      <div class="gm-strip">
        <div class="gm-strip-copy">
          <div class="kicker">Dungeon Maker</div>
          <h3>Roll a dungeon</h3>
        </div>
        <button type="button" class="primary-btn" data-roll-dungeon>🎲 ${state.gmDungeon ? 'Roll a new dungeon' : 'Roll dungeon'}</button>
      </div>
      <div class="dungeon-control-row mt-12">
        <label class="dungeon-slider">
          <span class="field-label">Rooms (dice): <strong id="dungeon-room-count-label">${count}</strong></span>
          <input type="range" id="dungeon-room-count" min="${DUNGEON_MIN_ROOMS}" max="${DUNGEON_MAX_ROOMS}" step="1" value="${count}" aria-label="Number of dice to roll" />
        </label>
        <label class="dungeon-theme-pick">
          <span class="field-label">Theme</span>
          <select class="input" id="dungeon-theme" aria-label="Dungeon theme">
            <option value="" ${state.dungeonThemeId ? '' : 'selected'}>🎲 Random</option>
            ${DUNGEON_THEMES.map(theme => `<option value="${esc(theme.id)}" ${state.dungeonThemeId === theme.id ? 'selected' : ''}>${esc(theme.name)}</option>`).join('')}
          </select>
        </label>
      </div>
      <p class="subtle mt-8">Each die is a room and its number says what's inside. Touching dice are joined by a door. Matching dice that touch merge into one bigger room. The party starts at the bottom middle and needs <strong id="dungeon-keys-label">${keyPiecesNeeded(count)}</strong> key piece${keyPiecesNeeded(count) === 1 ? '' : 's'} to open the Boss door.</p>
    </section>
  `
}

function linkClasses(dungeon, cell) {
  const at = new Map(dungeon.cells.map(c => [`${c.row},${c.col}`, c]))
  const right = at.get(`${cell.row},${cell.col + 1}`)
  const below = at.get(`${cell.row + 1},${cell.col}`)
  const out = []
  if (right && right.roomId === cell.roomId) out.push('link-r')
  if (below && below.roomId === cell.roomId) out.push('link-b')
  return out.join(' ')
}

function renderMap(dungeon) {
  const firstCellOfRoom = new Map()
  for (const room of dungeon.rooms) firstCellOfRoom.set(room.id, Math.min(...room.cellIds))
  const roomsById = new Map(dungeon.rooms.map(room => [room.id, room]))

  const cells = dungeon.cells.map(cell => {
    const room = roomsById.get(cell.roomId)
    const rule = roomRule(room)
    const isFirst = firstCellOfRoom.get(room.id) === cell.id
    const selected = dungeon.selectedRoomId === room.id
    const classes = [
      'dungeon-cell',
      room.kind === 'entrance' ? 'is-entrance' : `v${room.value}`,
      room.tier !== 'single' ? `tier-${room.tier}` : '',
      room.cleared && room.kind !== 'entrance' ? 'is-cleared' : '',
      selected ? 'is-selected' : '',
      linkClasses(dungeon, cell)
    ].filter(Boolean).join(' ')
    const boss = cell.id === dungeon.bossCellId
      ? `<span class="dungeon-boss-door side-${esc(dungeon.bossSide)}" title="Boss door">💀</span>`
      : ''
    const key = isFirst && room.keyPieces ? `<span class="dungeon-cell-key" title="Key piece${room.keyPieces > 1 ? 's' : ''}">🗝️${room.keyPieces > 1 ? room.keyPieces : ''}</span>` : ''
    return `
      <button type="button" class="${classes}" style="grid-row:${cell.row + 1};grid-column:${cell.col + 1}"
        data-dungeon-select-room="${room.id}" aria-label="Room ${room.number}: ${esc(rule?.name || '')}${room.cleared ? ', cleared' : ''}">
        ${isFirst ? `<span class="dungeon-cell-num">${room.number}</span>` : ''}
        <span class="dungeon-cell-icon" aria-hidden="true">${rule?.icon || ''}</span>
        <span class="dungeon-cell-die" aria-hidden="true">${room.kind === 'entrance' ? 'Start' : cell.value}</span>
        ${room.cleared && room.kind !== 'entrance' ? '<span class="dungeon-cell-done" aria-hidden="true">✓</span>' : ''}${key}${boss}
      </button>
    `
  }).join('')

  const found = keyPiecesFound(dungeon)
  const theme = dungeonTheme(dungeon)
  return `
    <section class="card dungeon-map-card">
      <div class="wrap">
        <span class="pill">${esc(theme.name)}</span>
        <span class="pill gold">🗝️ ${found} / ${dungeon.keyPiecesNeeded} key pieces</span>
        <span class="pill subtle-pill">${dungeon.rooms.length} rooms from ${dungeon.diceCount} dice</span>
      </div>
      <div class="dungeon-map-scroll mt-12">
        <div class="dungeon-map${dungeon.width >= 9 ? ' is-dense' : ''}" style="--dungeon-cols:${dungeon.width};--dungeon-rows:${dungeon.rows}">${cells}</div>
      </div>
      <p class="subtle mt-8">Tap a room to see what it does. 💀 marks the Boss door; tap any room and use "Put Boss door here" to move it.</p>
    </section>
  `
}

function renderRoomDetails(dungeon) {
  const room = dungeon.rooms.find(r => r.id === dungeon.selectedRoomId) || dungeon.rooms[0]
  const rule = roomRule(room)
  const theme = dungeonTheme(dungeon)
  const hasBoss = room.cellIds.includes(dungeon.bossCellId)
  const extras = []

  if (room.trap) extras.push(`<p><strong>The trap:</strong> ${esc(room.trap)}.</p>`)
  if (room.puzzle) extras.push(`<p><strong>The puzzle:</strong> ${esc(room.puzzle)}</p>`)
  if (FIGHT_SHARE[`${room.value}:${room.tier}`] && room.kind === 'room') {
    extras.push(`<p><strong>Monsters:</strong> ${esc(theme.monsters)}.</p>`)
    extras.push(fightLine(FIGHT_SHARE[`${room.value}:${room.tier}`]))
  }
  if (room.treasure.length) {
    extras.push(`
      <div>
        <strong>Treasure${room.value === 5 ? ' (if they solve it)' : ''}:</strong>
        <ul class="dungeon-list">${room.treasure.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
        <p class="subtle">Players add what they find to their own sheet.</p>
      </div>
    `)
  }
  if (room.keyPieces) {
    extras.push(room.hiddenKey
      ? `<p class="dungeon-key-line">🗝️ <strong>A key piece is hidden here.</strong> The party finds it once they've dealt with the room.</p>`
      : `<p class="dungeon-key-line">🗝️ <strong>${room.keyPieces === 1 ? 'A key piece' : `${room.keyPieces} key pieces`}</strong> for the Boss door.</p>`)
  }
  if (hasBoss) {
    extras.push(`
      <div class="dungeon-boss-box">
        <p><strong>💀 ${esc(BOSS_RULE.name)}</strong> ${dungeon.bossSide === 'stairs' ? '(a stairway down from this room)' : `(on the ${esc(dungeon.bossSide)} wall)`}</p>
        <p>${esc(BOSS_RULE.text)}</p>
        ${fightLine(1.5)}
      </div>
    `)
  }

  return `
    <section class="card dungeon-room-card">
      <div class="kicker">Room ${room.number}${roomTierLabel(room) ? ` · ${esc(roomTierLabel(room))}` : ''}</div>
      <h3>${rule?.icon || ''} ${esc(rule?.name || '')}</h3>
      <p class="mt-8">${esc(rule?.text || '')}</p>
      <div class="stack dungeon-room-extras mt-8">${extras.join('')}</div>
      <div class="wrap mt-12">
        ${room.kind === 'entrance' ? '' : `<button type="button" class="${room.cleared ? 'ghost-btn' : 'primary-btn'} tiny" data-dungeon-toggle-cleared="${room.id}">${room.cleared ? '↩ Not cleared yet' : '✓ Mark cleared'}</button>`}
        ${hasBoss || room.kind === 'entrance' ? '' : `<button type="button" class="ghost-btn tiny" data-dungeon-boss-here="${Math.min(...room.cellIds)}">💀 Put Boss door here</button>`}
      </div>
    </section>
  `
}

function renderRoomList(dungeon) {
  const rooms = dungeon.rooms.slice().sort((a, b) => a.number - b.number)
  return `
    <details class="card dungeon-all-rooms" ${state.dungeonListOpen ? 'open' : ''}>
      <summary><span class="kicker">Prep sheet</span> <strong>All ${rooms.length} rooms</strong></summary>
      <div class="dungeon-room-list mt-8">
        ${rooms.map(room => {
          const rule = roomRule(room)
          const bits = []
          if (room.keyPieces) bits.push(`🗝️${room.keyPieces > 1 ? ` ×${room.keyPieces}` : ''}${room.hiddenKey ? ' (hidden)' : ''}`)
          if (room.cellIds.includes(dungeon.bossCellId)) bits.push('💀 Boss door')
          if (room.treasure.length) bits.push(room.treasure.join(', '))
          if (room.trap) bits.push(room.trap)
          return `
            <button type="button" class="dungeon-room-row ${room.cleared && room.kind !== 'entrance' ? 'is-cleared' : ''}" data-dungeon-select-room="${room.id}">
              <span class="dungeon-room-row-num">${room.number}</span>
              <span>${rule?.icon || ''} <strong>${esc(rule?.name || '')}</strong>${bits.length ? ` <span class="subtle">· ${esc(bits.join(' · '))}</span>` : ''}</span>
            </button>
          `
        }).join('')}
      </div>
    </details>
  `
}

export function renderDungeonTab() {
  if (!isGmMode()) {
    return `
      <div class="dungeon-tab">
        <section class="card gm-strip">
          <div class="gm-strip-copy">
            <div class="kicker">Dungeon Maker</div>
            <h3>Turn on GM Mode to use this</h3>
          </div>
          <button type="button" class="primary-btn tiny" data-toggle-gm-mode>Activate GM Mode</button>
        </section>
      </div>
    `
  }
  const dungeon = state.gmDungeon
  return `
    <div class="dungeon-tab">
      ${renderControls()}
      ${dungeon ? `
        <div class="dungeon-layout">
          ${renderMap(dungeon)}
          ${renderRoomDetails(dungeon)}
        </div>
        ${renderRoomList(dungeon)}
      ` : '<section class="card"><p class="subtle">Pick how many rooms you want and press Roll dungeon.</p></section>'}
    </div>
  `
}
