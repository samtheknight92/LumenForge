#!/usr/bin/env node
/**
 * weapon-value-check — read-only report. Never writes to game data.
 * Run from the repo root: node .claude/skills/weapon-value-check/check.mjs
 * Optional: --json for machine-readable output.
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const items = JSON.parse(fs.readFileSync(path.join(root, 'data/json/items.json'), 'utf8'))
const weapons = Object.values(items.weapons || {})

// Same currency rate the app uses (js/core/constants.js CURRENCY_RATE).
const RATE = { gold: 2500, silver: 100, copper: 1 }
const toGil = p => Object.entries(p || {}).reduce((t, [k, v]) => t + (RATE[k] || 0) * Number(v || 0), 0)
// The app shows every price in Gil, so the report does too.
const fmtGil = g => `${Math.round(g).toLocaleString('en-GB')} Gil`

// Stat weights = the Lumen price of the first point of that stat on the Stats tab
// (js/core/constants.js STAT_RULES). One point of average damage is worth the
// same as one point of Strength, because Strength adds 1 to damage.
const STAT_WEIGHT = { hp: 3, stamina: 4, strength: 10, magicPower: 10, accuracy: 8, speed: 12, physicalDefence: 10, magicalDefence: 10 }
const DAMAGE_WEIGHT = 10
// Each perk is priced on its own (perk-values.json, next to this file). A perk
// missing from that table falls back to 15 points and is listed as unpriced.
const PERKS = JSON.parse(fs.readFileSync(new URL('./perk-values.json', import.meta.url), 'utf8'))
const UNPRICED_PERK = 15
const unpriced = new Set()
const SLOT_WEIGHT = 5
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const HIGH = 1.6
const LOW = 0.6

// Same name patterns the app uses to work out weapon kind (js/items/equipment.js).
const KIND_PATTERNS = [
  ['sword', /\b(sword|blade|gauche)\b/i],
  ['axe', /\b(axe|cleaver)\b/i],
  ['dagger', /\b(dagger|fang)\b/i],
  ['polearm', /\b(spear|polearm|glaive|halberd|lance|pike|piercer)\b/i],
  ['hammer', /\b(hammer|mace|club|maul|crusher)\b/i],
  ['staff', /(staff|\bwand\b|\brod\b)/i],
  ['ranged', /\b(bow|crossbow)\b/i]
]
const kindOf = w => {
  if (w.weaponKind) return w.weaponKind
  const name = `${w.name} ${w.id.replace(/_/g, ' ')}`
  // id prefixes win for names like "Assassin Blade" (a dagger)
  if (/assassin|shadow_fang|temporal|void_dagger/.test(w.id)) return 'dagger'
  for (const [kind, re] of KIND_PATTERNS) if (re.test(name)) return kind
  return 'other'
}

const avgDice = f => {
  const m = String(f || '').match(/^(\d+)d(\d+)(?:\s*\+\s*(\d+))?$/i)
  return m ? Number(m[1]) * (Number(m[2]) + 1) / 2 + Number(m[3] || 0) : 0
}

// burn_on_hit + burn describe one perk, so count each perk once.
// Twins (burn + burn_on_hit) describe one perk, so count each family once at its higher value.
const TWINS = { burn: 'burn_on_hit', poison: 'poison_on_hit', stealth: 'stealth_strike' }
function perkValue(list) {
  const fam = new Map()
  for (const id of list || []) {
    const key = TWINS[id] || id
    const pts = PERKS[id]?.points ?? (unpriced.add(id), UNPRICED_PERK)
    fam.set(key, Math.max(fam.get(key) || 0, pts))
  }
  return { count: fam.size, points: [...fam.values()].reduce((a, b) => a + b, 0), names: [...fam.keys()] }
}

const rows = weapons.map(w => {
  const avg = avgDice(w.damage)
  const statParts = Object.entries(w.statModifiers || {}).map(([k, v]) => [k, v, v * (STAT_WEIGHT[k] ?? 8)])
  const statValue = statParts.reduce((t, p) => t + p[2], 0)
  const perk = perkValue(w.specialEffects)
  const specials = perk.count
  const slots = Number(w.enchantmentSlots || 0)
  const value = avg * DAMAGE_WEIGHT + statValue + perk.points + slots * SLOT_WEIGHT
  const gil = toGil(w.price)
  return { id: w.id, name: w.name, kind: kindOf(w), rarity: w.rarity, damage: w.damage, avg, stats: w.statModifiers, specials, perkPts: perk.points, perkNames: perk.names, damagePts: Math.round(avg * DAMAGE_WEIGHT), slots, value: Math.round(value), gil, gilPerPoint: gil / Math.max(1, value) }
})

const median = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0 }

const flags = []
// 1) Price per point of value compared with the same rarity (all kinds) and same kind+rarity.
for (const rarity of RARITY_ORDER) {
  const group = rows.filter(r => r.rarity === rarity)
  const med = median(group.map(r => r.gilPerPoint))
  for (const r of group) {
    const ratio = r.gilPerPoint / med
    const kindPeers = group.filter(p => p.kind === r.kind && p.id !== r.id)
    const fairGil = Math.round(med * r.value / 100) * 100
    if (ratio >= HIGH) flags.push({ kind: 'overpriced', r, ratio, fairGil, peers: kindPeers, med })
    else if (ratio <= LOW) flags.push({ kind: 'underpriced', r, ratio, fairGil, peers: kindPeers, med })
  }
}
// 1b) Damage dice far above or below the same rarity (players notice dice first).
const diceOut = []
for (const rarity of RARITY_ORDER) {
  const group = rows.filter(r => r.rarity === rarity)
  const med = median(group.map(r => r.avg))
  for (const r of group) if (r.avg >= med * 1.8 || r.avg <= med * 0.5) diceOut.push({ r, med })
}
// 2) Price ladder: within one weapon kind, a dearer weapon should not be weaker overall.
const ladder = []
for (const kind of [...new Set(rows.map(r => r.kind))]) {
  const list = rows.filter(r => r.kind === kind).sort((a, b) => a.gil - b.gil)
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const cheap = list[i]; const dear = list[j]
      if (dear.gil > cheap.gil * 1.25 && dear.value < cheap.value * 0.95) ladder.push({ kind, cheap, dear })
    }
  }
}
// 3) Rarity ladder: a higher-rarity weapon that is weaker than a lower-rarity one of the same kind.
const rarityInv = []
for (const kind of [...new Set(rows.map(r => r.kind))]) {
  const list = rows.filter(r => r.kind === kind)
  for (const a of list) for (const b of list) {
    if (RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity) && b.value < a.value) rarityInv.push({ kind, low: a, high: b })
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ rows, flags: flags.map(f => ({ ...f, r: f.r.id, peers: f.peers.map(p => p.id) })), ladder: ladder.map(l => ({ kind: l.kind, cheap: l.cheap.id, dear: l.dear.id })), rarityInv: rarityInv.map(l => ({ kind: l.kind, low: l.low.id, high: l.high.id })) }, null, 2))
  process.exit(0)
}

const statText = s => Object.entries(s || {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ') || 'no stats'
const out = []
out.push(`# Weapon value check — ${rows.length} weapons`, '')
out.push('Value points = average damage x10 + stat bonuses (priced like the Stats tab) + each perk at its own value (perk-values.json) + 5 per enchant slot.', '')
out.push('## Value table', '', '| Weapon | Kind | Rarity | Damage | Dice pts | Perk pts | Value pts | Price | Gil per pt |', '|---|---|---|---|---|---|---|---|---|')
for (const r of [...rows].sort((a, b) => a.kind.localeCompare(b.kind) || a.gil - b.gil)) out.push(`| ${r.name} | ${r.kind} | ${r.rarity} | ${r.damage} | ${r.damagePts} | ${r.perkPts} | ${r.value} | ${fmtGil(r.gil)} | ${r.gilPerPoint.toFixed(1)} |`)
out.push('', `## Price vs value flags (${flags.length})`, '')
for (const f of flags.sort((a, b) => b.ratio - a.ratio)) {
  const { r } = f
  const peerText = f.peers.length ? ` Same-kind ${r.rarity} neighbours: ${f.peers.map(p => `${p.name} (${p.damage}, ${p.value} pts, ${fmtGil(p.gil)})`).join('; ')}.` : ''
  out.push(`- **${r.name}** (${r.rarity} ${r.kind}) is ${f.kind === 'overpriced' ? 'much dearer' : 'much cheaper'} than other ${r.rarity} weapons for what it gives: ${r.damage} damage, ${statText(r.stats)}, ${r.perkNames.length ? `perk ${r.perkNames.join(' + ')} (${r.perkPts} pts)` : 'no perk'}, ${r.slots} slot(s) = ${r.value} pts for ${fmtGil(r.gil)} (${f.ratio.toFixed(2)}x the ${r.rarity} average price per point).${peerText} Suggested fix: price near ${fmtGil(f.fairGil)}, or ${f.kind === 'overpriced' ? 'add damage/stats to justify the price' : 'trim its stats or damage'}.`)
}
out.push('', `## Damage dice outliers (${diceOut.length})`, '')
for (const d of diceOut) out.push(`- **${d.r.name}** (${d.r.rarity}) rolls ${d.r.damage} (average ${d.r.avg}), while a typical ${d.r.rarity} weapon averages ${d.med}. A swing this big decides fights on its own, whatever the price.`)
out.push('', `## Price ladder breaks (${ladder.length}) — dearer but weaker, same weapon kind`, '')
for (const l of ladder) out.push(`- **${l.dear.name}** costs ${fmtGil(l.dear.gil)} but scores ${l.dear.value} pts, while the cheaper **${l.cheap.name}** (${fmtGil(l.cheap.gil)}) scores ${l.cheap.value} pts.`)
out.push('', `## Rarity ladder breaks (${rarityInv.length}) — rarer but weaker, same weapon kind`, '')
for (const l of rarityInv) out.push(`- **${l.high.name}** (${l.high.rarity}, ${l.high.value} pts) is weaker than **${l.low.name}** (${l.low.rarity}, ${l.low.value} pts).`)
const kinds = [...new Set(rows.map(r => r.kind))]
const missing = ['sword', 'axe', 'dagger', 'polearm', 'hammer', 'staff', 'ranged'].flatMap(k => RARITY_ORDER.filter(rar => !rows.some(r => r.kind === k && r.rarity === rar)).map(rar => `${k}/${rar}`))
out.push('', `## Gaps in the shop`, '', `Kinds found: ${kinds.join(', ')}. Missing kind+rarity slots: ${missing.join(', ') || 'none'}.`)
if (unpriced.size) out.push('', `## Unpriced perks (${unpriced.size})`, '', `These perks are not in perk-values.json, so they were counted at ${UNPRICED_PERK} points: ${[...unpriced].join(', ')}. Add them to the table.`)
console.log(out.join('\n'))
