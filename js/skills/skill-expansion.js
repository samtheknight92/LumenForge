import { getSkill } from '../core/cache.js'

function pathToSkill(skillId) {
  const chain = []
  const visiting = new Set()
  function walk(id) {
    if (!id || visiting.has(id)) return
    const skill = getSkill(id)
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

/** Expand skill targets to include prerequisite chains (browser-safe). */
export function expandSkillTargets(targets) {
  const out = new Set()
  for (const target of targets || []) {
    for (const id of pathToSkill(target)) {
      if (getSkill(id)) out.add(id)
    }
  }
  return [...out]
}
