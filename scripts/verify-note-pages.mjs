import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'
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

globalThis.localStorage = {
  _data: new Map(),
  getItem(key) { return this._data.get(key) ?? null },
  setItem(key, value) { this._data.set(key, value) },
  removeItem(key) { this._data.delete(key) }
}

const { loadGameData } = await importJs('data.js')
const { initCache } = await importJs('cache.js')
const { loadHomebrewStore } = await importJs('homebrew.js')
const { normalizeCharacter } = await importJs('character.js')

await loadGameData()
loadHomebrewStore()
initCache()
globalThis.fetch = originalFetch

const migrated = normalizeCharacter({
  name: 'Scout',
  race: 'human',
  notes: 'Remember the bridge password.',
  skills: []
})

if (!Array.isArray(migrated.notePages) || migrated.notePages.length !== 1) {
  throw new Error('Legacy notes should migrate to one page')
}
if (migrated.notePages[0].title !== 'General Notes') {
  throw new Error('Migrated page should be titled General Notes')
}
if (!migrated.notePages[0].body.includes('bridge password')) {
  throw new Error('Migrated body missing legacy notes')
}
if (migrated.notes !== undefined) throw new Error('Legacy notes field should be removed')

const fresh = normalizeCharacter({ name: 'New', race: 'human', skills: [] })
if (!fresh.notePages?.length || !fresh.notePages[0].id) {
  throw new Error('New characters should get a default notes page')
}

console.log('verify-note-pages: ok')
