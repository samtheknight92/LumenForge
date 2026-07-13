import {
  HOMEBREW_STORAGE_KEY,
  HOMEBREW_STORE_VERSION,
  HOMEBREW_ID_PREFIX,
  SHOP_MIN_LEVEL_BY_RARITY,
  TIER_LUMEN_COST,
  HOMEBREW_SKILL_DAMAGE_MODES,
  HOMEBREW_ELEMENT_TYPES,
  HOMEBREW_SKILL_CATEGORIES,
  HOMEBREW_DAMAGE_STAT_KEYS,
  OFFICIAL_WEAPON_KINDS,
  ANY_WEAPON_KIND,
  HOMEBREW_OFFHAND_TYPES,
  HOMEBREW_BALANCE_TAGS,
  HOMEBREW_SKILL_APPLY_TO,
  HOMEBREW_SKILL_EFFECT_KINDS,
  HOMEBREW_SKILL_USE_LIMITS
} from '../core/constants.js'
import { isValidDamageDice } from './homebrew-combat.js'
import { debounce, titleCase } from '../core/utils.js'
import { cache, getItem, getItemSearchText, getSkill, flattenSkills, rarityRank, registerHomebrewRacesInCache } from '../core/cache.js'
import { normalizeBuilderElementId, ELEMENTS } from '../combat/elemental-affinity.js'
import { normalizeCounterRuleOperator } from '../items/items.js'
import { getRacesData, getSkillsData } from '../core/data.js'
import { getEffect } from '../character/character.js'
import { state } from '../core/state.js'

/** @type {{ version: number, items: Record<string, object>, skills: Record<string, object>, races: Record<string, object>, backgrounds: Record<string, object>, recipes: Record<string, object>, monsterTypes: Record<string, object>, monsterRoles: Record<string, object>, monsterSpecials: Record<string, object> }} */
let store = {
  version: HOMEBREW_STORE_VERSION,
  items: {},
  skills: {},
  races: {},
  backgrounds: {},
  recipes: {},
  monsterTypes: {},
  monsterRoles: {},
  monsterSpecials: {}
}

const saveDebounced = debounce(() => {
  try {
    localStorage.setItem(HOMEBREW_STORAGE_KEY, JSON.stringify({
      ...store,
      updated: new Date().toISOString()
    }))
  } catch (error) {
    console.error('Homebrew save failed', error)
  }
}, 200)

export function loadHomebrewStore() {
  try {
    const raw = localStorage.getItem(HOMEBREW_STORAGE_KEY)
    if (!raw) return store
    const parsed = JSON.parse(raw)
    store = {
      version: parsed.version || HOMEBREW_STORE_VERSION,
      items: parsed.items && typeof parsed.items === 'object' ? parsed.items : {},
      skills: parsed.skills && typeof parsed.skills === 'object' ? parsed.skills : {},
      races: parsed.races && typeof parsed.races === 'object' ? parsed.races : {},
      backgrounds: parsed.backgrounds && typeof parsed.backgrounds === 'object' ? parsed.backgrounds : {},
      recipes: parsed.recipes && typeof parsed.recipes === 'object' ? parsed.recipes : {},
      monsterTypes: parsed.monsterTypes && typeof parsed.monsterTypes === 'object' ? parsed.monsterTypes : {},
      monsterRoles: parsed.monsterRoles && typeof parsed.monsterRoles === 'object' ? parsed.monsterRoles : {},
      monsterSpecials: parsed.monsterSpecials && typeof parsed.monsterSpecials === 'object' ? parsed.monsterSpecials : {}
    }
  } catch (error) {
    console.error('Homebrew load failed', error)
    store = {
      version: HOMEBREW_STORE_VERSION,
      items: {},
      skills: {},
      races: {},
      backgrounds: {},
      recipes: {},
      monsterTypes: {},
      monsterRoles: {},
      monsterSpecials: {}
    }
  }
  const skills = {}
  for (const row of Object.values(store.skills || {})) {
    const normalized = normalizeHomebrewSkill(row)
    if (normalized) skills[normalized.id] = normalized
  }
  store.skills = skills
  return store
}

export function saveHomebrewNow() {
  saveDebounced.cancel?.()
  try {
    localStorage.setItem(HOMEBREW_STORAGE_KEY, JSON.stringify({
      ...store,
      updated: new Date().toISOString()
    }))
  } catch (error) {
    console.error('Homebrew save failed', error)
  }
}

export function getHomebrewStore() {
  return store
}

export function listHomebrewItems(opts = {}) {
  return allStoredHomebrewItems()
    .filter(entry => passesHomebrewListFilters(entry, opts))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export function getHomebrewItem(itemId) {
  const row = store.items[itemId]
  return row ? normalizeHomebrewItem(row) : null
}

export function ensureCustomId(preferred, name = 'item') {
  return ensureCustomEntryId(preferred, name, 'item')
}

export function ensureCustomSkillId(preferred, name = 'skill') {
  return ensureCustomEntryId(preferred, name, 'skill')
}

export function ensureCustomRaceId(preferred, name = 'race') {
  return ensureCustomEntryId(preferred, name, 'race')
}

function customIdInUse(id, kind) {
  if (kind === 'item') {
    if (store.items[id]) return true
    const cached = getItem(id)
    return Boolean(cached && cached.source !== 'homebrew')
  }
  if (kind === 'race') {
    if (store.races[id]) return true
    return Boolean(getRacesData()[id])
  }
  if (store.skills[id]) return true
  const cached = getSkill(id)
  if (cached && cached.source !== 'homebrew') return true
  if (store.items[id]) return true
  if (store.races[id]) return true
  return false
}

function ensureCustomEntryId(preferred, name, kind) {
  const pref = String(preferred || '').trim()
  const slug = String(name || kind).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)
  let stem = pref.startsWith(HOMEBREW_ID_PREFIX) ? pref : `${HOMEBREW_ID_PREFIX}${slug || kind}`
  let candidate = stem
  let n = 2
  while (true) {
    const storeHit = kind === 'item'
      ? store.items[candidate]
      : kind === 'race'
        ? store.races[candidate]
        : store.skills[candidate]
    if (!customIdInUse(candidate, kind)) return candidate
    if (storeHit && candidate === pref) return candidate
    candidate = `${stem}_${n++}`
  }
}

const STAT_KEYS = ['strength', 'magicPower', 'accuracy', 'speed', 'hp', 'stamina', 'physicalDefence', 'magicalDefence']

function normalizeArchived(raw) {
  return Boolean(raw?.archived)
}

function normalizeApprovalStatus(raw, existingRow) {
  const value = String(raw?.approvalStatus || '').toLowerCase()
  if (value === 'draft' || value === 'approved' || value === 'hidden') return value
  if (existingRow?.approvalStatus) return existingRow.approvalStatus
  return 'approved'
}

function normalizeBalanceTags(raw) {
  if (!Array.isArray(raw?.balanceTags)) return undefined
  const tags = [...new Set(raw.balanceTags.map(tag => String(tag || '').trim()).filter(tag => HOMEBREW_BALANCE_TAGS.includes(tag)))]
  return tags.length ? tags : undefined
}

function normalizeHands(raw) {
  const value = String(raw || '').toLowerCase()
  if (value === 'two' || value === 'two_handed' || value === '2') return 'two'
  if (value === 'one' || value === 'one_handed' || value === '1') return 'one'
  return undefined
}

function normalizeOffhandType(raw) {
  const value = String(raw || '').toLowerCase()
  return HOMEBREW_OFFHAND_TYPES.includes(value) ? value : undefined
}

function normalizeApplyTo(raw) {
  const value = String(raw || '').trim()
  return HOMEBREW_SKILL_APPLY_TO.some(row => row.id === value) ? value : undefined
}

function normalizeEffectKind(raw) {
  const value = String(raw || '').trim().toLowerCase()
  return HOMEBREW_SKILL_EFFECT_KINDS.includes(value) ? value : undefined
}

function normalizeUseLimit(raw) {
  const value = String(raw || '').trim()
  return HOMEBREW_SKILL_USE_LIMITS.some(row => row.id === value && value) ? value : undefined
}

export function homebrewBalanceWarning(entry) {
  const tags = entry?.balanceTags || []
  if (!tags.length) return ''
  const tier = Number(entry?.tier || 1)
  if (tier <= 2 && tags.includes('damage') && tags.includes('control')) {
    return 'May be stronger than tier suggests — GM review recommended.'
  }
  if (tags.includes('bossTool')) return 'Boss-tool tag — use sparingly at the table.'
  if (tags.includes('highRisk') && tags.includes('actionEconomy')) {
    return 'High risk + action economy — double-check at your table.'
  }
  return 'Balance tags set — GM review recommended.'
}

function passesHomebrewListFilters(entry, opts = {}) {
  const showArchived = opts.showArchived ?? state.homebrewShowArchived
  const showDrafts = opts.showDrafts ?? state.homebrewShowDrafts
  const playerFacing = Boolean(opts.playerFacing)
  if (entry.archived && !showArchived) return false
  const status = entry.approvalStatus || 'approved'
  if (status === 'hidden' && !showArchived) return false
  if (playerFacing) {
    if (status !== 'approved' || entry.archived) return false
  } else if (!showDrafts && status === 'draft') {
    return false
  }
  return true
}

function allStoredHomebrewItems() {
  return Object.values(store.items).map(row => normalizeHomebrewItem(row)).filter(Boolean)
}

function allStoredHomebrewSkills() {
  return Object.values(store.skills).map(row => normalizeHomebrewSkill(row)).filter(Boolean)
}

function allStoredHomebrewRaces() {
  return Object.values(store.races).map(row => normalizeHomebrewRace(row)).filter(Boolean)
}

function allStoredHomebrewBackgrounds() {
  return Object.values(store.backgrounds || {}).map(row => normalizeHomebrewBackground(row)).filter(Boolean)
}

function allStoredHomebrewRecipes() {
  return Object.values(store.recipes || {}).map(row => normalizeHomebrewRecipe(row)).filter(Boolean)
}

export function emptyHomebrewDraft(overrides = {}) {
  return {
    id: '',
    name: '',
    desc: '',
    type: 'weapon',
    icon: '✦',
    rarity: 'common',
    damage: '',
    weaponKind: '',
    offhandType: 'shield',
    hands: 'one',
    stackable: false,
    maxStack: '',
    questItem: false,
    sellable: true,
    listInShop: false,
    shopPriceGil: 0,
    statModifiers: {},
    specialEffects: [],
    counterLabel: '',
    counterDefault: 0,
    counterMax: null,
    blockUnequipWithCounter: false,
    blockRemoveWithCounter: false,
    counterEquippedOnly: false,
    counterRuleOperator: 'above',
    counterRuleValue: 0,
    archived: false,
    approvalStatus: 'draft',
    balanceTags: [],
    isCursed: false,
    curseStyle: '',
    hiddenGMDescription: '',
    hiddenGMAbility: '',
    hiddenGMNotes: '',
    tagsText: '',
    tags: [],
    ...overrides
  }
}

function isCursedEquipmentType(type) {
  const t = String(type || '').toLowerCase()
  return t === 'weapon' || t === 'armor' || t === 'accessory' || t === 'offhand'
}

function normalizeItemTags(raw) {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map(row => String(row || '').trim().toLowerCase()).filter(Boolean))].slice(0, 16)
  }
  return String(raw || '')
    .split(/[\n,]+/)
    .map(row => row.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 16)
}

export function normalizeSpecialEffectIds(raw) {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map(id => String(id || '').trim()).filter(Boolean))]
}

