#!/usr/bin/env node
import { computeEncounterDifficulty, resolvePartyAvgThreatLevel } from '../js/gm/encounter-balancer.js'

const low = computeEncounterDifficulty({
  partyAvgThreatLevel: 8,
  partyCount: 4,
  enemyThreatLevel: 10,
  enemyCount: 2
})

const high = computeEncounterDifficulty({
  partyAvgThreatLevel: 30,
  partyCount: 4,
  enemyThreatLevel: 10,
  enemyCount: 2
})

if (!Number.isFinite(low.index) || !low.label) {
  throw new Error('Encounter difficulty must return label and index')
}

if (high.index >= low.index) {
  throw new Error('Higher party Threat Level should ease difficulty vs same enemies')
}

const combined = resolvePartyAvgThreatLevel({
  partyAvgSkillLevel: 5,
  partyAvgCombatPower: 7
})
if (combined !== 12) {
  throw new Error(`Expected SL+CP fallback of 12, got ${combined}`)
}

const explicit = resolvePartyAvgThreatLevel({
  partyAvgThreatLevel: 20,
  partyAvgSkillLevel: 5,
  partyAvgCombatPower: 7
})
if (explicit !== 20) {
  throw new Error(`Explicit party TL should win (expected 20, got ${explicit})`)
}

console.log('verify-encounter-balancer: ok')
