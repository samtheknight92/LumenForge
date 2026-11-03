/**
 * Dungeon Maker (GM): roll a grid of d6s, each die is a room.
 * Touching dice are rooms joined by a door. Matching dice that touch merge:
 * two make a Twin room, three or more make a Grand room.
 * The party starts at the bottom-middle die and needs key pieces to open the Boss door.
 *
 * Pure logic, no DOM. Pass `rng` (returns 0..1) for repeatable results in tests.
 */

export const DUNGEON_MIN_ROOMS = 5
export const DUNGEON_MAX_ROOMS = 100
export const DUNGEON_DEFAULT_ROOMS = 24

export const DUNGEON_THEMES = [
  { id: 'crypt', name: 'Flooded crypt', monsters: 'Water, Darkness and undead monsters', weather: 'Rain' },
  { id: 'forge', name: 'Volcanic forge', monsters: 'Fire and Earth monsters', weather: 'Heatwave or Ashfall' },
  { id: 'vault', name: 'Frozen vault', monsters: 'Ice monsters', weather: 'Blizzard' },
  { id: 'bandits', name: 'Bandit hideout', monsters: 'bandits and thugs (use premade NPCs)', weather: '' },
  { id: 'temple', name: 'Overgrown temple', monsters: 'Earth, Wind and Light monsters', weather: 'Fog' },
  { id: 'tower', name: 'Storm tower', monsters: 'Thunder and Wind monsters', weather: 'Thunderstorm' },
  { id: 'warren', name: 'Goblin warren', monsters: 'lots of small monsters', weather: '' },
  { id: 'lab', name: "Wizard's lab", monsters: 'magic creatures and constructs', weather: 'Mana Storm' }
]

const TREASURE_TABLE = [
  roll => `${roll.d6() * 10} Gil`,
  roll => `${(roll.d6() + roll.d6()) * 10} Gil`,
  () => 'A healing potion (or any common consumable)',
  roll => `${roll.d(4) + 1} Lumens`,
  () => 'An Unidentified loot item from the app',
  roll => roll.d6() <= 3 ? 'An Uncommon item' : `${roll.d6() + 2} Lumens`
]

const PUZZLES = [
  'Locked door: Thief skills or a Normal 11 roll to pick it. Bashing it needs Strength (Hard 14) and is noisy: roll 1d6, on a 1 a monster comes to look.',
  "Riddle statue: it asks a riddle (the GM makes one up). Answer it to pass.",
  'Levers: pull them in the right order. Each wrong pull floods the room a little (+5 Stress each).',
  "Elemental lock: a rune that only opens to a spell of the dungeon's element.",
  'Pressure plates: the party has to split up and stand on them all at once.',
  'Rope bridge over a pit: Speed or Strength rolls (Normal 11) to get across. Fail = fall for 1d6 damage and climb back.'
]

const TRAPS = [
  'Dart wall', 'Collapsing floor', 'Swinging blade', 'Poison gas vent', 'Fire jets', 'Freezing mist', 'Rune that zaps', 'Rolling boulder'
]

