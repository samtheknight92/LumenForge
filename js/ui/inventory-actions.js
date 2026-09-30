/**
 * Item actions: buying, crafting, equipping, enchanting, inventory
 * counters, stars, locks and the inventory sort and filter settings.
 */
import { state, activeCharacter } from '../core/state.js'
import { save } from '../core/storage.js'
import { render } from './render.js'
import { toast, clamp, titleCase } from '../core/utils.js'
import { computeStats, invalidateCharacterCache } from '../character/character.js'
import {
  getItem,
  addItemToInventory,
  addCraftedItemToInventory,
  shopPurchaseCheck,
  itemHasCounter,
  itemCounterLabel,
  inventoryCounterValue,
  itemBlocksUnequipWithCounter,
  itemBlocksRemoveWithCounter,
  itemBlocksRemoveWhenLocked,
  counterMaxValue,
  counterRulePhrase
} from '../items/items.js'
import {
  canEquipToMainHand,
  canEquipToOffhand,
  equippedSlotForEntry,
  getEquippedOffhand,
  getOffhandType,
  isTwoHandedWeapon,
  reconcileOffhandEquip
} from '../items/equipment.js'
import { itemPriceGil, normalizeGil } from './format.js'
import { isGmMode } from '../gm/gm-mode.js'
import { canCraftRecipe, deductMaterials, buildCraftMetadata, listCraftRecipes } from '../items/craft.js'
import { formatCraftBonusLabel } from '../items/craft-bonuses.js'
import {
  canApplyEnhancementToGear,
  createAppliedEnchantment,
  entryEnchantments,
  maxEnchantmentSlots,
  isEnhancementItem,
  isShieldEnchant,
  shieldEnchantWasUsed,
  shieldEnchantRemaining
} from '../items/enchantments.js'
import { touch, silentCharacterSave, characterById } from './action-helpers.js'

export function buyItem(itemId, free = false) {
  const character = activeCharacter()
  const item = getItem(itemId)
  if (!character || !item) return
  const isFree = free || isGmMode()
  const check = shopPurchaseCheck(character, item, { free: isFree })
  if (!check.ok) return toast(check.reason)
  const price = itemPriceGil(item)
  const current = normalizeGil(character.gil)
  if (!isFree) character.gil = current - price
  addItemToInventory(character, itemId, 1)
  touch(character)
  toast(`${item.name} ${isFree ? 'granted' : 'bought'}!`)
}

export function craftRecipe(recipeId) {
  const character = activeCharacter()
  const recipe = listCraftRecipes().find(row => row.id === recipeId)
  if (!character || !recipe) return toast('Unknown recipe.')
  const check = canCraftRecipe(character, recipe)
  if (!check.ok) return toast(check.reason)
  deductMaterials(character, recipe)
  const meta = buildCraftMetadata(character, recipe)
  addCraftedItemToInventory(character, recipe, meta)
  const bonus = formatCraftBonusLabel(meta.craftBonuses)
  touch(character)
  toast(bonus ? `${recipe.name} crafted (${bonus}).` : `${recipe.name} crafted.`)
}

export function grantCraftRecipe(recipeId) {
  const character = activeCharacter()
  const recipe = listCraftRecipes().find(row => row.id === recipeId)
  if (!character || !recipe) return toast('Unknown recipe.')
  if (!isGmMode()) return toast('Grant is GM Mode only.')
  addItemToInventory(character, recipe.id, 1)
  touch(character)
  toast(`${recipe.name} granted.`)
}

function equippedSlotForGearEntry(character, gearEntryUid) {
  for (const [slot, uid] of Object.entries(character?.equipped || {})) {
    if (uid === gearEntryUid) return slot
  }
  return null
}

export function applyEnchantment(gearEntryUid, scrollEntryUid) {
  const character = activeCharacter()
  if (!character || !gearEntryUid || !scrollEntryUid) return

  const gearEntry = character.inventory.find(row => row.uid === gearEntryUid)
  const scrollEntry = character.inventory.find(row => row.uid === scrollEntryUid)
  const gearItem = gearEntry && getItem(gearEntry.itemId)
  const scrollItem = scrollEntry && getItem(scrollEntry.itemId)
  if (!gearEntry || !scrollEntry || !gearItem || !scrollItem) return toast('Item not found.')

  const gearSlot = equippedSlotForGearEntry(character, gearEntryUid)
  if (!gearSlot) return toast('Equip the target weapon or armour first.')

  if (!isEnhancementItem(scrollItem)) return toast('That is not an enchantment item.')

  const check = canApplyEnhancementToGear(scrollItem, gearItem, gearSlot)
  if (!check.ok) return toast(check.reason)

  const maxSlots = maxEnchantmentSlots(gearEntry, gearItem)
  if (maxSlots <= 0) return toast(`${gearItem.name} has no enchantment slots.`)

  if (!Array.isArray(gearEntry.enchantments)) gearEntry.enchantments = []
  if (gearEntry.enchantments.length >= maxSlots) {
    return toast(`All ${maxSlots} slot${maxSlots === 1 ? '' : 's'} are full. Remove one first.`)
  }

  const applied = createAppliedEnchantment(scrollItem)
  if (!applied) return toast('Could not resolve enchant effect.')

  gearEntry.enchantments.push(applied)
  const qty = Math.max(1, Number(scrollEntry.qty || 1))
  if (qty > 1) scrollEntry.qty = qty - 1
  else character.inventory = character.inventory.filter(row => row.uid !== scrollEntryUid)

  invalidateCharacterCache(character)
  const computed = computeStats(character)
  character.hp = clamp(character.hp, 0, computed.hp)
  character.stamina = clamp(character.stamina, 0, computed.stamina)
  touch(character)
  toast(`${applied.name} applied to ${gearItem.name}.`)
}

