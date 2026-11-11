#!/usr/bin/env node
// Homebrew Balance check: weapons get a fair price, skills get power vs their tier.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { importJs } from './lib/js-import.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jsonDir = join(root, 'data', 'json')
globalThis.fetch = async url => {
  const file = url.split('?')[0].split('/').pop()
  if (file === 'manifest.json') return { ok: true, json: async () => ({ version: 'verify' }) }
  return { ok: true, json: async () => JSON.parse(readFileSync(join(jsonDir, file), 'utf8')) }
}

const { loadGameData } = await importJs('data.js')
const { initCache } = await importJs('cache.js')
const { averageDice, homebrewItemBalance, homebrewSkillBalance, homebrewSkillPower, renderBalanceCheck } = await importJs('homebrew/balance-check.js')
await loadGameData()
initCache()

assert.equal(averageDice('2d6'), 7)
assert.equal(averageDice('1d8+2'), 6.5)
assert.equal(averageDice('100 + 10d20'), 205)

// Weapons: no price -> suggestion; fair price -> good; huge/tiny price -> warn
const sword = { type: 'weapon', rarity: 'rare', damage: '1d10', statModifiers: { strength: 1 }, specialEffects: ['burn_on_hit'], shopPriceGil: 0 }
const base = homebrewItemBalance(sword)
assert.ok(base, 'weapon gets a result')
assert.match(base.headline, /suggested price/)
const fair = Number(base.lines[1].match(/about ([\d,]+) Gil/)[1].replace(/,/g, ''))
assert.ok(fair > 0, 'fair price is positive')
assert.equal(homebrewItemBalance({ ...sword, shopPriceGil: fair }).tone, 'good')
assert.equal(homebrewItemBalance({ ...sword, shopPriceGil: fair * 3 }).tone, 'warn')
assert.equal(homebrewItemBalance({ ...sword, shopPriceGil: Math.round(fair / 3) }).tone, 'warn')
// A strong perk raises the fair price over a plain weapon with the same dice
const plain = homebrewItemBalance({ ...sword, specialEffects: [] })
const plainFair = Number(plain.lines[1].match(/about ([\d,]+) Gil/)[1].replace(/,/g, ''))
assert.ok(fair > plainFair, 'perks add value')
// Absurd dice get flagged even at a fair price
assert.match(homebrewItemBalance({ ...sword, damage: '6d12', shopPriceGil: 999999 }).lines.join(' '), /Damage 6d12/)
// Consumables and materials are skipped
assert.equal(homebrewItemBalance({ type: 'consumable', rarity: 'common' }), null)

// Skills
const t2 = { skillType: 'activatable', tier: 2, cost: 20, staminaCost: 4, damageMode: 'dice', damageDice: '2d6', damageStat: 'strength', defaultApplyTo: 'oneEnemy', activationEffects: [] }
const ok = homebrewSkillBalance(t2)
assert.notEqual(ok.tone, 'warn', `ordinary T2 attack should not warn: ${ok.headline} ${ok.lines.join(' ')}`)
const huge = homebrewSkillBalance({ ...t2, damageDice: '10d12', defaultApplyTo: 'allEnemies' })
assert.equal(huge.tone, 'warn')
assert.match(huge.headline, /stronger than a typical Tier 2/)
// Statuses add power
const stun = { ...t2, activationEffects: [{ effectId: 'stunning', duration: 2, applyTo: 'oneEnemy' }] }
assert.ok(homebrewSkillPower(stun) > homebrewSkillPower(t2), 'statuses add power')
// Self buffs do not count as enemy statuses
assert.equal(homebrewSkillPower({ ...t2, activationEffects: [{ effectId: 'stunning', duration: 2, applyTo: 'self' }] }), homebrewSkillPower(t2))
// Limited use lowers power
assert.ok(homebrewSkillPower({ ...t2, useLimit: 'oncePerRest' }) < homebrewSkillPower(t2))
// Cost far from the tier price warns
assert.equal(homebrewSkillBalance({ ...t2, cost: 2 }).tone, 'warn')
// Free, unlimited damage warns
assert.match(homebrewSkillBalance({ ...t2, staminaCost: 0 }).lines.join(' '), /costs no Stamina/)
// Passive stat bonuses priced like the Stats tab
assert.equal(homebrewSkillBalance({ skillType: 'passive', tier: 1, cost: 8, statModifiers: { speed: 3 } }).tone, 'warn')
assert.notEqual(homebrewSkillBalance({ skillType: 'passive', tier: 1, cost: 8, statModifiers: { hp: 2 } }).tone, 'warn')

// HTML is escaped
const html = renderBalanceCheck({ tone: 'warn', headline: '<b>x</b>', lines: ['<i>y</i>'] }, s => String(s).replace(/</g, '&lt;'))
assert.ok(!html.includes('<b>') && !html.includes('<i>'))

console.log('verify-homebrew-balance: ok')
