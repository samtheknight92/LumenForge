/**
 * Knocked down / Death saves — table rules with sheet tracking.
 * Process Turn (End of Turn) is separate; this module only tracks 0 HP state.
 *
 * At 0 HP you are Knocked down and get three chances not to die: roll a d20,
 * DEATH_SAVE_RULES.target or more gets you back up at 1 HP; three failed rolls
 * and you die. Another player healing you also gets you up at 1 HP.
 */
import { injureOnKnockdown } from './injuries.js'

export const DEATH_SAVE_RULES = {
  /** d20 roll needed to get back up. */
  target: 10,
  /** Failed rolls before death. */
  maxFails: 3
}
export function isDead(character) {
  return Boolean(character?.dead)
}

export function isKnockedOut(character) {
  if (!character || isDead(character)) return false
  return Boolean(character.knockedOut) || Number(character.hp || 0) <= 0
}

export function canTakeNormalActions(character) {
  if (!character) return false
  if (isDead(character)) return false
  if (isKnockedOut(character)) return false
  return true
}

export function knockoutActionBlockReason(character) {
  if (isDead(character)) return 'Dead — cannot act'
  if (isKnockedOut(character)) return 'Knocked down — you can only roll to survive (or be healed) this turn'
  return ''
}

export function clearKnockoutProgress(character) {
  if (!character) return
  character.knockedOut = false
  character.recoveryFailureStreak = 0
  character.deathSaveIgnored = false
  character.lastKnockdownInjury = null
}

/** Put the character at 0 HP. A fresh knockdown resets the death saves and may cause an injury. */
export function enterKnockout(character, { random = Math.random } = {}) {
  if (!character || isDead(character)) return null
  character.hp = 0
  if (character.knockedOut) return null
  character.knockedOut = true
  character.recoveryFailureStreak = 0
  character.deathSaveIgnored = false
  const injury = injureOnKnockdown(character, random)
  character.lastKnockdownInjury = injury ? injury.id : null
  return injury
}

/**
 * Call after any HP change. Revives (clears death saves) when HP is raised above 0.
 */
export function syncKnockoutAfterHpChange(character, { previousHp = null, random = Math.random } = {}) {
  if (!character) return { changed: false }
  if (isDead(character)) {
    character.hp = 0
    character.knockedOut = true
    return { changed: false }
  }
  const hp = Number(character.hp || 0)
  if (hp <= 0) {
    const wasKo = Boolean(character.knockedOut)
    const injury = enterKnockout(character, { random })
    return { changed: !wasKo, entered: !wasKo, injury }
  }
  if (character.knockedOut || (previousHp != null && previousHp <= 0)) {
    clearKnockoutProgress(character)
    return { changed: true, revived: true }
  }
  return { changed: false }
}

/** Healing item/skill amount applied to a Knocked down character — full heal value, not 1 HP. */
export function applyHealingToCharacter(character, amount, computeStatsFn) {
  if (!character) return { healed: 0, revived: false, blocked: true }
  if (isDead(character)) return { healed: 0, revived: false, blocked: true, reason: 'Dead' }
  const stats = computeStatsFn(character)
  const before = Number(character.hp || 0)
  const wasKo = before <= 0 || character.knockedOut
  const add = Math.max(0, Math.floor(Number(amount) || 0))
  character.hp = Math.min(stats.hp, before + add)
  const healed = Math.max(0, character.hp - before)
  if (wasKo && character.hp > 0) {
    clearKnockoutProgress(character)
    return { healed, revived: true, blocked: false }
  }
  syncKnockoutAfterHpChange(character, { previousHp: before })
  return { healed, revived: false, blocked: false }
}

export function deathSaveFails(character) {
  return Math.max(0, Math.min(DEATH_SAVE_RULES.maxFails, Number(character?.recoveryFailureStreak || 0)))
}

export function deathSaveChancesLeft(character) {
  return DEATH_SAVE_RULES.maxFails - deathSaveFails(character)
}

