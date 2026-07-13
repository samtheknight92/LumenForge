#!/usr/bin/env node
/**
 * Ensure Add Effect covers every trackable status from skills and consumables.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  collectRequiredManualEffectIds,
  loadPlayerManualEffectIdsFromSource
} from './lib/player-manual-effects.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const effects = JSON.parse(fs.readFileSync(path.join(root, 'data', 'json', 'effects.json'), 'utf8'))

const required = collectRequiredManualEffectIds(effects)
const allowlist = new Set(loadPlayerManualEffectIdsFromSource())

const missing = [...required.keys()].filter(id => !allowlist.has(id)).sort()
const unknown = [...allowlist].filter(id => !effects[id]).sort()
const stale = [...allowlist].filter(id => effects[id] && !required.has(id) && !isGeneralTableStatus(id)).sort()

function isGeneralTableStatus(id) {
  const general = new Set([
    'critical_bleeding', 'charm', 'silenced', 'stagger', 'cursed',
    'enhanced', 'empowered', 'hp_regen', 'stamina_regen', 'haste', 'stone_skin', 'invisibility'
  ])
  return general.has(id)
}

console.log(`Required from skills/consumables: ${required.size}`)
console.log(`Add Effect allowlist: ${allowlist.size}`)

if (unknown.length) {
  console.error('\nAllowlist IDs missing from effects.json:')
  for (const id of unknown) console.error(`- ${id}`)
}

if (missing.length) {
  console.error('\nTrackable applied effects missing from Add Effect:')
  for (const id of missing) {
    const effect = effects[id]
    const sources = [...required.get(id)].slice(0, 2).join('; ')
    console.error(`- ${id} (${effect?.name || '?'}) ← ${sources}`)
  }
}

if (missing.length || unknown.length) process.exit(1)

console.log('Add Effect picker covers all skill and consumable statuses.')
if (stale.length) {
  console.log(`\nNote: ${stale.length} extra general table statuses in allowlist (OK): ${stale.join(', ')}`)
}
process.exit(0)
