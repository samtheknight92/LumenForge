#!/usr/bin/env node
/**
 * Generates data/careers-skills-data.js and rewrites profession-items requiredSkills
 * to use new career skill ids.
 *
 * Career design pillars: DESIGN-CAREER-IDENTITY.md
 * (every skill reinforces ≥1 trait; harmony lines unchanged unless editing copy)
 */
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { fileURLToPath } from 'url'
import { resolveActivationEffectsForSkill } from './lib/resolve-activation-effects.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const dataDir = path.join(root, 'data')
const jsonDir = path.join(dataDir, 'json')

const EFFECTS = JSON.parse(fs.readFileSync(path.join(jsonDir, 'effects.json'), 'utf8'))
const careerMetaRaw = fs.readFileSync(path.join(dataDir, 'career-skill-meta.js'), 'utf8').replace(/^\uFEFF/, '').replace(/^export const /gm, 'const ')
const careerMetaSandbox = {}
vm.createContext(careerMetaSandbox)
vm.runInContext(`${careerMetaRaw}\n;globalThis.__careerActionBuffs = CAREER_ACTION_BUFFS`, careerMetaSandbox)
const CAREER_ACTION_BUFFS = careerMetaSandbox.__careerActionBuffs || {}

function withActivationEffects(row) {
  const activationEffects = resolveActivationEffectsForSkill(row, EFFECTS, { careerActionBuffs: CAREER_ACTION_BUFFS })
  if (activationEffects.length) row.activationEffects = activationEffects
  return row
}

import { TIER_LUMEN_COST } from './lib/progression.mjs'

function skill(id, name, tier, icon, desc, prerequisites) {
  return withActivationEffects({
    id,
    name,
    tier,
    cost: TIER_LUMEN_COST[tier] || 40,
    staminaCost: 0,
    desc,
    icon,
    prerequisites,
    specialEffects: []
  })
}

function careerTree(entry, tier2, tier3) {
  const rows = [
    skill(entry.id, entry.name, 1, entry.icon, entry.desc, { type: 'NONE', skills: [] })
  ]
  for (const row of tier2) {
    rows.push(skill(row.id, row.name, 2, row.icon, row.desc, { type: 'AND', skills: [entry.id] }))
  }
  for (const row of tier3) {
    const t2 = row.prereqT2 || tier2[0].id
    rows.push(skill(row.id, row.name, 3, row.icon, row.desc, { type: 'AND', skills: [entry.id, t2] }))
  }
  return rows
}

