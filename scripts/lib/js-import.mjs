/**
 * Resolve runtime js/ module paths after domain-folder reorganization.
 * Accepts a basename (e.g. 'data.js') or a relative path (e.g. 'core/data.js').
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const jsDir = path.join(__dirname, '..', '..', 'js')

const BASENAME_PATHS = {
  'data.js': 'core/data.js',
  'cache.js': 'core/cache.js',
  'state.js': 'core/state.js',
  'storage.js': 'core/storage.js',
  'constants.js': 'core/constants.js',
  'utils.js': 'core/utils.js',
  'url-state.js': 'core/url-state.js',
  'events.js': 'core/events.js',
  'character.js': 'character/character.js',
  'character-folders.js': 'character/character-folders.js',
  'character-naming.js': 'character/character-naming.js',
  'backgrounds.js': 'character/backgrounds.js',
  'race-passives.js': 'character/race-passives.js',
  'premade-characters.js': 'character/premade-characters.js',
  'level.js': 'character/level.js',
  'skill-level.js': 'character/skill-level.js',
  'combat-power.js': 'character/combat-power.js',
  'threat-level.js': 'character/threat-level.js',
  'max-stat-rewards.js': 'character/max-stat-rewards.js',
  'skills.js': 'skills/skills.js',
  'fusion-nav.js': 'skills/fusion-nav.js',
  'skill-activation.js': 'skills/skill-activation.js',
  'skill-effects.js': 'skills/skill-effects.js',
  'skill-expansion.js': 'skills/skill-expansion.js',
  'career-effects.js': 'skills/career-effects.js',
  'combat.js': 'combat/combat.js',
  'damage-breakdown.js': 'combat/damage-breakdown.js',
  'weapon-combat.js': 'combat/weapon-combat.js',
  'striker-combat.js': 'combat/striker-combat.js',
  'action-bar.js': 'combat/action-bar.js',
  'action-bar-bonuses.js': 'combat/action-bar-bonuses.js',
  'action-bar-sheet.js': 'combat/action-bar-sheet.js',
  'weather-effects.js': 'combat/weather-effects.js',
  'elemental-affinity.js': 'combat/elemental-affinity.js',
  'instruments.js': 'combat/instruments.js',
  'items.js': 'items/items.js',
  'equipment.js': 'items/equipment.js',
  'inventory-nav.js': 'items/inventory-nav.js',
  'item-presentation.js': 'items/item-presentation.js',
  'item-compare.js': 'items/item-compare.js',
  'unidentified-items.js': 'items/unidentified-items.js',
  'enchantments.js': 'items/enchantments.js',
  'craft.js': 'items/craft.js',
  'craft-bonuses.js': 'items/craft-bonuses.js',
  'effects.js': 'effects/effects.js',
  'status-stat-modifiers.js': 'effects/status-stat-modifiers.js',
  'homebrew.js': 'homebrew/homebrew.js',
  'homebrew-combat.js': 'homebrew/homebrew-combat.js',
  'homebrew-import-preview.js': 'homebrew/homebrew-import-preview.js',
  'export-sanitize.js': 'homebrew/export-sanitize.js',
  'gm-mode.js': 'gm/gm-mode.js',
  'gm-initiative.js': 'gm/gm-initiative.js',
  'gm-npc-turn.js': 'gm/gm-npc-turn.js',
  'gm-monster-builder.js': 'gm/gm-monster-builder.js',
  'gm-monster-builder-data.js': 'gm/gm-monster-builder-data.js',
  'gm-threat-solver.js': 'gm/gm-threat-solver.js',
  'encounter-enemies.js': 'gm/encounter-enemies.js',
  'encounter-balancer.js': 'gm/encounter-balancer.js',
  'render.js': 'ui/render.js',
  'actions.js': 'ui/actions.js',
  'tooltips.js': 'ui/tooltips.js',
  'tooltips-text.js': 'ui/tooltips-text.js',
  'themes.js': 'ui/themes.js',
  'number-stepper.js': 'ui/number-stepper.js',
  'format.js': 'ui/format.js',
  'how-to-play.js': 'ui/how-to-play.js',
  'glossary.js': 'ui/glossary.js',
  'glossary-combat.js': 'ui/glossary-combat.js',
  'glossary-effects.js': 'ui/glossary-effects.js',
  'export-sheet.js': 'export/export-sheet.js'
}

export function jsModulePath(name) {
  const rel = BASENAME_PATHS[name] || name
  return path.join(jsDir, rel)
}

export function importJs(name) {
  return import(pathToFileURL(jsModulePath(name)).href)
}

export function listJsModules() {
  const out = []
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.js')) out.push(path.relative(jsDir, full).replace(/\\/g, '/'))
    }
  }
  walk(jsDir)
  return out.sort()
}
