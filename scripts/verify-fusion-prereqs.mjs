#!/usr/bin/env node
/**
 * Fusion requirement rule: every fusion needs exactly two normal (non-fusion)
 * skills from two different trees, each of the fusion's tier or one below.
 * Run: node scripts/verify-fusion-prereqs.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const skills = JSON.parse(fs.readFileSync(path.join(root, 'data', 'json', 'skills.json'), 'utf8'))

const byId = new Map()
;(function walk(node, trail) {
  if (Array.isArray(node)) {
    for (const skill of node) if (skill?.id) byId.set(skill.id, { skill, tree: trail.slice(0, 2).join('/') })
    return
  }
  if (node && typeof node === 'object') for (const [key, value] of Object.entries(node)) walk(value, [...trail, key])
})(skills, [])

const problems = []
let checked = 0
for (const { skill, tree } of byId.values()) {
  if (!tree.startsWith('fusion/')) continue
  checked += 1
  const ids = skill.prerequisites?.skills || []
  if (ids.length !== 2) problems.push(`${skill.id}: needs exactly 2 skills, has ${ids.length}`)
  const parents = ids.map(id => byId.get(id))
  parents.forEach((parent, i) => {
    if (!parent) return problems.push(`${skill.id}: unknown skill ${ids[i]}`)
    if (parent.tree.startsWith('fusion/')) problems.push(`${skill.id}: requires another fusion (${ids[i]})`)
    const tier = Number(parent.skill.tier)
    if (tier !== skill.tier && tier !== skill.tier - 1) {
      problems.push(`${skill.id} (Tier ${skill.tier}): ${ids[i]} is Tier ${tier}, expected ${skill.tier - 1} or ${skill.tier}`)
    }
  })
  if (parents.length === 2 && parents[0] && parents[1] && parents[0].tree === parents[1].tree) {
    problems.push(`${skill.id}: both skills come from ${parents[0].tree}`)
  }
}

if (problems.length) {
  console.error(`verify-fusion-prereqs: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`verify-fusion-prereqs: ok (${checked} fusions)`)
