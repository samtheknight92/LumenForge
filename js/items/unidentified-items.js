/** True for catalog entries like ??? Sword — actual items, not inventory flags. */
export function isUnidentifiedCatalogItem(item) {
  return Boolean(item?.unidentifiedItem)
}

export function unidentifiedItemDescription(thingLabel) {
  const thing = String(thingLabel || 'item').toLowerCase()
  return `This ${thing} is unknown to you. The GM may have the knowledge for this item prepared in advance for you to be able to use it without prior knowledge. You must visit a town to get it identified to understand what it does.`
}

const GM_IDENTIFY_NOTE = 'When the party identifies this at a town, remove it and grant the real item you prepared. Until then, you may tell the player what it does if you have already decided.'

/** Official ??? item ids (see data/items-data.js unidentified_loot). */
export const UNIDENTIFIED_CATALOG_IDS = [
  'unknown_sword',
  'unknown_axe',
  'unknown_dagger',
  'unknown_staff',
  'unknown_bow',
  'unknown_hammer',
  'unknown_polearm',
  'unknown_ring',
  'unknown_amulet',
  'unknown_cloak',
  'unknown_armour',
  'unknown_shield',
  'unknown_vial',
  'unknown_scroll',
  'unknown_item'
]

export function isUnidentifiedCatalogId(itemId) {
  return UNIDENTIFIED_CATALOG_IDS.includes(String(itemId || ''))
}

export { GM_IDENTIFY_NOTE }