/** What each die face means, for single rooms, Twin rooms and Grand rooms. */
export const ROOM_RULES = {
  1: {
    single: { name: 'Safe room', icon: '🛏️', text: 'No danger, and fresh water. The party can take one short rest here: heal 1d6 HP, recover 1d6 Stamina, lose 10 Stress, and fill Thirst if that tracker is on.' },
    twin: { name: 'Shrine', icon: '🕯️', text: 'Each player can pray once: roll a d20. 11+ = heal 1d6 HP and gain 1d4 Lumens. 1 to 5 = cursed (the GM picks a status effect). Also safe to rest.' },
    grand: { name: 'Sanctuary', icon: '⛲', text: 'A full rest: all HP and Stamina back and Stress cleared. Each player can also pray (as a Shrine), and nobody can be cursed here.' }
  },
  2: {
    single: { name: 'Monster fight', icon: '⚔️', text: "A fight. Aim for monsters whose Threat Levels add up to about half of the party's." },
    twin: { name: 'Monster lair', icon: '🐺', text: "One bigger fight. Aim for about three quarters of the party's Threat Level." },
    grand: { name: 'Monster nest', icon: '🕸️', text: "A big fight, about as tough as the whole party's Threat Level. Clearing it gives a key piece." }
  },
  3: {
    single: { name: 'Trap', icon: '🪤', text: 'Each player makes a Normal 11 Saving Roll. Fail = 1d6 damage, or a status effect the GM picks.' },
    twin: { name: 'Gauntlet', icon: '🔥', text: 'A long trapped corridor. Each player makes two Hard 14 Saving Rolls. Each fail = 1d6 damage.' },
    grand: { name: 'Death maze', icon: '🌀', text: 'Each player makes three Hard 14 Saving Rolls. Each fail = 1d6 damage. Anyone who gets through without a single fail gains 1d4 Lumens.' }
  },
  4: {
    single: { name: 'Treasure', icon: '💰', text: 'Treasure! Already rolled for you below.' },
    twin: { name: 'Vault', icon: '🏦', text: 'Two treasure finds, the second one better. Already rolled below.' },
    grand: { name: 'Treasure hoard', icon: '👑', text: 'Three treasure finds, all a step better. Already rolled below.' }
  },
  5: {
    single: { name: 'Puzzle room', icon: '🧩', text: 'Brains, not swords. Solving it gives one treasure find.' },
    twin: { name: 'Trader', icon: '🛍️', text: 'A wandering merchant who sells consumables at shop prices. Players pay from their own Gil.' },
    grand: { name: 'Lost library', icon: '📚', text: 'One big puzzle. Solving it reveals where every key piece is hidden, plus two treasure finds.' }
  },
  6: {
    single: { name: 'Key room', icon: '🗝️', text: "A key piece for the Boss door, guarded by a tough monster (about three quarters of the party's Threat Level)." },
    twin: { name: 'Mini-boss', icon: '👹', text: "A mini-boss guards a key piece, about as tough as the party's Threat Level. Also drops one treasure find." },
    grand: { name: "Guardian's hall", icon: '🛡️', text: "A mini-boss, about as tough as the party's Threat Level, holding 2 key pieces." }
  }
}

export const ENTRANCE_RULE = { name: 'Entrance', icon: '🚪', text: 'Where the party starts. Safe: nothing attacks here.' }
export const BOSS_RULE = { name: 'Boss door', icon: '💀', text: "Locked with a special lock. Once the party has every key piece, it opens onto the Boss Room. Aim for a boss about one and a half times the party's Threat Level." }

export function clampRoomCount(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return DUNGEON_DEFAULT_ROOMS
  return Math.min(DUNGEON_MAX_ROOMS, Math.max(DUNGEON_MIN_ROOMS, n))
}

/** How many key pieces the Boss lock needs: 3 for 24 dice, 1 for a tiny dungeon, up to 10 for a huge one. */
export function keyPiecesNeeded(diceCount) {
  return Math.min(10, Math.max(1, Math.round(clampRoomCount(diceCount) / 8)))
}

/** Grid width: 7 for 24 dice (like Sam's layout), never more than 10 so it fits a phone. */
export function gridWidth(diceCount) {
  return Math.min(10, Math.max(3, Math.round(Math.sqrt(clampRoomCount(diceCount) * 2))))
}

/** Lay out the dice: full rows, then whatever is left over centred along the bottom. */
export function layoutCells(diceCount) {
  const count = clampRoomCount(diceCount)
  const width = gridWidth(count)
  const fullRows = Math.floor(count / width)
  const leftover = count % width
  const cells = []
  for (let row = 0; row < fullRows; row++) {
    for (let col = 0; col < width; col++) cells.push({ row, col })
  }
  if (leftover) {
    const offset = Math.floor((width - leftover) / 2)
    for (let i = 0; i < leftover; i++) cells.push({ row: fullRows, col: offset + i })
  }
  const rows = fullRows + (leftover ? 1 : 0)
  return { width, rows, cells: cells.map((cell, index) => ({ ...cell, id: index })) }
}

function makeRoller(rng) {
  const d = sides => 1 + Math.floor(rng() * sides)
  return { d, d6: () => d(6), pick: list => list[Math.floor(rng() * list.length)] }
}

const DIRS = [[-1, 0, 'top'], [0, 1, 'right'], [1, 0, 'bottom'], [0, -1, 'left']]

