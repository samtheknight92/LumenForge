#!/usr/bin/env node
/**
 * skill-tree-balance — read-only report. Never writes to game data.
 * Run from the repo root: node .claude/skills/skill-tree-balance/check.mjs [--tree fire] [--all]
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/json/skills.json'), 'utf8'))
const args = process.argv.slice(2)
const onlyTree = args.includes('--tree') ? args[args.indexOf('--tree') + 1] : null
const showAll = args.includes('--all')

// Flatten every skill, remembering its category and tree. Some trees nest one level deeper.
const skills = []
const walk = (node, category, tree) => {
  if (Array.isArray(node)) { for (const s of node) if (s && s.id) skills.push({ ...s, category, tree }); return }
  if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, category, tree ? `${tree}/${k}` : k)
}
for (const [category, trees] of Object.entries(data)) walk(trees, category, null)
const byId = new Map(skills.map(s => [s.id, s]))

const CONTROL = new Set(['immobilized', 'incapacitated', 'fear', 'charm', 'mind_controlled', 'knockdown', 'blinded', 'silenced', 'weakened', 'exhausted', 'stunned', 'slowed', 'cursed'])
const AVG_WEAPON_DIE = 5.5 // a mid-game weapon (1d10)

const avg = (n, s) => n * (s + 1) / 2
const diceIn = text => [...String(text).matchAll(/(\d+)d(\d+)/g)].map(m => avg(+m[1], +m[2]))

function kindOf(s) {
  const head = String(s.desc || '').split(/[:(]/)[0].trim().toLowerCase()
  if (head.startsWith('passive') || head.startsWith('aura')) return 'passive'
  if (head.startsWith('toggle')) return 'toggle'
  if (head.startsWith('craft') || head.startsWith('enchant')) return 'craft'
  return 'active'
}

const WORDS = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 }
function targetsOf(desc) {
  const d = desc.toLowerCase().replace(/\b(two|three|four|five|six|seven|eight)\b/g, w => WORDS[w])
  const multi = d.match(/(?:fire|make|throw) (\d+)\b|(\d+) (?:\w+ )?(?:shots|arrows|attacks|attack rolls|strikes|hits|cuts|axes)\b/)
  if (multi) return Math.min(4, Number(multi[1] || multi[2]))
  if (/per (?:creature|target|enemy)|each (?:enemy|creature|target)|all enemies|\barea\b|radius|burst|cone|\bline\b|within \d+ ?ft.*each/.test(d)) return 2.5
  return 1
}

// What each status is worth, in "points of damage" so it adds onto damage.
// perTurn = value per turn it lasts (counted up to 4 turns); flat = whole value.
const STATUS_VALUE = {
  incapacitated: { perTurn: 4 }, mind_controlled: { perTurn: 4 }, stunning: { perTurn: 4 }, charm: { perTurn: 3 },
  fear: { perTurn: 2.5 }, blinded: { perTurn: 2 }, silenced: { perTurn: 2 }, knockdown: { flat: 2 },
  immobilized: { perTurn: 1.5 }, weakened: { perTurn: 1.5 }, exhausted: { perTurn: 1.5 }, cursed: { perTurn: 1.5 },
  burn: { flat: 5 }, poison: { flat: 6 }, bleeding: { flat: 3 }, acid_corrosion: { flat: 3 }
}
const statusPoints = acts => acts.reduce((t, a) => {
  const v = STATUS_VALUE[a.effectId]; if (!v) return t
  const chance = a.chance == null ? 1 : Math.min(1, a.chance)
  return t + chance * (v.flat ?? v.perTurn * Math.min(4, Math.max(1, Number(a.duration || 1))))
}, 0)
// Extra benefits written in the text ("riders"), also in points of damage.
const RIDERS = [
  ['accuracy bonus', /accuracy\s*\+\s*(\d)|\+(\d) accuracy/, m => 0.5 * Number(m[1] || m[2])],
  ['heals you', /heal (?:yourself|you)|you heal|heal for half/, () => 2],
  ['push / knock back', /\bpush|knock (?:back|prone)|knockdown/, () => 1],
  ['ignores cover or defence', /ignore[s]? (?:half )?cover|ignores? \d+ (?:points of )?(?:physical|magical|total)? ?defence/, () => 1.5],
  ['defence for you', /you gain \+(\d) (?:physical|magical) defence|gain \+(\d) physical defence/, m => 0.75 * Number(m[1] || m[2])],
  ['better crits', /critical hit on (?:a )?natural 1[5-9]/, () => 1],
  ['free movement', /teleport|move up to \d+ ?ft/, () => 1],
  ['lowers enemy defence', /defence is \d+ lower|reduce the target's (?:physical|magical) defence|defence by \d/, () => 1.5]
]
// Uses that are limited may be stronger per use without being unfair.
const limitFactor = d => /per day|per long rest|once per rest/.test(d) ? 0.4 : /once per (?:combat|scene|encounter)/.test(d) ? 0.6 : 1

// Work out what a skill is FOR, and a rough power number on that role's scale.
function profile(s) {
  const desc = String(s.desc || '')
  const d = desc.toLowerCase()
  const kind = kindOf(s)
  const acts = (s.activationEffects || []).filter(a => a && a.effectId)
  const hostile = acts.filter(a => a.applyTo !== 'self' && a.applyTo !== 'ally' && CONTROL.has(a.effectId))
  const healMatch = d.match(/(?:heal|heals|restore|restores|regain|regains|recover|recovers)[^.;]*?(\d+d\d+|\d+)\s*(?:hp|health)?/)
  const healsHp = healMatch && /hp|heal|health/.test(healMatch[0])
  const attack = /attack roll|save or take|each takes|takes \d+d\d+|apply burn|apply poison|apply bleeding/.test(d) && !/no damage/.test(d) && !/^(spell|action): apply (protected|enhanced)/.test(d)
  const dice = diceIn(desc)
  let dmg = 0
  if (attack) {
    dmg = (dice[0] || 0) + (/weapon damage|basic attack|gore damage|bite damage|claw damage/.test(d) ? AVG_WEAPON_DIE : 0)
    // + Strength / + Magic Power, or weapon damage (which always adds Strength): about +2 at mid level.
    if (/\+\s*(magic power|strength)/.test(d) || /weapon damage|basic attack/.test(d)) dmg += 2
  }
  const targets = targetsOf(desc)
  const control = hostile.reduce((t, a) => t + (a.chance == null ? 1 : Math.min(1, a.chance)) * Math.max(1, Number(a.duration || 1)), 0) +
    (/save or|until it beats|stop at the edge|difficult terrain|cannot act|held\b/.test(d) && !hostile.length ? 1.5 : 0)
  const support = /\ball(y|ies)\b|party|friend/.test(d) && /\+\d|gain|grant|shield|protect|resist|immune|advantage/.test(d)
  const heal = healsHp ? (diceIn(healMatch[0])[0] || Number(healMatch[1]) || 0) : 0

  let role
  if (kind === 'craft') role = 'crafting'
  else if (dmg > 0) role = 'damage'
  else if (heal > 0) role = 'healing'
  else if (control > 0) role = 'control'
  else if (support || /\+\d+ (physical|magical) defence|resist|shield|barrier|armou?r/.test(d)) role = 'support'
  else role = 'utility'

  const onTarget = acts.filter(a => a.applyTo !== 'self' && a.applyTo !== 'ally')
  const effectPts = statusPoints(onTarget) + (/save or|until it beats|stop at the edge|difficult terrain|cannot act|held\b/.test(d) && !onTarget.length ? 3 : 0)
  const riders = RIDERS.map(([name, re, f]) => { const m = d.match(re); return m ? { name, pts: f(m) } : null }).filter(Boolean)
  const riderPts = riders.reduce((t, r) => t + r.pts, 0)
  const limit = limitFactor(d)
  const raw = role === 'damage' ? dmg * targets + effectPts * targets + riderPts
    : role === 'healing' ? heal * (/\ball allies|each ally|allies within|party/.test(d) ? 2.5 : 1) + riderPts
    : role === 'control' ? effectPts * targets + riderPts
    : 0
  const power = raw * limit
  const r1 = x => Math.round(x * 10) / 10
  return { kind, role, power: r1(power), dmg, dicePts: r1(dmg * targets), effectPts: r1(effectPts * targets), riderPts: r1(riderPts), riders: riders.map(r => r.name), limit, heal, control: r1(control), targets, stamina: Number(s.staminaCost || 0) }
}

for (const s of skills) s.p = profile(s)

const median = a => { const x = [...a].sort((p, q) => p - q); const n = x.length; return n ? (n % 2 ? x[(n - 1) / 2] : (x[n / 2 - 1] + x[n / 2]) / 2) : 0 }
const inScope = s => !onlyTree || s.tree === onlyTree || s.tree.startsWith(onlyTree)

// 1) Tier peers: same tier, same role, active skills, normal + fusion trees (capstones compared among themselves).
const flags = []
const group = s => `${['ascension', 'ultimate'].includes(s.category) ? 'capstone' : 'normal'}|${s.tier}|${s.p.role}|${s.p.targets > 1 ? 'multi' : 'single'}`
const groups = new Map()
for (const s of skills) {
  if (s.p.kind !== 'active' || !['damage', 'healing', 'control'].includes(s.p.role) || !s.p.power) continue
  const g = group(s); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(s)
}
for (const [g, list] of groups) {
  if (list.length < 4) continue
  const med = median(list.map(s => s.p.power))
  const medSt = median(list.map(s => s.p.stamina))
  for (const s of list) {
    if (!inScope(s)) continue
    const ratio = s.p.power / med
    if (ratio >= 2 || ratio <= 0.45) flags.push({ type: ratio > 1 ? 'strong' : 'weak', s, ratio, med, medSt, peers: list.length, shape: s.p.targets > 1 ? 'multi-target' : 'single-target' })
  }
}

// 2) Upgrades: a later skill in the same tree that needs this one should keep its role and be stronger.
const SUPPORTISH = new Set(['healing', 'support'])
const upgrades = []
for (const child of skills) {
  if (!inScope(child)) continue
  for (const pid of child.prerequisites?.skills || []) {
    const parent = byId.get(pid)
    if (!parent || parent.tree !== child.tree || parent.category === 'fusion') continue
    const a = parent.p.role; const b = child.p.role
    const clash = (SUPPORTISH.has(a) && b === 'damage') || (a === 'damage' && SUPPORTISH.has(b))
    const bothActive = parent.p.kind === 'active' && child.p.kind === 'active'
    if (clash && bothActive) upgrades.push({ type: 'role', parent, child })
    else if (clash) upgrades.push({ type: 'role-passive', parent, child })
    else if (a === b && ['damage', 'healing'].includes(a) && parent.p.kind === 'active' && child.p.kind === 'active' && child.tier > parent.tier && child.p.power < parent.p.power * 0.9) upgrades.push({ type: 'weaker', parent, child })
  }
}

// 3) Skill ranks: the Rank-up bonuses add damage and status chance only.
const rankable = skills.filter(s => s.p.kind !== 'passive' && s.p.kind !== 'craft' && ['ascension', 'ultimate'].indexOf(s.category) === -1)
const noRankGain = rankable.filter(s => s.p.kind === 'active' && ['healing', 'support', 'utility'].includes(s.p.role) && !(s.activationEffects || []).some(a => a.chance != null && a.chance < 1))

// ---------- report ----------
const out = []
const roles = {}
for (const s of skills) roles[s.p.role] = (roles[s.p.role] || 0) + 1
out.push(`# Skill tree balance — ${skills.length} skills${onlyTree ? ` (tree: ${onlyTree})` : ''}`, '')
out.push(`Roles found: ${Object.entries(roles).map(([k, v]) => `${k} ${v}`).join(', ')}.`, '')
out.push(`## Much stronger or weaker than tier peers (${flags.length})`, '')
out.push('Power = average dice damage x targets + status effects (each status priced by how much it shuts a foe down, x chance, x turns) + extras in the text (accuracy, pushes, self-heal, ignoring defence…). Skills limited to once per combat or per day count for less per use, so they are allowed to hit harder. Peers = active skills of the same tier, role and shape.', '')
for (const f of flags.sort((a, b) => b.ratio - a.ratio)) {
  const { s } = f
  const parts = s.p.role === 'damage' ? ` [dice ${s.p.dicePts} + status effects ${s.p.effectPts} + extras ${s.p.riderPts}${s.p.riders.length ? ` (${s.p.riders.join(', ')})` : ''}${s.p.limit < 1 ? `, x${s.p.limit} because it is limited per combat/day` : ''}]` : s.p.role === 'control' ? ` [status effects ${s.p.effectPts} + extras ${s.p.riderPts}${s.p.limit < 1 ? `, x${s.p.limit} limited use` : ''}]` : ''
  out.push(`- **${s.name}** (${s.tree}, Tier ${s.tier}, ${f.shape} ${s.p.role}) power ${s.p.power}${parts} vs typical ${f.med} for ${f.peers} Tier ${s.tier} ${f.shape} ${s.p.role} skills (${f.ratio.toFixed(1)}x), Stamina ${s.p.stamina} vs typical ${f.medSt}. "${s.desc.slice(0, 180)}${s.desc.length > 180 ? '…' : ''}"`)
}
out.push('', '## Area vs single-target price check', '')
for (const tier of [1, 2, 3, 4, 5]) {
  const dmgSk = skills.filter(x => x.p.kind === 'active' && x.p.role === 'damage' && x.tier === tier && !['ascension', 'ultimate'].includes(x.category))
  const single = dmgSk.filter(x => x.p.targets <= 1); const multi = dmgSk.filter(x => x.p.targets > 1)
  if (!single.length || !multi.length) continue
  const dS = median(single.map(x => x.p.dmg)); const dM = median(multi.map(x => x.p.dmg))
  const sS = median(single.map(x => x.p.stamina)); const sM = median(multi.map(x => x.p.stamina))
  out.push(`- Tier ${tier}: single-target skills deal ~${dS} per hit for ${sS} Stamina; area/multi-hit skills deal ~${dM} per target for ${sM} Stamina (${single.length} vs ${multi.length} skills).${dM >= dS * 0.9 && sM <= sS + 1 ? ' Area skills hit just as hard per target for about the same Stamina, so they are the better buy whenever 2+ enemies are near.' : ''}`)
}
out.push('', `## Upgrades that change role (${upgrades.filter(u => u.type === 'role').length})`, '')
for (const u of upgrades.filter(u => u.type === 'role')) out.push(`- **${u.parent.name}** (${u.parent.p.role}) leads to **${u.child.name}** (${u.child.p.role}) in ${u.child.tree}. "${u.child.desc.slice(0, 160)}${u.child.desc.length > 160 ? '…' : ''}"`)
const soft = upgrades.filter(u => u.type === 'role-passive')
out.push('', `Also ${soft.length} passive or toggle follow-ons switch role (often an Attunement or Mastery after damage spells). Lower priority: ${soft.slice(0, 10).map(u => `${u.parent.name} → ${u.child.name}`).join(', ')}${soft.length > 10 ? ', …' : ''}.`)
out.push('', `## Upgrades weaker than the skill they need (${upgrades.filter(u => u.type === 'weaker').length})`, '')
for (const u of upgrades.filter(u => u.type === 'weaker')) out.push(`- **${u.child.name}** (Tier ${u.child.tier}, power ${u.child.p.power}) needs **${u.parent.name}** (Tier ${u.parent.tier}, power ${u.parent.p.power}) but is weaker at the same job.`)
out.push('', `## Rank-up bonuses vs role`, '')
out.push(`Ranking a skill up adds +damage and +status chance, and cuts Stamina at Rank 5 and 10. ${noRankGain.length} rankable skills are healing, support or utility with no status chance, so ranks only give them the Stamina cut. Examples: ${noRankGain.slice(0, 12).map(s => `${s.name} (${s.p.role})`).join(', ')}.`)
if (showAll) {
  out.push('', '## Every skill', '', '| Skill | Tree | Tier | Kind | Role | Power | Stamina |', '|---|---|---|---|---|---|---|')
  for (const s of skills.filter(inScope)) out.push(`| ${s.name} | ${s.tree} | ${s.tier} | ${s.p.kind} | ${s.p.role} | ${s.p.power} | ${s.p.stamina} |`)
}
console.log(out.join('\n'))
