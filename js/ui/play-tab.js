import { esc } from '../core/utils.js'
import { getItem } from '../core/cache.js'
import { computeStats } from '../character/character.js'
import { getEquippedWeapon, getWeaponKind } from '../items/equipment.js'
import { weaponKindDisplayLabel } from '../homebrew/homebrew.js'
import { itemHasCounter } from '../items/items.js'
import { renderItemCounterControls, renderKnockoutPanel } from './shared-panels.js'
import { renderStatusPanel } from './status-panel.js'
import { fallbackIcon } from './format.js'
import { resolveItemPresentation } from '../items/item-presentation.js'
import { getPinnedActionBarSkills, getSkillActivationType } from '../skills/skill-activation.js'
import { getBasicAttackSkill } from '../combat/combat.js'
import { formatSkillEffectBreakdownPlain, resolveSkillEffectBreakdown, skillHasEffectBreakdown } from '../combat/damage-breakdown.js'
import { getEffectiveSkillStaminaCost } from '../skills/career-effects.js'

/** Stat tiles on the Play session card: [stats key, label, show a + on positives]. */
const PLAY_STATS = [
  ['accuracy', 'Accuracy', true],
  ['speed', 'Speed', true],
  ['strength', 'Strength', true],
  ['magicPower', 'Magic', true],
  ['physicalDefence', 'Phys Def', false],
  ['magicalDefence', 'Mag Def', false]
]

/** Play tab — session controls, equipped weapon, pinned skills, ongoing effects and combat kit. */
export function renderPlayTab(character) {
  const stats = computeStats(character)
  const weapon = getEquippedWeapon(character)
  const weaponEntry = character.inventory.find(inv => inv.uid === character.equipped.weapon)
  const basic = getBasicAttackSkill(character)
  const basicBreakdown = skillHasEffectBreakdown(basic)
    ? formatSkillEffectBreakdownPlain(resolveSkillEffectBreakdown(character, basic))
    : ''
  const pinned = getPinnedActionBarSkills(character)
  const combatItems = (character.inventory || []).filter(entry => {
    const item = getItem(entry.itemId)
    if (!item) return false
    const type = String(item.type || '').toLowerCase()
    const isConsumable = type.includes('consumable') || type.includes('potion') || type.includes('food')
    const equipped = Object.values(character.equipped || {}).includes(entry.uid)
    return isConsumable || itemHasCounter(item) || equipped
  })

  const pinnedHtml = pinned.length
    ? pinned.map(skill => {
        const type = getSkillActivationType(skill)
        const cost = type === 'activatable'
          ? getEffectiveSkillStaminaCost(character, skill)
          : Number(skill.staminaCost || 0)
        const active = type === 'toggle' && character.activeToggles?.includes(skill.id)
        const breakdown = skillHasEffectBreakdown(skill)
          ? formatSkillEffectBreakdownPlain(resolveSkillEffectBreakdown(character, skill))
          : ''
        const useBtn = type === 'toggle'
          ? `<button type="button" class="chip-btn tiny" data-toggle-skill="${esc(skill.id)}">${active ? 'Switch Off' : 'Switch On'}</button>`
          : type === 'activatable'
            ? `<button type="button" class="primary-btn tiny" data-use-skill="${esc(skill.id)}">Use Skill</button>`
            : ''
        return `
          <details class="play-skill-card card">
            <summary>
              <strong>${esc(skill.icon || '✦')} ${esc(skill.name)}</strong>
              <span class="pill warn">${cost} STA</span>
              ${active ? '<span class="pill good">Active</span>' : ''}
            </summary>
            <p class="mt-8">${esc(skill.desc || '')}</p>
            ${breakdown ? `<p class="subtle mt-8">${esc(breakdown)}</p>` : ''}
            <div class="wrap mt-12">${useBtn}</div>
          </details>
        `
      }).join('')
    : '<p class="subtle">Pin skills on the Skills tab to show them here.</p>'

  const itemsHtml = combatItems.length
    ? combatItems.map(entry => {
        const item = getItem(entry.itemId)
        const presentation = resolveItemPresentation(item, entry)
        const equippedSlot = Object.entries(character.equipped || {}).find(([, uid]) => uid === entry.uid)?.[0]
        return `
          <div class="play-item-row">
            <div>
              <strong>${fallbackIcon(item)} ${esc(presentation.displayName)}</strong>
              <div class="subtle">${esc(item.type)}${equippedSlot ? ` · equipped (${esc(equippedSlot)})` : ''} · qty ${entry.qty || 1}</div>
              ${renderItemCounterControls(entry, item, { showWhenEquipped: true })}
            </div>
          </div>
        `
      }).join('')
    : '<p class="subtle">No combat consumables or counter items.</p>'

  return `
    <div class="play-tab">
      <section class="card play-session-card">
        <div class="card-header">
          <div class="kicker">Session</div>
          <div class="wrap">
            <button type="button" class="ghost-btn tiny" data-process-turn>Process Turn</button>
            <button type="button" class="primary-btn tiny" data-begin-new-combat>New Combat</button>
          </div>
        </div>
        <div class="play-stat-strip">
          ${PLAY_STATS.map(([key, label, signed]) => {
            const value = Number(stats[key]) || 0
            return `<div class="play-stat play-stat-${key}"><small>${label}</small><b>${signed && value > 0 ? '+' : ''}${value}</b></div>`
          }).join('')}
        </div>
      </section>

      <section class="card play-weapon-card">
        <div class="kicker">Weapon</div>
        <h3>${weapon ? `${fallbackIcon(weapon)} ${esc(weapon.name)}` : 'Unarmed / Striker'}</h3>
        <p class="subtle">${weapon ? esc(weaponKindDisplayLabel(getWeaponKind(weapon) || weapon.weaponKind || '')) : 'Empty hands'}${weaponEntry ? ` · ${esc(weapon.damage || '')}` : ''}</p>
        ${basic ? `
          <div class="play-attack">
            <strong>${esc(basic.icon || '⚔')} ${esc(basic.name)}</strong>
            <p class="subtle">${esc(basic.desc || '')}</p>
            ${basicBreakdown ? `<p class="subtle">${esc(basicBreakdown)}</p>` : ''}
            <button type="button" class="primary-btn play-attack-btn" data-use-skill="${esc(basic.id)}">⚔️ Basic Attack</button>
          </div>
        ` : ''}
      </section>

      <section class="card play-pinned-card">
        <div class="kicker">Pinned skills</div>
        <h3>Ready actions</h3>
        <div class="stack mt-12">${pinnedHtml}</div>
      </section>

      <section class="card play-kit-card">
        <div class="kicker">Combat kit</div>
        <h3>Consumables &amp; counters</h3>
        <div class="stack mt-12">${itemsHtml}</div>
      </section>

      ${renderKnockoutPanel(character)}

      ${renderStatusPanel(character)}
    </div>
  `
}
