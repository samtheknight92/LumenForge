#!/usr/bin/env node
/**
 * Align skill desc strings with DESIGN-WEAPON-ELEMENT-IDENTITY.md.
 * Run: node scripts/align-skill-identity.mjs && node scripts/build-data.mjs
 */
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const skillsPath = path.join(root, 'data', 'skills-data.js')

const TIER_CHANCE = { 2: 20, 3: 40, 4: 75, 5: 95 }

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

/** Explicit desc replacements by skill id. */
const DESC_BY_ID = {
  piercing_thrust:
    'Action: Precise thrust through an opening. Attack roll d20 + accuracy +1 vs Physical Defence; weapon damage +1 on hit. Critical hit on natural 18–20.',
  covering_fire:
    'Action: Ranged weapon attack to suppress a foe. d20 + accuracy vs Physical Defence; weapon damage on hit; 20% chance to apply Weakened. Until your next turn, one ally you choose gains +2 accuracy against that target.',
  explosive_shot:
    'Action: Fire a prepared explosive arrow or bolt (requires Explosive Compounds). Attack roll d20 + accuracy −1 vs primary target\'s Physical Defence; weapon damage on hit. Each other creature in 10ft: separate attack roll (d20 + accuracy −1) vs each target\'s Physical Defence; weapon damage on each hit. You must not have moved this turn. Friendly fire possible.',
  barrage:
    'Action: Rain shots into a 20ft area after aiming (you did not move this turn). One attack roll per enemy inside (d20 + accuracy −2 vs Physical Defence); weapon damage on each hit. Friendly fire possible.',
  homing_shot:
    'Action: One aimed shot at a target you hit last turn. Attack roll d20 + accuracy +5 vs Physical Defence; weapon damage +2 on hit. Once per combat.',
  throwing_axe:
    'Action: Hurl your axe with brutal force (30ft). Attack roll d20 + accuracy vs Physical Defence; weapon damage +2 on hit. Axe returns to your hand.',
  ricochet_axe:
    'Enhancement: When you throw an axe, it may cleave through to one adjacent foe (separate attack roll per target; weapon damage on each hit).',
  berserker_rage:
    'Toggle: +2 Strength and +2 Speed, but −1 Physical Defence. Costs 2 stamina per turn (max 5 turns).',
  mana_focus:
    'Passive: Sustain long battles — restore +1 stamina per turn while a staff is equipped (feeds your spellcasting).',
  staff_strike:
    'Action: Channel a short arc through the staff (10ft). Attack roll d20 + accuracy vs Magical Defence; on a hit, 1d6 + Magic Power force damage. Weaker than your spells — use when you cannot cast.',
  mana_burn:
    'Action: Arcane drain through your staff. Attack roll d20 + accuracy vs Magical Defence; on a hit, apply Weakened (all stats −2 for 4 turns) and you recover 1d4+2 stamina.',
  elemental_staff:
    'Action: Channel Fire, Ice, or Lightning into your staff for 10 turns. While active, your spells and staff strikes deal +2 typed damage of the chosen element.',
  staff_of_power:
    'Action: Release power you have built up (requires Elemental Staff active, or pay +3 stamina if not). Attack roll d20 + accuracy vs Magical Defence; on a hit, 3d8 force damage + Magic Power at up to 60ft.',
  poison_blade:
    'Enhancement: Your cuts leave bleeding wounds — escalating 1→2→3 damage over 3 turns on hit (stack refreshes). Has a 20% chance to apply Bleeding.',
  thousand_cuts:
    'Action: Eight rapid cuts. Each attack roll is d20 + accuracy −2 vs Physical Defence; weapon damage on each hit. Each hit has a 40% chance to apply Bleeding.',
  shadow_clone:
    'Action: After you hit with a dagger attack, teleport up to 15ft and gain +2 Physical Defence until your next turn. Once per combat, you may immediately make one Basic Attack from your new position.',
  polearm_charge_attack:
    'Action: Controlled lunge up to 15ft in a straight line, then thrust. Attack roll d20 + accuracy vs Physical Defence; weapon damage +2 on hit. You may attack enemies 10ft away without closing to melee.',
  whirlwind_sweep:
    'Action: Measured full-circle sweep while holding your ground (you cannot move this turn). One attack roll per enemy within 15ft (d20 + accuracy −1 vs Physical Defence); weapon damage on each hit. Enemies you hit cannot move toward you until your next turn.',
  thunderstrike:
    'Action: Thunderous hammer blow. Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage +2d6 thunder damage. One adjacent foe takes half that thunder damage (no roll).',
  berserker_swing:
    'Action: Wind up a crushing blow (you cannot move this turn). Attack roll d20 + accuracy vs Physical Defence; weapon damage +6 on hit. You are immune to Incapacitated until your next turn.',
  mjolnir_strike:
    'Action: Hurl your hammer in a 60ft line. One attack roll per enemy in the line; weapon damage on each hit. The impact sends a shockwave — each hit foe is knocked prone. Hammer returns.',
  crushing_fist:
    'Passive: Your combo finishers hit hardest — unarmed Basic Attack uses 1d12 + Strength while both hands are empty (pairs with Flurry of Blows and Striker Volley).',
  warm_hands:
    'Spell: Ignite a small flame (30ft light). Touch one ally to soothe minor burns — restore 1 HP.',
  phoenix_form:
    'Spell: Apply Enhanced Mobility (flight + immunity to immobilization). Your flames burn hotter — fire spells deal +1d4 fire damage while active. GRANTS: Fire resistance 50% (half fire damage); Ice weakness 200% (double ice damage)',
  fire_shield:
    'Spell: Apply Protected (absorb 3 attacks). Attackers that hit the shield take 1d4 fire damage and have a 20% chance to apply Burn.',
  inferno:
    'Spell: 20ft raging flames. One attack roll per creature (d20 + accuracy vs Magical Defence −4); on each hit, 2d6 fire damage + Magic Power. Has a 40% chance to apply Burn. Friendly fire possible.',
  ice_armor:
    'Spell: Gain +3 Physical Defence and +3 Magical Defence (10 rounds). While active, fire damage against you is halved (does not stack with Ice Attunement).',
  frost_touch:
    'Spell: Touch attack. Attack roll d20 + accuracy vs Magical Defence; on a hit, applies Weakened (all stats −2 for 4 turns). Has a 20% chance to apply Immobilized.',
  frost_nova:
    'Spell: 15ft burst. All enemies inside: has a 40% chance to apply Immobilized (1 turn) and Weakened (Speed −2 for 4 turns).',
  ice_age:
    'Spell: Attack roll d20 + accuracy vs Magical Defence; on a hit, 1d6 ice damage + Magic Power. 200ft. On a hit, target is Weakened and has a 40% chance to apply Immobilized — frozen foes are easier for allies to shatter.',
  lightning_storm:
    'Spell: 60ft line. Separate attack roll per creature in the line (d20 + accuracy vs Magical Defence); on each hit, 3d6 lightning damage + Magic Power. Lightning jumps — each hit after the first deals +1d6. Has a 75% chance to apply Incapacitated.',
  ball_lightning:
    'Spell: Hurl a fast orb to a point within 60ft; it detonates immediately for 4d6 lightning damage in a 15ft radius. Has a 40% chance to apply Incapacitated.',
  thunder_clap:
    'Spell: 20ft thunder burst. One attack roll per creature (d20 + accuracy vs Magical Defence); on each hit, 2d4 lightning damage + Magic Power. Has a 40% chance to apply Incapacitated. Friendly fire possible.',
  static_charge:
    'Spell: Charge your next lightning spell (+1d6 lightning damage) and gain +1 Speed until you cast again.',
  stone_throw:
    'Spell: Attack roll d20 + accuracy vs Magical Defence; on a hit, 1d6 earth damage + Magic Power. 40ft. On a hit, target has a 20% chance to be knocked down.',
  earth_sense:
    'Spell: Sense vibrations through stone and soil (100ft). You know where creatures are moving and where the ground is unstable — +2 to place earth spikes and walls for 1 round.',
  stone_spear:
    'Spell: Attack roll d20 + accuracy vs Magical Defence; on a hit, 3d4 earth damage + Magic Power. 60ft. Ignores 2 Magical Defence (piercing stone).',
  petrify:
    'Spell: Apply Immobilized (encased in stone — cannot move but can attack) and +5 Physical Defence and +5 Magical Defence for 3 turns.',
  wind_blade:
    'Spell: Attack roll d20 + accuracy vs Magical Defence; on a hit, 2d4 wind damage + Magic Power. 50ft. On a hit, push the target 5ft.',
  hurricane:
    'Spell: 30ft storm. One attack roll per creature (d20 + accuracy vs Magical Defence); on each hit, 3d6 wind damage + Magic Power. Pull all enemies 10ft toward the storm\'s center. Friendly fire possible.',
  tornado:
    'Spell: 30ft tornado. One attack roll per creature (d20 + accuracy vs Magical Defence); on each hit, 3d4 wind damage + Magic Power. You may move up to 10ft before or after casting. Friendly fire possible.',
  water_splash:
    'Spell: Attack roll d20 + accuracy vs Magical Defence; on a hit, 1d4 water damage + Magic Power. 30ft. On a hit, target\'s Speed is −1 until your next turn (slippery splash).',
  blood_control:
    'Spell: Grip a foe with pressurized blood inside their veins. Attack roll d20 + accuracy vs Magical Defence; on a hit, apply Weakened (all stats −2 for 4 turns) and has a 40% chance to apply Immobilized.',
  blood_boil:
    'Spell: Superheat fluids in the target\'s body. Attack roll d20 + accuracy vs Magical Defence; on a hit, 5d4 water damage + Magic Power (scalding steam). Has a 40% chance to apply Burn.',
  tsunami:
    'Spell: 40ft wave. One attack roll per creature (d20 + accuracy vs Magical Defence −2); on each hit, 6d4 water damage + Magic Power and push 15ft. Has a 40% chance to apply Immobilized. Friendly fire possible.',
  shadow_bolt:
    'Spell: Attack roll d20 + accuracy vs Magical Defence; on a hit, 1d6 darkness damage + Magic Power. 40ft. Has a 20% chance to apply Weakened (all stats −2 for 4 turns).',
  fear:
    'Spell: Apply Mind Controlled (target flees in terror — cannot approach you for 3 turns).',
  eclipse:
    'Spell: 30ft void. One attack roll per enemy (d20 + accuracy vs Magical Defence); on each hit, 3d6 darkness damage + Magic Power. Enemies inside have a 75% chance to apply Mind Controlled (cower in terror). You gain +2 Stealth while the eclipse lasts.',
  soul_steal:
    'Spell: Drain 1 point from all target stats for 1 day (curse). You regain 2d4 HP.',
  light_ray:
    'Spell: Radiant beam. Attack roll d20 + accuracy vs Magical Defence; on a hit, 1d6 light damage + Magic Power and blind for 1 turn. Deals +1d6 light damage vs undead, demons, and darkness creatures.',
  divine_judgment:
    'Spell: Attack roll d20 + accuracy vs Magical Defence; on a hit, 4d6 light damage + Magic Power vs normal foes, or 6d6 vs undead, demons, and corrupted creatures.',
  solar_flare:
    'Spell: 40ft radius explosion. One attack roll per creature (d20 + accuracy vs Magical Defence); on each hit, 5d6 light damage + Magic Power. Allies in the radius gain Protected (absorb 1 attack). Friendly fire possible.',
  light_mastery:
    'Action (3 uses per day): Become one with light for 3 rounds. Gain immunity to light damage, emit bright light (30ft — enemies are Blinded), +50% light spell damage, all allies within 10ft gain Enhanced (+2 all stats), and you can teleport to any bright light within 100ft as a bonus action.',
  blazing_tempest:
    'Action: Spinning flame strike — separate attack roll per enemy within 10ft (d20 + accuracy vs Physical Defence −2); on each hit, weapon damage + 3d6 fire damage. Has a 75% chance to apply Burn.',
  inferno_volley:
    'Action: Fire 2 ranged attacks (Multi Shot). Each attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 2d6 fire damage. Has a 40% chance to apply Burn.',
  phoenix_shot:
    'Action: One devastating ranged shot. Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 3d6 fire damage. Has a 75% chance to apply Burn.'
}

