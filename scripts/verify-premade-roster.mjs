#!/usr/bin/env node
/**
 * Ad-hoc sanity check for the leveled premade roster (see
 * build-premade-characters.mjs): confirms 3-per-level coverage for every
 * Threat Level in range, unique premadeIds, and that the ACTUAL runtime
 * Threat Level (computed the same way the app does) lands close to what each
 * slot was generated for. Run: node scripts/verify-premade-roster.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadRuntimeFormulas } from './lib/threat-solver.mjs'

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..'
const premades = JSON.parse(fs.readFileSync(path.join(root, 'data', 'json', 'premade-characters.json'), 'utf8'))
const runtime = await loadRuntimeFormulas(root)

let errors = 0
const warn = msg => { console.log(`  ? ${msg}`) }
const fail = msg => { console.log(`  !! ${msg}`); errors += 1 }

// ── Unique IDs ──
const ids = new Set()
for (const p of premades) {
  if (ids.has(p.premadeId)) fail(`Duplicate premadeId: ${p.premadeId}`)
  ids.add(p.premadeId)
}
console.log(`Unique IDs: ${ids.size}/${premades.length}`)

// ── Per-level coverage (excluding the 4 hand-authored Level 5 starters) ──
const leveled = premades.filter(p => !String(p.premadeId || '').startsWith('level5_'))
const byCategoryLevel = new Map()
for (const p of leveled) {
  const info = runtime.computeThreatLevel({ ...p, _cache: undefined })
  p._actualThreat = info.threatLevel
  const targetMatch = String(p.premadeId || '').match(/_lv(\d+)_/)
  const target = targetMatch ? Number(targetMatch[1]) : info.threatLevel
  const key = `${p.category}:${target}`
  byCategoryLevel.set(key, (byCategoryLevel.get(key) || 0) + 1)
}

const RANGES = { npc: [1, 50], monster: [1, 50], pedestrian: [1, 15] }
for (const [category, [lo, hi]] of Object.entries(RANGES)) {
  let underCovered = 0
  for (let level = lo; level <= hi; level += 1) {
    const count = byCategoryLevel.get(`${category}:${level}`) || 0
    if (count < 3) underCovered += 1
  }
  console.log(`${category}: ${underCovered ? `${underCovered} level(s) below 3` : 'every level 1-' + hi + ' has 3+'}`)
  if (underCovered > Math.ceil((hi - lo + 1) * 0.15)) fail(`${category} has too many under-covered levels (${underCovered})`)
  else if (underCovered) warn(`${category} has ${underCovered} level(s) with fewer than 3 (expected near very low Threat, where starting gear sets a floor)`)
}

// ── Threat Level accuracy vs the level each slot targeted ──
const deviations = leveled.map(p => {
  const targetMatch = p.premadeId.match(/_lv(\d+)_/)
  const target = targetMatch ? Number(targetMatch[1]) : null
  return target == null ? 0 : Math.abs(p._actualThreat - target)
})
const maxDev = Math.max(...deviations)
const exact = deviations.filter(d => d === 0).length
console.log(`Threat accuracy: ${exact}/${leveled.length} exact, max deviation ${maxDev}`)
if (maxDev > 8) fail(`Max Threat Level deviation too high: ${maxDev}`)

// ── Variant spread (not all "pure") — a lopsided/glass build leaves at least
// one trained stat untouched at (or below) the default sheet baseline while
// its Threat Level is well above the floor, which a "pure" build wouldn't do.
const DEFAULT_STATS = { hp: 10, stamina: 10, strength: -3, magicPower: -3, accuracy: -3, speed: 2, physicalDefence: 8, magicalDefence: 8 }
const lopsidedish = leveled.filter(p => {
  if (p._actualThreat < 10) return false
  return Object.entries(p.stats).some(([stat, value]) => Number(value) <= (DEFAULT_STATS[stat] ?? 0))
}).length
console.log(`Threat 10+ characters with an untrained stat at/below baseline (lopsided/glass signal): ${lopsidedish}`)
if (lopsidedish < 10) warn('Fewer than 10 characters show a clear lopsided/glass dip — check variant rotation')

// ── Category totals ──
const totals = leveled.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc }, {})
console.log('Totals:', totals, '+ 4 Level 5 starters =', premades.length)

console.log(errors ? `\nFAILED — ${errors} error(s)` : '\nOK — no blocking issues')
process.exit(errors ? 1 : 0)
