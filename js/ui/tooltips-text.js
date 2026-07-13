import { titleCase } from '../core/utils.js'
import { DEFAULT_STATS } from '../core/constants.js'
import { isGmMode } from '../gm/gm-mode.js'
import {
  formatStatModifiers,
  formatElementalAffinities,
  formatCraftingRecipe,
  formatCurrency,
  itemPriceGil,
  sentenceList
} from './format.js'
import { effectDetailLines, resolveSkillEffects } from '../effects/effects.js'
import { resolveActivationEffects } from '../skills/skill-activation.js'
import { displayCategory, getSkill, isToggleSkill, prereqLabel } from '../skills/skills.js'
import { cache } from '../core/cache.js'
import { shopMinLevelForItem, isShopPurchaseItem, itemHasCounter, itemCounterLabel, inventoryCounterValue } from '../items/items.js'
import { computeSkillLevel } from '../character/skill-level.js'
import { resolveSkillEffectBreakdown, formatSkillEffectBreakdownPlain, skillHasEffectBreakdown } from '../combat/damage-breakdown.js'
import { itemCompareLines } from '../items/item-compare.js'
import { craftedByLabel } from '../items/craft-bonuses.js'
import { weaponHandednessLabel, offhandTypeLabel } from '../items/equipment.js'
import {
  applyInstrumentToActivations,
  getCharacterInstrumentAmplify,
  instrumentAmplifyTooltipLines,
  isMusicianPerformanceSkill,
  canEncoreReplay
} from '../combat/instruments.js'
import { resolveItemPresentation, itemGmTooltipLines } from '../items/item-presentation.js'
import { isUnidentifiedCatalogItem } from '../items/unidentified-items.js'

export function itemTooltip(item, character = null, entry = null) {
  if (!item) return ''
  const presentation = resolveItemPresentation(item, entry)
  if (isUnidentifiedCatalogItem(item)) {
    const lines = [presentation.displayName, presentation.displayDesc].filter(Boolean)
    if (isGmMode()) lines.push(...itemGmTooltipLines(presentation))
    return lines.join('\n')
  }
  const lines = [
    presentation.displayName,
    `${titleCase(item.rarity || 'common')} ${titleCase(item.type || 'item')} · ${titleCase(item.source || 'shop')}`
  ]
  if (entry) {
    const crafted = craftedByLabel(entry, character)
    if (crafted) lines.push(crafted)
    if (itemHasCounter(item)) {
      lines.push(`${itemCounterLabel(item)}: ${inventoryCounterValue(entry, item)}`)
    }
    if (entry.playerNotes) lines.push('', `Your notes: ${entry.playerNotes}`)
  }
  if (presentation.displayDesc) lines.push('', presentation.displayDesc)
  if (item.damage) lines.push(`Damage: ${item.damage}`)
  const hands = weaponHandednessLabel(item)
  if (hands) lines.push(`Hands: ${hands}`)
  const offLabel = offhandTypeLabel(item)
  if (offLabel) lines.push(`Off-hand type: ${offLabel}`)
  lines.push(...instrumentAmplifyTooltipLines(item))
  lines.push(`Stats: ${formatStatModifiers(item.statModifiers)}`)
  if (item.specialEffects?.length) {
    lines.push('', `Special: ${sentenceList(item.specialEffects)}`)
    lines.push(...effectDetailLines(item.specialEffects))
  }
  if (Number(item.enchantmentSlots || 0)) lines.push(`Enchantment Slots: ${item.enchantmentSlots} (apply from Inventory when gear is equipped)`)
  if (item.price || item.value) lines.push(`Price/Value: ${formatCurrency(itemPriceGil(item))}`)
  if (isShopPurchaseItem(item) && !isGmMode()) {
    const need = shopMinLevelForItem(item)
    const level = character ? computeSkillLevel(character).skillLevel : null
    lines.push(level != null && level >= need ? `Shop: unlocked (Skill Level ${need}+)` : `Shop: requires Skill Level ${need}`)
  }
  const elements = formatElementalAffinities(item.elementalAffinities)
  if (elements) lines.push(elements)
  const recipe = formatCraftingRecipe(item.craftingRecipe)
  if (recipe) lines.push(recipe)
  if (character) lines.push(...itemCompareLines(item, character))
  if (isGmMode()) lines.push(...itemGmTooltipLines(presentation))
  return lines.filter(line => line !== undefined && line !== null).join('\n')
}

export function statTooltip(rule, { includeCost = false } = {}) {
  if (!rule) return ''
  const lines = [rule.label]
  if (includeCost) lines.push(`${rule.cost} Lumens / point`)
  if (rule.desc) lines.push('', rule.desc)
  return lines.join('\n')
}

