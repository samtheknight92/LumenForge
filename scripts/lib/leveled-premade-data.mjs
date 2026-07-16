/**
 * Hand-authored content for the leveled premade roster (see build-premade-characters.mjs).
 * Every NPC role / monster family / pedestrian variant defines:
 *   - shape: relative stat-purchase weights fed to the threat solver (not raw stats)
 *   - skillPool: real skill IDs in a sensible pick-up order (tier is looked up live,
 *     so this list can freely mix tiers — the build script filters by level band)
 *   - weaponKind / armorTrack / accessoryFocus / offhandTrack: gear flavor
 *   - concept: one-line "who is this" used by premade-notes.mjs
 * Threat Level is the single shared "how strong" scale (1-50) for every category —
 * see js/threat-level.js. Pedestrians stop at 15; NPCs and Monsters run the full range.
 */

export const LEVEL_BANDS = {
  npc: [[1, 8], [9, 16], [17, 24], [25, 32], [33, 42], [43, 50]],
  monster: [[1, 8], [9, 16], [17, 24], [25, 32], [33, 42], [43, 50]],
  pedestrian: [[1, 5], [6, 10], [11, 15]]
}

export const TIER_CAP_BY_BAND = {
  npc: [1, 2, 3, 4, 5, 5],
  monster: [1, 2, 3, 4, 5, 5],
  pedestrian: [1, 2, 3]
}

export const NPC_BAND_PREFIX = ['', 'Veteran ', 'Elite ', 'Master ', 'Legendary ', 'Mythic ']

export function bandIndexForLevel(category, level) {
  const bands = LEVEL_BANDS[category]
  for (let i = 0; i < bands.length; i += 1) {
    const [lo, hi] = bands[i]
    if (level >= lo && level <= hi) return i
  }
  return bands.length - 1
}

export function tierCapForLevel(category, level) {
  return TIER_CAP_BY_BAND[category][bandIndexForLevel(category, level)]
}

/** Shared 0..1 power scale across ALL categories (Threat 1-50), used for gear rarity. */
export function gearFraction(level) {
  return Math.min(1, Math.max(0, (level - 1) / 49))
}

export function targetSkillCount(level) {
  // Leave room for Combat Power so SL + CP can still hit the target Threat Level.
  const maxForThreat = Math.max(0, Number(level || 0) - 1)
  return Math.min(maxForThreat, Math.min(18, Math.floor(Number(level || 0) * 0.45)))
}

// ─── Gear tables (ordered common → legendary within each list) ───

export const WEAPON_TIERS = {
  sword: ['bronze_sword', 'iron_sword', 'steel_sword', 'silver_sword', 'flame_blade', 'frost_sword', 'wind_blade', 'obsidian_blade', 'dragon_blade'],
  dagger: ['bronze_dagger', 'iron_dagger', 'main_gauche', 'silver_dagger', 'poison_dagger', 'shadow_dagger', 'assassin_blade', 'void_dagger', 'shadow_fang'],
  ranged: ['training_bow', 'hunting_bow', 'crossbow', 'composite_bow', 'lightning_bow', 'elvish_bow', 'crystal_bow', 'storm_bow', 'celestial_bow'],
  hammer: ['stone_hammer', 'iron_mace', 'war_hammer', 'blessed_mace', 'frost_hammer', 'earth_hammer', 'thunder_hammer', 'titan_hammer', 'void_crusher'],
  axe: ['bronze_axe', 'iron_axe', 'battle_axe', 'double_axe', 'berserker_axe', 'executioner_axe', 'demon_axe', 'chaos_axe', 'world_cleaver'],
  staff: ['wooden_staff', 'quarterstaff', 'mystic_staff', 'crystal_staff', 'arcane_staff', 'void_staff', 'elemental_staff', 'cosmic_staff', 'genesis_rod'],
  polearm: ['bronze_spear', 'iron_spear', 'spear', 'halberd', 'pike', 'glaive', 'dragon_lance', 'infinity_spear', 'reality_piercer'],
  striker: []
}