const CAREERS_SKILLS_DATA = {
  blacksmith: careerTree(
    { id: 'apprentice_smith', name: 'Apprentice Smith', icon: '🔨', desc: 'Craft: Forge basic weapons and armour for allies to equip.' },
    [
      { id: 'weaponwright', name: 'Weaponwright', icon: '⚔️', desc: 'Craft: Forge martial weapons. Weapons you forge gain +1 damage.' },
      { id: 'armourer', name: 'Armourer', icon: '🛡️', desc: 'Craft: Forge armour and shields. Armour you forge grants +1 Physical Defence and +1 Magical Defence.' },
      { id: 'field_fit', name: 'Field Fit', icon: '🔧', desc: 'Pre-combat: Battlefield fitting — tune ally gear (10 min); +1 first attack roll or +1 Physical Defence first round (choose one). Once per ally per long rest. + Harmony Reaction: same ally (2 Smiths → both bonuses).' }
    ],
    [
      { id: 'master_alloy', name: 'Master Alloy', icon: '⚗️', desc: 'Craft: Masterwork alloy recipes (mithril, adamantine). Gear you forge from these counts as masterwork.', prereqT2: 'weaponwright' },
      { id: 'tempered_steel', name: 'Tempered Steel', icon: '🔥', desc: 'Passive: Allies wielding weapons or armour you forged gain +1 to physical attack rolls (weapon damage unchanged).', prereqT2: 'armourer' },
      { id: 'siege_breaker', name: 'Siege Breaker', icon: '🪓', desc: 'Action: Break mundane locks, hinges, or chains with smith\'s tools (GM: one object per use).', prereqT2: 'field_fit' }
    ]
  ),
  chef: careerTree(
    { id: 'camp_cook', name: 'Camp Cook', icon: '🍳', desc: 'Craft: Hearty camp meals. Each meal restores 1d4+1 HP when eaten.' },
    [
      { id: 'hearty_rations', name: 'Hearty Rations', icon: '🥘', desc: 'Craft: Travel rations. After eating, +2 Stamina for 10 rounds.' },
      { id: 'spice_box', name: 'Spice Box', icon: '🧂', desc: 'Passive: Camp provisioning — meals you cook restore +1 HP or last +1 round of meal buff duration.' },
      { id: 'second_serving', name: 'Second Serving', icon: '🍽️', desc: 'Action: Camp provisioning — prepare one extra portion from the same ingredients (once per long rest).' }
    ],
    [
      { id: 'banquet_planner', name: 'Banquet Planner', icon: '🎉', desc: 'Craft: Feast for the party; shared +1 Accuracy for 20 rounds. + Harmony Reaction: same feast (each additional Chef adds +1 Accuracy and +5 feast duration; 9 Chefs → +9 Accuracy for 65 rounds).', prereqT2: 'hearty_rations' },
      { id: 'battle_breakfast', name: 'Battle Breakfast', icon: '🥞', desc: 'Craft: Before first combat, one eater gains +2 initiative or +1 Physical Defence (first combat only). + Harmony Reaction: same meal (when 2+ Chefs, each served eater gets both bonuses; each Chef adds +2 initiative, +1 Physical Defence for one combat round, +1 Stamina round 1, and +1d4 temp HP at combat start; one eater per Chef).', prereqT2: 'spice_box' },
      { id: 'chefs_instinct', name: 'Chef\'s Instinct', icon: '👃', desc: 'Passive: Spoil and poison sense — detect spoiled, drugged, or poisoned food by taste or smell (GM may require no roll).', prereqT2: 'second_serving' }
    ]
  ),
  medic: careerTree(
    { id: 'field_medic', name: 'Field Medic', icon: '💊', desc: 'Craft: Brew health potions. Potions you brew restore +2 HP when used.' },
    [
      { id: 'triage', name: 'Triage', icon: '🩺', desc: 'Action: Triage and diagnosis — learn a creature\'s HP band, bleeding, poison, or disease before you treat (not exact HP unless GM allows).' },
      { id: 'antidote_training', name: 'Antidote Training', icon: '🧪', desc: 'Passive: Plague and poison warding on yourself — +2 effective Magical Defence vs poison and disease; identify poison on sight.' },
      { id: 'clean_bandage', name: 'Clean Bandage', icon: '🩹', desc: 'Action: Stabilise and revive — stabilise a downed ally (0 HP) so they do not worsen; restore 1 HP.' }
    ],
    [
      { id: 'surgical_touch', name: 'Surgical Touch', icon: '✂️', desc: 'Craft: Advanced potions and antidotes. Wound mending you apply to others restores +1d4 HP.', prereqT2: 'triage' },
      { id: 'plague_ward', name: 'Plague Ward', icon: '🛡️', desc: 'Passive: Allies within 10ft +1 Magical Defence vs disease and poison saves. + Harmony: +1 Magical Defence vs disease and poison per Medic with this aura in range (no Reaction).', prereqT2: 'antidote_training' },
      { id: 'revival_draft', name: 'Revival Draft', icon: '💉', desc: 'Craft: Brew a rare revival draft — remove Incapacitated or one minor debuff (once per target per day).', prereqT2: 'clean_bandage' }
    ]
  ),
  alchemist: careerTree(
    { id: 'apothecary', name: 'Apothecary', icon: '⚗️', desc: 'Craft: Basic potions and alchemical reagents.' },
    [
      { id: 'acid_vials', name: 'Acid Vials', icon: '🧴', desc: 'Craft/throw: Volatile brew — on hit 1d6 acid; 40% Weakened. + Harmony Reaction: same target, same round (+1 acid damage per Alchemist).' },
      { id: 'smoke_and_flash', name: 'Smoke & Flash', icon: '💨', desc: 'Craft: Smoke and flash powder — cover a retreat or confuse foes; no damage.' },
      { id: 'label_reader', name: 'Label Reader', icon: '🏷️', desc: 'Passive: Reagent identification — safely identify unknown liquids and powders (poison, potion, or inert) before anyone uses them.' }
    ],
    [
      { id: 'explosive_compounds', name: 'Explosive Compounds', icon: '💣', desc: 'Craft: Volatile bombs (3d6 in 15ft; separate attack roll per target vs Magical Defence).', prereqT2: 'acid_vials' },
      { id: 'transmute_salts', name: 'Transmute Salts', icon: '🧂', desc: 'Craft: Material transmutation — convert common materials into alchemical bases (GM: daily quota).', prereqT2: 'smoke_and_flash' },
      { id: 'volatile_expert', name: 'Volatile Expert', icon: '☢️', desc: 'Passive: You and allies take −1 damage from your own alchemical blasts (minimum 0).', prereqT2: 'label_reader' }
    ]
  ),
  enchanter: careerTree(
    { id: 'rune_apprentice', name: 'Rune Apprentice', icon: '✨', desc: 'Craft: Rune inscription — apply one minor enchant to gear (+1 stat or similar effect).' },
    [
      { id: 'elemental_ink', name: 'Elemental Ink', icon: '🔥', desc: 'Craft: Inscribe Fire, Ice, or Lightning +1d6 on a weapon (permanent enchant, not a toggle).' },
      { id: 'ward_scribe', name: 'Ward Scribe', icon: '📜', desc: 'Craft: Protective warding — inscribe charms granting +1 Magical Defence (permanent slot enchant on armour).' },
      { id: 'identify_magic', name: 'Identify Magic', icon: '🔍', desc: 'Action: Arcane appraisal — inspect a magic item; learn properties and curse risk before anyone equips it.' }
    ],
    [
      { id: 'soul_bind', name: 'Soul Bind', icon: '👻', desc: 'Craft: Master engraving — soul-bind an item to its owner (others suffer −2 using it).', prereqT2: 'elemental_ink' },
      { id: 'artifact_shaping', name: 'Artifact Shaping', icon: '🏆', desc: 'Craft: Master engraving — items you make gain 2 enchantment slots.', prereqT2: 'ward_scribe' },
      { id: 'dispel_touch', name: 'Dispel Touch', icon: '✋', desc: 'Action: Protective warding — suppress one hostile magical effect on an object or creature for 1 hour.', prereqT2: 'identify_magic' }
    ]
  ),
  detective: careerTree(
      { id: 'keen_eye', name: 'Keen Eye', icon: '👁️', desc: 'Action: Scene examination — study a scene or object; GM reveals one clue tier. + Harmony Reaction: same scene (+1 clue tier per Detective).' },
    [
      { id: 'trace_evidence', name: 'Trace Evidence', icon: '🔎', desc: 'Passive: Spot disturbed objects, footprints, blood, or recent magic residue at a scene.' },
      { id: 'interview', name: 'Interview', icon: '💬', desc: 'Action: Witness interrogation — +2 to read lies or pressure answers (GM social roll).' },
      { id: 'case_notes', name: 'Case Notes', icon: '📓', desc: 'Passive: Once per scene, reroll a failed investigation check.' }
    ],
    [
      { id: 'reconstruct', name: 'Reconstruct', icon: '🕰️', desc: 'Action: Trail and timeline reconstruction — visualise recent events at a location (last 24 hours; wilderness, ruins, or camp — GM narrative).', prereqT2: 'trace_evidence' },
      { id: 'follow_the_trail', name: 'Follow the Trail', icon: '👣', desc: 'Action: Determine which way a specific person or creature went within the last 8 hours.', prereqT2: 'interview' },
      { id: 'deduction', name: 'Deduction', icon: '🧠', desc: 'Passive: Clue synthesis — connect two clues the party already knows; GM must give a useful inference if both are known.', prereqT2: 'case_notes' }
    ]
  ),
  ranger: careerTree(
    { id: 'trail_warden', name: 'Trail Warden', icon: '🌲', desc: 'Passive: Wilderness tracking — follow tracks; know number and rough size of a group. Party ignores difficult undergrowth on overland travel (GM).' },
    [
      { id: 'ambush_spotter', name: 'Ambush Spotter', icon: '🎯', desc: 'Passive: Snares and ambush — when you scout ahead for 1 minute, the party gains +1 initiative.' },
      { id: 'snare_craft', name: 'Snare Craft', icon: '🪤', desc: 'Craft: Set simple snares and alarm traps — GM sets DC and effect.' },
      { id: 'keen_sight', name: 'Keen Sight', icon: '👁️', desc: 'Passive: Wilderness vigilance — +1 to spot hidden creatures, ambushes, or traps at range (you or allies on overwatch benefit).' }
    ],
    [
      { id: 'long_watch', name: 'Long Watch', icon: '🔭', desc: 'Action: Wilderness tracking — follow one quarry for a day; learn camp sites and direction of travel.', prereqT2: 'ambush_spotter' },
      { id: 'camouflage_net', name: 'Camouflage Net', icon: '🕸️', desc: 'Craft: Snares and ambush — camouflage a camp from casual search (+2 Stealth for the camp).', prereqT2: 'snare_craft' },
      { id: 'volley_call', name: 'Volley Call', icon: '📣', desc: 'Action: Marked quarry — call out one target; one ally gains +1 accuracy on their next attack roll vs it. Once per combat. + Harmony Reaction: same target (each Ranger adds +1 accuracy to marked allies\' next attack roll vs that target and marks one more ally).', prereqT2: 'keen_sight' }
    ]
  ),
  soldier: careerTree(
    { id: 'soldier_training', name: 'Soldier Training', icon: '🛡️', desc: 'Passive: Armoured discipline — +1 Strength while wearing medium or heavy armour.' },
    [
      { id: 'shield_wall', name: 'Shield Wall', icon: '🛡️', desc: 'Action: Shield formation — adjacent ally gains +1 Physical Defence until your next turn. + Harmony Reaction: same ally (each Soldier in the huddle adds +1 Physical Defence per Soldier helping — count heads, add that many once per Soldier; 3 Soldiers → +9 Physical Defence; 5 Soldiers on one ally → +25 Physical Defence).' },
      { id: 'rally_cry', name: 'Rally Cry', icon: '📣', desc: 'Action: Battlefield rally — one ally within 30ft may reroll a failed save (once per combat). + Harmony Reaction: that reroll (+2 for each participating Soldier; 5 Soldiers → +10 on the reroll).' },
      { id: 'hold_the_line', name: 'Hold the Line', icon: '⚔️', desc: 'Passive: Shield formation — +1 Physical Defence when an ally is within 10ft.' }
    ],
    [
      { id: 'phalanx', name: 'Phalanx', icon: '🏛️', desc: 'Passive: Volley focus — when you and two or more allies attack the same target, all gain +1 accuracy. + Harmony: +1 accuracy on next hit vs that enemy per Phalanx Soldier in the volley; when 2+ Phalanx Soldiers attack, also +1d4 damage per Phalanx Soldier (all focus-fire attackers benefit; no Reaction).', prereqT2: 'shield_wall' },
      { id: 'second_wind', name: 'Soldier\'s Second Wind', icon: '💨', desc: 'Action: Battlefield rally — restore 1d6 HP (once per short rest).', prereqT2: 'rally_cry' },
      { id: 'commanders_presence', name: 'Commander\'s Presence', icon: '👑', desc: 'Passive: Battlefield rally — allies within 10ft gain +1 to initiative.', prereqT2: 'hold_the_line' }
    ]
  ),
  mage: careerTree(
    { id: 'arcane_study', name: 'Arcane Study', icon: '📘', desc: 'Passive: Career support — allies you help with magic gain +1 effective Magic Power on buffs and heals you apply to them.' },
    [
      { id: 'empower_ally', name: 'Empower Ally', icon: '✨', desc: 'Action: Spell empowerment — ally\'s next spell or magical attack gains +1d4 damage or heal +2 HP (once per ally per combat). + Harmony Reaction: same ally (when 2+ Mages, +1d6 damage or +3 HP instead).' },
      { id: 'mana_font', name: 'Mana Font', icon: '🔮', desc: 'Passive: Arcane sustenance — allies within 10ft regain +1 Stamina when they cast a tier-1 spell (once per round per ally).' },
      { id: 'dispel_assist', name: 'Dispel Assist', icon: '🧹', desc: 'Action: Circle warding assist — grant an ally +2 on their next dispel or cleanse attempt (GM).' }
    ],
    [
      { id: 'amplified_healing', name: 'Amplified Healing', icon: '💚', desc: 'Passive: Amplified aid — healing you apply to others restores +2 HP.', prereqT2: 'empower_ally' },
      { id: 'ward_circle', name: 'Ward Circle', icon: '⭕', desc: 'Action: Circle warding — 10ft aura; allies +1 Magical Defence for 3 rounds (once per combat). + Harmony Reaction: overlapping circles (each Mage in the overlap adds +1 Magical Defence per Mage helping — count Mages, add that many once per Mage; 3 Mages → +9 Magical Defence; 5 Mages → +25 Magical Defence).', prereqT2: 'mana_font' },
      { id: 'shared_focus', name: 'Shared Focus', icon: '🤝', desc: 'Passive: Arcane sustenance — once per combat, sustain one ally\'s concentration effect without spending your action (GM).', prereqT2: 'dispel_assist' }
    ]
  ),
  musician: careerTree(
    { id: 'work_song', name: 'Work Song', icon: '⛏️', desc: 'Action: Sustained performance — up to 3 turns (5 Stamina once); allies in hearing range +1 Strength per performing Musician. + Harmony Reaction: join the same song (+1 Physical Defence per Musician while sustained; e.g. 6 Musicians → +6 Strength and +6 Physical Defence). Sing without an instrument; off-hand instruments amplify (see glossary Instrument amplify).' },
    [
      { id: 'long_set', name: 'Long Set', icon: '🎭', desc: 'Passive: Sustained performance — your songs may last 1 extra turn (e.g. Work Song up to 4 turns).' },
      { id: 'marching_tune', name: 'Marching Tune', icon: '🥁', desc: 'Action: Sustained performance — up to 2 turns (4 Stamina once); allies in hearing range +1 Speed per performing Musician. + Harmony Reaction: join the same song (+1 initiative for listeners while sustained).' },
      { id: 'soothing_hymn', name: 'Soothing Hymn', icon: '🕊️', desc: 'Action: Allied ballad — sustain up to 2 turns (4 Stamina once); allies in hearing range +1 Magical Defence per performing Musician. + Harmony Reaction: join the same song (+1 Stamina at the start of each listener\'s turn while sustained).' }
    ],
    [
      { id: 'battle_anthem', name: 'Battle Anthem', icon: '🎺', desc: 'Action: Allied ballad — sustain up to 3 turns (6 Stamina once); allies in hearing range +1 accuracy per performing Musician. + Harmony Reaction: join the same song (+1 damage on next hit per Musician while sustained).', prereqT2: 'marching_tune' },
      { id: 'dissonant_note', name: 'Dissonant Note', icon: '🎸', desc: 'Action: Enemy dissonance — sustain 1 turn (4 Stamina once); enemies in hearing range −1 accuracy per performing Musician. + Harmony Reaction: join the same song (−1 per Musician on enemy saves while sustained).', prereqT2: 'soothing_hymn' },
      { id: 'encore', name: 'Encore', icon: '🎤', desc: 'Passive: Sustained performance — once per combat, play the same song again for free, but only for its original length (no Long Set, instrument, or other bonus turns).', prereqT2: 'long_set' }
    ]
  ),
  paladin: careerTree(
    { id: 'oathbound', name: 'Oathbound', icon: '⚔️', desc: 'Passive: Oathbound resolve — +1 Magical Defence; +2 on saves vs fear (GM).' },
    [
      { id: 'lay_on_hands', name: 'Lay on Hands', icon: '🤲', desc: 'Action: Lay on hands — touch an ally and restore 1d6+1 HP (once per ally per day).' },
      { id: 'rebuke', name: 'Rebuke', icon: '✋', desc: 'Action: Rebuke a foe — one enemy hesitates; save or cannot use reactions until your next turn (once per combat).' },
      { id: 'bulwark', name: 'Bulwark', icon: '🧱', desc: 'Passive: Holy protection — +1 Physical Defence while below half HP.' }
    ],
    [
      { id: 'aura_of_protection', name: 'Aura of Protection', icon: '🌟', desc: 'Passive: Holy protection — allies within 10ft +1 Magical Defence vs fear and charm. + Harmony: +1 Magical Defence vs fear and charm per Paladin with this aura in range (no Reaction).', prereqT2: 'lay_on_hands' },
      { id: 'turn_shadow', name: 'Turn Shadow', icon: '☀️', desc: 'Action: Rebuke the unholy — ward 10ft; hostile undead or demons must save to enter (weaker than full Turn; once per combat).', prereqT2: 'rebuke' },
      { id: 'sacred_stance', name: 'Sacred Stance', icon: '🛐', desc: 'Action: Holy protection — +2 Physical Defence and +2 Magical Defence until end of your next turn; you cannot move.', prereqT2: 'bulwark' }
    ]
  ),
  thief: careerTree(
    { id: 'light_fingers', name: 'Light Fingers', icon: '🤏', desc: 'Passive: Pickpocket and filch — +2 on pickpocket and sleight-of-hand (GM).' },
    [
      { id: 'slip_away', name: 'Slip Away', icon: '💨', desc: 'Action: Slip away — disengage from melee without provoking opportunity attacks (once per combat).' },
      { id: 'shadow_blend', name: 'Shadow Blend', icon: '🌑', desc: 'Passive: Shadow stealth — +1 to Stealth in light armour or none.' },
      { id: 'dirty_trick', name: 'Dirty Trick', icon: '🎭', desc: 'Action: Distraction setup — distract a foe; one ally gains +2 accuracy on their next attack roll vs that target. + Harmony Reaction: same foe (each additional Thief adds +1 accuracy to that attack roll).' }
    ],
    [
      { id: 'filch', name: 'Filch', icon: '🎒', desc: 'Action: Pickpocket and filch — steal one small unequipped item from a target (GM contested roll; once per encounter).', prereqT2: 'slip_away' },
      { id: 'escape_artist', name: 'Escape Artist', icon: '🔗', desc: 'Passive: Slip away — +2 vs grapples, restraints, and mundane traps.', prereqT2: 'shadow_blend' },
      { id: 'hit_and_run', name: 'Hit and Run', icon: '🏃', desc: 'Passive: Slip away — after you deal damage, move 10ft without provoking opportunity attacks (once per turn).', prereqT2: 'dirty_trick' }
    ]
  ),
  berserker: careerTree(
    { id: 'battle_fury', name: 'Battle Fury', icon: '😤', desc: 'Passive: Wounded fury — +1 damage on melee attacks while below half HP.' },
    [
      { id: 'reckless_strike', name: 'Reckless Strike', icon: '💥', desc: 'Action: Reckless assault — your next attack gains +2 damage; you suffer −2 Physical Defence until your next turn.' },
      { id: 'intimidate', name: 'Intimidate', icon: '😠', desc: 'Action: Battlefield intimidation — foes within 10ft save or suffer −1 accuracy for 1 round. + Harmony Reaction: same area (−1 accuracy per Berserker on failed save).' },
      { id: 'bloodlust', name: 'Bloodlust', icon: '🩸', desc: 'Passive: Wounded fury — on a kill or critical hit, regain 1 Stamina.' }
    ],
    [
      { id: 'rage', name: 'Rage', icon: '🔥', desc: 'Action: Wounded fury — +2 Strength, −1 Magical Defence for 3 rounds (once per combat).', prereqT2: 'reckless_strike' },
      { id: 'unstoppable', name: 'Unstoppable', icon: '🦬', desc: 'Passive: Reckless assault — ignore difficult terrain while moving toward a hostile target.', prereqT2: 'intimidate' },
      { id: 'executioner', name: 'Executioner', icon: '⚰️', desc: 'Passive: Coup de grace — +2 damage vs bloodied targets (GM: below half HP).', prereqT2: 'bloodlust' }
    ]
  ),
  marksman: careerTree(
    { id: 'steady_hand', name: 'Steady Hand', icon: '🎯', desc: 'Passive: Steady aim — +1 accuracy with ranged weapon attacks.' },
    [
      { id: 'overwatch', name: 'Overwatch', icon: '👁️', desc: 'Action: Overwatch shot — ready a shot; interrupt one enemy moving in your line of sight (GM).' },
      { id: 'suppressing_fire', name: 'Suppressing Fire', icon: '🔫', desc: 'Action: Pinning shots into a zone — enemies suffer −1 to attacks or movement for 1 round. + Harmony Reaction: same zone (−1 penalty per Marksman).' },
      { id: 'quick_reload', name: 'Quick Reload', icon: '⚡', desc: 'Passive: Steady aim — ranged attacks cost 1 less Stamina (minimum 0).' }
    ],
    [
      { id: 'called_shot', name: 'Called Shot', icon: '🎯', desc: 'Action: Steady aim — −2 to hit; on hit, +1d6 damage (once per target per combat).', prereqT2: 'overwatch' },
      { id: 'volley_support', name: 'Volley Support', icon: '📣', desc: 'Passive: Marked for allies — allies gain +1 accuracy vs a target you damaged this round.', prereqT2: 'suppressing_fire' },
      { id: 'snap_shot', name: 'Snap Shot', icon: '💫', desc: 'Passive: Steady aim — your first ranged attack each combat ignores half-cover penalties (GM).', prereqT2: 'quick_reload' }
    ]
  ),
  duelist: careerTree(
    { id: 'precise_footwork', name: 'Precise Footwork', icon: '🩰', desc: 'Passive: Dueling footwork — +1 Speed while wielding a one-handed weapon.' },
    [
      { id: 'parry_riposte', name: 'Parry & Riposte', icon: '🤺', desc: 'Action: Parry and riposte — when hit by a melee attack, contest to negate damage once per round (GM).' },
      { id: 'feint', name: 'Feint', icon: '🎪', desc: 'Action: Feint and misdirection — your next attack vs one target: roll twice, keep the higher result (once per combat).' },
      { id: 'disengage_master', name: 'Disengage Master', icon: '👟', desc: 'Passive: Dueling footwork — leaving melee does not provoke from one chosen foe per turn.' }
    ],
    [
      { id: 'flourish', name: 'Flourish', icon: '✨', desc: 'Action: Parry and riposte — attack and force a save; on fail, target loses reactions until your next turn.', prereqT2: 'parry_riposte' },
      { id: 'dueling_stance', name: 'Dueling Stance', icon: '⚔️', desc: 'Passive: Single-foe focus — +1 Physical Defence vs one chosen opponent until you change target.', prereqT2: 'feint' },
      { id: 'finishing_thrust', name: 'Finishing Thrust', icon: '🗡️', desc: 'Passive: Single-foe focus — +2 damage vs targets who have not yet acted this round.', prereqT2: 'disengage_master' }
    ]
  )
}

