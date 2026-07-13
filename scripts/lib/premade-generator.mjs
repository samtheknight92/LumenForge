import fs from 'fs'
import path from 'path'

/**
 * Shared helpers for building premade characters (skill prerequisite
 * expansion, inventory helpers, monster defeat-loot lookup, defeat-reward
 * constants). The actual stat/skill/gear CONTENT for the leveled roster lives
 * in leveled-premade-data.mjs + threat-solver.mjs — this file only keeps the
 * plumbing both the old and new generators needed.
 */

/** Defeat loot — wallet on sheet equals what the party loots. */
export const LUMEN_PER_LEVEL = 3
export const GIL_PER_LEVEL = 200
export const HUMANOID_MONSTER_GIL = 20

/** Goblins, orcs, bandits, etc. — Lumen like other monsters + flat pocket Gil. */
export function isHumanoidMonster(stem) {
  return /goblin|orc|bandit|brute|warrior|raider|chief|lieutenant|warlord|knight|guard|torturer|slave|shaman|hell_knight|corrupt_guard|crime_boss|warlord_lieutenant|berserker|giant/.test(String(stem || '').toLowerCase())
}

export function lumenDropForLevel(level) {
  return Math.max(0, Math.floor(Number(level || 0) * LUMEN_PER_LEVEL))
}

export function gilDropForLevel(level) {
  return Math.max(0, Math.floor(Number(level || 0) * GIL_PER_LEVEL))
}

export function formatDefeatLootNote(lumens, gil) {
  const parts = []
  if (lumens > 0) parts.push(`${lumens} Lumens`)
  if (gil > 0) parts.push(`${gil} Gil`)
  return parts.length ? `Defeat loot: ${parts.join(', ')}.` : ''
}

export function loadGeneratorData(root) {
  const jsonDir = path.join(root, 'data', 'json')
  const skills = JSON.parse(fs.readFileSync(path.join(jsonDir, 'skills.json'), 'utf8'))
  const itemsRoot = JSON.parse(fs.readFileSync(path.join(jsonDir, 'items.json'), 'utf8'))
  const monsterLoot = JSON.parse(fs.readFileSync(path.join(jsonDir, 'monster-loot.json'), 'utf8'))
  const skillMeta = JSON.parse(fs.readFileSync(path.join(jsonDir, 'skill-meta.json'), 'utf8'))
  const itemIds = new Set()
  for (const group of Object.values(itemsRoot)) {
    if (!group || typeof group !== 'object') continue
    for (const item of Object.values(group)) {
      if (item?.id) itemIds.add(item.id)
    }
  }
  for (const loot of Object.values(monsterLoot)) {
    if (loot?.id) itemIds.add(loot.id)
  }
  const skillById = indexSkills(skills)
  const toggleSkills = new Set(Object.keys(skillMeta.TOGGLE_BONUSES || {}))
  return { skillById, itemIds, monsterLoot, toggleSkills }
}

function indexSkills(skillsRoot) {
  const skillById = new Map()
  const walk = (node, category = null, subcategory = null) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const skill of node) {
        if (!skill?.id || skillById.has(skill.id)) continue
        skillById.set(skill.id, { ...skill, category, subcategory })
      }
      return
    }
    for (const [key, value] of Object.entries(node)) {
      if (Array.isArray(value)) walk(value, category || key, category ? key : null)
      else if (value && typeof value === 'object') walk(value, category || key, key)
    }
  }
  walk(skillsRoot)
  return skillById
}

export function pathToSkill(skillById, skillId) {
  const chain = []
  const visiting = new Set()
  function walk(id) {
    if (!id || visiting.has(id)) return
    const skill = skillById.get(id)
    if (!skill) return
    visiting.add(id)
    const prereqs = skill.prerequisites?.skills || []
    if (skill.prerequisites?.type === 'OR' && prereqs.length) {
      walk(prereqs[0])
    } else {
      for (const pre of prereqs) walk(pre)
    }
    chain.push(id)
  }
  walk(skillId)
  return chain
}

export function expandSkillTargets(targets, skillById) {
  const out = new Set()
  for (const target of targets) {
    for (const id of pathToSkill(skillById, target)) out.add(id)
  }
  return [...out].filter(id => skillById.has(id))
}

export function makeInventory(itemSpecs, itemIds) {
  const inventory = []
  const equipped = { weapon: null, offhand: null, armor: null, accessory: null }
  for (const spec of itemSpecs) {
    if (!spec?.itemId || !itemIds.has(spec.itemId)) continue
    const uid = `premade_${spec.itemId}_${inventory.length}`
    inventory.push({ uid, itemId: spec.itemId, qty: Math.max(1, Number(spec.qty || 1)) })
    if (spec.equip && equipped[spec.equip] === null) equipped[spec.equip] = uid
  }
  return { inventory, equipped }
}

export function addEquipFromMap(equipMap, itemIds, inventory, equipped) {
  for (const [slot, itemId] of Object.entries(equipMap || {})) {
    if (!itemId || !itemIds.has(itemId)) continue
    let entry = inventory.find(row => row.itemId === itemId)
    if (!entry) {
      entry = { uid: `premade_${itemId}_${inventory.length}`, itemId, qty: 1 }
      inventory.push(entry)
    }
    if (slot in equipped) equipped[slot] = entry.uid
  }
}

/** Collapse a monster's skill list to the highest upgrade per loot chain, so a
 * dragon with claws+razor_claws+venomous_claws only drops the venomous_claws loot. */
const MONSTER_SKILL_CHAINS = {
  tough_skin: ['rock_skin', 'metal_skin'],
  rock_skin: ['metal_skin'],
  claws: ['razor_claws', 'venomous_claws'],
  razor_claws: ['venomous_claws'],
  bite_attack: ['crushing_bite'],
  tail_swipe: ['spiked_tail'],
  regeneration: ['rapid_healing']
}

function highestLootSkill(skillIds) {
  const owned = new Set(skillIds)
  const processed = new Set()
  const lootSkills = []
  for (const skillId of skillIds) {
    if (processed.has(skillId)) continue
    let highest = skillId
    for (const [base, chain] of Object.entries(MONSTER_SKILL_CHAINS)) {
      const inChain = skillId === base || chain.includes(skillId)
      if (!inChain) continue
      processed.add(base)
      chain.forEach(id => processed.add(id))
      if (owned.has(base)) highest = base
      for (const upgrade of chain) {
        if (owned.has(upgrade)) highest = upgrade
      }
    }
    if (!processed.has(skillId)) processed.add(skillId)
    lootSkills.push(highest)
  }
  return [...new Set(lootSkills)]
}

export function monsterDropLoot(skillIds, monsterLoot, itemIds) {
  const items = []
  const seen = new Set()
  for (const skillId of highestLootSkill(skillIds)) {
    const loot = monsterLoot[skillId]
    if (!loot?.id || seen.has(loot.id) || !itemIds.has(loot.id)) continue
    seen.add(loot.id)
    items.push({ itemId: loot.id, qty: 1 })
  }
  return items
}
