#!/usr/bin/env node
/**
 * monster-threat-check — read-only report. Never writes to game data.
 * Checks premade monsters, NPCs and pedestrians against others of the same level:
 * how hard they hit, how long they last, and whether higher levels are actually tougher.
 * Run from the repo root: node .claude/skills/monster-threat-check/check.mjs [--all]
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const premades = read('data/json/premade-characters.json')
const items = read('data/json/items.json')
const skillsJson = read('data/json/skills.json')
const MAX = process.argv.includes('--all') ? Infinity : 10

const itemById = new Map(); for (const c of Object.values(items)) for (const x of Object.values(c)) itemById.set(x.id, x)
const skillById = new Map(); const walk = n => { if (Array.isArray(n)) n.forEach(s => s?.id && skillById.set(s.id, s)); else if (n && typeof n === 'object') Object.values(n).forEach(walk) }; walk(skillsJson)
const median = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0 }
const avgDice = t => { const m = String(t).match(/(\d+)d(\d+)/); return m ? m[1] * (Number(m[2]) + 1) / 2 : 0 }
const hit = (acc, def) => Math.max(0.05, Math.min(0.95, (21 - (def - acc)) / 20))
const r1 = x => Math.round(x * 10) / 10

/** Average of a hit when every hit deals at least 1 (the app's minimum damage rule). */
const avgMin1 = (diceText, mod) => {
  const m = String(diceText).match(/(\d+)d(\d+)/)
  if (!m) return Math.max(1, mod)
  let dist = new Map([[0, 1]])
  for (let i = 0; i < Number(m[1]); i++) {
    const next = new Map()
    for (const [t, p] of dist) for (let f = 1; f <= Number(m[2]); f++) next.set(t + f, (next.get(t + f) || 0) + p / Number(m[2]))
    dist = next
  }
  let e = 0
  for (const [t, p] of dist) e += Math.max(1, t + mod) * p
  return e
}

function profile(p) {
  const st = { ...p.stats }
  const inv = new Map((p.inventory || []).map(i => [i.uid, i.itemId]))
  const gear = Object.values(p.equipped || {}).map(uid => itemById.get(inv.get(uid))).filter(Boolean)
  for (const g of gear) for (const [k, v] of Object.entries(g.statModifiers || {})) st[k] = (st[k] || 0) + v
  const weapon = gear.find(g => g.type === 'weapon')
  const weaponAtk = { name: weapon ? weapon.name : 'unarmed', dmg: avgMin1(weapon ? weapon.damage : '1d4', st.strength), vs: 'physicalDefence' }
  // Best damage skill it knows (dice + Magic Power or Strength, or weapon damage + Strength).
  let best = weaponAtk
  for (const id of p.skills || []) {
    const s = skillById.get(id); if (!s || /^Passive/i.test(s.desc) || !/attack roll|save or take|takes \d+d/i.test(s.desc)) continue
    const magical = /magical defence/i.test(s.desc)
    const dmg = /weapon damage/i.test(s.desc) ? avgDice(s.desc) + weaponAtk.dmg : avgMin1(s.desc, magical ? st.magicPower : st.strength)
    if (dmg > best.dmg) best = { name: s.name, dmg, vs: magical ? 'magicalDefence' : 'physicalDefence' }
  }
  const lv = Number((p.premadeId.match(/_lv0*(\d+)_/) || [])[1] || 0)
  return { p, lv, band: Math.ceil(lv / 5), st, best, hp: st.hp }
}
const all = premades.map(profile).filter(x => x.lv)
// Reference player at each level band: the NPCs (they are built like player characters).
const bands = [...new Set(all.map(x => x.band))].sort((a, b) => a - b)
const ref = {}
for (const b of bands) {
  const npcs = all.filter(x => x.band === b && x.p.category === 'npc')
  ref[b] = { pd: median(npcs.map(x => x.st.physicalDefence)), md: median(npcs.map(x => x.st.magicalDefence)), hp: median(npcs.map(x => x.hp)), dmg: median(npcs.map(x => Math.max(0, x.best.dmg))), acc: median(npcs.map(x => x.st.accuracy)) }
}
for (const x of all) {
  const R = ref[x.band]
  x.dpt = Math.max(0, x.best.dmg) * hit(x.st.accuracy, R[x.best.vs === 'magicalDefence' ? 'md' : 'pd'])
  x.turnsToKillPC = x.dpt ? R.hp / x.dpt : Infinity
  const pcDpt = R.dmg * hit(R.acc, x.st.physicalDefence)
  x.turnsToDrop = pcDpt ? x.hp / pcDpt : Infinity
}

