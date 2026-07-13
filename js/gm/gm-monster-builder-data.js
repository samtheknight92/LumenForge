/** Built-in GM Monster/NPC Builder templates. */

export const BUILDER_CATEGORIES = [
  { id: 'monster', label: 'Monster', defaultRace: 'monster' },
  { id: 'npc', label: 'NPC', defaultRace: 'human' }
]

export const MONSTER_TYPE_TEMPLATES = [
  {
    id: 'goblinoid',
    name: 'Goblinoid',
    icon: '👺',
    categories: ['monster'],
    description: 'Pack raiders — scrappy, organized, and nastier in groups.',
    statModifiers: { strength: 1.8, hp: 1.2, physicalDefence: 0.8, speed: 0.6, accuracy: 0.6, stamina: 0.4 },
    skillIds: ['tough_skin', 'claws', 'monster_charge_attack', 'monster_berserker_rage', 'multiattack'],
    isHumanoid: true,
    behaviourNotes: 'Fights in packs; prefers flanking and rushing wounded targets.',
    lootNotes: 'Carries a few coins; gear is scavenged.'
  },
  {
    id: 'beast_wolf',
    name: 'Beast / Wolf',
    icon: '🐺',
    categories: ['monster'],
    description: 'Fast predator — closes distance and tears at exposed foes.',
    statModifiers: { strength: 1.4, speed: 2.0, accuracy: 1.0, hp: 1.0, stamina: 0.6, physicalDefence: 0.3 },
    skillIds: ['bite_attack', 'pounce', 'tough_skin', 'crushing_bite', 'claws', 'monster_charge_attack', 'multiattack'],
    behaviourNotes: 'Hunts in numbers; targets isolated or injured prey.',
    lootNotes: 'Pelts and fangs; little else.'
  },
  {
    id: 'ooze',
    name: 'Ooze / Slime',
    icon: '🫧',
    categories: ['monster'],
    description: 'Slow, spongy horror — shrugs off hits and dissolves armor.',
    statModifiers: { hp: 2.4, magicalDefence: 1.6, physicalDefence: 1.0, stamina: 0.6, speed: 0.02, accuracy: 0.02 },
    skillIds: ['tough_skin', 'acid_spit', 'regeneration', 'magical_resistance', 'damage_reduction', 'immunity_poison'],
    behaviourNotes: 'Creeps forward relentlessly; engulfs or corrodes.',
    lootNotes: 'Residual alchemical goo.'
  },
  {
    id: 'spider_swarm',
    name: 'Spider / Swarm',
    icon: '🕷️',
    categories: ['monster'],
    description: 'Web-trapper with venom — controls space before striking.',
    statModifiers: { accuracy: 1.6, speed: 1.6, strength: 0.6, hp: 0.8, stamina: 0.4, physicalDefence: 0.4 },
    skillIds: ['web_shot', 'bite_attack', 'venomous_claws', 'pounce', 'poison_breath', 'multiattack'],
    weaknesses: ['fire'],
    behaviourNotes: 'Webs first, bites second; retreats if the web fails.',
    lootNotes: 'Silk sacs and venom glands.'
  },
  {
    id: 'elemental',
    name: 'Elemental',
    icon: '🔥',
    categories: ['monster'],
    description: 'Living elemental force — devastating magic, fragile body.',
    statModifiers: { magicPower: 2.6, magicalDefence: 1.0, hp: 0.8, stamina: 0.6, physicalDefence: 0.02, accuracy: 0.4 },
    skillIds: ['fire_breath', 'ice_breath', 'lightning_breath', 'magical_resistance', 'monster_earthquake', 'fear_aura'],
    immunities: ['poison'],
    behaviourNotes: 'Attacks at range; area bursts when cornered.',
    lootNotes: 'Condensed elemental residue.'
  },
  {
    id: 'undead',
    name: 'Undead',
    icon: '💀',
    categories: ['monster'],
    description: 'Restless dead — drains life and resists conventional harm.',
    statModifiers: { magicalDefence: 1.6, magicPower: 1.2, hp: 1.0, stamina: 0.3, physicalDefence: 0.6, accuracy: 0.4, speed: 0.2 },
    skillIds: ['energy_drain', 'paralyzing_gaze', 'life_drain', 'magical_resistance', 'fear_aura', 'tough_skin'],
    resistances: ['darkness'],
    weaknesses: ['light'],
    behaviourNotes: 'Grinds the party down with drains and control.',
    lootNotes: 'Grave dust and cursed trinkets.'
  },
  {
    id: 'construct',
    name: 'Construct',
    icon: '🗿',
    categories: ['monster'],
    description: 'Stone or iron automaton — nearly immovable, painfully slow.',
    statModifiers: { physicalDefence: 2.8, hp: 1.8, strength: 1.0, magicalDefence: 0.2, speed: 0.01, accuracy: 0.01, stamina: 0.2 },
    skillIds: ['rock_skin', 'metal_skin', 'monster_earthquake', 'armored_plates', 'damage_reduction', 'trample'],
    immunities: ['poison', 'bleed'],
    behaviourNotes: 'Advances in a straight line; punishes anyone who stands in the way.',
    lootNotes: 'Salvageable metal and rune fragments.'
  },
  {
    id: 'dragonkin',
    name: 'Dragonkin',
    icon: '🐉',
    categories: ['monster'],
    description: 'Wyrm-blooded terror — tough, magical, and mobile.',
    statModifiers: { strength: 1.2, magicPower: 1.4, physicalDefence: 1.2, magicalDefence: 1.2, hp: 1.6, speed: 0.6, accuracy: 0.4 },
    skillIds: ['tough_skin', 'fire_breath', 'monster_flight', 'tail_swipe', 'regeneration', 'multiattack', 'magical_resistance'],
    behaviourNotes: 'Uses breath and flight; saves melee for finishing blows.',
    lootNotes: 'Scales, teeth, and hoard scraps.',
    threatFlags: { area: true }
  },
  {
    id: 'fiend',
    name: 'Fiend',
    icon: '😈',
    categories: ['monster'],
    description: 'Infernal predator — fire, fear, and mind games.',
    statModifiers: { magicPower: 2.0, accuracy: 1.0, hp: 1.0, magicalDefence: 0.8, physicalDefence: 0.4, stamina: 0.4 },
    skillIds: ['fire_breath', 'energy_drain', 'paralyzing_gaze', 'mind_control', 'fear_aura', 'multiattack'],
    resistances: ['fire'],
    weaknesses: ['light'],
    behaviourNotes: 'Spreads fear and picks off isolated targets.',
    lootNotes: 'Sulfur-etched tokens.'
  },
  {
    id: 'avian',
    name: 'Avian',
    icon: '🦅',
    categories: ['monster'],
    description: 'Sky hunter — fast and accurate, but fragile once grounded.',
    statModifiers: { speed: 2.2, accuracy: 1.6, strength: 0.6, hp: 0.4, stamina: 0.3, physicalDefence: 0.2 },
    skillIds: ['claws', 'monster_flight', 'razor_claws', 'pounce', 'tail_swipe', 'multiattack'],
    resistances: ['wind'],
    weaknesses: ['ice'],
    behaviourNotes: 'Dive-bombs then retreats to altitude.',
    lootNotes: 'Feathers and talons.'
  },
  {
    id: 'aquatic',
    name: 'Aquatic',
    icon: '🐙',
    categories: ['monster'],
    description: 'Deep-sea horror — crushing size over finesse.',
    statModifiers: { hp: 1.8, strength: 1.0, magicPower: 0.8, physicalDefence: 0.6, speed: 0.2, accuracy: 0.2 },
    skillIds: ['bite_attack', 'tail_swipe', 'crushing_bite', 'swim', 'energy_drain', 'tough_skin'],
    resistances: ['water'],
    weaknesses: ['thunder'],
    behaviourNotes: 'Strongest in water; grapples and drags prey under.',
    lootNotes: 'Pearls and strange barnacles.'
  },
  {
    id: 'plant',
    name: 'Plant / Fungus',
    icon: '🌿',
    categories: ['monster'],
    description: 'Rooted horror — poisons the area and refuses to die.',
    statModifiers: { hp: 1.6, magicalDefence: 0.8, physicalDefence: 0.6, stamina: 0.4, speed: 0.01, accuracy: 0.2 },
    skillIds: ['tough_skin', 'venomous_claws', 'regeneration', 'rapid_healing', 'magical_resistance'],
    weaknesses: ['fire'],
    behaviourNotes: 'Barely moves; poisons everything nearby.',
    lootNotes: 'Spores and medicinal reagents.'
  },
  {
    id: 'giant',
    name: 'Giant',
    icon: '🦣',
    categories: ['monster'],
    description: 'Colossal brute — hits like a landslide, reacts like one too.',
    statModifiers: { strength: 2.4, hp: 2.0, physicalDefence: 0.8, accuracy: 0.2, speed: 0.05, magicPower: 0.1 },
    skillIds: ['monster_charge_attack', 'trample', 'tough_skin', 'monster_earthquake', 'fire_breath'],
    resistances: ['earth'],
    isHumanoid: true,
    behaviourNotes: 'Slow but devastating; area stomps when surrounded.',
    lootNotes: 'Oversized gear and raw materials.',
    threatFlags: { area: true }
  },
  {
    id: 'vermin_swarm',
    name: 'Vermin Swarm',
    icon: '🐀',
    categories: ['monster'],
    description: 'Countless tiny bodies — no single rat is dangerous alone.',
    statModifiers: { accuracy: 1.2, speed: 1.4, hp: 1.4, stamina: 0.4, physicalDefence: 0.3 },
    skillIds: ['bite_attack', 'venomous_claws', 'multiattack', 'immunity_poison', 'tough_skin'],
    behaviourNotes: 'Swarms the wounded; flees if half the swarm is gone.',
    lootNotes: 'Disease risk; little treasure.'
  }
]

