/**
 * Skill and combat actions: learning and using skills, turns, status and
 * weather effects, basic attacks, knockout recovery and dice rolls.
 */
import { resolveSkillUseDamage } from '../homebrew/homebrew-combat.js'
import { state, activeCharacter } from '../core/state.js'
import { save } from '../core/storage.js'
import { toast, toastCombat, clamp, uid, titleCase } from '../core/utils.js'
import { computeStats, invalidateCharacterCache, getEffect } from '../character/character.js'
import {
  getSkill,
  canLearnSkill,
  dependentUnlockedSkills,
  isToggleSkill,
  HUMAN_RACE_SKILL,
  humanCrossCulturalSkillIds,
  humanMonsterSkillIds
} from '../skills/skills.js'
import { characterHandsEmpty } from '../items/equipment.js'
import {
  addStatusEffectToCharacter,
  tickStatusEffects,
  tickWeatherEffects,
  tickPassiveEffectSources,
  effectUsesPotency,
  isTargetFacingEffect,
  normalizeStatusEffect
} from '../effects/effects.js'
import {
  getSkillActivationType,
  resolveActivationEffects,
  rollSkillProc
} from '../skills/skill-activation.js'
import {
  applyInstrumentToActivations,
  formatPerformanceMeta,
  canEncoreReplay,
  noteMusicianSongStarted,
  isMusicianPerformanceSkill,
  activePerformanceStatuses
} from '../combat/instruments.js'
import { weatherProcessTurnStaminaDrain } from '../combat/weather-effects.js'
import {
  BASIC_ATTACK_ID,
  getBasicAttackSkill,
  getSkillUseBlockReason,
  resolveBasicAttackDamage,
  willQuickDrawActivate,
  markQuickDrawUsed,
  resetCombatUses,
  formatQuickDrawActivationNote
} from '../combat/combat.js'
import { markSkillUsedThisCombat, isOncePerCombatSkill } from '../combat/skill-use-limits.js'
import {
  applySkillHeal,
  formatHealUseSummary,
  formatCombatDamageToastLine,
  formatMultiHitCombatToast,
  resolveDamageBreakdown,
  formatDamageBreakdownPlain
} from '../combat/damage-breakdown.js'
import {
  characterHasStrikerBasics,
  isStrikerMultiBasicSkill,
  parseMultiBasicAttackCount
} from '../combat/striker-combat.js'
import { isMultiWeaponAttackSkill, parseMultiWeaponAttackCount } from '../combat/weapon-combat.js'
import { getEffectiveSkillStaminaCost } from '../skills/career-effects.js'
import { isGmMode } from '../gm/gm-mode.js'
import {
  syncKnockoutAfterHpChange,
  rollRecovery,
  startManualRevival,
  advanceManualRevival,
  cancelManualRevival,
  isKnockedOut,
  isDead
} from '../character/knockout.js'
import { touch } from './action-helpers.js'

export function learnSkill(skillId) {
  const character = activeCharacter()
  const skill = getSkill(skillId)
  const check = canLearnSkill(character, skill)
  if (!character || !skill || !check.ok) return toast(check?.reason || 'Cannot learn that skill.')
  character.skills.push(skill.id)
  if (!isGmMode()) character.lumens -= skill.cost
  touch(character)
  toast(`${skill.name} learned${isGmMode() ? ' (GM Mode)' : ''}.`)
}

export function refundSkill(skillId) {
  const character = activeCharacter()
  const skill = getSkill(skillId)
  if (!character || !skill || !character.skills.includes(skill.id)) return
  const dependents = dependentUnlockedSkills(character, skill.id)
  if (dependents.length) return toast(`Refund blocked: ${dependents.map(s => s.name).join(', ')} depend on this skill.`)
  const stripCrossCultural = skill.id === HUMAN_RACE_SKILL && character.race === 'human'
    ? [...humanCrossCulturalSkillIds(character), ...humanMonsterSkillIds(character)]
    : []
  character.skills = character.skills.filter(id => id !== skill.id && !stripCrossCultural.includes(id))
  character.activeToggles = character.activeToggles.filter(id => id !== skill.id && !stripCrossCultural.includes(id))
  if (!isGmMode()) character.lumens += skill.cost
  const computed = computeStats(character)
  character.hp = clamp(character.hp, 0, computed.hp)
  character.stamina = clamp(character.stamina, 0, computed.stamina)
  touch(character)
  if (stripCrossCultural.length) {
    toast(`${skill.name} refunded. Removed ${stripCrossCultural.length} cross-cultural racial skill${stripCrossCultural.length === 1 ? '' : 's'}.`)
    return
  }
  toast(`${skill.name} refunded.`)
}

