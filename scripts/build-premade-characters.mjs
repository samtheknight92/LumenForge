#!/usr/bin/env node
/**
 * Builds the full leveled premade roster: 3 NPCs + 3 Monsters per Threat Level
 * 1-50, and 3 Pedestrians per Threat Level 1-15 (345 total), plus the 4
 * hand-authored Level 5 player-starter sheets loaded verbatim.
 *
 * For every (category, level, slot) this:
 *   1. Rotates through the hand-authored archetype/family/variant pool so each
 *      level's trio differs from its neighbors, and applies an occasional
 *      "lopsided"/"glass cannon" stat-shape variant (~1-in-4) per archetype.
 *   2. Picks a level-appropriate skill set from the archetype's skill pool
 *      (expanded through prerequisite chains) and level-appropriate gear.
 *   3. Solves for the exact stat spread that hits the target Threat Level
 *      using the REAL js/threat-level.js formula (see threat-solver.mjs), so
 *      what's written here always matches what the app shows a GM.
 *   4. Writes a notes summary explaining why the build looks the way it does.
 *
 * Run: node scripts/build-premade-characters.mjs (also runs as part of
 * `npm run build-data`).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { loadRuntimeFormulas, solveStatsForThreatLevel } from './lib/threat-solver.mjs'
import {
  loadGeneratorData,
  expandSkillTargets,
  makeInventory,
  monsterDropLoot,
  isHumanoidMonster,
  lumenDropForLevel,
  gilDropForLevel,
  formatDefeatLootNote,
  HUMANOID_MONSTER_GIL
} from './lib/premade-generator.mjs'
import {
  LEVEL_BANDS,
  bandIndexForLevel,
  tierCapForLevel,
  gearFraction,
  targetSkillCount,
  NPC_BAND_PREFIX,
  WEAPON_TIERS,
  ARMOR_TRACKS,
  OFFHAND_TRACKS,
  ACCESSORY_BY_FOCUS,
  POTION_BANDS,
  NPC_ARCHETYPES,
  MONSTER_FAMILIES,
  PEDESTRIAN_VARIANTS
} from './lib/leveled-premade-data.mjs'
import { buildPremadeNotes } from './lib/premade-notes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const sourceDir = path.join(root, 'data', 'premade-characters')
const outPath = path.join(root, 'data', 'json', 'premade-characters.json')

const generatorData = loadGeneratorData(root)
const { skillById, itemIds, monsterLoot, toggleSkills } = generatorData
const itemById = (() => {
  const itemsRoot = JSON.parse(fs.readFileSync(path.join(root, 'data', 'json', 'items.json'), 'utf8'))
  const map = new Map()
  for (const group of Object.values(itemsRoot)) {
    if (!group || typeof group !== 'object') continue
    for (const item of Object.values(group)) if (item?.id) map.set(item.id, item)
  }
  return map
})()

const runtime = await loadRuntimeFormulas(root)

// ─── Rotation + variant helpers ───

/** Coprime stride per pool size so 3 slots at any level are always distinct archetypes. */
function strideFor(poolSize) {
  for (const candidate of [5, 4, 3, 2]) {
    if (candidate < poolSize && gcd(candidate, poolSize) === 1) return candidate
  }
  return 1
}
function gcd(a, b) { return b === 0 ? a : gcd(b, a % b) }

function pickFromPool(pool, level, slotIndex) {
  const step = strideFor(pool.length)
  const offset = (level - 1) % pool.length
  return pool[(offset + slotIndex * step) % pool.length]
}

/** ~1-in-4 chance of a deliberately unbalanced build, split between two flavors. */
function pickVariant(level, slotIndex) {
  const cycle = (level + slotIndex * 5) % 4
  if (cycle !== 3) return 'pure'
  return level % 2 === 0 ? 'lopsided' : 'glass'
}

function normalizeShape(shape) {
  const out = { hp: 0, stamina: 0, strength: 0, magicPower: 0, accuracy: 0, speed: 0, physicalDefence: 0, magicalDefence: 0, ...shape }
  if (out.hp <= 0) out.hp = 0.2
  if (out.stamina <= 0) out.stamina = 0.1
  return out
}