export const NPC_TYPE_TEMPLATES = [
  {
    id: 'town_guard',
    name: 'Town Guard',
    icon: '🛡️',
    categories: ['npc'],
    description: 'Local militia — trained to hold a line, not win a war.',
    statModifiers: { physicalDefence: 1.6, hp: 1.2, strength: 0.8, accuracy: 0.6, stamina: 0.4 },
    skillIds: ['sword_basics', 'parry', 'soldier_training', 'shield_wall'],
    behaviourNotes: 'Calls for backup; fights defensively until reinforcements arrive.',
    lootNotes: 'Standard issue gear only.'
  },
  {
    id: 'bandit',
    name: 'Bandit',
    icon: '🗡️',
    categories: ['npc'],
    description: 'Highway robber — hits fast and runs if the fight turns.',
    statModifiers: { accuracy: 1.4, speed: 1.2, strength: 0.8, hp: 0.6, stamina: 0.4 },
    skillIds: ['dagger_basics', 'dirty_trick', 'hit_and_run', 'filch'],
    behaviourNotes: 'Ambushes; flees below half HP unless cornered.',
    lootNotes: 'Stolen coin and contraband.'
  },
  {
    id: 'battle_mage',
    name: 'Battle Mage',
    icon: '🔮',
    categories: ['npc'],
    description: 'Half swordsman, half pyromancer.',
    statModifiers: { strength: 1.2, magicPower: 2.2, accuracy: 1.6, hp: 0.6, stamina: 0.5, physicalDefence: 0.3, magicalDefence: 0.5 },
    skillIds: ['sword_basics', 'fire_spark', 'fireball', 'fire_shield', 'flame_edge'],
    behaviourNotes: 'Keeps distance with fire; closes only when safe.',
    lootNotes: 'Spell components and a decent blade.'
  },
  {
    id: 'ranger',
    name: 'Ranger',
    icon: '🏹',
    categories: ['npc'],
    description: 'Marksman who reads the battlefield before anyone else.',
    statModifiers: { accuracy: 2.4, speed: 2.0, strength: 0.6, hp: 0.6, stamina: 0.6, physicalDefence: 0.3 },
    skillIds: ['ranged_basics', 'steady_aim', 'aimed_shot', 'covering_fire', 'multi_shot'],
    behaviourNotes: 'Fires from cover; retreats if melee closes.',
    lootNotes: 'Quality bow and trail rations.'
  },
  {
    id: 'medic',
    name: 'Medic',
    icon: '💊',
    categories: ['npc'],
    description: 'Field healer — keeps allies standing more than they fight.',
    statModifiers: { magicPower: 1.4, magicalDefence: 1.0, hp: 1.0, stamina: 1.0, accuracy: 0.4, physicalDefence: 0.4 },
    skillIds: ['field_medic', 'triage', 'healing_light', 'purify', 'sanctuary'],
    behaviourNotes: 'Prioritizes healing allies; fights only in self-defense.',
    lootNotes: 'Medical supplies.'
  },
  {
    id: 'duelist',
    name: 'Duelist',
    icon: '⚔️',
    categories: ['npc'],
    description: 'Lives by footwork and a well-timed riposte.',
    statModifiers: { strength: 2.2, accuracy: 2.6, speed: 1.4, hp: 0.5, stamina: 0.3, physicalDefence: 0.6, magicalDefence: 0.1 },
    skillIds: ['sword_basics', 'parry', 'parry_riposte', 'lunge_attack', 'riposte', 'dueling_stance'],
    behaviourNotes: 'Challenges single opponents; disengages from groups.',
    lootNotes: 'Fine sword and dueling medals.'
  }
]

