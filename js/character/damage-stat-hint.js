/**
 * New-player hint: characters start with Strength and Magic Power at −3 on
 * purpose (stats are bought with Lumens too). This explains, in plain words,
 * what a negative damage stat means at the table while both are still below 0.
 */
const signed = n => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')

/** Returns a hint string, or '' when the character already has a damage stat at 0 or more. */
export function damageStatHint(stats) {
  const strength = Number(stats?.strength ?? 0)
  const magicPower = Number(stats?.magicPower ?? 0)
  if (strength >= 0 || magicPower >= 0) return ''
  const best = Math.max(strength, magicPower)
  const severity = best <= -3 ? 'most hits will deal only the minimum 1 damage' : 'your hits will deal less than the dice show'
  return `Your Strength is ${signed(strength)} and Magic Power is ${signed(magicPower)}. Every hit adds this number to its damage roll, so ${severity}. Raise Strength (for weapons) or Magic Power (for spells) to 0 or more before buying lots of skills.`
}