/** Old profession skill id → new career skill id (for recipe gates). */
const RECIPE_SKILL_MAP = {
  basic_smithing: 'apprentice_smith',
  weapon_smithing: 'weaponwright',
  armor_smithing: 'armourer',
  enchanted_smithing: 'master_alloy',
  alloy_crafting: 'master_alloy',
  advanced_smithing: 'master_alloy',
  legendary_smithing: 'tempered_steel',
  divine_smithing: 'tempered_steel',
  dragon_smithing: 'tempered_steel',
  titan_smithing: 'tempered_steel',
  void_smithing: 'siege_breaker',
  basic_cooking: 'camp_cook',
  hearty_meals: 'hearty_rations',
  agility_cooking: 'spice_box',
  stat_boosting_food: 'spice_box',
  magical_cooking: 'banquet_planner',
  legendary_cooking: 'banquet_planner',
  culinary_mastery: 'battle_breakfast',
  master_chef: 'chefs_instinct',
  void_cooking: 'chefs_instinct',
  scent_masking: 'chefs_instinct',
  plant_identification: 'field_medic',
  herbal_remedies: 'field_medic',
  healing_salves: 'triage',
  elemental_herbalism: 'antidote_training',
  magical_herbs: 'surgical_touch',
  strength_herbalism: 'surgical_touch',
  moon_herbalism: 'surgical_touch',
  phoenix_herbalism: 'revival_draft',
  spirit_herbalism: 'plague_ward',
  void_herbalism: 'plague_ward',
  cosmic_herbalism: 'revival_draft',
  herbalism_mastery: 'revival_draft',
  hands_in_soil: 'field_medic',
  preserve_harvest: 'triage',
  crop_rotation: 'antidote_training',
  green_thumb: 'surgical_touch',
  bountiful_plot: 'revival_draft',
  basic_alchemy: 'apothecary',
  poison_brewing: 'acid_vials',
  elixir_brewing: 'apothecary',
  barrier_brewing: 'transmute_salts',
  explosive_compounds: 'explosive_compounds',
  transmutation: 'transmute_salts',
  phase_brewing: 'volatile_expert',
  dragon_alchemy: 'volatile_expert',
  void_alchemy: 'volatile_expert',
  immortality_brewing: 'revival_draft',
  grand_alchemist: 'volatile_expert',
  elixir_of_life: 'revival_draft',
  basic_enchanting: 'rune_apprentice',
  elemental_infusion: 'elemental_ink',
  soul_binding: 'soul_bind',
  artifact_creation: 'artifact_shaping',
  archenchanter: 'dispel_touch',
  barrier_enchanting: 'ward_scribe',
  dimensional_enchanting: 'elemental_ink',
  divine_enchanting: 'soul_bind',
  divine_runecarving: 'artifact_shaping',
  weapon_enchanting: 'elemental_ink',
  infinity_binding: 'artifact_shaping',
  reality_binding: 'dispel_touch',
  artifact_study: 'keen_eye',
  ancient_knowledge: 'trace_evidence',
  crystal_archaeology: 'trace_evidence',
  dimensional_archaeology: 'reconstruct',
  divine_archaeology: 'follow_the_trail',
  genesis_archaeology: 'deduction',
  legendary_discovery: 'deduction',
  master_archaeologist: 'deduction',
  royal_archaeology: 'deduction',
  shadow_archaeology: 'trace_evidence',
  titan_archaeology: 'deduction',
  ancient_tongues: 'trace_evidence',
  trap_sense: 'trace_evidence',
  careful_extraction: 'reconstruct',
  lost_technique: 'deduction',
  divine_dig: 'follow_the_trail',
  replicate_relic: 'deduction',
  trail_reader: 'trail_warden'
}

