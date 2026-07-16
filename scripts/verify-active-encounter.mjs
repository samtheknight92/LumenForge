#!/usr/bin/env node
import assert from 'node:assert/strict'
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
const { state } = await importJs('state.js')
const { createCharacter, normalizeCharacter } = await importJs('character.js')
const { getPremadeCharacter } = await importJs('premade-characters.js')
const {
  expandEncounterCombatants,
  normalizeActiveEncounter,
  markEncounterCombatantDefeated
} = await importJs('active-encounter.js')
const { tickStatusEffects } = await importJs('effects.js')

await loadGameData()
initCache()

const premades = JSON.parse(readFileSync(join(jsonDir, 'premade-characters.json'), 'utf8'))
const sample = (Array.isArray(premades) ? premades : premades.characters || []).find(p => p.premadeId) || premades[0]
assert.ok(sample?.premadeId, 'need a premade')

const template = getPremadeCharacter(sample.premadeId)
assert.ok(template, 'template loads')
const templateHp = template.hp

state.encounterEnemies = [
  { id: 'e1', source: 'premade', premadeId: sample.premadeId, count: 3 }
]

const combatants = expandEncounterCombatants(state.encounterEnemies)
assert.equal(combatants.length, 3, '3 unique combatants')
assert.equal(new Set(combatants.map(c => c.id)).size, 3, 'unique ids')
assert.ok(combatants[0].name.includes(template.name) || combatants[0].name.length > 0)

combatants[0].hp = Math.max(0, combatants[0].hp - 5)
assert.equal(getPremadeCharacter(sample.premadeId).hp, templateHp, 'premade source unchanged')

const roster = normalizeCharacter(createCharacter('PC Source', 'human'))
const rosterHp = roster.hp
state.characters = [roster]
state.encounterEnemies = [
  { id: 'e2', source: 'character', characterId: roster.id, count: 2 }
]
const fromRoster = expandEncounterCombatants(state.encounterEnemies)
assert.equal(fromRoster.length, 2)
fromRoster[0].hp = 1
assert.equal(state.characters[0].hp, rosterHp, 'roster source unchanged')

state.encounterEnemies = [
  { id: 'e3', source: 'manual', name: 'Threat Blob', threatLevel: 5, count: 1 }
]
const manual = expandEncounterCombatants(state.encounterEnemies)
assert.equal(manual.length, 1)
assert.ok(manual[0].encounterSource?.generated)

const enc = normalizeActiveEncounter({
  id: 'enc1',
  round: 2,
  combatants: combatants,
  initiativeEntries: combatants.map((c, i) => ({ id: `i${i}`, name: c.name, initiative: 10 - i, combatantId: c.id })),
  activeCombatantId: combatants[0].id
})
assert.equal(enc.round, 2)
assert.equal(enc.combatants.length, 3)
state.activeEncounter = enc

// Process turn path without importing UI actions (DOM/storage side effects)
tickStatusEffects(enc.combatants[0])
markEncounterCombatantDefeated(enc.combatants[1].id, true)
assert.equal(enc.combatants[1].defeated, true)

state.activeEncounter = null
const cleared = normalizeActiveEncounter(null)
assert.equal(cleared, null)

console.log('verify-active-encounter: ok')