function neighbourMap(cells) {
  const at = new Map(cells.map(cell => [`${cell.row},${cell.col}`, cell]))
  const map = new Map()
  for (const cell of cells) {
    map.set(cell.id, DIRS.map(([dr, dc, side]) => ({ side, cell: at.get(`${cell.row + dr},${cell.col + dc}`) || null })))
  }
  return map
}

function rollTreasure(roll, bonus = 0) {
  const face = Math.min(6, roll.d6() + bonus)
  return TREASURE_TABLE[face - 1](roll)
}

function tierForSize(size) {
  if (size >= 3) return 'grand'
  if (size === 2) return 'twin'
  return 'single'
}

function baseKeyPieces(value, tier) {
  if (value === 6) return tier === 'grand' ? 2 : 1
  if (value === 2 && tier === 'grand') return 1
  return 0
}

function treasureFor(value, tier, size, roll) {
  const finds = []
  if (value === 4) {
    if (tier === 'single') finds.push(rollTreasure(roll))
    if (tier === 'twin') finds.push(rollTreasure(roll), rollTreasure(roll, 1))
    if (tier === 'grand') for (let i = 0; i < 3; i++) finds.push(rollTreasure(roll, 1))
  }
  if (value === 5 && tier === 'single') finds.push(rollTreasure(roll))
  if (value === 5 && tier === 'grand') finds.push(rollTreasure(roll), rollTreasure(roll))
  if (value === 6 && tier === 'twin') finds.push(rollTreasure(roll))
  // Every die past three in a Grand room adds one more find.
  if (tier === 'grand') for (let i = 3; i < size; i++) finds.push(rollTreasure(roll))
  return finds
}

/** Roll a whole dungeon. */
export function generateDungeon({ rooms = DUNGEON_DEFAULT_ROOMS, themeId = '', rng = Math.random } = {}) {
  const roll = makeRoller(rng)
  const diceCount = clampRoomCount(rooms)
  const layout = layoutCells(diceCount)
  const cells = layout.cells.map(cell => ({ ...cell, value: roll.d6(), roomId: -1 }))
  const neighbours = neighbourMap(cells)

  // Entrance: middle of the bottom row.
  const bottomRow = Math.max(...cells.map(cell => cell.row))
  const bottomCells = cells.filter(cell => cell.row === bottomRow)
  const entranceCell = bottomCells[Math.floor((bottomCells.length - 1) / 2)]

  // Group touching dice with the same number into one room.
  const roomsOut = []
  for (const cell of cells) {
    if (cell.roomId !== -1) continue
    const roomId = roomsOut.length
    const group = [cell]
    cell.roomId = roomId
    if (cell !== entranceCell) {
      for (let i = 0; i < group.length; i++) {
        for (const { cell: next } of neighbours.get(group[i].id)) {
          if (next && next.roomId === -1 && next !== entranceCell && next.value === cell.value) {
            next.roomId = roomId
            group.push(next)
          }
        }
      }
    }
    const isEntrance = cell === entranceCell
    const tier = isEntrance ? 'single' : tierForSize(group.length)
    roomsOut.push({
      id: roomId,
      number: 0,
      cellIds: group.map(c => c.id),
      value: cell.value,
      size: group.length,
      tier,
      kind: isEntrance ? 'entrance' : 'room',
      keyPieces: isEntrance ? 0 : baseKeyPieces(cell.value, tier),
      hiddenKey: false,
      treasure: isEntrance ? [] : treasureFor(cell.value, tier, group.length, roll),
      puzzle: !isEntrance && cell.value === 5 && tier !== 'twin' ? roll.pick(PUZZLES) : '',
      trap: !isEntrance && cell.value === 3 ? roll.pick(TRAPS) : '',
      cleared: isEntrance
    })
  }

  // Number rooms top-left to bottom-right, by their first die.
  roomsOut
    .slice()
    .sort((a, b) => Math.min(...a.cellIds) - Math.min(...b.cellIds))
    .forEach((room, index) => { room.number = index + 1 })

  // Make sure there are enough key pieces: hide the missing ones in fights, traps and puzzles.
  const needed = keyPiecesNeeded(diceCount)
  let total = roomsOut.reduce((sum, room) => sum + room.keyPieces, 0)
  const hideable = rooms => rooms.filter(room => room.kind === 'room' && room.keyPieces === 0)
  let pool = hideable(roomsOut).filter(room => [2, 3, 5].includes(room.value))
  if (pool.length < needed - total) pool = hideable(roomsOut)
  while (total < needed && pool.length) {
    const index = Math.floor(rng() * pool.length)
    const room = pool.splice(index, 1)[0]
    room.keyPieces = 1
    room.hiddenKey = true
    total++
  }

  const theme = DUNGEON_THEMES.find(t => t.id === themeId) || roll.pick(DUNGEON_THEMES)

  const dungeon = {
    version: 2,
    diceCount,
    width: layout.width,
    rows: layout.rows,
    themeId: theme.id,
    keyPiecesNeeded: needed,
    keyPiecesTotal: total,
    entranceCellId: entranceCell.id,
    bossCellId: 0,
    bossSide: 'top',
    cells: cells.map(({ id, row, col, value, roomId }) => ({ id, row, col, value, roomId })),
    rooms: roomsOut,
    selectedRoomId: roomsOut[entranceCell.roomId].id,
    doors: []
  }
  dungeon.doors = generateDoors(dungeon, rng)
  const boss = suggestBossDoor(dungeon)
  dungeon.bossCellId = boss.cellId
  dungeon.bossSide = boss.side
  return dungeon
}

