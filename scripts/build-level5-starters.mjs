#!/usr/bin/env node
/**
 * Generate four level-5 starter builds in data/premade-characters/.
 * Budget: 113 starting Lumens · level 5 · tier 2 max · combat stats before HP padding.
 * Run: node scripts/build-level5-starters.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { minLevelForTier } from './lib/progression.mjs'
import { getStatCostForPurchasedCount } from './lib/stat-costs.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'data', 'premade-characters')

const DEFAULT_STATS = {
  hp: 10,
  stamina: 10,
  strength: -3,
  magicPower: -3,
  accuracy: -3,
  speed: 2,
  physicalDefence: 8,
  magicalDefence: 8
}

const START_LUMEN = 113
const START_GIL = 2400

function progressiveStatSpend(purchases, stat) {
  let total = 0
  for (let i = 0; i < purchases; i++) total += getStatCostForPurchasedCount(stat, i)
  return total
}

const CURRENCY = { gold: 2500, silver: 100, copper: 1 }
const itemsRoot = JSON.parse(fs.readFileSync(path.join(root, 'data', 'json', 'items.json'), 'utf8'))
const skillsRoot = JSON.parse(fs.readFileSync(path.join(root, 'data', 'json', 'skills.json'), 'utf8'))
const skillMeta = JSON.parse(fs.readFileSync(path.join(root, 'data', 'json', 'skill-meta.json'), 'utf8'))

const skillById = new Map()
function walkSkills(node) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const s of node) if (s?.id) skillById.set(s.id, s)
    return
  }
  for (const v of Object.values(node)) walkSkills(v)
}
walkSkills(skillsRoot)

function itemGil(itemId) {
  for (const group of Object.values(itemsRoot)) {
    const item = group?.[itemId]
    if (!item?.price) continue
    const p = item.price
    return (Number(p.gold || 0) * CURRENCY.gold) + (Number(p.silver || 0) * CURRENCY.silver) + Number(p.copper || 0)
  }
  return 0
}

function tierLevel(t) {
  return Number(t || 1) / 5
}

function statLevelValue(statKey) {
  return statKey === 'hp' || statKey === 'stamina' ? tierLevel(1) : tierLevel(2)
}

function auditBuild(build) {
  let skillLevels = 0
  let skillLumen = 0
  for (const id of build.skills) {
    const skill = skillById.get(id)
    if (!skill) throw new Error(`Missing skill: ${id}`)
    skillLevels += tierLevel(skill.tier)
    skillLumen += Number(skill.cost || 0)
  }
  let statLevels = 0
  let statLumen = 0
  for (const [stat, base] of Object.entries(DEFAULT_STATS)) {
    const value = build.stats[stat] ?? base
    const purchases = Math.max(0, value - base)
    statLevels += purchases * statLevelValue(stat)
    statLumen += progressiveStatSpend(purchases, stat)
  }
  let gilSpent = 0
  for (const itemId of Object.values(build.equip)) gilSpent += itemGil(itemId)
  for (const row of build.itemRows) gilSpent += itemGil(row.itemId) * row.qty

  const level = Math.floor(skillLevels + statLevels)
  const lumenSpent = skillLumen + statLumen
  const lumenEarned = Math.max(0, lumenSpent - START_LUMEN)
  const gilEarned = Math.max(0, gilSpent - START_GIL)

  for (const id of build.skills) {
    const skill = skillById.get(id)
    const need = minLevelForTier(skill.tier)
    if (need > level) {
      throw new Error(`${id} (tier ${skill.tier}) requires level ${need}, build is ${level}`)
    }
  }

  return {
    level,
    skillLevels,
    statLevels,
    skillLumen,
    statLumen,
    lumenSpent,
    gilSpent,
    lumenEarned,
    gilEarned,
    lumensWallet: START_LUMEN + lumenEarned - lumenSpent,
    gilWallet: START_GIL + gilEarned - gilSpent
  }
}

function makeCharacter(spec) {
  const stats = { ...DEFAULT_STATS, ...spec.statOverrides }
  const inventory = []
  const equipped = { weapon: null, offhand: null, armor: null, accessory: null }
  let idx = 0

  for (const row of spec.itemRows) {
    inventory.push({ uid: `${spec.premadeId}_${row.itemId}_${idx++}`, itemId: row.itemId, qty: row.qty })
  }
  for (const [slot, itemId] of Object.entries(spec.equip)) {
    let entry = inventory.find(r => r.itemId === itemId)
    if (!entry) {
      entry = { uid: `${spec.premadeId}_${itemId}_${idx++}`, itemId, qty: 1 }
      inventory.push(entry)
    }
    equipped[slot] = entry.uid
  }

  const draft = { skills: spec.skills, stats, equip: spec.equip, itemRows: spec.itemRows }
  const audit = auditBuild(draft)

  if (audit.level !== 5) throw new Error(`${spec.name}: expected level 5, got ${audit.level} (${audit.skillLevels.toFixed(1)}+${audit.statLevels.toFixed(1)})`)
  // Progressive pricing may exceed the 113L creation wallet; remainder is treated as post-creation loot spend.

  const spendNote = [
    `Quick-Start sheet — legacy combined level ${audit.level} (diagnostic only).`,
    `Spent ${audit.lumenSpent} Lumens (${audit.skillLumen} skills + ${audit.statLumen} stats)`,
    `and ${audit.gilSpent} Gil on gear.`,
    audit.lumensWallet ? `Banked ${audit.lumensWallet} Lumens after creation.` : ''
  ].filter(Boolean).join(' ')

  return {
    premadeId: spec.premadeId,
    name: spec.name,
    race: 'human',
    category: 'npc',
    elementalAffinity: '',
    lumens: audit.lumensWallet,
    gil: audit.gilWallet,
    stats,
    skills: spec.skills,
    activeToggles: [],
    statusEffects: [],
    inventory,
    equipped,
    notes: [spec.note, spendNote].filter(Boolean).join(' ')
  }
}

/**
 * Four skills (3 weapon/magic + 1 career T1) + one T2 attack.
 * Combined diagnostic level still includes stats; Skill Level in-app is skills-only.
 * Progressive pricing may spend more than 113L — the sheet banks 0 and notes loot spend.
 */
