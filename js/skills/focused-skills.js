/**
 * Focused Skills — which trees/skills to highlight for the active character.
 * Browse All remains the unfiltered catalogue; Focused never locks learning.
 */
import { getSkill, flattenSkills } from '../core/cache.js'
import { CAPSTONE_TIER_MIN_LEVEL } from '../core/constants.js'
import { getEquippedWeapon, getEquippedOffhand, getWeaponKind, characterHandsEmpty } from '../items/equipment.js'
import { computeSkillLevel } from '../character/skill-level.js'
import { normalizeFusionGroup, weaponFromFusionType, elementsFromFusionType } from './fusion-nav.js'

/** Map Guided Create playstyle → recommended weapon/magic/career subcategories. */
export const PLAYSTYLE_TREE_HINTS = {
  melee: {
    weapons: ['sword', 'axe', 'hammer', 'polearm', 'dagger', 'striker'],
    magic: [],
    careers: ['soldier', 'berserker', 'duelist', 'paladin']
  },
  ranged: {
    weapons: ['ranged'],
    magic: ['wind', 'lightning'],
    careers: ['marksman', 'ranger', 'thief']
  },
  magic: {
    weapons: ['staff'],
    magic: ['fire', 'ice', 'lightning', 'earth', 'wind', 'water', 'darkness', 'light'],
    careers: ['mage', 'enchanter', 'alchemist']
  },
  defensive: {
    weapons: ['sword', 'hammer', 'polearm'],
    magic: ['earth', 'light', 'water'],
    careers: ['paladin', 'soldier', 'blacksmith']
  },
  support: {
    weapons: ['staff', 'striker'],
    magic: ['light', 'water', 'earth'],
    careers: ['medic', 'musician', 'chef', 'alchemist']
  },
  mixed: {
    weapons: ['sword', 'ranged', 'staff', 'dagger'],
    magic: ['fire', 'ice', 'wind', 'light'],
    careers: ['soldier', 'mage', 'ranger']
  },
  explore: {
    weapons: [],
    magic: [],
    careers: []
  }
}

function catSubKey(category, subcategory) {
  return `${category}::${subcategory}`
}

function addTree(ctx, category, subcategory) {
  if (!category || !subcategory) return
  ctx.trees.add(catSubKey(category, subcategory))
  ctx.categories.add(category)
  if (!ctx.subsByCategory.has(category)) ctx.subsByCategory.set(category, new Set())
  ctx.subsByCategory.get(category).add(subcategory)
}

function addSkillId(ctx, skillId) {
  if (!skillId) return
  ctx.skillIds.add(skillId)
  const skill = getSkill(skillId)
  if (!skill) return
  const category = skill.category
  const subcategory = category === 'fusion'
    ? normalizeFusionGroup(skill.subcategory)
    : (skill.subcategory || skill.raceGroup || '')
  if (category && subcategory) addTree(ctx, category, subcategory)
}

function learnStartTrees(ctx, character) {
  for (const id of character.skills || []) {
    addSkillId(ctx, id)
  }
}

function addEquippedWeaponTrees(ctx, character) {
  const kinds = new Set()
  const main = getEquippedWeapon(character)
  const off = getEquippedOffhand(character)
  if (main) {
    const kind = getWeaponKind(main)
    if (kind) kinds.add(kind === 'bow' ? 'ranged' : kind)
  }
  if (off) {
    const kind = getWeaponKind(off)
    if (kind) kinds.add(kind === 'bow' ? 'ranged' : kind)
  }
  if (characterHandsEmpty(character) || kinds.size === 0) kinds.add('striker')
  for (const kind of kinds) addTree(ctx, 'weapons', kind)
  ctx.weaponKinds = kinds
}

function addRaceTree(ctx, character) {
  const race = character?.race
  if (!race) return
  if (race === 'monster') {
    addTree(ctx, 'racial', 'monster')
    return
  }
  addTree(ctx, 'racial', race)
}

function addPlaystyleHints(ctx, character) {
  const key = String(character?.guidedPlaystyle || '').trim().toLowerCase()
  if (!key || key === 'explore') return
  const hint = PLAYSTYLE_TREE_HINTS[key]
  if (!hint) return
  for (const sub of hint.weapons || []) addTree(ctx, 'weapons', sub)
  for (const sub of hint.magic || []) addTree(ctx, 'magic', sub)
  for (const sub of hint.careers || []) addTree(ctx, 'careers', sub)
}

