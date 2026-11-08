#!/usr/bin/env node
/**
 * structure-and-wording-check — read-only report. Never writes to game data.
 * Run from the repo root: node .claude/skills/structure-and-wording-check/check.mjs [--all] [--max 8]
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = p => fs.readFileSync(path.join(root, p), 'utf8')
const args = process.argv.slice(2)
const MAX = args.includes('--all') ? Infinity : Number(args.includes('--max') ? args[args.indexOf('--max') + 1] : 6)

const skillsJson = JSON.parse(read('data/json/skills.json'))
const itemsJson = JSON.parse(read('data/json/items.json'))
const effects = JSON.parse(read('data/json/effects.json'))
const races = JSON.parse(read('data/json/races.json'))

// ---------- collect every bit of player-facing text ----------
const texts = [] // { where, name, text, skill? }
const walk = (node, where) => {
  if (Array.isArray(node)) { for (const s of node) if (s?.id) texts.push({ where, name: s.name, text: String(s.desc || ''), skill: s }); return }
  if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, where ? `${where}/${k}` : k)
}
walk(skillsJson, 'skills')
for (const [cat, list] of Object.entries(itemsJson)) for (const it of Object.values(list)) texts.push({ where: `items/${cat}`, name: it.name, text: String(it.desc || '') })
for (const ef of Object.values(effects)) texts.push({ where: 'status effects', name: ef.name, text: String(ef.desc || '') })
for (const r of Object.values(races)) for (const t of [r.description, ...(r.passiveTraits || [])]) texts.push({ where: `races/${r.id}`, name: r.name, text: String(t || '') })
// Rules pages: pull the quoted strings out of the How to Play and Glossary files.
const ruleText = []
for (const file of ['js/ui/how-to-play.js', 'js/ui/glossary.js']) {
  if (!fs.existsSync(path.join(root, file))) continue
  for (const m of read(file).matchAll(/'((?:[^'\\]|\\.){40,})'/g)) {
    const t = m[1].replace(/\\'/g, "'").replace(/<[^>]+>/g, '').replace(/\\n/g, ' ')
    texts.push({ where: file.includes('glossary') ? 'Glossary' : 'How to Play', name: '', text: t }); ruleText.push(t)
  }
}
const allRules = ruleText.join(' ')

// ---------- checks ----------
const findings = [] // { check, title, why, items: [{where,name,quote,rewrite}] }
const add = (check, title, why, items) => { if (items.length) findings.push({ check, title, why, items }) }
const quote = (text, re) => {
  const m = text.match(re); if (!m) return text.slice(0, 140)
  const i = Math.max(0, m.index - 50); const j = Math.min(text.length, m.index + m[0].length + 60)
  return `${i ? '…' : ''}${text.slice(i, j)}${j < text.length ? '…' : ''}`
}

// 1. Same idea, different words across the game.
const SYNONYMS = [
  { name: 'Armour vs Armor', pick: 'Armour', flag: [0], forms: [/\bArmor\b/i, /\bArmour\b/i], why: 'The game mostly uses British spelling ("Defence"), but both "Armor" and "Armour" appear. Searching or reading rules for one spelling misses the other.' },
  { name: 'Defence vs Defense', pick: 'Defence', flag: [0], forms: [/\bDefense\b/, /\bDefence\b/], why: 'Stats are called "Physical Defence" and "Magical Defence". A few texts spell it "Defense", which looks like a different rule.' },
  { name: 'turn vs round', pick: 'turns (the app already counts a round as one turn)', flag: [0], forms: [/\b\d+ rounds?\b/i, /\b\d+ turns?\b/i], why: 'Durations are written as both "for 3 turns" and "for 3 rounds". The app counts both the same way (one tick per Process Turn), but at the table a "round" usually means everyone has had a turn, so a GM may run a round-long effect longer than the app does.' },
  { name: 'once per combat / scene / encounter', pick: 'once per combat', flag: [1, 2], forms: [/once per combat/i, /once per scene/i, /once per encounter/i], why: 'These limits look the same but could mean different things. A "scene" might be a whole dungeon room including talk; a "combat" ends when the fighting does. The app\'s New Combat button resets "per combat" uses only.' },
  { name: 'Saving Roll vs save / saving throw', pick: 'Saving Roll', flag: [1], forms: [/Saving Roll/, /\bsave or\b|\bmust save\b|\bsaving throw\b/i], why: 'The rules define "Saving Roll" with a difficulty ladder (Easy 8, Normal 11, Hard 14…), but many skills just say "save" with no difficulty, so the GM has to guess the number.' },
  { name: 'Stamina vs mana', pick: 'Stamina', flag: [1], forms: [/\bStamina\b/i, /\bmana\b/i], why: 'The game has no Mana stat; spells cost Stamina. Texts that say "mana" (for example "restore mana") leave a new player looking for a bar that does not exist.' }
]
for (const s of SYNONYMS) {
  const hits = s.forms.map(re => texts.filter(t => re.test(t.text)))
  if (hits.filter(h => h.length).length < 2) continue
  const flagged = s.flag.flatMap(i => hits[i].map(t => ({ where: t.where, name: t.name, quote: quote(t.text, s.forms[i]), rewrite: `Use "${s.pick}".` })))
  add('terms', `Mixed terms: ${s.name} (${hits.map((h, i) => `${String(s.forms[i]).replace(/\\[bd]\+?|\/|\?|i$/g, '').trim()}: ${h.length}`).join(', ')})`, s.why, flagged)
}

// 2. Vague words a player and GM may read differently.
const VAGUE = [
  [/\bnearby\b/i, 'Give a distance, e.g. "within 15ft".'],
  [/\bslows? (?:enemies|the target|targets)\s*\d*%?/i, 'Say exactly what "slow" does, e.g. "Speed −2 (−10ft movement) for 2 turns".'],
  [/\bas appropriate\b|\bas the GM sees fit\b|\bor similar\b|\betc\b\.?/i, 'Name the cases, or say plainly "the GM decides" so players know it is a ruling.'],
  [/\bsmall\b(?! flame)|\blarge\b|\bmassive\b|\bminor\b/i, 'Give a size or number where it affects play (e.g. "restore 1 HP", "a 10ft wall").'],
  [/\bfor a while\b|\bbriefly\b|\btemporarily\b|\bshort time\b/i, 'Give a duration, e.g. "for 2 turns".'],
  [/\bstronger\b|\bweaker\b|\bhotter\b|\bfaster\b(?! than)/i, 'Turn the comparison into a number (e.g. "+1d4 fire damage").']
]
for (const [re, fix] of VAGUE) {
  const sentenceOf = text => (text.split(/(?<=[.;])\s/).find(x => re.test(x)) || '')
  const hits = texts.filter(t => t.skill && re.test(t.text) && !/^Passive/i.test(t.text) && !(/small|large|massive|minor/i.test(String(re)) && /\d/.test(sentenceOf(t.text))))
  add('vague', `Vague wording: "${(hits[0]?.text.match(re) || [''])[0].trim()}" and similar`, 'Words like this have no number behind them. At the table the player will read it generously and the GM strictly, which leads to arguments.', hits.map(t => ({ where: t.where, name: t.name, quote: quote(t.text, re), rewrite: fix })))
}

// 3. Effects with no duration.
const DURATION = /\b\d+\s*(?:turns?|rounds?|minutes?|hours?|days?)\b|until|while|per turn|end of|this turn|next turn|combat|scene|rest|instant|permanent|1 day|once/i
const missingDur = texts.filter(t => t.skill && !/^(Passive|Aura|Toggle|Craft|Enchant)/i.test(t.text) &&
  /(?:\bgain|\bgains|apply|applies|grant|grants)\b[^.]*\+\d|\+\d+[^.]*\bto (?:all )?all(?:y|ies)/i.test(t.text) && !DURATION.test(t.text))
add('duration', 'Bonus with no duration', 'A bonus with no end time can be read as lasting the whole fight, or the whole day. The Process Turn button also cannot tick it down.', missingDur.map(t => ({ where: t.where, name: t.name, quote: quote(t.text, /gain|grant|apply|\+\d/i), rewrite: 'Add "for N turns" (or "until the end of combat").' })))

// 4. Text says one thing, app does another (status chance and named statuses).
const effectNames = new Map(Object.values(effects).map(e => [e.name.toLowerCase(), e.id]))
const mismatch = []
for (const t of texts.filter(x => x.skill)) {
  const acts = t.skill.activationEffects || []
  const m = t.text.match(/(\d+)% chance to apply ([A-Za-z ]+?)(?: and ([A-Za-z ]+?))?(?:[.(,]|$)/)
  if (!m) continue
  const pct = Number(m[1]) / 100
  const named = [m[2], m[3]].filter(Boolean).map(n => n.trim().toLowerCase().replace(/^both /, ''))
  const ids = named.map(n => effectNames.get(n)).filter(Boolean)
  const missing = ids.filter(id => !acts.some(a => a.effectId === id))
  const wrongChance = acts.filter(a => ids.includes(a.effectId) && a.chance != null && Math.abs(a.chance - pct) > 0.001)
  if (missing.length || wrongChance.length) {
    mismatch.push({ where: t.where, name: t.name, quote: m[0], rewrite: [
      missing.length ? `The app only rolls for ${acts.map(a => a.effectId).join(', ') || 'nothing'}; ${missing.join(', ')} is never applied. Either add it to the skill's effects or remove it from the text.` : '',
      wrongChance.length ? `The app rolls ${wrongChance.map(a => `${a.effectId} at ${Math.round(a.chance * 100)}%`).join(', ')}, not ${m[1]}%. Make the text and the number match.` : ''
    ].filter(Boolean).join(' ') })
  }
}
add('mismatch', 'Text and app disagree', 'The description is what the player reads; the app is what actually happens when they press the button. When they differ, nobody knows which is right.', mismatch)

// 5. "X and Y" status with one chance: one roll or two?
const andStatus = texts.filter(t => t.skill && /\d+% chance to apply (?!both)[A-Z][a-z]+(?: [A-Z][a-z]+)? and [A-Z]/.test(t.text))
add('two-readings', 'One chance, two statuses', 'Does one roll apply both statuses, or is each rolled on its own? A player will roll once; a GM may roll twice.', andStatus.map(t => ({ where: t.where, name: t.name, quote: quote(t.text, /\d+% chance to apply [^.]+/), rewrite: (() => { const m = t.text.match(/(\d+)% chance to apply ([A-Z][a-z]+(?: [A-Z][a-z]+)?) and ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/); return m ? `"Roll once (${m[1]}%): on a success the target gains both ${m[2]} and ${m[3]}." — or "${m[1]}% chance each" if they roll separately.` : 'Say whether it is one roll or two.' })() })))

// 6. Status names in text that are not real statuses.
const known = new Set([...effectNames.keys()])
const unknown = []
for (const t of texts.filter(x => x.skill)) {
  for (const m of t.text.matchAll(/apply (?:both )?([A-Z][a-z]+(?: [A-Z][a-z]+)?)/g)) {
    const n = m[1].toLowerCase()
    if (!known.has(n) && !known.has(n.split(' ')[0])) unknown.push({ where: t.where, name: t.name, quote: quote(t.text, new RegExp(m[1])), rewrite: `"${m[1]}" is not in the status list. Use an existing status or add "${m[1]}" to the status list with its rules.` })
  }
}
add('undefined', 'Status named but not defined', 'A new player will look for this status in the glossary and not find it, so the GM has to invent its rules on the spot.', unknown)

// 7. Terms used in skills but never explained in How to Play or the Glossary.
const TERMS = ['long rest', 'short rest', 'friendly fire', 'difficult terrain', 'per day', 'reaction', 'Advantage', 'concentration', 'Harmony']
const undefinedTerms = TERMS.map(term => {
  const re = new RegExp(term, 'i')
  const uses = texts.filter(t => t.skill && re.test(t.text))
  return { term, uses, defined: re.test(allRules) }
}).filter(x => x.uses.length && !x.defined)
add('glossary', 'Used in skills, never explained', 'New players meet these words on skill cards, but How to Play and the Glossary do not say what they mean.', undefinedTerms.map(x => ({ where: `${x.uses.length} skills`, name: x.term, quote: x.uses.slice(0, 3).map(u => u.name).join(', '), rewrite: `Add a one-line Glossary entry for "${x.term}".` })))

// 8. Rules pages that contradict each other.
const contradictions = []
if (/Advantage|Disadvantage/.test(allRules)) contradictions.push({ where: 'How to Play / Glossary', name: 'Advantage', quote: quote(allRules, /Advantage/), rewrite: 'The game\'s own rules checker treats "advantage/disadvantage" as a D&D term to avoid, but the Saving Roll rules use it. Either define Advantage (roll two d20, keep the higher) in the Glossary, or replace it with "+2 / −2".' })
add('contradiction', 'Rules that disagree with each other', 'When two parts of the rules point different ways, the GM has to pick one at the table.', contradictions)

// ---------- report ----------
const out = [`# Structure and wording check — ${texts.length} texts read`, '']
for (const f of findings) {
  out.push(`## ${f.title} — ${f.items.length}`, '', `Why: ${f.why}`, '')
  for (const it of f.items.slice(0, MAX)) out.push(`- **${it.name || '(rules text)'}** (${it.where}): "${it.quote}" → ${it.rewrite}`)
  if (f.items.length > MAX) out.push(`- …and ${f.items.length - MAX} more (run with --all).`)
  out.push('')
}
out.push(`Summary: ${findings.reduce((t, f) => t + f.items.length, 0)} issues in ${findings.length} groups.`)
console.log(out.join('\n'))
