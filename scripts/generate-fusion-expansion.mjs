#!/usr/bin/env node
/**
 * Adds missing pure-magic dual trees and striker × element fusion trees.
 * Run: node scripts/generate-fusion-expansion.mjs
 *      node scripts/align-fusion-identity.mjs
 *      node scripts/attach-activation-effects.mjs
 *      node scripts/build-data.mjs
 */
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const skillsPath = path.join(root, 'data', 'skills-data.js')

const TIER_COST = { 2: 20, 3: 40, 4: 65 }
const TIER_STAMINA = { 2: 2, 3: 5, 4: 8 }

const DUAL_TREES = [
  {
    fusionType: 'fire_light',
    skills: [
      {
        id: 'sunspark',
        name: 'Sunspark',
        tier: 2,
        icon: '☀️🔥',
        prereq: ['fireball', 'light_ray']
      },
      {
        id: 'purifying_flame',
        name: 'Purifying Flame',
        tier: 3,
        icon: '🌅✨',
        prereq: ['sunspark', 'holy_weapon']
      },
      {
        id: 'dawn_judgment',
        name: 'Dawn Judgment',
        tier: 4,
        icon: '⚖️☀️',
        prereq: ['purifying_flame', 'solar_flare']
      }
    ]
  },
  {
    fusionType: 'ice_wind',
    skills: [
      {
        id: 'frost_gale',
        name: 'Frost Gale',
        tier: 2,
        icon: '❄️💨',
        prereq: ['ice_shard', 'gust']
      },
      {
        id: 'blizzard_squall',
        name: 'Blizzard Squall',
        tier: 3,
        icon: '🌨️💨',
        prereq: ['frost_gale', 'tornado']
      },
      {
        id: 'arctic_cyclone',
        name: 'Arctic Cyclone',
        tier: 4,
        icon: '🌀❄️',
        prereq: ['blizzard_squall', 'hurricane']
      }
    ]
  },
  {
    fusionType: 'lightning_earth',
    skills: [
      {
        id: 'tremor_spark',
        name: 'Tremor Spark',
        tier: 2,
        icon: '⚡🪨',
        prereq: ['spark', 'stone_throw']
      },
      {
        id: 'magnet_storm',
        name: 'Magnet Storm',
        tier: 3,
        icon: '🧲⚡',
        prereq: ['tremor_spark', 'earth_shield']
      },
      {
        id: 'earth_thunder',
        name: 'Earth Thunder',
        tier: 4,
        icon: '🌋⚡',
        prereq: ['magnet_storm', 'earthquake']
      }
    ]
  }
]

const STRIKER_TREES = [
  {
    element: 'fire',
    fusionType: 'striker_fire',
    skills: [
      { id: 'ember_fists', name: 'Ember Fists', tier: 2, icon: '🥊🔥', spell: 'fireball', wall: 'fire_wall' },
      { id: 'inferno_palm', name: 'Inferno Palm', tier: 3, icon: '🔥🥊' },
      { id: 'phoenix_flurry', name: 'Phoenix Flurry', tier: 4, icon: '🦅🥊' }
    ]
  },
  {
    element: 'ice',
    fusionType: 'striker_ice',
    skills: [
      { id: 'frost_fists', name: 'Frost Fists', tier: 2, icon: '🥊❄️', spell: 'ice_shard', wall: 'ice_wall' },
      { id: 'glacial_palm', name: 'Glacial Palm', tier: 3, icon: '❄️🥊' },
      { id: 'avalanche_flurry', name: 'Avalanche Flurry', tier: 4, icon: '🌨️🥊' }
    ]
  },
  {
    element: 'lightning',
    fusionType: 'striker_lightning',
    skills: [
      { id: 'storm_fists', name: 'Storm Fists', tier: 2, icon: '🥊⚡', spell: 'spark', wall: 'electric_field' },
      { id: 'thunder_palm', name: 'Thunder Palm', tier: 3, icon: '⚡🥊' },
      { id: 'lightning_flurry', name: 'Lightning Flurry', tier: 4, icon: '⛈️🥊' }
    ]
  },
  {
    element: 'earth',
    fusionType: 'striker_earth',
    skills: [
      { id: 'granite_fists', name: 'Granite Fists', tier: 2, icon: '🥊🪨', spell: 'stone_throw', wall: 'earth_shield' },
      { id: 'earthen_palm', name: 'Earthen Palm', tier: 3, icon: '🪨🥊' },
      { id: 'quake_flurry', name: 'Quake Flurry', tier: 4, icon: '🌋🥊' }
    ]
  },
  {
    element: 'wind',
    fusionType: 'striker_wind',
    skills: [
      { id: 'gale_fists', name: 'Gale Fists', tier: 2, icon: '🥊💨', spell: 'gust', wall: 'tornado' },
      { id: 'cyclone_palm', name: 'Cyclone Palm', tier: 3, icon: '💨🥊' },
      { id: 'hurricane_flurry', name: 'Hurricane Flurry', tier: 4, icon: '🌪️🥊' }
    ]
  },
  {
    element: 'water',
    fusionType: 'striker_water',
    skills: [
      { id: 'tide_fists', name: 'Tide Fists', tier: 2, icon: '🥊💧', spell: 'water_splash', wall: 'water_shield' },
      { id: 'tidal_palm', name: 'Tidal Palm', tier: 3, icon: '💧🥊' },
      { id: 'tsunami_flurry', name: 'Tsunami Flurry', tier: 4, icon: '🌊🥊' }
    ]
  },
  {
    element: 'darkness',
    fusionType: 'striker_darkness',
    skills: [
      { id: 'shadow_fists', name: 'Shadow Fists', tier: 2, icon: '🥊🌑', spell: 'shadow_bolt', wall: 'shadow_armor' },
      { id: 'umbral_palm', name: 'Umbral Palm', tier: 3, icon: '🌑🥊' },
      { id: 'void_flurry', name: 'Void Flurry', tier: 4, icon: '🕳️🥊' }
    ]
  },
  {
    element: 'light',
    fusionType: 'striker_light',
    skills: [
      { id: 'radiant_fists', name: 'Radiant Fists', tier: 2, icon: '🥊☀️', spell: 'light_ray', wall: 'holy_weapon' },
      { id: 'solar_palm', name: 'Solar Palm', tier: 3, icon: '☀️🥊' },
      { id: 'dawn_flurry', name: 'Dawn Flurry', tier: 4, icon: '🌅🥊' }
    ]
  }
]

