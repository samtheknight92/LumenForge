#!/usr/bin/env node
/**
 * Fills the thin fusion trees: Monster × element fusions and career × weapon /
 * career × element fusions (shown under Fusion → Career Fusions).
 * Safe to re-run: skills whose id already exists are skipped.
 * Run: node scripts/generate-monster-career-fusions.mjs
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

// ── Monster × element (Fusion → Monster Fusion) ──
// T2 and T3 fuse a monster racial skill with a spell; T4 fuses the two below it.
const MONSTER_FUSIONS = [
  // Fire
  { id: 'cinder_claws', name: 'Cinder Claws', tier: 2, stamina: 3, icon: '🐾🔥', fusionType: 'monster_fire', prereq: ['razor_claws', 'fireball'],
    desc: 'Action: Rake with white-hot claws. Attack roll d20 + accuracy vs Physical Defence; on a hit, claw damage + 1d6 fire damage. Has a 20% chance to apply Burn.' },
  { id: 'magma_hide', name: 'Magma Hide', tier: 3, stamina: 5, icon: '🌋🛡️', fusionType: 'monster_fire', prereq: ['armored_plates', 'fire_wall'],
    desc: 'Toggle: Your plates glow with molten rock. While active, gain +2 Physical Defence and melee attackers who hit you take 1d6 fire damage. Costs stamina per turn while active.' },
  { id: 'volcanic_rampage', name: 'Volcanic Rampage', tier: 4, stamina: 8, icon: '🌋🐾', fusionType: 'monster_fire', prereq: ['cinder_claws', 'magma_hide'],
    desc: 'Action: Charge up to 30ft leaving a trail of lava, then erupt. One attack roll per creature within 10ft of where you stop (d20 + accuracy vs Physical Defence); on each hit, claw damage + 3d6 fire damage. Has a 75% chance to apply Burn.' },

  // Ice
  { id: 'frostbite_maw', name: 'Frostbite Maw', tier: 2, stamina: 3, icon: '🦷❄️', fusionType: 'monster_ice', prereq: ['crushing_bite', 'ice_spear'],
    desc: 'Action: A freezing bite. Attack roll d20 + accuracy vs Physical Defence; on a hit, bite damage + 1d6 ice damage. Has a 20% chance to apply Immobilized.' },
  { id: 'glacial_carapace', name: 'Glacial Carapace', tier: 3, stamina: 5, icon: '🧊🛡️', fusionType: 'monster_ice', prereq: ['metal_skin', 'ice_wall'],
    desc: 'Action: Grow a shell of living ice. Gain Stone Skin for 3 turns; your Speed drops by 1 while the shell lasts.' },
  { id: 'rime_tyrant_howl', name: 'Rime Tyrant Howl', tier: 4, stamina: 8, icon: '🐺❄️', fusionType: 'monster_ice', prereq: ['frostbite_maw', 'glacial_carapace'],
    desc: 'Action: A howl that freezes the air in a 30ft cone. One attack roll per creature (d20 + accuracy vs Magical Defence); on each hit, 3d6 ice damage + Magic Power. Has a 75% chance to apply Immobilized.' },

  // Lightning
  { id: 'storm_pounce', name: 'Storm Pounce', tier: 2, stamina: 3, icon: '🐆⚡', fusionType: 'monster_lightning', prereq: ['pounce', 'chain_lightning'],
    desc: 'Action: Leap up to 20ft in a crackle of static. Attack roll d20 + accuracy vs Physical Defence; on a hit, claw damage + 1d6 lightning damage. Has a 20% chance to apply Stagger.' },
  { id: 'thunderhide', name: 'Thunderhide', tier: 3, stamina: 5, icon: '⚡🛡️', fusionType: 'monster_lightning', prereq: ['damage_reduction', 'electric_field'],
    desc: 'Toggle: Your hide hums with charge. While active, melee attackers who hit you take 1d6 lightning damage and must beat a Normal Saving Roll (11) or lose their next movement. Costs stamina per turn while active.' },
  { id: 'tempest_beast', name: 'Tempest Beast', tier: 4, stamina: 8, icon: '🌩️🐾', fusionType: 'monster_lightning', prereq: ['storm_pounce', 'thunderhide'],
    desc: 'Action: Become a living storm and strike up to three different foes within 30ft, moving between them. Separate attack roll per foe (d20 + accuracy vs Physical Defence); on each hit, claw damage + 2d6 lightning damage. Has a 75% chance to apply Stagger.' },

  // Earth
  { id: 'burrow_ambush', name: 'Burrow Ambush', tier: 2, stamina: 3, icon: '🕳️🪨', fusionType: 'monster_earth', prereq: ['burrow', 'earth_spike'],
    desc: 'Action: Tunnel up to 20ft and burst out beneath a foe. Attack roll d20 + accuracy + 2 vs Physical Defence; on a hit, claw damage + 1d6 earth damage. Has a 20% chance to apply Knockdown.' },
  { id: 'quake_trample', name: 'Quake Trample', tier: 3, stamina: 5, icon: '🦏🪨', fusionType: 'monster_earth', prereq: ['trample', 'earthquake'],
    desc: 'Action: Stampede in a 30ft line, cracking the ground. One attack roll per creature in the line (d20 + accuracy vs Physical Defence); on each hit, 2d6 earth damage + Strength. Has a 40% chance to apply Knockdown.' },
  { id: 'colossus_awakening', name: 'Colossus Awakening', tier: 4, stamina: 8, icon: '🗿🐾', fusionType: 'monster_earth', prereq: ['burrow_ambush', 'quake_trample'],
    desc: 'Action: Rock armour erupts across your body. Gain Stone Skin for 4 turns, then slam the ground: one attack roll per creature within 15ft (d20 + accuracy vs Physical Defence); on each hit, 3d6 earth damage. Has a 75% chance to apply Immobilized.' },

  // Wind
  { id: 'screeching_gale', name: 'Screeching Gale', tier: 2, stamina: 3, icon: '🦇💨', fusionType: 'monster_wind', prereq: ['echolocation', 'wind_blade'],
    desc: 'Action: A sonic shriek carried on a gust in a 15ft cone. One attack roll per creature (d20 + accuracy vs Magical Defence); on each hit, 1d6 wind damage and push 10ft. Has a 20% chance to apply Blinded.' },
  { id: 'cyclone_tail', name: 'Cyclone Tail', tier: 3, stamina: 5, icon: '🌪️🦎', fusionType: 'monster_wind', prereq: ['spiked_tail', 'tornado'],
    desc: 'Action: Spin your tail into a whirlwind. One attack roll per creature within 10ft (d20 + accuracy vs Physical Defence); on each hit, tail damage + 2d6 wind damage and push 15ft. Has a 40% chance to apply Knockdown.' },
  { id: 'sky_tyrant_dive', name: 'Sky Tyrant Dive', tier: 4, stamina: 8, icon: '🦅💨', fusionType: 'monster_wind', prereq: ['screeching_gale', 'cyclone_tail'],
    desc: 'Action: Ride a downdraft up to 40ft and crash into a foe. Attack roll d20 + accuracy + 2 vs Physical Defence; on a hit, claw damage + 4d6 wind damage, then return up to 20ft without provoking attacks. Has a 75% chance to apply Knockdown.' },

  // Water
  { id: 'riptide_jaws', name: 'Riptide Jaws', tier: 2, stamina: 3, icon: '🦈💧', fusionType: 'monster_water', prereq: ['swim', 'water_whip'],
    desc: 'Action: Lunge from a surge of water and drag your prey 10ft toward you. Attack roll d20 + accuracy vs Physical Defence; on a hit, bite damage + 1d6 water damage. Has a 20% chance to apply Immobilized.' },
  { id: 'abyssal_coils', name: 'Abyssal Coils', tier: 3, stamina: 5, icon: '🐙💧', fusionType: 'monster_water', prereq: ['rend', 'tidal_wave'],
    desc: 'Action: Wrap a foe in crushing, water-slick coils. Attack roll d20 + accuracy vs Physical Defence; on a hit, 2d6 water damage + Strength, and the target is held until it beats a Hard Saving Roll (14). Has a 40% chance to apply Exhausted.' },
  { id: 'leviathan_surge', name: 'Leviathan Surge', tier: 4, stamina: 8, icon: '🐋🌊', fusionType: 'monster_water', prereq: ['riptide_jaws', 'abyssal_coils'],
    desc: 'Action: Summon a crushing wave and ride it through your enemies in a 40ft line. One attack roll per creature (d20 + accuracy vs Physical Defence); on each hit, bite damage + 3d6 water damage and push 15ft. Has a 75% chance to apply Knockdown.' },

  // Darkness
  { id: 'night_terror_howl', name: 'Night Terror Howl', tier: 2, stamina: 3, icon: '🐺🌑', fusionType: 'monster_darkness', prereq: ['roar', 'fear'],
    desc: 'Action: A howl that echoes from every shadow within 20ft. One attack roll per enemy (d20 + accuracy vs Magical Defence); on each hit, 1d6 darkness damage. Has a 20% chance to apply Fear.' },
  { id: 'soul_rend', name: 'Soul Rend', tier: 3, stamina: 5, icon: '🩸🌑', fusionType: 'monster_darkness', prereq: ['rend', 'life_drain'],
    desc: 'Action: Tear at body and spirit alike. Attack roll d20 + accuracy vs Physical Defence; on a hit, claw damage + 2d6 darkness damage and you heal half the darkness damage dealt. Has a 40% chance to apply Weakened.' },
  { id: 'umbral_predator', name: 'Umbral Predator', tier: 4, stamina: 8, icon: '👁️🌑', fusionType: 'monster_darkness', prereq: ['night_terror_howl', 'soul_rend'],
    desc: 'Action: Melt into the dark and hunt. Gain Stealth Mastery for 2 turns; your next attack while hidden gains +2 accuracy and deals an extra 3d6 darkness damage. Has a 75% chance to apply Fear.' },

  // Light
  { id: 'radiant_horn', name: 'Radiant Horn', tier: 2, stamina: 3, icon: '🦄☀️', fusionType: 'monster_light', prereq: ['gore', 'blinding_flash'],
    desc: 'Action: Charge with a blazing horn. Attack roll d20 + accuracy vs Physical Defence; on a hit, gore damage + 1d6 light damage. Has a 20% chance to apply Blinded.' },
  { id: 'seraph_plumage', name: 'Seraph Plumage', tier: 3, stamina: 5, icon: '🪽☀️', fusionType: 'monster_light', prereq: ['pack_leader', 'sanctuary'],
    desc: 'Action: Spread shining feathers. You and allies within 15ft gain Regeneration for 3 turns; undead and fiends in range take 2d6 light damage.' },
  { id: 'solar_behemoth', name: 'Solar Behemoth', tier: 4, stamina: 8, icon: '🌞🐾', fusionType: 'monster_light', prereq: ['radiant_horn', 'seraph_plumage'],
    desc: 'Action: Grow to blazing size and roar sunlight in a 30ft cone. One attack roll per creature (d20 + accuracy vs Magical Defence); on each hit, 3d6 light damage + Magic Power (double against undead). Has a 75% chance to apply Blinded.' }
]

// ── Career × weapon (Fusion → Career Fusions → Weapons) ──
const CAREER_WEAPON_FUSIONS = [
  // Sword + Duelist
  { id: 'duelists_edge', name: "Duelist's Edge", tier: 2, stamina: 3, icon: '⚔️🤺', fusionType: 'sword_duelist', prereq: ['parry', 'parry_riposte'],
    desc: 'Reaction (Duelist): When a single foe misses you with a melee attack, riposte. Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 1d6.' },
  { id: 'crimson_flourish', name: 'Crimson Flourish', tier: 3, stamina: 5, icon: '⚔️🌹', fusionType: 'sword_duelist', prereq: ['blade_dance', 'flourish'],
    desc: 'Action (Duelist): A showy three-cut combo. Make up to three sword attacks against one target (d20 + accuracy vs Physical Defence each); each hit deals weapon damage. Has a 40% chance to apply Bleeding.' },
  { id: 'perfect_duel', name: 'Perfect Duel', tier: 4, stamina: 8, icon: '🤺✨', fusionType: 'sword_duelist', prereq: ['duelists_edge', 'crimson_flourish'],
    desc: 'Action (Duelist): Challenge one foe for 3 turns. Against them you gain +2 accuracy and +2 Physical Defence, and your first hit each turn deals an extra 2d6 damage. Has a 75% chance to apply Weakened.' },

  // Ranged + Ranger
  { id: 'hunters_mark_shot', name: "Hunter's Mark Shot", tier: 2, stamina: 3, icon: '🏹🎯', fusionType: 'bow_ranger', prereq: ['aimed_shot', 'snare_craft'],
    desc: 'Action (Ranger): Pin a target with a barbed arrow. Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage and allies gain +1 accuracy against it until your next turn. Has a 20% chance to apply Immobilized.' },
  { id: 'trailblazer_volley', name: 'Trailblazer Volley', tier: 3, stamina: 5, icon: '🏹🌲', fusionType: 'bow_ranger', prereq: ['multi_shot', 'volley_call'],
    desc: 'Action (Ranger): Call targets and loose a volley into a 15ft area within range. One attack roll per enemy (d20 + accuracy vs Physical Defence); on each hit, weapon damage. Has a 40% chance to apply Bleeding.' },
  { id: 'apex_hunter', name: 'Apex Hunter', tier: 4, stamina: 8, icon: '🦌🏹', fusionType: 'bow_ranger', prereq: ['hunters_mark_shot', 'trailblazer_volley'],
    desc: 'Action (Ranger): Vanish into cover and gain Stealth Mastery for 2 turns. Your next ranged attack from hiding gains +2 accuracy and deals an extra 3d6 damage. Has a 75% chance to apply Immobilized.' },

  // Axe + Berserker
  { id: 'blood_cleave', name: 'Blood Cleave', tier: 2, stamina: 3, icon: '🪓🩸', fusionType: 'axe_berserker', prereq: ['cleave', 'bloodlust'],
    desc: 'Action (Berserker): A savage swing at up to two adjacent foes. Separate attack roll each (d20 + accuracy vs Physical Defence); on each hit, weapon damage + 1d4. Has a 20% chance to apply Bleeding.' },
  { id: 'rampage_chop', name: 'Rampage Chop', tier: 3, stamina: 5, icon: '🪓😤', fusionType: 'axe_berserker', prereq: ['berserker_rage', 'rage'],
    desc: 'Action (Berserker): Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 2d6. If this drops the target to 0 HP, move 10ft and make one more basic axe attack for free. Has a 40% chance to apply Fear.' },
  { id: 'headsmans_fury', name: "Headsman's Fury", tier: 4, stamina: 8, icon: '🪓💀', fusionType: 'axe_berserker', prereq: ['blood_cleave', 'rampage_chop'],
    desc: 'Action (Berserker): Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 3d6, doubled against a target below half HP. You are Exhausted for 1 turn afterwards.' },

  // Staff + Mage
  { id: 'conduit_staff', name: 'Conduit Staff', tier: 2, stamina: 3, icon: '🪄🔮', fusionType: 'staff_mage', prereq: ['spell_power', 'mana_font'],
    desc: 'Action (Mage): Strike with your staff and channel the blow into an ally within 30ft. Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage and the ally regains 2 Stamina.' },
  { id: 'wardens_circle', name: "Warden's Circle", tier: 3, stamina: 5, icon: '🪄🛡️', fusionType: 'staff_mage', prereq: ['dispel_ward', 'ward_circle'],
    desc: 'Action (Mage): Plant your staff and draw a 10ft circle. Allies inside gain Spell Warded for 3 turns while you stay in the circle.' },
  { id: 'archmages_rod', name: "Archmage's Rod", tier: 4, stamina: 8, icon: '🪄✨', fusionType: 'staff_mage', prereq: ['conduit_staff', 'wardens_circle'],
    desc: 'Action (Mage): Overload your staff. Attack roll d20 + accuracy vs Magical Defence against a foe within 60ft; on a hit, 4d6 force damage + Magic Power. Allies within 15ft of you gain Empowered for 2 turns.' },

  // Dagger + Thief
  { id: 'cutpurse_strike', name: 'Cutpurse Strike', tier: 2, stamina: 2, icon: '🗡️👛', fusionType: 'dagger_thief', prereq: ['sneak_attack', 'dirty_trick'],
    desc: 'Action (Thief): Stab and snatch. Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage and you may steal one small unequipped item or a handful of Gil (GM decides what is in reach).' },
  { id: 'vanishing_stab', name: 'Vanishing Stab', tier: 3, stamina: 5, icon: '🗡️💨', fusionType: 'dagger_thief', prereq: ['shadowstep', 'escape_artist'],
    desc: 'Action (Thief): Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage + 2d6. Then move up to 15ft without provoking attacks and gain Stealth Mastery for 1 turn.' },
  { id: 'perfect_heist', name: 'Perfect Heist', tier: 4, stamina: 8, icon: '💰🗡️', fusionType: 'dagger_thief', prereq: ['cutpurse_strike', 'vanishing_stab'],
    desc: 'Action (Thief): Blur between up to three foes within 20ft. Separate attack roll each (d20 + accuracy vs Physical Defence); on each hit, weapon damage + 1d6 and steal one small item. Has a 75% chance to apply Blinded.' },

  // Polearm + Soldier
  { id: 'shieldline_thrust', name: 'Shieldline Thrust', tier: 2, stamina: 3, icon: '🔱🛡️', fusionType: 'polearm_soldier', prereq: ['polearm_defensive_stance', 'shield_wall'],
    desc: 'Action (Soldier): Thrust from behind your guard. Attack roll d20 + accuracy vs Physical Defence at 10ft reach; on a hit, weapon damage, and an adjacent ally gains +1 Physical Defence until your next turn.' },
  { id: 'iron_phalanx', name: 'Iron Phalanx', tier: 3, stamina: 5, icon: '🔱🧱', fusionType: 'polearm_soldier', prereq: ['phalanx_formation', 'phalanx'],
    desc: 'Toggle (Soldier): Lock spears with your allies. While active, you and allies adjacent to you gain +2 Physical Defence, and foes that enter your reach provoke a free polearm attack. Costs stamina per turn while active.' },
  { id: 'unbreakable_line', name: 'Unbreakable Line', tier: 4, stamina: 8, icon: '🏰🔱', fusionType: 'polearm_soldier', prereq: ['shieldline_thrust', 'iron_phalanx'],
    desc: 'Action (Soldier): Plant your weapon and rally the line. You and allies within 15ft gain Protected for 3 turns and cannot be pushed or knocked down while it lasts.' },

  // Hammer + Blacksmith
  { id: 'forge_strike', name: 'Forge Strike', tier: 2, stamina: 3, icon: '🔨🔥', fusionType: 'hammer_blacksmith', prereq: ['armor_crusher', 'weaponwright'],
    desc: 'Action (Blacksmith): A smith\'s precise blow at a weak joint. Attack roll d20 + accuracy vs Physical Defence; on a hit, weapon damage and the target loses 1 Physical Defence until the end of the encounter (max −3).' },
  { id: 'tempered_quake', name: 'Tempered Quake', tier: 3, stamina: 5, icon: '🔨🌋', fusionType: 'hammer_blacksmith', prereq: ['shield_breaker', 'tempered_steel'],
    desc: 'Action (Blacksmith): Slam the ground like an anvil. One attack roll per creature within 10ft (d20 + accuracy vs Physical Defence); on each hit, weapon damage + 1d6. Has a 40% chance to apply Stagger.' },
  { id: 'anvil_of_war', name: 'Anvil of War', tier: 4, stamina: 8, icon: '⚒️🛡️', fusionType: 'hammer_blacksmith', prereq: ['forge_strike', 'tempered_quake'],
    desc: 'Action (Blacksmith): Re-temper your party\'s gear mid-fight. You and allies within 15ft gain Weapon Enchanted for 3 turns, then make one hammer attack (d20 + accuracy vs Physical Defence) for weapon damage + 3d6.' },

  // Striker + Medic
  { id: 'pressure_point', name: 'Pressure Point', tier: 2, stamina: 2, icon: '🥊🩺', fusionType: 'striker_medic', prereq: ['slip_parry', 'triage'],
    desc: 'Action (Medic): Your anatomy knowledge cuts both ways. Strike a foe (d20 + accuracy vs Physical Defence) for unarmed damage + 1d4, or tap an ally to restore 1d6 HP instead. Has a 20% chance to apply Weakened.' },
  { id: 'nerve_strike', name: 'Nerve Strike', tier: 3, stamina: 5, icon: '🥊⚡', fusionType: 'striker_medic', prereq: ['joint_lock', 'surgical_touch'],
    desc: 'Action (Medic): Hit a nerve cluster. Attack roll d20 + accuracy vs Physical Defence; on a hit, unarmed damage + 2d6. Has a 40% chance to apply Incapacitated.' },
  { id: 'hand_of_mercy', name: 'Hand of Mercy', tier: 4, stamina: 8, icon: '🤲✨', fusionType: 'striker_medic', prereq: ['pressure_point', 'nerve_strike'],
    desc: 'Action (Medic): A flurry that heals and harms. Make two unarmed attacks (d20 + accuracy vs Physical Defence each) for unarmed damage + 1d6 per hit; for each hit, one ally within 15ft regains 2d6 HP.' }
]

// ── Career × element (Fusion → Career Fusions → Magic) ──
const CAREER_MAGIC_FUSIONS = [
  { id: 'fusion_burning_ballad', name: 'Burning Ballad', tier: 2, stamina: 3, icon: '🎶🔥', prereq: ['long_set', 'ignite'],
    desc: 'Performance (Musician + Fire): Play a searing tune. Allies within 30ft add +1d4 fire damage to their next hit; enemies within 15ft have a 20% chance to apply Burn.' },
  { id: 'fusion_flambe_feast', name: 'Flambé Feast', tier: 3, stamina: 5, icon: '🍳🔥', prereq: ['banquet_planner', 'fire_attunement'],
    desc: 'Craft (Chef + Fire): Cook a spectacular flaming meal during a rest. Everyone who eats gains Fire Resistance until the next long rest and restores 2d6 HP.' },
  { id: 'fusion_cryo_surgeon', name: 'Cryo Surgeon', tier: 2, stamina: 3, icon: '🩺❄️', prereq: ['clean_bandage', 'ice_armor'],
    desc: 'Action (Medic + Ice): Chill a wound shut. Touch an ally: they restore 1d6 + 2 HP and remove Burn or Bleeding.' },
  { id: 'fusion_frozen_evidence', name: 'Frozen Evidence', tier: 3, stamina: 5, icon: '🔍🧊', prereq: ['reconstruct', 'ice_prison'],
    desc: 'Investigation (Detective + Ice): Freeze a scene solid for 1 hour so nothing decays or is disturbed. You gain +2 on every roll to examine it, and learn one clue the GM would otherwise hide.' },
  { id: 'fusion_shock_trap', name: 'Shock Trap', tier: 2, stamina: 3, icon: '🪤⚡', prereq: ['snare_craft', 'shock'],
    desc: 'Action (Ranger + Lightning): Set a charged snare in a 5ft square within 30ft. The first enemy to enter takes 2d6 lightning damage and has a 20% chance to apply Stagger.' },
  { id: 'fusion_galvanic_revival', name: 'Galvanic Revival', tier: 3, stamina: 5, icon: '💓⚡', prereq: ['revival_draft', 'overcharge'],
    desc: 'Action (Medic + Lightning): Jolt a Knocked Out ally back to their feet at once with 2d6 HP. They gain Haste for 2 turns.' },
  { id: 'fusion_stoneforged_arms', name: 'Stoneforged Arms', tier: 2, stamina: 0, icon: '⚒️🪨', prereq: ['armourer', 'stone_armor'],
    desc: 'Craft (Blacksmith + Earth): Fold stone into metal while smithing. Armour you craft gives +1 extra Physical Defence; weapons you craft deal +1 earth damage.' },
  { id: 'fusion_bulwark_of_stone', name: 'Bulwark of Stone', tier: 3, stamina: 5, icon: '🛡️🪨', prereq: ['aura_of_protection', 'earth_shield'],
    desc: 'Action (Paladin + Earth): Raise a stone rampart around your oath. You and allies within 10ft gain Stone Skin for 3 turns.' },
  { id: 'fusion_featherlight_fingers', name: 'Featherlight Fingers', tier: 2, stamina: 2, icon: '🪶🤏', prereq: ['slip_away', 'levitate'],
    desc: 'Utility (Thief + Wind): Float a small object up to 30ft to your hand without touching it. Pickpocketing or lifting keys this way gets +2 on the roll.' },
  { id: 'fusion_gale_chorus', name: 'Gale Chorus', tier: 3, stamina: 5, icon: '🎶💨', prereq: ['battle_anthem', 'wind_walk'],
    desc: 'Performance (Musician + Wind): A rousing song on the wind. Allies within 30ft gain Enhanced Mobility for 3 turns and ignore difficult terrain.' },
  { id: 'fusion_healing_tide_brew', name: 'Healing Tide Brew', tier: 2, stamina: 0, icon: '⚗️💧', prereq: ['label_reader', 'heal_wounds'],
    desc: 'Craft (Alchemist + Water): Brew a Tide Tonic during a rest (1 per rest). Drinking it restores 2d6 HP and removes Poison.' },
  { id: 'fusion_tide_runes', name: 'Tide Runes', tier: 3, stamina: 5, icon: '🔣🌊', prereq: ['artifact_shaping', 'water_shield'],
    desc: 'Enchant (Enchanter + Water): Etch flowing runes on an ally\'s armour. They gain Regeneration for 3 turns and can breathe underwater for 1 hour.' },
  { id: 'fusion_nightmare_interrogation', name: 'Nightmare Interrogation', tier: 2, stamina: 3, icon: '🔍🌑', prereq: ['interview', 'fear'],
    desc: 'Social (Detective + Darkness): Fill a suspect\'s mind with shadows while you question them. You gain +2 on rolls to spot lies; if they fail a Normal Saving Roll (11), they answer one question truthfully.' },
  { id: 'fusion_shadow_contract', name: 'Shadow Contract', tier: 3, stamina: 5, icon: '📜🌑', prereq: ['soul_bind', 'shadow_armor'],
    desc: 'Enchant (Enchanter + Darkness): Bind a willing ally to a shadow pact. For 3 turns their attacks heal them for 1d4, but they take 1 darkness damage at the end of each turn.' },
  { id: 'fusion_radiant_oath', name: 'Radiant Oath', tier: 2, stamina: 3, icon: '⚜️☀️', prereq: ['rebuke', 'purify'],
    desc: 'Action (Paladin + Light): Speak your oath aloud. One ally within 30ft gains Protected for 2 turns; undead or fiends within 15ft have a 20% chance to apply Fear.' },
  { id: 'fusion_dawn_anthem', name: 'Dawn Anthem', tier: 3, stamina: 5, icon: '🎶🌅', prereq: ['encore', 'sanctuary'],
    desc: 'Performance (Musician + Light): A hymn like sunrise. Allies within 30ft restore 2d6 HP and remove one Fear or Charm effect.' }
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

function toSkill(row, extra) {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    cost: TIER_COST[row.tier],
    staminaCost: row.stamina,
    desc: row.desc,
    icon: row.icon,
    prerequisites: { type: 'AND', skills: row.prereq },
    ...extra,
    specialEffects: []
  }
}

const skills = loadSkills()
const existing = new Set()
;(function indexIds(node) {
  if (Array.isArray(node)) {
    for (const sk of node) if (sk?.id) existing.add(sk.id)
    return
  }
  if (node && typeof node === 'object') for (const v of Object.values(node)) indexIds(v)
})(skills)

const monster = skills.fusion?.monster_fusion
const career = skills.fusion?.utility_combat
if (!Array.isArray(monster) || !Array.isArray(career)) throw new Error('fusion lists missing')

let added = 0
function add(list, row, extra) {
  if (existing.has(row.id)) return
  list.push(toSkill(row, extra))
  existing.add(row.id)
  added += 1
}

for (const row of MONSTER_FUSIONS) add(monster, row, { fusionType: row.fusionType })
for (const row of CAREER_WEAPON_FUSIONS) add(career, row, { fusionType: row.fusionType, fusionKind: 'career_weapons' })
for (const row of CAREER_MAGIC_FUSIONS) add(career, row, { fusionKind: 'career' })

writeSkills(skills)
console.log(`generate-monster-career-fusions: +${added} fusion skills`)