export const MONSTER_ROLE_TEMPLATES = [
  {
    id: 'brute',
    name: 'Brute',
    icon: '💪',
    description: 'Front-line muscle — high strength and HP.',
    statModifiers: { strength: 1.4, hp: 0.8, physicalDefence: 0.4 },
    skillIds: ['monster_charge_attack', 'tough_skin'],
    actionNotes: 'Charges the nearest threat; focuses highest-HP target.'
  },
  {
    id: 'skirmisher',
    name: 'Skirmisher',
    icon: '⚡',
    description: 'Fast striker — speed and accuracy over durability.',
    statModifiers: { speed: 1.2, accuracy: 0.8, strength: 0.4 },
    skillIds: ['pounce', 'hit_and_run'],
    actionNotes: 'Hit-and-run; targets spellcasters and ranged fighters.'
  },
  {
    id: 'striker',
    name: 'Striker',
    icon: '🎯',
    description: 'Precision damage dealer.',
    statModifiers: { accuracy: 1.0, strength: 0.8, speed: 0.4 },
    skillIds: ['razor_claws', 'crushing_bite'],
    actionNotes: 'Focuses wounded or isolated targets.'
  },
  {
    id: 'controller',
    name: 'Controller',
    icon: '🌀',
    description: 'Crowd control and debuffs.',
    statModifiers: { magicPower: 0.8, accuracy: 0.4 },
    skillIds: ['fear_aura', 'paralyzing_gaze', 'web_shot'],
    actionNotes: 'Opens with control; protects self while effects land.'
  },
  {
    id: 'artillery',
    name: 'Artillery',
    icon: '💥',
    description: 'Ranged magical or breath attacks.',
    statModifiers: { magicPower: 1.2, accuracy: 0.6 },
    skillIds: ['fire_breath', 'acid_spit', 'poison_breath'],
    actionNotes: 'Stays at max range; area attacks when grouped.'
  },
  {
    id: 'tank',
    name: 'Tank',
    icon: '🛡️',
    description: 'Absorbs punishment for the group.',
    statModifiers: { physicalDefence: 1.2, magicalDefence: 0.6, hp: 1.0 },
    skillIds: ['rock_skin', 'damage_reduction', 'armored_plates'],
    actionNotes: 'Intercepts paths to softer allies.'
  },
  {
    id: 'support',
    name: 'Support',
    icon: '✨',
    description: 'Buffs allies or sustains the fight.',
    statModifiers: { magicalDefence: 0.4, stamina: 0.4 },
    skillIds: ['regeneration', 'rapid_healing'],
    actionNotes: 'Heals or buffs allies before attacking.'
  },
  {
    id: 'ambusher',
    name: 'Ambusher',
    icon: '🌑',
    description: 'Surprise attacks from concealment.',
    statModifiers: { speed: 0.8, accuracy: 0.8 },
    skillIds: ['monster_shadow_step', 'pounce'],
    actionNotes: 'Attacks only from surprise or flanking position.'
  },
  {
    id: 'leader',
    name: 'Leader',
    icon: '👑',
    description: 'Commands others — tougher and more dangerous alone.',
    statModifiers: { hp: 0.6, strength: 0.4, accuracy: 0.4 },
    skillIds: ['fear_aura', 'multiattack'],
    actionNotes: 'Directs minions; fights only when they fall.',
    threatFlags: { multiHit: true }
  },
  {
    id: 'minion',
    name: 'Minion',
    icon: '🔹',
    description: 'Cannon fodder — weaker individually, dangerous in numbers.',
    statModifiers: { hp: -0.4, strength: -0.2 },
    skillIds: ['bite_attack'],
    actionNotes: 'Swarms with others; no fancy tactics.'
  }
]