const STARTERS = [
  {
    file: 'Level5_Swordsman_character.json',
    premadeId: 'level5_swordsman',
    name: 'Quick-Start Swordsman',
    note: 'Sword + Soldier — basics, Quick Strike, and Soldier Training. Leaner HP under progressive costs; ACC/STR trained.',
    skills: ['sword_basics', 'sword_stance', 'quick_strike', 'soldier_training'],
    // ACC+4, STR+3, HP+10 → combined diagnostic level 5 with the four skills.
    statOverrides: { hp: 20, accuracy: 1, strength: 0 },
    equip: { weapon: 'bronze_sword', armor: 'leather_armor' },
    itemRows: [{ itemId: 'health_potion', qty: 2 }, { itemId: 'stamina_potion', qty: 1 }]
  },
  {
    file: 'Level5_Staff_Mage_character.json',
    premadeId: 'level5_staff_mage',
    name: 'Quick-Start Mage',
    note: 'Staff + Mage — Staff Strike, Mana Focus, Arcane Study. Leaner HP; ACC/MAG trained.',
    skills: ['staff_basics', 'mana_focus', 'staff_strike', 'arcane_study'],
    statOverrides: { hp: 20, accuracy: 1, magicPower: 0 },
    equip: { weapon: 'wooden_staff', armor: 'leather_armor' },
    itemRows: [{ itemId: 'stamina_potion', qty: 2 }, { itemId: 'health_potion', qty: 1 }]
  },
  {
    file: 'Level5_Rogue_character.json',
    premadeId: 'level5_rogue',
    name: 'Quick-Start Rogue',
    note: 'Dagger + Thief — Sneak Attack, Light Step, Light Fingers. ACC/STR over raw HP padding.',
    skills: ['dagger_basics', 'light_step', 'sneak_attack', 'light_fingers'],
    statOverrides: { hp: 20, accuracy: 1, strength: 0 },
    equip: { weapon: 'bronze_dagger', armor: 'leather_armor' },
    itemRows: [{ itemId: 'health_potion', qty: 1 }, { itemId: 'stamina_potion', qty: 1 }]
  },
  {
    file: 'Level5_Archer_character.json',
    premadeId: 'level5_archer',
    name: 'Quick-Start Archer',
    note: 'Bow + Marksman — Aimed Shot, Steady Aim, Steady Hand. ACC/STR trained; leaner HP.',
    skills: ['ranged_basics', 'steady_aim', 'aimed_shot', 'steady_hand'],
    statOverrides: { hp: 20, accuracy: 1, strength: 0 },
    equip: { weapon: 'training_bow', armor: 'leather_armor' },
    itemRows: [{ itemId: 'health_potion', qty: 2 }, { itemId: 'stamina_potion', qty: 1 }]
  }
]

const reports = []
fs.mkdirSync(outDir, { recursive: true })
for (const spec of STARTERS) {
  const character = makeCharacter(spec)
  const outPath = path.join(outDir, spec.file)
  fs.writeFileSync(outPath, JSON.stringify(character, null, 2) + '\n', 'utf8')
  const audit = auditBuild({
    skills: spec.skills,
    stats: { ...DEFAULT_STATS, ...spec.statOverrides },
    equip: spec.equip,
    itemRows: spec.itemRows
  })
  reports.push({ name: spec.name, ...audit, gilWallet: character.gil, lumensWallet: character.lumens, stats: character.stats, skills: spec.skills })
  console.log(`Wrote ${spec.file}`)
}

console.log('\n=== Level 5 starter spend summary ===')
for (const r of reports) {
  console.log(`\n${r.name}`)
  console.log(`  Level ${r.level} (${r.skillLevels.toFixed(1)} skills + ${r.statLevels.toFixed(1)} stats)`)
  console.log(`  Lumens spent: ${r.lumenSpent} (${r.skillLumen} skills + ${r.statLumen} stats) · bank ${r.lumensWallet}`)
  console.log(`  Gil spent: ${r.gilSpent} · wallet ${r.gilWallet}`)
  console.log(`  Base stats: HP${r.stats.hp} ACC${r.stats.accuracy} STR${r.stats.strength} MAG${r.stats.magicPower} PD${r.stats.physicalDefence}`)
  console.log(`  Skills: ${r.skills.join(', ')}`)
}
