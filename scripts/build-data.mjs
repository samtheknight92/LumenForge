import fs from 'fs'
import path from 'path'
import vm from 'vm'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { shopMinLevelForItem } from './lib/progression.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const dataDir = path.join(root, 'data')
const jsonDir = path.join(dataDir, 'json')

// Text that was UTF-8 but got saved as Windows-1252 turns emoji into
// sequences like "ðŸ§€". Windows-1252 maps bytes 0x80-0x9F to characters
// above U+00FF, so those need mapping back to their byte before decoding.
const CP1252_BYTES = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f]
])
const strictUtf8 = new TextDecoder('utf-8', { fatal: true })

function fixMojibake(text) {
  if (typeof text !== 'string') return text
  if (!/[ÃÂâð]/.test(text)) return text
  const bytes = []
  for (const ch of text) {
    const code = ch.codePointAt(0)
    if (code <= 0xff) bytes.push(code)
    else if (CP1252_BYTES.has(code)) bytes.push(CP1252_BYTES.get(code))
    else return text
  }
  try {
    return strictUtf8.decode(Uint8Array.from(bytes))
  } catch {
    return text
  }
}

function iconLooksCorrupt(text) {
  return typeof text === 'string' && /[ÃÂâð�]/.test(text)
}

const blankedIcons = []

function deepFix(value, key = '') {
  if (typeof value === 'string') {
    const fixed = fixMojibake(value)
    // A few source icon strings contain replacement characters, meaning the
    // original emoji cannot be recovered. Blank them so the app can use its
    // normal fallback icons instead of showing mojibake.
    if (key === 'icon' && iconLooksCorrupt(fixed)) {
      blankedIcons.push(value)
      return ''
    }
    return fixed
  }
  if (Array.isArray(value)) return value.map(item => deepFix(item, key))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = deepFix(v, k)
    return out
  }
  return value
}

function writeJson(name, data) {
  fs.writeFileSync(path.join(jsonDir, `${name}.json`), JSON.stringify(deepFix(data), null, 2), 'utf8')
}

function extractEffects() {
  const effectsJson = path.join(jsonDir, 'effects.json')
  if (!fs.existsSync(effectsJson)) {
    throw new Error('Missing data/json/effects.json — run scripts/generate-career-effects.mjs or restore effects.json')
  }
  writeJson('effects', JSON.parse(fs.readFileSync(effectsJson, 'utf8')))
}

fs.mkdirSync(jsonDir, { recursive: true })

execSync('node scripts/generate-career-effects.mjs', { cwd: root, stdio: 'inherit' })
execSync('node scripts/generate-careers.mjs', { cwd: root, stdio: 'inherit' })
execSync('node scripts/attach-activation-effects.mjs', { cwd: root, stdio: 'inherit' })
execSync('node scripts/adjust-skill-costs.mjs', { cwd: root, stdio: 'inherit' })

const loadOrder = [
  'races-data.js',
  'skills-data.js',
  'careers-skills-data.js',
  'career-fusions-skills-data.js',
  'profession-items-data.js',
  'discoverable-items-data.js',
  'monster-loot-data.js',
  'items-data.js'
]

const window = {}
for (const file of loadOrder) {
  const filePath = path.join(dataDir, file)
  if (!fs.existsSync(filePath)) {
    if (file === 'career-fusions-skills-data.js') continue
    throw new Error(`Missing data file: ${file}`)
  }
  const code = fs.readFileSync(filePath, 'utf8')
  const sandbox = { console, window, globalThis: { window } }
  vm.createContext(sandbox)
  vm.runInContext(code, sandbox)
}

extractEffects()

writeJson('races', window.RACES_DATA || {})

const skills = { ...(window.SKILLS_DATA || {}) }
if (window.CAREERS_SKILLS_DATA) skills.careers = window.CAREERS_SKILLS_DATA
if (window.CAREER_FUSIONS_DATA) {
  skills.fusion = { ...(skills.fusion || {}), ...window.CAREER_FUSIONS_DATA }
}
const racial = window.RACE_SKILL_TREES || {}
skills.racial = { ...racial }
if (skills.monster) {
  skills.racial.monster = skills.monster
  delete skills.monster
}
writeJson('skills', skills)

