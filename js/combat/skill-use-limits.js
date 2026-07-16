/**
 * Once-per-combat skill tracking (action-bar uses + New Combat reset).
 * Quick Draw and Encore keep their own combatFlags; both clear in resetCombatUses.
 */

/** Official activatable skills that are fully once-per-combat (not per-ally / per-target / riders). */
export const ONCE_PER_COMBAT_SKILL_IDS = new Set([
  'homing_shot',
  'volley_call',
  'rally_cry',
  'ward_circle',
  'rebuke',
  'turn_shadow',
  'slip_away',
  'rage',
  'feint'
])

export function isOncePerCombatSkill(skill) {
  if (!skill?.id) return false
  if (skill.useLimit === 'oncePerCombat') return true
  return ONCE_PER_COMBAT_SKILL_IDS.has(skill.id)
}

export function isSkillUsedThisCombat(character, skillId) {
  if (!character || !skillId) return false
  return (character.combatFlags?.skillsUsedThisCombat || []).includes(skillId)
}

export function markSkillUsedThisCombat(character, skillId) {
  if (!character || !skillId) return
  character.combatFlags = character.combatFlags || {}
  const used = character.combatFlags.skillsUsedThisCombat || []
  if (!used.includes(skillId)) {
    character.combatFlags.skillsUsedThisCombat = [...used, skillId]
  }
}

export function clearSkillsUsedThisCombat(character) {
  if (!character) return
  character.combatFlags = character.combatFlags || {}
  character.combatFlags.skillsUsedThisCombat = []
}

export function oncePerCombatBlockReason(character, skill) {
  if (!isOncePerCombatSkill(skill)) return ''
  if (!isSkillUsedThisCombat(character, skill.id)) return ''
  return 'Already used this combat (press New Combat to reset)'
}
