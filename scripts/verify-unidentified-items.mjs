import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { importJs } from './lib/js-import.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jsonDir = join(root, 'data', 'json')

const {
  UNIDENTIFIED_CATALOG_IDS,
  isUnidentifiedCatalogItem,
  unidentifiedItemDescription
} = await importJs('unidentified-items.js')
const { resolveItemPresentation } = await importJs('item-presentation.js')
const { itemTooltip } = await importJs('tooltips-text.js')
const { setGmMode } = await importJs('gm-mode.js')

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

for (const id of UNIDENTIFIED_CATALOG_IDS) {
  const item = getItem(id)
  if (!item) throw new Error(`Missing unidentified catalogue item: ${id}`)
  if (!item.name.startsWith('???')) throw new Error(`${id} should have a ??? name`)
  if (!isUnidentifiedCatalogItem(item)) throw new Error(`${id} should set unidentifiedItem`)
  if (!item.desc.includes('visit a town')) throw new Error(`${id} should include town identification text`)
}

const sword = getItem('unknown_sword')
if (!sword.desc.includes('This sword is unknown to you')) {
  throw new Error('unknown_sword description should mention sword')
}

const ringDesc = unidentifiedItemDescription('Ring')
if (!ringDesc.includes('This ring is unknown to you')) {
  throw new Error('unidentifiedItemDescription helper mismatch')
}

setGmMode(false)
const playerView = resolveItemPresentation(sword)
if (playerView.displayName !== '??? Sword') throw new Error('Player should see ??? Sword')
const playerTip = itemTooltip(sword)
if (playerTip.includes('remove it and grant')) throw new Error('Player tooltip must not leak GM swap notes')

setGmMode(true)
const gmView = resolveItemPresentation(sword)
if (gmView.displayName !== '??? Sword') {
  throw new Error('??? items keep the same name for GM — swap at a town, do not reveal stats here')
}
if (!gmView.showGmPanel || !gmView.gmSections?.hiddenGMNotes) {
  throw new Error('GM should expose swap notes for unidentified catalogue items')
}
const gmTip = itemTooltip(sword)
if (!gmTip.includes('remove it and grant')) {
  throw new Error('GM tooltip should include swap notes for unidentified items')
}

console.log('verify-unidentified-items: ok')
