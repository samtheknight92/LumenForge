import { DEFAULT_STATS, STAT_RULES, SAVE_VERSION, HOMEBREW_ID_PREFIX, TIER_LUMEN_COST } from '../core/constants.js'
import { resolveSkillUseDamage } from '../homebrew/homebrew-combat.js'
import { getMaxStatReward } from '../character/max-stat-rewards.js'
import { state, activeCharacter } from '../core/state.js'
import { save, saveNow, serializeSave, applySavePayload, isFullSaveExport, recordFullExport } from '../core/storage.js'
import { flushPendingCharacterEdits } from '../core/pending-edits.js'
import { render } from './render.js'
import { toast, toastCombat, clamp, deepClone, uid, titleCase } from '../core/utils.js'
import {
  createCharacter,
  normalizeCharacter,
  computeStats,
  invalidateCharacterCache,
  setRace as applyRace,
  setElementalAffinity as applyElementalAffinity,
  getEffect
} from '../character/character.js'
import {
  getNextStatUpgradeCost,
  getLatestStatRefund,
  appendStatPurchase,
  popStatPurchase,
  isTemplateCharacter
} from '../character/stat-costs.js'
import {
  getSkill,
  canLearnSkill,
  dependentUnlockedSkills,
  isToggleSkill,
  HUMAN_RACE_SKILL,
  humanCrossCulturalSkillIds,
  humanMonsterSkillIds
} from '../skills/skills.js'
import { getRace } from '../core/cache.js'
import {
  getItem,
  addItemToInventory,
  addCraftedItemToInventory,
  shopPurchaseCheck,
  itemHasCounter,
  itemCounterLabel,
  inventoryCounterValue,
  itemBlocksUnequipWithCounter,
  itemBlocksRemoveWithCounter,
  itemBlocksRemoveWhenLocked,
  counterMaxValue,
  counterRulePhrase
} from '../items/items.js'
import {
  canEquipToMainHand,
  canEquipToOffhand,
  characterHandsEmpty,
  equippedSlotForEntry,
  getEquippedOffhand,
  getEquippedWeapon,
  getOffhandType,
  getWeaponKind,
  isTwoHandedWeapon,
  reconcileOffhandEquip
} from '../items/equipment.js'
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
import { itemPriceGil, normalizeGil } from './format.js'
import { syncUrlState } from '../core/url-state.js'
import {
  isGmMode
} from '../gm/gm-mode.js'
import { getBackground } from '../character/backgrounds.js'
import { allocateCharacterName } from '../character/character-naming.js'
import {
  applyHealingToCharacter,
  syncKnockoutAfterHpChange,
  rollRecovery,
  startManualRevival,
  advanceManualRevival,
  cancelManualRevival,
  knockoutActionBlockReason,
  isKnockedOut,
  isDead
} from '../character/knockout.js'
import { openPrintableCharacterSheet } from '../export/export-sheet.js'
import {
  openGuidedCreate as openGuidedCreateState,
  closeGuidedCreate as closeGuidedCreateState,
  finishGuidedCreate as finishGuidedCreateState,
  syncDraftFromIdentityForm
} from './guided-create.js'
import { canCraftRecipe, deductMaterials, buildCraftMetadata, listCraftRecipes } from '../items/craft.js'
import { formatCraftBonusLabel } from '../items/craft-bonuses.js'
import {
  canApplyEnhancementToGear,
  createAppliedEnchantment,
  entryEnchantments,
  maxEnchantmentSlots,
  isEnhancementItem,
  isShieldEnchant,
  shieldEnchantWasUsed,
  shieldEnchantRemaining
} from '../items/enchantments.js'
import {
  normalizeFolderName,
  ensureFolderRegistered,
  setRosterFolderOpen,
  syncCharacterFolderOrder,
  characterFolder
} from '../character/character-folders.js'
import { sanitizeHomebrewItemsForPlayerExport } from '../homebrew/export-sanitize.js'
import {
  mergeHomebrewImport,
  isHomebrewPackFile,
  getHomebrewItem,
  getHomebrewSkill,
  collectHomebrewIdsFromCharacter,
  homebrewBackgroundsForExport,
  homebrewItemsForExport,
  homebrewSkillsForExport,
  getHomebrewRace,
  archiveHomebrewRace,
  homebrewRacesForExport,
  parseHomebrewRaceDraftForm,
  getHomebrewBackground,
  deleteHomebrewRecipe,
  duplicateHomebrewRecipe,
  parseHomebrewMonsterDraftForm
} from '../homebrew/homebrew.js'
import { previewHomebrewImport } from '../homebrew/homebrew-import-preview.js'
import { touch, downloadJson } from './action-helpers.js'