export function toggleSkill(skillId) {
  const character = activeCharacter()
  const skill = getSkill(skillId)
  if (!character || !skill || !character.skills.includes(skill.id) || !isToggleSkill(skill)) return
  const active = character.activeToggles.includes(skill.id)
  if (!active) {
    const blockReason = getSkillUseBlockReason(character, skill)
    if (blockReason) return toast(blockReason)
  }
  if (active) character.activeToggles = character.activeToggles.filter(id => id !== skill.id)
  else character.activeToggles.push(skill.id)
  const computed = computeStats(character)
  character.hp = clamp(character.hp, 0, computed.hp)
  character.stamina = clamp(character.stamina, 0, computed.stamina)
  touch(character)
  toast(`${skill.name} ${active ? 'deactivated' : 'activated'}.`)
}

export function useSkill(skillId) {
  const character = activeCharacter()
  if (skillId === BASIC_ATTACK_ID) return useBasicAttack()

  const skill = getSkill(skillId)
  if (!character || !skill || !character.skills.includes(skill.id)) return

  const type = getSkillActivationType(skill)
  if (type === 'toggle') return toggleSkill(skillId)
  if (type !== 'activatable') return toast(`${skill.name} is passive and cannot be used from the Action bar.`)

  const blockReason = getSkillUseBlockReason(character, skill)
  if (blockReason) return toast(blockReason)

  const quickDraw = willQuickDrawActivate(character, skill)
  const cost = getEffectiveSkillStaminaCost(character, skill)
  if (character.stamina < cost) {
    return toast(`Not enough Stamina for ${skill.name} (need ${cost}, have ${character.stamina}).`)
  }

  const qdNote = quickDraw
    ? ` — ${formatQuickDrawActivationNote(Number(skill.staminaCost || 0), cost)}`
    : ''
  const markCombatUses = () => {
    if (quickDraw) markQuickDrawUsed(character)
    if (isOncePerCombatSkill(skill)) markSkillUsedThisCombat(character, skill.id)
  }

  if (isStrikerMultiBasicSkill(skill)) {
    if (!characterHandsEmpty(character)) {
      return toast(`${skill.name} requires both hands empty.`)
    }
    if (!characterHasStrikerBasics(character)) {
      return toast(`${skill.name} requires Striker Basics.`)
    }
    character.stamina -= cost
    markCombatUses()
    invalidateCharacterCache(character)
    const count = parseMultiBasicAttackCount(skill, character)
    const hitLines = []
    const totals = []
    for (let i = 0; i < count; i++) {
      const { total, summary } = resolveBasicAttackDamage(character, rollDice)
      totals.push(total)
      hitLines.push(formatCombatDamageToastLine(i + 1, summary, total))
    }
    touch(character, { header: true, content: true, actionBar: true })
    toastCombat(`${formatMultiHitCombatToast(skill.name, hitLines, totals, cost).replace(/\.$/, '')}${qdNote}.`, { html: true })
    return
  }

  if (isMultiWeaponAttackSkill(skill)) {
    character.stamina -= cost
    markCombatUses()
    invalidateCharacterCache(character)
    const count = parseMultiWeaponAttackCount(skill)
    const hitLines = []
    const totals = []
    for (let i = 0; i < count; i++) {
      const breakdown = resolveDamageBreakdown(character, skill, { rollDiceFn: rollDice })
      if (!breakdown?.parts?.length) break
      const plain = formatDamageBreakdownPlain(breakdown)
      const summary = plain.replace(/^Damage \(yours\):\s*/, '')
      totals.push(breakdown.total)
      hitLines.push(formatCombatDamageToastLine(i + 1, summary, breakdown.total))
    }
    touch(character, { header: true, content: true, actionBar: true })
    if (hitLines.length) {
      toastCombat(`${formatMultiHitCombatToast(skill.name, hitLines, totals, cost).replace(/\.$/, '')}${qdNote}.`, { html: true })
    } else {
      toast(`${skill.name} used (−${cost} Stamina)${qdNote}. Roll each hit at the table.`)
    }
    return
  }

  character.stamina -= cost
  markCombatUses()

  const healResult = applySkillHeal(character, skill, rollDice)
  const healSummary = healResult ? formatHealUseSummary(healResult.breakdown, healResult.healed) : ''
  const healOrChoice = /\bOR\s+apply\b/i.test(String(skill.desc || ''))
  const damageResult = resolveSkillUseDamage(character, skill, rollDice)
  const damageLine = damageResult
    ? formatCombatDamageToastLine(null, damageResult.summary, damageResult.total)
    : ''

  let activations = resolveActivationEffects(skill)
  if (healResult && healOrChoice) activations = []
  const encoreReplay = isMusicianPerformanceSkill(skill) && canEncoreReplay(character, skill.id)
  activations = applyInstrumentToActivations(character, skill, activations, { encoreReplay })

  const applied = []
  const missed = []
  const targetProcs = []
  const targetProcMissed = []
  let performanceNote = ''

  for (const payload of activations) {
    const effect = getEffect(payload.effectId)
    if (!effect) continue
    const procRoll = rollSkillProc(payload.chance ?? 1)
    const applyToTarget = payload.applyTo === 'target'
    const applyToSelf = payload.applyTo === 'self'
    if (!applyToSelf && (applyToTarget || isTargetFacingEffect(effect))) {
      const pct = payload.chance != null && payload.chance < 1
        ? `${Math.round(payload.chance * 100)}% `
        : ''
      if (procRoll) {
        targetProcs.push(
          `${pct}${effect.name} on target — add to their sheet manually if the GM confirms the hit`
        )
      } else {
        targetProcMissed.push(`${effect.name} proc missed`)
      }
      continue
    }
    if (!procRoll) {
      missed.push(effect.name)
      continue
    }
    const ok = addStatusEffectToCharacter(
      character,
      payload.effectId,
      payload.duration,
      payload.potency,
      encoreReplay ? `Encore: ${skill.name}` : `Used ${skill.name}`,
      payload.performance ? { performance: payload.performance } : null
    )
    const potencyNote = payload.potency != null && effectUsesPotency(effect)
      ? `, potency ${payload.potency}`
      : ''
    if (ok) {
      applied.push(`${effect.name} (${payload.duration} turn${payload.duration === 1 ? '' : 's'}${potencyNote})`)
      if (payload.performance && !performanceNote) {
        performanceNote = formatPerformanceMeta(payload.performance)
      }
      if (isMusicianPerformanceSkill(skill)) {
        noteMusicianSongStarted(character, skill.id, { encoreReplay })
      }
    } else missed.push(`${effect.name} (already active)`)
  }

  const targetEffectPart = [...targetProcs, ...targetProcMissed].join('; ')

  touch(character, { header: true, content: true, actionBar: true })

  const staminaNote = `(−${cost} Stamina)`
  const healPart = healSummary ? healSummary : ''
  const selfEffectPart = applied.length ? applied.join(', ') : ''
  const effectPart = [selfEffectPart, targetEffectPart].filter(Boolean).join('; ')
  const ampSuffix = performanceNote ? ` — ${performanceNote}` : ''
  const withDamage = (body) => {
    const lead = [damageLine, body].filter(Boolean).join('; ')
    return lead || damageLine
  }
  const finish = (message, opts) => toastCombat(`${message.replace(/\.$/, '')}${qdNote}.`, opts)

  if (healPart && !effectPart && !missed.length) {
    finish(`${skill.name}: ${withDamage(healPart)} ${staminaNote}`, { html: Boolean(damageLine) })
    return
  }
  if (healPart && effectPart && !missed.length) {
    finish(`${skill.name}: ${withDamage(`${healPart}; ${effectPart}`)} ${staminaNote}`, { html: Boolean(damageLine) })
    return
  }
  if (healPart && effectPart && missed.length) {
    finish(`${skill.name}: ${withDamage(`${healPart}; ${effectPart}; ${missed.join(', ')}`)} ${staminaNote}`, { html: Boolean(damageLine) })
    return
  }
  if (healPart && !effectPart && missed.length) {
    finish(`${skill.name}: ${withDamage(`${healPart}; ${missed.join(', ')}`)} ${staminaNote}`, { html: Boolean(damageLine) })
    return
  }

  if (!activations.length && !healResult) {
    if (damageLine) {
      finish(`${skill.name}: ${damageLine} ${staminaNote}`, { html: true })
      return
    }
    finish(`${skill.name} used ${staminaNote}`)
    return
  }
  if (applied.length && !missed.length) {
    finish(`${skill.name}: ${withDamage(effectPart)}${ampSuffix} (−${cost} Stamina)`, { html: Boolean(damageLine) })
    return
  }
  if (applied.length) {
    finish(`${skill.name}: ${withDamage(`${effectPart}${ampSuffix}; ${missed.join(', ')}`)} (−${cost} Stamina)`, { html: Boolean(damageLine) })
    return
  }
  if (damageLine) {
    finish(`${skill.name}: ${damageLine}; ${missed.length ? missed.join(', ') : 'no effects applied'} (−${cost} Stamina)`, { html: true })
    return
  }
  finish(`${skill.name} failed to apply effects${missed.length ? `: ${missed.join(', ')}` : ''} (−${cost} Stamina)`)
}