export const MONSTER_THREAT_PRESETS = [
  { id: 'breeze', label: 'Breeze', min: 1, max: 3, target: 2, skillCap: 3 },
  { id: 'super_easy', label: 'Super Easy', min: 4, max: 6, target: 5, skillCap: 4 },
  { id: 'easy', label: 'Easy', min: 7, max: 10, target: 8, skillCap: 5 },
  { id: 'kinda_easy', label: 'Kinda Easy', min: 11, max: 15, target: 13, skillCap: 6 },
  { id: 'mediocre', label: 'Mediocre', min: 16, max: 22, target: 19, skillCap: 8 },
  { id: 'a_little_hard', label: 'A Little Hard', min: 23, max: 29, target: 26, skillCap: 10 },
  { id: 'hard', label: 'Hard', min: 30, max: 36, target: 33, skillCap: 12 },
  { id: 'very_hard', label: 'Very Hard', min: 37, max: 44, target: 40, skillCap: 14 },
  { id: 'deadly', label: 'Deadly', min: 45, max: 50, target: 47, skillCap: 16 }
]

export const MONSTER_SPECIAL_TEMPLATES = [
  { id: 'flight', name: 'Flight', icon: '🪽', skillIds: ['monster_flight'], description: 'Can fly — hard to pin down.' },
  { id: 'swim', name: 'Swim', icon: '🌊', skillIds: ['swim'], description: 'Strong in water.' },
  { id: 'climb', name: 'Climb', icon: '🧗', skillIds: ['climb'], description: 'Scales walls and cliffs.' },
  { id: 'regeneration', name: 'Regeneration', icon: '💚', skillIds: ['regeneration', 'rapid_healing'], description: 'Heals over time.' },
  { id: 'fear_aura', name: 'Fear Aura', icon: '😱', skillIds: ['fear_aura'], description: 'Unsettling presence; may frighten foes.', threatFlags: { control: true } },
  { id: 'multiattack', name: 'Multiattack', icon: '⚔️', skillIds: ['multiattack'], description: 'Multiple attacks per round.', threatFlags: { multiHit: true } },
  { id: 'tough_skin', name: 'Tough Skin', icon: '🛡️', skillIds: ['tough_skin', 'rock_skin'], statModifiers: { physicalDefence: 0.4 }, description: 'Thick hide reduces physical harm.' },
  { id: 'immunity_poison', name: 'Poison Immunity', icon: '☠️', skillIds: ['immunity_poison'], immunities: ['poison'], description: 'Unaffected by poison.' },
  { id: 'venom', name: 'Venomous', icon: '🐍', skillIds: ['venomous_claws', 'poison_breath'], description: 'Poisonous attacks.' },
  { id: 'magic_resist', name: 'Magic Resist', icon: '✨', skillIds: ['magical_resistance', 'spell_turning'], resistances: ['magic'], description: 'Resists spells and magical effects.' },
  { id: 'life_drain', name: 'Life Drain', icon: '🩸', skillIds: ['life_drain', 'energy_drain'], description: 'Drains life from victims.' },
  { id: 'mind_control', name: 'Mind Control', icon: '🧠', skillIds: ['mind_control', 'paralyzing_gaze'], description: 'Controls or paralyzes minds.', threatFlags: { control: true } },
  { id: 'breath_weapon', name: 'Breath Weapon', icon: '🔥', skillIds: ['fire_breath'], description: 'Cone or line breath attack.', threatFlags: { area: true } },
  { id: 'earthquake', name: 'Earthquake', icon: '🌍', skillIds: ['monster_earthquake'], description: 'Shakes the ground — area damage.', threatFlags: { area: true } },
  { id: 'shadow_step', name: 'Shadow Step', icon: '👤', skillIds: ['monster_shadow_step'], description: 'Teleports through shadows.' },
  { id: 'armored', name: 'Heavy Armor', icon: '🦾', skillIds: ['armored_plates', 'metal_skin'], statModifiers: { physicalDefence: 0.6 }, description: 'Plated or metal-hardened body.' },
  { id: 'berserk', name: 'Berserk', icon: '😤', skillIds: ['monster_berserker_rage', 'monster_blood_frenzy'], description: 'Fights harder when wounded.' },
  { id: 'ancient_knowledge', name: 'Ancient Knowledge', icon: '📜', skillIds: ['monster_ancient_knowledge'], description: 'Knows old weaknesses and tactics.' },
  { id: 'web', name: 'Web Spinner', icon: '🕸️', skillIds: ['web_shot'], description: 'Restrains foes with webs.', threatFlags: { control: true } },
  { id: 'trample', name: 'Trample', icon: '🦶', skillIds: ['trample', 'monster_charge_attack'], description: 'Overruns smaller foes.' }
]

export const ALL_TYPE_TEMPLATES = [...MONSTER_TYPE_TEMPLATES, ...NPC_TYPE_TEMPLATES]

export function getBuiltinTypeTemplate(id) {
  return ALL_TYPE_TEMPLATES.find(row => row.id === id) || null
}

export function getBuiltinRoleTemplate(id) {
  return MONSTER_ROLE_TEMPLATES.find(row => row.id === id) || null
}

export function getBuiltinThreatPreset(id) {
  return MONSTER_THREAT_PRESETS.find(row => row.id === id) || MONSTER_THREAT_PRESETS.find(row => row.id === 'mediocre')
}

export function getBuiltinSpecialTemplate(id) {
  return MONSTER_SPECIAL_TEMPLATES.find(row => row.id === id) || null
}
