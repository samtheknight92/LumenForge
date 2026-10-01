import { esc } from '../core/utils.js'
import { STAT_RULES, STAT_EXPLAINERS, STAT_HOW_ATTACKS_WORK } from '../core/constants.js'
import { getNextStatUpgradeCost, getLatestStatRefund, getPurchasedStatCount, purchasesUntilNextBand } from '../character/stat-costs.js'
import { computeStats, statBreakdown } from '../character/character.js'
import { isGmMode } from '../gm/gm-mode.js'
import { formatCurrency, normalizeGil } from './format.js'
import { statTooltip, statUpgradeTooltip, statRefundTooltip } from './tooltips-text.js'

/** Stats tab — live resource editor and stat upgrade/refund cards. */

function renderResourceManager(character) {
  const stats = computeStats(character)
  const resourceControl = (resource, label, value, max, quick = [1, 5, 10]) => `
    <div class="resource-editor" data-tooltip="${esc(`${label}
Current value can be adjusted directly or with the quick buttons. Maximum: ${max}`)}" tabindex="0">
      <div>
        <strong>${label}</strong>
        <div class="subtle">Current / max: ${value}/${max}</div>
      </div>
      <div class="resource-control-row">
        ${quick.map(amount => `<button type="button" class="ghost-btn tiny" data-adjust-resource="${resource}" data-amount="-${amount}">-${amount}</button>`).join('')}
        <input class="input mini-input" type="number" min="0" max="${max}" value="${value}" data-resource-input="${resource}" />
        ${quick.map(amount => `<button type="button" class="ghost-btn tiny" data-adjust-resource="${resource}" data-amount="${amount}">+${amount}</button>`).join('')}
        <button type="button" class="primary-btn tiny" data-full-resource="${resource}">Full</button>
      </div>
    </div>
  `
  return `
    <section class="card resource-card">
      <div class="card-header">
        <div>
          <div class="kicker">Live Resource Editor</div>
          <h3>HP, Stamina, Lumens & Gil</h3>
          <p class="tab-intro">Use this during play to damage, heal, reward, spend, pay, rob, or otherwise lovingly bully the character.</p>
        </div>
        <span class="pill gold">${formatCurrency(character.gil)}</span>
      </div>
      <div class="stack">
        ${resourceControl('hp', 'HP', character.hp, stats.hp)}
        ${resourceControl('stamina', 'Stamina', character.stamina, stats.stamina)}
        <div class="resource-editor" data-tooltip="${esc('Lumens\nSpend or award any amount. Use the direct box for exact values instead of being trapped in +5/+25 jail.')}" tabindex="0">
          <div>
            <strong>Lumens</strong>
            <div class="subtle">Current: ${character.lumens}</div>
          </div>
          <div class="resource-control-row">
            ${[-25, -10, -5, -1].map(amount => `<button type="button" class="${amount < 0 ? 'danger-btn' : 'ghost-btn'} tiny" data-adjust-resource="lumens" data-amount="${amount}">${amount}</button>`).join('')}
            <input class="input mini-input" type="number" min="0" value="${character.lumens}" data-resource-input="lumens" />
            ${[1, 5, 10, 25].map(amount => `<button type="button" class="ghost-btn tiny" data-adjust-resource="lumens" data-amount="${amount}">+${amount}</button>`).join('')}
          </div>
        </div>
        <div class="resource-editor" data-tooltip="${esc('Gil\nSingle currency for the whole economy. Edit the exact amount or use quick add/remove buttons.')}" tabindex="0">
          <div>
            <strong>Gil</strong>
            <div class="subtle">Current: ${formatCurrency(character.gil)}</div>
          </div>
          <div class="money-grid">
            <label><span class="field-label">Amount</span><input class="input mini-input" type="number" min="0" value="${normalizeGil(character.gil)}" data-gil-input /></label>
            <div class="wrap">
              <button type="button" class="danger-btn tiny" data-coin="-1000">-1k</button>
              <button type="button" class="danger-btn tiny" data-coin="-100">-100</button>
              <button type="button" class="danger-btn tiny" data-coin="-10">-10</button>
              <button type="button" class="ghost-btn tiny" data-coin="10">+10</button>
              <button type="button" class="ghost-btn tiny" data-coin="100">+100</button>
              <button type="button" class="ghost-btn tiny" data-coin="1000">+1k</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
}

export function renderStatsTab(character) {
  const computed = computeStats(character)
  return `
    ${renderResourceManager(character)}
    <p class="stat-howto mt-12">⚔️ ${esc(STAT_HOW_ATTACKS_WORK)}</p>
    <p class="subtle mt-8">Early stat upgrades are cheaper. The price rises as you repeatedly improve the same stat. Gear and skill bonuses do not change the upgrade price.</p>
    <div class="grid two stat-upgrade-grid mt-16">
      ${Object.entries(STAT_RULES).map(([stat, rule]) => {
        const rows = statBreakdown(character, stat).map(row => `<span class="pill ${row.value >= 0 ? 'good' : 'bad'}">${esc(row.label)} ${row.value >= 0 ? '+' : ''}${row.value}</span>`).join('')
        const nextCost = getNextStatUpgradeCost(character, stat)
        const purchased = getPurchasedStatCount(character, stat)
        const untilBand = purchasesUntilNextBand(character, stat)
        const refund = getLatestStatRefund(character, stat)
        return `
          <section class="card stat-upgrade-card">
            <div class="stat-row stat-row-upgrade" data-tooltip="${esc(statTooltip(rule, { includeCost: true }))}" tabindex="0">
              <div class="stat-upgrade-head">
                <div class="kicker">Next: ${isGmMode() ? 'Free' : `${nextCost} Lumens`}</div>
                <h3>${esc(rule.label)}</h3>
              </div>
              <div class="stat-value">${computed[stat]}</div>
            </div>
            <p class="stat-explain">${esc(STAT_EXPLAINERS[stat] || '')}</p>
            <div class="subtle mt-8">Purchased: ${purchased} · Next band in ${untilBand} · Refund: ${isGmMode() ? '—' : `${refund}L`}</div>
            <div class="wrap mt-12 stat-breakdown-pills">${rows}</div>
            <div class="stat-actions">
              <button type="button" class="ghost-btn" data-refund-stat="${esc(stat)}" data-tooltip="${esc(statRefundTooltip(stat, rule, character))}" tabindex="0">− Refund${isGmMode() || !refund ? '' : ` (${refund}L)`}</button>
              <button type="button" class="primary-btn" data-upgrade-stat="${esc(stat)}" data-tooltip="${esc(statUpgradeTooltip(stat, rule, character))}" tabindex="0">Upgrade (${isGmMode() ? 'Free' : `${nextCost}L`})</button>
            </div>
          </section>
        `
      }).join('')}
    </div>
  `
}