export function processTurn(targetCharacter = null) {
  const character = targetCharacter || activeCharacter()
  if (!character) return
  if (isDead(character)) {
    if (!targetCharacter) toast('Dead — Process Turn no longer applies.')
    return
  }
  const previousHp = Number(character.hp || 0)
  invalidateCharacterCache(character)
  const stillActive = []
  let spent = 0
  const messages = []
  if (!isKnockedOut(character)) {
    for (const skillId of character.activeToggles) {
      const skill = getSkill(skillId)
      const cost = getEffectiveSkillStaminaCost(character, skill)
      if (character.stamina >= cost) {
        character.stamina -= cost
        spent += cost
        stillActive.push(skillId)
      } else {
        messages.push(`${skill?.name || titleCase(skillId)} switched off: not enough Stamina.`)
      }
    }
    character.activeToggles = stillActive
  } else {
    character.activeToggles = []
  }
  const effectTick = tickStatusEffects(character)
  const weatherTick = tickWeatherEffects(character)
  const passiveTick = tickPassiveEffectSources(character)
  const weatherDrain = weatherProcessTurnStaminaDrain(character)
  if (weatherDrain > 0) {
    character.stamina = Math.max(0, character.stamina - weatherDrain)
  }
  const stats = computeStats(character)
  character.hp = clamp(character.hp, 0, stats.hp)
  character.stamina = clamp(character.stamina, 0, stats.stamina)
  const koSync = syncKnockoutAfterHpChange(character, { previousHp })
  if (!targetCharacter || targetCharacter === activeCharacter()) touch(character)
  else if (state.activeEncounter) {
    // Encounter combatant — persist via normal save path
    save()
  }
  const effectParts = [effectTick.summary, weatherTick.summary, passiveTick.summary].filter(Boolean)
  if (weatherDrain > 0) effectParts.push(`Heatwave: −${weatherDrain} Stamina (apply to whole party at table)`)
  if (koSync.entered) effectParts.push('Knocked Out')
  const effectText = effectParts.length ? ` ${effectParts.join(', ')}.` : ''
  const toggleText = spent ? `${spent} Stamina spent.` : 'No toggle costs.'
  toastCombat(`End of Turn processed. ${toggleText}${effectText}${messages.length ? ` ${messages[0]}` : ''}`)
}

