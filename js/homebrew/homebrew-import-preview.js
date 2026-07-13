import { getItem, getSkill } from '../core/cache.js'
import { getRacesData } from '../core/data.js'
import { getHomebrewStore } from './homebrew.js'

const BUCKETS = [
  { key: 'items', kind: 'item', bucket: 'items', official: row => getItem(row?.id) && getItem(row.id).source !== 'homebrew' },
  { key: 'skills', kind: 'skill', bucket: 'skills', official: row => getSkill(row?.id) && getSkill(row.id).source !== 'homebrew' },
  { key: 'races', kind: 'race', bucket: 'races', official: row => Boolean(getRacesData()[row?.id]) },
  { key: 'backgrounds', kind: 'background', bucket: 'backgrounds', official: () => false },
  { key: 'recipes', kind: 'recipe', bucket: 'recipes', official: () => false },
  { key: 'monsterTypes', kind: 'monsterType', bucket: 'monsterTypes', official: () => false },
  { key: 'monsterRoles', kind: 'monsterRole', bucket: 'monsterRoles', official: () => false },
  { key: 'monsterSpecials', kind: 'monsterSpecial', bucket: 'monsterSpecials', official: () => false }
]

function incomingRows(parsed, key) {
  return Array.isArray(parsed?.[key]) ? parsed[key] : []
}

export function previewHomebrewImport(parsed, { localStore } = {}) {
  const store = localStore || getHomebrewStore()
  const incoming = {}
  const conflicts = []
  const newEntries = []

  for (const bucket of BUCKETS) {
    const rows = incomingRows(parsed, bucket.key)
    incoming[bucket.key] = rows.length
    for (const row of rows) {
      const id = String(row?.id || '').trim()
      if (!id) continue
      const local = store[bucket.bucket]?.[id]
      const official = bucket.official(row)
      if (official) {
        conflicts.push({ id, kind: bucket.kind, action: 'skip', reason: 'Official ID collision' })
        continue
      }
      if (local) {
        conflicts.push({ id, kind: bucket.kind, action: 'overwrite', name: row.name || local.name || id })
        continue
      }
      newEntries.push({ id, kind: bucket.kind, name: row.name || id })
    }
  }

  return {
    incoming,
    conflicts,
    newEntries,
    options: { merge: true, skipConflicts: false, replace: false }
  }
}
