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
const { initCache, flattenSkills } = await importJs('cache.js')
const { createCharacter, normalizeCharacter } = await importJs('character.js')
const { canLearnSkill } = await importJs('skills.js')
const { TIER_MIN_LEVEL } = await importJs('constants.js')
const { computeSkillLevel } = await importJs('skill-level.js')
const { state } = await importJs('state.js')

await loadGameData()
initCache()

assert.equal(TIER_MIN_LEVEL[1], 0)
assert.equal(TIER_MIN_LEVEL[2], 5)
assert.equal(TIER_MIN_LEVEL[3], 12)
assert.equal(TIER_MIN_LEVEL[4], 20)
assert.equal(TIER_MIN_LEVEL[5], 35)
assert.equal(TIER_MIN_LEVEL[6], 50)

const four = ['sword_basics', 'steady_aim', 'stone_throw', 'earth_sense']
const five = [...four, 'trail_warden']

const realT2 = flattenSkills().find(s =>
  Number(s.tier) === 2 && s.category === 'weapons' && s.subcategory === 'ranged'
)
assert.ok(realT2, 'need a ranged T2 skill')

state.gmMode = false
const char = normalizeCharacter(createCharacter('Gate Test', 'elf'))
char.skills = [...four]
char.lumens = 999

assert.equal(computeSkillLevel(char).skillLevel, 4)
const blocked = canLearnSkill(char, realT2)
assert.equal(blocked.ok, false)
assert.match(String(blocked.reason || ''), /Skill Level 5/i)

char.skills = [...five]
assert.equal(computeSkillLevel(char).skillLevel, 5)

const openGate = canLearnSkill(char, realT2)
// May still fail on skill prereqs — but must not fail on the Skill Level tier gate
if (!openGate.ok) {
  assert.ok(
    !/^Requires Skill Level \d+ \(Tier/i.test(openGate.reason || ''),
    `unexpected level block: ${openGate.reason}`
  )
} else {
  assert.equal(openGate.ok, true)
}

console.log('verify-tier-gates: ok')
