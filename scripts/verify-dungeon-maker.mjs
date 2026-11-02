import { importJs } from './lib/js-import.mjs'

const dm = await importJs('gm/dungeon-maker.js')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Layout: 24 dice = rows of 7, 7, 7 then 3 centred (Sam's layout).
const layout24 = dm.layoutCells(24)
assert(layout24.width === 7 && layout24.rows === 4, `24 dice should be 7 wide, 4 rows (got ${layout24.width}x${layout24.rows})`)
assert(layout24.cells.filter(c => c.row === 3).map(c => c.col).join(',') === '2,3,4', 'last 3 dice should be centred')

// Slider limits.
assert(dm.clampRoomCount(1) === 5 && dm.clampRoomCount(500) === 100, 'room count clamps to 5..100')
assert(dm.gridWidth(100) <= 10, 'grid never wider than 10')
assert(dm.keyPiecesNeeded(24) === 3, '24 dice need 3 key pieces')

function sideOk(dungeon) {
  const neighbours = new Set(dungeon.cells.map(c => `${c.row},${c.col}`))
  const cell = dungeon.cells.find(c => c.id === dungeon.bossCellId)
  const d = { top: [-1, 0], bottom: [1, 0], left: [0, -1], right: [0, 1] }[dungeon.bossSide]
  return d && !neighbours.has(`${cell.row + d[0]},${cell.col + d[1]}`)
}

for (let n = 5; n <= 100; n++) {
  for (let seed = 1; seed <= 20; seed++) {
    const dungeon = dm.generateDungeon({ rooms: n, rng: seeded(seed * 1000 + n) })
    assert(dungeon.cells.length === n, `${n}: wrong dice count`)
    // Every die belongs to exactly one room, and rooms only merge matching touching dice.
    const covered = dungeon.rooms.flatMap(r => r.cellIds).sort((a, b) => a - b)
    assert(covered.length === n && covered.every((id, i) => id === i), `${n}/${seed}: dice not covered exactly once`)
    for (const room of dungeon.rooms) {
      for (const id of room.cellIds) assert(dungeon.cells[id].value === room.value, 'room with mixed dice')
      const expect = room.kind === 'entrance' ? 'single' : room.size >= 3 ? 'grand' : room.size === 2 ? 'twin' : 'single'
      assert(room.tier === expect, `${n}/${seed}: tier ${room.tier} for size ${room.size}`)
      assert(dm.roomRule(room), 'every room has a rule')
    }
    // Two separate rooms that touch never share a number (they would have merged).
    for (const a of dungeon.cells) {
      for (const b of dungeon.cells) {
        const touching = Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1
        if (touching && a.roomId !== b.roomId && a.id !== dungeon.entranceCellId && b.id !== dungeon.entranceCellId) {
          assert(a.value !== b.value, `${n}/${seed}: matching touching dice not merged`)
        }
      }
    }
    // Entrance is the middle of the bottom row.
    const entrance = dungeon.rooms.find(r => r.kind === 'entrance')
    assert(entrance && entrance.cellIds.length === 1 && entrance.cellIds[0] === dungeon.entranceCellId, 'one-die entrance')
    // Enough key pieces, and the Boss door is on an outside wall away from the Entrance.
    const pieces = dungeon.rooms.reduce((s, r) => s + r.keyPieces, 0)
    assert(pieces >= dungeon.keyPiecesNeeded, `${n}/${seed}: only ${pieces} of ${dungeon.keyPiecesNeeded} key pieces`)
    assert(dungeon.bossCellId !== dungeon.entranceCellId, 'boss door not at entrance')
    assert(sideOk(dungeon), `${n}/${seed}: boss door not on an outside wall`)
    // Room numbers 1..R.
    const numbers = dungeon.rooms.map(r => r.number).sort((a, b) => a - b)
    assert(numbers.every((x, i) => x === i + 1), 'room numbers are 1..R')
  }
}

// Saving and loading keeps the dungeon.
const d = dm.generateDungeon({ rooms: 24, rng: seeded(7), themeId: 'forge' })
assert(d.themeId === 'forge', 'chosen theme kept')
const loaded = dm.normalizeDungeon(JSON.parse(JSON.stringify(d)))
assert(loaded && loaded.rooms.length === d.rooms.length, 'dungeon survives save/load')
assert(dm.normalizeDungeon({ cells: [] }) === null, 'broken dungeon rejected')

// Moving the boss door.
const target = d.cells.find(c => c.id !== d.entranceCellId && c.id !== d.bossCellId)
assert(dm.moveBossDoor(d, target.id) && d.bossCellId === target.id, 'boss door moves')
assert(!dm.moveBossDoor(d, d.entranceCellId), 'boss door cannot go on the entrance')

console.log('verify-dungeon-maker: ok')
