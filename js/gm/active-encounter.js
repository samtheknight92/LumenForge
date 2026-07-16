/**
 * Live GM Active Encounter — temporary combatant copies for the table.
 */
import { state } from '../core/state.js'
import { uid, deepClone, toast } from '../core/utils.js'
import { normalizeCharacter, stripCharacterCache, computeStats } from '../character/character.js'
import { getPremadeCharacter } from '../character/premade-characters.js'
import { resolveEncounterEnemyGroups } from './encounter-enemies.js'
import { createInitiativeEntry, sortInitiativeEntries, nextTurnEntryId } from './gm-initiative.js'
import { solveStatsForThreatLevel, buildSheetStats } from './gm-threat-solver.js'
import { computeThreatLevel } from '../character/threat-level.js'
import { DEFAULT_STATS } from '../core/constants.js'

export function emptyActiveEncounter() {
  return null
}

function cloneCombatantSheet(source, { name, encounterSource }) {
  const raw = stripCharacterCache(deepClone(source))
  delete raw._cache
  const sheet = normalizeCharacter({
    ...raw,
    id: uid('enc'),
    name,
    premadeId: undefined,
    folder: undefined,
    encounterSource
  })
  delete sheet.premadeId
  sheet.defeated = false
  return sheet
}

function buildManualThreatCombatant(name, threatLevel) {
  const shape = {
    hp: 2,
    stamina: 1.2,
    strength: 1,
    accuracy: 0.8,
    physicalDefence: 0.7,
    magicalDefence: 0.5,
    speed: 0.3
  }
  const base = {
    race: 'monster',
    skills: [],
    equipped: { weapon: null, offhand: null, armor: null, accessory: null },
    inventory: [],
    activeToggles: [],
    statusEffects: []
  }
  const solved = solveStatsForThreatLevel({
    characterBase: base,
    shape,
    targetThreat: threatLevel,
    computeThreatLevelFn: computeThreatLevel
  })
  const sheet = normalizeCharacter({
    id: uid('enc'),
    name,
    race: 'monster',
    stats: solved.stats || buildSheetStats(shape, 1),
    skills: [],
    inventory: [],
    equipped: { weapon: null, offhand: null, armor: null, accessory: null },
    activeToggles: [],
    statusEffects: [],
    lumens: 0,
    gil: 0,
    notes: `Generated temporary combatant near Threat Level ${threatLevel}.`,
    encounterSource: { type: 'manual', threatLevel, generated: true }
  })
  sheet.defeated = false
  const stats = computeStats(sheet)
  sheet.hp = stats.hp
  sheet.stamina = stats.stamina
  return sheet
}

/**
 * Expand balancer enemy groups into unique temporary combatants.
 */
export function expandEncounterCombatants(enemyRows = state.encounterEnemies) {
  const groups = resolveEncounterEnemyGroups(enemyRows)
  const combatants = []
  for (const group of groups) {
    for (let i = 1; i <= group.count; i += 1) {
      const label = group.count > 1 ? `${group.name} ${i}` : group.name
      if (group.source === 'premade') {
        const template = getPremadeCharacter(group.premadeId)
        if (!template) continue
        combatants.push(cloneCombatantSheet(template, {
          name: label,
          encounterSource: { type: 'premade', premadeId: group.premadeId }
        }))
      } else if (group.source === 'character') {
        const source = state.characters.find(c => c.id === group.characterId)
        if (!source) continue
        combatants.push(cloneCombatantSheet(source, {
          name: label,
          encounterSource: { type: 'character', characterId: group.characterId }
        }))
      } else {
        combatants.push(buildManualThreatCombatant(label, group.threatLevel || 1))
      }
    }
  }
  return combatants
}

export function startActiveEncounterFromBalancer() {
  const combatants = expandEncounterCombatants()
  if (!combatants.length) {
    toast('Add enemies to the Encounter Balancer first.')
    return null
  }
  const initiativeEntries = combatants.map(c => createInitiativeEntry(c.name, ''))
  initiativeEntries.forEach((entry, i) => {
    entry.combatantId = combatants[i].id
  })
  const encounter = {
    id: uid('encounter'),
    created: new Date().toISOString(),
    name: 'Active Encounter',
    round: 1,
    activeCombatantId: combatants[0]?.id || null,
    combatants,
    initiativeEntries,
    activeEntryId: initiativeEntries[0]?.id || null
  }
  state.activeEncounter = encounter
  // Mirror into classic initiative tracker for compatibility
  state.initiativeTracker = {
    entries: initiativeEntries.map(e => ({ id: e.id, name: e.name, initiative: e.initiative })),
    activeEntryId: encounter.activeEntryId
  }
  toast(`Encounter started — ${combatants.length} combatant${combatants.length === 1 ? '' : 's'}.`)
  return encounter
}