export function normalizeHomebrewItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = String(raw.name || '').trim().slice(0, 80)
  if (!name) return null
  const id = raw.id && store.items[raw.id] ? raw.id : ensureCustomId(raw.id, name)
  const type = String(raw.type || 'accessory').toLowerCase()
  const rarity = String(raw.rarity || 'common').toLowerCase()
  const listInShop = Boolean(raw.listInShop)
  const shopPriceGil = Math.max(0, Math.floor(Number(raw.shopPriceGil ?? raw.shopPrice ?? 0)))
  const statModifiers = {}
  for (const key of STAT_KEYS) {
    const value = Number(raw.statModifiers?.[key] ?? raw[key])
    if (Number.isFinite(value) && value !== 0) statModifiers[key] = value
  }
  const damage = (type.includes('weapon') || type === 'offhand') ? String(raw.damage || '').trim().slice(0, 24) : ''
  const weaponKind = type.includes('weapon')
    ? normalizeHomebrewWeaponKind(raw.weaponKind)
    : undefined
  const offhandType = type === 'offhand' ? (normalizeOffhandType(raw.offhandType) || 'shield') : undefined
  const hands = type.includes('weapon') ? normalizeHands(raw.hands) : undefined
  const stackable = raw.stackable === true ? true : raw.stackable === false ? false : undefined
  const maxStackRaw = Number(raw.maxStack)
  const maxStack = stackable && Number.isFinite(maxStackRaw) && maxStackRaw > 1
    ? Math.floor(maxStackRaw)
    : undefined
  const questItem = Boolean(raw.questItem)
  const sellable = raw.sellable === false ? false : true
  const existing = store.items[raw.id]
  const archived = normalizeArchived(raw)
  const approvalStatus = normalizeApprovalStatus(raw, existing)
  const balanceTags = normalizeBalanceTags(raw)
  const priceGil = listInShop ? shopPriceGil : 0
  const specialEffects = normalizeSpecialEffectIds(raw.specialEffects)
  const counterLabel = String(raw.counterLabel || '').trim().slice(0, 24)
  const counterDefault = counterLabel
    ? Math.max(0, Math.floor(Number(raw.counterDefault ?? 0)))
    : undefined
  const blockUnequipWithCounter = counterLabel ? Boolean(raw.blockUnequipWithCounter) : undefined
  const blockRemoveWithCounter = counterLabel ? Boolean(raw.blockRemoveWithCounter) : undefined
  const counterEquippedOnly = counterLabel ? Boolean(raw.counterEquippedOnly) : undefined
  const counterMaxRaw = counterLabel ? Number(raw.counterMax) : NaN
  const counterMax = counterLabel && Number.isFinite(counterMaxRaw) && counterMaxRaw > 0
    ? Math.floor(counterMaxRaw)
    : undefined
  const counterRuleOperator = counterLabel ? normalizeCounterRuleOperator(raw.counterRuleOperator) : undefined
  const counterRuleValue = counterLabel
    ? Math.max(0, Math.floor(Number(raw.counterRuleValue ?? 0)))
    : undefined
  const isCursed = Boolean(raw.isCursed) && isCursedEquipmentType(type)
  const curseStyle = isCursed ? String(raw.curseStyle || '').trim().toLowerCase() : ''
  const validCurseStyle = ['combat', 'narrative', 'trigger'].includes(curseStyle) ? curseStyle : undefined
  const tags = normalizeItemTags(raw.tags ?? raw.tagsText)
  return {
    id,
    name,
    desc: String(raw.desc || '').trim().slice(0, 2000),
    type,
    icon: String(raw.icon || '✦').trim().slice(0, 8) || '✦',
    rarity,
    damage: damage || undefined,
    weaponKind,
    offhandType,
    hands,
    stackable,
    maxStack,
    questItem: questItem || undefined,
    sellable: sellable === false ? false : undefined,
    archived: archived || undefined,
    approvalStatus,
    balanceTags,
    isCursed: isCursed || undefined,
    curseStyle: validCurseStyle,
    hiddenGMDescription: isCursed ? (String(raw.hiddenGMDescription || '').trim().slice(0, 2000) || undefined) : undefined,
    hiddenGMAbility: isCursed ? (String(raw.hiddenGMAbility || '').trim().slice(0, 2000) || undefined) : undefined,
    hiddenGMNotes: String(raw.hiddenGMNotes || '').trim().slice(0, 2000) || undefined,
    tags: tags.length ? tags : undefined,
    statModifiers: Object.keys(statModifiers).length ? statModifiers : undefined,
    specialEffects: specialEffects.length ? specialEffects : undefined,
    counterLabel: counterLabel || undefined,
    counterDefault,
    counterMax,
    blockUnequipWithCounter,
    blockRemoveWithCounter,
    counterEquippedOnly,
    counterRuleOperator,
    counterRuleValue,
    listInShop,
    shopPriceGil: priceGil,
    price: priceGil > 0 ? { copper: priceGil } : undefined,
    shopMinLevel: SHOP_MIN_LEVEL_BY_RARITY[rarity] ?? 1,
    source: 'homebrew',
    created: raw.created || new Date().toISOString(),
    updated: new Date().toISOString()
  }
}

export function upsertHomebrewItem(raw) {
  const item = normalizeHomebrewItem(raw)
  if (!item) throw new Error('Name is required.')
  const conflict = getItem(item.id)
  if (conflict && conflict.source !== 'homebrew' && !store.items[item.id]) {
    throw new Error(`ID "${item.id}" conflicts with official content.`)
  }
  const existing = store.items[item.id]
  if (existing) item.created = existing.created
  store.items[item.id] = item
  saveDebounced()
  registerHomebrewInCache()
  return item
}

export function deleteHomebrewItem(itemId) {
  if (!store.items[itemId]) return false
  delete store.items[itemId]
  saveDebounced()
  registerHomebrewInCache()
  return true
}

export function archiveHomebrewItem(itemId, archived = true) {
  const row = store.items[itemId]
  if (!row) return false
  store.items[itemId] = normalizeHomebrewItem({ ...row, archived: Boolean(archived) })
  saveDebounced()
  registerHomebrewInCache()
  return true
}

export function restoreHomebrewItem(itemId) {
  return archiveHomebrewItem(itemId, false)
}

export function duplicateHomebrewItem(itemId) {
  const source = store.items[itemId]
  if (!source) return null
  const copy = normalizeHomebrewItem({
    ...source,
    id: ensureCustomId(`${itemId}_copy`, `${source.name} copy`),
    name: `${source.name} (copy)`
  })
  store.items[copy.id] = copy
  saveDebounced()
  registerHomebrewInCache()
  return copy
}

export function charactersUsingHomebrewItem(itemId) {
  return (state.characters || []).filter(character => {
    const inInventory = (character.inventory || []).some(entry => entry.itemId === itemId)
    if (inInventory) return true
    const equipped = character.equipped || {}
    return Object.values(equipped).some(uid => {
      const entry = (character.inventory || []).find(row => row.uid === uid)
      return entry?.itemId === itemId
    })
  })
}

export function stripHomebrewFromCharacters(id, kind = 'item') {
  let changed = 0
  for (const character of state.characters || []) {
    let touched = false
    if (kind === 'item') {
      const before = character.inventory?.length || 0
      character.inventory = (character.inventory || []).filter(entry => entry.itemId !== id)
      if ((character.inventory?.length || 0) !== before) touched = true
      for (const slot of ['weapon', 'offhand', 'armor', 'accessory']) {
        const uid = character.equipped?.[slot]
        if (!uid) continue
        const entry = character.inventory.find(row => row.uid === uid)
        if (!entry) {
          character.equipped[slot] = null
          touched = true
        }
      }
    } else if (kind === 'skill') {
      const before = character.skills?.length || 0
      character.skills = (character.skills || []).filter(skillId => skillId !== id)
      if ((character.skills?.length || 0) !== before) touched = true
    } else if (kind === 'race' && character.race === id) {
      character.race = 'human'
      touched = true
    } else if (kind === 'background' && character.background === id) {
      character.background = 'wanderer'
      touched = true
    }
    if (touched) changed += 1
  }
  return changed
}