function applyVariant(shape, variant) {
  const out = { ...shape }
  const entries = Object.entries(shape)
    .filter(([stat, weight]) => weight > 0 && stat !== 'hp' && stat !== 'stamina')
    .sort((a, b) => b[1] - a[1])
  if (variant === 'lopsided') {
    const [primaryKey] = entries[0] || []
    const [secondaryKey] = entries[1] || []
    if (primaryKey && secondaryKey) {
      out[primaryKey] = shape[primaryKey] + shape[secondaryKey] * 0.9
      out[secondaryKey] = shape[secondaryKey] * 0.05
    }
  } else if (variant === 'glass') {
    const [primaryKey] = entries[0] || []
    if (primaryKey) out[primaryKey] = shape[primaryKey] * 1.6
    out.physicalDefence = (shape.physicalDefence || 0) * 0.15
    out.magicalDefence = (shape.magicalDefence || 0) * 0.15
  }
  return out
}

// ─── Skill / gear selection ───

function selectSkillTargets(archetype, category, level) {
  const tierCap = tierCapForLevel(category, level)
  const count = targetSkillCount(level)
  const pool = (archetype.skillPool || []).filter(id => (skillById.get(id)?.tier || 1) <= tierCap)
  const targets = pool.slice(0, count)
  if (level >= 46 && archetype.capstone && skillById.has(archetype.capstone)) {
    targets.push(archetype.capstone)
  }
  return targets
}

function pickFromTrack(list, level) {
  if (!list || !list.length) return null
  const idx = Math.round(gearFraction(level) * (list.length - 1))
  return list[idx] || null
}

function buildGear(archetype, level) {
  const specs = []
  const weaponId = archetype.weaponKind && archetype.weaponKind !== 'striker'
    ? pickFromTrack(WEAPON_TIERS[archetype.weaponKind], level)
    : null
  if (weaponId) specs.push({ itemId: weaponId, qty: 1, equip: 'weapon' })

  const offhandId = archetype.offhandTrack ? pickFromTrack(OFFHAND_TRACKS[archetype.offhandTrack], level) : null
  if (offhandId) specs.push({ itemId: offhandId, qty: 1, equip: 'offhand' })

  const armorId = archetype.armorTrack ? pickFromTrack(ARMOR_TRACKS[archetype.armorTrack], level) : null
  if (armorId) specs.push({ itemId: armorId, qty: 1, equip: 'armor' })

  const accessoryList = ACCESSORY_BY_FOCUS[archetype.accessoryFocus] || ACCESSORY_BY_FOCUS.generic
  const accessoryId = pickFromTrack(accessoryList, level)
  if (accessoryId) specs.push({ itemId: accessoryId, qty: 1, equip: 'accessory' })

  const potionBand = POTION_BANDS[Math.min(POTION_BANDS.length - 1, bandIndexForLevel('npc', level))]
  for (const potion of potionBand) specs.push({ ...potion })

  return { specs, gearIds: [weaponId, offhandId, armorId, accessoryId].filter(Boolean) }
}

// ─── Core build ───

let sequence = 0
function buildEntry({ category, level, slotIndex, archetype, name, race, elementalAffinity = '' }) {
  const variant = pickVariant(level, slotIndex)
  const shape = normalizeShape(applyVariant(archetype.shape, variant))

  const targets = selectSkillTargets(archetype, category, level)
  const toggleTargets = (archetype.toggles || []).filter(id => skillById.has(id))
  const expandedSkills = expandSkillTargets([...targets, ...toggleTargets], skillById)
  const activeToggles = expandedSkills.filter(id => toggleSkills.has(id) && toggleTargets.includes(id))

  const { specs: gearSpecs, gearIds } = buildGear(archetype, level)
  const dropSpecs = category === 'monster' ? monsterDropLoot(expandedSkills, monsterLoot, itemIds) : []
  const { inventory, equipped } = makeInventory([...gearSpecs, ...dropSpecs], itemIds)

  const characterBase = {
    race,
    skills: expandedSkills,
    equipped,
    inventory,
    activeToggles,
    statusEffects: [],
    elementalAffinity
  }

  const solved = solveStatsForThreatLevel({
    computeThreatLevel: runtime.computeThreatLevel,
    characterBase,
    shape,
    targetThreat: level
  })

  const isHumanoid = category === 'pedestrian' || category === 'npc' || Boolean(archetype.isHumanoid)
  const lumens = lumenDropForLevel(solved.achievedThreatLevel)
  const gil = category === 'monster'
    ? (archetype.isHumanoid ? HUMANOID_MONSTER_GIL : 0)
    : gilDropForLevel(solved.achievedThreatLevel)

  const skillNames = targets.map(id => skillById.get(id)?.name).filter(Boolean)
  const gearNames = gearIds.map(id => itemById.get(id)?.name).filter(Boolean)
  let notes = buildPremadeNotes({
    name,
    concept: archetype.concept,
    level,
    threatLevel: solved.achievedThreatLevel,
    stats: solved.stats,
    shape,
    variant,
    skillNames,
    gearNames
  })
  if (dropSpecs.length) {
    notes = [notes, `Potential defeat drops: ${dropSpecs.map(row => row.itemId).join(', ')}.`].filter(Boolean).join(' ')
  }
  notes = [notes, formatDefeatLootNote(lumens, gil)].filter(Boolean).join(' ')

  sequence += 1
  return {
    premadeId: `${category}_${archetype.key}_lv${String(level).padStart(2, '0')}_${sequence.toString(36)}`,
    name,
    race,
    category,
    elementalAffinity,
    lumens,
    gil,
    stats: solved.stats,
    skills: expandedSkills,
    activeToggles,
    statusEffects: [],
    inventory,
    equipped,
    notes,
    _debug: { targetThreat: level, achievedThreatLevel: solved.achievedThreatLevel, variant, archetype: archetype.key }
  }
}

