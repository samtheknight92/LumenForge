/**
 * Explicit activationEffects for capstone skills whose desc wording
 * does not match apply-phrase parsing (and/or mix self + target effects).
 * Merged by attach-activation-effects.mjs on each build.
 */
export const CAPSTONE_ACTIVATION_EFFECTS = {
  fire_shield: [
    { effectId: 'protected', duration: 6, potency: 3, applyTo: 'self' }
  ],
  ultimate_worldbreaker_cleave: [
    { effectId: 'temp_defense', duration: 1, potency: -2, applyTo: 'self' }
  ],
  ultimate_death_by_cuts: [
    { effectId: 'bleeding', duration: 3, potency: 4, applyTo: 'target' }
  ],
  ultimate_seismic_judgment: [
    { effectId: 'knockdown', duration: 1, potency: 0, applyTo: 'target' }
  ],
  ultimate_inferno_crown: [
    { effectId: 'burn', duration: 3, potency: 5, applyTo: 'target' },
    { effectId: 'exhausted', duration: 1, potency: 0, applyTo: 'self' }
  ],
  ultimate_absolute_zero: [
    { effectId: 'immobilized', duration: 2, potency: 0, applyTo: 'target' }
  ],
  ultimate_eclipse_dominion: [
    { effectId: 'fear', duration: 2, potency: 0, applyTo: 'target' }
  ],
  ultimate_nova: [
    { effectId: 'exhausted', duration: 3, potency: 0, applyTo: 'self' }
  ]
}
