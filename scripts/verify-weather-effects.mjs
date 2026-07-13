import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { importJs } from './lib/js-import.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jsonDir = join(root, 'data', 'json')

globalThis.fetch = async url => {
  const file = url.split('?')[0].split('/').pop()
  if (file === 'manifest.json') return { ok: true, json: async () => ({ version: 'verify' }) }
  const data = JSON.parse(readFileSync(join(jsonDir, file), 'utf8'))
  return { ok: true, json: async () => data }
}

const { loadGameData } = await importJs('data.js')
const { initCache, getSkill } = await importJs('cache.js')
const {
  createCharacter,
  computeStats,
  normalizeStatusEffect,
  invalidateCharacterCache,
  getEffect
} = await importJs('character.js')
const { getActionBarSkillBonuses } = await importJs('action-bar-bonuses.js')
const {
  weatherProcessTurnStaminaDrain,
  manaStormAccuracyDelta,
  weatherGameplayLines
} = await importJs('weather-effects.js')
const { tickWeatherEffects } = await importJs('effects.js')

await loadGameData()
initCache()

const WEATHER_IDS = [
  'weather_rain',
  'weather_heatwave',
  'weather_blizzard',
  'weather_fog',
  'weather_sandstorm',
  'weather_thunderstorm',
  'weather_ashfall',
  'weather_mana_storm'
]

for (const id of WEATHER_IDS) {
  if (!getEffect(id)) throw new Error(`Missing weather effect: ${id}`)
}

const rain = getEffect('weather_rain')
if (!rain.elementAccuracyModifiers?.fire || rain.elementAccuracyModifiers.water !== 2) {
  throw new Error('Rain element modifiers incorrect')
}
if (getEffect('weather_heatwave').processTurnStaminaDrain !== 1) {
  throw new Error('Heatwave should drain 1 stamina per process turn')
}
if (!getEffect('weather_mana_storm').manaStorm) throw new Error('Mana storm flag missing')

const character = createCharacter('Tester', 'human')
const base = computeStats(character)

function withWeather(effectId, extras = {}) {
  character.weatherEffects = [normalizeStatusEffect({ effectId, duration: 0, ...extras })]
  invalidateCharacterCache(character)
  return computeStats(character)
}

const blizzard = withWeather('weather_blizzard')
if (blizzard.speed !== base.speed - 2 || blizzard.accuracy !== base.accuracy - 2) {
  throw new Error('Blizzard global penalties failed')
}

const fog = withWeather('weather_fog')
if (fog.accuracy !== base.accuracy - 3) throw new Error('Fog accuracy penalty failed')

character.weatherEffects = [normalizeStatusEffect({ effectId: 'weather_rain', duration: 0 })]
invalidateCharacterCache(character)
const fireSkill = getSkill('fire_spark')
const waterSkill = getSkill('water_splash') || getSkill('water_jet') || getSkill('water_bolt')
if (!fireSkill) throw new Error('Missing fire_spark fixture skill')
if (!waterSkill) throw new Error('Missing water skill fixture')

const fireBonuses = getActionBarSkillBonuses(character, fireSkill)
const waterBonuses = getActionBarSkillBonuses(character, waterSkill)
const fireAcc = fireBonuses.find(row => row.stat === 'accuracy')?.value || 0
const waterAcc = waterBonuses.find(row => row.stat === 'accuracy')?.value || 0
if (fireAcc !== -2) throw new Error(`Rain should give fire skills -2 accuracy (got ${fireAcc})`)
if (waterAcc !== 2) throw new Error(`Rain should give water skills +2 accuracy (got ${waterAcc})`)

character.weatherEffects = [normalizeStatusEffect({ effectId: 'weather_mana_storm', duration: 0, combatRoll: 1 })]
invalidateCharacterCache(character)
const magicSkill = getSkill('fire_spark')
const manaLow = getActionBarSkillBonuses(character, magicSkill).find(row => row.stat === 'accuracy')?.value || 0
if (manaLow !== -2) throw new Error('Mana storm roll 1-2 should be -2 accuracy for magic')

character.weatherEffects = [normalizeStatusEffect({ effectId: 'weather_mana_storm', duration: 0, combatRoll: 6 })]
invalidateCharacterCache(character)
const manaHigh = getActionBarSkillBonuses(character, magicSkill).find(row => row.stat === 'accuracy')?.value || 0
if (manaHigh !== 2) throw new Error('Mana storm roll 5-6 should be +2 accuracy for magic')

if (manaStormAccuracyDelta(3) !== 0 || manaStormAccuracyDelta(5) !== 2) {
  throw new Error('manaStormAccuracyDelta branches failed')
}
if (manaStormAccuracyDelta(undefined) !== 0 || manaStormAccuracyDelta('') !== 0) {
  throw new Error('Mana storm with no roll should not apply accuracy delta')
}

character.weatherEffects = [normalizeStatusEffect({ effectId: 'weather_mana_storm', duration: 0 })]
invalidateCharacterCache(character)
const manaUnset = getActionBarSkillBonuses(character, magicSkill).find(row => row.stat === 'accuracy')?.value || 0
if (manaUnset !== 0) throw new Error('Mana storm without combat roll should not modify accuracy')

character.weatherEffects = [normalizeStatusEffect({ effectId: 'weather_rain', duration: 1, finiteDuration: true })]
invalidateCharacterCache(character)
tickWeatherEffects(character)
if ((character.weatherEffects || []).length) throw new Error('Timed weather should expire after one tick')

character.weatherEffects = [normalizeStatusEffect({ effectId: 'weather_heatwave', duration: 0 })]
invalidateCharacterCache(character)
if (weatherProcessTurnStaminaDrain(character) !== 1) throw new Error('Heatwave drain helper failed')

const lines = weatherGameplayLines(getEffect('weather_thunderstorm'))
if (!lines.some(line => line.includes('Lightning'))) throw new Error('Thunderstorm gameplay lines missing')

character.weatherEffects = []
invalidateCharacterCache(character)
const cleared = computeStats(character)
if (cleared.speed !== base.speed || cleared.accuracy !== base.accuracy) {
  throw new Error('Removing weather should restore stats')
}

console.log('verify-weather-effects: ok')
