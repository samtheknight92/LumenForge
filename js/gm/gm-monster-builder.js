import { getSkill } from '../core/cache.js'
import { normalizeCharacter } from '../character/character.js'
import { computeThreatLevel } from '../character/threat-level.js'
import { computeSkillLevel } from '../character/skill-level.js'
import { computeCombatPower } from '../character/combat-power.js'
import { isToggleSkill } from '../skills/skills.js'
import { expandSkillTargets } from '../skills/skill-expansion.js'
import { normalizeBuilderElementId, elementalAffinityTraitLabels, ELEMENTS } from '../combat/elemental-affinity.js'
import { solveStatsForThreatLevel } from './gm-threat-solver.js'
import {
  listHomebrewMonsterTypes,
  listHomebrewMonsterRoles,
  listHomebrewMonsterSpecials,
  getHomebrewMonsterType,
  getHomebrewMonsterRole,
  getHomebrewMonsterSpecial
} from '../homebrew/homebrew.js'
import {
  BUILDER_CATEGORIES,
  ALL_TYPE_TEMPLATES,
  MONSTER_TYPE_TEMPLATES,
  MONSTER_ROLE_TEMPLATES,
  MONSTER_THREAT_PRESETS,
  MONSTER_SPECIAL_TEMPLATES,
  getBuiltinTypeTemplate,
  getBuiltinRoleTemplate,
  getBuiltinThreatPreset,
  getBuiltinSpecialTemplate
} from './gm-monster-builder-data.js'

const LUMEN_PER_LEVEL = 3
const GIL_PER_LEVEL = 200
const HUMANOID_MONSTER_GIL = 20

export function defaultGmMonsterBuilderDraft(overrides = {}) {
  const defaultType = MONSTER_TYPE_TEMPLATES[0]?.id || ''
  const defaultRole = MONSTER_ROLE_TEMPLATES[0]?.id || ''
  return {
    name: '',
    category: 'monster',
    typeId: defaultType,
    roleId: defaultRole,
    threatPresetId: 'mediocre',
    specialIds: [],
    previewCharacter: null,
    customActions: [],
    customTraits: [],
    affinityAdded: emptyAffinityEdits(),
    affinityRemoved: emptyAffinityEdits(),
    ...overrides
  }
}

function emptyAffinityEdits() {
  return { resistances: [], weaknesses: [], immunities: [] }
}

function cloneAffinityEdits(edits) {
  const base = emptyAffinityEdits()
  if (!edits) return base
  return {
    resistances: [...(edits.resistances || [])],
    weaknesses: [...(edits.weaknesses || [])],
    immunities: [...(edits.immunities || [])]
  }
}

function baseBuilderElementalAffinity(draft) {
  const typeTemplate = resolveTypeTemplate(draft.typeId)
  const specialTemplates = (draft.specialIds || []).map(resolveSpecialTemplate).filter(Boolean)
  return {
    resistances: normalizeBuilderElementList(mergeStringLists(
      typeTemplate?.resistances,
      ...specialTemplates.map(row => row.resistances)
    )),
    weaknesses: normalizeBuilderElementList(mergeStringLists(
      typeTemplate?.weaknesses,
      ...specialTemplates.map(row => row.weaknesses)
    ))
  }
}

function applyElementAffinityEdits(baseElements, draft, kind) {
  const added = normalizeBuilderElementList(draft.affinityAdded?.[kind] || [])
  const removed = new Set(normalizeBuilderElementList(draft.affinityRemoved?.[kind] || []))
  return normalizeBuilderElementList([
    ...baseElements.filter(element => !removed.has(element)),
    ...added
  ])
}

function elementAffinityMeta(elementId) {
  const row = ELEMENTS.find(entry => entry.id === elementId)
  return row || { id: elementId, icon: '✦', label: elementId }
}

/** Effective elemental resist/weak for builder UI (template + custom edits). */
export function getBuilderAffinityView(draft) {
  const base = baseBuilderElementalAffinity(draft)
  const addedResist = normalizeBuilderElementList(draft.affinityAdded?.resistances || [])
  const addedWeak = normalizeBuilderElementList(draft.affinityAdded?.weaknesses || [])
  const removedResist = new Set(normalizeBuilderElementList(draft.affinityRemoved?.resistances || []))
  const removedWeak = new Set(normalizeBuilderElementList(draft.affinityRemoved?.weaknesses || []))

  const resistances = []
  for (const id of base.resistances) {
    if (removedResist.has(id)) continue
    resistances.push({ ...elementAffinityMeta(id), source: 'template' })
  }
  for (const id of addedResist) {
    if (resistances.some(row => row.id === id)) continue
    resistances.push({ ...elementAffinityMeta(id), source: 'custom' })
  }

  const weaknesses = []
  for (const id of base.weaknesses) {
    if (removedWeak.has(id)) continue
    weaknesses.push({ ...elementAffinityMeta(id), source: 'template' })
  }
  for (const id of addedWeak) {
    if (weaknesses.some(row => row.id === id)) continue
    weaknesses.push({ ...elementAffinityMeta(id), source: 'custom' })
  }

  return { resistances, weaknesses }
}

