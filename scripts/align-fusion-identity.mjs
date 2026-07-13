#!/usr/bin/env node
/**
 * Align fusion skill desc strings with weapon, element, and career identity guides.
 * Adds missing axe T3/T4 trees. Run:
 *   node scripts/align-fusion-identity.mjs
 *   node scripts/attach-activation-effects.mjs
 *   node scripts/build-data.mjs
 */
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const skillsPath = path.join(root, 'data', 'skills-data.js')

const TIER_CHANCE = { 2: 20, 3: 40, 4: 75, 5: 95 }
const TIER_COST = { 2: 20, 3: 40, 4: 65, 5: 100 }
const TIER_STAMINA = { 2: 2, 3: 5, 4: 8, 5: 8 }

const ELEMENTS = new Set(['fire', 'ice', 'lightning', 'earth', 'wind', 'water', 'darkness', 'light'])
const WEAPONS = new Set(['sword', 'bow', 'axe', 'dagger', 'polearm', 'hammer', 'staff', 'striker'])

const ELEMENT_STATUS = {
  fire: 'Burn',
  ice: 'Immobilized',
  lightning: 'Incapacitated',
  earth: 'Incapacitated',
  wind: 'Weakened',
  water: 'Weakened',
  darkness: 'Mind Controlled',
  light: 'Blinded'
}

const DUAL_STATUS = {
  fire_ice: 'Burn and Immobilized',
  fire_lightning: 'Burn and Incapacitated',
  fire_earth: 'Burn and Incapacitated',
  fire_wind: 'Burn and Weakened',
  fire_water: 'Burn and Weakened',
  fire_darkness: 'Burn and Mind Controlled',
  fire_light: 'Burn and Blinded',
  ice_lightning: 'Immobilized and Incapacitated',
  ice_earth: 'Immobilized and Incapacitated',
  ice_wind: 'Immobilized and Weakened',
  ice_water: 'Immobilized and Weakened',
  ice_darkness: 'Immobilized and Mind Controlled',
  ice_light: 'Immobilized and Blinded',
  lightning_earth: 'Incapacitated and Incapacitated',
  lightning_wind: 'Incapacitated and Weakened',
  lightning_water: 'Incapacitated and Weakened',
  lightning_darkness: 'Incapacitated and Mind Controlled',
  lightning_light: 'Incapacitated and Blinded',
  earth_wind: 'Incapacitated and Weakened',
  earth_water: 'Incapacitated and Weakened',
  earth_darkness: 'Incapacitated and Mind Controlled',
  earth_light: 'Incapacitated and Blinded',
  wind_water: 'Weakened and Weakened',
  wind_darkness: 'Weakened and Mind Controlled',
  wind_light: 'Weakened and Blinded',
  water_darkness: 'Weakened and Mind Controlled',
  water_light: 'Weakened and Blinded',
  darkness_light: 'Mind Controlled and Blinded'
}

const WEAPON_LABEL = {
  sword: 'sword',
  bow: 'ranged',
  axe: 'axe',
  dagger: 'dagger',
  polearm: 'polearm',
  hammer: 'hammer',
  staff: 'staff',
  striker: 'unarmed'
}

const WEAPON_TRAIT = {
  sword: { 2: 'Technique', 3: 'Counterplay', 4: 'Momentum' },
  bow: { 2: 'Preparation', 3: 'Precision', 4: 'Distance' },
  axe: { 2: 'Relentlessness', 3: 'Cleaving', 4: 'Brute Force' },
  dagger: { 2: 'Speed', 3: 'Precision', 4: 'Agility' },
  polearm: { 2: 'Reach', 3: 'Battlefield Control', 4: 'Discipline' },
  hammer: { 2: 'Fortitude', 3: 'Crushing Power', 4: 'Shockwaves' },
  staff: { 2: 'Channeling', 3: 'Arcane Focus', 4: 'Mana Mastery' },
  striker: { 2: 'Empty Hands', 3: 'Feints & Control', 4: 'Combo Flow' }
}

const TOGGLE_EXTRAS = {
  earth: '; attack rolls against targets treat Physical Defence as 2 lower',
  wind: ' and push the target 5ft on a hit',
  water: "; on a hit, the target's Physical Defence is 1 lower for 2 turns"
}

const ELEMENT_DAMAGE = {
  fire: 'fire',
  ice: 'ice',
  lightning: 'lightning',
  earth: 'earth',
  wind: 'wind',
  water: 'water',
  darkness: 'darkness',
  light: 'light'
}

