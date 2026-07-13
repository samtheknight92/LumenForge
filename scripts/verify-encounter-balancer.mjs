#!/usr/bin/env node
import { computeEncounterDifficulty } from '../js/gm/encounter-balancer.js'

const base = computeEncounterDifficulty({
  partyAvgCombatPower: 10,
  partyAvgSkillLevel: 2,
  partyCount: 4,
  enemyThreatLevel: 10,
  enemyCount: 2
})

const highSkill = computeEncounterDifficulty({
  partyAvgCombatPower: 10,
  partyAvgSkillLevel: 30,
  partyCount: 4,
  enemyThreatLevel: 10,
  enemyCount: 2
})

if (!base.power || !base.technique) {
  throw new Error('Encounter difficulty must return power and technique pressures')
}

if (base.power.index === base.technique.index && base.power.index === highSkill.power.index) {
  throw new Error('Same CP with different SL should produce different technique ratings')
}

if (highSkill.technique.index >= base.technique.index) {
  throw new Error('Higher Skill Level should ease technique pressure vs same enemies')
}

if (!base.label || base.index == null) {
  throw new Error('Combined label and index required for backward compatibility')
}

const combined = Math.round((base.power.index + base.technique.index) / 2)
if (base.index !== combined) {
  throw new Error(`Combined index should be average of pressures (expected ${combined}, got ${base.index})`)
}

console.log('verify-encounter-balancer: ok')
