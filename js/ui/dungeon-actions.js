/** Dungeon Maker actions (GM Mode). */
import { state } from '../core/state.js'
import { save } from '../core/storage.js'
import { render } from './render.js'
import { toast } from '../core/utils.js'
import { generateDungeon, moveBossDoor, clampRoomCount, DUNGEON_THEMES } from '../gm/dungeon-maker.js'

function refresh() {
  save()
  render({ content: true })
}

export function rollDungeon() {
  state.gmDungeon = generateDungeon({ rooms: state.dungeonRoomCount, themeId: state.dungeonThemeId })
  state.dungeonSheetOpen = false
  refresh()
  toast(`Rolled a ${state.gmDungeon.rooms.length}-room dungeon.`)
}

export function setDungeonRoomCount(value) {
  state.dungeonRoomCount = clampRoomCount(value)
  save()
}

export function setDungeonTheme(themeId) {
  state.dungeonThemeId = DUNGEON_THEMES.some(theme => theme.id === themeId) ? themeId : ''
  save()
}

export function selectDungeonRoom(roomId) {
  const dungeon = state.gmDungeon
  if (!dungeon) return
  const id = Number(roomId)
  if (!dungeon.rooms.some(room => room.id === id)) return
  dungeon.selectedRoomId = id
  state.dungeonSheetOpen = true
  refresh()
}

export function toggleDungeonRoomCleared(roomId) {
  const room = state.gmDungeon?.rooms.find(r => r.id === Number(roomId))
  if (!room || room.kind === 'entrance') return
  room.cleared = !room.cleared
  refresh()
}

export function putDungeonBossDoorHere(cellId) {
  const dungeon = state.gmDungeon
  if (!dungeon || !moveBossDoor(dungeon, cellId)) return
  refresh()
  toast('Boss door moved.')
}

export function rememberDungeonListOpen(open) {
  state.dungeonListOpen = Boolean(open)
}

export function closeDungeonSheet() {
  state.dungeonSheetOpen = false
  render({ content: true })
}
