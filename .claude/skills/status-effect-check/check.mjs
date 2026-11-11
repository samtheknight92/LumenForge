#!/usr/bin/env node
/**
 * status-effect-check — read-only report. Never writes to game data.
 * Run from the repo root: node .claude/skills/status-effect-check/check.mjs [--all]
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const effects = read('data/json/effects.json')
const skillsJson = read('data/json/skills.json')
const items = read('data/json/items.json')
const races = read('data/json/races.json')
const MAX = process.argv.includes('--all') ? Infinity : 8

// Statuses a player or GM puts on someone in play (not per-skill passive records).
const STATUS_TYPES = new Set(['control', 'debuff', 'statDebuff', 'vulnerability', 'damageOverTime', 'buff', 'statBuff', 'protection', 'healOverTime', 'recovery', 'toggleBuff', 'heal'])
// Weapon perks ("burn_on_hit") and auras are triggers, not statuses; immunities and resistances are lasting traits.
const isTrigger = e => /_on_hit$|_aura$|^remove_/.test(e.id)
const isTrait = e => /immunity|resistance/i.test(e.id)
const statuses = Object.values(effects).filter(e => STATUS_TYPES.has(e.type) && !isTrigger(e))

const skills = []
const walk = n => { if (Array.isArray(n)) n.forEach(s => s?.id && skills.push(s)); else if (n && typeof n === 'object') Object.values(n).forEach(walk) }
walk(skillsJson)
const allItems = Object.values(items).flatMap(c => Object.values(c))
const allText = [...skills.map(s => s.desc), ...allItems.map(i => i.desc), ...Object.values(races).flatMap(r => [r.description, ...(r.passiveTraits || [])])].join(' \n ')

// Where each status is used.
const usedBy = new Map()
const use = (id, who) => { if (!usedBy.has(id)) usedBy.set(id, []); usedBy.get(id).push(who) }
for (const s of skills) {
  for (const a of s.activationEffects || []) if (a?.effectId) use(a.effectId, s.name)
  for (const id of s.specialEffects || []) use(id, s.name)
}
for (const it of allItems) for (const id of it.specialEffects || []) use(id, it.name)

// Statuses can also be switched on by career buffs, toggles or code (skill-meta and js/), or share a skill's id.
const skillIds = new Set(skills.map(s => s.id))
const metaText = fs.readFileSync(path.join(root, 'data/json/skill-meta.json'), 'utf8')
const codeText = (function readJs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).map(f => f.isDirectory() ? readJs(path.join(dir, f.name)) : f.name.endsWith('.js') ? fs.readFileSync(path.join(dir, f.name), 'utf8') : '').join('\n')
})(path.join(root, 'js'))
const referenced = id => usedBy.has(id) || skillIds.has(id) || metaText.includes(`"${id}"`) || codeText.includes(`'${id}'`)

const STAT_WORDS = { strength: 'strength', speed: 'speed', 'magic power': 'magicPower', accuracy: 'accuracy', 'physical defence': 'physicalDefence', 'magical defence': 'magicalDefence', hp: 'hp', stamina: 'stamina' }
const groups = []
const add = (title, why, rows) => { if (rows.length) groups.push({ title, why, rows }) }

// 1. Text vs numbers.
const textVsData = []
for (const e of statuses) {
  const d = e.desc
  const dm = d.match(/for (\d+) turns?/i)
  if (dm && Number(dm[1]) !== Number(e.duration)) textVsData.push(`**${e.name}**: text says "for ${dm[1]} turns" but it lasts ${e.duration} turns in the app. → Make both ${e.duration} (or both ${dm[1]}).`)
  for (const [word, key] of Object.entries(STAT_WORDS)) {
    if ((key === 'hp' || key === 'stamina') && /per turn|each turn|regain|restore|lose/i.test(d)) continue
    const m = d.match(new RegExp(`([+\\-−]\\s?\\d+)\\s+${word}\\b|${word}\\s+(?:is\\s+)?(?:reduced|lowered) by (\\d+)|${word}\\s*([+\\-−]\\d+)`, 'i'))
    if (!m) continue
    const said = m[1] ? Number(m[1].replace('−', '-').replace(/\s/g, '')) : m[2] ? -Number(m[2]) : Number(m[3].replace('−', '-'))
    const real = e.statModifiers?.[key]
    if (real === undefined) textVsData.push(`**${e.name}**: text says ${said > 0 ? '+' : ''}${said} ${word}, but the app changes no ${word}. → Add ${key}: ${said} to the status, or drop it from the text.`)
    else if (real !== said) textVsData.push(`**${e.name}**: text says ${said > 0 ? '+' : ''}${said} ${word}, the app applies ${real > 0 ? '+' : ''}${real}. → Make them match.`)
  }
  if (/all (?:major )?stats/i.test(d) && e.statModifiers) {
    const missing = ['strength', 'magicPower', 'accuracy', 'speed', 'physicalDefence', 'magicalDefence'].filter(k => !(k in e.statModifiers))
    if (missing.length) textVsData.push(`**${e.name}**: text says "all stats", but the app leaves ${missing.join(', ')} alone. → Say exactly which stats ("Strength, Speed, Magic Power and Accuracy −2").`)
  }
  const hm = d.match(/(\d+) HP per turn/i)
  if (hm && e.tickHeal !== undefined && Number(hm[1]) !== Number(e.tickHeal)) textVsData.push(`**${e.name}**: text heals ${hm[1]} HP a turn, the app heals ${e.tickHeal}. → Make them match.`)
}
add('Text and app numbers disagree', 'The player reads the text; the app applies the numbers. When they differ the table argues about which is right.', textVsData)

// 2. Never ends.
add('Statuses with no end', 'A status with no duration stays on the sheet until someone remembers to remove it, and Process Turn cannot tick it down.',
  statuses.filter(e => !isTrait(e) && ['control', 'debuff', 'statDebuff', 'damageOverTime', 'buff', 'statBuff', 'protection', 'healOverTime', 'vulnerability'].includes(e.type) && (!Number(e.duration) || Number(e.duration) >= 99) && !/until|while|permanent|instant/i.test(e.desc))
    .map(e => `**${e.name}** (${e.type}): duration ${e.duration}. → Give it a number of turns, or say "until …" in the text.`))

// 3. Two statuses doing the same job.
const overlaps = []
for (const a of statuses) for (const b of statuses) {
  if (a.id >= b.id || a.type !== b.type) continue
  const coverRe = n => new RegExp(`(?:covers|variant|same as|counts as)[^.]*\\b${n}|\\b${n}\\b[^.]*(?:variant)`, 'i')
  const covers = coverRe(b.name).test(a.desc) || coverRe(a.name).test(b.desc) || coverRe(b.name.replace(/ed$/, '')).test(a.desc) || coverRe(a.name.replace(/ed$/, '')).test(b.desc)
  const statSize = Object.values(a.statModifiers || {}).reduce((t, v) => t + Math.abs(v), 0)
  const sameStats = a.name !== b.name && ['control', 'debuff', 'statDebuff', 'statBuff', 'protection'].includes(a.type) && statSize >= 3 &&
    a.statModifiers && b.statModifiers && JSON.stringify(a.statModifiers) === JSON.stringify(b.statModifiers)
  if (covers || sameStats) overlaps.push(`**${a.name}** and **${b.name}** (${a.type}): ${covers ? 'one status\'s text says it covers the other' : 'identical stat changes'}. "${a.desc.slice(0, 90)}" / "${b.desc.slice(0, 90)}" → Merge them, or give each a clearly different job.`)
}
// Skills whose text describes one status but apply another.
for (const s of skills) for (const a of s.activationEffects || []) {
  const e = effects[a.effectId]; if (!e) continue
  for (const other of statuses) {
    if (other.id === e.id || other.type !== 'control' || e.type !== 'control') continue
    if (new RegExp(`\\b${other.name}\\b|\\b${other.name.replace(/ed$/, '')}\\b|terror|flee`, 'i').test(s.desc.replace(new RegExp(e.name, 'gi'), '')) && other.id === 'fear') {
      overlaps.push(`**${s.name}** describes fear but applies **${e.name}**, while a separate **Fear** status exists. Fear Immunity will not protect against it. → Apply Fear instead.`)
    }
  }
}
add('Statuses that overlap', 'Two statuses for the same idea means some skills use one and some the other, and immunities only block one.', [...new Set(overlaps)])

// 3b. Same name, two records.
const byName = new Map()
for (const e of statuses) { const k = e.name.toLowerCase(); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(e) }
add('Two statuses with the same name', 'Players see one name but the app has two different records, which can carry different numbers.',
  [...byName.values()].filter(l => l.length > 1).map(l => `**${l[0].name}**: ${l.map(e => `${e.id} (${e.duration} turns: "${e.desc.slice(0, 60)}…")`).join(' vs ')} → Keep one.`))

// 4. Defined but never used / used but not defined.
const unused = statuses.filter(e => !referenced(e.id) && !new RegExp(`\\b${e.name}\\b`, 'i').test(allText))
add('Statuses nothing uses', 'These are in the status list but no skill, item or race ever applies or mentions them. Either give them a source or remove them so the list stays short for new players.', unused.map(e => `**${e.name}** (${e.type})`))
const undef = [...usedBy.keys()].filter(id => !effects[id])
add('Used but not defined', 'A skill or item points to a status that does not exist, so the app silently skips it.', undef.map(id => `**${id}** used by ${usedBy.get(id).slice(0, 4).join(', ')}`))

// 5. Immunities.
const immun = []
for (const e of Object.values(effects)) for (const id of e.immunities || []) if (!effects[id]) immun.push(`**${e.name}** grants immunity to "${id}", which is not a status. → Point it at a real status id.`)
for (const e of Object.values(effects).filter(x => /_immunity$/.test(x.id))) {
  const target = e.id.replace(/_immunity$/, '')
  if (!effects[target] && /disease|sleep|stun|paraly/.test(target)) immun.push(`**${e.name}** exists, but there is no "${target}" status for it to block.`)
  else if (!effects[target]) continue
  else if (!(e.immunities || []).includes(target)) immun.push(`**${e.name}** does not list "${target}" in its immunities, so the app will not block it automatically.`)
}
add('Immunity problems', 'An immunity that points at nothing, or is not wired up, does not protect the player.', immun)

// 6. Rules the app cannot enforce, or borrowed terms.
const manual = statuses.filter(e => /cannot cast|disadvantage|advantage|cannot (?:willingly )?approach|must move away/i.test(e.desc))
  .map(e => `**${e.name}**: "${e.desc.match(/[^.]*(?:cannot cast|disadvantage|advantage|cannot (?:willingly )?approach|must move away)[^.]*/i)[0].trim()}" → ${/advantage/i.test(e.desc) ? 'Advantage/Disadvantage is not defined in the Glossary; use "−2 to attack rolls" or define it.' : 'The app cannot enforce this; add "(GM rules this at the table)" so players know.'}`)
add('Rules only the table can enforce', 'Fine to have, but say so, or players will assume the app handles it.', manual)

// 7. Stacking damage.
add('Stacking damage with no cap', 'If a status stacks with no limit, several hits in one fight can pile up far more damage than any single skill deals.',
  statuses.filter(e => e.stackable && ['damageOverTime', 'statDebuff', 'debuff'].includes(e.type) && !/max|up to|cap/i.test(e.desc)).map(e => `**${e.name}**: stackable, no cap. → Add "stacks up to 3 times" or make it refresh instead of stack.`))

const out = [`# Status effect check — ${statuses.length} statuses (of ${Object.keys(effects).length} effect records)`, '']
for (const g of groups) {
  out.push(`## ${g.title} — ${g.rows.length}`, '', `Why: ${g.why}`, '')
  for (const r of g.rows.slice(0, MAX)) out.push(`- ${r}`)
  if (g.rows.length > MAX) out.push(`- …and ${g.rows.length - MAX} more (run with --all).`)
  out.push('')
}
out.push(`Summary: ${groups.reduce((t, g) => t + g.rows.length, 0)} issues in ${groups.length} groups.`)
console.log(out.join('\n'))