/** Full desc overrides — unique mechanics preserved. */
const SPECIAL_BY_ID = {
  blazing_tempest:
    'Action (Momentum): Spinning flame strike — separate attack roll per enemy within 10ft (d20 + accuracy vs Physical Defence −2); on each hit, weapon damage + 3d6 fire damage. Has a 75% chance to apply Burn.',
  inferno_volley:
    'Action (Precision): Fire 2 ranged attacks from cover (Multi Shot). Each attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 2d6 fire damage. Has a 40% chance to apply Burn.',
  phoenix_shot:
    'Action (Distance): One devastating aimed shot from safety. Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 3d6 fire damage. Has a 75% chance to apply Burn.',
  bow_lightning_storm:
    'Action (Distance): Fire an arrow that chains lightning between up to three targets within 30ft. Attack roll d20 + accuracy vs Physical Defence per jump; on each hit, weapon damage + 3d6 lightning damage. Has a 75% chance to apply Incapacitated.',
  gale_volley:
    'Action (Precision): Fire 2 wind-curved shots that ignore half cover (Multi Shot). Each attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 2d6 wind damage. Has a 40% chance to apply Weakened.',
  tide_volley:
    'Action (Precision): Fire 2 flowing water arrows (Multi Shot). Each attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 2d6 water damage and you heal for half the damage dealt. Has a 40% chance to apply Weakened.',
  tsunami_shot:
    'Action (Distance): One arrow that bursts into a wave on impact (30ft). Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 3d6 water damage and push the target 10ft. Has a 75% chance to apply Weakened.',
  glacial_riposte:
    'Reaction (Counterplay): Parry and riposte with a freezing slash. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 ice damage. Has a 40% chance to apply Immobilized.',
  earthen_guard:
    'Reaction (Counterplay): Parry and raise a stone barrier. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 earth damage. You gain Enhanced (+2 all stats) for 2 turns. Has a 40% chance to apply Incapacitated.',
  cyclone_parry:
    'Reaction (Counterplay): Parry inside a swirling wind barrier. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 wind damage. You gain Enhanced Mobility for 1 turn. Has a 40% chance to apply Weakened.',
  aqua_parry:
    'Reaction (Counterplay): Parry into a rebounding wave. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 water damage, heal yourself for 1d6 HP, and push the attacker 5ft. Has a 40% chance to apply Weakened.',
  night_parry:
    'Reaction (Counterplay): Parry and slip into shadow. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 darkness damage. You gain Stealth Mastery until your next turn. Has a 40% chance to apply Mind Controlled.',
  solar_parry:
    'Reaction (Counterplay): Parry and flash radiant light. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 light damage. Allies within 10ft heal 1d6 HP. Has a 40% chance to apply Blinded.',
  maelstrom_slash:
    'Action (Momentum): Spinning water slash — separate attack roll per enemy within 10ft (d20 + accuracy vs Physical Defence); on each hit, weapon damage + 3d6 water damage. Has a 75% chance to apply Weakened.',
  judgment_slash:
    'Action (Momentum): Radiant finishing slash. Attack roll d20 + accuracy vs Magical Defence; on a hit, 3d6 light damage and remove all debuffs from allies within 10ft. Has a 75% chance to apply Blinded.',
  zephyr_strike:
    'Action (Precision): Wind-quick vital strike. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 wind damage. You gain +2 Speed until your next turn. Has a 40% chance to apply Weakened.',
  tide_strike:
    'Action (Precision): Flowing vital strike. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 water damage and heal yourself for half the damage dealt. Has a 40% chance to apply Weakened.',
  tsunami_dance:
    'Action (Agility): Water-flow flurry — separate attack roll per target within 10ft (d20 + accuracy vs Physical Defence); on each hit, 3d6 water damage. Has a 75% chance to apply Weakened.',
  cyclone_sweep:
    'Action (Battlefield Control): Wind-empowered reach sweep. Separate attack roll per target within 15ft (d20 + accuracy vs Magical Defence); on each hit, 2d6 wind damage. You gain +2 Speed until your next turn. Has a 40% chance to apply Weakened.',
  wave_sweep:
    'Action (Battlefield Control): Flowing reach sweep. Separate attack roll per target within 15ft (d20 + accuracy vs Magical Defence); on each hit, 2d6 water damage and heal yourself for half the total damage dealt. Has a 40% chance to apply Weakened.',
  maelstrom_spiral:
    'Action (Discipline): Spiral water sweep — separate attack roll per enemy within 15ft (d20 + accuracy vs Magical Defence); on each hit, 3d6 water damage. Has a 75% chance to apply Weakened.',
  glacial_pound:
    'Action (Crushing Power): Freezing ground slam. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 ice damage. Enemies within 10ft are Slowed and have a 40% chance to apply Immobilized.',
  storm_surge:
    'Action (Shockwaves): Thunderous ground strike. Attack roll d20 + accuracy vs Physical Defence; on a hit, 3d6 lightning damage. One adjacent foe takes half that lightning damage (no roll). Has a 75% chance to apply Incapacitated.',
  wave_slam:
    'Action (Crushing Power): Tidal hammer blow. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 water damage and heal yourself for half the damage dealt. Has a 40% chance to apply Weakened.',
  tsunami_crash:
    'Action (Shockwaves): Massive water hammer crash — separate attack roll per enemy within 10ft (d20 + accuracy vs Physical Defence); on each hit, 3d6 water damage. Has a 75% chance to apply Weakened.',
  tide_focus:
    'Action (Arcane Focus): Channel water through your staff in a 20ft cone. One attack roll per creature (d20 + accuracy vs Magical Defence); on each hit, 2d6 water damage and heal yourself for half the total damage dealt. Has a 40% chance to apply Weakened.',
  tsunami_staff:
    'Action (Mana Mastery): Staff becomes a crashing wave — separate attack roll per enemy in a 20ft area (d20 + accuracy vs Magical Defence); on each hit, 3d6 water damage. Has a 75% chance to apply Weakened.',
  alchemical_blade:
    'Action (Technique): Coat your blade in volatile reagents before striking. Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage on hit and apply Poison (escalating 1→2→3 damage over 3 turns).',
  enchanted_arrows:
    'Enhancement (Preparation): Inscribe runes on a quiver of arrows — your ranged attacks apply Weapon Enchanted (+1 damage and typed effect) for 10 turns.',
  blessed_weapon:
    'Passive (Technique): Your weapon radiates holy power — melee attacks deal +1d6 light damage and apply Weapon Enchanted vs undead and corrupted foes.',
  draconic_breath:
    'Action: Unleash draconic fire breath in a 30ft cone. One attack roll per creature (d20 + accuracy vs Magical Defence); on each hit, 4d6 fire damage + Magic Power. Has a 95% chance to apply Burn. You gain Enhanced (+2 all stats) for 3 turns.',
  shadow_strike:
    'Action: Teleport up to 20ft, gain Stealth Mastery, then claw strike. Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 2d6 darkness damage. Has a 75% chance to apply Mind Controlled.',
  arcane_roar:
    'Action: Arcane-enhanced roar in a 20ft cone. Enemies have a 75% chance to apply Intimidating Aura; one attack roll per foe (d20 + accuracy vs Magical Defence) for 2d6 force damage + Magic Power.',
  lightning_water_storm_surge:
    'Spell (Conductivity + Flow): Electrified wave in a 20ft area. One attack roll per creature (d20 + accuracy vs Magical Defence); on each hit, 2d6 lightning or water damage (use whichever the target is weak to). Has a 40% chance to apply Incapacitated and Weakened.',
  darkness_light_eclipse:
    'Spell (Judgment + Concealment): Perfect balance of light and dark in a 30ft burst. One attack roll per enemy (d20 + accuracy vs Magical Defence); on each hit, 3d6 darkness or light damage (use whichever each target is weak to). Has a 75% chance to apply Mind Controlled and Blinded.',
  wind_water_hurricane:
    'Spell (Momentum + Flow): Devastating storm in a 30ft area. One attack roll per creature (d20 + accuracy vs Magical Defence); on each hit, 3d6 wind or water damage (use whichever each target is weak to). Pull all enemies 10ft toward the center. Has a 75% chance to apply Weakened.',
  water_earth_tidal_wave:
    'Spell (Flow + Endurance): Wave of water and debris in a 40ft line. One attack roll per creature (d20 + accuracy vs Magical Defence −2); on each hit, 3d6 water or earth damage (use whichever each target is weak to). Has a 75% chance to apply Weakened and Incapacitated.'
}

