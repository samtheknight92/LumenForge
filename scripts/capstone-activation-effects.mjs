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
  ],
  // Monster and career fusions (generate-monster-career-fusions.mjs): self buffs + mixed effects
  glacial_carapace: [
    { effectId: 'stone_skin', duration: 3, potency: 0, applyTo: 'self' }
  ],
  colossus_awakening: [
    { effectId: 'stone_skin', duration: 4, potency: 0, applyTo: 'self' },
    { effectId: 'immobilized', duration: 2, potency: 0, applyTo: 'target', chance: 0.75 }
  ],
  umbral_predator: [
    { effectId: 'stealth_mastery', duration: 2, potency: 0, applyTo: 'self' },
    { effectId: 'fear', duration: 2, potency: 0, applyTo: 'target', chance: 0.75 }
  ],
  seraph_plumage: [
    { effectId: 'regeneration', duration: 3, potency: 2, applyTo: 'self' }
  ],
  apex_hunter: [
    { effectId: 'stealth_mastery', duration: 2, potency: 0, applyTo: 'self' },
    { effectId: 'immobilized', duration: 2, potency: 0, applyTo: 'target', chance: 0.75 }
  ],
  headsmans_fury: [
    { effectId: 'exhausted', duration: 1, potency: 0, applyTo: 'self' }
  ],
  wardens_circle: [
    { effectId: 'spell_warded', duration: 3, potency: 0, applyTo: 'self' }
  ],
  archmages_rod: [
    { effectId: 'empowered', duration: 2, potency: 3, applyTo: 'self' }
  ],
  vanishing_stab: [
    { effectId: 'stealth_mastery', duration: 1, potency: 0, applyTo: 'self' }
  ],
  unbreakable_line: [
    { effectId: 'protected', duration: 3, potency: 3, applyTo: 'self' }
  ],
  anvil_of_war: [
    { effectId: 'weapon_enchanted', duration: 3, potency: 0, applyTo: 'self' }
  ],
  fusion_bulwark_of_stone: [
    { effectId: 'stone_skin', duration: 3, potency: 0, applyTo: 'self' }
  ],
  fusion_gale_chorus: [
    { effectId: 'enhanced_mobility', duration: 3, potency: 0, applyTo: 'self' }
  ],
  fusion_tide_runes: [
    { effectId: 'regeneration', duration: 3, potency: 2, applyTo: 'self' }
  ],
  fusion_radiant_oath: [
    { effectId: 'protected', duration: 2, potency: 3, applyTo: 'self' },
    { effectId: 'fear', duration: 2, potency: 0, applyTo: 'target', chance: 0.2 }
  ]
}
