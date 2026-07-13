import { getItem } from '../core/cache.js'
import { itemPriceGil } from '../ui/format.js'
import { isGmMode } from '../gm/gm-mode.js'
import { state } from '../core/state.js'
import { isUnidentifiedCatalogItem } from './unidentified-items.js'

export const INVENTORY_SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'name', label: 'Alphabetical' },
  { id: 'value', label: 'Value' },
  { id: 'type', label: 'Type' }
]

export const INVENTORY_FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'armor', label: 'Armour' },
  { id: 'consumable', label: 'Consumables' },
  { id: 'material', label: 'Materials' },
  { id: 'quest', label: 'Quest items' },
  { id: 'unidentified', label: '??? Unknown' },
  { id: 'starred', label: '⭐ Starred' },
  { id: 'locked', label: '🔒 Locked' }
]

export function inventoryMatchesFilter(entry, item, filterId) {
  if (!entry || !item) return false
  const filter = filterId || 'all'
  if (filter === 'all') return true
  if (filter === 'starred') return Boolean(entry.starred)
  if (filter === 'locked') return Boolean(entry.locked)
  if (filter === 'quest') return Boolean(item.questItem)
  if (filter === 'unidentified') return isUnidentifiedCatalogItem(item)
  if (filter === 'cursed') return Boolean(item.isCursed)
  const type = String(item.type || '').toLowerCase()
  if (filter === 'weapon') return type.includes('weapon') || type === 'offhand'
  if (filter === 'armor') return type.includes('armor')
  if (filter === 'consumable') return type.includes('consumable') || type.includes('potion') || type.includes('food')
  if (filter === 'material') return type.includes('material') || type.includes('ingredient') || type.includes('herb')
  return true
}

export function inventoryMatchesTag(entry, item, tagFilter) {
  const tag = String(tagFilter || '').trim().toLowerCase()
  if (!tag) return true
  return (item.tags || []).some(row => String(row).toLowerCase() === tag)
}

export function sortInventoryEntries(entries, sortId = 'newest') {
  const rows = [...entries]
  const sort = sortId || 'newest'
  rows.sort((a, b) => {
    const itemA = getItem(a.itemId)
    const itemB = getItem(b.itemId)
    if (!itemA || !itemB) return 0
    if (sort === 'name') return String(itemA.name).localeCompare(String(itemB.name))
    if (sort === 'value') return itemPriceGil(itemB) - itemPriceGil(itemA)
    if (sort === 'type') return String(itemA.type || '').localeCompare(String(itemB.type || ''))
    const timeA = Date.parse(a.acquiredAt || '') || 0
    const timeB = Date.parse(b.acquiredAt || '') || 0
    return timeB - timeA
  })
  return rows
}

export function filterInventoryEntries(character, options = {}) {
  const {
    sort = state.inventorySort || 'newest',
    filter = state.inventoryFilter || 'all',
    tag = state.inventoryTagFilter || '',
    cursedOnly = state.inventoryCursedOnly
  } = options
  let rows = character.inventory || []
  if (filter !== 'all') {
    rows = rows.filter(entry => inventoryMatchesFilter(entry, getItem(entry.itemId), filter))
  }
  if (tag) {
    rows = rows.filter(entry => inventoryMatchesTag(entry, getItem(entry.itemId), tag))
  }
  if (cursedOnly && isGmMode()) {
    rows = rows.filter(entry => Boolean(getItem(entry.itemId)?.isCursed))
  }
  return sortInventoryEntries(rows, sort)
}

export function inventoryTagOptions(character) {
  const tags = new Set()
  for (const entry of character?.inventory || []) {
    const item = getItem(entry.itemId)
    for (const tag of item?.tags || []) tags.add(tag)
  }
  return [...tags].sort()
}

export function resetInventoryFilters() {
  state.inventorySort = 'newest'
  state.inventoryFilter = 'all'
  state.inventoryTagFilter = ''
  state.inventoryCursedOnly = false
}