/** Template-only elemental affinities (type + specials, no custom edits). */
export function getTemplateBuilderAffinityView(draft) {
  return getBuilderAffinityView({
    ...draft,
    affinityAdded: emptyAffinityEdits(),
    affinityRemoved: emptyAffinityEdits()
  })
}

function normalizeTemplateOption(row, kind) {
  if (!row?.id) return null
  return { ...row, source: row.source || 'builtin', kind }
}

export function listBuilderTypeOptions(category = 'monster') {
  const builtin = ALL_TYPE_TEMPLATES
    .filter(row => (row.categories || ['monster']).includes(category))
    .map(row => normalizeTemplateOption(row, 'type'))
  const homebrew = listHomebrewMonsterTypes()
    .filter(row => !row.categories?.length || row.categories.includes(category))
    .map(row => normalizeTemplateOption({ ...row, source: 'homebrew' }, 'type'))
  return [...builtin, ...homebrew].sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export function listBuilderRoleOptions() {
  const builtin = MONSTER_ROLE_TEMPLATES.map(row => normalizeTemplateOption(row, 'role'))
  const homebrew = listHomebrewMonsterRoles().map(row => normalizeTemplateOption({ ...row, source: 'homebrew' }, 'role'))
  return [...builtin, ...homebrew].sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export function listBuilderThreatPresets() {
  return MONSTER_THREAT_PRESETS.map(row => ({ ...row }))
}

export function listBuilderSpecialOptions() {
  const builtin = MONSTER_SPECIAL_TEMPLATES.map(row => normalizeTemplateOption(row, 'special'))
  const homebrew = listHomebrewMonsterSpecials().map(row => normalizeTemplateOption({ ...row, source: 'homebrew' }, 'special'))
  return [...builtin, ...homebrew].sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

function resolveTypeTemplate(typeId) {
  if (!typeId) return null
  const homebrew = getHomebrewMonsterType(typeId)
  if (homebrew) return { ...homebrew, source: 'homebrew' }
  return getBuiltinTypeTemplate(typeId)
}

function resolveRoleTemplate(roleId) {
  if (!roleId) return null
  const homebrew = getHomebrewMonsterRole(roleId)
  if (homebrew) return { ...homebrew, source: 'homebrew' }
  return getBuiltinRoleTemplate(roleId)
}

function resolveSpecialTemplate(specialId) {
  if (!specialId) return null
  const homebrew = getHomebrewMonsterSpecial(specialId)
  if (homebrew) return { ...homebrew, source: 'homebrew' }
  return getBuiltinSpecialTemplate(specialId)
}

function mergeStatModifiers(...layers) {
  const out = {}
  for (const layer of layers) {
    for (const [stat, weight] of Object.entries(layer || {})) {
      if (!Number.isFinite(Number(weight))) continue
      out[stat] = (out[stat] || 0) + Number(weight)
    }
  }
  if (!out.hp || out.hp <= 0) out.hp = 0.2
  if (!out.stamina || out.stamina <= 0) out.stamina = 0.1
  return out
}

function mergeStringLists(...layers) {
  return [...new Set(layers.flat().map(row => String(row || '').trim()).filter(Boolean))]
}

function normalizeBuilderElementList(tags) {
  return [...new Set((tags || []).map(tag => normalizeBuilderElementId(tag)).filter(Boolean))]
}

function mergeThreatFlags(...layers) {
  const out = {}
  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer || {})) {
      if (value) out[key] = true
    }
  }
  return out
}

function trimSkillTargets(skillIds, cap) {
  const unique = [...new Set(skillIds)]
  if (!cap || unique.length <= cap) return unique
  return unique.slice(0, cap)
}

function targetSkillCount(threatLevel) {
  return Math.min(16, 2 + Math.floor(Number(threatLevel || 1) / 3))
}

function lumenDropForLevel(level) {
  return Math.max(0, Math.floor(Number(level || 0) * LUMEN_PER_LEVEL))
}

function gilDropForLevel(level) {
  return Math.max(0, Math.floor(Number(level || 0) * GIL_PER_LEVEL))
}

function formatTraitLine(label, values) {
  if (!values?.length) return ''
  return `${label}: ${values.join(', ')}.`
}