export const ARMOR_TRACKS = {
  light: ['cloth_robes', 'mage_robes', 'fire_robes', 'void_armor', 'celestial_robes'],
  medium: ['leather_armor', 'studded_leather', 'shadow_cloak', 'ice_armor', 'dragon_scale_armor'],
  heavy: ['chain_mail', 'scale_mail', 'plate_mail', 'knight_armor', 'dragon_scale_armor']
}

export const OFFHAND_TRACKS = {
  shield: ['wooden_shield', 'round_buckler', 'iron_shield', 'steel_kite_shield', 'heater_shield', 'warden_targe', 'tower_guard_shield', 'mirror_shield', 'aegis_of_dawn'],
  tome: ['apprentice_spell_tome', 'arcane_focus_orb', 'novice_wand', 'scholars_grimoire', 'star_chart_folio', 'mages_codex', 'spell_scarab', 'void_scripture']
}

export const ACCESSORY_BY_FOCUS = {
  strength: ['power_ring', 'belt_of_giant_strength', 'gauntlets_of_ogre_power'],
  magicPower: ['power_ring', 'pendant_of_wisdom', 'headband_of_intellect', 'amulet_of_mana', 'crystal_monocle'],
  accuracy: ['hunter_focus_charm', 'marksman_gloves', 'eagle_eye_pendant', 'precision_scope'],
  speed: ['lucky_coin', 'ring_of_speed', 'boots_of_stealth', 'speed_boots', 'winged_boots'],
  physicalDefence: ['ring_of_protection', 'amulet_of_earth', 'iron_boots', 'cloak_of_displacement'],
  magicalDefence: ['ring_of_protection', 'pendant_of_wisdom', 'amulet_of_shadows', 'cloak_of_elvenkind'],
  generic: ['lucky_coin', 'power_ring', 'ring_of_protection']
}

export const POTION_BANDS = [
  [{ itemId: 'health_potion', qty: 2 }],
  [{ itemId: 'health_potion', qty: 2 }, { itemId: 'stamina_potion', qty: 1 }],
  [{ itemId: 'health_potion', qty: 3 }, { itemId: 'stamina_potion', qty: 2 }],
  [{ itemId: 'greater_health_potion', qty: 2 }, { itemId: 'superior_stamina_potion', qty: 1 }],
  [{ itemId: 'greater_health_potion', qty: 3 }, { itemId: 'superior_stamina_potion', qty: 2 }],
  [{ itemId: 'greater_health_potion', qty: 3 }, { itemId: 'superior_stamina_potion', qty: 2 }, { itemId: 'phoenix_feather', qty: 1 }]
]

// ─── NPC archetypes (14) — rotate 3/level across Threat 1-50 ───

