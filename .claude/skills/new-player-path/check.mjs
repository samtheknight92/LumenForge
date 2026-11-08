#!/usr/bin/env node
/**
 * new-player-path — read-only report. Never writes to game data.
 * Builds a sensible level-0 character for every background and every weapon/magic path,
 * using the app's own starting stats, stat prices and backgrounds, and reports what a new player gets.
 * Run from the repo root: node .claude/skills/new-player-path/check.mjs
 */
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

const root = process.cwd()
const mod = p => import(pathToFileURL(path.join(root, p)).href)
const { DEFAULT_STATS, TIER_MIN_LEVEL } = await mod('js/core/constants.js')
const { getStatCostForPurchasedCount } = await mod('js/character/stat-costs.js')
const { BACKGROUNDS } = await mod('js/character/backgrounds.js')
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const skillsJson = read('data/json/skills.json')
const items = read('data/json/items.json')
const premades = read('data/json/premade-characters.json')

const RATE = { gold: 2500, silver: 100, copper: 1 }
const gil = p => Object.entries(p || {}).reduce((t, [k, v]) => t + (RATE[k] || 0) * Number(v || 0), 0)
const median = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0 }
const avgDice = f => { const m = String(f).match(/(\d+)d(\d+)/); return m ? m[1] * (Number(m[2]) + 1) / 2 : 0 }
const KIND = { sword: /sword|gauche/, axe: /axe/, dagger: /dagger/, polearm: /spear|pike|halberd/, hammer: /hammer|mace/, staff: /staff/, ranged: /bow/ }

// Typical first-fight enemy: level-1 premade monsters.
const lv1 = premades.filter(p => p.category === 'monster' && /_lv0?1_/.test(p.premadeId))
const foe = { pd: median(lv1.map(p => p.stats.physicalDefence)), md: median(lv1.map(p => p.stats.magicalDefence)), hp: median(lv1.map(p => p.stats.hp)), n: lv1.length }

const out = ['# New player path check', '', `Starting stats for every new character: ${Object.entries(DEFAULT_STATS).map(([k, v]) => `${k} ${v}`).join(', ')}.`, `A typical level-1 monster (${foe.n} premades): Physical Defence ${foe.pd}, Magical Defence ${foe.md}, HP ${foe.hp}.`, '']

// 1. Backgrounds.
out.push('## Backgrounds', '')
for (const b of Object.values(BACKGROUNDS)) {
  const itemVal = (b.items || []).reduce((t, it) => { const x = Object.values(items).map(c => c[it.itemId]).find(Boolean); return t + (x ? gil(x.price) * it.qty : 0) }, 0)
  out.push(`- **${b.name}**: ${b.gil} Gil + ${b.lumens} Lumens + items worth ${itemVal} Gil${b.hardMode ? ' (hard mode by design)' : ''}.`)
}
const normal = Object.values(BACKGROUNDS).filter(b => !b.hardMode)
const score = b => b.gil / 2400 + b.lumens / 113
const flagsB = normal.filter(b => Math.abs(score(b) / 2 - 1) > 0.25).map(b => `**${b.name}** is worth about ${Math.round(score(b) / 2 * 100)}% of the Wanderer package (Gil and Lumens counted against the defaults).`)
if (flagsB.length) out.push('', ...flagsB.map(f => `- ⚠ ${f}`))