/** Old recipe profession keys → career data keys (Craft tab filter). */
const PROFESSION_TO_CAREER = {
  smithing: 'blacksmith',
  cooking: 'chef',
  herbalism: 'medic',
  alchemy: 'alchemist',
  enchanting: 'enchanter',
  archaeology: 'detective',
  archaeologist: 'detective',
  farmer: 'medic'
}

function fusionSkill(id, name, tier, icon, desc, prerequisites) {
  return withActivationEffects({
    id,
    name,
    tier,
    cost: TIER_LUMEN_COST[tier] || 40,
    staminaCost: 0,
    desc,
    icon,
    prerequisites,
    fusionKind: 'career',
    specialEffects: []
  })
}

const CAREER_FUSIONS_DATA = {
  career_fusion: [
    fusionSkill(
      'fusion_ember_hearth',
      'Ember Hearth',
      2,
      '🔥🍳',
      'Craft (Hearty Provisions + Burning): Cook meals without a campfire. Meals you cook restore +1 HP.',
      { type: 'AND', skills: ['camp_cook', 'fireball'] }
    ),
    fusionSkill(
      'fusion_glacier_pantry',
      'Glacier Pantry',
      2,
      '❄️🫙',
      'Craft (Camp Provisioning + Preservation): Preserve food twice as long; chilled rations grant +1 Stamina when eaten.',
      { type: 'AND', skills: ['ice_armor'], anyOfSkills: ['camp_cook', 'hearty_rations'] }
    ),
    fusionSkill(
      'fusion_field_spark',
      'Field Spark',
      2,
      '⚡💊',
      'Action (Stabilise & Revive + Conductivity): Jump-start a downed ally — restore 1 HP and remove Stunned (once per target per day).',
      { type: 'AND', skills: ['field_medic', 'lightning_bolt'] }
    ),
    fusionSkill(
      'fusion_shadow_snatch',
      'Shadow Snatch',
      2,
      '🌑👁️',
      'Action (Scene Examination + Concealment): Lift one small unequipped item from a target while they are distracted (GM contested roll). Once per long rest.',
      { type: 'AND', skills: ['keen_eye', 'shadow_step', 'darkness'] }
    ),
    fusionSkill(
      'fusion_mirage_patter',
      'Mirage Patter',
      2,
      '✨💬',
      'Action (Witness Interrogation + Radiance): Weave a brief believable illusion into conversation (+2 social bluff; no combat decoys).',
      { type: 'AND', skills: ['blinding_flash', 'interview'] }
    ),
    fusionSkill(
      'fusion_ward_meal',
      'Ward Meal',
      2,
      '✝️🍳',
      'Craft (Hearty Provisions + Protective Warding): Blessed meal removes fear or charm when eaten (once per creature per day).',
      { type: 'AND', skills: ['camp_cook'], anyOfSkills: ['oathbound', 'lay_on_hands', 'healing_light', 'purify'] }
    ),
    fusionSkill(
      'fusion_living_map',
      'Living Map',
      2,
      '🗺️🌲',
      'Passive (Wilderness Tracking + Divination): Once per day, sense the safest path through wilderness for 8 hours (GM navigation).',
      { type: 'AND', skills: ['trail_warden'], anyOfSkills: ['darkvision', 'earth_sense', 'illuminate'] }
    ),
    fusionSkill(
      'fusion_trap_runes',
      'Trap Runes',
      2,
      '🪤✨',
      'Craft (Snares & Ambush + Rune Inscription): Snares that trigger a minor rune (alarm + 1d4 magic damage).',
      { type: 'AND', skills: ['snare_craft', 'rune_apprentice'] }
    ),
    fusionSkill(
      'fusion_alchemical_frost',
      'Alchemical Frost',
      2,
      '❄️⚗️',
      'Craft (Volatile Brews + Preservation): Flash-freeze vials — utility slow, no direct spell damage.',
      { type: 'AND', skills: ['apothecary', 'ice_armor'] }
    ),
    fusionSkill(
      'fusion_wild_calm',
      'Wild Calm',
      2,
      '🐾🌲',
      'Action (Wilderness Tracking + Harmony): Calm one hostile beast for 1 minute (GM save).',
      { type: 'AND', skills: ['trail_warden'], anyOfSkills: ['earth_sense', 'gust'] }
    )
  ]
}