export function addStatusEffect(effectId, duration, potency, notes) {
  const character = activeCharacter()
  const effect = getEffect(effectId)
  if (!character || !effect) return toast('Choose a valid effect first.')
  if (!addStatusEffectToCharacter(character, effectId, duration, potency, notes)) {
    return toast(`${effect.name} is already active and does not stack.`)
  }
  touch(character)
  toast(`${effect.name} added.`)
}

export function removeStatusEffect(effectUid) {
  const character = activeCharacter()
  if (!character) return
  character.statusEffects = (character.statusEffects || []).filter(status => status.uid !== effectUid)
  touch(character)
  toast('Effect removed.')
}

export function stopPerformance() {
  const character = activeCharacter()
  if (!character) return
  const active = activePerformanceStatuses(character)
  if (!active.length) return
  const uids = new Set(active.map(s => s.uid))
  character.statusEffects = (character.statusEffects || []).filter(s => !uids.has(s.uid))
  touch(character)
  toast('Performance ended.')
}

export function useBasicAttack() {
  const character = activeCharacter()
  if (!character) return
  const skill = getBasicAttackSkill(character)
  const blockReason = getSkillUseBlockReason(character, skill)
  if (blockReason) return toast(blockReason)
  const quickDraw = willQuickDrawActivate(character, skill)
  invalidateCharacterCache(character)
  const { total, summary } = resolveBasicAttackDamage(character, rollDice)
  if (quickDraw) markQuickDrawUsed(character)
  touch(character, { header: true, content: true, actionBar: true })
  const qdNote = quickDraw
    ? ` — ${formatQuickDrawActivationNote(Number(skill.staminaCost || 0), 0)}`
    : ''
  toastCombat(`Basic Attack: ${formatCombatDamageToastLine(null, summary, total)}${qdNote}`, { html: true })
}