export function listHomebrewSkills(opts = {}) {
  return allStoredHomebrewSkills()
    .filter(entry => passesHomebrewListFilters(entry, opts))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export function getHomebrewSkill(skillId) {
  const row = store.skills[skillId]
  return row ? normalizeHomebrewSkill(row) : null
}

export function isHomebrewSkill(skill) {
  if (!skill?.id) return false
  if (skill.source === 'homebrew') return true
  if (String(skill.id).startsWith(HOMEBREW_ID_PREFIX)) return true
  return Boolean(store.skills[skill.id])
}

/** Merge cached skill data with stored homebrew locks (level, skills, races). */
export function resolvedHomebrewSkill(skill) {
  if (!skill?.id || !isHomebrewSkill(skill)) return skill
  const stored = getHomebrewSkill(skill.id)
  if (!stored) return { ...skill, source: 'homebrew' }
  return {
    ...stored,
    ...skill,
    source: 'homebrew',
    lockMinLevel: stored.lockMinLevel ?? skill.lockMinLevel,
    lockSkills: stored.lockSkills ?? skill.lockSkills,
    lockRaces: stored.lockRaces ?? skill.lockRaces,
    lockWeaponKinds: stored.lockWeaponKinds ?? skill.lockWeaponKinds
  }
}

function normalizeDamageMode(raw) {
  const mode = String(raw || 'none').toLowerCase()
  return HOMEBREW_SKILL_DAMAGE_MODES.some(row => row.id === mode) ? mode : 'none'
}

function normalizeElementType(raw) {
  const value = String(raw || '').toLowerCase().trim()
  return HOMEBREW_ELEMENT_TYPES.includes(value) ? value : undefined
}

function defaultHomebrewDamageStat(damageMode) {
  return String(damageMode || '').includes('elemental') ? 'magicPower' : 'strength'
}

function normalizeDamageStat(raw, damageMode) {
  const value = String(raw || '').trim()
  if (!value || value === 'none') return undefined
  return HOMEBREW_DAMAGE_STAT_KEYS.includes(value) ? value : defaultHomebrewDamageStat(damageMode)
}

function normalizeActivationEffects(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map(row => {
    const effectId = String(row?.effectId || '').trim()
    if (!effectId || !getEffect(effectId)) return null
    const durationRaw = Number(row.duration)
    const potencyRaw = row.potency
    const applyTo = normalizeApplyTo(row.applyTo)
    const effectKind = normalizeEffectKind(row.effectKind)
    return {
      effectId,
      duration: Number.isFinite(durationRaw) ? Math.max(0, Math.floor(durationRaw)) : 3,
      potency: potencyRaw === '' || potencyRaw == null || !Number.isFinite(Number(potencyRaw))
        ? undefined
        : Number(potencyRaw),
      applyTo,
      effectKind
    }
  }).filter(Boolean)
}

export function emptyHomebrewSkillDraft(overrides = {}) {
  return {
    id: '',
    name: '',
    desc: '',
    icon: '✦',
    category: 'weapons',
    subcategory: 'sword',
    tier: 1,
    cost: TIER_LUMEN_COST[1],
    skillType: 'passive',
    staminaCost: 0,
    damageMode: 'none',
    damageDice: '',
    damageStat: '',
    elementalType: '',
    lockWeaponKinds: [],
    lockRaces: [],
    lockMinLevel: '',
    lockSkills: [],
    statModifiers: {},
    specialEffects: [],
    activationEffects: [],
    defaultApplyTo: 'self',
    useLimit: '',
    archived: false,
    approvalStatus: 'draft',
    balanceTags: [],
    tagsText: '',
    tags: [],
    ...overrides
  }
}

function normalizeHomebrewSkillType(raw) {
  const type = String(raw?.skillType || raw?.type || 'passive').toLowerCase()
  if (type === 'toggle' || type === 'activatable') return type
  return 'passive'
}

export function normalizeHomebrewSkill(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = String(raw.name || '').trim().slice(0, 80)
  if (!name) return null
  const id = raw.id && store.skills[raw.id] ? raw.id : ensureCustomSkillId(raw.id, name)
  let category = String(raw.category || 'weapons').toLowerCase()
  if (category === 'homebrew') category = 'weapons'
  if (!HOMEBREW_SKILL_CATEGORIES.includes(category)) category = 'weapons'
  let subcategory = String(raw.subcategory || 'custom').toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 32) || 'custom'
  if (category === 'racial') {
    const allowed = homebrewRaceOptionsForSkills()
    if (!allowed.includes(subcategory)) subcategory = allowed[0] || 'human'
  }
  const tier = Math.min(5, Math.max(1, Math.floor(Number(raw.tier || 1))))
  const skillType = normalizeHomebrewSkillType(raw)
  const cost = Math.max(0, Math.floor(Number(raw.cost ?? TIER_LUMEN_COST[tier] ?? 8)))
  const damageMode = normalizeDamageMode(raw.damageMode)
  const damageDiceRaw = String(raw.damageDice || '').trim().slice(0, 48)
  const damageDice = damageMode !== 'none' && isValidDamageDice(damageDiceRaw) ? damageDiceRaw : undefined
  const elementalType = damageMode.includes('elemental') ? normalizeElementType(raw.elementalType) : undefined
  const damageStat = damageMode !== 'none' ? normalizeDamageStat(raw.damageStat, damageMode) : undefined
  const activationEffects = normalizeActivationEffects(raw.activationEffects)
  const statModifiers = {}
  for (const key of STAT_KEYS) {
    const value = Number(raw.statModifiers?.[key] ?? raw[key])
    if (Number.isFinite(value) && value !== 0) statModifiers[key] = value
  }
  const specialEffects = normalizeSpecialEffectIds(raw.specialEffects)
  const staminaCost = skillType === 'passive'
    ? undefined
    : Math.max(0, Math.floor(Number(raw.staminaCost ?? 0)))
  const lockWeaponKinds = normalizeHomebrewLockWeaponKinds(raw.lockWeaponKinds)
  const lockRaces = normalizeHomebrewLockRaces(raw.lockRaces)
  const lockMinLevelRaw = Number(
    raw.lockMinLevel ?? raw.minLevel ?? (raw.prerequisites?.type === 'LEVEL' ? raw.prerequisites.level : NaN)
  )
  const lockMinLevel = Number.isFinite(lockMinLevelRaw) && lockMinLevelRaw > 0
    ? Math.floor(lockMinLevelRaw)
    : undefined
  const lockSkills = normalizeHomebrewLockSkills(raw.lockSkills)
  const existing = store.skills[raw.id]
  const archived = normalizeArchived(raw)
  const approvalStatus = normalizeApprovalStatus(raw, existing)
  const balanceTags = normalizeBalanceTags(raw)
  const tags = normalizeItemTags(raw.tags ?? raw.tagsText)
  const defaultApplyTo = normalizeApplyTo(raw.defaultApplyTo) || undefined
  const useLimit = normalizeUseLimit(raw.useLimit)
  return {
    id,
    name,
    desc: String(raw.desc || '').trim().slice(0, 2000),
    icon: String(raw.icon || '✦').trim().slice(0, 8) || '✦',
    category,
    subcategory,
    tier,
    cost,
    skillType,
    isToggle: skillType === 'toggle',
    staminaCost,
    damageMode: damageMode !== 'none' ? damageMode : undefined,
    damageDice,
    damageStat,
    elementalType,
    activationEffects: activationEffects.length ? activationEffects : undefined,
    defaultApplyTo,
    useLimit,
    lockWeaponKinds: lockWeaponKinds.length ? lockWeaponKinds : undefined,
    lockRaces: lockRaces.length ? lockRaces : undefined,
    lockMinLevel,
    lockSkills: lockSkills.length ? lockSkills : undefined,
    statModifiers: Object.keys(statModifiers).length ? statModifiers : undefined,
    specialEffects: specialEffects.length ? specialEffects : undefined,
    archived: archived || undefined,
    approvalStatus,
    balanceTags,
    tags: tags.length ? tags : undefined,
    source: 'homebrew',
    created: raw.created || new Date().toISOString(),
    updated: new Date().toISOString()
  }
}

export function upsertHomebrewSkill(raw) {
  const skill = normalizeHomebrewSkill(raw)
  if (!skill) throw new Error('Name is required.')
  if (skill.category === 'racial' && !homebrewRaceOptionsForSkills().includes(skill.subcategory)) {
    throw new Error('Pick a valid race for this racial skill.')
  }
  const conflict = getSkill(skill.id)
  if (conflict && conflict.source !== 'homebrew' && !store.skills[skill.id]) {
    throw new Error(`ID "${skill.id}" conflicts with official content.`)
  }
  if (getItem(skill.id) && !store.items[skill.id]) {
    throw new Error(`ID "${skill.id}" conflicts with a homebrew item.`)
  }
  const existing = store.skills[skill.id]
  if (existing) skill.created = existing.created
  store.skills[skill.id] = skill
  saveDebounced()
  registerHomebrewInCache()
  return skill
}

export function deleteHomebrewSkill(skillId) {
  if (!store.skills[skillId]) return false
  delete store.skills[skillId]
  saveDebounced()
  registerHomebrewInCache()
  return true
}

export function archiveHomebrewSkill(skillId, archived = true) {
  const row = store.skills[skillId]
  if (!row) return false
  store.skills[skillId] = normalizeHomebrewSkill({ ...row, archived: Boolean(archived) })
  saveDebounced()
  registerHomebrewInCache()
  return true
}

export function duplicateHomebrewSkill(skillId) {
  const source = store.skills[skillId]
  if (!source) return null
  const copy = normalizeHomebrewSkill({
    ...source,
    id: ensureCustomSkillId(`${skillId}_copy`, `${source.name} copy`),
    name: `${source.name} (copy)`
  })
  store.skills[copy.id] = copy
  saveDebounced()
  registerHomebrewInCache()
  return copy
}

export function charactersUsingHomebrewSkill(skillId) {
  return (state.characters || []).filter(character => (character.skills || []).includes(skillId))
}

export function listHomebrewRaces(opts = {}) {
  return allStoredHomebrewRaces()
    .filter(entry => passesHomebrewListFilters(entry, opts))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export function getHomebrewRace(raceId) {
  const row = store.races[raceId]
  return row ? normalizeHomebrewRace(row) : null
}

function parsePassiveTraits(raw) {
  if (Array.isArray(raw)) {
    return raw.map(row => String(row || '').trim()).filter(Boolean).slice(0, 12)
  }
  return String(raw || '')
    .split(/\r?\n/)
    .map(row => row.trim())
    .filter(Boolean)
    .slice(0, 12)
}

export function emptyHomebrewRaceDraft(overrides = {}) {
  return {
    id: '',
    name: '',
    description: '',
    icon: '✦',
    passiveTraitsText: '',
    statModifiers: {},
    specialEffects: [],
    archived: false,
    approvalStatus: 'draft',
    balanceTags: [],
    ...overrides
  }
}

export function normalizeHomebrewRace(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = String(raw.name || '').trim().slice(0, 80)
  if (!name) return null
  const id = raw.id && store.races[raw.id] ? raw.id : ensureCustomRaceId(raw.id, name)
  if (getRacesData()[id] && !store.races[id]) return null
  const statModifiers = {}
  for (const key of STAT_KEYS) {
    const value = Number(raw.statModifiers?.[key] ?? raw[key])
    if (Number.isFinite(value) && value !== 0) statModifiers[key] = value
  }
  const passiveTraits = parsePassiveTraits(raw.passiveTraits ?? raw.passiveTraitsText)
  const specialEffects = normalizeSpecialEffectIds(raw.specialEffects)
  const existing = store.races[raw.id]
  const archived = normalizeArchived(raw)
  const approvalStatus = normalizeApprovalStatus(raw, existing)
  const balanceTags = normalizeBalanceTags(raw)
  return {
    id,
    name,
    icon: String(raw.icon || '✦').trim().slice(0, 8) || '✦',
    description: String(raw.description || raw.desc || '').trim().slice(0, 2000),
    passiveTraits: passiveTraits.length ? passiveTraits : undefined,
    statModifiers: Object.keys(statModifiers).length ? statModifiers : undefined,
    specialEffects: specialEffects.length ? specialEffects : undefined,
    archived: archived || undefined,
    approvalStatus,
    balanceTags,
    source: 'homebrew',
    created: raw.created || new Date().toISOString(),
    updated: new Date().toISOString()
  }
}

export function upsertHomebrewRace(raw) {
  const race = normalizeHomebrewRace(raw)
  if (!race) throw new Error('Name is required.')
  if (getRacesData()[race.id] && !store.races[race.id]) {
    throw new Error(`ID "${race.id}" conflicts with an official race.`)
  }
  if (getItem(race.id) && !store.items[race.id]) {
    throw new Error(`ID "${race.id}" conflicts with a homebrew item.`)
  }
  if (getSkill(race.id) && !store.skills[race.id]) {
    throw new Error(`ID "${race.id}" conflicts with a homebrew skill.`)
  }
  const existing = store.races[race.id]
  if (existing) race.created = existing.created
  store.races[race.id] = race
  saveDebounced()
  registerHomebrewInCache()
  return race
}

export function deleteHomebrewRace(raceId) {
  if (!store.races[raceId]) return false
  delete store.races[raceId]
  saveDebounced()
  registerHomebrewInCache()
  return true
}

export function duplicateHomebrewRace(raceId) {
  const source = store.races[raceId]
  if (!source) return null
  const copy = normalizeHomebrewRace({
    ...source,
    id: ensureCustomRaceId(`${raceId}_copy`, `${source.name} copy`),
    name: `${source.name} (copy)`
  })
  store.races[copy.id] = copy
  saveDebounced()
  registerHomebrewInCache()
  return copy
}

export function charactersUsingHomebrewRace(raceId) {
  return (state.characters || []).filter(character => character.race === raceId)
}

export function archiveHomebrewRace(raceId, archived = true) {
  const row = store.races[raceId]
  if (!row) return false
  store.races[raceId] = normalizeHomebrewRace({ ...row, archived: Boolean(archived) })
  saveDebounced()
  registerHomebrewInCache()
  return true
}

function ensureCustomBackgroundId(preferred, name = 'background') {
  const pref = String(preferred || '').trim()
  const slug = String(name || 'background').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)
  let stem = pref.startsWith(HOMEBREW_ID_PREFIX) ? pref : `${HOMEBREW_ID_PREFIX}${slug || 'background'}`
  let candidate = stem
  let n = 2
  while (store.backgrounds?.[candidate]) {
    if (candidate === pref) return candidate
    candidate = `${stem}_${n++}`
  }
  return candidate
}

function normalizeBackgroundItems(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map(row => ({
    itemId: String(row?.itemId || row?.id || '').trim(),
    qty: Math.max(1, Math.floor(Number(row?.qty ?? row?.quantity ?? 1)))
  })).filter(row => row.itemId)
}