/** Share of the extra walls (beyond what's needed to reach every room) that also get a door, for a few loops. */
export const EXTRA_DOOR_CHANCE = 0.2

const doorKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`)

/** Every place two different rooms touch, grouped by the pair of rooms. */
function roomBorders(dungeon) {
  const byPair = new Map()
  const neighbours = neighbourMap(dungeon.cells)
  for (const cell of dungeon.cells) {
    for (const { side, cell: next } of neighbours.get(cell.id)) {
      if (!next || (side !== 'right' && side !== 'bottom') || next.roomId === cell.roomId) continue
      const key = doorKey(cell.roomId, next.roomId)
      if (!byPair.has(key)) byPair.set(key, { rooms: [cell.roomId, next.roomId], edges: [] })
      byPair.get(key).edges.push({ a: cell.id, b: next.id })
    }
  }
  return [...byPair.values()]
}

/**
 * Random doors between rooms. First a random "tree" of doors that reaches every room
 * (so nothing is ever cut off from the Entrance), then a few extra doors for loops and shortcuts.
 */
export function generateDoors(dungeon, rng = Math.random, extraChance = EXTRA_DOOR_CHANCE) {
  const borders = roomBorders(dungeon)
  for (let i = borders.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[borders[i], borders[j]] = [borders[j], borders[i]]
  }
  const parent = new Map(dungeon.rooms.map(room => [room.id, room.id]))
  const find = id => {
    while (parent.get(id) !== id) {
      parent.set(id, parent.get(parent.get(id)))
      id = parent.get(id)
    }
    return id
  }
  const doors = []
  const addDoor = border => {
    const edge = border.edges[Math.floor(rng() * border.edges.length)]
    doors.push({ a: Math.min(edge.a, edge.b), b: Math.max(edge.a, edge.b) })
  }
  const leftover = []
  for (const border of borders) {
    const [x, y] = border.rooms.map(find)
    if (x !== y) {
      parent.set(x, y)
      addDoor(border)
    } else {
      leftover.push(border)
    }
  }
  for (const border of leftover) if (rng() < extraChance) addDoor(border)
  return doors.sort((p, q) => p.a - q.a || p.b - q.b)
}

/** Set of "a-b" cell pairs that have a door between them. */
export function doorSet(dungeon) {
  return new Set((dungeon?.doors || []).map(door => doorKey(door.a, door.b)))
}

/** Rooms you can walk to from this room through a door, by room id. */
export function roomExits(dungeon, roomId) {
  const byId = new Map(dungeon.cells.map(cell => [cell.id, cell]))
  const out = new Set()
  for (const door of dungeon.doors || []) {
    const a = byId.get(door.a)
    const b = byId.get(door.b)
    if (!a || !b) continue
    if (a.roomId === roomId) out.add(b.roomId)
    if (b.roomId === roomId) out.add(a.roomId)
  }
  return [...out]
}

/** Steps from the Entrance to every die, walking through rooms and their doors. */
export function distancesFromEntrance(dungeon) {
  const neighbours = neighbourMap(dungeon.cells)
  const doors = doorSet(dungeon)
  const useDoors = Array.isArray(dungeon.doors)
  const dist = new Map([[dungeon.entranceCellId, 0]])
  const queue = [dungeon.entranceCellId]
  while (queue.length) {
    const id = queue.shift()
    const here = dungeon.cells[id]
    for (const { cell } of neighbours.get(id)) {
      const open = cell && (!useDoors || cell.roomId === here.roomId || doors.has(doorKey(id, cell.id)))
      if (open && !dist.has(cell.id)) {
        dist.set(cell.id, dist.get(id) + 1)
        queue.push(cell.id)
      }
    }
  }
  return dist
}

/** Which outer side of a die the Boss door can go on (null if the die is fully surrounded). */
export function openSide(dungeon, cellId) {
  const neighbours = neighbourMap(dungeon.cells).get(cellId) || []
  const order = ['top', 'left', 'right', 'bottom']
  const free = neighbours.filter(n => !n.cell).map(n => n.side)
  return order.find(side => free.includes(side)) || null
}

/** Default Boss door: the outer edge die furthest from the Entrance. */
export function suggestBossDoor(dungeon) {
  const dist = distancesFromEntrance(dungeon)
  let best = null
  for (const cell of dungeon.cells) {
    if (cell.id === dungeon.entranceCellId) continue
    const side = openSide(dungeon, cell.id)
    if (!side) continue
    const d = dist.get(cell.id) ?? 0
    if (!best || d > best.d || (d === best.d && cell.id < best.cellId)) best = { cellId: cell.id, side, d }
  }
  return best ? { cellId: best.cellId, side: best.side } : { cellId: 0, side: 'top' }
}

/** Move the Boss door to another die. Inner dice get it on the top side (the GM can say it's a stairway). */
export function moveBossDoor(dungeon, cellId) {
  const cell = dungeon.cells.find(c => c.id === Number(cellId))
  if (!cell || cell.id === dungeon.entranceCellId) return false
  dungeon.bossCellId = cell.id
  dungeon.bossSide = openSide(dungeon, cell.id) || 'stairs'
  return true
}

export function roomRule(room) {
  if (!room) return null
  if (room.kind === 'entrance') return ENTRANCE_RULE
  return ROOM_RULES[room.value]?.[room.tier] || null
}

export function roomTierLabel(room) {
  if (!room || room.kind === 'entrance') return ''
  if (room.tier === 'twin') return `Twin room (two ${room.value}s)`
  if (room.tier === 'grand') return `Grand room (${room.size} × ${room.value}s)`
  return `Rolled a ${room.value}`
}

export function dungeonTheme(dungeon) {
  return DUNGEON_THEMES.find(t => t.id === dungeon?.themeId) || DUNGEON_THEMES[0]
}

/** Key pieces the party has found so far (from cleared rooms). */
export function keyPiecesFound(dungeon) {
  return (dungeon?.rooms || []).filter(room => room.cleared).reduce((sum, room) => sum + (room.keyPieces || 0), 0)
}

export function roomCounts(dungeon) {
  const counts = {}
  for (const room of dungeon?.rooms || []) {
    const rule = roomRule(room)
    if (!rule) continue
    counts[rule.name] = (counts[rule.name] || 0) + 1
  }
  return counts
}

/** Loose check when loading a saved dungeon. Returns null if it doesn't look right. */
export function normalizeDungeon(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (!Array.isArray(raw.cells) || !Array.isArray(raw.rooms) || !raw.cells.length || !raw.rooms.length) return null
  const roomIds = new Set(raw.rooms.map(room => room?.id))
  if (raw.cells.some(cell => !cell || !roomIds.has(cell.roomId))) return null
  const cellIds = new Set(raw.cells.map(cell => cell.id))
  const doors = Array.isArray(raw.doors)
    ? raw.doors.filter(door => door && cellIds.has(door.a) && cellIds.has(door.b)).map(door => ({ a: Number(door.a), b: Number(door.b) }))
    : generateDoors(raw)
  return {
    ...raw,
    doors,
    diceCount: clampRoomCount(raw.diceCount),
    rooms: raw.rooms.map(room => ({
      ...room,
      treasure: Array.isArray(room.treasure) ? room.treasure.map(String) : [],
      cleared: Boolean(room.cleared)
    }))
  }
}