function buildNotesFromGmBuilder(gmBuilder, customActions, customTraits) {
  const parts = []
  if (gmBuilder.behaviourNotes) parts.push(gmBuilder.behaviourNotes)
  if (gmBuilder.actionNotes) parts.push(`Tactics: ${gmBuilder.actionNotes}`)
  const traitLine = [
    formatTraitLine('Resistances', gmBuilder.resistances),
    formatTraitLine('Weaknesses', gmBuilder.weaknesses),
    formatTraitLine('Immunities', gmBuilder.immunities)
  ].filter(Boolean).join(' ')
  if (traitLine) parts.push(traitLine)
  if (gmBuilder.lootNotes) parts.push(gmBuilder.lootNotes)
  for (const action of customActions || []) {
    if (action) parts.push(`Action: ${action}`)
  }
  for (const trait of customTraits || []) {
    if (trait) parts.push(`Trait: ${trait}`)
  }
  return parts.join(' ').trim()
}

function suggestBaseName(category, typeTemplate, roleTemplate) {
  const typeName = typeTemplate?.name || (category === 'npc' ? 'NPC' : 'Monster')
  const roleName = roleTemplate?.name
  if (roleName && roleName !== 'Minion') return `${roleName} ${typeName}`
  return typeName
}

export function suggestMonsterName(draft) {
  const typeTemplate = resolveTypeTemplate(draft.typeId)
  const roleTemplate = resolveRoleTemplate(draft.roleId)
  return suggestBaseName(draft.category, typeTemplate, roleTemplate)
}

export function mergeBuilderTemplates(draft) {
  const categoryMeta = BUILDER_CATEGORIES.find(row => row.id === draft.category) || BUILDER_CATEGORIES[0]
  const typeTemplate = resolveTypeTemplate(draft.typeId)
  const roleTemplate = resolveRoleTemplate(draft.roleId)
  const threatPreset = getBuiltinThreatPreset(draft.threatPresetId)
  const specialTemplates = (draft.specialIds || []).map(resolveSpecialTemplate).filter(Boolean)

  const targetThreatLevel = threatPreset.target
  const skillCap = Math.min(threatPreset.skillCap || 16, targetSkillCount(targetThreatLevel))

  const rawSkillIds = trimSkillTargets([
    ...(typeTemplate?.skillIds || []),
    ...(roleTemplate?.skillIds || []),
    ...specialTemplates.flatMap(row => row.skillIds || [])
  ], skillCap)

  const expandedSkills = expandSkillTargets(rawSkillIds)
  const activeToggles = expandedSkills.filter(id => {
    const skill = getSkill(id)
    return skill && isToggleSkill(skill)
  })

  const statShape = mergeStatModifiers(
    typeTemplate?.statModifiers,
    roleTemplate?.statModifiers,
    ...specialTemplates.map(row => row.statModifiers)
  )

  const rawResistances = mergeStringLists(
    typeTemplate?.resistances,
    ...specialTemplates.map(row => row.resistances)
  )
  const rawWeaknesses = mergeStringLists(
    typeTemplate?.weaknesses,
    ...specialTemplates.map(row => row.weaknesses)
  )
  const baseElement = baseBuilderElementalAffinity(draft)
  const nonElementResist = rawResistances.filter(tag => !normalizeBuilderElementId(tag))
  const nonElementWeak = rawWeaknesses.filter(tag => !normalizeBuilderElementId(tag))
  const resistances = mergeStringLists(
    nonElementResist,
    applyElementAffinityEdits(baseElement.resistances, draft, 'resistances')
  )
  const weaknesses = mergeStringLists(
    nonElementWeak,
    applyElementAffinityEdits(baseElement.weaknesses, draft, 'weaknesses')
  )
  const immunities = mergeStringLists(
    typeTemplate?.immunities,
    ...specialTemplates.map(row => row.immunities)
  )

  const threatFlags = mergeThreatFlags(
    typeTemplate?.threatFlags,
    roleTemplate?.threatFlags,
    ...specialTemplates.map(row => row.threatFlags)
  )

  const race = typeTemplate?.raceIdOverride || categoryMeta.defaultRace
  const behaviourNotes = [typeTemplate?.behaviourNotes, roleTemplate?.behaviourNotes].filter(Boolean).join(' ')
  const actionNotes = [typeTemplate?.actionNotes, roleTemplate?.actionNotes].filter(Boolean).join(' ')
  const lootNotes = typeTemplate?.lootNotes || ''

  const gmBuilder = {
    category: draft.category,
    typeId: draft.typeId,
    roleId: draft.roleId,
    threatPresetId: draft.threatPresetId,
    specialIds: [...(draft.specialIds || [])],
    targetThreatMin: threatPreset.min,
    targetThreatMax: threatPreset.max,
    targetThreatLevel,
    customActions: [...(draft.customActions || [])],
    customTraits: [...(draft.customTraits || [])],
    resistances,
    weaknesses,
    immunities,
    behaviourNotes,
    actionNotes,
    lootNotes,
    threatFlags: Object.keys(threatFlags).length ? threatFlags : undefined
  }

  return {
    category: draft.category,
    race,
    skills: expandedSkills,
    activeToggles,
    inventory: [],
    equipped: { weapon: null, offhand: null, armor: null, accessory: null },
    statusEffects: [],
    statShape,
    targetThreatLevel,
    gmBuilder,
    name: String(draft.name || '').trim() || suggestMonsterName(draft),
    isHumanoid: Boolean(typeTemplate?.isHumanoid)
  }
}