export function endActiveEncounter({ confirmEnd = true } = {}) {
  if (!state.activeEncounter) return null
  if (confirmEnd && typeof confirm === 'function' && !confirm('End encounter and discard temporary combatants?')) {
    return state.activeEncounter
  }
  const summary = summarizeActiveEncounter(state.activeEncounter)
  state.activeEncounter = null
  toast(summary.toast || 'Encounter ended.')
  return null
}

export function resetActiveEncounter() {
  if (!state.activeEncounter) return startActiveEncounterFromBalancer()
  return startActiveEncounterFromBalancer()
}

export function summarizeActiveEncounter(encounter) {
  if (!encounter) return { toast: 'No active encounter.', defeated: [], surviving: [], lumens: 0, gil: 0 }
  const defeated = encounter.combatants.filter(c => c.defeated || c.hp <= 0 || c.dead)
  const surviving = encounter.combatants.filter(c => !defeated.includes(c))
  let lumens = 0
  let gil = 0
  for (const c of defeated) {
    lumens += Number(c.lumens || 0)
    gil += Number(c.gil || 0)
  }
  return {
    defeated,
    surviving,
    lumens,
    gil,
    toast: `Encounter ended. Suggested loot from defeated: ${lumens}L / ${gil} Gil (award manually).`
  }
}

export function getEncounterCombatant(id) {
  return state.activeEncounter?.combatants?.find(c => c.id === id) || null
}

export function removeEncounterCombatant(id) {
  const enc = state.activeEncounter
  if (!enc) return
  enc.combatants = enc.combatants.filter(c => c.id !== id)
  enc.initiativeEntries = (enc.initiativeEntries || []).filter(e => e.combatantId !== id)
  if (enc.activeCombatantId === id) enc.activeCombatantId = enc.combatants[0]?.id || null
}

export function duplicateEncounterCombatant(id) {
  const enc = state.activeEncounter
  const source = getEncounterCombatant(id)
  if (!enc || !source) return null
  const copy = cloneCombatantSheet(source, {
    name: `${source.name} copy`,
    encounterSource: { ...(source.encounterSource || {}), duplicatedFrom: source.id }
  })
  enc.combatants.push(copy)
  const entry = createInitiativeEntry(copy.name, '')
  entry.combatantId = copy.id
  enc.initiativeEntries.push(entry)
  return copy
}

export function markEncounterCombatantDefeated(id, defeated = true) {
  const c = getEncounterCombatant(id)
  if (!c) return
  c.defeated = Boolean(defeated)
}

export function advanceEncounterRound() {
  const enc = state.activeEncounter
  if (!enc) return
  enc.round = Number(enc.round || 1) + 1
  const sorted = sortInitiativeEntries(enc.initiativeEntries || [])
  enc.activeEntryId = sorted[0]?.id || null
  enc.activeCombatantId = sorted[0]?.combatantId || enc.combatants[0]?.id || null
}

export function nextEncounterTurn() {
  const enc = state.activeEncounter
  if (!enc?.initiativeEntries?.length) return
  const nextId = nextTurnEntryId(enc.initiativeEntries, enc.activeEntryId)
  enc.activeEntryId = nextId
  const entry = enc.initiativeEntries.find(e => e.id === nextId)
  enc.activeCombatantId = entry?.combatantId || enc.activeCombatantId
  state.initiativeTracker.activeEntryId = nextId
}

export function prevEncounterTurn() {
  const enc = state.activeEncounter
  if (!enc?.initiativeEntries?.length) return
  const sorted = sortInitiativeEntries(enc.initiativeEntries)
  if (!sorted.length) return
  const idx = sorted.findIndex(e => e.id === enc.activeEntryId)
  const prev = sorted[(idx <= 0 ? sorted.length : idx) - 1]
  enc.activeEntryId = prev.id
  enc.activeCombatantId = prev.combatantId || null
  state.initiativeTracker.activeEntryId = prev.id
}

export function normalizeActiveEncounter(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: String(raw.id || uid('encounter')),
    created: raw.created || new Date().toISOString(),
    name: String(raw.name || 'Active Encounter'),
    round: Math.max(1, Number(raw.round) || 1),
    activeCombatantId: raw.activeCombatantId || null,
    combatants: (raw.combatants || []).map(c => {
      const sheet = normalizeCharacter(c)
      sheet.defeated = Boolean(c.defeated)
      sheet.encounterSource = c.encounterSource || null
      return sheet
    }),
    initiativeEntries: Array.isArray(raw.initiativeEntries) ? raw.initiativeEntries.map(e => ({
      id: e.id || uid('init'),
      name: e.name || 'Combatant',
      initiative: e.initiative === '' || e.initiative == null ? '' : Number(e.initiative),
      combatantId: e.combatantId || null
    })) : [],
    activeEntryId: raw.activeEntryId || null
  }
}

// Silence unused default import in some build paths
void DEFAULT_STATS
