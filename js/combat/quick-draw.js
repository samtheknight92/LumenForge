import { getEquippedWeapon, getEquippedOffhand, getWeaponKind } from '../items/equipment.js'
import { getSkillWeaponKinds } from './action-bar-bonuses.js'
import { getSkillActivationType } from '../skills/skill-activation.js'
import { isBasicAttackSkill } from './damage-breakdown.js'

function isBowFusionSkill(skill) {
  return String(skill?.fusionType || '').toLowerCase().startsWith('bow_')
}

function fusionDescImpliesRangedAttack(skill) {
  const desc = String(skill?.desc || '')
  return /\b(arrows?|volley|projectiles?|bow shot|shot from (?:a |your )?bow|burning arrows?|frost arrows?|enchanted arrows?)\b/i.test(desc)
}

function skillRequiredWeaponKinds(skill) {
  if (!skill || isBasicAttackSkill(skill)) return []
  const kinds = getSkillWeaponKinds(skill)
  return kinds.size ? [...kinds] : []
}

export function characterHasQuickDraw(character) {
  return character?.skills?.includes('quick_draw')
}

/** Activatable ranged weapon attacks (Basic Attack handled separately). */
export function isRangedAttackSkill(skill) {
  if (!skill || isBasicAttackSkill(skill)) return false

  const type = getSkillActivationType(skill)
  if (type === 'passive' || type === 'toggle') return false

  const sub = String(skill?.subcategory || '').toLowerCase()
  if (sub === 'ranged_magic') return true
  if (isBowFusionSkill(skill)) return true
  if (sub === 'ranged') return true
  if (skillRequiredWeaponKinds(skill).includes('ranged')) return true
  if (skill.category === 'fusion' && fusionDescImpliesRangedAttack(skill)) return true
  return false
}

export function isRangedBasicAttack(character) {
  return getWeaponKind(getEquippedWeapon(character)) === 'ranged'
    || getWeaponKind(getEquippedOffhand(character)) === 'ranged'
}

/** Ranged Basic Attack or ranged weapon ability — not spells/melee/non-ranged. */
export function isQuickDrawAttack(character, skill) {
  if (!character || !skill) return false
  if (isBasicAttackSkill(skill)) return isRangedBasicAttack(character)
  return isRangedAttackSkill(skill)
}

export function isQuickDrawReady(character) {
  return characterHasQuickDraw(character) && !character?.combatFlags?.quickDrawUsedThisCombat
}

export function willQuickDrawActivate(character, skill) {
  return isQuickDrawReady(character) && isQuickDrawAttack(character, skill)
}

export function markQuickDrawUsed(character) {
  if (!character) return
  character.combatFlags = character.combatFlags || {}
  character.combatFlags.quickDrawUsedThisCombat = true
}

/** Clear once-per-combat trackers when a new fight starts. */
export function resetCombatUses(character) {
  if (!character) return
  character.combatFlags = character.combatFlags || {}
  character.combatFlags.quickDrawUsedThisCombat = false
  character.combatFlags.encoreUsedThisCombat = false
  character.combatFlags.musicianSongsThisCombat = []
  character.combatFlags.skillsUsedThisCombat = []
}

export function formatQuickDrawActivationNote(baseCost, effectiveCost) {
  const staminaSaved = Math.max(0, Number(baseCost || 0) - Number(effectiveCost || 0))
  if (staminaSaved > 0) {
    return `Quick Draw: Advantage (roll twice, keep higher); −${staminaSaved} Stamina`
  }
  return 'Quick Draw: Advantage (roll twice, keep higher)'
}