export function createAndSelectCharacter(name, raceId, options = {}) {
  const spawnFolder = isGmMode() ? normalizeFolderName(state.gmSpawnFolder) : ''
  if (spawnFolder && !options.folder) options = { ...options, folder: spawnFolder }
  const character = createCharacter(name, raceId, options)
  if (character.folder) ensureFolderRegistered(state, character.folder)
  state.characters.push(character)
  state.activeId = character.id
  touch(character)
  toast(`${character.name} created.`)
  return character
}

export function setCharacterFolder(characterId, folderName) {
  const character = state.characters.find(c => c.id === characterId)
  if (!character) return
  const folder = normalizeFolderName(folderName)
  character.folder = folder
  if (folder) ensureFolderRegistered(state, folder)
  touch(character, { sidebar: true })
}

export function createCharacterFolder(name) {
  const folder = ensureFolderRegistered(state, name)
  if (!folder) return toast('Folder name cannot be empty.')
  setRosterFolderOpen(state, folder, true)
  touch(null, { sidebar: true })
  toast(`Folder “${folder}” created — move characters into it from the Move menu on each card.`)
}

export function rememberRosterFolderOpen(sectionKey, open) {
  setRosterFolderOpen(state, sectionKey, open)
  save()
}

export function setGmSpawnFolder(folderName) {
  state.gmSpawnFolder = normalizeFolderName(folderName)
  if (state.gmSpawnFolder) ensureFolderRegistered(state, state.gmSpawnFolder)
  save()
}

export function moveCharacterFolder(folderName, direction) {
  const folder = normalizeFolderName(folderName)
  if (!folder) return
  syncCharacterFolderOrder(state)
  const order = [...state.characterFolderOrder]
  const idx = order.indexOf(folder)
  if (idx < 0) return
  const target = direction === 'up' ? idx - 1 : idx + 1
  if (target < 0 || target >= order.length) {
    return toast(direction === 'up' ? 'Folder is already at the top.' : 'Folder is already at the bottom.')
  }
  ;[order[idx], order[target]] = [order[target], order[idx]]
  state.characterFolderOrder = order
  state.characterFolderNames = [...order]
  touch(null, { sidebar: true })
}

export function copyCharacterFolder(folderName) {
  const source = normalizeFolderName(folderName)
  if (!source) return
  const suggested = `${source} (copy)`
  const input = prompt(`Copy folder “${source}” as:`, suggested)
  if (input == null) return
  const dest = ensureFolderRegistered(state, input)
  if (!dest) return toast('Folder name cannot be empty.')
  if (dest === source) return toast('Pick a different name for the copy.')

  const originals = state.characters.filter(c => characterFolder(c) === source)
  const added = []
  for (const original of originals) {
    const copy = normalizeCharacter(deepClone(original))
    copy.id = uid('char')
    copy.name = allocateCharacterName(original.name, [
      ...state.characters.map(c => c.name),
      ...added
    ])
    copy.folder = dest
    copy.premadeId = null
    copy.created = new Date().toISOString()
    copy.updated = copy.created
    state.characters.push(copy)
    added.push(copy.name)
  }

  setRosterFolderOpen(state, dest, true)
  touch(null, { sidebar: true })
  toast(originals.length
    ? `Copied ${originals.length} character${originals.length === 1 ? '' : 's'} to “${dest}”.`
    : `Empty folder “${dest}” created.`)
}

export function deleteCharacterFolder(folderName) {
  const folder = normalizeFolderName(folderName)
  if (!folder) return
  const count = state.characters.filter(c => characterFolder(c) === folder).length
  const note = count
    ? `${count} character${count === 1 ? '' : 's'} will move to Unfiled.`
    : 'This empty folder will be removed.'
  if (!confirm(`Delete folder “${folder}”? ${note}`)) return

  for (const character of state.characters) {
    if (characterFolder(character) === folder) character.folder = ''
  }
  syncCharacterFolderOrder(state)
  state.characterFolderOrder = state.characterFolderOrder.filter(name => name !== folder)
  state.characterFolderNames = [...state.characterFolderOrder]
  if (state.characterFolderOpen) delete state.characterFolderOpen[folder]
  if (state.gmSpawnFolder === folder) state.gmSpawnFolder = ''
  touch(null, { sidebar: true })
  toast(`Folder “${folder}” deleted.`)
}

export function selectCharacter(id) {
  flushPendingCharacterEdits()
  state.activeId = id
  touch(null, { sidebar: true, header: true, content: true, actionBar: true })
}

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

export function setRace(raceId) {
  const character = activeCharacter()
  if (!character) return
  applyRace(character, raceId)
  touch(character)
  toast(`Race updated.`)
}

export function setElementalAffinity(affinity) {
  const character = activeCharacter()
  if (!character) return
  applyElementalAffinity(character, affinity)
  touch(character)
  toast(character.elementalAffinity ? `Elemental affinity: ${titleCase(character.elementalAffinity)}.` : 'Elemental affinity cleared.')
}

