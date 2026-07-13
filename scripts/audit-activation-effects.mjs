#!/usr/bin/env node
/**
 * Find skills with Fire Shield–class bugs:
 * - reactive-only dice treated as cast damage
 * - Apply self-buff + attacker proc parsed together
 * - wrong activationEffects (chance on self buff, reactive debuffs in AE)
 */
import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { fileURLToPath, pathToFileURL } from 'url'
import { resolveActivationEffectsForSkill, walkSkillLists } from './lib/resolve-activation-effects.mjs'
import { CAPSTONE_ACTIVATION_EFFECTS } from './capstone-activation-effects.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadSkills() {
  const sandbox = { window: {} }
  vm.createContext(sandbox)
  vm.runInContext(fs.readFileSync(path.join(root, 'data', 'skills-data.js'), 'utf8'), sandbox)
  return walkSkillLists(sandbox.window.SKILLS_DATA)
}

function stripReactive(desc) {
  return String(desc || '')
    .replace(/attackers?\s+(?:that|who)\s+hit[^.;]*/gi, '')
    .replace(/when\s+(?:you are\s+)?hit[^.;]*/gi, '')
    .replace(/on\s+being\s+hit[^.;]*/gi, '')
}

function hasReactiveDice(desc) {
  return /attackers?\s+(?:that|who)\s+hit/i.test(desc) && /\d+d\d+/i.test(desc)
}

function hasCastDice(desc) {
  const s = stripReactive(desc)
  return /\d+d\d+/i.test(s) || /\+\d+\s+damage\b/i.test(s)
}

function isActivatable(skill) {
  const desc = String(skill.desc || '')
  if (/^passive:/i.test(desc)) return false
  if (/^enhancement:/i.test(desc)) return false
  if (/^utility:/i.test(desc)) return false
  if (/^toggle:/i.test(desc)) return false
  return /^action:/i.test(desc) || /^spell:/i.test(desc) || /^reaction:/i.test(desc) || Number(skill.staminaCost || 0) > 0
}

function isSelfBuffEffect(effect) {
  const type = String(effect?.type || '').toLowerCase()
  return type.includes('protection') || type.includes('buff') || type.includes('recovery') || type.includes('heal')
    || type.includes('enhancement') || type.includes('movement')
}

function isBadEffect(effect) {
  const type = String(effect?.type || '').toLowerCase()
  return type.includes('debuff') || type.includes('control') || type.includes('damageovertime')
}

function isPrimaryApplyCast(desc) {
  const text = String(desc || '')
  return /^spell:\s*apply\b/i.test(text) || /^action:\s*(?:touch:\s*)?apply\b/i.test(text)
}

function expectedActivation(skill, effects) {
  if (CAPSTONE_ACTIVATION_EFFECTS[skill.id]?.length) {
    return CAPSTONE_ACTIVATION_EFFECTS[skill.id]
  }
  return resolveActivationEffectsForSkill(skill, effects)
}

function shouldNotRollDamageOnUse(skill) {
  const desc = String(skill.desc || '')
  if (/^toggle:/i.test(desc) || /^passive:/i.test(desc) || /^utility:/i.test(desc)) return true
  if (/^reaction:/i.test(desc)) return true
  if (/apply\s+(protected|spell warded|enhanced|regeneration|immobilized|weakened|burn)\b/i.test(desc) && !/(?:attack roll|on a hit|on hit|on each hit)/i.test(desc)) {
    return !hasCastDice(desc)
  }
  if (/\bOR\s+apply\b/i.test(desc)) return false // heal path may roll heal dice — OK
  if (hasReactiveDice(desc) && !hasCastDice(desc)) return true
  return false
}

function wouldRollDamageOldParser(desc) {
  return /\d+d\d+/i.test(desc)
}

const effects = JSON.parse(fs.readFileSync(path.join(root, 'data', 'json', 'effects.json'), 'utf8'))
const skills = loadSkills()
const issues = []

for (const skill of skills) {
  if (!isActivatable(skill)) continue
  const desc = String(skill.desc || '')
  const expected = expectedActivation(skill, effects)
  const actual = skill.activationEffects || []

  if (hasReactiveDice(desc) && !hasCastDice(desc)) {
    issues.push({ kind: 'reactive-dice-only', id: skill.id, name: skill.name })
  }

  if (shouldNotRollDamageOnUse(skill) && wouldRollDamageOldParser(desc)) {
    issues.push({ kind: 'would-roll-without-fix', id: skill.id, name: skill.name, note: 'fixed by reactive strip unless regression' })
  }

  if (/apply\s+(protected|spell warded)/i.test(desc) && !expected.length) {
    issues.push({ kind: 'missing-activation', id: skill.id, name: skill.name })
  }

  for (const row of expected) {
    const effect = effects[row.effectId]
    if (/attackers?\s+(?:that|who)\s+hit/i.test(desc) && ['burn', 'bleeding', 'poison', 'weakened', 'incapacitated', 'immobilized'].includes(row.effectId)) {
      issues.push({ kind: 'reactive-debuff-in-activation', id: skill.id, name: skill.name, effectId: row.effectId })
    }
    if (row.chance != null && row.chance < 1 && isSelfBuffEffect(effect) && row.applyTo !== 'target') {
      issues.push({ kind: 'self-buff-with-chance', id: skill.id, name: skill.name, effectId: row.effectId, chance: row.chance })
    }
    if (isSelfBuffEffect(effect) && /apply\s+(protected|spell warded|regeneration|enhanced|weapon enchanted)/i.test(desc) && row.applyTo !== 'self') {
      issues.push({ kind: 'self-buff-missing-applyTo', id: skill.id, name: skill.name, effectId: row.effectId })
    }
    if (isBadEffect(effect) && /touch:\s*apply|target within/i.test(desc) && row.applyTo === 'self') {
      issues.push({ kind: 'target-debuff-marked-self', id: skill.id, name: skill.name, effectId: row.effectId })
    }
  }

  if (/apply\s+(protected|spell warded)/i.test(desc) && /(?:\d+%\s+chance to|chance to|may)\s+apply/i.test(desc)) {
    const bad = expected.filter(r => ['burn', 'bleeding', 'poison', 'weakened', 'incapacitated', 'immobilized', 'fear'].includes(r.effectId))
    if (bad.length) {
      issues.push({ kind: 'mixed-shield-and-proc', id: skill.id, name: skill.name, bad: bad.map(r => r.effectId) })
    }
  }

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    issues.push({ kind: 'data-out-of-sync', id: skill.id, name: skill.name })
  }
}

const seen = new Set()
const uniq = issues.filter(i => {
  const key = `${i.kind}|${i.id}|${i.effectId || ''}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

const real = uniq.filter(i => i.kind !== 'would-roll-without-fix' && i.kind !== 'reactive-dice-only')

console.log(`Scanned ${skills.length} skills`)
console.log(`Reactive-only (expected, fixed in damage-breakdown): ${uniq.filter(i => i.kind === 'reactive-dice-only').length}`)
console.log(`Remaining issues: ${real.length}\n`)

if (real.length) {
  for (const i of real.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id))) {
    console.log(`${i.kind}: ${i.name} (${i.id})`, i.effectId || '', i.chance != null ? `chance=${i.chance}` : '', i.bad ? `bad=[${i.bad}]` : '')
  }
  process.exit(1)
}

console.log('All clear — no activation/damage mismatches found.')
process.exit(0)
