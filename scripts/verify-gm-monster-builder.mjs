#!/usr/bin/env node
/**
 * Smoke-test GM Monster Builder: random builds should normalize, respect stat
 * rules, land near target TL, and preserve gmBuilder metadata.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { STAT_RULES } from '../js/core/constants.js'
import { importJs } from './lib/js-import.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const jsonDir = path.join(root, 'data', 'json')

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(jsonDir, file), 'utf8'))
}

const originalFetch = globalThis.fetch
globalThis.fetch = async url => {
  const file = path.basename(String(url).split('?')[0])
  if (file === 'manifest.json') return { ok: true, json: async () => ({ version: 'verify' }) }
  const data = loadJson(file)
  return { ok: true, json: async () => data }
}

const jsDir = path.join(root, 'js')

const { loadGameData } = await importJs('data.js')
const { initCache } = await importJs('cache.js')
const { loadHomebrewStore } = await importJs('homebrew.js')
const { normalizeCharacter } = await importJs('character.js')
const { computeThreatLevel } = await importJs('threat-level.js')
const {
  defaultGmMonsterBuilderDraft,
  generateMonsterCharacter,
  randomiseGmMonsterDraft,
  listBuilderTypeOptions,
  buildMonsterPreviewSummary,
  getBuilderAffinityView,
  getTemplateBuilderAffinityView
} = await importJs('gm-monster-builder.js')
const { getElementalDamageMultiplier } = await importJs('elemental-affinity.js')

await loadGameData()
globalThis.localStorage = globalThis.localStorage || {
  getItem() { return null },
  setItem() {}
}
loadHomebrewStore()
initCache()

globalThis.fetch = originalFetch

let failures = 0
const samples = 40

for (let i = 0; i < samples; i += 1) {
  const draft = randomiseGmMonsterDraft(defaultGmMonsterBuilderDraft())
  const character = generateMonsterCharacter(draft)
  const normalized = normalizeCharacter(character)

  if (!normalized.gmBuilder?.typeId) {
    console.error(`[${i}] missing gmBuilder metadata`)
    failures += 1
    continue
  }

  if (draft.category === 'monster' && normalized.race !== 'monster') {
    console.error(`[${i}] monster should use race "monster", got ${normalized.race}`)
    failures += 1
  }

  if (draft.category === 'npc' && normalized.race !== 'human') {
    console.error(`[${i}] npc should default to race "human", got ${normalized.race}`)
    failures += 1
  }

  for (const [stat, value] of Object.entries(normalized.stats || {})) {
    const rule = STAT_RULES[stat]
    if (!rule) continue
    if (value < rule.min || value > rule.max) {
      console.error(`[${i}] stat ${stat}=${value} outside ${rule.min}-${rule.max}`)
      failures += 1
    }
  }

  const threatInfo = computeThreatLevel(normalized)
  const target = normalized.gmBuilder.targetThreatLevel
  const gap = Math.abs(threatInfo.threatLevel - target)
  if (gap > 2) {
    console.error(`[${i}] TL gap ${gap} (achieved ${threatInfo.threatLevel}, target ${target})`)
    failures += 1
  }

  if (!Array.isArray(normalized.skills) || !normalized.skills.length) {
    console.error(`[${i}] expected at least one skill`)
    failures += 1
  }
}

const monsterTypes = listBuilderTypeOptions('monster')
const npcTypes = listBuilderTypeOptions('npc')
if (monsterTypes.length < 10) {
  console.error(`expected >= 10 monster types, got ${monsterTypes.length}`)
  failures += 1
}
if (npcTypes.length < 3) {
  console.error(`expected >= 3 npc types, got ${npcTypes.length}`)
  failures += 1
}

const fiendDraft = {
  ...defaultGmMonsterBuilderDraft(),
  typeId: 'fiend',
  roleId: 'striker',
  threatPresetId: 'easy'
}
const fiend = generateMonsterCharacter(fiendDraft)
const fiendSummary = buildMonsterPreviewSummary(fiend)
if (!Number.isFinite(fiendSummary?.combatPower)) {
  console.error('fiend preview combatPower must be a number')
  failures += 1
}
if (!fiendSummary?.traits?.some(row => row.includes('Resist: fire'))) {
  console.error('fiend preview should show fire resist')
  failures += 1
}
if (fiendSummary?.traits?.some(row => row.includes('holy'))) {
  console.error('fiend preview should not use invalid element "holy"')
  failures += 1
}
if (getElementalDamageMultiplier(fiend, 'fire') !== 0.5) {
  console.error(`fiend should have 50% fire resist (got ×${getElementalDamageMultiplier(fiend, 'fire')})`)
  failures += 1
}
if (getElementalDamageMultiplier(fiend, 'light') !== 2) {
  console.error(`fiend should have 200% light weak (got ×${getElementalDamageMultiplier(fiend, 'light')})`)
  failures += 1
}

const fiendView = getBuilderAffinityView(fiendDraft)
if (!fiendView.resistances.some(row => row.id === 'fire')) {
  console.error('fiend affinity view should list fire resist from template')
  failures += 1
}
const editedDraft = {
  ...fiendDraft,
  affinityRemoved: { resistances: ['fire'], weaknesses: [], immunities: [] },
  affinityAdded: { resistances: [], weaknesses: ['ice'], immunities: [] }
}
const editedView = getBuilderAffinityView(editedDraft)
if (editedView.resistances.some(row => row.id === 'fire')) {
  console.error('removed fire resist should not appear in affinity view')
  failures += 1
}
if (!editedView.weaknesses.some(row => row.id === 'ice')) {
  console.error('custom ice weak should appear in affinity view')
  failures += 1
}
const editedChar = generateMonsterCharacter(editedDraft)
if (getElementalDamageMultiplier(editedChar, 'fire') !== 1) {
  console.error('fiend with fire resist removed should take normal fire damage')
  failures += 1
}
if (getElementalDamageMultiplier(editedChar, 'ice') !== 2) {
  console.error('fiend with custom ice weak should take double ice damage')
  failures += 1
}
if (!getTemplateBuilderAffinityView(fiendDraft).resistances.some(row => row.id === 'fire')) {
  console.error('template view should still expose template fire resist')
  failures += 1
}

const typeAffinityExpect = [
  { typeId: 'aquatic', resist: 'water', weak: 'thunder' },
  { typeId: 'avian', resist: 'wind', weak: 'ice' },
  { typeId: 'giant', resist: 'earth', weak: null }
]
for (const row of typeAffinityExpect) {
  const view = getTemplateBuilderAffinityView({ ...defaultGmMonsterBuilderDraft(), typeId: row.typeId })
  if (!view.resistances.some(entry => entry.id === row.resist)) {
    console.error(`${row.typeId} should resist ${row.resist}`)
    failures += 1
  }
  if (row.weak && !view.weaknesses.some(entry => entry.id === row.weak)) {
    console.error(`${row.typeId} should be weak to ${row.weak}`)
    failures += 1
  }
}

if (failures) {
  console.error(`verify-gm-monster-builder: ${failures} failure(s)`)
  process.exit(1)
}

console.log(`verify-gm-monster-builder: ${samples} builds OK (${monsterTypes.length} monster types, ${npcTypes.length} npc types)`)