// 2. Paths: Tier 1 of each weapon and magic tree.
const isActive = s => !/^(Passive|Aura)/i.test(s.desc)
const buyStats = (lumens, plan) => {
  const stats = { ...DEFAULT_STATS }; const bought = {}
  let left = lumens
  for (const [stat, target] of plan) {
    while (stats[stat] < target) {
      const c = getStatCostForPurchasedCount(stat, bought[stat] || 0)
      if (c > left) return { stats, left }
      left -= c; bought[stat] = (bought[stat] || 0) + 1; stats[stat] += 1
    }
  }
  return { stats, left }
}
const hitChance = (acc, def) => Math.max(5, Math.min(95, (21 - (def - acc)) * 5))
const rows = []
const LUMENS = 113, GIL = 2400
for (const [cat, trees] of [['weapons', skillsJson.weapons], ['magic', skillsJson.magic]]) {
  for (const [tree, list] of Object.entries(trees)) {
    const t1 = list.filter(s => s.tier === 1)
    const t1Cost = t1.reduce((t, s) => t + s.cost, 0)
    const actives = t1.filter(isActive)
    const magic = cat === 'magic' || tree === 'staff'
    const dmgStat = magic ? 'magicPower' : 'strength'
    const { stats, left } = buyStats(LUMENS - t1Cost, [[dmgStat, 0], ['accuracy', 0], [dmgStat, 1], ['hp', 15]])
    const weapons = Object.values(items.weapons).filter(w => w.rarity === 'common' && KIND[tree]?.test(w.id)).sort((a, b) => gil(a.price) - gil(b.price))
    const w = weapons[0]
    let dmg, how
    if (cat === 'magic') {
      const spell = actives.find(s => /\d+d\d+/.test(s.desc))
      dmg = spell ? avgDice(spell.desc) + stats.magicPower : 0
      how = spell ? `${spell.name}` : 'no Tier 1 damage spell'
    } else if (tree === 'striker') {
      dmg = 2.5 + stats.strength; how = 'unarmed 1d4'
    } else {
      dmg = w ? avgDice(w.damage) + stats[dmgStat] + (w.statModifiers?.[dmgStat] || 0) : 0
      how = w ? `${w.name} (${w.damage}, ${gil(w.price)} Gil)` : 'no common weapon'
    }
    const rawStat = DEFAULT_STATS[dmgStat] + (cat === 'magic' || tree === 'striker' ? 0 : (w?.statModifiers?.[dmgStat] || 0))
    const rawDmg = cat === 'magic' ? (dmg ? dmg - stats.magicPower + DEFAULT_STATS.magicPower : 0) : tree === 'striker' ? 2.5 + DEFAULT_STATS.strength : (w ? avgDice(w.damage) + rawStat : 0)
    const acc = stats.accuracy + (w?.statModifiers?.accuracy || 0)
    const hit = hitChance(acc, cat === 'magic' ? foe.md : foe.pd)
    const perTurn = Math.max(0, dmg) * hit / 100
    rows.push({ rawDmg, tree, cat, t1, t1Cost, actives, stats, left, dmg, how, hit, perTurn, turns: perTurn ? Math.ceil(foe.hp / perTurn) : Infinity, toT2: TIER_MIN_LEVEL[2] - t1.length })
  }
}
out.push('', '## Starting paths (Wanderer: 113 Lumens, 2,400 Gil)', '', 'Plan for each path: learn every Tier 1 skill of the tree, then raise the damage stat to 0, Accuracy to 0, the damage stat to +1, then HP, as far as the Lumens go. Fights use the typical level-1 monster.', '')
out.push('"Untouched" = damage if the player spends no Lumens on Strength or Magic Power (starting −3).', '')
out.push('| Path | Tier 1 skills (L) | Actives at Tier 1 | Attack | Avg damage (untouched) | Hit chance | Turns to drop a lv1 monster |', '|---|---|---|---|---|---|---|')
for (const r of rows) out.push(`| ${r.tree} | ${r.t1.length} (${r.t1Cost}) | ${r.actives.map(s => s.name).join(', ') || '**none**'} | ${r.how} | ${r.dmg.toFixed(1)} (${Math.max(0, r.rawDmg).toFixed(1)}) | ${r.hit}% | ${r.turns === Infinity ? '**never**' : r.turns} |`)

// 3. Flags.
const flags = []
for (const r of rows) {
  if (!r.actives.length) flags.push(`**${r.tree}**: both Tier 1 skills are passive, so a new ${r.tree} player has no button to press except Basic Attack. → Make one Tier 1 skill an action (even a small one), so the first session feels like the tree.`)
  if (r.dmg <= 0) flags.push(`**${r.tree}**: no Tier 1 skill deals damage, so a new ${r.tree} caster has no way to attack except a weak Basic Attack. → Give the tree a Tier 1 damage spell, like every other element.`)
  if (r.turns > 4 && r.turns !== Infinity) flags.push(`**${r.tree}**: takes about ${r.turns} turns to drop one level-1 monster. New players lose interest when nothing they do seems to matter.`)
  if (r.toT2 > 0) flags.push(`**${r.tree}**: has only ${r.t1.length} Tier 1 skills, but Tier 2 needs Skill Level ${TIER_MIN_LEVEL[2]}. A new player must learn ${r.toT2} skills from other trees first. Fine if intended; say it on the Skills tab.`)
}
const weak = rows.filter(r => r.rawDmg <= 1.5 && r.dmg > 0)
if (weak.length) flags.push(`${weak.length} of ${rows.length} paths average 1.5 damage or less per hit if the player does not buy Strength or Magic Power first (${weak.map(r => r.tree).join(', ')}). Starting damage stats are −3, so a brand-new player who spends Lumens on skills instead can deal 0 damage, and nothing on screen tells them why. → Start damage stats at 0, or have Guided Create recommend raising them first.`)
const uniq = [...new Set(flags)]
const groupBy = re => uniq.filter(f => re.test(f))
out.push('', '## Flags', '')
const t2 = groupBy(/Tier 2 needs/)
for (const f of uniq.filter(f => !/Tier 2 needs/.test(f))) out.push(`- ${f}`)
if (t2.length) out.push(`- ${t2.length} of ${rows.length} trees have fewer Tier 1 skills than the Skill Level needed for Tier 2 (${TIER_MIN_LEVEL[2]}), so every new player has to branch out before their own Tier 2. Fine if intended; the Skills tab should say it.`)
console.log(out.join('\n'))