export function emptyHomebrewBackgroundDraft(overrides = {}) {
  return {
    id: '',
    name: '',
    icon: '✦',
    description: '',
    gil: 0,
    lumens: 0,
    items: [],
    itemsText: '',
    tableNote: '',
    hardMode: false,
    archived: false,
    approvalStatus: 'draft',
    balanceTags: [],
    ...overrides
  }
}

export function normalizeHomebrewBackground(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = String(raw.name || '').trim().slice(0, 80)
  if (!name) return null
  const id = raw.id && store.backgrounds?.[raw.id] ? raw.id : ensureCustomBackgroundId(raw.id, name)
  const existing = store.backgrounds?.[raw.id]
  const items = normalizeBackgroundItems(raw.items ?? raw.startingItems)
  const archived = normalizeArchived(raw)
  const approvalStatus = normalizeApprovalStatus(raw, existing)
  const balanceTags = normalizeBalanceTags(raw)
  return {
    id,
    name,
    icon: String(raw.icon || '✦').trim().slice(0, 8) || '✦',
    description: String(raw.description || raw.desc || '').trim().slice(0, 2000),
    gil: Math.max(0, Math.floor(Number(raw.gil ?? 0))),
    lumens: Math.max(0, Math.floor(Number(raw.lumens ?? 0))),
    items: items.length ? items : undefined,
    tableNote: String(raw.tableNote || '').trim().slice(0, 1000) || undefined,
    hardMode: raw.hardMode ? true : undefined,
    archived: archived || undefined,
    approvalStatus,
    balanceTags,
    source: 'homebrew',
    created: raw.created || new Date().toISOString(),
    updated: new Date().toISOString()
  }
}

export function listHomebrewBackgrounds(opts = {}) {
  return allStoredHomebrewBackgrounds()
    .filter(entry => passesHomebrewListFilters(entry, opts))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export function getHomebrewBackground(backgroundId) {
  const row = store.backgrounds?.[backgroundId]
  return row ? normalizeHomebrewBackground(row) : null
}

export function upsertHomebrewBackground(raw) {
  const background = normalizeHomebrewBackground(raw)
  if (!background) throw new Error('Name is required.')
  const existing = store.backgrounds[background.id]
  if (existing) background.created = existing.created
  store.backgrounds[background.id] = background
  saveDebounced()
  return background
}

export function deleteHomebrewBackground(backgroundId) {
  if (!store.backgrounds?.[backgroundId]) return false
  delete store.backgrounds[backgroundId]
  saveDebounced()
  return true
}

export function archiveHomebrewBackground(backgroundId, archived = true) {
  const row = store.backgrounds?.[backgroundId]
  if (!row) return false
  store.backgrounds[backgroundId] = normalizeHomebrewBackground({ ...row, archived: Boolean(archived) })
  saveDebounced()
  return true
}

export function duplicateHomebrewBackground(backgroundId) {
  const source = store.backgrounds?.[backgroundId]
  if (!source) return null
  const copy = normalizeHomebrewBackground({
    ...source,
    id: ensureCustomBackgroundId(`${backgroundId}_copy`, `${source.name} copy`),
    name: `${source.name} (copy)`
  })
  store.backgrounds[copy.id] = copy
  saveDebounced()
  return copy
}

export function charactersUsingHomebrewBackground(backgroundId) {
  return (state.characters || []).filter(character => character.background === backgroundId)
}

function ensureCustomRecipeId(preferred, name = 'recipe') {
  const pref = String(preferred || '').trim()
  const slug = String(name || 'recipe').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)
  let stem = pref.startsWith(HOMEBREW_ID_PREFIX) ? pref : `${HOMEBREW_ID_PREFIX}${slug || 'recipe'}`
  let candidate = stem
  let n = 2
  while (store.recipes?.[candidate]) {
    if (candidate === pref) return candidate
    candidate = `${stem}_${n++}`
  }
  return candidate
}

function normalizeRecipeMaterials(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map(row => ({
    id: String(row?.id || row?.item || '').trim(),
    quantity: Math.max(1, Math.floor(Number(row?.quantity ?? row?.qty ?? 1)))
  })).filter(row => row.id)
}

export function emptyHomebrewRecipeDraft(overrides = {}) {
  return {
    id: '',
    name: '',
    profession: 'blacksmith',
    tier: 1,
    desc: '',
    materials: [],
    materialsText: '',
    outputItemId: '',
    requiredSkills: [],
    requiredSkillsText: '',
    craftBonusNote: '',
    archived: false,
    approvalStatus: 'draft',
    balanceTags: [],
    tagsText: '',
    tags: [],
    ...overrides
  }
}

export function normalizeHomebrewRecipe(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = String(raw.name || '').trim().slice(0, 80)
  if (!name) return null
  const id = raw.id && store.recipes?.[raw.id] ? raw.id : ensureCustomRecipeId(raw.id, name)
  const existing = store.recipes?.[raw.id]
  const materials = normalizeRecipeMaterials(raw.materials)
  const requiredSkills = Array.isArray(raw.requiredSkills)
    ? [...new Set(raw.requiredSkills.map(id => String(id || '').trim()).filter(id => getSkill(id)))]
    : String(raw.requiredSkills || raw.requiredSkillsText || '')
      .split(/[\n,]+/)
      .map(row => row.trim())
      .filter(id => getSkill(id))
  const archived = normalizeArchived(raw)
  const approvalStatus = normalizeApprovalStatus(raw, existing)
  const balanceTags = normalizeBalanceTags(raw)
  const tags = normalizeItemTags(raw.tags ?? raw.tagsText)
  return {
    id,
    name,
    profession: String(raw.profession || 'blacksmith').toLowerCase().slice(0, 32),
    tier: Math.min(5, Math.max(1, Math.floor(Number(raw.tier || 1)))),
    desc: String(raw.desc || raw.description || '').trim().slice(0, 2000),
    materials: materials.length ? materials : undefined,
    outputItemId: String(raw.outputItemId || raw.output || '').trim() || undefined,
    requiredSkills: requiredSkills.length ? requiredSkills : undefined,
    craftBonusNote: String(raw.craftBonusNote || '').trim().slice(0, 500) || undefined,
    archived: archived || undefined,
    approvalStatus,
    balanceTags,
    tags: tags.length ? tags : undefined,
    source: 'homebrew',
    created: raw.created || new Date().toISOString(),
    updated: new Date().toISOString()
  }
}