export function buyItem(itemId, free = false) {
  const character = activeCharacter()
  const item = getItem(itemId)
  if (!character || !item) return
  const isFree = free || isGmMode()
  const check = shopPurchaseCheck(character, item, { free: isFree })
  if (!check.ok) return toast(check.reason)
  const price = itemPriceGil(item)
  const current = normalizeGil(character.gil)
  if (!isFree) character.gil = current - price
  addItemToInventory(character, itemId, 1)
  touch(character)
  toast(`${item.name} ${isFree ? 'granted' : 'bought'}!`)
}

export function craftRecipe(recipeId) {
  const character = activeCharacter()
  const recipe = listCraftRecipes().find(row => row.id === recipeId)
  if (!character || !recipe) return toast('Unknown recipe.')
  const check = canCraftRecipe(character, recipe)
  if (!check.ok) return toast(check.reason)
  deductMaterials(character, recipe)
  const meta = buildCraftMetadata(character, recipe)
  addCraftedItemToInventory(character, recipe, meta)
  const bonus = formatCraftBonusLabel(meta.craftBonuses)
  touch(character)
  toast(bonus ? `${recipe.name} crafted (${bonus}).` : `${recipe.name} crafted.`)
}

/** GM Mode — add recipe output to inventory (no skills, materials, or craft metadata). */
export function grantCraftRecipe(recipeId) {
  const character = activeCharacter()
  const recipe = listCraftRecipes().find(row => row.id === recipeId)
  if (!character || !recipe) return toast('Unknown recipe.')
  if (!isGmMode()) return toast('Grant is GM Mode only.')
  addItemToInventory(character, recipe.id, 1)
  touch(character)
  toast(`${recipe.name} granted.`)
}

function equippedSlotForGearEntry(character, gearEntryUid) {
  for (const [slot, uid] of Object.entries(character?.equipped || {})) {
    if (uid === gearEntryUid) return slot
  }
  return null
}

export function applyEnchantment(gearEntryUid, scrollEntryUid) {
  const character = activeCharacter()
  if (!character || !gearEntryUid || !scrollEntryUid) return

  const gearEntry = character.inventory.find(row => row.uid === gearEntryUid)
  const scrollEntry = character.inventory.find(row => row.uid === scrollEntryUid)
  const gearItem = gearEntry && getItem(gearEntry.itemId)
  const scrollItem = scrollEntry && getItem(scrollEntry.itemId)
  if (!gearEntry || !scrollEntry || !gearItem || !scrollItem) return toast('Item not found.')

  const gearSlot = equippedSlotForGearEntry(character, gearEntryUid)
  if (!gearSlot) return toast('Equip the target weapon or armour first.')

  if (!isEnhancementItem(scrollItem)) return toast('That is not an enchantment item.')

  const check = canApplyEnhancementToGear(scrollItem, gearItem, gearSlot)
  if (!check.ok) return toast(check.reason)

  const maxSlots = maxEnchantmentSlots(gearEntry, gearItem)
  if (maxSlots <= 0) return toast(`${gearItem.name} has no enchantment slots.`)

  if (!Array.isArray(gearEntry.enchantments)) gearEntry.enchantments = []
  if (gearEntry.enchantments.length >= maxSlots) {
    return toast(`All ${maxSlots} slot${maxSlots === 1 ? '' : 's'} are full. Remove one first.`)
  }

  const applied = createAppliedEnchantment(scrollItem)
  if (!applied) return toast('Could not resolve enchant effect.')

  gearEntry.enchantments.push(applied)
  const qty = Math.max(1, Number(scrollEntry.qty || 1))
  if (qty > 1) scrollEntry.qty = qty - 1
  else character.inventory = character.inventory.filter(row => row.uid !== scrollEntryUid)

  invalidateCharacterCache(character)
  const computed = computeStats(character)
  character.hp = clamp(character.hp, 0, computed.hp)
  character.stamina = clamp(character.stamina, 0, computed.stamina)
  touch(character)
  toast(`${applied.name} applied to ${gearItem.name}.`)
}

export function removeEnchantment(gearEntryUid, enchantId) {
  const character = activeCharacter()
  if (!character || !gearEntryUid || !enchantId) return

  const gearEntry = character.inventory.find(row => row.uid === gearEntryUid)
  const gearItem = gearEntry && getItem(gearEntry.itemId)
  if (!gearEntry || !gearItem) return toast('Item not found.')

  const removed = entryEnchantments(gearEntry).find(row => row.id === enchantId)
  if (!removed) return toast('Enchantment not found.')

  gearEntry.enchantments = entryEnchantments(gearEntry).filter(row => row.id !== enchantId)

  const canReturn = removed.sourceItemId && (!isShieldEnchant(removed) || !shieldEnchantWasUsed(removed))
  if (canReturn) {
    addItemToInventory(character, removed.sourceItemId, 1)
  }

  invalidateCharacterCache(character)
  const computed = computeStats(character)
  character.hp = clamp(character.hp, 0, computed.hp)
  character.stamina = clamp(character.stamina, 0, computed.stamina)
  touch(character)
  const itemName = removed.sourceItemId && getItem(removed.sourceItemId)?.name
  if (isShieldEnchant(removed) && shieldEnchantWasUsed(removed)) {
    toast(`${removed.name || itemName || 'Barrier'} removed — crystal destroyed (not returned).`)
  } else if (itemName) {
    toast(`${removed.name || itemName} removed from ${gearItem.name} and returned to inventory.`)
  } else {
    toast(`Enchantment removed from ${gearItem.name}.`)
  }
}

