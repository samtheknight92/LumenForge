#!/usr/bin/env node
/**
 * element-and-fusion-check — read-only report. Never writes to game data.
 * Run from the repo root: node .claude/skills/element-and-fusion-check/check.mjs [--all]
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/json/skills.json'), 'utf8'))
const effects = JSON.parse(fs.readFileSync(path.join(root, 'data/json/effects.json'), 'utf8'))
const showAll = process.argv.includes('--all')
const MAX = showAll ? Infinity : 8

const skills = []
const walk = (node, category, tree) => {
  if (Array.isArray(node)) { for (const s of node) if (s?.id) skills.push({ ...s, category, tree }); return }
  if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, category, tree ? `${tree}/${k}` : k)
}
for (const [c, t] of Object.entries(data)) walk(t, c, null)
const byId = new Map(skills.map(s => [s.id, s]))
const ELEMENTS = Object.keys(data.magic || {})
const effectByName = new Map(Object.values(effects).map(e => [e.name.toLowerCase(), e.id]))

const avg = (n, s) => n * (s + 1) / 2
const firstDice = t => { const m = String(t).match(/(\d+)d(\d+)/); return m ? avg(+m[1], +m[2]) : 0 }
function statusesOf(s) {
  const set = new Set((s.activationEffects || []).map(a => a.effectId).filter(Boolean))
  for (const m of String(s.desc).matchAll(/apply (?:both )?([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?: and ([A-Z][a-z]+(?: [A-Z][a-z]+)?))?/g)) {
    for (const n of [m[1], m[2]].filter(Boolean)) { const id = effectByName.get(n.toLowerCase()); if (id) set.add(id) }
  }
  return set
}
const targets = d => /per (?:creature|target|enemy)|each (?:enemy|creature|target)|radius|burst|cone|\bline\b|\barea\b/i.test(d) ? 2.5 : (/fire 2|two|2 shots/i.test(d) ? 2 : 1)
const THEMES = {
  'direct damage': /attack roll[^.]*damage|\d+d\d+ [a-z]* ?damage/i,
  'damage over time': /burn|poison|bleed|per turn|each turn/i,
  'lock down (stop moving)': /immobiliz|frozen|freeze|prison|cannot move|held|root/i,
  'disable (stop acting)': /incapacitat|stun|paraly|cannot act/i,
  'mind / fear': /fear|mind control|charm|nightmare|terror/i,
  'blind / vision': /blind|darkvision|illuminat|light \(|invisib|vision/i,
  healing: /\bheal|restore[^.]*hp|regenerat/i,
  'defence / shields': /shield|armou?r|barrier|wall|\+\d+ (physical|magical) defence|protected/i,
  'movement / mobility': /teleport|flight|fly|levitat|walk|step|speed|push|pull|knock/i,
  'terrain / area denial': /terrain|zone|wall|area|field|storm/i,
  'weaken / debuff': /weaken|\-\d+ |reduce|lower/i,
  'utility / exploration': /breath|purif|sense|create water|feather|light \(|detect/i
}
function profile(list) {
  const themes = {}
  for (const [name, re] of Object.entries(THEMES)) themes[name] = list.filter(s => re.test(s.desc)).length / list.length
  const statuses = new Set(list.flatMap(s => [...statusesOf(s)]))
  return { themes, statuses }
}
const cosine = (a, b) => {
  const k = Object.keys(a); let ab = 0, aa = 0, bb = 0
  for (const x of k) { ab += a[x] * b[x]; aa += a[x] ** 2; bb += b[x] ** 2 }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0
}
const jaccard = (a, b) => { const i = [...a].filter(x => b.has(x)).length; const u = new Set([...a, ...b]).size; return u ? i / u : 0 }

const out = [`# Element and fusion check — ${ELEMENTS.length} elements, ${skills.filter(s => s.category === 'fusion').length} fusions`, '']

// ---------- 1. Element identity ----------
const prof = Object.fromEntries(ELEMENTS.map(e => [e, profile(data.magic[e])]))
out.push('## 1. What each element is about', '')
for (const e of ELEMENTS) {
  const top = Object.entries(prof[e].themes).sort((a, b) => b[1] - a[1]).filter(x => x[1] > 0).slice(0, 3).map(([k, v]) => `${k} ${Math.round(v * 100)}%`)
  const own = [...prof[e].statuses].filter(st => ELEMENTS.every(o => o === e || !prof[o].statuses.has(st)))
  out.push(`- **${e}**: ${top.join(', ')}. Statuses: ${[...prof[e].statuses].join(', ') || 'none'}. Only this element: ${own.join(', ') || '**none**'}.`)
}
const pairs = []
for (let i = 0; i < ELEMENTS.length; i++) for (let j = i + 1; j < ELEMENTS.length; j++) {
  const a = ELEMENTS[i], b = ELEMENTS[j]
  pairs.push({ a, b, theme: cosine(prof[a].themes, prof[b].themes), status: jaccard(prof[a].statuses, prof[b].statuses) })
}
pairs.sort((x, y) => (y.theme + y.status) - (x.theme + x.status))
out.push('', '## 2. Elements that overlap most', '', 'Theme match = how alike the mix of skill types is (1.00 = identical). Status match = share of statuses both use.', '')
for (const p of pairs.slice(0, 6)) {
  const shared = [...prof[p.a].statuses].filter(s => prof[p.b].statuses.has(s))
  const flag = p.theme >= 0.9 && p.status >= 0.4
  out.push(`- ${flag ? '⚠ ' : ''}**${p.a} / ${p.b}**: theme match ${p.theme.toFixed(2)}, status match ${p.status.toFixed(2)}${shared.length ? ` (both use ${shared.join(', ')})` : ''}.${flag ? ' These two feel alike in play; give one a clearer job.' : ''}`)
}
const noOwn = ELEMENTS.filter(e => [...prof[e].statuses].every(st => ELEMENTS.some(o => o !== e && prof[o].statuses.has(st))))
if (noOwn.length) out.push('', `Elements with no status of their own: ${noOwn.join(', ')}. Without a signature effect, a player cannot tell what picking this element is "for".`)

// ---------- 3. Weakness wheel (from each Attunement) ----------
const weakTo = {}
for (const e of ELEMENTS) {
  const att = data.magic[e].find(s => /attunement/i.test(s.name))
  const m = att && String(att.desc).match(/(\w+) weakness/i)
  weakTo[e] = m ? m[1].toLowerCase() : null
}
const beats = Object.fromEntries(ELEMENTS.map(e => [e, ELEMENTS.filter(o => weakTo[o] === e)]))
out.push('', '## 3. Weakness wheel (from each Attunement)', '')
for (const e of ELEMENTS) out.push(`- ${e} is weak to **${weakTo[e] || '?'}**, and is strong against: ${beats[e].join(', ') || '**nothing**'}.`)
const lop = ELEMENTS.filter(e => beats[e].length !== 1)
if (lop.length) out.push('', `Uneven wheel: ${lop.map(e => `${e} counters ${beats[e].length}`).join(', ')}. In a fair wheel every element counters exactly one other. An element that counters nothing is a weaker pick; one that counters two is a stronger pick.`)

// ---------- 4. Coverage: missing pairings ----------
out.push('', '## 4. Missing or uneven pairings', '')
const fusions = skills.filter(s => s.category === 'fusion')
const pm = fusions.filter(s => s.tree === 'pure_magic')
const pairCount = {}
for (const s of pm) { const k = String(s.fusionType || '').split('_').sort().join('+'); pairCount[k] = (pairCount[k] || 0) + 1 }
const missingPure = []
for (let i = 0; i < ELEMENTS.length; i++) for (let j = i + 1; j < ELEMENTS.length; j++) { const k = [ELEMENTS[i], ELEMENTS[j]].sort().join('+'); if (!pairCount[k]) missingPure.push(k) }
out.push(`- Element + element: ${Object.keys(pairCount).length} of 28 pairs have fusions${missingPure.length ? `; missing: ${missingPure.join(', ')}` : ' (all covered)'}. Counts per pair: ${[...new Set(Object.values(pairCount))].join('/')} each.`)
const weaponTypes = Object.keys(data.weapons || {})
const wm = fusions.filter(s => ['melee_magic', 'ranged_magic'].includes(s.tree))
const wmPairs = new Set(wm.map(s => String(s.fusionType)))
const wmMissing = weaponTypes.flatMap(w => ELEMENTS.map(e => `${w === 'ranged' ? 'bow' : w}_${e}`)).filter(k => !wmPairs.has(k))
out.push(`- Weapon + element: ${wmPairs.size} of ${weaponTypes.length * ELEMENTS.length} pairs${wmMissing.length ? `; missing: ${wmMissing.join(', ')}` : ' (all covered)'}.`)
const mf = fusions.filter(s => s.tree === 'monster_fusion')
const mfCount = {}
for (const s of mf) { const e = String(s.fusionType || '').replace('monster_', ''); mfCount[e] = (mfCount[e] || 0) + 1 }
out.push(`- Monster + element: ${Object.entries(mfCount).map(([k, v]) => `${k} ${v}`).join(', ')}.${ELEMENTS.some(e => mfCount[e] !== mfCount[ELEMENTS[0]]) ? ' Uneven: some elements get more monster fusions than others.' : ''}${mfCount.arcane ? ' "arcane" is not one of the eight elements.' : ''}`)
const uc = fusions.filter(s => s.tree === 'utility_combat')
out.push(`- Weapon + career: ${uc.filter(s => s.fusionType).length} fusions across ${new Set(uc.map(s => s.fusionType).filter(Boolean)).size} pairings; ${uc.filter(s => !s.fusionType).length} have no pairing label. Careers with no weapon pairing: ${Object.keys(data.careers || {}).filter(c => !uc.some(s => String(s.fusionType || '').endsWith(c))).join(', ')}.`)

// ---------- 5. Fusion rule (Sam's) ----------
const ruleBreaks = []
for (const f of fusions) {
  const pre = (f.prerequisites?.skills || []).map(id => byId.get(id))
  const t = Number(f.tier)
  const problems = []
  if (pre.length !== 2) problems.push(`needs ${pre.length} skills, not 2`)
  for (const p of pre) {
    if (!p) problems.push('needs a skill that does not exist')
    else if (p.category === 'fusion') problems.push(`needs another fusion (${p.name})`)
    else if (!(p.tier === t || p.tier === t - 1)) problems.push(`${p.name} is Tier ${p.tier}`)
  }
  if (pre.length === 2 && pre[0] && pre[1] && pre[0].tree === pre[1].tree) problems.push('both skills come from the same tree')
  if (problems.length) ruleBreaks.push(`${f.name} (Tier ${t}): ${problems.join('; ')}`)
}
out.push('', `## 5. Fusion rule: two normal skills of Tier N or N-1, one from each side — ${ruleBreaks.length} breaks`, '')
for (const r of ruleBreaks.slice(0, MAX)) out.push(`- ${r}`)

// ---------- 6. Strictly better than its parts ----------
const strict = []
for (const f of fusions) {
  const pre = (f.prerequisites?.skills || []).map(id => byId.get(id)).filter(Boolean)
  if (pre.length !== 2) continue
  const fd = firstDice(f.desc) * targets(f.desc)
  const fs_ = statusesOf(f)
  if (!fd) continue
  const better = pre.every(p => {
    const pd = firstDice(p.desc) * targets(p.desc)
    const ps = statusesOf(p)
    return pd > 0 && fd >= pd && Number(f.staminaCost || 0) <= Number(p.staminaCost || 0) && [...ps].every(x => fs_.has(x))
  })
  if (better) strict.push({ f, pre, fd })
}
out.push('', `## 6. Fusions strictly better than both parts — ${strict.length}`, '', 'Hits as hard or harder, for the same or less Stamina, with every status the parts had. Once learned, the two parts are never worth pressing again.', '')
for (const s of strict.slice(0, MAX)) out.push(`- **${s.f.name}** (Tier ${s.f.tier}, ${s.f.staminaCost} Stamina, ~${Math.round(s.fd)} dmg) vs ${s.pre.map(p => `${p.name} (Tier ${p.tier}, ${p.staminaCost} Stamina, ~${Math.round(firstDice(p.desc) * targets(p.desc))} dmg)`).join(' and ')}.`)
if (strict.length > MAX) out.push(`- …and ${strict.length - MAX} more (run with --all).`)

// ---------- 7. Copy-paste fusions (identity lost) ----------
const skeleton = s => String(s.desc).toLowerCase()
  .replace(new RegExp(`\\b(${[...ELEMENTS, 'thunder', 'cold', 'holy', 'radiant', 'shadow', 'void'].join('|')})\\b`, 'g'), 'X')
  .replace(/\d+%/g, 'N%').replace(/\d+d\d+/g, 'NdN').replace(/[A-Z][a-z]+ and [A-Z][a-z]+/g, 'S')
  .replace(/apply [a-z ]+?(?: and [a-z ]+?)?\./g, 'apply S.').replace(/\([^)]*\)/, '(…)')
const groups = new Map()
for (const f of fusions) { const k = `${f.tree}|${skeleton(f)}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f) }
const clones = [...groups.values()].filter(g => g.length >= 4).sort((a, b) => b.length - a.length)
out.push('', `## 7. Fusions written from the same template — ${clones.reduce((t, g) => t + g.length, 0)} fusions in ${clones.length} groups`, '', 'Same sentence with only the element swapped. Each fusion should feel like a blend of its two parts, not a recolour.', '')
for (const g of clones.slice(0, 6)) out.push(`- ${g.length} x ${g[0].tree}: ${g.slice(0, 5).map(f => f.name).join(', ')}${g.length > 5 ? ', …' : ''}. Template: "${g[0].desc.slice(0, 150)}…"`)

console.log(out.join('\n'))
