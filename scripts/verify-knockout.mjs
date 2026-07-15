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
const { createCharacter, normalizeCharacter, computeStats } = await importJs('character.js')
const { tickStatusEffects } = await importJs('effects.js')
const { addStatusEffectToCharacter } = await importJs('effects.js')
const {
  applyHealingToCharacter,
  syncKnockoutAfterHpChange,
  rollRecovery,
  startManualRevival,
  advanceManualRevival,
  knockoutActionBlockReason,
  canTakeNormalActions,
  isKnockedOut,
  isDead,
  normalizeKnockoutFields
} = await importJs('knockout.js')

await loadGameData()
initCache()

const character = createCharacter('Tester', 'human')
character.hp = 1
addStatusEffectToCharacter(character, 'bleeding', 3, 1, 'test')
tickStatusEffects(character)
if (character.hp !== 0) throw new Error('Bleeding should reduce 1 HP at End of Turn tick')
syncKnockoutAfterHpChange(character, { previousHp: 1 })
if (!isKnockedOut(character)) throw new Error('0 HP should enter Knocked Out')

if (canTakeNormalActions(character)) throw new Error('Knocked Out cannot take normal actions')
if (!knockoutActionBlockReason(character)) throw new Error('Block reason required when Knocked Out')

const r1 = rollRecovery(character, 15)
if (!r1.success || r1.revived) throw new Error('First success should not revive yet')
const rFail = rollRecovery(character, 5)
if (rFail.success || character.recoverySuccessStreak !== 0) throw new Error('Failure must reset success streak')
const s1 = rollRecovery(character, 12)
const s2 = rollRecovery(character, 18)
if (!s2.revived || character.hp !== 1 || isKnockedOut(character)) {
  throw new Error('Two successes in a row should Revive at 1 HP')
}

character.hp = 0
syncKnockoutAfterHpChange(character)
rollRecovery(character, 3)
rollRecovery(character, 2)
const rDead = rollRecovery(character, 1)
if (!rDead.dead || !isDead(character)) throw new Error('Three failures should cause death')

const survivor = createCharacter('Ally', 'human')
survivor.hp = 0
syncKnockoutAfterHpChange(survivor)
startManualRevival(survivor, 'Friend')
if (survivor.manualRevival?.step !== 1) throw new Error('Manual revival should start at step 1')
advanceManualRevival(survivor)
if (survivor.manualRevival?.step !== 2) throw new Error('Manual revival should advance to step 2')
const done = advanceManualRevival(survivor)
if (!done.revived || survivor.hp !== 1 || survivor.manualRevival) {
  throw new Error('Manual revival step 2 should Revive at 1 HP')
}

const patient = createCharacter('Patient', 'human')
patient.hp = 0
syncKnockoutAfterHpChange(patient)
patient.recoverySuccessStreak = 1
patient.recoveryFailureStreak = 2
const maxHp = computeStats(patient).hp
const healed = applyHealingToCharacter(patient, 25, computeStats)
if (!healed.revived || patient.hp !== Math.min(25, maxHp)) {
  throw new Error(`Healing should Revive with full heal amount (got ${patient.hp}, expected ${Math.min(25, maxHp)})`)
}
if (patient.recoverySuccessStreak || patient.recoveryFailureStreak || isKnockedOut(patient)) {
  throw new Error('Healing must clear Recovery streaks and Knocked Out')
}

const saved = normalizeCharacter({
  ...createCharacter('SaveMe', 'human'),
  hp: 0,
  knockedOut: true,
  recoverySuccessStreak: 1,
  recoveryFailureStreak: 0,
  manualRevival: { step: 2, helperName: 'Medic' }
})
normalizeKnockoutFields(saved)
if (!saved.knockedOut || saved.recoverySuccessStreak !== 1 || saved.manualRevival?.step !== 2) {
  throw new Error('Normalize must preserve Knocked Out Recovery progress')
}

console.log('verify-knockout: ok')