export function recordEnchantShieldAbsorption(gearEntryUid, enchantId, amount) {
  const character = activeCharacter()
  if (!character || !gearEntryUid || !enchantId) return

  const gearEntry = character.inventory.find(row => row.uid === gearEntryUid)
  const gearItem = gearEntry && getItem(gearEntry.itemId)
  if (!gearEntry || !gearItem) return toast('Item not found.')

  const ench = entryEnchantments(gearEntry).find(row => row.id === enchantId)
  if (!ench || !isShieldEnchant(ench)) return toast('Not a barrier enchant.')

  const soak = Math.max(0, Number(amount) || 0)
  if (!soak) return toast('Enter how much magical damage to soak.')

  const before = shieldEnchantRemaining(ench)
  ench.shieldRemaining = Math.max(0, before - soak)

  if (ench.shieldRemaining <= 0) {
    gearEntry.enchantments = entryEnchantments(gearEntry).filter(row => row.id !== enchantId)
    invalidateCharacterCache(character)
    touch(character)
    toast(`${ench.name || 'Barrier Crystal'} spent — ${soak} magical damage soaked (pool empty).`)
    return
  }

  invalidateCharacterCache(character)
  touch(character)
  toast(`Soaked ${soak} magical damage — ${ench.shieldRemaining}/${ench.shieldMax} left on ${gearItem.name}.`)
}

export function removeInventoryEntry(entryUid) {
  const character = activeCharacter()
  if (!character) return
  const entry = character.inventory.find(row => row.uid === entryUid)
  const item = entry && getItem(entry.itemId)
  if (entry && itemBlocksRemoveWhenLocked(entry)) {
    return toast('This item is locked — unlock it before removing.')
  }
  if (entry && item && itemBlocksRemoveWithCounter(entry, item)) {
    const label = itemCounterLabel(item)
    return toast(`${item.name} cannot be removed while ${label} ${counterRulePhrase(item)} (now ${inventoryCounterValue(entry, item)}).`)
  }
  for (const slot of Object.keys(character.equipped)) {
    if (character.equipped[slot] === entryUid) character.equipped[slot] = null
  }
  character.inventory = character.inventory.filter(entry => entry.uid !== entryUid)
  touch(character)
}