function loadSkills() {
  const sandbox = { window: {} }
  vm.createContext(sandbox)
  vm.runInContext(fs.readFileSync(skillsPath, 'utf8'), sandbox)
  return sandbox.window.SKILLS_DATA
}

function writeSkills(skillsData) {
  const raw = fs.readFileSync(skillsPath, 'utf8')
  const marker = 'const SKILLS_DATA ='
  const headerEnd = raw.indexOf(marker)
  if (headerEnd === -1) throw new Error('SKILLS_DATA marker not found')
  const header = raw.slice(0, headerEnd)
  const body = `${marker} ${JSON.stringify(skillsData, null, 4)};\n\nwindow.SKILLS_DATA = SKILLS_DATA;\n`
  fs.writeFileSync(skillsPath, header + body, 'utf8')
}

function dualSkill(row, fusionType) {
  const [e1, e2] = fusionType.split('_')
  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    cost: TIER_COST[row.tier],
    staminaCost: row.tier === 2 ? 4 : TIER_STAMINA[row.tier],
    desc: `Spell (${e1} + ${e2}): placeholder`,
    icon: row.icon,
    prerequisites: { type: 'AND', skills: row.prereq },
    fusionType,
    specialEffects: []
  }
}

function strikerSkill(row, tree) {
  const { fusionType, skills: treeSkills } = tree
  const t2 = treeSkills[0]
  const t3 = treeSkills[1]
  let prereq
  if (row.tier === 2) {
    prereq = ['striker_basics', t2.spell]
  } else if (row.tier === 3) {
    prereq = ['flurry_of_blows', t2.wall]
  } else {
    prereq = [t2.id, t3.id]
  }

  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    cost: TIER_COST[row.tier],
    staminaCost: TIER_STAMINA[row.tier],
    desc: 'placeholder',
    icon: row.icon,
    prerequisites: { type: 'AND', skills: prereq },
    fusionType,
    specialEffects: []
  }
}

const skills = loadSkills()
const existing = new Set()
function indexIds(node) {
  if (Array.isArray(node)) {
    for (const sk of node) if (sk?.id) existing.add(sk.id)
    return
  }
  if (node && typeof node === 'object') for (const v of Object.values(node)) indexIds(v)
}
indexIds(skills)

let addedDual = 0
let addedStriker = 0

const pure = skills.fusion?.pure_magic
if (!Array.isArray(pure)) throw new Error('fusion.pure_magic missing')

for (const tree of DUAL_TREES) {
  for (const row of tree.skills) {
    if (existing.has(row.id)) continue
    pure.push(dualSkill(row, tree.fusionType))
    existing.add(row.id)
    addedDual += 1
  }
}

const melee = skills.fusion?.melee_magic
if (!Array.isArray(melee)) throw new Error('fusion.melee_magic missing')

for (const tree of STRIKER_TREES) {
  for (const row of tree.skills) {
    if (existing.has(row.id)) continue
    melee.push(strikerSkill({ ...row }, tree))
    existing.add(row.id)
    addedStriker += 1
  }
}

writeSkills(skills)
console.log(
  `generate-fusion-expansion: +${addedDual} pure-magic skills, +${addedStriker} striker fusion skills`
)