export const NPC_ARCHETYPES = [
  {
    key: 'duelist',
    label: 'Duelist',
    shape: { strength: 2.2, accuracy: 2.6, speed: 1.4, hp: 0.5, stamina: 0.3, physicalDefence: 0.6, magicalDefence: 0.1 },
    weaponKind: 'sword',
    armorTrack: 'medium',
    accessoryFocus: 'accuracy',
    skillPool: ['sword_basics', 'sword_stance', 'precise_footwork', 'quick_strike', 'parry', 'parry_riposte', 'lunge_attack', 'feint', 'riposte', 'dueling_stance', 'blade_dance', 'defensive_stance', 'master_parry', 'flourish', 'finishing_thrust', 'whirlwind', 'sword_mastery'],
    capstone: 'ultimate_perfect_riposte',
    concept: 'lives by clean footwork and a well-timed riposte, not brute force'
  },
  {
    key: 'battle_mage',
    label: 'Battle Mage',
    shape: { strength: 1.2, magicPower: 2.2, accuracy: 1.6, hp: 0.6, stamina: 0.5, physicalDefence: 0.3, magicalDefence: 0.5 },
    weaponKind: 'sword',
    armorTrack: 'light',
    offhandTrack: 'tome',
    accessoryFocus: 'magicPower',
    skillPool: ['sword_basics', 'fire_spark', 'warm_hands', 'quick_strike', 'fireball', 'fire_shield', 'ignite', 'fire_attunement', 'fire_wall', 'flame_edge', 'inferno_parry', 'blazing_tempest'],
    concept: 'channels fire through the blade — half swordsman, half pyromancer'
  },
  {
    key: 'guardian',
    label: 'Guardian',
    shape: { physicalDefence: 2.6, magicalDefence: 1.2, hp: 2.0, stamina: 0.6, strength: 0.8, speed: 0.1, accuracy: 0.2 },
    weaponKind: 'polearm',
    armorTrack: 'heavy',
    offhandTrack: 'shield',
    accessoryFocus: 'physicalDefence',
    skillPool: ['polearm_basics', 'reach_advantage', 'polearm_defensive_stance', 'soldier_training', 'spear_wall', 'shield_wall', 'hold_the_line', 'phalanx_formation', 'bulwark', 'fortress_stance', 'aura_of_protection', 'oathbound'],
    capstone: 'ultimate_impregnable_reach',
    concept: 'plants their feet and refuses to move — the wall the rest of the party fights behind'
  },
  {
    key: 'ranger',
    label: 'Ranger',
    shape: { accuracy: 2.4, speed: 2.0, strength: 0.6, hp: 0.6, stamina: 0.6, physicalDefence: 0.3 },
    weaponKind: 'ranged',
    armorTrack: 'medium',
    accessoryFocus: 'accuracy',
    skillPool: ['ranged_basics', 'steady_aim', 'steady_hand', 'aimed_shot', 'grappling_shot', 'trail_warden', 'covering_fire', 'ambush_spotter', 'keen_sight', 'multi_shot', 'quick_draw', 'parting_shot', 'barrage', 'ranged_mastery'],
    capstone: 'ultimate_skyfall_volley',
    concept: 'reads the land and puts an arrow where it counts before anyone closes the distance'
  },
  {
    key: 'medic',
    label: 'Medic',
    shape: { magicPower: 1.4, magicalDefence: 1.0, hp: 1.0, stamina: 1.0, accuracy: 0.4, physicalDefence: 0.4 },
    weaponKind: 'striker',
    armorTrack: 'light',
    accessoryFocus: 'magicalDefence',
    skillPool: ['field_medic', 'triage', 'antidote_training', 'clean_bandage', 'light_ray', 'healing_light', 'purify', 'surgical_touch', 'plague_ward', 'revival_draft', 'sanctuary', 'resurrection'],
    concept: 'carries more bandages than weapons — keeps everyone else standing'
  },
  {
    key: 'berserker',
    label: 'Berserker',
    shape: { strength: 3.0, hp: 1.0, speed: 0.8, accuracy: 0.4, physicalDefence: 0.1, stamina: 0.3 },
    weaponKind: 'axe',
    armorTrack: 'medium',
    accessoryFocus: 'strength',
    toggles: ['berserker_rage'],
    skillPool: ['axe_basics', 'heavy_swing', 'battle_fury', 'cleave', 'reckless_strike', 'bloodlust', 'berserker_rage', 'rage', 'crushing_blow', 'wide_cleave', 'unstoppable', 'executioner', 'axe_storm', 'axe_mastery'],
    capstone: 'ultimate_worldbreaker_cleave',
    concept: 'trades every ounce of defence for raw swinging power and a bad temper'
  },
  {
    key: 'assassin',
    label: 'Assassin',
    shape: { accuracy: 2.0, speed: 2.6, strength: 0.8, hp: 0.2, stamina: 0.4, physicalDefence: 0.1 },
    weaponKind: 'dagger',
    armorTrack: 'light',
    accessoryFocus: 'speed',
    skillPool: ['dagger_basics', 'light_step', 'light_fingers', 'dual_wield', 'sneak_attack', 'poison_blade', 'shadow_step', 'slip_away', 'flurry', 'shadowstep', 'evasion', 'vital_strike', 'thousand_cuts', 'assassinate', 'shadow_clone', 'dagger_mastery'],
    capstone: 'ultimate_death_by_cuts',
    concept: 'wins fights before the target notices — high reward, thin margin for error'
  },
  {
    key: 'warlock',
    label: 'Warlock',
    shape: { magicPower: 3.0, accuracy: 0.6, hp: 0.6, stamina: 0.6, magicalDefence: 0.4, physicalDefence: 0.05 },
    weaponKind: 'staff',
    armorTrack: 'light',
    offhandTrack: 'tome',
    accessoryFocus: 'magicPower',
    skillPool: ['shadow_bolt', 'darkvision', 'darkness', 'shadow_step', 'life_drain', 'shadow_duplicate', 'nightmare', 'darkness_attunement', 'shadow_armor', 'void_prison', 'soul_steal', 'eclipse', 'darkness_mastery'],
    capstone: 'ultimate_eclipse_dominion',
    concept: 'trades a sturdy body for raw dark magic — a stiff breeze of physical damage puts them down'
  },
  {
    key: 'paladin',
    label: 'Paladin',
    shape: { physicalDefence: 1.6, magicalDefence: 1.4, hp: 1.6, strength: 1.2, magicPower: 0.5, stamina: 0.5, accuracy: 0.3 },
    weaponKind: 'sword',
    armorTrack: 'heavy',
    offhandTrack: 'shield',
    accessoryFocus: 'magicalDefence',
    skillPool: ['sword_basics', 'oathbound', 'lay_on_hands', 'bulwark', 'rebuke', 'holy_weapon', 'sanctuary', 'aura_of_protection', 'turn_shadow', 'sacred_stance', 'healing_light', 'light_shield'],
    concept: 'splits their training between front-line tanking and field medicine — built to protect, not to finish fights fast'
  },
  {
    key: 'alchemist',
    label: 'Alchemist',
    shape: { hp: 1.0, stamina: 1.2, accuracy: 0.8, physicalDefence: 0.6, magicPower: 0.4 },
    weaponKind: 'striker',
    armorTrack: 'light',
    accessoryFocus: 'generic',
    skillPool: ['apothecary', 'label_reader', 'acid_vials', 'smoke_and_flash', 'field_fit', 'explosive_compounds', 'weaponwright', 'transmute_salts', 'armourer', 'volatile_expert', 'master_alloy'],
    concept: 'carries more bombs and elixirs than weapons — a walking supply depot for every occasion'
  },
  {
    key: 'beastmaster',
    label: 'Beastmaster',
    shape: { accuracy: 1.4, strength: 1.0, speed: 1.2, hp: 1.0, stamina: 0.6, physicalDefence: 0.4 },
    weaponKind: 'ranged',
    armorTrack: 'medium',
    accessoryFocus: 'speed',
    skillPool: ['ranged_basics', 'steady_aim', 'trail_warden', 'ambush_spotter', 'snare_craft', 'field_medic', 'camouflage_net', 'long_watch', 'volley_call'],
    concept: 'spreads training evenly across ranged combat and survival — built to keep a companion (and themself) alive, not to specialise'
  },
  {
    key: 'trickster',
    label: 'Trickster',
    shape: { accuracy: 1.6, speed: 1.8, magicPower: 0.6, hp: 0.3, stamina: 0.6, physicalDefence: 0.1 },
    weaponKind: 'dagger',
    armorTrack: 'light',
    accessoryFocus: 'speed',
    skillPool: ['dagger_basics', 'light_step', 'shadow_step', 'darkness', 'slip_away', 'shadow_blend', 'dirty_trick', 'filch', 'escape_artist', 'hit_and_run', 'teleport'],
    concept: 'slips in, causes chaos, and slips back out — not built to trade blows'
  },
  {
    key: 'monk',
    label: 'Monk',
    shape: { strength: 1.6, speed: 1.6, hp: 1.0, stamina: 0.8, physicalDefence: 0.6, accuracy: 0.6 },
    weaponKind: 'striker',
    armorTrack: 'medium',
    accessoryFocus: 'speed',
    skillPool: ['striker_basics', 'open_stance', 'stone_fists', 'slip_parry', 'feint_strike', 'iron_palm', 'flurry_of_blows', 'joint_lock', 'iron_body', 'crushing_fist', 'striker_volley', 'iron_reversal', 'striker_mastery'],
    capstone: 'ultimate_flowing_perfection',
    concept: 'fights with nothing but hands, feet, and total command of their own body'
  },
  {
    key: 'elementalist',
    label: 'Elementalist',
    shape: { magicPower: 2.8, accuracy: 0.6, hp: 0.4, stamina: 0.8, magicalDefence: 0.3, physicalDefence: 0.05 },
    weaponKind: 'staff',
    armorTrack: 'light',
    offhandTrack: 'tome',
    accessoryFocus: 'magicPower',
    skillPool: ['fire_spark', 'ice_shard', 'warm_hands', 'frost_touch', 'fireball', 'ice_spear', 'fire_attunement', 'ice_attunement', 'fire_wall', 'blizzard', 'meteor', 'ice_age', 'inferno', 'fire_supremacy'],
    capstone: 'ultimate_inferno_crown',
    concept: 'burns and freezes in equal measure — huge magical burst, almost no physical toughness'
  }
]