export function removeEnchantment(gearEntryUid, enchantId) {
  const character = activeCharacter()
  if (!character || !gearEntryUid || !enchantId) return

  const gearEntry = character.inventory.find(row => row.uid === gearEntryUid)
  const gearItem = gearEntry && getItem(gearEntry.itemId)
  if (!gearEntry || !gearItem) return toast('Item not found.')

  const removed = entryEnchantments(gearEntry).find(row => row.id === enchantId)
  if (!removed) return toast('Enchantment not found.')

  gearEntry.enchantments = entryEnchantments(gearEntry).filter(row => row.id !== enchantId)

  const canReturn = removed.sourceItemId && (!isShieldEnchant(removed) || !shieldEnchantWasUsed(removed))
  if (canReturn) {
    addItemToInventory(character, removed.sourceItemId, 1)
  }

  invalidateCharacterCache(character)
  const computed = computeStats(character)
  character.hp = clamp(character.hp, 0, computed.hp)
  character.stamina = clamp(character.stamina, 0, computed.stamina)
  touch(character)
  const itemName = removed.sourceItemId && getItem(removed.sourceItemId)?.name
  if (isShieldEnchant(removed) && shieldEnchantWasUsed(removed)) {
    toast(`${removed.name || itemName || 'Barrier'} removed — crystal destroyed (not returned).`)
  } else if (itemName) {
    toast(`${removed.name || itemName} removed from ${gearItem.name} and returned to inventory.`)
  } else {
    toast(`Enchantment removed from ${gearItem.name}.`)
  }
}

export function recordEnchantShieldAbsorption(gearEntryUid, enchantId, amount) {
  const character = activeCharacter()
  if (!character || !gearEntryUid || !enchantId) return

  const gearEntry = character.inventory.find(row => row.uid === gearEntryUid)
  const gearItem = gearEntry && getItem(gearEntry.itemId)
  if (!gearEntry || !gearItem) return toast('Item not found.')

  const ench = entryEnchantments(gearEntry).find(row => row.id === enchantId)
  if (!ench || !isShieldEnchant(ench)) return toast('Not a barrier enchant.')

  const soak = Math.max(0, Number(amount) || 0)
  if (!soak) return toast('Enter how much magical damage to soak.')

  const before = shieldEnchantRemaining(ench)
  ench.shieldRemaining = Math.max(0, before - soak)

  if (ench.shieldRemaining <= 0) {
    gearEntry.enchantments = entryEnchantments(gearEntry).filter(row => row.id !== enchantId)
    invalidateCharacterCache(character)
    touch(character)
    toast(`${ench.name || 'Barrier Crystal'} spent — ${soak} magical damage soaked (pool empty).`)
    return
  }

  invalidateCharacterCache(character)
  touch(character)
  toast(`Soaked ${soak} magical damage — ${ench.shieldRemaining}/${ench.shieldMax} left on ${gearItem.name}.`)
}

export function removeInventoryEntry(entryUid) {
  const character = activeCharacter()
  if (!character) return
  const entry = character.inventory.find(row => row.uid === entryUid)
  const item = entry && getItem(entry.itemId)
  if (entry && itemBlocksRemoveWhenLocked(entry)) {
    return toast('This item is locked — unlock it before removing.')
  }
  if (entry && item && itemBlocksRemoveWithCounter(entry, item)) {
    const label = itemCounterLabel(item)
    return toast(`${item.name} cannot be removed while ${label} ${counterRulePhrase(item)} (now ${inventoryCounterValue(entry, item)}).`)
  }
  for (const slot of Object.keys(character.equipped)) {
    if (character.equipped[slot] === entryUid) character.equipped[slot] = null
  }
  character.inventory = character.inventory.filter(entry => entry.uid !== entryUid)
  touch(character)
}