export function statUpgradeTooltip(statKey, rule, character) {
  if (!rule || !character) return ''
  const current = Number(character.stats?.[statKey] ?? 0)
  const lines = [
    `Upgrade ${rule.label}`,
    isGmMode() ? 'Cost: Free (GM Mode)' : `Cost: ${rule.cost} Lumens`,
    `Current: ${current} (max ${rule.max})`
  ]
  if (current >= rule.max) lines.push('', 'Already at maximum.')
  else if (!isGmMode() && character.lumens < rule.cost) {
    lines.push('', `Not enough Lumens — you have ${character.lumens}, need ${rule.cost}.`)
  } else {
    lines.push('', `Adds +1 ${rule.label}. You have ${character.lumens} Lumens.`)
  }
  return lines.join('\n')
}

export function statRefundTooltip(statKey, rule, character) {
  if (!rule || !character) return ''
  const current = Number(character.stats?.[statKey] ?? 0)
  const base = Number(DEFAULT_STATS[statKey] ?? 0)
  const lines = [
    `Refund ${rule.label}`,
    `Returns: ${rule.cost} Lumens`,
    `Current: ${current} (base ${base})`
  ]
  if (current <= base) lines.push('', 'Already at starting value — nothing to refund.')
  else lines.push('', `Removes 1 purchased point and refunds ${rule.cost} Lumens.`)
  return lines.join('\n')
}

export function skillTooltip(skill, character = null) {
  if (!skill) return ''
  const owned = character?.skills?.includes(skill.id)
  const lines = [
    skill.name,
    `${displayCategory(skill.category)} / ${titleCase(skill.subcategory)} · Tier ${skill.tier || 1}`,
    `Cost: ${skill.cost || 0} Lumens · Stamina: ${Number(skill.staminaCost || 0)}`
  ]
  if (skill.desc) lines.push('', skill.desc)

  if (owned && skillHasEffectBreakdown(skill)) {
    const breakdown = resolveSkillEffectBreakdown(character, skill)
    const breakdownLine = formatSkillEffectBreakdownPlain(breakdown)
    if (breakdownLine) lines.push('', breakdownLine)
  }

  const activations = resolveActivationEffects(skill)
  if (activations.length) {
    lines.push('', 'On use (tier-based proc chance):')
    const preview = character && isMusicianPerformanceSkill(skill)
      ? applyInstrumentToActivations(
        character,
        skill,
        activations,
        { encoreReplay: canEncoreReplay(character, skill.id) }
      )
      : activations
    lines.push(...preview.map(entry => {
      const effect = cache.effectDefinitions[entry.effectId]
      const label = effect?.name || entry.effectId
      const chance = entry.chance < 1 ? ` · ${Math.round(entry.chance * 100)}% chance` : ''
      return `• ${label} (${entry.duration} turn${entry.duration === 1 ? '' : 's'})${chance}`
    }))
  }

  if (character && isMusicianPerformanceSkill(skill)) {
    const amp = getCharacterInstrumentAmplify(character)
    const encoreReady = canEncoreReplay(character, skill.id)
    if (encoreReady) {
      lines.push('', 'Encore ready: replay this song at base length only (free — no instrument or Long Set bonus).')
    } else if (amp) {
      lines.push('', `Off-hand instrument: +${amp.extraTurns} sustain turn${amp.extraTurns === 1 ? '' : 's'}${amp.performerCount > 1 ? `; count as ${amp.performerCount} Musicians` : ''}${amp.listenerBonus ? `; listeners +${amp.listenerBonus} from you` : ''}.`)
    } else {
      lines.push('', 'No instrument equipped — vocal performance only (equip an off-hand instrument to amplify).')
    }
  }

  const ongoing = resolveSkillEffects(skill)
  if (ongoing.length) {
    lines.push('', 'Ongoing / passive links:')
    lines.push(...effectDetailLines(ongoing))
  }
  lines.push(`Prerequisite: ${prereqLabel(skill)}`)
  const conflicts = cache.incompatibilities[skill.id] || []
  if (conflicts.length) lines.push(`Conflicts: ${conflicts.map(id => getSkill(id)?.name || titleCase(id)).join(', ')}`)
  if (isToggleSkill(skill)) lines.push('Type: Toggle / active skill')
  if (skill.elementalType) lines.push(`Element: ${titleCase(skill.elementalType)}`)
  if (skill.lootType) lines.push(`Loot Type: ${titleCase(skill.lootType)}`)
  if (skill.fusionType) lines.push(`Fusion Type: ${titleCase(skill.fusionType)}`)
  return lines.join('\n')
}
