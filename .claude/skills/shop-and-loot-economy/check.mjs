#!/usr/bin/env node
/**
 * shop-and-loot-economy — read-only report. Never writes to game data.
 * Run from the repo root: node .claude/skills/shop-and-loot-economy/check.mjs [--all]
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const items = read('data/json/items.json')
const prof = read('data/json/profession-items.json')
const loot = read('data/json/monster-loot.json')
const disc = read('data/json/discoverable-items.json')
const skillsJson = read('data/json/skills.json')
const MAX = process.argv.includes('--all') ? Infinity : 8

const RATE = { gold: 2500, silver: 100, copper: 1 } // js/core/constants.js
const gil = p => typeof p === 'number' ? p : Object.entries(p || {}).reduce((t, [k, v]) => t + (RATE[k] || 0) * Number(v || 0), 0)
const fmt = g => `${Math.round(g).toLocaleString('en-GB')} Gil`
const median = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0 }
const STAT_WEIGHT = { hp: 3, stamina: 4, strength: 10, magicPower: 10, accuracy: 8, speed: 12, physicalDefence: 10, magicalDefence: 10 }
const statPts = m => Object.entries(m || {}).reduce((t, [k, v]) => t + v * (STAT_WEIGHT[k] ?? 8), 0)
const RARITY = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const out = ['# Shop and loot economy check', '']
const section = (title, why, rows) => {
  out.push(`## ${title} — ${rows.length}`, '', `Why: ${why}`, '')
  for (const r of rows.slice(0, MAX)) out.push(`- ${r}`)
  if (rows.length > MAX) out.push(`- …and ${rows.length - MAX} more (run with --all).`)
  out.push('')
}

// Every priced thing, for material lookups.
const priceOf = new Map()
const addPrices = obj => { for (const v of Object.values(obj)) { if (v?.id && v.price !== undefined) priceOf.set(v.id, gil(v.price)); else if (v && typeof v === 'object' && !v.id) addPrices(v) } }
addPrices(items); addPrices(loot); addPrices(disc); addPrices(prof)

// 1. Healing and Stamina per Gil.
const potions = []
for (const c of Object.values(items.consumables)) {
  // Only one-off restores ("Restores 25 HP"), not per-turn ones ("restore 1 HP at the End of turn").
  const hp = c.desc.match(/Restores? (\d+) HP(?! at| per| each)/); const st = c.desc.match(/Restores? (\d+) Stamina(?! at| per| each)/)
  const g = gil(c.price)
  if (hp) potions.push({ name: c.name, kind: 'HP', amt: +hp[1], g, per: g / +hp[1] })
  if (st) potions.push({ name: c.name, kind: 'Stamina', amt: +st[1], g, per: g / +st[1] })
}
out.push('## Healing and Stamina per Gil', '', 'Gil paid for each point restored. Bigger potions usually cost a little more per point (you pay for convenience), but jumps of 5x or more feel unfair.', '')
for (const kind of ['HP', 'Stamina']) {
  const list = potions.filter(p => p.kind === kind).sort((a, b) => a.amt - b.amt)
  out.push(`- ${kind}: ${list.map(p => `${p.name} ${p.amt} for ${fmt(p.g)} (${p.per.toFixed(1)}/pt)`).join(' · ')}`)
}
const potionFlags = []
for (const kind of ['HP', 'Stamina']) {
  const list = potions.filter(p => p.kind === kind)
  const med = median(list.map(p => p.per))
  for (const p of list) if (p.per >= med * 5 || p.per <= med / 5) potionFlags.push(`**${p.name}** costs ${p.per.toFixed(1)} Gil per ${kind} point, while the typical ${kind} item costs ${med.toFixed(1)}. ${p.per < med ? 'So cheap it makes the potions pointless.' : 'So dear nobody will buy it for the healing alone; say what else it does, or lower the price.'}`)
}
out.push('')
section('Healing price outliers', 'Players compare Gil per HP without thinking about it. An item far off the curve is either always bought or never bought.', potionFlags)

// 2. Armour, accessory and off-hand value per Gil (stats priced like the Stats tab).
const gearFlags = []
for (const cat of ['armor', 'accessories', 'offhand']) {
  const list = Object.values(items[cat]).map(x => ({ x, pts: statPts(x.statModifiers) + 15 * (x.specialEffects || []).length, g: gil(x.price) })).filter(r => r.g > 0 && r.pts > 0)
  for (const rar of RARITY) {
    const grp = list.filter(r => r.x.rarity === rar)
    if (grp.length < 3) continue
    const med = median(grp.map(r => r.g / r.pts))
    for (const r of grp) {
      const ratio = (r.g / r.pts) / med
      if (ratio >= 1.8 || ratio <= 0.5) gearFlags.push(`**${r.x.name}** (${rar} ${cat}): ${fmt(r.g)} for ${r.pts} value points is ${ratio.toFixed(1)}x the ${rar} ${cat} average per point. A fair price would be about ${fmt(Math.round(med * r.pts / 100) * 100)}. "${r.x.desc.slice(0, 90)}"`)
    }
  }
}
section('Gear priced away from its neighbours (armour, accessories, off-hands)', 'Same idea as the weapon check: stats are priced like the Stats tab, 15 points per perk, compared within one rarity and slot.', gearFlags)

// 3. Crafting: material cost vs what you make.
const craftRows = []
for (const [trade, list] of Object.entries(prof)) {
  for (const it of Object.values(list)) {
    if (!Array.isArray(it.materials)) continue
    let cost = 0; const missing = []
    for (const m of it.materials) { const p = priceOf.get(m.id); if (p === undefined) missing.push(m.id); else cost += p * Number(m.quantity || 1) }
    const value = gil(it.price)
    if (missing.length) { craftRows.push(`**${it.name}** (${trade}): material ${missing.join(', ')} has no price anywhere, so nobody can tell if crafting is worth it.`); continue }
    if (!value) continue
    const ratio = value / Math.max(1, cost)
    if (ratio < 1) craftRows.push(`**${it.name}** (${trade}): materials cost ${fmt(cost)} but the item is worth ${fmt(value)}. Crafting loses ${Math.round((1 - ratio) * 100)}% of the value. → Lower the material count or raise the item's value.`)
    else if (ratio > 6) craftRows.push(`**${it.name}** (${trade}): materials cost ${fmt(cost)}, the item is worth ${fmt(value)} (${ratio.toFixed(0)}x). → Crafting is a money printer if items can be sold; add a rarer material or lower the value.`)
  }
}
section('Crafting that loses money or prints it', 'A fair recipe makes something worth a bit more than its materials, so crafting feels worthwhile without breaking the shop.', craftRows)

// 4. Skill prices within a tier.
const TIER_FLOOR = { 1: 8, 2: 20, 3: 40, 4: 65, 5: 100 } // scripts/lib/progression.mjs
const skills = []
const walk = (n, cat, tree) => { if (Array.isArray(n)) n.forEach(s => s?.id && skills.push({ ...s, cat, tree })); else if (n && typeof n === 'object') Object.entries(n).forEach(([k, v]) => walk(v, cat, tree || k)) }
for (const [cat, t] of Object.entries(skillsJson)) walk(t, cat, null)
// Playable-race trees use their own cheap ladder; the monster tree is priced like everything else.
const isRaceTree = s => s.cat === 'racial' && s.tree !== 'monster'
const costRows = []
const racial = skills.filter(s => isRaceTree(s) && TIER_FLOOR[s.tier])
const racialShare = racial.length ? median(racial.map(s => s.cost / TIER_FLOOR[s.tier])) : 1
for (const s of skills) {
  const floor = TIER_FLOOR[s.tier]; if (!floor || ['ascension', 'ultimate'].includes(s.cat) || isRaceTree(s)) continue
  if (s.cost < floor) costRows.push(`**${s.name}** (Tier ${s.tier}, ${s.cat}) costs ${s.cost} Lumens, below the Tier ${s.tier} price of ${floor}. → Raise to ${floor}, or say why it is a bargain.`)
  else if (s.cost > floor * 2.5) costRows.push(`**${s.name}** (Tier ${s.tier}, ${s.cat}) costs ${s.cost} Lumens, ${(s.cost / floor).toFixed(1)}x the usual ${floor}. → Check it is that much stronger, or bring it down.`)
}
const costSummary = Object.keys(TIER_FLOOR).map(t => { const c = skills.filter(s => s.tier === +t && !['ascension', 'ultimate'].includes(s.cat)).map(s => s.cost); return `Tier ${t}: ${Math.min(...c)}–${Math.max(...c)} (usual ${TIER_FLOOR[t]})` }).join(' · ')
out.push('## Skill prices', '', `Lumen ranges per tier: ${costSummary}.`, '', `Playable-race skills (${racial.length}) use their own ladder: ${[1, 2, 3, 4, 5].map(t => { const c = racial.filter(s => s.tier === t).map(s => s.cost); return c.length ? `Tier ${t} ${median(c)}` : '' }).filter(Boolean).join(', ')} Lumens, about ${Math.round(racialShare * 100)}% of normal. A Tier 5 racial ultimate costs a quarter of a normal Tier 5. That looks deliberate (only one race can learn them), so they are not listed one by one, but the gap grows with tier, so the top racial skills are the biggest bargains in the game.`, '')
section('Skills priced off their tier', 'Players expect skills of one tier to cost about the same. A skill far above the tier price needs to be clearly stronger; one below is a hidden bargain.', costRows)

// 5. Earning vs spending (the app's own guideline for premade characters).
const GIL_PER_LEVEL = 200; const START_GIL = 2400; const SHOP_LEVEL = { common: 0, uncommon: 5, rare: 12, epic: 20, legendary: 35 }
const allGear = [...Object.values(items.weapons), ...Object.values(items.armor), ...Object.values(items.accessories), ...Object.values(items.offhand)]
out.push('## Can players afford what unlocks?', '', `Uses the app's own guideline for premade characters: start with ${fmt(START_GIL)}, about ${fmt(GIL_PER_LEVEL)} per level after. Your GM may give more; this shows whether the default pace lines up with the shop.`, '')
for (const rar of RARITY) {
  const list = allGear.filter(x => x.rarity === rar).map(x => gil(x.price))
  if (!list.length) continue
  const lv = SHOP_LEVEL[rar]; const wallet = START_GIL + lv * GIL_PER_LEVEL; const med = median(list)
  out.push(`- ${rar} gear unlocks at Skill Level ${lv}. Typical price ${fmt(med)}; a player on the guideline has earned about ${fmt(wallet)} by then, enough for ${(wallet / med).toFixed(1)} items.${wallet / med < 1 ? ' **Not even one.**' : ''}`)
}
const lootVals = Object.values(loot).map(x => gil(x.price)).filter(Boolean)
out.push(`- Monster loot sells for ${fmt(Math.min(...lootVals))}–${fmt(Math.max(...lootVals))} (typical ${fmt(median(lootVals))}).`)
console.log(out.join('\n'))
