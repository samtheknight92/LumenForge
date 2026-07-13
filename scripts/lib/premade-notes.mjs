import { DEFAULT_STATS } from '../../js/core/constants.js'

const STAT_LABELS = {
  hp: 'HP',
  stamina: 'Stamina',
  strength: 'Strength',
  magicPower: 'Magic Power',
  accuracy: 'Accuracy',
  speed: 'Speed',
  physicalDefence: 'Physical Defence',
  magicalDefence: 'Magical Defence'
}

const VARIANT_LINES = {
  pure: null,
  lopsided: stat => `They leaned even harder into that at the cost of everything else — ${stat} in particular was left untrained.`,
  glass: () => 'Every spare point went into offense; defence was barely an afterthought, so this build hits hard and breaks easily.'
}

function statDeltas(stats) {
  return Object.entries(stats)
    .map(([stat, value]) => [stat, Number(value) - Number(DEFAULT_STATS[stat] ?? 0)])
    .filter(([, delta]) => Number.isFinite(delta))
}

function topStats(stats, count = 2) {
  return statDeltas(stats)
    .filter(([, delta]) => delta > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([stat]) => stat)
}

function weakestTrainedStat(stats, shape) {
  const shaped = Object.keys(shape || {}).filter(stat => (shape[stat] || 0) > 0)
  if (!shaped.length) return null
  const deltas = new Map(statDeltas(stats))
  return shaped.sort((a, b) => (deltas.get(a) ?? 0) - (deltas.get(b) ?? 0))[0]
}

function skillFlavorLine(skillNames) {
  if (!skillNames.length) return ''
  if (skillNames.length === 1) return `Their go-to move is ${skillNames[0]}.`
  const shown = skillNames.slice(0, 3)
  return `Their kit leans on ${joinList(shown)}${skillNames.length > 3 ? ', among others' : ''}.`
}

function joinList(items) {
  if (items.length <= 1) return items.join('')
  const shown = [...items]
  const last = shown.pop()
  return `${shown.join(', ')} and ${last}`
}

function gearLine(gearNames) {
  if (!gearNames.length) return ''
  return `Carries ${joinList(gearNames)}.`
}

/**
 * Builds the "why is this character built this way" summary that goes in
 * notes — one concept sentence, one stat-reasoning sentence, one skill/gear
 * sentence, so every premade documents its own build instead of being a
 * black box. The defeat-loot line is appended separately by the build script.
 */
export function buildPremadeNotes({ name, concept, level, threatLevel, stats, shape, variant, skillNames = [], gearNames = [] }) {
  const dominant = topStats(stats, 2).map(stat => STAT_LABELS[stat] || stat)
  const weakStat = weakestTrainedStat(stats, shape)
  const sentences = []

  sentences.push(`${name} ${concept}.`)

  if (dominant.length) {
    sentences.push(`Built around ${dominant.join(' and ')} (Threat Level ${threatLevel}), which is where nearly every stat point above the baseline sheet went.`)
  }

  const variantLine = VARIANT_LINES[variant]
  if (variantLine && weakStat) {
    sentences.push(variantLine(STAT_LABELS[weakStat] || weakStat))
  }

  const skillLine = skillFlavorLine(skillNames)
  if (skillLine) sentences.push(skillLine)

  const gear = gearLine(gearNames)
  if (gear) sentences.push(gear)

  return sentences.join(' ')
}