function addMatchingFusions(ctx, character) {
  const weaponKinds = ctx.weaponKinds || new Set()
  const startedMagic = new Set()
  const startedCareers = new Set()
  for (const id of character.skills || []) {
    const skill = getSkill(id)
    if (!skill) continue
    if (skill.category === 'magic' && skill.subcategory) startedMagic.add(skill.subcategory)
    if (skill.category === 'careers' && skill.subcategory) startedCareers.add(skill.subcategory)
    if (skill.category === 'weapons' && skill.subcategory) {
      weaponKinds.add(skill.subcategory === 'bow' ? 'ranged' : skill.subcategory)
    }
  }

  for (const skill of flattenSkills()) {
    if (skill.category !== 'fusion') continue
    const group = normalizeFusionGroup(skill.subcategory)
    const fusionWeapon = weaponFromFusionType(skill.fusionType)
    const fusionElements = elementsFromFusionType(skill.fusionType)
    const weaponMatch = fusionWeapon && (
      weaponKinds.has(fusionWeapon) ||
      (fusionWeapon === 'bow' && weaponKinds.has('ranged'))
    )
    const elementMatch = fusionElements.some(el => startedMagic.has(el))
    const careerMatch = skill.fusionKind === 'career' && (
      startedCareers.size > 0 ||
      [...startedMagic].length > 0 ||
      weaponKinds.size > 0
    )
    if (weaponMatch || elementMatch || careerMatch || (character.skills || []).includes(skill.id)) {
      addTree(ctx, 'fusion', group)
      addSkillId(ctx, skill.id)
    }
  }
}

function addCapstonesIfNear(ctx, character) {
  const skillLevel = computeSkillLevel(character)?.skillLevel || 1
  const ascMin = CAPSTONE_TIER_MIN_LEVEL[3] || 12
  const ultMin = CAPSTONE_TIER_MIN_LEVEL[6] || 50
  // Show when approaching (~4 SL below) or already eligible
  if (skillLevel >= ascMin - 4) addTree(ctx, 'ascension', 'unique')
  if (skillLevel >= ultMin - 4) {
    addTree(ctx, 'ultimate', 'legendary')
    addTree(ctx, 'ultimate', 'weapon_ultimates')
    addTree(ctx, 'ultimate', 'magic_ultimates')
  }
  for (const id of character.skills || []) {
    const skill = getSkill(id)
    if (!skill) continue
    if (skill.category === 'ascension' || skill.category === 'ultimate') {
      addSkillId(ctx, id)
    }
  }
}

/**
 * @returns {{
 *   trees: Set<string>,
 *   categories: Set<string>,
 *   subsByCategory: Map<string, Set<string>>,
 *   skillIds: Set<string>,
 *   weaponKinds: Set<string>,
 *   isSparse: boolean
 * }}
 */
export function getFocusedSkillContext(character) {
  const ctx = {
    trees: new Set(),
    categories: new Set(),
    subsByCategory: new Map(),
    skillIds: new Set(),
    weaponKinds: new Set(),
    isSparse: false
  }
  if (!character) return ctx

  learnStartTrees(ctx, character)
  for (const id of character.starredSkillIds || []) addSkillId(ctx, id)
  for (const id of character.pinnedSkillIds || []) addSkillId(ctx, id)
  addEquippedWeaponTrees(ctx, character)
  addRaceTree(ctx, character)
  addPlaystyleHints(ctx, character)
  addMatchingFusions(ctx, character)
  addCapstonesIfNear(ctx, character)

  const learnedCount = (character.skills || []).length
  ctx.isSparse = learnedCount <= 2
  if (ctx.isSparse) {
    // Starter sections: ensure common entry paths appear
    for (const sub of ['sword', 'ranged', 'staff', 'dagger', 'striker']) addTree(ctx, 'weapons', sub)
    for (const sub of ['fire', 'ice', 'light']) addTree(ctx, 'magic', sub)
    for (const sub of ['soldier', 'mage', 'medic']) addTree(ctx, 'careers', sub)
    addPlaystyleHints(ctx, character)
  }

  return ctx
}

export function treeIsFocused(ctx, category, subcategory) {
  if (!ctx) return true
  const sub = category === 'fusion' ? normalizeFusionGroup(subcategory) : subcategory
  return ctx.trees.has(catSubKey(category, sub))
}

export function skillIsFocused(ctx, skill) {
  if (!ctx || !skill) return true
  if (ctx.skillIds.has(skill.id)) return true
  const category = skill.category
  const subcategory = category === 'fusion'
    ? normalizeFusionGroup(skill.subcategory)
    : (skill.subcategory || skill.raceGroup || '')
  return treeIsFocused(ctx, category, subcategory)
}

export function focusedCategories(ctx, allCategories) {
  if (!ctx?.categories?.size) return allCategories
  const filtered = allCategories.filter(cat => ctx.categories.has(cat))
  return filtered.length ? filtered : allCategories
}

export function focusedSubcategories(ctx, category, allSubs) {
  if (!ctx?.subsByCategory?.has(category)) return allSubs
  const allowed = ctx.subsByCategory.get(category)
  const filtered = allSubs.filter(sub => allowed.has(category === 'fusion' ? normalizeFusionGroup(sub) : sub))
  return filtered.length ? filtered : allSubs
}

/** Mark search hits that are not in the Focused set. */
export function isOutsideFocus(ctx, skill) {
  return Boolean(ctx) && !skillIsFocused(ctx, skill)
}
