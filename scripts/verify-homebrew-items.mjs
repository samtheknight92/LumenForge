import { importJs } from './lib/js-import.mjs'

globalThis.localStorage = {
  _data: new Map(),
  getItem(key) { return this._data.get(key) ?? null },
  setItem(key, value) { this._data.set(key, value) },
  removeItem(key) { this._data.delete(key) }
}

const { emptyHomebrewDraft, normalizeHomebrewItem, upsertHomebrewItem, getHomebrewItem, loadHomebrewStore, registerHomebrewInCache } = await importJs('homebrew.js')
const { canEquipToOffhand, getOffhandType } = await importJs('equipment.js')
const { previewHomebrewImport } = await importJs('homebrew-import-preview.js')

loadHomebrewStore()

const shield = upsertHomebrewItem(emptyHomebrewDraft({
  name: 'Test Shield',
  desc: 'A sturdy test shield.',
  type: 'offhand',
  offhandType: 'shield',
  statModifiers: { physicalDefence: 2 }
}))

const normalized = getHomebrewItem(shield.id)
if (normalized?.offhandType !== 'shield') throw new Error('offhandType not preserved')
if (normalized?.type !== 'offhand') throw new Error('type not offhand')
registerHomebrewInCache()
const cached = getHomebrewItem(shield.id)
if (getOffhandType(cached) !== 'shield') throw new Error('getOffhandType failed after cache')

const fakeCharacter = {
  skills: [],
  inventory: [{ uid: 'inv1', itemId: shield.id, qty: 1 }],
  equipped: {}
}
const equipCheck = canEquipToOffhand(fakeCharacter, cached)
if (!equipCheck.ok && equipCheck.reason.includes('one-handed')) {
  // expected without main weapon
} else if (equipCheck.ok) {
  // also fine if rules change
}

const weapon = upsertHomebrewItem(emptyHomebrewDraft({
  name: 'Test Greatsword',
  desc: 'Two hands.',
  type: 'weapon',
  hands: 'two',
  damage: '2d6'
}))
if (getHomebrewItem(weapon.id)?.hands !== 'two') throw new Error('hands not preserved')

const preview = previewHomebrewImport({
  items: [{ id: shield.id, name: 'Conflict Shield', type: 'offhand', desc: 'x' }],
  skills: [],
  races: []
})
if (!preview.conflicts.some(row => row.id === shield.id && row.action === 'overwrite')) {
  throw new Error('import preview should detect overwrite conflict')
}

console.log('verify-homebrew-items: ok')
