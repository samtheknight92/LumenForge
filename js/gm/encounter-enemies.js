import { uid } from '../core/utils.js'
import { state } from '../core/state.js'
import { getPremadeCharacter, premadeTemplateThreatLevel } from '../character/premade-characters.js'
import { computeThreatLevel } from '../character/threat-level.js'

/** Migrate legacy `{ premadeId, count }` rows to normalized multi-source shape. */
export function normalizeEncounterEnemyRow(row) {
  if (!row || typeof row !== 'object') return null
  const count = Math.max(1, Math.min(50, Math.round(Number(row.count) || 1)))
  const id = String(row.id || uid('enemy'))

  if (row.source === 'character' && row.characterId) {
    return {
      id,
      source: 'character',
      characterId: String(row.characterId),
      count
    }
  }

  if (row.source === 'manual') {
    return {
      id,
      source: 'manual',
      name: String(row.name || 'Enemy').trim() || 'Enemy',
      threatLevel: Math.max(1, Math.min(50, Math.round(Number(row.threatLevel) || 1))),
      count,
      soloBossCapable: Boolean(row.soloBossCapable)
    }
  }

  const premadeId = String(row.premadeId || '').trim()
  if (!premadeId) return null
  return {
    id,
    source: 'premade',
    premadeId,
    count
  }
}

export function normalizeEncounterEnemies(rows) {
  return (rows || [])
    .map(normalizeEncounterEnemyRow)
    .filter(Boolean)
}

export function resolveEncounterEnemyGroup(row) {
  const normalized = normalizeEncounterEnemyRow(row)
  if (!normalized) return null

  if (normalized.source === 'premade') {
    const template = getPremadeCharacter(normalized.premadeId)
    if (!template) return null
    const threatInfo = premadeTemplateThreatLevel(template)
    return {
      id: normalized.id,
      source: 'premade',
      premadeId: normalized.premadeId,
      name: template.name,
      count: normalized.count,
      threatLevel: threatInfo.threatLevel,
      base: threatInfo.base,
      abilityBonus: threatInfo.abilityBonus,
      soloBossCapable: threatInfo.soloBossCapable
    }
  }

  if (normalized.source === 'character') {
    const character = state.characters.find(c => c.id === normalized.characterId)
    if (!character) return null
    const threatInfo = computeThreatLevel(character)
    return {
      id: normalized.id,
      source: 'character',
      characterId: normalized.characterId,
      name: character.name,
      count: normalized.count,
      threatLevel: threatInfo.threatLevel,
      base: threatInfo.base,
      abilityBonus: threatInfo.abilityBonus,
      soloBossCapable: threatInfo.soloBossCapable
    }
  }

  return {
    id: normalized.id,
    source: 'manual',
    name: normalized.name,
    count: normalized.count,
    threatLevel: normalized.threatLevel,
    base: normalized.threatLevel,
    abilityBonus: 0,
    soloBossCapable: normalized.soloBossCapable
  }
}

export function resolveEncounterEnemyGroups(rows = state.encounterEnemies) {
  return (rows || []).map(resolveEncounterEnemyGroup).filter(Boolean)
}

export function addEncounterEnemyPremade(premadeId) {
  const template = getPremadeCharacter(premadeId)
  if (!template) return { ok: false, message: 'Unknown premade character.' }
  const existing = state.encounterEnemies.find(row =>
    row.source === 'premade' && row.premadeId === premadeId
  )
  if (existing) {
    existing.count = Math.min(50, existing.count + 1)
  } else {
    state.encounterEnemies.push(normalizeEncounterEnemyRow({ source: 'premade', premadeId, count: 1 }))
  }
  const row = state.encounterEnemies.find(r => r.source === 'premade' && r.premadeId === premadeId)
  state.encounterQuantityFocusId = row?.id || ''
  return { ok: true }
}

export function addEncounterEnemyFromCharacter(characterId) {
  const character = state.characters.find(c => c.id === characterId)
  if (!character) return { ok: false, message: 'Unknown character.' }
  const existing = state.encounterEnemies.find(row =>
    row.source === 'character' && row.characterId === characterId
  )
  if (existing) {
    existing.count = Math.min(50, existing.count + 1)
  } else {
    state.encounterEnemies.push(normalizeEncounterEnemyRow({ source: 'character', characterId, count: 1 }))
  }
  const row = state.encounterEnemies.find(r => r.source === 'character' && r.characterId === characterId)
  state.encounterQuantityFocusId = row?.id || ''
  return { ok: true }
}

export function addEncounterEnemyManual(name = 'Enemy', threatLevel = 10) {
  const row = normalizeEncounterEnemyRow({
    source: 'manual',
    name: String(name || 'Enemy').trim() || 'Enemy',
    threatLevel: Math.max(1, Math.min(50, Math.round(Number(threatLevel) || 10))),
    count: 1
  })
  state.encounterEnemies.push(row)
  state.encounterQuantityFocusId = row.id
  return { ok: true, row }
}

export function removeEncounterEnemyRow(rowId) {
  state.encounterEnemies = state.encounterEnemies.filter(row => row.id !== rowId)
  if (state.encounterQuantityFocusId === rowId) {
    state.encounterQuantityFocusId = state.encounterEnemies[0]?.id || ''
  }
}

export function setEncounterEnemyCount(rowId, count) {
  const entry = state.encounterEnemies.find(row => row.id === rowId)
  if (!entry) return
  entry.count = Math.max(1, Math.min(50, Math.round(Number(count) || 1)))
}

export function updateEncounterEnemyManual(rowId, field, value) {
  const entry = state.encounterEnemies.find(row => row.id === rowId)
  if (!entry || entry.source !== 'manual') return
  if (field === 'name') entry.name = String(value || '').trim() || entry.name
  else if (field === 'threatLevel') {
    entry.threatLevel = Math.max(1, Math.min(50, Math.round(Number(value) || entry.threatLevel)))
  }
}

export function focusEncounterEnemyQuantity(rowId) {
  state.encounterQuantityFocusId = rowId || ''
}

export function clearEncounterEnemies() {
  state.encounterEnemies = []
  state.encounterQuantityFocusId = ''
}

export function migrateEncounterQuantityFocusId() {
  const focus = String(state.encounterQuantityFocusId || '')
  if (!focus) return
  const byId = state.encounterEnemies.find(row => row.id === focus)
  if (byId) return
  const legacy = state.encounterEnemies.find(row => row.source === 'premade' && row.premadeId === focus)
  if (legacy) state.encounterQuantityFocusId = legacy.id
  else state.encounterQuantityFocusId = state.encounterEnemies[0]?.id || ''
}
