/**
 * Knocked Out / Recovery Roll / manual revival — table rules with sheet tracking.
 * Process Turn (End of Turn) is separate; this module only tracks 0 HP state.
 */

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
  if (isKnockedOut(character)) return 'Knocked Out — only a Recovery Roll (or ally help) this turn'
  return ''
}

export function clearKnockoutProgress(character) {
  if (!character) return
  character.knockedOut = false
  character.recoverySuccessStreak = 0
  character.recoveryFailureStreak = 0
  character.manualRevival = null
}

export function enterKnockout(character) {
  if (!character || isDead(character)) return
  character.hp = 0
  if (!character.knockedOut) {
    character.knockedOut = true
    character.recoverySuccessStreak = 0
    character.recoveryFailureStreak = 0
  } else {
    character.knockedOut = true
  }
}

/**
 * Call after any HP change. Revives (clears KO streaks) when HP is raised above 0.
 */
export function syncKnockoutAfterHpChange(character, { previousHp = null } = {}) {
  if (!character) return { changed: false }
  if (isDead(character)) {
    character.hp = 0
    character.knockedOut = true
    return { changed: false }
  }
  const hp = Number(character.hp || 0)
  if (hp <= 0) {
    const wasKo = Boolean(character.knockedOut)
    enterKnockout(character)
    return { changed: !wasKo, entered: true }
  }
  if (character.knockedOut || (previousHp != null && previousHp <= 0)) {
    clearKnockoutProgress(character)
    return { changed: true, revived: true }
  }
  return { changed: false }
}

/** Healing item/skill amount applied to a Knocked Out character — full heal value, not 1 HP. */
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

/**
 * Recovery Roll: 1d20, 11+ success. Two successes in a row → Revived at 1 HP.
 * Three failures in a row → Dead. Opposite outcomes reset the streak.
 */
export function rollRecovery(character, rollValue = null) {
  if (!character) return { error: 'No character' }
  if (isDead(character)) return { error: 'Dead — Recovery Rolls no longer apply' }
  if (!isKnockedOut(character)) return { error: 'Not Knocked Out' }

  character.hp = 0
  character.knockedOut = true
  const roll = Number.isFinite(Number(rollValue))
    ? Math.max(1, Math.min(20, Math.floor(Number(rollValue))))
    : (1 + Math.floor(Math.random() * 20))
  const success = roll >= 11

  if (success) {
    character.recoverySuccessStreak = Number(character.recoverySuccessStreak || 0) + 1
    character.recoveryFailureStreak = 0
    if (character.recoverySuccessStreak >= 2) {
      character.hp = 1
      clearKnockoutProgress(character)
      return { roll, success: true, revived: true, dead: false }
    }
    return {
      roll,
      success: true,
      revived: false,
      dead: false,
      successStreak: character.recoverySuccessStreak,
      failureStreak: 0
    }
  }

  character.recoveryFailureStreak = Number(character.recoveryFailureStreak || 0) + 1
  character.recoverySuccessStreak = 0
  if (character.recoveryFailureStreak >= 3) {
    character.dead = true
    character.knockedOut = true
    character.manualRevival = null
    return { roll, success: false, revived: false, dead: true, failureStreak: 3 }
  }
  return {
    roll,
    success: false,
    revived: false,
    dead: false,
    successStreak: 0,
    failureStreak: character.recoveryFailureStreak
  }
}

export function startManualRevival(character, helperName = '') {
  if (!character || isDead(character)) return false
  if (!isKnockedOut(character)) return false
  character.manualRevival = {
    step: 1,
    helperName: String(helperName || '').trim().slice(0, 80)
  }
  return true
}

export function advanceManualRevival(character) {
  if (!character || isDead(character)) return { error: 'Cannot revive' }
  if (!character.manualRevival) return { error: 'No manual revival in progress' }
  if (Number(character.manualRevival.step) === 1) {
    character.manualRevival = {
      step: 2,
      helperName: String(character.manualRevival.helperName || '').trim().slice(0, 80)
    }
    return { step: 2 }
  }
  character.hp = 1
  clearKnockoutProgress(character)
  return { revived: true, step: 2 }
}

export function cancelManualRevival(character) {
  if (character) character.manualRevival = null
}

export function normalizeKnockoutFields(character) {
  if (!character) return character
  character.dead = Boolean(character.dead)
  character.knockedOut = Boolean(character.knockedOut)
  character.recoverySuccessStreak = Math.max(0, Math.min(2, Math.floor(Number(character.recoverySuccessStreak) || 0)))
  character.recoveryFailureStreak = Math.max(0, Math.min(3, Math.floor(Number(character.recoveryFailureStreak) || 0)))
  if (character.manualRevival && typeof character.manualRevival === 'object') {
    character.manualRevival = {
      step: Number(character.manualRevival.step) === 2 ? 2 : 1,
      helperName: String(character.manualRevival.helperName || '').trim().slice(0, 80)
    }
  } else {
    character.manualRevival = null
  }

  if (character.dead) {
    character.hp = 0
    character.knockedOut = true
    return character
  }

  if (Number(character.hp) > 0) {
    character.knockedOut = false
    character.recoverySuccessStreak = 0
    character.recoveryFailureStreak = 0
    character.manualRevival = null
  } else {
    character.knockedOut = true
  }
  return character
}

export function knockoutStatusLabel(character) {
  if (!character) return ''
  if (isDead(character)) return 'Dead'
  if (!isKnockedOut(character)) return ''
  const ok = Number(character.recoverySuccessStreak || 0)
  const fail = Number(character.recoveryFailureStreak || 0)
  let label = `Knocked Out · Recovery ${ok}/2 success · ${fail}/3 failure`
  if (character.manualRevival) {
    const helper = character.manualRevival.helperName
      ? ` (${character.manualRevival.helperName})`
      : ''
    label += ` · Manual revival step ${character.manualRevival.step}/2${helper}`
  }
  return label
}