export function equipItem(entryUid, slot = null) {
  const character = activeCharacter()
  const entry = character?.inventory.find(i => i.uid === entryUid)
  const item = entry && getItem(entry.itemId)
  if (!character || !entry || !item) return

  const isOffhandEquip = slot === 'offhand'

  if (isOffhandEquip) {
    const check = canEquipToOffhand(character, item)
    if (!check.ok) return toast(check.reason)
    const alreadyIn = equippedSlotForEntry(character, entry.uid)
    if (alreadyIn && alreadyIn !== 'offhand') {
      return toast(`${item.name} is already equipped (${titleCase(alreadyIn === 'offhand' ? 'off-hand' : alreadyIn)}).`)
    }
    character.equipped.offhand = entry.uid
    invalidateCharacterCache(character)
    touch(character)
    return toast(`${item.name} equipped (off-hand).`)
  }

  const type = String(item.type || '').toLowerCase()
  const equipSlot = canEquipToMainHand(item)
    ? 'weapon'
    : type.includes('armor')
      ? 'armor'
      : type.includes('accessory')
        ? 'accessory'
        : null
  if (!equipSlot) return toast('That item is not equipment.')

  const alreadyIn = equippedSlotForEntry(character, entry.uid)
  if (alreadyIn && alreadyIn !== equipSlot) {
    return toast(`${item.name} is already equipped (${titleCase(alreadyIn === 'offhand' ? 'off-hand' : alreadyIn)}).`)
  }

  if (equipSlot === 'weapon') {
    character.equipped.weapon = entry.uid
    if (isTwoHandedWeapon(item)) {
      character.equipped.offhand = null
    } else {
      const offItem = getEquippedOffhand(character)
      if (offItem && getOffhandType(offItem) === 'weapon') {
        character.equipped.offhand = null
      }
    }
    reconcileOffhandEquip(character)
  } else {
    character.equipped[equipSlot] = entry.uid
  }

  invalidateCharacterCache(character)
  const computed = computeStats(character)
  character.hp = clamp(character.hp, 0, computed.hp)
  character.stamina = clamp(character.stamina, 0, computed.stamina)
  touch(character)
  toast(`${item.name} equipped.`)
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

export function unequip(slot) {
  const character = activeCharacter()
  if (!character) return
  const entryUid = character.equipped[slot]
  const entry = entryUid ? character.inventory.find(row => row.uid === entryUid) : null
  const item = entry && getItem(entry.itemId)
  if (entry && item && itemBlocksUnequipWithCounter(entry, item)) {
    const label = itemCounterLabel(item)
    return toast(`${item.name} cannot be unequipped while ${label} ${counterRulePhrase(item)} (now ${inventoryCounterValue(entry, item)}).`)
  }
  character.equipped[slot] = null
  if (slot === 'weapon') character.equipped.offhand = null
  touch(character)
}

export function adjustInventoryCounter(entryUid, delta) {
  const character = activeCharacter()
  const entry = character?.inventory.find(row => row.uid === entryUid)
  const item = entry && getItem(entry.itemId)
  if (!character || !entry || !itemHasCounter(item)) return
  let next = Math.max(0, inventoryCounterValue(entry, item) + Number(delta || 0))
  const max = counterMaxValue(item)
  if (max != null) next = Math.min(next, max)
  entry.counter = next
  touch(character)
}

export function upgradeStat(stat) {
  const character = activeCharacter()
  const rule = STAT_RULES[stat]
  if (!character || !rule) return
  if (character.stats[stat] >= rule.max) return toast(`${rule.label} is already at its cap.`)
  const gm = isGmMode()
  const nextCost = getNextStatUpgradeCost(character, stat)
  if (!gm && character.lumens < nextCost) return toast(`Not enough lumens for that upgrade (need ${nextCost}).`)
  const wasBelowCap = character.stats[stat] < rule.max
  character.stats[stat] += 1
  if (gm) {
    // Free GM edits do not create refundable history.
  } else {
    character.lumens -= nextCost
    appendStatPurchase(character, stat, nextCost)
  }
  if (stat === 'hp') character.hp += 1
  if (stat === 'stamina') character.stamina += 1
  touch(character)
  const reward = getMaxStatReward(stat)
  if (wasBelowCap && character.stats[stat] >= rule.max && reward) {
    toast(`Hidden reward unlocked: ${reward.icon} ${reward.name}. See Skill & Gear Effects on the Character tab.`)
  }
}

export function refundStat(stat) {
  const character = activeCharacter()
  const rule = STAT_RULES[stat]
  if (!character || !rule) return
  if (character.stats[stat] <= DEFAULT_STATS[stat]) return toast(`${rule.label} is already at its starting value.`)
  const gm = isGmMode()
  if (!gm && isTemplateCharacter(character)) {
    return toast('Template / premade stats cannot be refunded for Lumens. Enable GM Mode to edit freely.')
  }
  const refundAmount = gm ? 0 : getLatestStatRefund(character, stat)
  if (!gm && refundAmount <= 0) {
    return toast(`No refundable ${rule.label} purchases left (template or GM free points).`)
  }
  character.stats[stat] -= 1
  if (!gm) {
    popStatPurchase(character, stat)
    character.lumens += refundAmount
  }
  const computed = computeStats(character)
  character.hp = clamp(character.hp, 0, computed.hp)
  character.stamina = clamp(character.stamina, 0, computed.stamina)
  touch(character)
}

export function setResource(resource, value) {
  const character = activeCharacter()
  if (!character) return
  const stats = computeStats(character)
  const cleanValue = Math.floor(Number(value || 0))
  if (resource === 'hp') {
    if (isDead(character) && cleanValue > 0) {
      return toast('Dead — clear Dead via GM ruling before restoring HP.')
    }
    const previousHp = Number(character.hp || 0)
    const wasKo = isKnockedOut(character)
    if (wasKo && cleanValue > previousHp) {
      const result = applyHealingToCharacter(character, cleanValue - previousHp, computeStats)
      touch(character, { header: true, content: true, actionBar: true })
      if (result.revived) toast(`Revived — restored ${result.healed} HP. Recovery streaks cleared.`)
      return
    }
    character.hp = clamp(cleanValue, 0, stats.hp)
    const sync = syncKnockoutAfterHpChange(character, { previousHp })
    touch(character, { header: true, content: true, actionBar: true })
    if (sync.entered) toast('Knocked Out at 0 HP.')
    else if (sync.revived) toast('Revived — Recovery streaks cleared.')
    return
  }
  if (resource === 'stamina') character.stamina = clamp(cleanValue, 0, stats.stamina)
  if (resource === 'lumens') character.lumens = Math.max(0, cleanValue)
  touch(character, { header: true, content: true, actionBar: true })
}

export function adjustResource(resource, amount) {
  const character = activeCharacter()
  if (!character) return
  const current = resource === 'hp' ? character.hp : resource === 'stamina' ? character.stamina : character.lumens
  setResource(resource, current + Number(amount || 0))
}

export function fillResource(resource) {
  const character = activeCharacter()
  if (!character) return
  const stats = computeStats(character)
  if (resource === 'hp') setResource('hp', stats.hp)
  if (resource === 'stamina') setResource('stamina', stats.stamina)
}

export function adjustCurrency(amount) {
  const character = activeCharacter()
  if (!character) return
  character.gil = normalizeGil(character.gil) + Math.floor(Number(amount || 0))
  if (character.gil < 0) character.gil = 0
  touch(character, { header: true, content: true })
}

export function setGil(value) {
  const character = activeCharacter()
  if (!character) return
  character.gil = normalizeGil(value)
  touch(character, { header: true, content: true })
}

/** @deprecated Use setGil. */
export function setCurrencyPart(_part, value) {
  setGil(value)
}

export function heal(amount = 9999) {
  const character = activeCharacter()
  if (!character) return
  const result = applyHealingToCharacter(character, amount, computeStats)
  if (result.blocked) return toast(result.reason === 'Dead' ? 'Dead — healing does not revive.' : 'Cannot heal.')
  touch(character, { header: true, content: true, actionBar: true })
  if (result.revived) toast(`Revived — restored ${result.healed} HP. Recovery streaks cleared.`)
}

export function restoreStamina(amount = 9999) {
  const character = activeCharacter()
  if (!character) return
  const stats = computeStats(character)
  character.stamina = clamp(character.stamina + amount, 0, stats.stamina)
  touch(character, { header: true, content: true })
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

export function duplicateCharacter(id) {
  const original = state.characters.find(character => character.id === id)
  if (!original) return
  const copy = normalizeCharacter(deepClone(original))
  copy.id = uid('char')
  copy.name = allocateCharacterName(original.name, state.characters.map(c => c.name))
  copy.premadeId = null
  copy.created = new Date().toISOString()
  state.characters.push(copy)
  state.activeId = copy.id
  touch(copy)
  toast(`${copy.name} added to roster.`)
}

export function deleteCharacter(id) {
  const character = state.characters.find(c => c.id === id)
  if (!character) return
  if (!confirm(`Delete ${character.name}? This cannot be undone.`)) return
  flushPendingCharacterEdits()
  state.characters = state.characters.filter(c => c.id !== id)
  if (state.activeId === id) state.activeId = state.characters[0]?.id || null
  touch(null)
  toast('Character deleted.')
}

export function exportData(all = true) {
  if (all) {
    const payload = serializeSave()
    downloadJson(payload, 'lumenforge-save.json')
    recordFullExport()
    return
  }
  const character = activeCharacter()
  if (!character) return toast('No character to export.')
  const homebrewIds = [...collectHomebrewIdsFromCharacter(character)]
  const exportRaceIds = []
  const exportItemIds = []
  const exportSkillIds = []
  const exportBackgroundIds = []
  for (const id of homebrewIds) {
    if (getHomebrewRace(id)) exportRaceIds.push(id)
    else if (getHomebrewSkill(id)) exportSkillIds.push(id)
    else if (getHomebrewBackground(id)) exportBackgroundIds.push(id)
    else if (getHomebrewItem(id)) exportItemIds.push(id)
  }
  const payload = {
    version: SAVE_VERSION,
    characters: [normalizeCharacter(deepClone(character))],
    homebrew: {
      items: sanitizeHomebrewItemsForPlayerExport(homebrewItemsForExport(exportItemIds)),
      skills: homebrewSkillsForExport(exportSkillIds),
      races: homebrewRacesForExport(exportRaceIds),
      backgrounds: homebrewBackgroundsForExport(exportBackgroundIds)
    }
  }
  downloadJson(payload, `${character.name || 'character'}-lumenforge.json`.replace(/[^a-z0-9_.-]+/gi, '_'))
}

export async function importData(file) {
  if (!file) return
  try {
    const parsed = JSON.parse(await file.text())

    if (isHomebrewPackFile(parsed) && !Array.isArray(parsed.characters)) {
      state.homebrewImportPreview = {
        parsed,
        preview: previewHomebrewImport(parsed),
        mode: 'merge',
        skipConflicts: false
      }
      render({ content: true })
      return
    }

    const nestedHomebrew = parsed.homebrew
    if (nestedHomebrew?.items?.length || nestedHomebrew?.skills?.length || nestedHomebrew?.races?.length
      || nestedHomebrew?.backgrounds?.length) {
      if (!isFullSaveExport(parsed)) {
        mergeHomebrewImport(nestedHomebrew, { replace: false })
      }
    }

    const imported = Array.isArray(parsed) ? parsed : parsed.characters
    if (!Array.isArray(imported)) throw new Error('No characters array')

    const missing = []
    const missingBackgrounds = []
    for (const character of imported.map(normalizeCharacter)) {
      for (const itemId of collectHomebrewIdsFromCharacter(character)) {
        if (String(itemId).startsWith(HOMEBREW_ID_PREFIX) && !getItem(itemId) && !getHomebrewRace(itemId)
          && !getHomebrewBackground(itemId)) missing.push(itemId)
      }
      for (const skillId of character.skills || []) {
        if (String(skillId).startsWith(HOMEBREW_ID_PREFIX) && !getSkill(skillId)) missing.push(skillId)
      }
      if (String(character.race || '').startsWith(HOMEBREW_ID_PREFIX) && !getRace(character.race)) missing.push(character.race)
      const bgId = String(character.background || '')
      if (bgId.startsWith(HOMEBREW_ID_PREFIX) && !getBackground(bgId)) {
        missingBackgrounds.push(bgId)
        missing.push(bgId)
      }
    }
    if (missing.length) {
      throw new Error(`Missing homebrew content: ${[...new Set(missing)].join(', ')}`)
    }

    const fullSave = isFullSaveExport(parsed)
    const hasExisting = state.characters.length > 0
    let replace = false

    if (fullSave) {
      if (!hasExisting) replace = true
      else {
        replace = confirm(
          'This is a full save file.\n\nOK = Replace entire save (characters, folders, GM tools, UI, homebrew).\nCancel = Merge imported characters by ID (keeps your current folders and GM state).'
        )
      }
    }

    flushPendingCharacterEdits()
    applySavePayload(parsed, { replace })
    saveNow()
    render({ all: true })
    syncUrlState()
    const count = imported.length
    const bgWarn = missingBackgrounds.length
      ? ` Warning: missing custom background(s): ${[...new Set(missingBackgrounds)].join(', ')}.`
      : ''
    toast(
      (replace
        ? `Restored full save (${count} character${count === 1 ? '' : 's'}).`
        : `Merged ${count} character${count === 1 ? '' : 's'} into your roster.`) + bgWarn
    )
  } catch (error) {
    console.error(error)
    toast(error.message?.includes('Missing homebrew')
      ? error.message
      : 'Import failed. That file does not look like a LumenForge save.')
  }
}

export function saveNotes(value, silent = false, characterId = null) {
  const character = characterById(characterId)
  if (!character) return
  const page = activeNotePage(character)
  if (!page) return
  page.body = String(value || '')
  silentCharacterSave(character)
  state.notesDirty = false
  if (!silent) toast('Notes saved.')
  else if (character.id === state.activeId) {
    const status = document.querySelector('#notes-status')
    if (status) {
      status.textContent = 'Saved'
      status.className = 'pill good'
    }
  }
}

export function renameCharacter(name) {
  const character = activeCharacter()
  if (!character) return
  character.name = name.trim() || character.name
  touch(character, { sidebar: true, header: true, content: true })
}

export function switchTab(tab) {
  if (tab === 'inventory') tab = 'shop'
  state.tab = tab
  render({ content: true, tabs: true })
  syncUrlState()
}

export function printCharacterSheet() {
  const character = activeCharacter()
  if (!character) return toast('Select a character first.')
  openPrintableCharacterSheet(character)
}

/* ---------------------------------------------------------------------- */
/* Encounter Balancer                                                      */
/* ---------------------------------------------------------------------- */

function silentCharacterSave(character) {
  if (character) invalidateCharacterCache(character)
  save()
}

function characterById(characterId) {
  if (!characterId) return activeCharacter()
  return state.characters.find(row => row.id === characterId) || null
}

function inventoryEntryForCharacter(characterId, entryUid) {
  const character = characterById(characterId)
  if (!character) return { character: null, entry: null }
  const entry = character.inventory?.find(row => row.uid === entryUid)
  return { character, entry }
}

export function toggleInventoryEntryStar(entryUid) {
  const { character, entry } = inventoryEntryForCharacter(state.activeId, entryUid)
  if (!character || !entry) return
  entry.starred = !entry.starred
  touch(character)
}

export function toggleInventoryEntryLock(entryUid) {
  const { character, entry } = inventoryEntryForCharacter(state.activeId, entryUid)
  if (!character || !entry) return
  entry.locked = !entry.locked
  touch(character)
}

export function updateInventoryEntryPlayerNotes(characterId, entryUid, notes) {
  const { character, entry } = inventoryEntryForCharacter(characterId, entryUid)
  if (!character || !entry) return
  entry.playerNotes = String(notes || '').trim().slice(0, 2000) || undefined
  silentCharacterSave(character)
}

export function setInventorySort(sortId) {
  state.inventorySort = sortId || 'newest'
  render({ content: true })
}

export function setInventoryFilter(filterId) {
  state.inventoryFilter = filterId || 'all'
  render({ content: true })
}

export function setInventoryTagFilter(tag) {
  state.inventoryTagFilter = String(tag || '')
  render({ content: true })
}

export function setInventoryCursedOnly(checked) {
  state.inventoryCursedOnly = Boolean(checked)
  render({ content: true })
}

export function toggleCatalogItemStar(itemId) {
  const ids = new Set(state.starredCatalogItemIds || [])
  if (ids.has(itemId)) ids.delete(itemId)
  else ids.add(itemId)
  state.starredCatalogItemIds = [...ids]
  save()
  render({ content: true })
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

export function toggleRecipeStar(recipeId) {
  const character = activeCharacter()
  if (!character || !recipeId) return
  const ids = new Set(character.starredRecipeIds || [])
  if (ids.has(recipeId)) ids.delete(recipeId)
  else ids.add(recipeId)
  character.starredRecipeIds = [...ids]
  touch(character)
}

export function activeNotePage(character) {
  if (!character?.notePages?.length) return null
  const map = state.activeNotePageByCharacter || {}
  const activeId = map[character.id]
  return character.notePages.find(page => page.id === activeId) || character.notePages[0]
}

export function setActiveNotePage(pageId) {
  const character = activeCharacter()
  if (!character) return
  state.activeNotePageByCharacter = { ...(state.activeNotePageByCharacter || {}), [character.id]: pageId }
  save()
  render({ content: true })
}

export function addNotePage() {
  const character = activeCharacter()
  if (!character) return
  const page = { id: uid('note'), title: `Session ${character.notePages.length + 1}`, body: '' }
  character.notePages = [...(character.notePages || []), page]
  state.activeNotePageByCharacter = { ...(state.activeNotePageByCharacter || {}), [character.id]: page.id }
  touch(character)
}

export function renameNotePage(characterId, pageId, title) {
  const character = characterById(characterId)
  if (!character) return
  const page = character.notePages?.find(row => row.id === pageId)
  if (!page) return
  page.title = String(title || 'Notes').trim().slice(0, 80) || 'Notes'
  silentCharacterSave(character)
}

export function deleteNotePage(pageId) {
  const character = activeCharacter()
  if (!character || !character.notePages?.length) return
  if (character.notePages.length <= 1) return toast('Keep at least one notes page.')
  character.notePages = character.notePages.filter(row => row.id !== pageId)
  const next = activeNotePage(character)
  if (next) state.activeNotePageByCharacter = { ...(state.activeNotePageByCharacter || {}), [character.id]: next.id }
  touch(character)
}

export function saveNotePageBody(pageId, body, characterId = null) {
  const character = characterById(characterId)
  if (!character) return
  const page = character.notePages?.find(row => row.id === pageId)
  if (!page) return
  page.body = String(body || '')
  silentCharacterSave(character)
  state.notesDirty = false
}

export function addQuestEntry() {
  const character = activeCharacter()
  if (!character) return
  character.quests = [...(character.quests || []), { id: uid('quest'), name: 'New quest', giver: '', reward: '', completed: false }]
  touch(character)
}

export function updateQuestEntry(characterId, questId, field, value) {
  const character = characterById(characterId)
  if (!character) return
  const quest = character.quests?.find(row => row.id === questId)
  if (!quest) return
  if (field === 'completed') quest.completed = Boolean(value)
  else quest[field] = String(value || '').trim()
  silentCharacterSave(character)
}

export function removeQuestEntry(questId) {
  const character = activeCharacter()
  if (!character) return
  character.quests = (character.quests || []).filter(row => row.id !== questId)
  touch(character)
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

export function openGuidedCreate() {
  openGuidedCreateState()
  render({ content: true })
}

export function cancelGuidedCreate() {
  if (!closeGuidedCreateState({ force: false })) return
  render({ content: true })
}

export function guidedCreateNext() {
  const gc = state.guidedCreate
  if (!gc?.open) return
  if (gc.step === 1) {
    const f = gc.form
    if (!String(f.name || "").trim()) return toast("Enter a name.")
    if (f.raceId === "dragonborn" && !f.elementalAffinity) return toast("Pick an elemental affinity.")
    if (f.raceId === "human" && !f.humanStarterSkill) return toast("Pick a starter weapon skill.")
    syncDraftFromIdentityForm()
  }
  if (gc.step === 2 && !gc.playstyle) return toast("Pick a playstyle (or Explore).")
  if (gc.step < 6) {
    if (gc.step >= 2) syncDraftFromIdentityForm()
    gc.step += 1
    gc.dirty = true
  }
  render({ content: true })
}

export function guidedCreateBack() {
  const gc = state.guidedCreate
  if (!gc?.open) return
  gc.step = Math.max(1, gc.step - 1)
  render({ content: true })
}

export function guidedCreateFinish() {
  const created = finishGuidedCreateState()
  if (!created) return
  save()
  render({ all: true })
}
