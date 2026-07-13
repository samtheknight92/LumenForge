/** Strip GM-only item fields for player-facing exports. */
export function sanitizeHomebrewItemForPlayerExport(item) {
  if (!item || typeof item !== 'object') return item
  const copy = { ...item }
  delete copy.isCursed
  delete copy.hiddenGMDescription
  delete copy.hiddenGMAbility
  delete copy.hiddenGMNotes
  delete copy.curseStyle
  return copy
}

export function sanitizeHomebrewItemsForPlayerExport(items = []) {
  return items.map(sanitizeHomebrewItemForPlayerExport)
}
