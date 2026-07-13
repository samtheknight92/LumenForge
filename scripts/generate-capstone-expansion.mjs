/**
 * Idempotent expansion of Ascension (~22) and Ultimate (~21) skill pools.
 * Run: node scripts/generate-capstone-expansion.mjs
 * Then: node scripts/build-data.mjs
 */
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const skillsPath = path.join(root, 'data', 'skills-data.js')

const NEW_ASCENSION = [
  {
    id: 'ascension_second_wind',
    name: 'Second Wind',
    tier: 3,
    cost: 133,
    staminaCost: 0,
    desc: 'Action: When you are below half HP, restore 2d6 + Strength HP and 8 Stamina. Cannot use while Incapacitated.',
    icon: '🌬️',
    prerequisites: { type: 'NONE', skills: [] },
    specialEffects: []
  },
  {
    id: 'ascension_stamina_reserve',
    name: 'Stamina Reserve',
    tier: 3,
    cost: 133,
    staminaCost: 0,
    desc: 'Passive (once per day): The first time your Stamina would reach 0 in an encounter, restore 10 Stamina instead (cannot exceed your maximum).',
    icon: '🔋',
    prerequisites: { type: 'NONE', skills: [] },
    specialEffects: []
  },
  {
    id: 'ascension_battle_focus',
    name: 'Battle Focus',
    tier: 4,
    cost: 163,
    staminaCost: 5,
    desc: 'Action: For 3 rounds, gain +3 Accuracy on weapon and unarmed attacks. You cannot cast spells while Battle Focus is active.',
    icon: '🎯',
    prerequisites: { type: 'NONE', skills: [] },
    specialEffects: []
  },
  {
    id: 'ascension_arcane_surge',
    name: 'Arcane Surge',
    tier: 4,
    cost: 163,
    staminaCost: 0,
    desc: 'Action: This skill can be used in addition to any Spell skill. Your next spell this turn costs 2 less Stamina (minimum 0) and deals +1d6 damage of its element on a hit. Cannot stack with other cost-reduction effects.',
    icon: '✴️',
    prerequisites: { type: 'NONE', skills: [] },
    specialEffects: []
  },
  {
    id: 'ascension_guardians_stand',
    name: "Guardian's Stand",
    tier: 4,
    cost: 163,
    staminaCost: 8,
    desc: 'Reaction: When an adjacent ally would take damage from a single-target attack, you become the target instead and take the full damage (8 Stamina).',
    icon: '🛡️',
    prerequisites: { type: 'NONE', skills: [] },
    specialEffects: []
  },
  {
    id: 'ascension_rally_the_line',
    name: 'Rally the Line',
    tier: 4,
    cost: 163,
    staminaCost: 10,
    desc: 'Action: Allies within 15ft gain +2 Physical Defence and +2 Magical Defence for 2 rounds. You must be able to shout or signal — silence zones block this (GM).',
    icon: '📣',
    prerequisites: { type: 'NONE', skills: [] },
    specialEffects: []
  },
  {
    id: 'ascension_purge_affliction',
    name: 'Purge Affliction',
    tier: 4,
    cost: 163,
    staminaCost: 6,
    desc: 'Action: Remove one poison, disease, charm, or fear effect from yourself or one ally within 30ft.',
    icon: '🧴',
    prerequisites: { type: 'NONE', skills: [] },
    specialEffects: []
  }
]

