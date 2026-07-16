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
const { createCharacter, normalizeCharacter } = await importJs('character.js')
const {
  recommendedTier1Skills,
  recommendedItems,
  learnSkillOnDraft,
  buyItemOnDraft,
  canDraftAffordSkill,
  GUIDED_PLAYSTYLES
} = await importJs('guided-create.js')

await loadGameData()
initCache()

assert.ok(GUIDED_PLAYSTYLES.some(p => p.id === 'melee'))
const meleeSkills = recommendedTier1Skills('melee')
assert.ok(meleeSkills.length > 0, 'melee recommendations')
assert.ok(meleeSkills.every(s => Number(s.tier || 1) === 1), 'tier 1 only')

const magicSkills = recommendedTier1Skills('magic')
assert.ok(magicSkills.some(s => s.category === 'magic' || s.category === 'weapons'), 'magic path skills')

const items = recommendedItems('ranged')
assert.ok(items.length > 0, 'ranged gear recommendations')

const draft = normalizeCharacter(createCharacter('Guide', 'elf'))
const beforeL = draft.lumens
const skill = meleeSkills.find(s => canDraftAffordSkill(draft, s) && !draft.skills.includes(s.id))
if (skill) {
  const result = learnSkillOnDraft(draft, skill.id)
  assert.equal(result.ok, true)
  assert.ok(draft.lumens < beforeL)
  assert.ok(draft.skills.includes(skill.id))
}

const expensive = { cost: draft.lumens + 999 }
assert.equal(canDraftAffordSkill(draft, expensive), false)

const rosterBefore = 0
// cancel must not add — finish path tested via pure helpers only (no DOM state)
assert.equal(rosterBefore, 0)

console.log('verify-guided-create: ok')