const itemsData = window.ITEMS_DATA || {}
for (const category of Object.values(itemsData)) {
  if (!category || typeof category !== 'object') continue
  for (const item of Object.values(category)) {
    if (!item?.price) continue
    item.shopMinLevel = shopMinLevelForItem(item)
  }
}
writeJson('items', itemsData)
writeJson('profession-items', window.PROFESSION_ITEMS_DATA || {})
writeJson('discoverable-items', window.DISCOVERABLE_ITEMS_DATA || {})
writeJson('monster-loot', window.MONSTER_LOOT_DATA || {})

function mergeMetaMaps(...maps) {
  const out = {}
  for (const map of maps) {
    for (const [key, value] of Object.entries(map || {})) {
      if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
        out[key] = { ...out[key], ...value }
      } else {
        out[key] = value
      }
    }
  }
  return out
}

function loadMetaExports(file, names) {
  const raw = fs.readFileSync(path.join(dataDir, file), 'utf8').replace(/^\uFEFF/, '')
  const code = raw.replace(/^export const /gm, 'const ')
  const sandbox = {}
  vm.createContext(sandbox)
  const assigns = names.map(name => `globalThis.__meta_${name} = ${name}`).join('\n')
  vm.runInContext(`${code}\n${assigns}`, sandbox)
  return names.reduce((acc, name) => {
    acc[name] = sandbox[`__meta_${name}`]
    return acc
  }, {})
}

const metaResult = loadMetaExports('skill-meta.js', [
  'TOGGLE_BONUSES',
  'PASSIVE_SKILL_BONUSES',
  'PASSIVE_SKILL_EFFECTS',
  'EQUIPMENT_SKILL_EFFECTS',
  'TOGGLE_SKILL_EFFECTS',
  'INCOMPATIBILITIES',
  'CONDITIONAL_SKILL_STATS'
])
const careerMeta = loadMetaExports('career-skill-meta.js', [
  'CAREER_PASSIVE_BONUSES',
  'CAREER_EQUIPMENT_EFFECTS',
  'CAREER_ARMOUR_EFFECTS',
  'CAREER_PASSIVE_EFFECTS',
  'CAREER_CONDITIONAL_STATS',
  'CAREER_DAMAGE_BONUSES',
  'CAREER_HEAL_BONUSES',
  'CAREER_ACTION_BUFFS',
  'CAREER_STAMINA_DISCOUNTS'
])

writeJson('skill-meta', {
  TOGGLE_BONUSES: metaResult.TOGGLE_BONUSES || {},
  PASSIVE_SKILL_BONUSES: mergeMetaMaps(metaResult.PASSIVE_SKILL_BONUSES, careerMeta.CAREER_PASSIVE_BONUSES),
  PASSIVE_SKILL_EFFECTS: mergeMetaMaps(metaResult.PASSIVE_SKILL_EFFECTS, careerMeta.CAREER_PASSIVE_EFFECTS),
  EQUIPMENT_SKILL_EFFECTS: mergeMetaMaps(metaResult.EQUIPMENT_SKILL_EFFECTS, careerMeta.CAREER_EQUIPMENT_EFFECTS),
  TOGGLE_SKILL_EFFECTS: metaResult.TOGGLE_SKILL_EFFECTS || {},
  INCOMPATIBILITIES: metaResult.INCOMPATIBILITIES || {},
  ARMOUR_SKILL_EFFECTS: careerMeta.CAREER_ARMOUR_EFFECTS || {},
  CONDITIONAL_SKILL_STATS: mergeMetaMaps(metaResult.CONDITIONAL_SKILL_STATS, careerMeta.CAREER_CONDITIONAL_STATS),
  CAREER_DAMAGE_BONUSES: careerMeta.CAREER_DAMAGE_BONUSES || {},
  CAREER_HEAL_BONUSES: careerMeta.CAREER_HEAL_BONUSES || {},
  CAREER_ACTION_BUFFS: careerMeta.CAREER_ACTION_BUFFS || {},
  CAREER_STAMINA_DISCOUNTS: careerMeta.CAREER_STAMINA_DISCOUNTS || {}
})

console.log('Built JSON data')
if (blankedIcons.length) {
  console.warn(`Blanked ${blankedIcons.length} unrecoverable icon(s); fix them in data/*.js:`)
  for (const icon of blankedIcons) console.warn(`  ${JSON.stringify(icon)}`)
}
writeJson('manifest', { version: Date.now() })
execSync('node scripts/build-premade-characters.mjs', { cwd: root, stdio: 'inherit' })