export function listHomebrewRecipes(opts = {}) {
  return allStoredHomebrewRecipes()
    .filter(entry => passesHomebrewListFilters(entry, opts))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export function getHomebrewRecipe(recipeId) {
  const row = store.recipes?.[recipeId]
  return row ? normalizeHomebrewRecipe(row) : null
}

export function upsertHomebrewRecipe(raw) {
  const recipe = normalizeHomebrewRecipe(raw)
  if (!recipe) throw new Error('Name is required.')
  const existing = store.recipes[recipe.id]
  if (existing) recipe.created = existing.created
  store.recipes[recipe.id] = recipe
  saveDebounced()
  return recipe
}

export function deleteHomebrewRecipe(recipeId) {
  if (!store.recipes?.[recipeId]) return false
  delete store.recipes[recipeId]
  saveDebounced()
  return true
}

export function archiveHomebrewRecipe(recipeId, archived = true) {
  const row = store.recipes?.[recipeId]
  if (!row) return false
  store.recipes[recipeId] = normalizeHomebrewRecipe({ ...row, archived: Boolean(archived) })
  saveDebounced()
  return true
}

export function duplicateHomebrewRecipe(recipeId) {
  const source = store.recipes?.[recipeId]
  if (!source) return null
  const copy = normalizeHomebrewRecipe({
    ...source,
    id: ensureCustomRecipeId(`${recipeId}_copy`, `${source.name} copy`),
    name: `${source.name} (copy)`
  })
  store.recipes[copy.id] = copy
  saveDebounced()
  return copy
}

// ─── GM Builder monster templates (homebrew) ───

const MONSTER_TEMPLATE_BUCKETS = {
  monsterTypes: 'monsterTypes',
  monsterRoles: 'monsterRoles',
  monsterSpecials: 'monsterSpecials'
}

function monsterBucket(kind) {
  return MONSTER_TEMPLATE_BUCKETS[kind] || 'monsterTypes'
}

function parseTagList(raw) {
  if (Array.isArray(raw)) return raw.map(row => String(row || '').trim()).filter(Boolean).slice(0, 12)
  return String(raw || '')
    .split(/[\n,]+/)
    .map(row => row.trim())
    .filter(Boolean)
    .slice(0, 12)
}

/** Canonical resist / weak / immune tags — elements normalize to fire, ice, … */
export function normalizeAffinityTagList(raw) {
  return [...new Set(parseTagList(raw).map(tag => {
    const element = normalizeBuilderElementId(tag)
    return element || String(tag || '').trim().toLowerCase()
  }).filter(Boolean))].slice(0, 12)
}

export const MONSTER_IMMUNITY_EXTRA_TAGS = [
  { id: 'poison', label: 'Poison' },
  { id: 'bleed', label: 'Bleed' },
  { id: 'magic', label: 'Magic' }
]

export function listMonsterTemplateSkillOptions() {
  return flattenSkills()
    .filter(skill => skill.category === 'racial' && skill.raceGroup === 'monster')
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

function parseSkillIdList(raw) {
  if (!Array.isArray(raw)) {
    return String(raw || '')
      .split(/[\n,]+/)
      .map(row => row.trim())
      .filter(id => getSkill(id))
  }
  return [...new Set(raw.map(id => String(id || '').trim()).filter(id => getSkill(id)))]
}

function normalizeMonsterTemplate(raw, kind = 'monsterTypes') {
  if (!raw || typeof raw !== 'object') return null
  const name = String(raw.name || '').trim().slice(0, 80)
  if (!name) return null
  const bucket = monsterBucket(kind)
  const id = raw.id && store[bucket][raw.id] ? raw.id : ensureCustomMonsterTemplateId(raw.id, name, kind)
  const statModifiers = {}
  for (const key of STAT_KEYS) {
    const value = Number(raw.statModifiers?.[key] ?? raw[key])
    if (Number.isFinite(value) && value !== 0) statModifiers[key] = value
  }
  const categories = parseTagList(raw.categories).filter(cat => cat === 'monster' || cat === 'npc')
  const existing = store[bucket]?.[raw.id]
  const archived = normalizeArchived(raw)
  const approvalStatus = normalizeApprovalStatus(raw, existing)
  const balanceTags = normalizeBalanceTags(raw)
  return {
    id,
    name,
    icon: String(raw.icon || '✦').trim().slice(0, 8) || '✦',
    description: String(raw.description || raw.desc || '').trim().slice(0, 2000),
    tags: parseTagList(raw.tags),
    categories: categories.length ? categories : undefined,
    statModifiers: Object.keys(statModifiers).length ? statModifiers : undefined,
    skillIds: parseSkillIdList(raw.skillIds),
    resistances: normalizeAffinityTagList(raw.resistances),
    weaknesses: normalizeAffinityTagList(raw.weaknesses),
    immunities: normalizeAffinityTagList(raw.immunities),
    behaviourNotes: String(raw.behaviourNotes || '').trim().slice(0, 1000) || undefined,
    actionNotes: String(raw.actionNotes || '').trim().slice(0, 1000) || undefined,
    rulesNotes: String(raw.rulesNotes || '').trim().slice(0, 1000) || undefined,
    lootNotes: String(raw.lootNotes || '').trim().slice(0, 1000) || undefined,
    isHumanoid: raw.isHumanoid ? true : undefined,
    raceIdOverride: String(raw.raceIdOverride || '').trim() || undefined,
    threatFlags: raw.threatFlags && typeof raw.threatFlags === 'object' ? raw.threatFlags : undefined,
    archived: archived || undefined,
    approvalStatus,
    balanceTags,
    source: 'homebrew',
    templateKind: kind,
    created: raw.created || new Date().toISOString(),
    updated: new Date().toISOString()
  }
}

function ensureCustomMonsterTemplateId(preferred, name, kind) {
  const pref = String(preferred || '').trim()
  const slug = String(name || kind).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40)
  const base = pref && pref.startsWith(HOMEBREW_ID_PREFIX) ? pref : `${HOMEBREW_ID_PREFIX}${slug || kind}`
  if (!monsterTemplateIdInUse(base, kind)) return base
  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base}_${i}`
    if (!monsterTemplateIdInUse(candidate, kind)) return candidate
  }
  return `${HOMEBREW_ID_PREFIX}${Date.now().toString(36)}`
}

function monsterTemplateIdInUse(id, kind) {
  for (const bucket of Object.values(MONSTER_TEMPLATE_BUCKETS)) {
    if (store[bucket][id]) return true
  }
  if (store.items[id] || store.skills[id] || store.races[id]) return true
  return false
}

function listMonsterTemplates(kind, opts = {}) {
  const bucket = monsterBucket(kind)
  return Object.values(store[bucket] || {})
    .map(row => normalizeMonsterTemplate(row, kind))
    .filter(Boolean)
    .filter(entry => passesHomebrewListFilters(entry, opts))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

function getMonsterTemplate(kind, id) {
  const bucket = monsterBucket(kind)
  const row = store[bucket]?.[id]
  return row ? normalizeMonsterTemplate(row, kind) : null
}

export function listHomebrewMonsterTypes() { return listMonsterTemplates('monsterTypes') }
export function listHomebrewMonsterRoles() { return listMonsterTemplates('monsterRoles') }
export function listHomebrewMonsterSpecials() { return listMonsterTemplates('monsterSpecials') }
export function getHomebrewMonsterType(id) { return getMonsterTemplate('monsterTypes', id) }
export function getHomebrewMonsterRole(id) { return getMonsterTemplate('monsterRoles', id) }
export function getHomebrewMonsterSpecial(id) { return getMonsterTemplate('monsterSpecials', id) }

export function emptyHomebrewMonsterDraft(kind = 'monsterTypes', overrides = {}) {
  return {
    templateKind: kind,
    id: '',
    name: '',
    icon: '✦',
    description: '',
    tagsText: '',
    categories: ['monster'],
    skillIds: [],
    resistances: [],
    weaknesses: [],
    immunities: [],
    behaviourNotes: '',
    actionNotes: '',
    rulesNotes: '',
    lootNotes: '',
    isHumanoid: false,
    raceIdOverride: '',
    statModifiers: {},
    ...overrides
  }
}

export function upsertHomebrewMonsterTemplate(raw, kind = 'monsterTypes') {
  const bucket = monsterBucket(kind)
  const row = normalizeMonsterTemplate(raw, kind)
  if (!row) throw new Error('Name is required.')
  const existing = store[bucket][row.id]
  if (existing) row.created = existing.created
  store[bucket][row.id] = row
  saveDebounced()
  return row
}

export function deleteHomebrewMonsterTemplate(kind, id) {
  const bucket = monsterBucket(kind)
  if (!store[bucket][id]) return false
  delete store[bucket][id]
  saveDebounced()
  return true
}

export function duplicateHomebrewMonsterTemplate(kind, id) {
  const bucket = monsterBucket(kind)
  const source = store[bucket][id]
  if (!source) return null
  const copy = normalizeMonsterTemplate({
    ...source,
    id: ensureCustomMonsterTemplateId(`${id}_copy`, `${source.name} copy`, kind),
    name: `${source.name} (copy)`
  }, kind)
  store[bucket][copy.id] = copy
  saveDebounced()
  return copy
}

export function draftFromHomebrewMonsterTemplate(kind, id) {
  const row = getMonsterTemplate(kind, id)
  if (!row) return emptyHomebrewMonsterDraft(kind)
  return emptyHomebrewMonsterDraft(kind, {
    id: row.id,
    name: row.name,
    icon: row.icon,
    description: row.description,
    tagsText: (row.tags || []).join(', '),
    categories: (row.categories || ['monster']).filter(cat => cat === 'monster' || cat === 'npc'),
    skillIds: [...(row.skillIds || [])],
    resistances: [...(row.resistances || [])],
    weaknesses: [...(row.weaknesses || [])],
    immunities: [...(row.immunities || [])],
    behaviourNotes: row.behaviourNotes || '',
    actionNotes: row.actionNotes || '',
    rulesNotes: row.rulesNotes || '',
    lootNotes: row.lootNotes || '',
    isHumanoid: Boolean(row.isHumanoid),
    raceIdOverride: row.raceIdOverride || '',
    statModifiers: { ...(row.statModifiers || {}) }
  })
}

export function syncHomebrewMonsterDraftFromForm(form = null) {
  const el = form || (typeof document !== 'undefined' ? document.querySelector('#homebrew-monster-form') : null)
  if (!el || !state.homebrewMonsterDraft) return
  const kind = state.homebrewMonsterEditorKind || state.homebrewEditorKind || 'monsterTypes'
  state.homebrewMonsterDraft = parseHomebrewMonsterDraftForm(el, kind, state.homebrewMonsterDraft)
}

export function parseHomebrewMonsterDraftForm(form, kind = 'monsterTypes', existingDraft = {}) {
  const statModifiers = {}
  for (const key of STAT_KEYS) {
    const value = Number(form.querySelector(`[name="hbm-stat-${key}"]`)?.value)
    if (Number.isFinite(value) && value !== 0) statModifiers[key] = value
  }
  const categories = []
  if (form.querySelector('[name="hbm-cat-monster"]')?.checked) categories.push('monster')
  if (form.querySelector('[name="hbm-cat-npc"]')?.checked) categories.push('npc')
  return emptyHomebrewMonsterDraft(kind, {
    id: String(form.querySelector('[name="hbm-id"]')?.value || '').trim(),
    name: String(form.querySelector('[name="hbm-name"]')?.value || '').trim(),
    icon: String(form.querySelector('[name="hbm-icon"]')?.value || '✦').trim(),
    description: String(form.querySelector('[name="hbm-desc"]')?.value || '').trim(),
    tagsText: String(form.querySelector('[name="hbm-tags"]')?.value || '').trim(),
    categories: categories.length ? categories : (existingDraft.categories || ['monster']),
    skillIds: [...(existingDraft.skillIds || [])],
    resistances: [...(existingDraft.resistances || [])],
    weaknesses: [...(existingDraft.weaknesses || [])],
    immunities: [...(existingDraft.immunities || [])],
    behaviourNotes: String(form.querySelector('[name="hbm-behaviour"]')?.value || '').trim(),
    actionNotes: String(form.querySelector('[name="hbm-actions"]')?.value || '').trim(),
    rulesNotes: String(form.querySelector('[name="hbm-rules"]')?.value || '').trim(),
    lootNotes: String(form.querySelector('[name="hbm-loot"]')?.value || '').trim(),
    isHumanoid: Boolean(form.querySelector('[name="hbm-humanoid"]')?.checked),
    raceIdOverride: String(form.querySelector('[name="hbm-race-override"]')?.value || '').trim(),
    statModifiers
  })
}

export function homebrewMonsterDraftToUpsertPayload(draft) {
  const kind = draft?.templateKind || 'monsterTypes'
  return {
    id: draft.id || undefined,
    name: draft.name,
    icon: draft.icon,
    description: draft.description,
    tags: parseTagList(draft.tagsText),
    categories: (draft.categories || ['monster']).filter(cat => cat === 'monster' || cat === 'npc'),
    skillIds: parseSkillIdList(draft.skillIds),
    resistances: normalizeAffinityTagList(draft.resistances),
    weaknesses: normalizeAffinityTagList(draft.weaknesses),
    immunities: normalizeAffinityTagList(draft.immunities),
    behaviourNotes: draft.behaviourNotes,
    actionNotes: draft.actionNotes,
    rulesNotes: draft.rulesNotes,
    lootNotes: draft.lootNotes,
    isHumanoid: draft.isHumanoid,
    raceIdOverride: draft.raceIdOverride,
    statModifiers: draft.statModifiers,
    templateKind: kind
  }
}

export function homebrewSkillsForRace(raceId) {
  return listHomebrewSkills().filter(skill => skill.category === 'racial' && skill.subcategory === raceId)
}

export function homebrewRaceOptionsForSkills() {
  const official = Object.keys(getRacesData())
  const homebrew = listHomebrewRaces().map(race => race.id)
  return [...new Set([...official, ...homebrew])].sort((a, b) => {
    const label = id => getHomebrewRace(id)?.name || getRacesData()[id]?.name || id
    return label(a).localeCompare(label(b))
  })
}

export function normalizeHomebrewWeaponKind(raw) {
  const value = String(raw || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 32)
  return value || undefined
}

function normalizeHomebrewLockWeaponKinds(raw) {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map(normalizeHomebrewWeaponKind).filter(Boolean))]
}

function normalizeHomebrewLockRaces(raw) {
  if (!Array.isArray(raw)) return []
  const allowed = new Set(homebrewRaceOptionsForSkills())
  return [...new Set(raw.map(id => String(id || '').trim().toLowerCase()).filter(id => allowed.has(id)))]
}

function normalizeHomebrewLockSkills(raw) {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map(id => String(id || '').trim()).filter(id => getSkill(id)))]
}

export function weaponKindDisplayLabel(kind) {
  if (!kind) return ''
  if (kind === ANY_WEAPON_KIND) return 'Any weapon'
  if (kind === 'striker' || kind === 'unarmed') return 'Empty hands'
  if (kind === 'ranged') return 'Ranged'
  if (OFFICIAL_WEAPON_KINDS.includes(kind)) return titleCase(kind)
  const named = listHomebrewItems().find(item => item.weaponKind === kind)
  if (named) return `${named.name} (${kind})`
  return kind.replace(/_/g, ' ')
}

export function homebrewWeaponKindOptions() {
  const kinds = new Set(OFFICIAL_WEAPON_KINDS)
  kinds.add(ANY_WEAPON_KIND)
  for (const item of listHomebrewItems()) {
    if (item.weaponKind) kinds.add(item.weaponKind)
  }
  for (const skill of listHomebrewSkills()) {
    for (const kind of skill.lockWeaponKinds || []) kinds.add(kind)
  }
  return [...kinds].sort((a, b) => weaponKindDisplayLabel(a).localeCompare(weaponKindDisplayLabel(b)))
}

export function homebrewSkillLockOptions() {
  const seen = new Set()
  const rows = []
  for (const skill of cache.skillsFlat || []) {
    if (!skill?.id || seen.has(skill.id)) continue
    seen.add(skill.id)
    rows.push({ id: skill.id, name: skill.name, source: skill.source || 'official' })
  }
  for (const skill of listHomebrewSkills()) {
    if (seen.has(skill.id)) continue
    seen.add(skill.id)
    rows.push({ id: skill.id, name: skill.name, source: 'homebrew' })
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export function homebrewSkillLockSummary(skill, { skipLevel = false } = {}) {
  skill = resolvedHomebrewSkill(skill)
  if (!skill || !isHomebrewSkill(skill)) return ''
  const parts = []
  if (!skipLevel && skill.lockMinLevel) parts.push(`Level ${skill.lockMinLevel}+`)
  if (skill.lockRaces?.length) {
    const labels = skill.lockRaces.map(id => getHomebrewRace(id)?.name || getRacesData()[id]?.name || id)
    parts.push(`Race: ${labels.join(' / ')}`)
  }
  if (skill.lockWeaponKinds?.length) {
    parts.push(`Equip: ${skill.lockWeaponKinds.map(weaponKindDisplayLabel).join(' / ')}`)
  }
  if (skill.lockSkills?.length) {
    const labels = skill.lockSkills.map(id => getSkill(id)?.name || id)
    parts.push(`Needs: ${labels.join(' + ')}`)
  }
  return parts.join(' · ')
}

export function officialSubcategoriesForCategory(category) {
  const data = getSkillsData()
  if (category === 'racial') {
    const racial = data.racial || {}
    const subs = new Set()
    for (const [key, value] of Object.entries(racial)) {
      if (Array.isArray(value)) subs.add(key)
      else if (value && typeof value === 'object') {
        for (const subKey of Object.keys(value)) subs.add(subKey)
      }
    }
    return [...subs].sort((a, b) => a.localeCompare(b))
  }
  const tree = data[category]
  if (!tree || typeof tree !== 'object') return []
  return Object.keys(tree).sort((a, b) => a.localeCompare(b))
}

export function homebrewSubcategoriesForCategory(category) {
  const subs = new Set()
  for (const skill of listHomebrewSkills()) {
    if (skill.category === category) subs.add(skill.subcategory || 'custom')
  }
  return [...subs]
}

export function homebrewSkillTreeOptions(category) {
  if (category === 'racial') return homebrewRaceOptionsForSkills()
  return [...new Set([
    ...officialSubcategoriesForCategory(category),
    ...homebrewSubcategoriesForCategory(category)
  ])].sort((a, b) => a.localeCompare(b))
}

export function alignHomebrewSkillSubcategory(draft) {
  if (!draft) return draft
  const options = homebrewSkillTreeOptions(draft.category || 'weapons')
  if (!options.length) return draft
  if (!options.includes(draft.subcategory)) draft.subcategory = options[0]
  return draft
}

export function homebrewSkillsForExport(skillIds) {
  return skillIds.map(id => store.skills[id]).filter(Boolean).map(row => ({ ...normalizeHomebrewSkill(row) }))
}

export function collectHomebrewIdsFromCharacter(character) {
  const ids = new Set()
  if (!character) return ids
  for (const entry of character.inventory || []) {
    if (String(entry.itemId || '').startsWith(HOMEBREW_ID_PREFIX)) ids.add(entry.itemId)
  }
  for (const skillId of character.skills || []) {
    if (String(skillId).startsWith(HOMEBREW_ID_PREFIX)) ids.add(skillId)
    const skill = store.skills[skillId] || null
    if (skill?.category === 'racial' && String(skill.subcategory || '').startsWith(HOMEBREW_ID_PREFIX)) {
      ids.add(skill.subcategory)
    }
  }
  if (String(character.race || '').startsWith(HOMEBREW_ID_PREFIX)) ids.add(character.race)
  const backgroundId = String(character.background || '')
  if (backgroundId.startsWith(HOMEBREW_ID_PREFIX)) {
    ids.add(backgroundId)
    const bg = store.backgrounds?.[backgroundId]
    for (const row of bg?.items || []) {
      if (String(row.itemId || '').startsWith(HOMEBREW_ID_PREFIX)) ids.add(row.itemId)
    }
  }
  return ids
}

export function homebrewBackgroundsForExport(backgroundIds) {
  return backgroundIds.filter(id => store.backgrounds?.[id]).map(id => ({ ...normalizeHomebrewBackground(store.backgrounds[id]) }))
}

export function homebrewRacesForExport(raceIds) {
  return raceIds.filter(id => store.races[id]).map(id => ({ ...normalizeHomebrewRace(store.races[id]) }))
}

export function homebrewItemsForExport(itemIds) {
  return itemIds.filter(id => store.items[id]).map(id => ({ ...normalizeHomebrewItem(store.items[id]) }))
}

export function buildHomebrewPack({
  name = 'Homebrew pack',
  author = '',
  itemIds = [],
  skillIds = [],
  raceIds = [],
  backgroundIds = [],
  recipeIds = [],
  monsterTypeIds = [],
  monsterRoleIds = [],
  monsterSpecialIds = [],
  approvedOnly = false
} = {}) {
  const pick = (row, normalize) => {
    const entry = normalize(row)
    if (!entry) return null
    if (approvedOnly && entry.approvalStatus && entry.approvalStatus !== 'approved') return null
    return { ...entry }
  }
  const items = itemIds.map(id => store.items[id]).filter(Boolean)
    .map(row => pick(row, normalizeHomebrewItem)).filter(Boolean)
  const skills = skillIds.map(id => store.skills[id]).filter(Boolean)
    .map(row => pick(row, normalizeHomebrewSkill)).filter(Boolean)
  const races = raceIds.map(id => store.races[id]).filter(Boolean)
    .map(row => pick(row, normalizeHomebrewRace)).filter(Boolean)
  const backgrounds = backgroundIds.map(id => store.backgrounds?.[id]).filter(Boolean)
    .map(row => pick(row, normalizeHomebrewBackground)).filter(Boolean)
  const recipes = recipeIds.map(id => store.recipes?.[id]).filter(Boolean)
    .map(row => pick(row, normalizeHomebrewRecipe)).filter(Boolean)
  const monsterTypes = monsterTypeIds.map(id => store.monsterTypes?.[id]).filter(Boolean)
    .map(row => pick(row, rowData => normalizeMonsterTemplate(rowData, 'monsterTypes'))).filter(Boolean)
  const monsterRoles = monsterRoleIds.map(id => store.monsterRoles?.[id]).filter(Boolean)
    .map(row => pick(row, rowData => normalizeMonsterTemplate(rowData, 'monsterRoles'))).filter(Boolean)
  const monsterSpecials = monsterSpecialIds.map(id => store.monsterSpecials?.[id]).filter(Boolean)
    .map(row => pick(row, rowData => normalizeMonsterTemplate(rowData, 'monsterSpecials'))).filter(Boolean)
  return {
    version: 1,
    type: 'lumenforge-homebrew-pack',
    name: String(name).slice(0, 80),
    author: String(author).slice(0, 80),
    exported: new Date().toISOString(),
    campaignPack: approvedOnly || undefined,
    items,
    skills,
    races,
    backgrounds,
    recipes,
    monsterTypes,
    monsterRoles,
    monsterSpecials
  }
}

export function mergeHomebrewImport(parsed, { replace = false, skipConflicts = false } = {}) {
  const incomingItems = Array.isArray(parsed?.items) ? parsed.items : []
  const incomingSkills = Array.isArray(parsed?.skills) ? parsed.skills : []
  const incomingRaces = Array.isArray(parsed?.races) ? parsed.races : []
  const incomingBackgrounds = Array.isArray(parsed?.backgrounds) ? parsed.backgrounds : []
  const incomingRecipes = Array.isArray(parsed?.recipes) ? parsed.recipes : []
  const incomingMonsterTypes = Array.isArray(parsed?.monsterTypes) ? parsed.monsterTypes : []
  const incomingMonsterRoles = Array.isArray(parsed?.monsterRoles) ? parsed.monsterRoles : []
  const incomingMonsterSpecials = Array.isArray(parsed?.monsterSpecials) ? parsed.monsterSpecials : []
  const importAsApproved = Boolean(parsed?.campaignPack)
  if (replace) {
    store.items = {}
    store.skills = {}
    store.races = {}
    store.backgrounds = {}
    store.recipes = {}
    store.monsterTypes = {}
    store.monsterRoles = {}
    store.monsterSpecials = {}
  }
  let mergedItems = 0
  let mergedSkills = 0
  let mergedRaces = 0
  let mergedBackgrounds = 0
  let mergedRecipes = 0
  let mergedMonsterTypes = 0
  let mergedMonsterRoles = 0
  let mergedMonsterSpecials = 0
  let skipped = 0

  const stampImportMeta = row => {
    if (importAsApproved) return { ...row, approvalStatus: 'approved' }
    if (!row.approvalStatus) return { ...row, approvalStatus: 'draft' }
    return row
  }

  for (const row of incomingItems) {
    const item = normalizeHomebrewItem(stampImportMeta(row))
    if (!item) continue
    if (getItem(item.id) && !store.items[item.id]) { skipped += 1; continue }
    if (skipConflicts && store.items[item.id]) { skipped += 1; continue }
    store.items[item.id] = item
    mergedItems += 1
  }
  for (const row of incomingRaces) {
    const race = normalizeHomebrewRace(stampImportMeta(row))
    if (!race) continue
    if (getRacesData()[race.id] && !store.races[race.id]) { skipped += 1; continue }
    if (skipConflicts && store.races[race.id]) { skipped += 1; continue }
    store.races[race.id] = race
    mergedRaces += 1
  }
  for (const row of incomingSkills) {
    const skill = normalizeHomebrewSkill(stampImportMeta(row))
    if (!skill) continue
    if (getSkill(skill.id) && !store.skills[skill.id]) { skipped += 1; continue }
    if (skipConflicts && store.skills[skill.id]) { skipped += 1; continue }
    store.skills[skill.id] = skill
    mergedSkills += 1
  }
  for (const row of incomingBackgrounds) {
    const background = normalizeHomebrewBackground(stampImportMeta(row))
    if (!background) continue
    if (skipConflicts && store.backgrounds?.[background.id]) {
      skipped += 1
      continue
    }
    store.backgrounds[background.id] = background
    mergedBackgrounds += 1
  }
  for (const row of incomingRecipes) {
    const recipe = normalizeHomebrewRecipe(stampImportMeta(row))
    if (!recipe) continue
    if (skipConflicts && store.recipes?.[recipe.id]) {
      skipped += 1
      continue
    }
    store.recipes[recipe.id] = recipe
    mergedRecipes += 1
  }
  for (const row of incomingMonsterTypes) {
    const template = normalizeMonsterTemplate(stampImportMeta(row), 'monsterTypes')
    if (!template) continue
    if (skipConflicts && store.monsterTypes?.[template.id]) { skipped += 1; continue }
    store.monsterTypes[template.id] = template
    mergedMonsterTypes += 1
  }
  for (const row of incomingMonsterRoles) {
    const template = normalizeMonsterTemplate(stampImportMeta(row), 'monsterRoles')
    if (!template) continue
    if (skipConflicts && store.monsterRoles?.[template.id]) { skipped += 1; continue }
    store.monsterRoles[template.id] = template
    mergedMonsterRoles += 1
  }
  for (const row of incomingMonsterSpecials) {
    const template = normalizeMonsterTemplate(stampImportMeta(row), 'monsterSpecials')
    if (!template) continue
    if (skipConflicts && store.monsterSpecials?.[template.id]) { skipped += 1; continue }
    store.monsterSpecials[template.id] = template
    mergedMonsterSpecials += 1
  }
  saveHomebrewNow()
  registerHomebrewInCache()
  return {
    items: mergedItems,
    skills: mergedSkills,
    races: mergedRaces,
    backgrounds: mergedBackgrounds,
    recipes: mergedRecipes,
    monsterTypes: mergedMonsterTypes,
    monsterRoles: mergedMonsterRoles,
    monsterSpecials: mergedMonsterSpecials,
    skipped,
    total: mergedItems + mergedSkills + mergedRaces + mergedBackgrounds + mergedRecipes
      + mergedMonsterTypes + mergedMonsterRoles + mergedMonsterSpecials
  }
}

export function isHomebrewPackFile(parsed) {
  return parsed?.type === 'lumenforge-homebrew-pack'
    || (Array.isArray(parsed?.items) && !parsed?.characters && parsed?.type !== 'lumenforge-save')
    || (Array.isArray(parsed?.skills) && !parsed?.characters && parsed?.type !== 'lumenforge-save')
    || (Array.isArray(parsed?.races) && !parsed?.characters && parsed?.type !== 'lumenforge-save')
}

export function registerHomebrewInCache() {
  cache.itemsFlat = cache.itemsFlat.filter(item => item.source !== 'homebrew')
  for (const [id, item] of cache.itemById.entries()) {
    if (item.source === 'homebrew') cache.itemById.delete(id)
  }
  for (const item of allStoredHomebrewItems()) {
    cache.itemById.set(item.id, item)
    cache.itemsFlat.push(item)
    cache.itemSearchText.set(item.id, getItemSearchText(item))
  }
  cache.itemsFlat.sort((a, b) => String(a.name).localeCompare(String(b.name)))

  cache.skillsFlat = cache.skillsFlat.filter(skill => skill.source !== 'homebrew')
  for (const [id, skill] of cache.skillById.entries()) {
    if (skill.source === 'homebrew') cache.skillById.delete(id)
  }
  for (const skill of allStoredHomebrewSkills()) {
    cache.skillById.set(skill.id, skill)
    cache.skillsFlat.push(skill)
  }
  cache.skillsFlat.sort((a, b) => String(a.name).localeCompare(String(b.name)))

  const types = new Set(['all'])
  const rarities = new Set(['all'])
  for (const item of cache.itemsFlat) {
    if (item.type) types.add(String(item.type).toLowerCase())
    if (item.rarity) rarities.add(String(item.rarity).toLowerCase())
  }
  cache.itemTypeOptions = [...types].sort()
  cache.itemRarityOptions = [...rarities].sort((a, b) => {
    if (a === 'all') return -1
    if (b === 'all') return 1
    return rarityRank(a) - rarityRank(b)
  })

  registerHomebrewRacesInCache(allStoredHomebrewRaces())
}

export function serializeHomebrewForSave() {
  return {
    version: store.version,
    items: store.items,
    skills: store.skills,
    races: store.races,
    backgrounds: store.backgrounds || {},
    recipes: store.recipes || {},
    monsterTypes: store.monsterTypes || {},
    monsterRoles: store.monsterRoles || {},
    monsterSpecials: store.monsterSpecials || {}
  }
}

export function applyHomebrewFromSave(block) {
  if (!block || typeof block !== 'object') return
  store = {
    version: block.version || HOMEBREW_STORE_VERSION,
    items: block.items && typeof block.items === 'object' ? block.items : {},
    skills: block.skills && typeof block.skills === 'object' ? block.skills : {},
    races: block.races && typeof block.races === 'object' ? block.races : {},
    backgrounds: block.backgrounds && typeof block.backgrounds === 'object' ? block.backgrounds : {},
    recipes: block.recipes && typeof block.recipes === 'object' ? block.recipes : {},
    monsterTypes: block.monsterTypes && typeof block.monsterTypes === 'object' ? block.monsterTypes : {},
    monsterRoles: block.monsterRoles && typeof block.monsterRoles === 'object' ? block.monsterRoles : {},
    monsterSpecials: block.monsterSpecials && typeof block.monsterSpecials === 'object' ? block.monsterSpecials : {}
  }
  saveHomebrewNow()
  registerHomebrewInCache()
}

export function parseBalanceTagsFromForm(form, prefix = 'hb-balance') {
  if (!form) return []
  return [...form.querySelectorAll(`[name="${prefix}"]:checked`)].map(el => el.value).filter(tag => HOMEBREW_BALANCE_TAGS.includes(tag))
}

export function draftFromHomebrewItem(item) {
  if (!item) return emptyHomebrewDraft()
  return emptyHomebrewDraft({
    id: item.id,
    name: item.name,
    desc: item.desc,
    type: item.type,
    icon: item.icon,
    rarity: item.rarity,
    damage: item.damage || '',
    weaponKind: item.weaponKind || '',
    offhandType: item.offhandType || 'shield',
    hands: item.hands || 'one',
    stackable: item.stackable === true,
    maxStack: item.maxStack ?? '',
    questItem: Boolean(item.questItem),
    sellable: item.sellable !== false,
    listInShop: Boolean(item.listInShop),
    shopPriceGil: item.shopPriceGil || 0,
    statModifiers: { ...(item.statModifiers || {}) },
    specialEffects: [...(item.specialEffects || [])],
    counterLabel: item.counterLabel || '',
    counterDefault: item.counterDefault ?? 0,
    counterMax: item.counterMax ?? null,
    blockUnequipWithCounter: Boolean(item.blockUnequipWithCounter),
    blockRemoveWithCounter: Boolean(item.blockRemoveWithCounter),
    counterEquippedOnly: Boolean(item.counterEquippedOnly),
    counterRuleOperator: item.counterRuleOperator || 'above',
    counterRuleValue: item.counterRuleValue ?? 0,
    archived: Boolean(item.archived),
    approvalStatus: item.approvalStatus || 'draft',
    balanceTags: [...(item.balanceTags || [])],
    isCursed: Boolean(item.isCursed),
    curseStyle: item.curseStyle || '',
    hiddenGMDescription: item.hiddenGMDescription || '',
    hiddenGMAbility: item.hiddenGMAbility || '',
    hiddenGMNotes: item.hiddenGMNotes || '',
    tagsText: (item.tags || []).join(', '),
    tags: [...(item.tags || [])]
  })
}

export function parseHomebrewDraftForm(form) {
  const statModifiers = {}
  for (const key of STAT_KEYS) {
    const value = Number(form.querySelector(`[name="hb-stat-${key}"]`)?.value)
    if (Number.isFinite(value) && value !== 0) statModifiers[key] = value
  }
  const counterLabel = String(form.querySelector('[name="hb-counter-label"]')?.value || '').trim().slice(0, 24)
  const hasCounter = Boolean(counterLabel)
  const counterDefault = hasCounter
    ? Math.max(0, Math.floor(Number(form.querySelector('[name="hb-counter-default"]')?.value ?? 0)))
    : 0
  const counterMaxRaw = hasCounter ? Number(form.querySelector('[name="hb-counter-max"]')?.value) : NaN
  const counterMax = hasCounter && Number.isFinite(counterMaxRaw) && counterMaxRaw > 0
    ? Math.floor(counterMaxRaw)
    : null
  const counterRuleOperator = hasCounter
    ? normalizeCounterRuleOperator(form.querySelector('[name="hb-counter-rule-op"]')?.value)
    : 'above'
  const counterRuleValue = hasCounter
    ? Math.max(0, Math.floor(Number(form.querySelector('[name="hb-counter-rule-value"]')?.value ?? 0)))
    : 0
  return emptyHomebrewDraft({
    id: form.querySelector('[name="hb-id"]')?.value,
    name: form.querySelector('[name="hb-name"]')?.value,
    desc: form.querySelector('[name="hb-desc"]')?.value,
    type: form.querySelector('[name="hb-type"]')?.value,
    icon: form.querySelector('[name="hb-icon"]')?.value,
    rarity: form.querySelector('[name="hb-rarity"]')?.value,
    damage: form.querySelector('[name="hb-damage"]')?.value,
    weaponKind: form.querySelector('[name="hb-weapon-kind-custom"]')?.value
      || form.querySelector('[name="hb-weapon-kind"]')?.value,
    offhandType: form.querySelector('[name="hb-offhand-type"]')?.value,
    hands: form.querySelector('[name="hb-hands"]')?.value,
    stackable: Boolean(form.querySelector('[name="hb-stackable"]')?.checked),
    maxStack: form.querySelector('[name="hb-max-stack"]')?.value,
    questItem: Boolean(form.querySelector('[name="hb-quest-item"]')?.checked),
    sellable: form.querySelector('[name="hb-sellable"]')?.checked !== false,
    listInShop: form.querySelector('[name="hb-list-in-shop"]')?.checked,
    shopPriceGil: form.querySelector('[name="hb-price"]')?.value,
    statModifiers,
    counterLabel,
    counterDefault,
    counterMax,
    blockUnequipWithCounter: hasCounter && Boolean(form.querySelector('[name="hb-block-unequip-counter"]')?.checked),
    blockRemoveWithCounter: hasCounter && Boolean(form.querySelector('[name="hb-block-remove-counter"]')?.checked),
    counterEquippedOnly: hasCounter && Boolean(form.querySelector('[name="hb-counter-equipped-only"]')?.checked),
    counterRuleOperator,
    counterRuleValue,
    approvalStatus: form.querySelector('[name="hb-approval-status"]')?.value || 'draft',
    balanceTags: parseBalanceTagsFromForm(form, 'hb-balance'),
    isCursed: Boolean(form.querySelector('[name="hb-is-cursed"]')?.checked),
    curseStyle: String(form.querySelector('[name="hb-curse-style"]')?.value || '').trim(),
    hiddenGMDescription: String(form.querySelector('[name="hb-hidden-gm-desc"]')?.value || '').trim(),
    hiddenGMAbility: String(form.querySelector('[name="hb-hidden-gm-ability"]')?.value || '').trim(),
    hiddenGMNotes: String(form.querySelector('[name="hb-hidden-gm-notes"]')?.value || '').trim(),
    tagsText: String(form.querySelector('[name="hb-tags"]')?.value || '').trim()
  })
}

/** Keep in-progress editor fields when toggling effects/counter panels (re-render reads draft, not DOM). */
export function syncHomebrewDraftFromForm(form = null) {
  const el = form || (typeof document !== 'undefined' ? document.querySelector('#homebrew-form') : null)
  if (!el || !state.homebrewDraft) return state.homebrewDraft
  const parsed = parseHomebrewDraftForm(el)
  state.homebrewDraft = {
    ...parsed,
    specialEffects: [...(state.homebrewDraft.specialEffects || [])],
    id: state.homebrewEditingId || parsed.id || state.homebrewDraft.id || ''
  }
  return state.homebrewDraft
}

export function draftFromHomebrewSkill(skill) {
  if (!skill) return emptyHomebrewSkillDraft()
  return emptyHomebrewSkillDraft({
    id: skill.id,
    name: skill.name,
    desc: skill.desc,
    icon: skill.icon,
    category: skill.category,
    subcategory: skill.subcategory,
    tier: skill.tier,
    cost: skill.cost,
    skillType: skill.skillType || 'passive',
    staminaCost: skill.staminaCost ?? 0,
    damageMode: skill.damageMode || 'none',
    damageDice: skill.damageDice || '',
    damageStat: skill.damageStat || defaultHomebrewDamageStat(skill.damageMode),
    elementalType: skill.elementalType || '',
    statModifiers: { ...(skill.statModifiers || {}) },
    specialEffects: [...(skill.specialEffects || [])],
    activationEffects: [...(skill.activationEffects || [])],
    defaultApplyTo: skill.defaultApplyTo || 'self',
    useLimit: skill.useLimit || '',
    lockWeaponKinds: [...(skill.lockWeaponKinds || [])],
    lockRaces: [...(skill.lockRaces || [])],
    lockMinLevel: skill.lockMinLevel ?? '',
    lockSkills: [...(skill.lockSkills || [])],
    archived: Boolean(skill.archived),
    approvalStatus: skill.approvalStatus || 'draft',
    balanceTags: [...(skill.balanceTags || [])],
    tagsText: (skill.tags || []).join(', '),
    tags: [...(skill.tags || [])]
  })
}

function parseUseEffectsFromForm(form, draft) {
  return (draft?.activationEffects || []).map(row => {
    const durationRaw = Number(form.querySelector(`[name="hbs-use-duration-${row.effectId}"]`)?.value)
    const potencyRaw = form.querySelector(`[name="hbs-use-potency-${row.effectId}"]`)?.value
    return {
      effectId: row.effectId,
      duration: Number.isFinite(durationRaw) ? Math.max(0, Math.floor(durationRaw)) : 3,
      potency: potencyRaw === '' || potencyRaw == null || !Number.isFinite(Number(potencyRaw))
        ? undefined
        : Number(potencyRaw),
      applyTo: form.querySelector(`[name="hbs-use-apply-${row.effectId}"]`)?.value || draft?.defaultApplyTo || 'self',
      effectKind: form.querySelector(`[name="hbs-use-kind-${row.effectId}"]`)?.value || undefined
    }
  }).filter(row => row.effectId)
}

function parseLockListFromForm(form, prefix) {
  return [...form.querySelectorAll(`[name="${prefix}"]:checked`)].map(el => el.value).filter(Boolean)
}

export function parseHomebrewSkillDraftForm(form, draft = null) {
  const statModifiers = {}
  for (const key of STAT_KEYS) {
    const value = Number(form.querySelector(`[name="hbs-stat-${key}"]`)?.value)
    if (Number.isFinite(value) && value !== 0) statModifiers[key] = value
  }
  const tier = Math.min(5, Math.max(1, Math.floor(Number(form.querySelector('[name="hbs-tier"]')?.value ?? 1))))
  const skillType = normalizeHomebrewSkillType({ skillType: form.querySelector('[name="hbs-skill-type"]')?.value })
  const damageMode = normalizeDamageMode(form.querySelector('[name="hbs-damage-mode"]')?.value)
  const damageDice = String(form.querySelector('[name="hbs-damage-dice"]')?.value || '').trim()
  const damageStat = form.querySelector('[name="hbs-damage-stat"]')?.value || ''
  const elementalType = normalizeElementType(form.querySelector('[name="hbs-elemental-type"]')?.value) || ''
  const lockMinLevelRaw = form.querySelector('[name="hbs-lock-min-level"]')?.value
  const lockMinLevel = lockMinLevelRaw === '' || lockMinLevelRaw == null
    ? ''
    : Math.max(1, Math.floor(Number(lockMinLevelRaw)))
  const baseDraft = draft || state.homebrewSkillDraft
  return emptyHomebrewSkillDraft({
    id: form.querySelector('[name="hbs-id"]')?.value,
    name: form.querySelector('[name="hbs-name"]')?.value,
    desc: form.querySelector('[name="hbs-desc"]')?.value,
    icon: form.querySelector('[name="hbs-icon"]')?.value,
    category: form.querySelector('[name="hbs-category"]')?.value,
    subcategory: form.querySelector('[name="hbs-subcategory"]')?.value,
    tier,
    cost: form.querySelector('[name="hbs-cost"]')?.value,
    skillType,
    staminaCost: form.querySelector('[name="hbs-stamina"]')?.value,
    damageMode,
    damageDice,
    damageStat,
    elementalType,
    statModifiers,
    lockWeaponKinds: parseLockListFromForm(form, 'hbs-lock-weapon'),
    lockRaces: parseLockListFromForm(form, 'hbs-lock-race'),
    lockMinLevel,
    lockSkills: parseLockListFromForm(form, 'hbs-lock-skill'),
    activationEffects: parseUseEffectsFromForm(form, baseDraft),
    defaultApplyTo: form.querySelector('[name="hbs-default-apply-to"]')?.value || 'self',
    useLimit: form.querySelector('[name="hbs-use-limit"]')?.value || '',
    approvalStatus: form.querySelector('[name="hbs-approval-status"]')?.value || 'draft',
    balanceTags: parseBalanceTagsFromForm(form, 'hbs-balance'),
    tagsText: String(form.querySelector('[name="hbs-tags"]')?.value || '').trim()
  })
}

export function syncHomebrewSkillDraftFromForm(form = null) {
  const el = form || (typeof document !== 'undefined' ? document.querySelector('#homebrew-skill-form') : null)
  if (!el || !state.homebrewSkillDraft) return state.homebrewSkillDraft
  const parsed = parseHomebrewSkillDraftForm(el, state.homebrewSkillDraft)
  state.homebrewSkillDraft = {
    ...parsed,
    specialEffects: [...(state.homebrewSkillDraft.specialEffects || [])],
    lockWeaponKinds: [...(parsed.lockWeaponKinds || [])],
    lockRaces: [...(parsed.lockRaces || [])],
    lockSkills: [...(parsed.lockSkills || [])],
    activationEffects: parsed.activationEffects?.length
      ? parsed.activationEffects
      : [...(state.homebrewSkillDraft.activationEffects || [])],
    id: state.homebrewSkillEditingId || parsed.id || state.homebrewSkillDraft.id || ''
  }
  return state.homebrewSkillDraft
}

export function draftFromHomebrewRace(race) {
  if (!race) return emptyHomebrewRaceDraft()
  return emptyHomebrewRaceDraft({
    id: race.id,
    name: race.name,
    description: race.description || '',
    icon: race.icon,
    passiveTraitsText: (race.passiveTraits || []).join('\n'),
    statModifiers: { ...(race.statModifiers || {}) },
    specialEffects: [...(race.specialEffects || [])],
    approvalStatus: race.approvalStatus || 'draft',
    balanceTags: [...(race.balanceTags || [])]
  })
}

export function parseHomebrewRaceDraftForm(form) {
  const statModifiers = {}
  for (const key of STAT_KEYS) {
    const value = Number(form.querySelector(`[name="hbr-stat-${key}"]`)?.value)
    if (Number.isFinite(value) && value !== 0) statModifiers[key] = value
  }
  const passiveTraitsText = String(form.querySelector('[name="hbr-passives"]')?.value || '')
  return emptyHomebrewRaceDraft({
    id: form.querySelector('[name="hbr-id"]')?.value,
    name: form.querySelector('[name="hbr-name"]')?.value,
    description: form.querySelector('[name="hbr-description"]')?.value,
    icon: form.querySelector('[name="hbr-icon"]')?.value,
    passiveTraitsText,
    statModifiers,
    approvalStatus: form.querySelector('[name="hbr-approval-status"]')?.value || 'draft',
    balanceTags: parseBalanceTagsFromForm(form, 'hbr-balance')
  })
}

export function syncHomebrewRaceDraftFromForm(form = null) {
  const el = form || (typeof document !== 'undefined' ? document.querySelector('#homebrew-race-form') : null)
  if (!el || !state.homebrewRaceDraft) return state.homebrewRaceDraft
  const parsed = parseHomebrewRaceDraftForm(el)
  state.homebrewRaceDraft = {
    ...parsed,
    specialEffects: [...(state.homebrewRaceDraft.specialEffects || [])],
    id: state.homebrewRaceEditingId || parsed.id || state.homebrewRaceDraft.id || ''
  }
  return state.homebrewRaceDraft
}

export function draftFromHomebrewBackground(background) {
  if (!background) return emptyHomebrewBackgroundDraft()
  return emptyHomebrewBackgroundDraft({
    id: background.id,
    name: background.name,
    icon: background.icon,
    description: background.description || '',
    gil: background.gil ?? 0,
    lumens: background.lumens ?? 0,
    items: [...(background.items || [])],
    itemsText: (background.items || []).map(row => `${row.itemId} x${row.qty || 1}`).join('\n'),
    tableNote: background.tableNote || '',
    hardMode: Boolean(background.hardMode),
    approvalStatus: background.approvalStatus || 'draft',
    balanceTags: [...(background.balanceTags || [])]
  })
}

export function parseHomebrewBackgroundDraftForm(form) {
  const itemsText = String(form.querySelector('[name="hbb-items"]')?.value || '')
  const items = itemsText.split(/\r?\n/).map(line => {
    const match = line.trim().match(/^([^\sx]+)\s*(?:x(\d+))?$/i)
    if (!match) return null
    return { itemId: match[1].trim(), qty: Math.max(1, Number(match[2] || 1)) }
  }).filter(Boolean)
  return emptyHomebrewBackgroundDraft({
    id: form.querySelector('[name="hbb-id"]')?.value,
    name: form.querySelector('[name="hbb-name"]')?.value,
    icon: form.querySelector('[name="hbb-icon"]')?.value,
    description: form.querySelector('[name="hbb-description"]')?.value,
    gil: form.querySelector('[name="hbb-gil"]')?.value,
    lumens: form.querySelector('[name="hbb-lumens"]')?.value,
    items,
    itemsText,
    tableNote: form.querySelector('[name="hbb-table-note"]')?.value,
    hardMode: Boolean(form.querySelector('[name="hbb-hard-mode"]')?.checked),
    approvalStatus: form.querySelector('[name="hbb-approval-status"]')?.value || 'draft',
    balanceTags: parseBalanceTagsFromForm(form, 'hbb-balance')
  })
}

export function draftFromHomebrewRecipe(recipe) {
  if (!recipe) return emptyHomebrewRecipeDraft()
  return emptyHomebrewRecipeDraft({
    id: recipe.id,
    name: recipe.name,
    profession: recipe.profession || 'blacksmith',
    tier: recipe.tier || 1,
    desc: recipe.desc || '',
    materials: [...(recipe.materials || [])],
    materialsText: (recipe.materials || []).map(row => `${row.id} x${row.quantity || 1}`).join('\n'),
    outputItemId: recipe.outputItemId || '',
    requiredSkills: [...(recipe.requiredSkills || [])],
    requiredSkillsText: (recipe.requiredSkills || []).join(', '),
    craftBonusNote: recipe.craftBonusNote || '',
    approvalStatus: recipe.approvalStatus || 'draft',
    balanceTags: [...(recipe.balanceTags || [])],
    tagsText: (recipe.tags || []).join(', '),
    tags: [...(recipe.tags || [])]
  })
}

export function parseHomebrewRecipeDraftForm(form) {
  const materialsText = String(form.querySelector('[name="hbrcp-materials"]')?.value || '')
  const materials = materialsText.split(/\r?\n/).map(line => {
    const match = line.trim().match(/^([^\sx]+)\s*(?:x(\d+))?$/i)
    if (!match) return null
    return { id: match[1].trim(), quantity: Math.max(1, Number(match[2] || 1)) }
  }).filter(Boolean)
  return emptyHomebrewRecipeDraft({
    id: form.querySelector('[name="hbrcp-id"]')?.value,
    name: form.querySelector('[name="hbrcp-name"]')?.value,
    profession: form.querySelector('[name="hbrcp-profession"]')?.value,
    tier: form.querySelector('[name="hbrcp-tier"]')?.value,
    desc: form.querySelector('[name="hbrcp-desc"]')?.value,
    materials,
    materialsText,
    outputItemId: form.querySelector('[name="hbrcp-output"]')?.value,
    requiredSkillsText: form.querySelector('[name="hbrcp-skills"]')?.value,
    craftBonusNote: form.querySelector('[name="hbrcp-bonus-note"]')?.value,
    approvalStatus: form.querySelector('[name="hbrcp-approval-status"]')?.value || 'draft',
    balanceTags: parseBalanceTagsFromForm(form, 'hbrcp-balance'),
    tagsText: String(form.querySelector('[name="hbrcp-tags"]')?.value || '').trim()
  })
}
