import { getGameData } from '../core/data.js'
import { state } from '../core/state.js'
import { normalizeCharacter } from './character.js'
import { computeThreatLevel } from './threat-level.js'
import { countCharactersWithBaseName } from './character-naming.js'
let cache = null
const threatCache = new Map()

export const PREMADE_SORT_OPTIONS = [
  ['name', 'Name A–Z'],
  ['name-desc', 'Name Z–A'],
  ['threat-desc', 'Threat Level (high → low)'],
  ['threat-asc', 'Threat Level (low → high)'],
  ['category', 'Category']
]

export const PREMADE_PAGE_SIZES = [6, 12, 18, 24, 30]

export function normalizePremadePageSize(size) {
  const n = Number(size) || 12
  return PREMADE_PAGE_SIZES.includes(n) ? n : 12
}

export function paginatePremadeList(list) {
  const pageSize = normalizePremadePageSize(state.gmPremadePageSize)
  state.gmPremadePageSize = pageSize
  const total = list.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(0, state.gmPremadePage), totalPages - 1)
  state.gmPremadePage = page
  const start = page * pageSize
  return {
    items: list.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages
  }
}

/** Old saved UI state may still have 'level-desc'/'level-asc' — treat as aliases so nobody's saved sort preference breaks. */
const SORT_ALIASES = { 'level-desc': 'threat-desc', 'level-asc': 'threat-asc' }

function normalizeSortKey(sort) {
  return SORT_ALIASES[sort] || sort
}

export function getPremadeCharactersData() {
  if (cache) return cache
  try {
    cache = getGameData()['premade-characters'] || []
  } catch {
    cache = []
  }
  return cache
}

function normalizedPremadeCharacter(entry) {
  return normalizeCharacter({
    ...entry,
    id: `preview_${entry.premadeId}`,
    premadeId: entry.premadeId
  })
}

export function premadeTemplateThreatLevel(entry) {
  if (!entry?.premadeId) return { threatLevel: 1, base: 0, abilityBonus: 0, flags: {}, soloBossCapable: false }
  if (threatCache.has(entry.premadeId)) return threatCache.get(entry.premadeId)
  const info = computeThreatLevel(normalizedPremadeCharacter(entry))
  threatCache.set(entry.premadeId, info)
  return info
}

export function sortPremadeCharacters(list, sort = 'name') {
  const normalizedSort = normalizeSortKey(sort)
  const rows = list.map(entry => ({ entry, threat: premadeTemplateThreatLevel(entry).threatLevel }))
  rows.sort((a, b) => {
    switch (normalizedSort) {
      case 'name-desc':
        return b.entry.name.localeCompare(a.entry.name)
      case 'threat-desc':
        return b.threat - a.threat || a.entry.name.localeCompare(b.entry.name)
      case 'threat-asc':
        return a.threat - b.threat || a.entry.name.localeCompare(b.entry.name)
      case 'category':
        return (a.entry.category || '').localeCompare(b.entry.category || '')
          || b.threat - a.threat
          || a.entry.name.localeCompare(b.entry.name)
      default:
        return a.entry.name.localeCompare(b.entry.name)
    }
  })
  return rows
}

export function listPremadeCharacters() {
  return [...getPremadeCharactersData()].sort((a, b) => a.name.localeCompare(b.name))
}

export function getPremadeCharacter(premadeId) {
  return getPremadeCharactersData().find(entry => entry.premadeId === premadeId) || null
}

export function premadeCategories() {
  const categories = new Set(listPremadeCharacters().map(entry => entry.category || 'npc'))
  return ['all', ...[...categories].sort()]
}

export function filterPremadeCharacters({ search = '', category = 'all', sort = 'name' } = {}) {
  const query = String(search || '').trim().toLowerCase()
  const filtered = listPremadeCharacters().filter(entry => {
    if (category !== 'all' && entry.category !== category) return false
    if (!query) return true
    const threat = premadeTemplateThreatLevel(entry).threatLevel
    const haystack = `${entry.name} ${entry.premadeId} ${entry.race} ${entry.category} ${entry.notes || ''} threat ${threat}`.toLowerCase()
    return haystack.includes(query)
  })
  return sortPremadeCharacters(filtered, sort)
}

export function countPremadeInRoster(premadeId) {
  const template = getPremadeCharacter(premadeId)
  if (!template) return 0
  return countCharactersWithBaseName(template.name, state.characters.map(c => c.name))
}

/** @deprecated Use countPremadeInRoster — premades can be added multiple times now. */
export function premadeInUse(premadeId) {
  return countPremadeInRoster(premadeId) > 0
}

export function premadeRosterIds() {
  return new Set(state.characters.map(character => character.premadeId).filter(Boolean))
}