const AXE_COMPLETIONS = [
  {
    fusionType: 'axe_lightning',
    t2Id: 'storm_axe',
    t3: { id: 'thunder_cleave', name: 'Thunder Cleave', icon: '⚡🪓', wall: 'electric_field' },
    t4: { id: 'storm_strike', name: 'Storm Strike', icon: '⛈️⚡' }
  },
  {
    fusionType: 'axe_earth',
    t2Id: 'stone_axe',
    t3: { id: 'earthen_cleave', name: 'Earthen Cleave', icon: '🪨🪓', wall: 'earth_shield' },
    t4: { id: 'quake_strike', name: 'Quake Strike', icon: '🌋🪨' }
  },
  {
    fusionType: 'axe_wind',
    t2Id: 'wind_axe',
    t3: { id: 'gale_cleave', name: 'Gale Cleave', icon: '💨🪓', wall: 'tornado' },
    t4: { id: 'hurricane_strike', name: 'Hurricane Strike', icon: '🌪️💨' }
  },
  {
    fusionType: 'axe_water',
    t2Id: 'water_axe',
    t3: { id: 'tidal_cleave', name: 'Tidal Cleave', icon: '💧🪓', wall: 'water_shield' },
    t4: { id: 'deluge_strike', name: 'Deluge Strike', icon: '🌊💧' }
  },
  {
    fusionType: 'axe_darkness',
    t2Id: 'shadow_axe',
    t3: { id: 'void_cleave', name: 'Void Cleave', icon: '🌑🪓', wall: 'shadow_armor' },
    t4: { id: 'abyss_strike', name: 'Abyss Strike', icon: '🕳️🌑' }
  },
  {
    fusionType: 'axe_light',
    t2Id: 'light_axe',
    t3: { id: 'radiant_cleave', name: 'Radiant Cleave', icon: '☀️🪓', wall: 'holy_weapon' },
    t4: { id: 'dawn_strike', name: 'Dawn Strike', icon: '🌅☀️' }
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

function parseFusionType(fusionType) {
  if (!fusionType) return { kind: 'unknown' }
  const parts = fusionType.split('_')
  if (parts[0] === 'monster') return { kind: 'monster', element: parts[1] }
  if (fusionType === 'sword_alchemy' || fusionType === 'bow_enchanting' || fusionType === 'weapon_light') {
    return { kind: 'utility', fusionType }
  }
  if (ELEMENTS.has(parts[0]) && parts.length >= 2 && ELEMENTS.has(parts[1])) {
    return { kind: 'dual', e1: parts[0], e2: parts[1] }
  }
  if (WEAPONS.has(parts[0]) && parts.length >= 2 && ELEMENTS.has(parts[1])) {
    return { kind: 'weapon', weapon: parts[0], element: parts[1] }
  }
  return { kind: 'unknown', fusionType }
}

function dualStatus(e1, e2) {
  return DUAL_STATUS[`${e1}_${e2}`] || `${ELEMENT_STATUS[e1]} and ${ELEMENT_STATUS[e2]}`
}

function dmgLabel(element) {
  return ELEMENT_DAMAGE[element] || element
}

function isSwordParry(skill) {
  return skill.id.endsWith('_parry') || skill.id.endsWith('_riposte') || skill.name.includes('Parry')
}

function usesMagicalDefence(weapon, element, tier) {
  if (weapon === 'staff') return true
  if (weapon === 'polearm') return true
  if (weapon === 'sword' && tier === 4 && ['ice', 'lightning', 'wind'].includes(element)) return true
  if (weapon === 'dagger' && tier === 4 && element === 'wind') return true
  return false
}

function swordT4Multi(element) {
  return ['ice', 'lightning', 'darkness'].includes(element)
}

function toggleDesc(weapon, element) {
  const trait = WEAPON_TRAIT[weapon][2]
  const label = WEAPON_LABEL[weapon]
  const dmg = dmgLabel(element)
  const status = ELEMENT_STATUS[element]
  const handsNote = weapon === 'striker' ? 'both hands are empty and ' : ''
  let desc = `Toggle (${trait}): While ${handsNote}active, ${label} attacks gain +1d6 ${dmg} damage on hit`
  if (TOGGLE_EXTRAS[element]) desc += TOGGLE_EXTRAS[element]
  else if (status) desc += ` and have a 20% chance to apply ${status}`
  desc += '. Costs stamina per turn while active.'
  return desc
}

function weaponFusionDesc(skill, weapon, element) {
  if (SPECIAL_BY_ID[skill.id]) return SPECIAL_BY_ID[skill.id]

  const tier = Number(skill.tier) || 3
  const pct = TIER_CHANCE[tier] || 40
  const status = ELEMENT_STATUS[element]
  const dmg = dmgLabel(element)
  const trait = WEAPON_TRAIT[weapon][tier]
  const def = usesMagicalDefence(weapon, element, tier) ? 'Magical' : 'Physical'

  if (tier === 2) return toggleDesc(weapon, element)

  if (weapon === 'sword') {
    if (tier === 3) {
      if (isSwordParry(skill)) {
        return `Reaction (${trait}): Parry and riposte with a ${dmg}-charged slash. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
      }
    }
    if (tier === 4) {
      if (swordT4Multi(element)) {
        return `Action (${trait}): Whirling finish — separate attack roll per enemy within 10ft (d20 + accuracy vs ${def} Defence); on each hit, 3d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
      }
      return `Action (${trait}): Finishing slash. Attack roll d20 + accuracy vs ${def} Defence; on a hit, 3d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
  }

  if (weapon === 'bow') {
    if (tier === 3) {
      const volley = skill.prerequisites?.skills?.includes('multi_shot')
      if (volley) {
        return `Action (${trait}): Fire 2 ${dmg}-empowered shots (Multi Shot). Each attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 2d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
      }
      return `Action (${trait}): One aimed ${dmg} shot. Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 2d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
    if (tier === 4) {
      return `Action (${trait}): One devastating ranged shot from safety. Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 3d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
  }

  if (weapon === 'axe') {
    if (tier === 3) {
      return `Action (${trait}): Wide cleave — separate attack roll per target (d20 + accuracy vs Physical Defence); on each hit, 2d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
    if (tier === 4) {
      return `Action (${trait}): Devastating overhead chop. Attack roll d20 + accuracy vs Physical Defence; on a hit, 3d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
  }

  if (weapon === 'dagger') {
    if (tier === 3) {
      return `Action (${trait}): Fast vital strike. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
    if (tier === 4) {
      return `Action (${trait}): Rapid flurry — separate attack roll per target within 10ft (d20 + accuracy vs ${def} Defence); on each hit, 3d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
  }

  if (weapon === 'polearm') {
    if (tier === 3) {
      return `Action (${trait}): Reach sweep — separate attack roll per target within 15ft (d20 + accuracy vs Magical Defence); on each hit, 2d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
    if (tier === 4) {
      return `Action (${trait}): Measured finishing thrust at reach. Attack roll d20 + accuracy vs Magical Defence; on a hit, 3d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
  }

  if (weapon === 'hammer') {
    if (tier === 3) {
      return `Action (${trait}): Crushing ground strike. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
    if (tier === 4) {
      return `Action (${trait}): Thunderous finishing blow. Attack roll d20 + accuracy vs Physical Defence; on a hit, 3d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
  }

  if (weapon === 'staff') {
    if (tier === 3) {
      return `Action (${trait}): Channel ${dmg} through your staff. Attack roll d20 + accuracy vs Magical Defence; on a hit, 2d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
    if (tier === 4) {
      return `Action (${trait}): Release stored ${dmg} in a 20ft burst. One attack roll per creature (d20 + accuracy vs Magical Defence); on each hit, 3d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
  }

  if (weapon === 'striker') {
    if (tier === 3) {
      return `Action (${trait}): Feint into an elemental palm strike (both hands empty). Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 ${dmg} damage. Has a ${pct}% chance to apply ${status}.`
    }
    if (tier === 4) {
      return `Action (${trait}): Elemental flurry — separate attack roll per target within 10ft (d20 + accuracy vs Physical Defence); on each hit, 3d6 ${dmg} damage. Requires both hands empty. Has a ${pct}% chance to apply ${status}.`
    }
  }

  return skill.desc
}

function dualMagicDesc(skill, e1, e2) {
  if (SPECIAL_BY_ID[skill.id]) return SPECIAL_BY_ID[skill.id]

  const tier = Number(skill.tier) || 3
  const pct = TIER_CHANCE[tier] || 40
  const status = dualStatus(e1, e2)
  const dice = tier === 2 ? '2d4' : tier === 3 ? '2d6' : '3d6'
  const dmg = `${e1} or ${e2}`

  if (tier === 2) {
    return `Spell (${e1} + ${e2}): Attack roll d20 + accuracy vs Magical Defence; on a hit, ${dice} ${dmg} damage (use whichever the target is weak to). Has a ${pct}% chance to apply ${status}.`
  }
  if (tier === 3) {
    return `Spell (${e1} + ${e2}): Attack roll d20 + accuracy vs Magical Defence; on a hit, ${dice} ${dmg} damage (use whichever the target is weak to). Has a ${pct}% chance to apply ${status}.`
  }
  return `Spell (${e1} + ${e2}): One attack roll per enemy in a 30ft area (d20 + accuracy vs Magical Defence); on each hit, ${dice} ${dmg} damage (use whichever each target is weak to). Has a ${pct}% chance to apply ${status}.`
}

function makeAxeSkill({ id, name, tier, icon, fusionType, element, wall, t2Id, t3Id }) {
  const parsed = { kind: 'weapon', weapon: 'axe', element }
  const skill = {
    id,
    name,
    tier,
    cost: TIER_COST[tier],
    staminaCost: TIER_STAMINA[tier],
    desc: '',
    icon,
    prerequisites: { type: 'AND', skills: [] },
    fusionType,
    specialEffects: []
  }
  if (tier === 3) {
    skill.prerequisites.skills = ['wide_cleave', wall]
  } else if (tier === 4) {
    skill.prerequisites.skills = [t2Id, t3Id]
  }
  skill.desc = weaponFusionDesc(skill, 'axe', element)
  return skill
}

function addMissingAxeSkills(skills) {
  const melee = skills.fusion?.melee_magic
  if (!Array.isArray(melee)) throw new Error('fusion.melee_magic not found')

  const existing = new Set(melee.map(s => s.id))
  let insertAt = melee.findIndex(s => s.id === 'light_axe')
  if (insertAt === -1) insertAt = melee.length - 1

  const added = []
  for (const cfg of AXE_COMPLETIONS) {
    const element = cfg.fusionType.split('_')[1]
    if (!existing.has(cfg.t3.id)) {
      const t3 = makeAxeSkill({
        id: cfg.t3.id,
        name: cfg.t3.name,
        tier: 3,
        icon: cfg.t3.icon,
        fusionType: cfg.fusionType,
        element,
        wall: cfg.t3.wall,
        t2Id: cfg.t2Id
      })
      added.push(t3)
      existing.add(t3.id)
    }
    if (!existing.has(cfg.t4.id)) {
      const t4 = makeAxeSkill({
        id: cfg.t4.id,
        name: cfg.t4.name,
        tier: 4,
        icon: cfg.t4.icon,
        fusionType: cfg.fusionType,
        element,
        t2Id: cfg.t2Id,
        t3Id: cfg.t3.id
      })
      added.push(t4)
      existing.add(t4.id)
    }
  }

  if (added.length) {
    melee.splice(insertAt + 1, 0, ...added)
  }
  return added.length
}

function walkFusionSkills(skills, fn) {
  const fusion = skills.fusion
  if (!fusion) return
  for (const list of Object.values(fusion)) {
    if (!Array.isArray(list)) continue
    for (const skill of list) {
      if (skill?.fusionType || skill?.id) fn(skill)
    }
  }
}

const skills = loadSkills()
let updated = 0
let fixedLightAxe = 0

addMissingAxeSkills(skills)

walkFusionSkills(skills, skill => {
  if (skill.id === 'light_axe' && skill.activationEffects?.[0]?.effectId === 'mind_controlled') {
    skill.activationEffects[0].effectId = 'blinded'
    fixedLightAxe += 1
  }
  if (skill.id === 'light_axe' && skill.desc.includes('Mind Controlled')) {
    skill.desc = toggleDesc('axe', 'light')
  }

  const parsed = parseFusionType(skill.fusionType)
  let next = skill.desc

  if (SPECIAL_BY_ID[skill.id]) {
    next = SPECIAL_BY_ID[skill.id]
  } else if (parsed.kind === 'weapon') {
    next = weaponFusionDesc(skill, parsed.weapon, parsed.element)
  } else if (parsed.kind === 'dual') {
    next = dualMagicDesc(skill, parsed.e1, parsed.e2)
  } else if (parsed.kind === 'utility' || parsed.kind === 'monster') {
    if (SPECIAL_BY_ID[skill.id]) next = SPECIAL_BY_ID[skill.id]
  }

  if (next && next !== skill.desc) {
    skill.desc = next
    updated += 1
  }
})

writeSkills(skills)
console.log(
  `align-fusion-identity: ${updated} desc updates, ${AXE_COMPLETIONS.length * 2} axe tiers checked, light_axe fix ${fixedLightAxe}`
)