export function beginNewCombat() {
  const character = activeCharacter()
  if (!character) return
  resetCombatUses(character)
  delete character.movedThisTurn
  invalidateCharacterCache(character)
  touch(character, { header: true, content: true, actionBar: true })
  toast('New combat started — once-per-combat uses reset (Quick Draw, Encore, Homing Shot, Rage, and similar).')
}

export function rollRecoveryCheck() {
  const character = activeCharacter()
  if (!character) return
  const result = rollRecovery(character)
  if (result.error) return toast(result.error)
  touch(character)
  if (result.dead) {
    toastCombat(`Recovery Roll ${result.roll} — failure. Three failures in a row: Dead.`)
    return
  }
  if (result.revived) {
    toastCombat(`Recovery Roll ${result.roll} — success. Two successes in a row: Revived at 1 HP.`)
    return
  }
  if (result.success) {
    toastCombat(`Recovery Roll ${result.roll} — success (${result.successStreak}/2). Need one more success in a row.`)
    return
  }
  toastCombat(`Recovery Roll ${result.roll} — failure (${result.failureStreak}/3). Success streak reset.`)
}

export function beginManualRevival(helperName = '') {
  const character = activeCharacter()
  if (!character) return
  if (!startManualRevival(character, helperName)) {
    return toast(isDead(character) ? 'Dead — cannot start manual revival.' : 'Only Knocked Out characters can begin manual revival.')
  }
  touch(character)
  toast(`Manual revival started — step 1/2${helperName ? ` (${helperName})` : ''}. Helper uses this turn to begin CPR / first aid.`)
}

export function continueManualRevival() {
  const character = activeCharacter()
  if (!character) return
  const result = advanceManualRevival(character)
  if (result.error) return toast(result.error)
  touch(character)
  if (result.revived) toast('Manual revival complete — Revived at 1 HP. Recovery streaks cleared.')
  else toast('Manual revival — step 2/2. Helper finishes revival on their next turn.')
}

export function clearManualRevival() {
  const character = activeCharacter()
  if (!character) return
  cancelManualRevival(character)
  touch(character)
  toast('Manual revival cancelled.')
}

export function rollDice(count, sides, modifier = 0) {
  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides))
  return { rolls, total: rolls.reduce((sum, value) => sum + value, 0) + modifier }
}

export function toggleSkillStar(skillId) {
  const character = activeCharacter()
  if (!character || !skillId) return
  const ids = new Set(character.starredSkillIds || [])
  if (ids.has(skillId)) ids.delete(skillId)
  else ids.add(skillId)
  character.starredSkillIds = [...ids].filter(id => character.skills.includes(id))
  touch(character)
}

export function setSkillViewMode(mode) {
  const character = activeCharacter()
  if (!character) return
  character.skillViewMode = mode === 'browse' ? 'browse' : 'focused'
  touch(character)
}

export function togglePinnedSkill(skillId) {
  const character = activeCharacter()
  if (!character || !skillId) return
  const ids = new Set(character.pinnedSkillIds || [])
  if (ids.has(skillId)) ids.delete(skillId)
  else ids.add(skillId)
  character.pinnedSkillIds = [...ids].filter(id => character.skills.includes(id))
  touch(character, { content: true, actionBar: true })
}

export function addWeatherEffect(effectId, duration, notes) {
  const character = activeCharacter()
  const effect = getEffect(effectId)
  if (!character || !effect) return toast('Choose a valid weather effect first.')
  const dur = Number(duration)
  const normalized = normalizeStatusEffect({
    uid: uid('weather'),
    effectId,
    duration,
    notes: String(notes || '').trim(),
    ...(dur > 0 ? { finiteDuration: true } : {})
  })
  if (!normalized) return toast('Invalid weather effect.')
  character.weatherEffects = [normalized]
  touch(character)
  toast(`Scene weather set to ${effect.name}.`)
}

export function setWeatherCombatRoll(entryUid, roll) {
  const character = activeCharacter()
  if (!character) return
  const entry = (character.weatherEffects || []).find(row => row.uid === entryUid)
  if (!entry) return
  const raw = String(roll ?? '').trim()
  if (!raw) delete entry.combatRoll
  else entry.combatRoll = Math.max(1, Math.min(6, Math.floor(Number(raw))))
  touch(character)
}

export function removeWeatherEffect(uid) {
  const character = activeCharacter()
  if (!character) return
  character.weatherEffects = (character.weatherEffects || []).filter(row => row.uid !== uid)
  touch(character)
}