const out = ['# Monster and NPC threat check', '', `${all.length} premades by level (from their id). "A player" at each level = the median NPC of that level band, since NPCs are built like player characters.`, '']
out.push('## Level curve (monsters)', '', '| Levels | Median HP | Median damage a turn vs a player | Turns to drop a player | Turns a player needs to drop it |', '|---|---|---|---|---|')
for (const b of bands) {
  const m = all.filter(x => x.band === b && x.p.category === 'monster')
  out.push(`| ${(b - 1) * 5 + 1}–${b * 5} | ${median(m.map(x => x.hp))} | ${r1(median(m.map(x => x.dpt)))} | ${r1(median(m.map(x => Math.min(99, x.turnsToKillPC))))} | ${r1(median(m.map(x => Math.min(99, x.turnsToDrop))))} |`)
}
const flags = []
const harmless = all.filter(x => x.p.category !== 'pedestrian' && x.best.dmg <= 1.5)
for (const x of all) {
  if (harmless.includes(x)) continue
  const peers = all.filter(y => y.band === x.band && y.p.category === x.p.category && y !== x)
  const mDpt = median(peers.map(y => y.dpt)); const mHp = median(peers.map(y => y.hp))
  const tag = `**${x.p.name}** (${x.p.category}, level ${x.lv})`
  if (mDpt && Math.abs(x.dpt - mDpt) >= 2 && (x.dpt >= mDpt * 2.5 || x.dpt <= mDpt * 0.35)) flags.push(`${tag}: deals about ${r1(x.dpt)} damage a turn with ${x.best.name}, while other level ${(x.band - 1) * 5 + 1}–${x.band * 5} ${x.p.category}s deal ${r1(mDpt)}. → ${x.dpt > mDpt ? 'Mark it as a boss or lower its damage.' : 'Raise its damage or lower its level.'}`)
  if (mHp && Math.abs(x.hp - mHp) >= 5 && (x.hp >= mHp * 2.5 || x.hp <= mHp * 0.35)) flags.push(`${tag}: has ${x.hp} HP, while its peers have about ${mHp}. → ${x.hp > mHp ? 'Mark it as tanky in its notes, or trim HP.' : 'Raise HP so it survives a hit.'}`)
}
// Level inversions: a monster two bands up that is weaker on both counts than the median two bands down.
const inv = []
for (const x of all.filter(y => y.p.category === 'monster' && y.band >= 3)) {
  const low = all.filter(y => y.p.category === 'monster' && y.band === x.band - 2)
  if (x.dpt < median(low.map(y => y.dpt)) && x.hp < median(low.map(y => y.hp))) inv.push(`**${x.p.name}** (level ${x.lv}) hits softer and has less HP than a typical level ${(x.band - 3) * 5 + 1}–${(x.band - 2) * 5} monster. A GM picking by level will be surprised.`)
}
const quick = all.filter(x => x.p.category === 'monster' && x.turnsToDrop < 1)
out.push('', `## Barely hurt anyone (${harmless.length})`, '', 'Monsters and NPCs whose best attack averages 1.5 damage or less, because their Strength or Magic Power is below zero, so most hits deal only the minimum 1 damage. By level band:', '')
for (const b of bands) {
  const h = harmless.filter(x => x.band === b); if (!h.length) continue
  out.push(`- Levels ${(b - 1) * 5 + 1}–${b * 5}: ${h.length} (${h.filter(x => x.p.category === 'monster').length} monsters, ${h.filter(x => x.p.category === 'npc').length} NPCs). e.g. ${h.slice(0, 4).map(x => `${x.p.name} lv ${x.lv}: ${x.best.name} ${r1(x.best.dmg)}`).join('; ')}`)
}
out.push('', 'Why it matters: fights against these drag on, chipping 1 HP at a time, which new GMs read as "the game is broken". → Have the premade generator raise the main damage stat to at least 0 before anything else.')
out.push('', `## Out of line with same-level peers (${flags.length})`, '', 'Compared with others of the same category and level band (5 levels).', '')
for (const f of flags.slice(0, MAX)) out.push(`- ${f}`)
if (flags.length > MAX) out.push(`- …and ${flags.length - MAX} more (run with --all).`)
out.push('', `## Higher level but weaker (${inv.length})`, '')
for (const f of inv.slice(0, MAX)) out.push(`- ${f}`)
if (inv.length > MAX) out.push(`- …and ${inv.length - MAX} more (run with --all).`)
out.push('', `## One-hit monsters (${quick.length})`, '', `Monsters a same-level player drops in under one turn on average: ${quick.slice(0, 15).map(x => `${x.p.name} (lv ${x.lv}, ${x.hp} HP)`).join(', ')}${quick.length > 15 ? ', …' : ''}.`)
console.log(out.join('\n'))
