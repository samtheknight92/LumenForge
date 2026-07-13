#!/usr/bin/env node
/**
 * Race passive traits must match wired stat modifiers and immunity effects.
 */
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
const { initCache, getRace } = await importJs('cache.js')
const { createCharacter, computeStats, statBreakdown } = await importJs('character.js')
const { characterEffectSources, extractRaceEffectIdsFromTrait } = await importJs('effects.js')

await loadGameData()
initCache()

function effectIdsForRace(raceId) {
  const race = getRace(raceId)
  const ids = new Set()
  for (const trait of race?.passiveTraits || []) {
    for (const id of extractRaceEffectIdsFromTrait(trait)) ids.add(id)
  }
  return [...ids]
}

const halfling = createCharacter('Test', 'halfling')
const halflingEffects = effectIdsForRace('halfling')
if (halflingEffects.includes('spell_warded')) {
  throw new Error('Halfling fear immunity must not map to spell_warded (+4 Mag Def combat buff)')
}
if (!halflingEffects.includes('fear_immunity')) {
  throw new Error('Halfling Brave Heart should map to fear_immunity')
}

const dwarf = createCharacter('Test', 'dwarf')
const dwarfStats = computeStats(dwarf)
const dwarfPd = statBreakdown(dwarf, 'physicalDefence').find(row => row.label === 'Dwarf')
if (!dwarfPd || dwarfPd.value !== 2) {
  throw new Error(`Dwarf should have +2 Physical Defence from race (got ${dwarfPd?.value ?? 0})`)
}

const tieflingEffects = effectIdsForRace('tiefling')
if (tieflingEffects.includes('spell_warded')) {
  throw new Error('Tiefling charm immunity must not map to spell_warded')
}
if (!tieflingEffects.includes('charm_immunity') || !tieflingEffects.includes('fire_immunity')) {
  throw new Error('Tiefling should map to charm_immunity and fire_immunity')
}

const sourced = characterEffectSources(halfling)
const spellWardedSource = sourced.find(row => row.effect.id === 'spell_warded')
if (spellWardedSource) {
  throw new Error('Halfling effect sources must not list spell_warded')
}

console.log('verify-race-passives: ok')