const PREREQ_FIXES = {
  phalanx_formation: { from: 'defensive_stance', to: 'polearm_defensive_stance' }
}

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

function fusionElements(fusionType) {
  if (!fusionType) return []
  const parts = String(fusionType).split('_')
  if (parts.length === 1) return parts
  const elements = new Set(['fire', 'ice', 'lightning', 'earth', 'wind', 'water', 'darkness', 'light'])
  return parts.filter(p => elements.has(p))
}

function primaryElement(fusionType) {
  const els = fusionElements(fusionType)
  if (els.length >= 2) return null
  return els[0] || null
}

function dualElements(fusionType) {
  const els = fusionElements(fusionType)
  return els.length >= 2 ? els : null
}

function statusForSkill(skill) {
  const dual = dualElements(skill.fusionType)
  if (dual) {
    const key = dual.join('_')
    return DUAL_STATUS[key] || `${ELEMENT_STATUS[dual[0]]} and ${ELEMENT_STATUS[dual[1]]}`
  }
  const el = primaryElement(skill.fusionType)
  if (el) return ELEMENT_STATUS[el]
  return 'Weakened'
}

function damageLabel(element) {
  if (!element) return 'force'
  return element === 'light' ? 'light' : element
}

function fixFusionDesc(skill) {
  let desc = String(skill.desc || '')
  if (!desc.includes('listed status') && !skill.fusionType) return desc

  const tier = Number(skill.tier) || 3
  const pct = TIER_CHANCE[tier] || 40
  const status = statusForSkill(skill)
  const dual = dualElements(skill.fusionType)
  const el = primaryElement(skill.fusionType)

  if (desc.includes('listed status')) {
    desc = desc.replace(/Has a \d+% chance to apply the listed status\.?/i, `Has a ${pct}% chance to apply ${status}.`)
  }

  if (el && /Fire damage/i.test(desc) && el !== 'fire') {
    desc = desc.replace(/Fire damage/gi, `${damageLabel(el)} damage`)
  }

  if (dual && /(\d+d\d+) (fire|ice|lightning|earth|wind|water|darkness|light) damage each/i.test(desc)) {
    const m = desc.match(/(\d+d\d+) (\w+) damage each/i)
    if (m && m[2] !== 'or') {
      desc = desc.replace(
        `${m[1]} ${m[2]} damage each`,
        `${m[1]} ${dual[0]} or ${dual[1]} damage each (use whichever the target is weakest to)`
      )
    }
  } else if (dual && /\d+d\d+ fire damage(?! or)/i.test(desc)) {
    desc = desc.replace(
      /(\d+d\d+) fire damage/i,
      `$1 ${dual[0]} or ${dual[1]} damage (use whichever the target is weakest to)`
    )
  }

  if (skill.id === 'aurora_storm' && /ice damage/i.test(desc)) {
    desc = desc.replace(/ice damage/gi, 'wind or light damage (use whichever the target is weakest to)')
  }

  return desc
}

function walkSkills(root, fn) {
  if (Array.isArray(root)) {
    for (const skill of root) {
      if (skill?.id) fn(skill)
    }
    return
  }
  if (root && typeof root === 'object') {
    for (const value of Object.values(root)) walkSkills(value, fn)
  }
}

const skills = loadSkills()
let explicit = 0
let fusion = 0
let prereq = 0

walkSkills(skills, skill => {
  if (DESC_BY_ID[skill.id]) {
    skill.desc = DESC_BY_ID[skill.id]
    explicit += 1
  }

  const fixed = fixFusionDesc(skill)
  if (fixed !== skill.desc) {
    skill.desc = fixed
    fusion += 1
  }

  const fix = PREREQ_FIXES[skill.id]
  if (fix && skill.prerequisites?.skills?.includes(fix.from)) {
    skill.prerequisites.skills = skill.prerequisites.skills.map(s => (s === fix.from ? fix.to : s))
    prereq += 1
  }
})

writeSkills(skills)
console.log(`align-skill-identity: ${explicit} explicit desc updates, ${fusion} fusion fixes, ${prereq} prereq fixes`)