const careersOut = `// Auto-generated by scripts/generate-careers.mjs — do not edit by hand\nconst CAREERS_SKILLS_DATA = ${JSON.stringify(CAREERS_SKILLS_DATA, null, 4)}\n\nif (typeof window !== 'undefined') {\n  window.CAREERS_SKILLS_DATA = CAREERS_SKILLS_DATA\n}\n`
fs.writeFileSync(path.join(dataDir, 'careers-skills-data.js'), careersOut, 'utf8')

const fusionsOut = `// Auto-generated by scripts/generate-careers.mjs — do not edit by hand\nconst CAREER_FUSIONS_DATA = ${JSON.stringify(CAREER_FUSIONS_DATA, null, 4)}\n\nif (typeof window !== 'undefined') {\n  window.CAREER_FUSIONS_DATA = CAREER_FUSIONS_DATA\n}\n`
fs.writeFileSync(path.join(dataDir, 'career-fusions-skills-data.js'), fusionsOut, 'utf8')

const profPath = path.join(dataDir, 'profession-items-data.js')
let profCode = fs.readFileSync(profPath, 'utf8')
const mapSkill = id => RECIPE_SKILL_MAP[id] || id
profCode = profCode.replace(/"requiredSkills":\s*\[([\s\S]*?)\]/g, (match, inner) => {
  const ids = [...inner.matchAll(/"([^"]+)"/g)].map(m => m[1])
  if (!ids.length) return match
  const mapped = [...new Set(ids.map(mapSkill))]
  return `"requiredSkills": [\n                ${mapped.map(id => `"${id}"`).join(',\n                ')}\n            ]`
})
profCode = profCode.replace(/"profession":\s*"([^"]+)"/g, (match, key) => {
  const career = PROFESSION_TO_CAREER[key] || key
  return `"profession": "${career}"`
})
fs.writeFileSync(profPath, profCode, 'utf8')

console.log(`Wrote careers-skills-data.js (${Object.keys(CAREERS_SKILLS_DATA).length} careers)`)
console.log(`Wrote career-fusions-skills-data.js (${CAREER_FUSIONS_DATA.career_fusion.length} fusions)`)
console.log('Updated profession-items requiredSkills and profession keys')
