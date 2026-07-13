import { importJs } from './lib/js-import.mjs'

globalThis.localStorage = {
  _data: new Map(),
  getItem(key) { return this._data.get(key) ?? null },
  setItem(key, value) { this._data.set(key, value) },
  removeItem(key) { this._data.delete(key) }
}

const { emptyHomebrewDraft, upsertHomebrewItem, loadHomebrewStore, registerHomebrewInCache } = await importJs('homebrew.js')
const { filterInventoryEntries, sortInventoryEntries } = await importJs('inventory-nav.js')
const { itemBlocksRemoveWhenLocked } = await importJs('items.js')
const { state } = await importJs('state.js')

loadHomebrewStore()
const sword = upsertHomebrewItem(emptyHomebrewDraft({ name: 'Test Sword', type: 'weapon', desc: 'A sword.' }))
const potion = upsertHomebrewItem(emptyHomebrewDraft({ name: 'Test Potion', type: 'consumable', desc: 'Heals.' }))
const shield = upsertHomebrewItem(emptyHomebrewDraft({ name: 'Test Shield', type: 'offhand', offhandType: 'shield', desc: 'Blocks.' }))
registerHomebrewInCache()

const character = {
  inventory: [
    { uid: 'a', itemId: sword.id, qty: 1, acquiredAt: '2026-01-02T00:00:00.000Z', starred: true },
    { uid: 'b', itemId: potion.id, qty: 2, acquiredAt: '2026-01-03T00:00:00.000Z', locked: true },
    { uid: 'c', itemId: shield.id, qty: 1, acquiredAt: '2026-01-01T00:00:00.000Z' }
  ]
}

state.inventorySort = 'newest'
state.inventoryFilter = 'all'
const newest = filterInventoryEntries(character)
if (newest[0]?.uid !== 'b') throw new Error('Newest first sort failed')

state.inventoryFilter = 'starred'
const starred = filterInventoryEntries(character)
if (starred.length !== 1 || starred[0].uid !== 'a') throw new Error('Starred filter failed')

state.inventoryFilter = 'locked'
const locked = filterInventoryEntries(character)
if (locked.length !== 1 || locked[0].uid !== 'b') throw new Error('Locked filter failed')

const sorted = sortInventoryEntries(character.inventory, 'name')
if (sorted[0].itemId !== potion.id) throw new Error('Name sort failed')

if (!itemBlocksRemoveWhenLocked({ locked: true })) {
  throw new Error('Locked entries should block removal')
}

console.log('verify-inventory-nav: ok')