/**
 * Record one death save. `success` true gets you up at 1 HP; false counts a
 * failure, and the last failure means death.
 */
export function recordDeathSave(character, success) {
  if (!character) return { error: 'No character' }
  if (isDead(character)) return { error: 'Dead — death saves no longer apply' }
  if (!isKnockedOut(character)) return { error: 'Not Knocked down' }
  character.hp = 0
  character.knockedOut = true
  if (success) {
    character.hp = 1
    clearKnockoutProgress(character)
    return { success: true, revived: true, dead: false }
  }
  character.recoveryFailureStreak = deathSaveFails(character) + 1
  if (character.recoveryFailureStreak >= DEATH_SAVE_RULES.maxFails) {
    character.dead = true
    character.knockedOut = true
    character.deathSaveIgnored = false
    return { success: false, revived: false, dead: true, fails: DEATH_SAVE_RULES.maxFails, chancesLeft: 0 }
  }
  return {
    success: false,
    revived: false,
    dead: false,
    fails: character.recoveryFailureStreak,
    chancesLeft: deathSaveChancesLeft(character)
  }
}

/** Roll a d20 death save (or pass a roll from real dice for testing). */
export function rollRecovery(character, rollValue = null) {
  if (!character) return { error: 'No character' }
  if (isDead(character)) return { error: 'Dead — death saves no longer apply' }
  if (!isKnockedOut(character)) return { error: 'Not Knocked down' }
  const roll = Number.isFinite(Number(rollValue)) && rollValue !== null
    ? Math.max(1, Math.min(20, Math.floor(Number(rollValue))))
    : (1 + Math.floor(Math.random() * 20))
  return { roll, ...recordDeathSave(character, roll >= DEATH_SAVE_RULES.target) }
}

/** Another player patched you up: back on your feet at 1 HP. */
export function reviveByAlly(character) {
  if (!character || isDead(character)) return { error: 'Dead — healing no longer helps' }
  if (!isKnockedOut(character)) return { error: 'Not Knocked down' }
  character.hp = 1
  clearKnockoutProgress(character)
  return { revived: true }
}

/** "Ignore": stay at 0 HP and stop the death-save popup until you are back up. */
export function ignoreDeathSaves(character, ignored = true) {
  if (!character || !isKnockedOut(character)) return false
  character.deathSaveIgnored = Boolean(ignored)
  return true
}

/** GM ruling: bring a dead character back. They stay at 0 HP, Knocked down, popup closed. */
export function undoDeath(character) {
  if (!character || !isDead(character)) return false
  character.dead = false
  character.hp = 0
  character.knockedOut = true
  character.recoveryFailureStreak = 0
  character.deathSaveIgnored = true
  return true
}

/** Should the Knocked down popup be on screen for this character? */
export function deathSavePopupOpen(character) {
  return Boolean(character) && isKnockedOut(character) && !character.deathSaveIgnored
}

export function normalizeKnockoutFields(character) {
  if (!character) return character
  character.dead = Boolean(character.dead)
  character.knockedOut = Boolean(character.knockedOut)
  character.recoveryFailureStreak = deathSaveFails(character)
  character.deathSaveIgnored = Boolean(character.deathSaveIgnored)
  character.lastKnockdownInjury = typeof character.lastKnockdownInjury === 'string' ? character.lastKnockdownInjury : null
  // Older saves tracked success streaks and a two-step revival; the death-save rules replaced both.
  delete character.recoverySuccessStreak
  delete character.manualRevival

  if (character.dead) {
    character.hp = 0
    character.knockedOut = true
    return character
  }

  if (Number(character.hp) > 0) {
    clearKnockoutProgress(character)
  } else {
    character.knockedOut = true
  }
  return character
}

export function knockoutStatusLabel(character) {
  if (!character) return ''
  if (isDead(character)) return 'Dead'
  if (!isKnockedOut(character)) return ''
  return `Knocked down · ${deathSaveFails(character)}/${DEATH_SAVE_RULES.maxFails} failed rolls`
}
