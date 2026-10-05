#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { importJs } from './lib/js-import.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jsonDir = join(root, 'data', 'json')

globalThis.fetch = async url => {
  const file = url.split('?')[0].split('/').pop()
  if (file === 'manifest.json') return { ok: true, json: async () => ({ version: 'verify' }) }
  const data = JSON.parse(readFileSync(join(jsonDir, file), 'utf8'))
  return { ok: true, json: async () => data }
}

const { loadGameData } = await importJs('data.js')
const { initCache } = await importJs('cache.js')
const { createCharacter, normalizeCharacter, computeStats, invalidateCharacterCache } = await importJs('character.js')
const { tickStatusEffects } = await importJs('effects.js')
const { addStatusEffectToCharacter } = await importJs('effects.js')
const {
  applyHealingToCharacter,
  syncKnockoutAfterHpChange,
  rollRecovery,
  recordDeathSave,
  reviveByAlly,
  ignoreDeathSaves,
  undoDeath,
  deathSavePopupOpen,
  knockoutActionBlockReason,
  canTakeNormalActions,
  isKnockedOut,
  isDead,
  normalizeKnockoutFields,
  DEATH_SAVE_RULES
} = await importJs('knockout.js')
const { INJURIES, addInjury, healInjury, activeInjuries } = await importJs('character/injuries.js')

await loadGameData()
initCache()

const fail = msg => { throw new Error(msg) }

const character = createCharacter('Tester', 'human')
character.hp = 1
addStatusEffectToCharacter(character, 'bleeding', 3, 1, 'test')
tickStatusEffects(character)
if (character.hp !== 0) fail('Bleeding should reduce 1 HP at End of Turn tick')
const entered = syncKnockoutAfterHpChange(character, { previousHp: 1 })
if (!entered.entered || !isKnockedOut(character)) fail('0 HP should enter Knocked down')
if (entered.injury) fail('No injury when the Injuries tick is off')
if (!deathSavePopupOpen(character)) fail('Knocked down popup should open at 0 HP')
if (canTakeNormalActions(character)) fail('Knocked down cannot take normal actions')
if (!knockoutActionBlockReason(character)) fail('Block reason required when Knocked down')

// Death saves: 10+ gets you up at 1 HP straight away.
if (DEATH_SAVE_RULES.target !== 10 || DEATH_SAVE_RULES.maxFails !== 3) fail('Death saves should be 10+ with 3 chances')
const low = rollRecovery(character, 9)
if (low.success || low.dead || low.chancesLeft !== 2) fail('A 9 should fail with 2 chances left')
const up = rollRecovery(character, 10)
if (!up.revived || character.hp !== 1 || isKnockedOut(character) || character.recoveryFailureStreak !== 0) {
  fail('A 10 should get you up at 1 HP and clear failures')
}

// Three failures (not only in a row) mean death; the popup is replaced by the death screen.
character.hp = 0
syncKnockoutAfterHpChange(character)
rollRecovery(character, 3)
recordDeathSave(character, false)
const rDead = rollRecovery(character, 1)
if (!rDead.dead || !isDead(character) || character.hp !== 0) fail('Three failures should cause death at 0 HP')
if (deathSavePopupOpen(character)) fail('Dead characters should not see the death-save popup')
if (!rollRecovery(character, 20).error) fail('No death saves once dead')
if (applyHealingToCharacter(character, 10, computeStats).healed) fail('Healing should not revive the dead')
if (!undoDeath(character) || isDead(character) || !isKnockedOut(character) || deathSavePopupOpen(character)) {
  fail('Bring back should leave them alive, at 0 HP, with the popup closed')
}

// Healed by another player: 1 HP.
const ally = createCharacter('Ally', 'human')
ally.hp = 0
syncKnockoutAfterHpChange(ally)
recordDeathSave(ally, false)
if (!reviveByAlly(ally).revived || ally.hp !== 1 || isKnockedOut(ally)) fail('Healed by another player should give 1 HP')

