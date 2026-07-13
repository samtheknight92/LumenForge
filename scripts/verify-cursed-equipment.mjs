import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { importJs } from './lib/js-import.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

globalThis.localStorage = {
  _data: new Map(),
  getItem(key) { return this._data.get(key) ?? null },
  setItem(key, value) { this._data.set(key, value) },
  removeItem(key) { this._data.delete(key) }
}

const { emptyHomebrewDraft, normalizeHomebrewItem } = await importJs('homebrew.js')
const { resolveItemPresentation, itemPlayerSearchText } = await importJs('item-presentation.js')
const { itemTooltip } = await importJs('tooltips-text.js')
const { sanitizeHomebrewItemForPlayerExport } = await importJs('export-sanitize.js')
const { setGmMode } = await importJs('gm-mode.js')

const HIDDEN = 'Ethereal Horrors whisper from the bowstring'
const bow = normalizeHomebrewItem(emptyHomebrewDraft({
  name: 'Bow of Instant Death',
  desc: 'A magnificent bow that radiates divine energy.',
  type: 'weapon',
  damage: '2d6',
  isCursed: true,
  curseStyle: 'trigger',
  hiddenGMDescription: HIDDEN,
  hiddenGMAbility: 'Each orb summons an Ethereal Horror on a failed save.',
  hiddenGMNotes: 'Track orbs manually at the table.',
  counterLabel: 'Glowing Orbs',
  counterMax: 20,
  counterDefault: 0
}))

if (!bow?.isCursed) throw new Error('Bow fixture should be cursed')
if (!bow.counterLabel) throw new Error('Bow fixture needs counter label')

const entry = { uid: 'test-entry', itemId: bow.id, qty: 1, counter: 0 }

setGmMode(false)
const playerView = resolveItemPresentation(bow, entry)
if (playerView.showCurseChrome) throw new Error('Player view must not show curse chrome')
if (playerView.showGmPanel) throw new Error('Player view must not show GM panel')
if (playerView.displayDesc.includes('Ethereal')) throw new Error('Player desc leaked hidden text')

const search = itemPlayerSearchText(bow)
if (search.includes('ethereal') || search.includes('horror')) {
  throw new Error('Player search haystack must not include hidden GM text')
}

setGmMode(true)
const gmView = resolveItemPresentation(bow, entry)
if (!gmView.showCurseChrome) throw new Error('GM view should show curse chrome')
if (!gmView.showGmPanel) throw new Error('GM view should expose hidden GM sections for tooltips')
if (!gmView.gmSections?.hiddenGMDescription?.includes('Ethereal')) {
  throw new Error('GM view missing hidden description')
}

const gmTip = itemTooltip(bow, null, entry)
if (!gmTip.includes('Ethereal Horrors')) throw new Error('GM tooltip should include hidden description')
if (!gmTip.includes('Hidden ability')) throw new Error('GM tooltip should include hidden ability')

setGmMode(false)
const playerTip = itemTooltip(bow, null, entry)
if (playerTip.includes('Ethereal')) throw new Error('Player tooltip must not leak hidden GM text')
setGmMode(true)

const exported = sanitizeHomebrewItemForPlayerExport(bow)
if (exported.isCursed || exported.hiddenGMDescription || exported.hiddenGMAbility || exported.hiddenGMNotes || exported.curseStyle) {
  throw new Error('Player export must strip curse and GM fields')
}
if (!exported.counterLabel) throw new Error('Player export should keep counter fields')

const jsonDir = join(root, 'data', 'json')
const originalFetch = globalThis.fetch
globalThis.fetch = async url => {
  const file = url.split('?')[0].split('/').pop()
  if (file === 'manifest.json') return { ok: true, json: async () => ({ version: 'verify' }) }
  const data = JSON.parse(readFileSync(join(jsonDir, file), 'utf8'))
  return { ok: true, json: async () => data }
}
const { loadGameData } = await importJs('data.js')
const { initCache, getItem } = await importJs('cache.js')
await loadGameData()
initCache()
globalThis.fetch = originalFetch

const CURSED_IDS = [
  'bow_of_instant_death',
  'blade_of_hungry_shadows',
  'staff_of_borrowed_light',
  'ring_of_false_comfort',
  'cursed_buckler',
  'armour_of_unravelling',
  'achilles_dagger',
  'bloodletter_axe',
  'dragonheart_armour',
  'helm_of_truth',
  'lantern_of_lost_souls',
  'mirrorblade',
  'lucky_amulet',
  'boots_of_safe_passage',
  'sword_of_echoes',
  'ring_of_friendship'
]

for (const id of CURSED_IDS) {
  const item = getItem(id)
  if (!item?.isCursed) throw new Error(`Missing or uncursed catalog item: ${id}`)
  if (!item.curseStyle) throw new Error(`${id} should have curseStyle`)
  if (!item.hiddenGMAbility) throw new Error(`${id} should have hiddenGMAbility`)
}

const officialBow = getItem('bow_of_instant_death')
if (!officialBow.hiddenGMDescription?.includes('Ethereal')) {
  throw new Error('Official bow missing hidden GM description in cache')
}
if ((officialBow.statModifiers?.strength || 0) < 2) {
  throw new Error('Bow should have tempting visible stats')
}

const achilles = getItem('achilles_dagger')
if ((achilles.statModifiers?.strength || 0) < 5) {
  throw new Error('Achilles dagger should have +5 Strength visible bait')
}

const bloodletter = getItem('bloodletter_axe')
if ((bloodletter.statModifiers?.strength || 0) < 10) {
  throw new Error('Bloodletter axe should have +10 Strength')
}

console.log('verify-cursed-equipment: ok')