const WEAPON_ULTIMATES = [
  {
    id: 'ultimate_perfect_riposte',
    name: 'Perfect Riposte',
    tier: 5,
    cost: 320,
    staminaCost: 18,
    desc: 'Reaction: When a melee attack misses you, immediately counter with one weapon attack at +5 Accuracy. On a hit, deal double weapon damage + Strength. You must be wielding a sword.',
    icon: '⚔️',
    prerequisites: { type: 'AND', skills: ['sword_mastery', 'master_parry'] },
    specialEffects: []
  },
  {
    id: 'ultimate_skyfall_volley',
    name: 'Skyfall Volley',
    tier: 5,
    cost: 320,
    staminaCost: 28,
    desc: 'Action: Choose up to 5 enemies within 120ft line of sight — separate attack roll (d20 + Accuracy) vs each; on a hit, weapon damage + 2d6. You cannot move on the turn you use this.',
    icon: '🏹',
    prerequisites: { type: 'AND', skills: ['ranged_mastery', 'homing_shot'] },
    specialEffects: []
  },
  {
    id: 'ultimate_worldbreaker_cleave',
    name: 'Worldbreaker Cleave',
    tier: 5,
    cost: 320,
    staminaCost: 24,
    desc: 'Action: 15ft cone weapon attack vs every enemy — one attack roll each; on a hit, weapon damage + Strength. Shields and heavy armour may crack on a crit (GM). You suffer −2 Physical Defence until your next turn.',
    icon: '🪓',
    prerequisites: { type: 'AND', skills: ['axe_mastery', 'earthquake_slam'] },
    specialEffects: []
  },
  {
    id: 'ultimate_archmage_awakening',
    name: "Archmage's Awakening",
    tier: 5,
    cost: 320,
    staminaCost: 0,
    desc: 'Passive: Your spells cost 1 less Stamina (minimum 0). When you cast a spell, you may spend 5 Stamina to heal one ally within 30ft for 1d6 + Magic Power HP.',
    icon: '🔮',
    prerequisites: { type: 'AND', skills: ['staff_mastery', 'staff_of_power'] },
    specialEffects: []
  },
  {
    id: 'ultimate_death_by_cuts',
    name: 'Death by a Thousand Cuts',
    tier: 5,
    cost: 320,
    staminaCost: 22,
    desc: 'Action: Make three dagger attacks as one Action (each at -2 Accuracy). Each hit applies Bleeding — lose 1d4 HP at the start of each turn for 3 rounds. You must wield a dagger.',
    icon: '🗡️',
    prerequisites: { type: 'AND', skills: ['dagger_mastery', 'thousand_cuts'] },
    specialEffects: []
  },
  {
    id: 'ultimate_impregnable_reach',
    name: 'Impregnable Reach',
    tier: 5,
    cost: 320,
    staminaCost: 20,
    desc: 'Action: For 3 rounds, +2 Physical Defence and enemies entering your weapon reach provoke a free polearm attack (once per enemy per round). You cannot charge or sprint while active.',
    icon: '🔱',
    prerequisites: { type: 'AND', skills: ['polearm_mastery', 'fortress_stance'] },
    specialEffects: []
  },
  {
    id: 'ultimate_seismic_judgment',
    name: 'Seismic Judgment',
    tier: 5,
    cost: 320,
    staminaCost: 28,
    desc: 'Action: 10ft radius slam — each enemy saves or is knocked down; they must spend their next movement standing up. On a failed save they take 4d6 bludgeoning + Strength. Objects, armour, and fortifications take double damage (GM). You lose your next Action.',
    icon: '🔨',
    prerequisites: { type: 'AND', skills: ['hammer_mastery', 'apocalypse_slam'] },
    specialEffects: []
  },
  {
    id: 'ultimate_flowing_perfection',
    name: 'Flowing Perfection',
    tier: 5,
    cost: 320,
    staminaCost: 20,
    desc: 'Action: Until the end of your next turn, each successful unarmed hit grants +1 Accuracy and +1 Speed (max +3). After each hit you may move 10ft for free. Hands must be empty.',
    icon: '🥋',
    prerequisites: { type: 'AND', skills: ['striker_mastery', 'iron_reversal'] },
    specialEffects: []
  }
]