// ─── Monster families (14) — each carries its own level-band naming ladder ───

export const MONSTER_FAMILIES = [
  {
    key: 'goblinoid',
    ladder: ['Goblin Scrapper', 'Goblin Raider', 'Hobgoblin Marauder', 'Orc Warband Leader', 'Ogre Chieftain', 'Demon-Touched Warlord'],
    shape: { strength: 1.8, hp: 1.2, physicalDefence: 0.8, speed: 0.6, accuracy: 0.6, stamina: 0.4 },
    weaponKind: 'axe',
    armorTrack: 'medium',
    isHumanoid: true,
    skillPool: ['tough_skin', 'claws', 'razor_claws', 'monster_charge_attack', 'rock_skin', 'monster_berserker_rage', 'pounce', 'magical_resistance', 'venomous_claws', 'multiattack', 'armored_plates', 'monster_blood_frenzy', 'metal_skin', 'damage_reduction'],
    concept: 'raids in packs — individually weak, but they hit harder and organize better with every generation'
  },
  {
    key: 'beast_wolf',
    ladder: ['Young Wolf', 'Dire Wolf', 'Alpha Direwolf', 'Primal Warg', 'Nightmare Fenris-Kin', 'Mythic World-Warg'],
    shape: { strength: 1.4, speed: 2.0, accuracy: 1.0, hp: 1.0, stamina: 0.6, physicalDefence: 0.3 },
    weaponKind: null,
    armorTrack: null,
    skillPool: ['bite_attack', 'pounce', 'tough_skin', 'crushing_bite', 'claws', 'razor_claws', 'monster_charge_attack', 'tail_swipe', 'multiattack', 'monster_blood_frenzy', 'rend'],
    concept: 'hunts in numbers, closes distance fast, and rarely stops to defend'
  },
  {
    key: 'ooze',
    ladder: ['Gelatinous Slime', 'Acid Ooze', 'Caustic Blob', 'Amorphous Horror', 'Ancient Ooze Colony', 'Primordial Devourer'],
    shape: { hp: 2.4, magicalDefence: 1.6, physicalDefence: 1.0, stamina: 0.6, speed: 0.02, accuracy: 0.02 },
    weaponKind: null,
    armorTrack: null,
    skillPool: ['tough_skin', 'acid_spit', 'rock_skin', 'regeneration', 'magical_resistance', 'damage_reduction', 'rapid_healing', 'metal_skin', 'immunity_poison'],
    concept: 'shrugs off nearly any hit and dishes damage back just as slowly — a war of attrition'
  },
  {
    key: 'spider_swarm',
    ladder: ['Cave Spider', 'Giant Spider', 'Broodmother', 'Webweaver Matriarch', 'Abyssal Spider Queen', 'Endless Swarm Empress'],
    shape: { accuracy: 1.6, speed: 1.6, strength: 0.6, hp: 0.8, stamina: 0.4, physicalDefence: 0.4 },
    weaponKind: null,
    armorTrack: null,
    skillPool: ['web_shot', 'bite_attack', 'venomous_claws', 'claws', 'razor_claws', 'tough_skin', 'pounce', 'poison_breath', 'multiattack'],
    concept: 'traps first, poisons second, and rarely fights fair'
  },
  {
    key: 'elemental',
    ladder: ['Flickering Elemental', 'Blazing Elemental', 'Elemental Vortex', 'Primal Elemental Lord', 'Avatar of the Elements', 'World-Ending Elemental'],
    shape: { magicPower: 2.6, magicalDefence: 1.0, hp: 0.8, stamina: 0.6, physicalDefence: 0.02, accuracy: 0.4 },
    weaponKind: null,
    armorTrack: null,
    skillPool: ['fire_breath', 'ice_breath', 'lightning_breath', 'magical_resistance', 'energy_drain', 'monster_earthquake', 'spell_turning', 'fear_aura'],
    concept: 'channels pure elemental force through almost no physical body — devastating magic, trivial to out-armour'
  },
  {
    key: 'undead',
    ladder: ['Restless Skeleton', 'Ravenous Ghoul', 'Wailing Banshee', 'Wraith of the Crypt', 'Lich Apprentice', 'Death Knight Sovereign'],
    shape: { magicalDefence: 1.6, magicPower: 1.2, hp: 1.0, stamina: 0.3, physicalDefence: 0.6, accuracy: 0.4, speed: 0.2 },
    weaponKind: 'sword',
    armorTrack: null,
    skillPool: ['energy_drain', 'paralyzing_gaze', 'life_drain', 'magical_resistance', 'mind_control', 'spell_turning', 'fear_aura', 'tough_skin', 'rock_skin'],
    concept: 'drains the life out of a fight slowly — control and attrition over brute force'
  },
  {
    key: 'construct',
    ladder: ['Rubble Construct', 'Stone Golem', 'Iron Sentinel', 'War Golem', 'Adamant Colossus', 'World-Forged Titan'],
    shape: { physicalDefence: 2.8, hp: 1.8, strength: 1.0, magicalDefence: 0.2, speed: 0.01, accuracy: 0.01, stamina: 0.2 },
    weaponKind: null,
    armorTrack: null,
    skillPool: ['rock_skin', 'metal_skin', 'tough_skin', 'monster_earthquake', 'armored_plates', 'damage_reduction', 'trample', 'monster_charge_attack'],
    concept: 'was built (literally) to soak hits — nearly unkillable head-on, but painfully slow and easy to outmaneuver'
  },
  {
    key: 'dragonkin',
    ladder: ['Wyrmling', 'Young Wyvern', 'Adult Drake', 'Elder Wyvern', 'Ancient Dragon', 'Primordial Dragon Sovereign'],
    shape: { strength: 1.2, magicPower: 1.4, physicalDefence: 1.2, magicalDefence: 1.2, hp: 1.6, speed: 0.6, accuracy: 0.4 },
    weaponKind: null,
    armorTrack: null,
    skillPool: ['tough_skin', 'rock_skin', 'fire_breath', 'monster_flight', 'tail_swipe', 'metal_skin', 'spiked_tail', 'rend', 'regeneration', 'rapid_healing', 'multiattack', 'magical_resistance', 'monster_ancient_knowledge'],
    concept: 'brings the complete package — tough, magical, mobile and dangerous at range and in melee'
  },
  {
    key: 'fiend',
    ladder: ['Lesser Imp', 'Shrieking Fiend', 'Pit Fiend', 'Greater Devil', 'Archdemon Herald', 'Demon Prince'],
    shape: { magicPower: 2.0, accuracy: 1.0, hp: 1.0, magicalDefence: 0.8, physicalDefence: 0.4, stamina: 0.4 },
    weaponKind: null,
    armorTrack: null,
    skillPool: ['fire_breath', 'energy_drain', 'paralyzing_gaze', 'mind_control', 'fear_aura', 'magical_resistance', 'multiattack'],
    concept: 'fights with fire and fear in equal measure, happiest when the party is scattered and afraid'
  },
  {
    key: 'avian',
    ladder: ['Scrub Hawk', 'War Eagle', 'Storm Roc', 'Sky Terror', 'Thunderwing Sovereign', "Storm-God's Herald"],
    shape: { speed: 2.2, accuracy: 1.6, strength: 0.6, hp: 0.4, stamina: 0.3, physicalDefence: 0.2 },
    weaponKind: null,
    armorTrack: null,
    skillPool: ['claws', 'monster_flight', 'razor_claws', 'pounce', 'tail_swipe', 'multiattack'],
    concept: 'owns the sky and the initiative — hard to pin down, but folds fast once actually caught'
  },
  {
    key: 'aquatic',
    ladder: ['River Serpent', 'Reef Terror', 'Deep Leviathan', 'Abyssal Horror', 'Kraken Spawn', 'Kraken Sovereign'],
    shape: { hp: 1.8, strength: 1.0, magicPower: 0.8, physicalDefence: 0.6, speed: 0.2, accuracy: 0.2 },
    weaponKind: null,
    armorTrack: null,
    skillPool: ['bite_attack', 'tail_swipe', 'crushing_bite', 'spiked_tail', 'energy_drain', 'mind_control', 'monster_earthquake', 'tough_skin'],
    concept: 'overwhelms with slow, crushing size rather than finesse'
  },
  {
    key: 'plant',
    ladder: ['Creeping Vine', 'Spore Stalker', 'Bloomless Horror', 'Rotwood Ancient', 'Primal Bloomlord', 'World-Root Devourer'],
    shape: { hp: 1.6, magicalDefence: 0.8, physicalDefence: 0.6, stamina: 0.4, speed: 0.01, accuracy: 0.2 },
    weaponKind: null,
    armorTrack: null,
    skillPool: ['tough_skin', 'venomous_claws', 'regeneration', 'rapid_healing', 'tail_swipe', 'magical_resistance'],
    concept: 'barely moves, poisons everything nearby, and simply refuses to die'
  },
  {
    key: 'giant',
    ladder: ['Hill Brute', 'Stone Giant', 'Frost Giant', 'Fire Giant', 'Cloud Giant Warlord', 'Ancient Giant-King'],
    shape: { strength: 2.4, hp: 2.0, physicalDefence: 0.8, accuracy: 0.2, speed: 0.05, magicPower: 0.1 },
    weaponKind: 'hammer',
    armorTrack: null,
    isHumanoid: true,
    skillPool: ['monster_charge_attack', 'trample', 'gore', 'tough_skin', 'rock_skin', 'monster_earthquake', 'fire_breath', 'ice_breath'],
    concept: 'hits like a landslide and shrugs off blows that would kill anything else — but slow to react and easy to bait'
  },
  {
    key: 'vermin_swarm',
    ladder: ['Rat Swarm', 'Plague Rat Horde', 'Locust Cloud', 'Vermin Tide', "Rat King's Legion", 'Endless Vermin Plague'],
    shape: { accuracy: 1.2, speed: 1.4, hp: 1.4, stamina: 0.4, physicalDefence: 0.3 },
    weaponKind: null,
    armorTrack: null,
    skillPool: ['bite_attack', 'crushing_bite', 'venomous_claws', 'multiattack', 'immunity_poison', 'tough_skin'],
    concept: 'swarms in numbers too great to fight one at a time — no single member is dangerous alone'
  }
]

