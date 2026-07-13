import { isGmMode } from '../gm/gm-mode.js'
import { formatStatModifiers } from '../ui/format.js'

const CURSE_STYLE_LABELS = {
  combat: 'Combat curse',
  narrative: 'Narrative curse',
  trigger: 'Trigger curse'
}

const CURSED_EQUIP_TYPES = new Set(['weapon', 'armor', 'accessory', 'offhand'])

export function curseStyleLabel(style) {
  return CURSE_STYLE_LABELS[String(style || '').toLowerCase()] || ''
}

export function isCursedEquipmentType(type) {
  return CURSED_EQUIP_TYPES.has(String(type || '').toLowerCase())
}

/** Player-safe search haystack — never includes hidden GM fields. */
export function itemPlayerSearchText(item) {
  if (!item) return ''
  return [
    item.name,
    item.id,
    item.desc,
    item.type,
    item.rarity,
    item.source,
    item.damage,
    Object.keys(item.statModifiers || {}).join(' '),
    formatStatModifiers(item.statModifiers),
    (item.specialEffects || []).join(' '),
    (item.tags || []).join(' ')
  ].filter(Boolean).join(' ').toLowerCase()
}

export function resolveItemPresentation(item, entry = null) {
  if (!item) return null
  const gm = isGmMode()
  const displayName = item.name
  const displayDesc = item.desc || ''
  const isCursed = Boolean(item.isCursed)
  const showCurseChrome = gm && isCursed
  const hiddenDesc = String(item.hiddenGMDescription || '').trim()
  const hiddenAbility = String(item.hiddenGMAbility || '').trim()
  const hiddenNotes = String(item.hiddenGMNotes || '').trim()
  const showGmPanel = gm && (hiddenDesc || hiddenAbility || hiddenNotes)
  const curseStyle = String(item.curseStyle || '').trim().toLowerCase()

  return {
    item,
    entry,
    displayName,
    displayDesc,
    isCursed,
    curseStyle,
    showCurseChrome,
    showGmPanel,
    starred: Boolean(entry?.starred),
    locked: Boolean(entry?.locked),
    playerNotes: String(entry?.playerNotes || '').trim(),
    gmSections: showGmPanel ? { hiddenGMDescription: hiddenDesc, hiddenGMAbility: hiddenAbility, hiddenGMNotes: hiddenNotes } : null
  }
}

export function itemCursedNameClass(presentation) {
  return presentation?.showCurseChrome ? 'item-cursed-name' : ''
}

export function renderCursedBadgeHtml(presentation) {
  if (!presentation?.showCurseChrome) return ''
  return '<span class="pill item-cursed-label">Cursed</span>'
}

export function renderItemStatusIcons(presentation) {
  if (!presentation) return ''
  const bits = []
  if (presentation.starred) bits.push('<span class="item-status-icon" title="Starred" aria-label="Starred">⭐</span>')
  if (presentation.locked) bits.push('<span class="item-status-icon" title="Locked" aria-label="Locked">🔒</span>')
  return bits.length ? `<span class="item-status-icons">${bits.join('')}</span>` : ''
}

/** GM-only tooltip lines — never render inline on cards. */
export function itemGmTooltipLines(presentation) {
  if (!presentation?.gmSections) return []
  const { hiddenGMDescription, hiddenGMAbility, hiddenGMNotes } = presentation.gmSections
  const lines = [presentation.isCursed ? '— Cursed (GM only) —' : '— GM notes —']
  const styleLabel = curseStyleLabel(presentation.curseStyle)
  if (styleLabel) lines.push(`Curse style: ${styleLabel}`)
  if (hiddenGMDescription) lines.push('', 'Hidden description:', hiddenGMDescription)
  if (hiddenGMAbility) lines.push('', 'Hidden ability:', hiddenGMAbility)
  if (hiddenGMNotes) lines.push('', 'GM notes:', hiddenGMNotes)
  return lines
}

export function itemCardClass(presentation, baseClass = '') {
  const classes = [baseClass].filter(Boolean)
  if (presentation?.showCurseChrome) classes.push('item-cursed-gm')
  return classes.join(' ')
}
