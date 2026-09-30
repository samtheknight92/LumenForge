/**
 * Fusion requirements (designer rule, Sept 2026): every fusion needs two normal
 * skills from its two parent trees, each of the fusion's tier or one below.
 * No fusion requires another fusion. Applied by scripts/apply-fusion-prereqs.mjs.
 */
export const FUSION_PREREQS = {
  "flame_arrow": [
    "power_shot",
    "fireball"
  ],
  "inferno_volley": [
    "multi_shot",
    "explosion"
  ],
  "phoenix_shot": [
    "homing_shot",
    "fire_tornado"
  ],
  "frost_arrow": [
    "aimed_shot",
    "ice_shard"
  ],
  "glacier_volley": [
    "multi_shot",
    "ice_spear"
  ],
  "blizzard_shot": [
    "siege_shot",
    "ice_age"
  ],
  "storm_arrow": [
    "aimed_shot",
    "spark"
  ],
  "thunder_volley": [
    "multi_shot",
    "thunder_clap"
  ],
  "bow_lightning_storm": [
    "piercing_shot",
    "lightning_storm"
  ],
  "stone_arrow": [
    "power_shot",
    "stone_throw"
  ],
  "crystal_volley": [
    "multi_shot",
    "stone_spear"
  ],
  "mountain_shot": [
    "siege_shot",
    "mountain_crush"
  ],
  "wind_arrow": [
    "steady_aim",
    "gust"
  ],
  "gale_volley": [
    "multi_shot",
    "wind_blade"
  ],
  "hurricane_shot": [
    "parting_shot",
    "hurricane"
  ],
  "water_arrow": [
    "covering_fire",
    "water_splash"
  ],
  "tide_volley": [
    "multi_shot",
    "water_whip"
  ],
  "tsunami_shot": [
    "explosive_shot",
    "tsunami"
  ],
  "shadow_arrow": [
    "covering_fire",
    "shadow_bolt"
  ],
  "void_volley": [
    "multi_shot",
    "fear"
  ],
  "eclipse_shot": [
    "homing_shot",
    "eclipse"
  ],
  "light_arrow": [
    "steady_aim",
    "light_ray"
  ],
  "radiant_volley": [
    "multi_shot",
    "laser_beam"
  ],
  "solar_shot": [
    "homing_shot",
    "divine_judgment"
  ],
  "flame_edge": [
    "quick_strike",
    "fireball"
  ],
  "inferno_parry": [
    "riposte",
    "fire_shield"
  ],
  "blazing_tempest": [
    "whirlwind",
    "inferno"
  ],
  "frostbrand": [
    "quick_strike",
    "ice_shard"
  ],
  "glacial_riposte": [
    "riposte",
    "freeze"
  ],
  "winters_fury": [
    "sweeping_slash",
    "frost_nova"
  ],
  "storm_blade": [
    "quick_strike",
    "spark"
  ],
  "thunder_parry": [
    "riposte",
    "thunder_clap"
  ],
  "lightning_surge": [
    "sweeping_slash",
    "ball_lightning"
  ],
  "stonecutter": [
    "quick_strike",
    "stone_throw"
  ],
  "earthen_guard": [
    "parry",
    "stone_wall"
  ],
  "quake_slash": [
    "piercing_thrust",
    "earthquake"
  ],
  "gale_blade": [
    "lunge_attack",
    "gust"
  ],
  "cyclone_parry": [
    "parry",
    "wind_barrier"
  ],
  "tempest_dance": [
    "blade_dance",
    "tornado"
  ],
  "tidecutter": [
    "lunge_attack",
    "water_splash"
  ],
  "aqua_parry": [
    "parry",
    "water_shield"
  ],
  "maelstrom_slash": [
    "whirlwind",
    "maelstrom"
  ],
  "shadow_edge": [
    "quick_strike",
    "shadow_bolt"
  ],
  "night_parry": [
    "riposte",
    "shadow_armor"
  ],
  "umbral_onslaught": [
    "whirlwind",
    "eclipse"
  ],
  "radiant_blade": [
    "quick_strike",
    "light_ray"
  ],
  "solar_parry": [
    "parry",
    "blinding_flash"
  ],
  "judgment_slash": [
    "piercing_thrust",
    "divine_judgment"
  ],
  "flame_dagger": [
    "poison_blade",
    "ignite"
  ],
  "inferno_strike": [
    "vital_strike",
    "fireball"
  ],
  "phoenix_dance": [
    "thousand_cuts",
    "inferno"
  ],
  "frost_dagger": [
    "dual_wield",
    "freeze"
  ],
  "freezing_strike": [
    "vital_strike",
    "ice_spear"
  ],
  "arctic_barrage": [
    "flurry",
    "blizzard"
  ],
  "storm_dagger": [
    "dual_wield",
    "static_charge"
  ],
  "thunder_strike": [
    "vital_strike",
    "lightning_bolt"
  ],
  "storm_flurry": [
    "thousand_cuts",
    "lightning_storm"
  ],
  "stone_dagger": [
    "dagger_basics",
    "stone_throw"
  ],
  "crystal_strike": [
    "vital_strike",
    "earth_spike"
  ],
  "earthen_assault": [
    "flurry",
    "mountain_crush"
  ],
  "wind_dagger": [
    "light_step",
    "gust"
  ],
  "zephyr_strike": [
    "vital_strike",
    "wind_blade"
  ],
  "hurricane_dance": [
    "flurry",
    "hurricane"
  ],
  "water_dagger": [
    "poison_blade",
    "water_splash"
  ],
  "tide_strike": [
    "vital_strike",
    "water_whip"
  ],
  "tsunami_dance": [
    "thousand_cuts",
    "tsunami"
  ],
  "shadow_dagger": [
    "dual_wield",
    "shadow_bolt"
  ],
  "void_strike": [
    "vital_strike",
    "nightmare"
  ],
  "night_dance": [
    "flurry",
    "eclipse"
  ],
  "light_dagger": [
    "dagger_basics",
    "light_ray"
  ],
  "radiant_strike": [
    "vital_strike",
    "laser_beam"
  ],
  "dawn_dance": [
    "thousand_cuts",
    "solar_flare"
  ],
  "flame_glaive": [
    "thrust_attack",
    "fireball"
  ],
  "blazing_sweep": [
    "sweep_attack",
    "explosion"
  ],
  "solar_lance": [
    "impale",
    "fire_whip"
  ],
  "frost_halberd": [
    "reach_advantage",
    "frost_touch"
  ],
  "glacier_sweep": [
    "sweep_attack",
    "frost_nova"
  ],
  "winter_vortex": [
    "impale",
    "ice_prison"
  ],
  "storm_glaive": [
    "thrust_attack",
    "spark"
  ],
  "thunder_sweep": [
    "sweep_attack",
    "thunder_clap"
  ],
  "lightning_spiral": [
    "polearm_charge_attack",
    "lightning_storm"
  ],
  "stone_halberd": [
    "thrust_attack",
    "stone_throw"
  ],
  "earthen_sweep": [
    "sweep_attack",
    "earthquake"
  ],
  "tectonic_spiral": [
    "impale",
    "stone_spear"
  ],
  "wind_glaive": [
    "reach_advantage",
    "gust"
  ],
  "cyclone_sweep": [
    "sweep_attack",
    "tornado"
  ],
  "tempest_spiral": [
    "polearm_charge_attack",
    "suffocate"
  ],
  "water_glaive": [
    "reach_advantage",
    "water_whip"
  ],
  "wave_sweep": [
    "sweep_attack",
    "tidal_wave"
  ],
  "maelstrom_spiral": [
    "whirlwind_sweep",
    "maelstrom"
  ],
  "shadow_glaive": [
    "reach_advantage",
    "shadow_bolt"
  ],
  "void_sweep": [
    "sweep_attack",
    "fear"
  ],
  "eclipse_spiral": [
    "polearm_charge_attack",
    "life_drain"
  ],
  "light_glaive": [
    "thrust_attack",
    "light_ray"
  ],
  "radiant_sweep": [
    "sweep_attack",
    "blinding_flash"
  ],
  "solar_spiral": [
    "impale",
    "divine_judgment"
  ],
  "flame_hammer": [
    "armor_crusher",
    "ignite"
  ],
  "magma_smash": [
    "berserker_swing",
    "explosion"
  ],
  "volcanic_eruption": [
    "apocalypse_slam",
    "meteor"
  ],
  "frost_hammer": [
    "heavy_impact",
    "frost_touch"
  ],
  "glacial_pound": [
    "ground_slam",
    "frost_nova"
  ],
  "permafrost_crash": [
    "berserker_swing",
    "ice_prison"
  ],
  "storm_hammer": [
    "stunning_blow",
    "static_charge"
  ],
  "thunder_slam": [
    "thunderstrike",
    "thunder_clap"
  ],
  "storm_surge": [
    "thunderstrike",
    "lightning_storm"
  ],
  "earthshaker_hammer": [
    "armor_crusher",
    "stone_throw"
  ],
  "tectonic_slam": [
    "earth_shaker",
    "earthquake"
  ],
  "mountain_crash": [
    "earth_shaker",
    "mountain_crush"
  ],
  "gale_hammer": [
    "heavy_impact",
    "gust"
  ],
  "cyclone_slam": [
    "ground_slam",
    "tornado"
  ],
  "tempest_crash": [
    "thunderstrike",
    "tornado"
  ],
  "tide_hammer": [
    "armor_crusher",
    "water_splash"
  ],
  "wave_slam": [
    "stunning_blow",
    "heal_wounds"
  ],
  "tsunami_crash": [
    "earth_shaker",
    "tidal_wave"
  ],
  "shadow_hammer": [
    "heavy_impact",
    "fear"
  ],
  "void_slam": [
    "ground_slam",
    "fear"
  ],
  "eclipse_crash": [
    "berserker_swing",
    "eclipse"
  ],
  "radiant_hammer": [
    "hammer_basics",
    "light_ray"
  ],
  "solar_slam": [
    "ground_slam",
    "blinding_flash"
  ],
  "divine_crash": [
    "mjolnir_strike",
    "divine_judgment"
  ],
  "flame_axe": [
    "cleave",
    "ignite"
  ],
  "inferno_cleave": [
    "wide_cleave",
    "fire_whip"
  ],
  "meteor_strike": [
    "crushing_blow",
    "meteor"
  ],
  "frost_axe": [
    "heavy_swing",
    "frost_touch"
  ],
  "frozen_cleave": [
    "wide_cleave",
    "frost_nova"
  ],
  "avalanche_strike": [
    "crushing_blow",
    "ice_age"
  ],
  "storm_axe": [
    "cleave",
    "static_charge"
  ],
  "stone_axe": [
    "armor_break",
    "stone_throw"
  ],
  "wind_axe": [
    "heavy_swing",
    "gust"
  ],
  "water_axe": [
    "armor_break",
    "water_splash"
  ],
  "shadow_axe": [
    "heavy_swing",
    "fear"
  ],
  "light_axe": [
    "cleave",
    "light_ray"
  ],
  "thunder_cleave": [
    "wide_cleave",
    "chain_lightning"
  ],
  "storm_strike": [
    "berserker_rage",
    "ball_lightning"
  ],
  "earthen_cleave": [
    "wide_cleave",
    "earthquake"
  ],
  "quake_strike": [
    "earthquake_slam",
    "earthquake"
  ],
  "gale_cleave": [
    "wide_cleave",
    "tornado"
  ],
  "hurricane_strike": [
    "berserker_rage",
    "hurricane"
  ],
  "tidal_cleave": [
    "wide_cleave",
    "water_whip"
  ],
  "deluge_strike": [
    "crushing_blow",
    "tidal_wave"
  ],
  "void_cleave": [
    "wide_cleave",
    "fear"
  ],
  "abyss_strike": [
    "berserker_rage",
    "eclipse"
  ],
  "radiant_cleave": [
    "wide_cleave",
    "holy_weapon"
  ],
  "dawn_strike": [
    "crushing_blow",
    "divine_judgment"
  ],
  "flame_staff": [
    "spell_power",
    "fireball"
  ],
  "inferno_channel": [
    "elemental_staff",
    "fireball"
  ],
  "phoenix_staff": [
    "staff_of_power",
    "inferno"
  ],
  "frost_staff": [
    "spell_power",
    "ice_shard"
  ],
  "glacial_focus": [
    "elemental_staff",
    "ice_spear"
  ],
  "winter_staff": [
    "elemental_staff",
    "frost_nova"
  ],
  "storm_staff": [
    "spell_power",
    "spark"
  ],
  "thunder_focus": [
    "staff_strike",
    "thunder_clap"
  ],
  "tempest_staff": [
    "staff_of_power",
    "ball_lightning"
  ],
  "stone_staff": [
    "spell_power",
    "stone_throw"
  ],
  "crystal_focus": [
    "staff_strike",
    "stone_spear"
  ],
  "mountain_staff": [
    "staff_of_power",
    "earthquake"
  ],
  "wind_staff": [
    "spell_power",
    "gust"
  ],
  "gale_focus": [
    "staff_strike",
    "wind_blade"
  ],
  "hurricane_staff": [
    "mana_burn",
    "hurricane"
  ],
  "water_staff": [
    "spell_power",
    "water_splash"
  ],
  "tide_focus": [
    "mana_burn",
    "water_whip"
  ],
  "tsunami_staff": [
    "staff_of_power",
    "tsunami"
  ],
  "shadow_staff": [
    "spell_power",
    "shadow_bolt"
  ],
  "void_focus": [
    "staff_strike",
    "fear"
  ],
  "eclipse_staff": [
    "staff_of_power",
    "eclipse"
  ],
  "light_staff": [
    "spell_power",
    "light_ray"
  ],
  "radiant_focus": [
    "spell_penetration",
    "laser_beam"
  ],
  "solar_staff": [
    "staff_of_power",
    "solar_flare"
  ],
  "ember_fists": [
    "striker_basics",
    "fireball"
  ],
  "inferno_palm": [
    "feint_strike",
    "explosion"
  ],
  "phoenix_flurry": [
    "flurry_of_blows",
    "inferno"
  ],
  "frost_fists": [
    "striker_basics",
    "ice_shard"
  ],
  "glacial_palm": [
    "joint_lock",
    "ice_prison"
  ],
  "avalanche_flurry": [
    "striker_volley",
    "frost_nova"
  ],
  "storm_fists": [
    "striker_basics",
    "spark"
  ],
  "thunder_palm": [
    "feint_strike",
    "shock"
  ],
  "lightning_flurry": [
    "flurry_of_blows",
    "thunder_clap"
  ],
  "granite_fists": [
    "stone_fists",
    "stone_throw"
  ],
  "earthen_palm": [
    "iron_palm",
    "earth_spike"
  ],
  "quake_flurry": [
    "striker_volley",
    "earthquake"
  ],
  "gale_fists": [
    "striker_basics",
    "gust"
  ],
  "cyclone_palm": [
    "feint_strike",
    "wind_blade"
  ],
  "hurricane_flurry": [
    "flurry_of_blows",
    "tornado"
  ],
  "tide_fists": [
    "striker_basics",
    "water_splash"
  ],
  "tidal_palm": [
    "joint_lock",
    "blood_control"
  ],
  "tsunami_flurry": [
    "striker_volley",
    "tidal_wave"
  ],
  "shadow_fists": [
    "striker_basics",
    "shadow_bolt"
  ],
  "umbral_palm": [
    "feint_strike",
    "fear"
  ],
  "void_flurry": [
    "flurry_of_blows",
    "eclipse"
  ],
  "radiant_fists": [
    "striker_basics",
    "light_ray"
  ],
  "solar_palm": [
    "iron_palm",
    "holy_weapon"
  ],
  "dawn_flurry": [
    "striker_volley",
    "solar_flare"
  ],
  "steam_burst": [
    "fireball",
    "ice_shard"
  ],
  "thermal_shock": [
    "fire_whip",
    "ice_prison"
  ],
  "conflicting_elements": [
    "inferno",
    "blizzard"
  ],
  "plasma_bolt": [
    "fireball",
    "spark"
  ],
  "storm_of_cinders": [
    "explosion",
    "thunder_clap"
  ],
  "fusion_strike": [
    "inferno",
    "ball_lightning"
  ],
  "magma_surge": [
    "fireball",
    "stone_throw"
  ],
  "volcanic_rupture": [
    "explosion",
    "earth_spike"
  ],
  "tectonic_fury": [
    "inferno",
    "earthquake"
  ],
  "static_freeze": [
    "ice_shard",
    "spark"
  ],
  "crystalline_surge": [
    "ice_spear",
    "thunder_clap"
  ],
  "arctic_storm": [
    "blizzard",
    "lightning_storm"
  ],
  "twilight_balance": [
    "shadow_bolt",
    "light_ray"
  ],
  "duality_surge": [
    "life_drain",
    "laser_beam"
  ],
  "darkness_light_eclipse": [
    "eclipse",
    "solar_flare"
  ],
  "sandstorm": [
    "stone_throw",
    "wind_blade"
  ],
  "desert_winds": [
    "stone_spear",
    "suffocate"
  ],
  "terra_tempest": [
    "earthquake",
    "tornado"
  ],
  "typhoon_strike": [
    "wind_blade",
    "water_splash"
  ],
  "monsoon": [
    "wind_blade",
    "water_whip"
  ],
  "wind_water_hurricane": [
    "hurricane",
    "tsunami"
  ],
  "mud_slash": [
    "water_splash",
    "stone_throw"
  ],
  "quicksand": [
    "water_whip",
    "mud_trap"
  ],
  "water_earth_tidal_wave": [
    "tsunami",
    "mountain_crush"
  ],
  "scalding_jet": [
    "fireball",
    "water_whip"
  ],
  "steam_cloud": [
    "explosion",
    "water_whip"
  ],
  "geyser_burst": [
    "explosion",
    "tidal_wave"
  ],
  "shadow_wind": [
    "wind_blade",
    "shadow_bolt"
  ],
  "void_tempest": [
    "suffocate",
    "life_drain"
  ],
  "dark_cyclone": [
    "hurricane",
    "eclipse"
  ],
  "prismatic_breeze": [
    "wind_blade",
    "light_ray"
  ],
  "rainbow_gale": [
    "wind_blade",
    "blinding_flash"
  ],
  "aurora_storm": [
    "tornado",
    "solar_flare"
  ],
  "inferno_cyclone": [
    "fire_spark",
    "wind_blade"
  ],
  "heat_vacuum": [
    "fireball",
    "suffocate"
  ],
  "phoenix_storm": [
    "fire_tornado",
    "hurricane"
  ],
  "shadowflame": [
    "fireball",
    "shadow_bolt"
  ],
  "dark_pyre": [
    "fire_whip",
    "fear"
  ],
  "hellfire": [
    "meteor",
    "eclipse"
  ],
  "glacial_spike": [
    "ice_shard",
    "earth_spike"
  ],
  "permafrost": [
    "ice_prison",
    "stone_spear"
  ],
  "avalanche": [
    "blizzard",
    "mountain_crush"
  ],
  "frost_current": [
    "ice_shard",
    "water_splash"
  ],
  "ice_flow": [
    "ice_spear",
    "blood_control"
  ],
  "glacier_tsunami": [
    "frost_nova",
    "tsunami"
  ],
  "dark_frost": [
    "frost_touch",
    "shadow_bolt"
  ],
  "void_freeze": [
    "ice_prison",
    "nightmare"
  ],
  "eternal_winter": [
    "blizzard",
    "eclipse"
  ],
  "crystal_ray": [
    "ice_shard",
    "light_ray"
  ],
  "aurora_flash": [
    "ice_spear",
    "blinding_flash"
  ],
  "diamond_radiance": [
    "frost_nova",
    "solar_flare"
  ],
  "storm_front": [
    "lightning_bolt",
    "wind_blade"
  ],
  "charged_cyclone": [
    "chain_lightning",
    "tornado"
  ],
  "thunderstorm": [
    "lightning_storm",
    "hurricane"
  ],
  "conductivity": [
    "spark",
    "water_splash"
  ],
  "lightning_water_storm_surge": [
    "thunder_clap",
    "tidal_wave"
  ],
  "maelstrom_strike": [
    "ball_lightning",
    "maelstrom"
  ],
  "dark_lightning": [
    "spark",
    "shadow_bolt"
  ],
  "void_thunder": [
    "lightning_bolt",
    "life_drain"
  ],
  "eclipse_storm": [
    "ball_lightning",
    "eclipse"
  ],
  "radiant_bolt": [
    "spark",
    "light_ray"
  ],
  "divine_thunder": [
    "thunder_clap",
    "laser_beam"
  ],
  "heavens_wrath": [
    "lightning_storm",
    "solar_flare"
  ],
  "shadow_stone": [
    "stone_throw",
    "shadow_bolt"
  ],
  "obsidian_strike": [
    "stone_spear",
    "fear"
  ],
  "void_eruption": [
    "earthquake",
    "eclipse"
  ],
  "crystal_light": [
    "earth_spike",
    "blinding_flash"
  ],
  "prismatic_earth": [
    "stone_spear",
    "laser_beam"
  ],
  "sacred_ground": [
    "earthquake",
    "solar_flare"
  ],
  "abyssal_current": [
    "water_whip",
    "shadow_bolt"
  ],
  "deep_surge": [
    "blood_control",
    "nightmare"
  ],
  "drowning_darkness": [
    "maelstrom",
    "eclipse"
  ],
  "holy_spring": [
    "water_splash",
    "light_ray"
  ],
  "purifying_wave": [
    "water_whip",
    "laser_beam"
  ],
  "blessed_tsunami": [
    "tsunami",
    "solar_flare"
  ],
  "sunspark": [
    "fireball",
    "light_ray"
  ],
  "purifying_flame": [
    "fireball",
    "laser_beam"
  ],
  "dawn_judgment": [
    "inferno",
    "solar_flare"
  ],
  "frost_gale": [
    "ice_shard",
    "wind_blade"
  ],
  "blizzard_squall": [
    "ice_spear",
    "tornado"
  ],
  "arctic_cyclone": [
    "blizzard",
    "hurricane"
  ],
  "tremor_spark": [
    "spark",
    "stone_throw"
  ],
  "magnet_storm": [
    "chain_lightning",
    "earth_spike"
  ],
  "earth_thunder": [
    "thunder_clap",
    "earthquake"
  ],
  "alchemical_blade": [
    "piercing_thrust",
    "explosive_compounds"
  ],
  "enchanted_arrows": [
    "multi_shot",
    "artifact_shaping"
  ],
  "blessed_weapon": [
    "sword_mastery",
    "divine_judgment"
  ],
  "duelists_edge": [
    "parry",
    "parry_riposte"
  ],
  "crimson_flourish": [
    "blade_dance",
    "flourish"
  ],
  "perfect_duel": [
    "piercing_thrust",
    "dueling_stance"
  ],
  "hunters_mark_shot": [
    "aimed_shot",
    "snare_craft"
  ],
  "trailblazer_volley": [
    "multi_shot",
    "volley_call"
  ],
  "apex_hunter": [
    "homing_shot",
    "camouflage_net"
  ],
  "blood_cleave": [
    "cleave",
    "bloodlust"
  ],
  "rampage_chop": [
    "berserker_rage",
    "rage"
  ],
  "headsmans_fury": [
    "crushing_blow",
    "executioner"
  ],
  "conduit_staff": [
    "staff_strike",
    "mana_font"
  ],
  "wardens_circle": [
    "arcane_shield",
    "ward_circle"
  ],
  "archmages_rod": [
    "staff_of_power",
    "amplified_healing"
  ],
  "cutpurse_strike": [
    "sneak_attack",
    "light_fingers"
  ],
  "vanishing_stab": [
    "shadowstep",
    "hit_and_run"
  ],
  "perfect_heist": [
    "shadow_clone",
    "filch"
  ],
  "shieldline_thrust": [
    "thrust_attack",
    "shield_wall"
  ],
  "iron_phalanx": [
    "phalanx_formation",
    "phalanx"
  ],
  "unbreakable_line": [
    "fortress_stance",
    "commanders_presence"
  ],
  "forge_strike": [
    "armor_crusher",
    "weaponwright"
  ],
  "tempered_quake": [
    "earth_shaker",
    "tempered_steel"
  ],
  "anvil_of_war": [
    "thunderstrike",
    "master_alloy"
  ],
  "pressure_point": [
    "feint_strike",
    "triage"
  ],
  "nerve_strike": [
    "joint_lock",
    "surgical_touch"
  ],
  "hand_of_mercy": [
    "flurry_of_blows",
    "surgical_touch"
  ],
  "fusion_burning_ballad": [
    "work_song",
    "ignite"
  ],
  "fusion_flambe_feast": [
    "banquet_planner",
    "fire_attunement"
  ],
  "fusion_cryo_surgeon": [
    "clean_bandage",
    "ice_armor"
  ],
  "fusion_frozen_evidence": [
    "reconstruct",
    "ice_prison"
  ],
  "fusion_shock_trap": [
    "snare_craft",
    "shock"
  ],
  "fusion_galvanic_revival": [
    "revival_draft",
    "lightning_speed"
  ],
  "fusion_stoneforged_arms": [
    "armourer",
    "stone_armor"
  ],
  "fusion_bulwark_of_stone": [
    "aura_of_protection",
    "earth_shield"
  ],
  "fusion_featherlight_fingers": [
    "light_fingers",
    "levitate"
  ],
  "fusion_gale_chorus": [
    "marching_tune",
    "flight"
  ],
  "fusion_healing_tide_brew": [
    "apothecary",
    "heal_wounds"
  ],
  "fusion_tide_runes": [
    "ward_scribe",
    "water_breathing"
  ],
  "fusion_nightmare_interrogation": [
    "interview",
    "fear"
  ],
  "fusion_shadow_contract": [
    "soul_bind",
    "life_drain"
  ],
  "fusion_radiant_oath": [
    "rebuke",
    "purify"
  ],
  "fusion_dawn_anthem": [
    "soothing_hymn",
    "healing_light"
  ],
  "fusion_ember_hearth": [
    "camp_cook",
    "warm_hands"
  ],
  "fusion_glacier_pantry": [
    "hearty_rations",
    "freeze"
  ],
  "fusion_field_spark": [
    "clean_bandage",
    "static_charge"
  ],
  "fusion_shadow_snatch": [
    "keen_eye",
    "darkness"
  ],
  "fusion_mirage_patter": [
    "interview",
    "blinding_flash"
  ],
  "fusion_ward_meal": [
    "camp_cook",
    "purify"
  ],
  "fusion_living_map": [
    "trail_warden",
    "earth_sense"
  ],
  "fusion_trap_runes": [
    "snare_craft",
    "spark"
  ],
  "fusion_alchemical_frost": [
    "acid_vials",
    "freeze"
  ],
  "fusion_wild_calm": [
    "trail_warden",
    "fear"
  ],
  "draconic_breath": [
    "size_change",
    "fire_supremacy"
  ],
  "shadow_strike": [
    "monster_shadow_step",
    "shadow_armor"
  ],
  "arcane_roar": [
    "fear_aura",
    "staff_of_power"
  ],
  "cinder_claws": [
    "razor_claws",
    "fireball"
  ],
  "magma_hide": [
    "armored_plates",
    "fire_shield"
  ],
  "volcanic_rampage": [
    "trample",
    "inferno"
  ],
  "frostbite_maw": [
    "crushing_bite",
    "ice_spear"
  ],
  "glacial_carapace": [
    "metal_skin",
    "ice_armor"
  ],
  "rime_tyrant_howl": [
    "ice_breath",
    "blizzard"
  ],
  "storm_pounce": [
    "pounce",
    "lightning_bolt"
  ],
  "thunderhide": [
    "damage_reduction",
    "electric_field"
  ],
  "tempest_beast": [
    "multiattack",
    "lightning_storm"
  ],
  "burrow_ambush": [
    "burrow",
    "earth_spike"
  ],
  "quake_trample": [
    "trample",
    "earthquake"
  ],
  "colossus_awakening": [
    "monster_earthquake",
    "petrify"
  ],
  "screeching_gale": [
    "echolocation",
    "wind_blade"
  ],
  "cyclone_tail": [
    "spiked_tail",
    "tornado"
  ],
  "sky_tyrant_dive": [
    "rend",
    "flight"
  ],
  "riptide_jaws": [
    "swim",
    "water_whip"
  ],
  "abyssal_coils": [
    "spiked_tail",
    "blood_control"
  ],
  "leviathan_surge": [
    "trample",
    "tsunami"
  ],
  "night_terror_howl": [
    "roar",
    "fear"
  ],
  "soul_rend": [
    "rend",
    "life_drain"
  ],
  "umbral_predator": [
    "invisibility",
    "nightmare"
  ],
  "radiant_horn": [
    "gore",
    "blinding_flash"
  ],
  "seraph_plumage": [
    "pack_leader",
    "healing_light"
  ],
  "solar_behemoth": [
    "size_change",
    "solar_flare"
  ]
}

/** Fusions reworded so they read as a blend of their new requirements. */
export const FUSION_REWRITES = {
  "fusion_trap_runes": {
    "name": "Trap Runes",
    "desc": "Craft (Snares & Ambush + Spark): Snares that trigger a crackling charge (alarm + 1d4 lightning damage)."
  },
  "fusion_wild_calm": {
    "name": "Wild Calm",
    "desc": "Action (Wilderness Tracking + Dread): Read one hostile beast and cloud its mind with shadow — it stops attacking and keeps its distance for 1 minute (GM save)."
  }
}