export function equipItem(entryUid, slot = null) {
  const character = activeCharacter()
  const entry = character?.inventory.find(i => i.uid === entryUid)
  const item = entry && getItem(entry.itemId)
  if (!character || !entry || !item) return

  const isOffhandEquip = slot === 'offhand'

  if (isOffhandEquip) {
    const check = canEquipToOffhand(character, item)
    if (!check.ok) return toast(check.reason)
    const alreadyIn = equippedSlotForEntry(character, entry.uid)
    if (alreadyIn && alreadyIn !== 'offhand') {
      return toast(`${item.name} is already equipped (${titleCase(alreadyIn === 'offhand' ? 'off-hand' : alreadyIn)}).`)
    }
    character.equipped.offhand = entry.uid
    invalidateCharacterCache(character)
    touch(character)
    return toast(`${item.name} equipped (off-hand).`)
  }

  const type = String(item.type || '').toLowerCase()
  const equipSlot = canEquipToMainHand(item)
    ? 'weapon'
    : type.includes('armor')
      ? 'armor'
      : type.includes('accessory')
        ? 'accessory'
        : null
  if (!equipSlot) return toast('That item is not equipment.')

  const alreadyIn = equippedSlotForEntry(character, entry.uid)
  if (alreadyIn && alreadyIn !== equipSlot) {
    return toast(`${item.name} is already equipped (${titleCase(alreadyIn === 'offhand' ? 'off-hand' : alreadyIn)}).`)
  }

  if (equipSlot === 'weapon') {
    character.equipped.weapon = entry.uid
    if (isTwoHandedWeapon(item)) {
      character.equipped.offhand = null
    } else {
      const offItem = getEquippedOffhand(character)
      if (offItem && getOffhandType(offItem) === 'weapon') {
        character.equipped.offhand = null
      }
    }
    reconcileOffhandEquip(character)
  } else {
    character.equipped[equipSlot] = entry.uid
  }

  invalidateCharacterCache(character)
  const computed = computeStats(character)
  character.hp = clamp(character.hp, 0, computed.hp)
  character.stamina = clamp(character.stamina, 0, computed.stamina)
  touch(character)
  toast(`${item.name} equipped.`)
}

export function unequip(slot) {
  const character = activeCharacter()
  if (!character) return
  const entryUid = character.equipped[slot]
  const entry = entryUid ? character.inventory.find(row => row.uid === entryUid) : null
  const item = entry && getItem(entry.itemId)
  if (entry && item && itemBlocksUnequipWithCounter(entry, item)) {
    const label = itemCounterLabel(item)
    return toast(`${item.name} cannot be unequipped while ${label} ${counterRulePhrase(item)} (now ${inventoryCounterValue(entry, item)}).`)
  }
  character.equipped[slot] = null
  if (slot === 'weapon') character.equipped.offhand = null
  touch(character)
}

export function adjustInventoryCounter(entryUid, delta) {
  const character = activeCharacter()
  const entry = character?.inventory.find(row => row.uid === entryUid)
  const item = entry && getItem(entry.itemId)
  if (!character || !entry || !itemHasCounter(item)) return
  let next = Math.max(0, inventoryCounterValue(entry, item) + Number(delta || 0))
  const max = counterMaxValue(item)
  if (max != null) next = Math.min(next, max)
  entry.counter = next
  touch(character)
}

function inventoryEntryForCharacter(characterId, entryUid) {
  const character = characterById(characterId)
  if (!character) return { character: null, entry: null }
  const entry = character.inventory?.find(row => row.uid === entryUid)
  return { character, entry }
}

export function toggleInventoryEntryStar(entryUid) {
  const { character, entry } = inventoryEntryForCharacter(state.activeId, entryUid)
  if (!character || !entry) return
  entry.starred = !entry.starred
  touch(character)
}

export function toggleInventoryEntryLock(entryUid) {
  const { character, entry } = inventoryEntryForCharacter(state.activeId, entryUid)
  if (!character || !entry) return
  entry.locked = !entry.locked
  touch(character)
}

export function updateInventoryEntryPlayerNotes(characterId, entryUid, notes) {
  const { character, entry } = inventoryEntryForCharacter(characterId, entryUid)
  if (!character || !entry) return
  entry.playerNotes = String(notes || '').trim().slice(0, 2000) || undefined
  silentCharacterSave(character)
}

export function setInventorySort(sortId) {
  state.inventorySort = sortId || 'newest'
  render({ content: true })
}

export function setInventoryFilter(filterId) {
  state.inventoryFilter = filterId || 'all'
  render({ content: true })
}

export function setInventoryTagFilter(tag) {
  state.inventoryTagFilter = String(tag || '')
  render({ content: true })
}

export function setInventoryCursedOnly(checked) {
  state.inventoryCursedOnly = Boolean(checked)
  render({ content: true })
}

export function toggleCatalogItemStar(itemId) {
  const ids = new Set(state.starredCatalogItemIds || [])
  if (ids.has(itemId)) ids.delete(itemId)
  else ids.add(itemId)
  state.starredCatalogItemIds = [...ids]
  save()
  render({ content: true })
}

export function toggleRecipeStar(recipeId) {
  const character = activeCharacter()
  if (!character || !recipeId) return
  const ids = new Set(character.starredRecipeIds || [])
  if (ids.has(recipeId)) ids.delete(recipeId)
  else ids.add(recipeId)
  character.starredRecipeIds = [...ids]
  touch(character)
}