const entries = []

for (let level = 1; level <= 50; level += 1) {
  for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
    const archetype = pickFromPool(NPC_ARCHETYPES, level, slotIndex)
    const band = bandIndexForLevel('npc', level)
    entries.push(buildEntry({
      category: 'npc',
      level,
      slotIndex,
      archetype,
      name: `${NPC_BAND_PREFIX[band]}${archetype.label}`,
      race: 'human'
    }))
  }
}

for (let level = 1; level <= 50; level += 1) {
  for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
    const family = pickFromPool(MONSTER_FAMILIES, level, slotIndex)
    const band = bandIndexForLevel('monster', level)
    entries.push(buildEntry({
      category: 'monster',
      level,
      slotIndex,
      archetype: family,
      name: family.ladder[band],
      race: 'monster'
    }))
  }
}

for (let level = 1; level <= 15; level += 1) {
  for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
    const variant = pickFromPool(PEDESTRIAN_VARIANTS, level, slotIndex)
    const band = bandIndexForLevel('pedestrian', level)
    entries.push(buildEntry({
      category: 'pedestrian',
      level,
      slotIndex,
      archetype: variant,
      name: variant.ladder[band],
      race: variant.race
    }))
  }
}

// ─── Level 5 player-starter sheets — hand-authored, loaded verbatim ───

const LEVEL5_FILES = ['Level5_Swordsman_character.json', 'Level5_Staff_Mage_character.json', 'Level5_Rogue_character.json', 'Level5_Archer_character.json']
const starters = LEVEL5_FILES.map(file => JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8')))

const allEntries = [...entries, ...starters]

const ids = new Set()
for (const entry of allEntries) {
  if (ids.has(entry.premadeId)) throw new Error(`Duplicate premadeId: ${entry.premadeId}`)
  ids.add(entry.premadeId)
}

// Strip the internal debug field before writing — it's only for the console summary below.
const output = allEntries.map(({ _debug, ...rest }) => rest)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')

const deviations = entries.map(e => Math.abs(e._debug.achievedThreatLevel - e._debug.targetThreat))
const maxDeviation = Math.max(0, ...deviations)
const offTarget = deviations.filter(d => d > 0).length
const variantCounts = entries.reduce((acc, e) => {
  acc[e._debug.variant] = (acc[e._debug.variant] || 0) + 1
  return acc
}, {})

console.log(`Built ${output.length} premade characters (${entries.length} leveled + ${starters.length} Level 5 starters).`)
console.log(`  NPC: ${entries.filter(e => e.category === 'npc').length} · Monster: ${entries.filter(e => e.category === 'monster').length} · Pedestrian: ${entries.filter(e => e.category === 'pedestrian').length}`)
console.log(`  Threat Level accuracy: ${entries.length - offTarget}/${entries.length} exact, max deviation ${maxDeviation}`)
console.log(`  Variant mix: ${Object.entries(variantCounts).map(([k, v]) => `${k}=${v}`).join(' · ')}`)

if (process.env.DEBUG_PREMADE_DEVIATIONS) {
  const worst = entries
    .map(e => ({ id: e.premadeId, name: e.name, target: e._debug.targetThreat, achieved: e._debug.achievedThreatLevel, variant: e._debug.variant, archetype: e._debug.archetype }))
    .filter(e => e.achieved !== e.target)
    .sort((a, b) => Math.abs(b.achieved - b.target) - Math.abs(a.achieved - a.target))
    .slice(0, 30)
  console.log('\nWorst Threat Level deviations:')
  for (const w of worst) console.log(`  ${w.name} (${w.archetype}, ${w.variant}) target=${w.target} achieved=${w.achieved}`)
}