const MAGIC_ULTIMATES = [
  {
    id: 'ultimate_inferno_crown',
    name: 'Inferno Crown',
    tier: 5,
    cost: 320,
    staminaCost: 28,
    desc: 'Action: 30ft burst centered on you — each creature saves or takes 6d6 fire + Magic Power and Burn (2d4, 3 rounds). Allies in the burst use the same save. You are Exhausted for 1 round afterward.',
    icon: '👑',
    prerequisites: { type: 'AND', skills: ['fire_supremacy', 'inferno'] },
    specialEffects: []
  },
  {
    id: 'ultimate_absolute_zero',
    name: 'World of Stillness',
    tier: 5,
    cost: 320,
    staminaCost: 24,
    desc: 'Action: 20ft radius — enemies save or take 4d6 ice + Magic Power and are Immobilized for 2 rounds. The next hit on each frozen target deals +50% damage.',
    icon: '🧊',
    prerequisites: { type: 'AND', skills: ['ice_supremacy', 'glacier'] },
    specialEffects: []
  },
  {
    id: 'ultimate_tempest_sovereign',
    name: 'Tempest Sovereign',
    tier: 5,
    cost: 320,
    staminaCost: 22,
    desc: 'Action: Lightning jumps to up to 4 enemies within 30ft of your first target — each takes 3d6 lightning + Magic Power (separate attack rolls). You act first in initiative next round.',
    icon: '⚡',
    prerequisites: { type: 'AND', skills: ['lightning_supremacy', 'storm_mastery'] },
    specialEffects: []
  },
  {
    id: 'ultimate_living_bastion',
    name: 'Living Bastion',
    tier: 5,
    cost: 320,
    staminaCost: 22,
    desc: 'Action: For 5 rounds, raise a 20ft-radius earth bulwark — allies inside gain +4 Physical Defence and +4 Magical Defence. Enemies entering the area must save or stop at the edge.',
    icon: '🪨',
    prerequisites: { type: 'AND', skills: ['earth_supremacy', 'tectonic_shift'] },
    specialEffects: []
  },
  {
    id: 'ultimate_zephyr_sovereign',
    name: 'Zephyr Sovereign',
    tier: 5,
    cost: 320,
    staminaCost: 20,
    desc: 'Action: For 2 rounds, move up to 60ft per turn (including vertical if open air) and attacks against you take -3 Accuracy. You cannot cast non-Wind spells while soaring.',
    icon: '🌪️',
    prerequisites: { type: 'AND', skills: ['wind_mastery', 'gale_mastery'] },
    specialEffects: []
  },
  {
    id: 'ultimate_tidal_aegis',
    name: 'Tidal Aegis',
    tier: 5,
    cost: 320,
    staminaCost: 22,
    desc: 'Action: 30ft radius — allies heal 3d6 + Magic Power and lose poison; enemies save or are pushed 15ft and take 2d6 water damage.',
    icon: '🌊',
    prerequisites: { type: 'AND', skills: ['water_mastery', 'tsunami'] },
    specialEffects: []
  },
  {
    id: 'ultimate_eclipse_dominion',
    name: 'Eclipse Dominion',
    tier: 5,
    cost: 320,
    staminaCost: 26,
    desc: 'Action: 30ft radius of shadow — enemies save or take 4d6 darkness + Magic Power, gain Fear for 2 rounds, and suffer -2 Accuracy for 3 rounds. You heal HP equal to half the damage you dealt (GM).',
    icon: '🌑',
    prerequisites: { type: 'AND', skills: ['darkness_mastery', 'eclipse'] },
    specialEffects: []
  },
  {
    id: 'ultimate_radiant_ascension',
    name: 'Crown of Dawn',
    tier: 5,
    cost: 320,
    staminaCost: 22,
    desc: 'Action: 40ft holy burst — undead, demons, and corrupted foes take 6d6 light + Magic Power; others take 3d6. Allies in the burst lose poison or curse and gain +2 Magical Defence for 2 rounds.',
    icon: '☀️',
    prerequisites: { type: 'AND', skills: ['light_mastery', 'divine_judgment'] },
    specialEffects: []
  }
]

function loadSkillsData() {
  const sandbox = { window: {} }
  vm.createContext(sandbox)
  vm.runInContext(fs.readFileSync(skillsPath, 'utf8'), sandbox)
  return sandbox.window.SKILLS_DATA
}

function writeSkillsData(skillsData) {
  const raw = fs.readFileSync(skillsPath, 'utf8')
  const marker = 'const SKILLS_DATA ='
  const headerEnd = raw.indexOf(marker)
  if (headerEnd === -1) throw new Error('SKILLS_DATA marker not found')
  const header = raw.slice(0, headerEnd)
  const body = `${marker} ${JSON.stringify(skillsData, null, 4)};\n\nwindow.SKILLS_DATA = SKILLS_DATA;\n`
  fs.writeFileSync(skillsPath, header + body, 'utf8')
}

function mergeById(existing, incoming) {
  const byId = new Map(existing.map(s => [s.id, s]))
  let added = 0
  for (const skill of incoming) {
    if (!byId.has(skill.id)) {
      byId.set(skill.id, skill)
      added++
    }
  }
  return { list: [...byId.values()], added }
}

const data = loadSkillsData()
data.ascension = data.ascension || {}
data.ascension.unique = data.ascension.unique || []
data.ultimate = data.ultimate || {}
data.ultimate.legendary = data.ultimate.legendary || []

const asc = mergeById(data.ascension.unique, NEW_ASCENSION)
data.ascension.unique = asc.list

const weaponMerge = mergeById(data.ultimate.weapon_ultimates || [], WEAPON_ULTIMATES)
data.ultimate.weapon_ultimates = weaponMerge.list

const magicMerge = mergeById(data.ultimate.magic_ultimates || [], MAGIC_ULTIMATES)
data.ultimate.magic_ultimates = magicMerge.list

writeSkillsData(data)

console.log(`Capstone expansion: +${asc.added} Ascension (${asc.list.length} total)`)
console.log(`  +${weaponMerge.added} weapon Ultimates (${weaponMerge.list.length} total)`)
console.log(`  +${magicMerge.added} magic Ultimates (${magicMerge.list.length} total)`)
console.log(`  ${data.ultimate.legendary.length} legendary Ultimates unchanged`)
console.log(`  Grand total Ultimates: ${data.ultimate.legendary.length + weaponMerge.list.length + magicMerge.list.length}`)