// Ignore: stays at 0 HP, popup closed until the next knockdown.
const stubborn = createCharacter('Stubborn', 'human')
stubborn.hp = 0
syncKnockoutAfterHpChange(stubborn)
ignoreDeathSaves(stubborn)
if (deathSavePopupOpen(stubborn) || stubborn.hp !== 0 || !isKnockedOut(stubborn)) fail('Ignore should close the popup and stay at 0 HP')
stubborn.hp = 5
syncKnockoutAfterHpChange(stubborn, { previousHp: 0 })
stubborn.hp = 0
syncKnockoutAfterHpChange(stubborn, { previousHp: 5 })
if (!deathSavePopupOpen(stubborn)) fail('A fresh knockdown should open the popup again')

// Healing items give their full amount.
const patient = createCharacter('Patient', 'human')
patient.hp = 0
syncKnockoutAfterHpChange(patient)
patient.recoveryFailureStreak = 2
const maxHp = computeStats(patient).hp
const healed = applyHealingToCharacter(patient, 25, computeStats)
if (!healed.revived || patient.hp !== Math.min(25, maxHp)) {
  fail(`Healing should Revive with full heal amount (got ${patient.hp}, expected ${Math.min(25, maxHp)})`)
}
if (patient.recoveryFailureStreak || isKnockedOut(patient)) fail('Healing must clear death saves and Knocked down')

// Saves keep death-save progress; old success streaks / manual revival are dropped.
const saved = normalizeCharacter({
  ...createCharacter('SaveMe', 'human'),
  hp: 0,
  knockedOut: true,
  recoverySuccessStreak: 1,
  recoveryFailureStreak: 2,
  deathSaveIgnored: true,
  manualRevival: { step: 2, helperName: 'Medic' }
})
normalizeKnockoutFields(saved)
if (!saved.knockedOut || saved.recoveryFailureStreak !== 2 || !saved.deathSaveIgnored) fail('Normalize must keep death-save progress')
if ('manualRevival' in saved || 'recoverySuccessStreak' in saved) fail('Old revival fields should be dropped')

// Injuries: off by default; when ticked, every knockdown adds a random one.
const hurt = createCharacter('Hurt', 'human')
if (hurt.survival.on.injuries || hurt.survival.injuries.length) fail('Injuries should start off and empty')
hurt.survival.on.injuries = true
const baseStrength = computeStats(hurt).strength
hurt.hp = 0
const ko = syncKnockoutAfterHpChange(hurt, { random: () => 0 })
if (ko.injury?.id !== INJURIES[0].id || hurt.lastKnockdownInjury !== INJURIES[0].id) fail('Knockdown should add a random injury')
invalidateCharacterCache(hurt)
if (computeStats(hurt).strength !== baseStrength - 2) fail('Broken Arm should give −2 Strength')
syncKnockoutAfterHpChange(hurt, { random: () => 0 })
if (hurt.survival.injuries.length !== 1) fail('Staying at 0 HP should not add more injuries')
reviveByAlly(hurt)
hurt.hp = 0
const ko2 = syncKnockoutAfterHpChange(hurt, { random: () => 0 })
if (ko2.injury?.id === INJURIES[0].id) fail('A second knockdown should pick an injury you do not already have')
const added = addInjury(hurt, 'deep-gash')
if (activeInjuries(hurt).length !== 3) fail('Adding a named injury should work')
const reloaded = normalizeCharacter(JSON.parse(JSON.stringify(hurt)))
if (reloaded.survival.injuries.length !== 3) fail('Injuries should survive save/load')
healInjury(hurt, added.uid)
healInjury(hurt, hurt.survival.injuries[0].uid)
invalidateCharacterCache(hurt)
if (activeInjuries(hurt).length !== 1 || computeStats(hurt).strength !== baseStrength) fail('Heal Injury should remove it and its penalty')
hurt.survival.on.injuries = false
if (activeInjuries(hurt).length) fail('Turning the tick off should hide injuries')

console.log('verify-knockout: ok')