// ─── Pedestrian variants (9) — rotate 3/level across Threat 1-15 ───

export const PEDESTRIAN_VARIANTS = [
  {
    key: 'farmer',
    race: 'dwarf',
    ladder: ['Farmhand', 'Steadfast Farmer', 'Homestead Elder'],
    shape: { hp: 1.2, strength: 0.8, physicalDefence: 0.6, stamina: 0.6 },
    weaponKind: 'hammer',
    armorTrack: 'medium',
    accessoryFocus: 'physicalDefence',
    skillPool: ['dwarven_toughness', 'forge_blessing', 'hammer_basics', 'heavy_impact'],
    concept: 'toughened their hands and back through years of fieldwork — not a fighter, but not an easy target either'
  },
  {
    key: 'merchant',
    race: 'human',
    ladder: ['Peddler', 'Established Merchant', 'Guild Trader'],
    shape: { hp: 0.6, stamina: 0.8, accuracy: 0.4, speed: 0.4 },
    weaponKind: 'dagger',
    armorTrack: 'light',
    accessoryFocus: 'generic',
    skillPool: ['human_determination', 'dagger_basics', 'light_step'],
    concept: 'keeps a dagger close and a fast exit closer — built for talking their way out of trouble, not fighting through it'
  },
  {
    key: 'guard',
    race: 'human',
    ladder: ['Town Watchman', 'Garrison Guard', 'Veteran Watch Captain'],
    shape: { physicalDefence: 1.4, hp: 1.0, strength: 0.6, accuracy: 0.4 },
    weaponKind: 'sword',
    armorTrack: 'heavy',
    offhandTrack: 'shield',
    accessoryFocus: 'physicalDefence',
    skillPool: ['human_determination', 'sword_basics', 'sword_stance', 'soldier_training', 'shield_wall'],
    concept: 'trained for years to hold a line and check papers — solid, unglamorous, dependable'
  },
  {
    key: 'apprentice',
    race: 'elf',
    ladder: ['Hedge Apprentice', 'Journeyman Mage', 'Elven Adept'],
    shape: { magicPower: 1.4, accuracy: 0.6, magicalDefence: 0.4, hp: 0.4 },
    weaponKind: 'staff',
    armorTrack: 'light',
    accessoryFocus: 'magicPower',
    skillPool: ['elven_accuracy', 'staff_basics', 'mana_focus', 'spell_power'],
    concept: 'still fumbles half their spells, but the half that land are already dangerous'
  },
  {
    key: 'elder_sage',
    race: 'elf',
    ladder: ['Village Sage', 'Respected Elder', 'Ancient Loremaster'],
    shape: { magicalDefence: 1.2, magicPower: 0.8, hp: 0.6, stamina: 0.6 },
    weaponKind: 'staff',
    armorTrack: 'light',
    accessoryFocus: 'magicalDefence',
    skillPool: ['elven_accuracy', 'forest_step', 'arcane_study', 'ward_circle'],
    concept: 'traded front-line strength for decades of study — dangerous to underestimate'
  },
  {
    key: 'brawler',
    race: 'halfling',
    ladder: ['Tavern Brawler', 'Back-Alley Scrapper', 'Undefeated Local Champion'],
    shape: { strength: 1.2, speed: 1.0, hp: 0.8, physicalDefence: 0.2 },
    weaponKind: 'striker',
    armorTrack: 'medium',
    accessoryFocus: 'strength',
    skillPool: ['lucky_dodge', 'sneaky_strike', 'striker_basics', 'open_stance', 'stone_fists'],
    concept: 'settles every argument with their fists and has the scars (and the win record) to prove it'
  },
  {
    key: 'traveler',
    race: 'tiefling',
    ladder: ['Road-Worn Traveler', 'Seasoned Wanderer', 'World-Weary Nomad'],
    shape: { speed: 1.2, magicalDefence: 0.6, hp: 0.6, stamina: 0.6, magicPower: 0.4 },
    weaponKind: 'dagger',
    armorTrack: 'light',
    accessoryFocus: 'speed',
    skillPool: ['infernal_constitution', 'hellish_rebuke', 'dagger_basics', 'light_step'],
    concept: 'has spent long enough on the road to pick up a little of everything — and a thick skin, literally'
  },
  {
    key: 'hunter',
    race: 'drow',
    ladder: ['Undercity Hunter', 'Shadow Tracker', 'Master Stalker'],
    shape: { accuracy: 1.4, speed: 1.0, strength: 0.4, hp: 0.4 },
    weaponKind: 'ranged',
    armorTrack: 'light',
    accessoryFocus: 'accuracy',
    skillPool: ['shadow_affinity', 'drow_poison', 'ranged_basics', 'steady_aim', 'aimed_shot'],
    concept: 'grew up hunting in the dark and never really lost the habit'
  },
  {
    key: 'herbalist',
    race: 'human',
    ladder: ['Herb-Gatherer', 'Village Herbalist', 'Renowned Healer'],
    shape: { magicalDefence: 0.6, hp: 0.6, stamina: 0.8, magicPower: 0.4 },
    weaponKind: 'striker',
    armorTrack: 'light',
    accessoryFocus: 'generic',
    skillPool: ['human_determination', 'field_medic', 'triage', 'antidote_training'],
    concept: 'knows every plant on the roadside and what it can fix — rarely needs to fight if they can help it'
  }
]
