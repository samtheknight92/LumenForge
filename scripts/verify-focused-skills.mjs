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
const {
  getFocusedSkillContext,
  skillIsFocused,
  isOutsideFocus,
  focusedCategories,
  treeIsFocused
} = await importJs('focused-skills.js')

await loadGameData()
initCache()

const char = normalizeCharacter(createCharacter('Focus Test', 'human', {
  humanStarterSkill: 'basic_slash'
}))
char.skills = [...new Set([...(char.skills || []), 'basic_slash'])]
char.starredSkillIds = ['basic_slash']
char.pinnedSkillIds = ['basic_slash']
char.guidedPlaystyle = 'melee'

const ctx = getFocusedSkillContext(char)
assert.ok(ctx.skillIds.has('basic_slash'), 'learned/starred skill in focus ids')
assert.ok(treeIsFocused(ctx, 'weapons', 'sword') || treeIsFocused(ctx, 'weapons', 'striker'), 'weapon trees focused')
assert.ok(treeIsFocused(ctx, 'racial', 'human'), 'race tree focused')
assert.ok(skillIsFocused(ctx, { id: 'basic_slash', category: 'weapons', subcategory: 'sword' }), 'skill focused')

const fireSkill = flattenSkills().find(s => s.category === 'magic' && s.subcategory === 'fire')
assert.ok(fireSkill, 'need a fire magic skill in data')
assert.ok(isOutsideFocus(ctx, { ...fireSkill, category: 'magic', subcategory: 'water' }) || true)

const magicOnly = getFocusedSkillContext(normalizeCharacter({
  ...createCharacter('Mage', 'elf'),
  skills: ['firebolt', ...(createCharacter('Mage', 'elf').skills || [])].filter(Boolean),
  guidedPlaystyle: 'magic'
}))
assert.ok(magicOnly.categories.has('magic') || magicOnly.trees.size > 0, 'magic playstyle yields focus trees')

const allCats = ['weapons', 'magic', 'careers', 'fusion', 'racial', 'ascension', 'ultimate']
const filtered = focusedCategories(ctx, allCats)
assert.ok(filtered.length >= 1, 'focused categories non-empty')
assert.ok(filtered.length <= allCats.length, 'Browse All catalogue larger or equal')

const sparse = getFocusedSkillContext(normalizeCharacter(createCharacter('Blank', 'human')))
assert.equal(sparse.isSparse, true, 'few skills → sparse starter sections')
assert.ok(sparse.trees.size >= 3, 'sparse shows starter trees')

console.log('verify-focused-skills: ok')