export function generateMonsterCharacter(draft) {
  const merged = mergeBuilderTemplates(draft)
  const characterBase = {
    race: merged.race,
    skills: merged.skills,
    activeToggles: merged.activeToggles,
    inventory: merged.inventory,
    equipped: merged.equipped,
    statusEffects: merged.statusEffects,
    category: merged.category,
    gmBuilder: merged.gmBuilder
  }

  const solved = solveStatsForThreatLevel({
    characterBase,
    shape: merged.statShape,
    targetThreat: merged.targetThreatLevel
  })

  const achievedThreat = solved.achievedThreatLevel
  const lumens = lumenDropForLevel(achievedThreat)
  const gil = merged.category === 'monster'
    ? (merged.isHumanoid ? HUMANOID_MONSTER_GIL : 0)
    : gilDropForLevel(achievedThreat)

  const notes = buildNotesFromGmBuilder(merged.gmBuilder, draft.customActions, draft.customTraits)
  const defeatLoot = []
  if (lumens > 0) defeatLoot.push(`${lumens} Lumens`)
  if (gil > 0) defeatLoot.push(`${gil} Gil`)
  const fullNotes = [
    notes,
    defeatLoot.length ? `Defeat loot: ${defeatLoot.join(', ')}.` : ''
  ].filter(Boolean).join(' ')

  return normalizeCharacter({
    name: merged.name,
    race: merged.race,
    category: merged.category,
    stats: solved.stats,
    skills: merged.skills,
    activeToggles: merged.activeToggles,
    inventory: merged.inventory,
    equipped: merged.equipped,
    statusEffects: merged.statusEffects,
    lumens,
    gil,
    notes: fullNotes,
    gmBuilder: {
      ...merged.gmBuilder,
      achievedThreatLevel: achievedThreat
    }
  })
}

export function buildMonsterPreviewSummary(character) {
  if (!character) return null
  const threatInfo = computeThreatLevel(character)
  const skillInfo = computeSkillLevel(character)
  const combatInfo = computeCombatPower(character)
  const skillNames = (character.skills || [])
    .map(id => getSkill(id)?.name || id)
    .filter(Boolean)

  const gmBuilder = character.gmBuilder || {}
  const affinityTraits = elementalAffinityTraitLabels(character)
  const traitBits = []
  if (affinityTraits.resists.length) traitBits.push(`Resist: ${affinityTraits.resists.join(', ')}`)
  if (affinityTraits.weaknesses.length) traitBits.push(`Weak: ${affinityTraits.weaknesses.join(', ')}`)
  if (affinityTraits.immunities.length) traitBits.push(`Immune: ${affinityTraits.immunities.join(', ')}`)
  for (const trait of gmBuilder.customTraits || []) traitBits.push(trait)

  return {
    name: character.name,
    threatLevel: threatInfo.threatLevel,
    targetThreatLevel: gmBuilder.targetThreatLevel,
    combatPower: combatInfo.combatPower,
    skillLevel: skillInfo.skillLevel,
    stats: { ...character.stats },
    skillNames,
    traits: traitBits,
    behaviour: [gmBuilder.behaviourNotes, gmBuilder.actionNotes].filter(Boolean).join(' '),
    customActions: [...(gmBuilder.customActions || [])]
  }
}

export function randomiseGmMonsterDraft(draft) {
  const category = draft.category || 'monster'
  const types = listBuilderTypeOptions(category)
  const roles = listBuilderRoleOptions()
  const specials = listBuilderSpecialOptions()
  const presets = listBuilderThreatPresets()

  const pick = list => list[Math.floor(Math.random() * list.length)]
  const type = pick(types)
  const role = pick(roles)
  const preset = pick(presets)
  const specialCount = Math.floor(Math.random() * 4)
  const shuffled = [...specials].sort(() => Math.random() - 0.5)
  const specialIds = shuffled.slice(0, specialCount).map(row => row.id)

  return {
    ...draft,
    category,
    typeId: type?.id || draft.typeId,
    roleId: role?.id || draft.roleId,
    threatPresetId: preset?.id || draft.threatPresetId,
    specialIds,
    name: ''
  }
}

export function toggleBuilderSpecial(draft, specialId) {
  const ids = new Set(draft.specialIds || [])
  if (ids.has(specialId)) ids.delete(specialId)
  else ids.add(specialId)
  return { ...draft, specialIds: [...ids] }
}
