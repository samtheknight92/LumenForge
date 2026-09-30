import { esc, titleCase } from '../core/utils.js'
import { ITEMS_PER_PAGE } from '../core/constants.js'
import { state, activeCharacter } from '../core/state.js'
import { cache } from '../core/cache.js'
import { weaponHandednessLabel, offhandTypeLabel } from '../items/equipment.js'
import { computeSkillLevel } from '../character/skill-level.js'
import { isGmMode } from '../gm/gm-mode.js'
import { filterCatalogItems, paginateItems, isShopPurchaseItem, shopMinLevelForItem, shopPurchaseCheck, ITEM_CATALOG_CATEGORIES, catalogCategoryCounts, catalogSourceCounts, activeCatalogFilterLabels } from '../items/items.js'
import { formatCurrency, fallbackIcon, itemPriceGil, normalizeGil } from './format.js'
import { itemTooltip } from './tooltips-text.js'
import { resolveItemPresentation, renderCursedBadgeHtml, itemCardClass, itemCursedNameClass } from '../items/item-presentation.js'

/** Shop tab — item catalogue filters, pagination and item cards. */

export function renderShopTab(character) {
  const items = filterCatalogItems(character)
  const pageData = paginateItems(items)
  const categoryCounts = catalogCategoryCounts(character)
  const sourceCounts = catalogSourceCounts(character)
  const rarityOptions = cache.itemRarityOptions || ['all']
  const activeFilters = activeCatalogFilterLabels()
  const sourceOptions = [
    ['shop', 'Shop'],
    ['homebrew', 'Homebrew'],
    ['profession', 'Profession'],
    ['discoverable', 'Discoverable'],
    ['loot', 'Loot'],
    ['all', 'All sources']
  ]
  const categoryOptions = ITEM_CATALOG_CATEGORIES.filter(row =>
    row.id === 'all' || row.id === state.itemCategory || (categoryCounts[row.id] || 0) > 0
  )
  const sortOptions = [
    ['name', 'Name A–Z'],
    ['priceAsc', 'Cheapest first'],
    ['priceDesc', 'Most expensive'],
    ['rarityDesc', 'Rarest first'],
    ['damageDesc', 'Highest damage'],
    ['strengthDesc', 'Best Strength'],
    ['magicDesc', 'Best Magic'],
    ['defenceDesc', 'Best Defence'],
    ['sourceType', 'Source, then type']
  ]
  return `
    <section class="card catalogue-card">
      <div class="card-header">
        <div>
          <div class="kicker">Item Catalogue</div>
          <h3>Shop</h3>
          <p class="tab-intro">Browse gear by category — food includes shop snacks like apples and cheese, not just chef recipes. Stock unlocks by rarity at your Skill Level. Hover cards for details; Grant is GM-only free loot.</p>
        </div>
        <span class="pill gold">${formatCurrency(character.gil)}</span>
      </div>
      <div class="shop-filters">
        <div class="shop-filters-primary">
          <input class="input shop-search" id="item-search" placeholder="Search name, effect, stat, food, potion, sword…" value="${esc(state.itemSearch)}" />
          <select class="input" id="item-source" title="Where the item comes from">
            ${sourceOptions.map(([value, label]) => {
              const count = value === 'all' ? sourceCounts.all : (sourceCounts[value] || 0)
              return `<option value="${value}" ${state.itemSource === value ? 'selected' : ''}>${esc(label)} (${count})</option>`
            }).join('')}
          </select>
          <select class="input" id="item-category" title="Friendly item groups — Food & drink includes shop consumables">
            ${categoryOptions.map(row => {
              const count = row.id === 'all' ? categoryCounts.all : (categoryCounts[row.id] || 0)
              return `<option value="${esc(row.id)}" ${state.itemCategory === row.id ? 'selected' : ''}>${esc(row.label)} (${count})</option>`
            }).join('')}
          </select>
          <select class="input" id="item-rarity" title="Item rarity">
            ${rarityOptions.map(rarity => `<option value="${esc(rarity)}" ${state.itemRarity === rarity ? 'selected' : ''}>${rarity === 'all' ? 'Any rarity' : titleCase(rarity)}</option>`).join('')}
          </select>
        </div>
        <div class="shop-filters-secondary">
          <select class="input" id="item-sort">
            ${sortOptions.map(([value, label]) => `<option value="${value}" ${state.itemSort === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}
          </select>
          <label class="pill ${state.itemBuyableOnly ? 'good' : ''} shop-filter-toggle" title="Shop stock you can afford at your Skill Level — profession/loot items are craft-only or GM grant">
            <input type="checkbox" id="item-buyable-only" ${state.itemBuyableOnly ? 'checked' : ''} ${isGmMode() ? 'disabled' : ''} />
            Buyable only
          </label>
          <label class="pill ${state.itemStarredOnly ? 'good' : ''} shop-filter-toggle" title="Show wishlist items only">
            <input type="checkbox" id="item-starred-only" ${state.itemStarredOnly ? 'checked' : ''} />
            ⭐ Starred
          </label>
          ${activeFilters.length ? `<span class="pill warn shop-active-filters">Filters: ${activeFilters.map(label => esc(label)).join(' · ')}</span>` : ''}
        </div>
      </div>
      <div class="catalogue-summary">
        <span class="pill good">${pageData.total} match${pageData.total === 1 ? '' : 'es'}</span>
        <span class="pill">Page ${pageData.page + 1}/${pageData.totalPages} · ${ITEMS_PER_PAGE} per page</span>
        <button type="button" class="ghost-btn tiny" data-item-page-prev ${pageData.page <= 0 ? 'disabled' : ''}>Prev</button>
        <button type="button" class="ghost-btn tiny" data-item-page-next ${pageData.page >= pageData.totalPages - 1 ? 'disabled' : ''}>Next</button>
        <button type="button" class="ghost-btn tiny" data-reset-item-filters>Reset filters</button>
      </div>
      <div class="item-grid">${pageData.items.map(item => renderItemCard(item, character)).join('') || `<div class="empty">${state.itemBuyableOnly && state.itemSource !== 'shop' ? 'Buyable only applies to Shop stock — switch source to Shop, or turn off the filter to browse profession/loot catalogues.' : 'No items matched. Try Shop source, turn off Buyable only, or pick All categories.'}</div>`}</div>
    </section>
  `
}

function renderItemCard(item, character = activeCharacter()) {
  const price = itemPriceGil(item)
  const gmFree = isGmMode()
  const purchase = shopPurchaseCheck(character, item, { free: gmFree })
  const shopLocked = isShopPurchaseItem(item) && !gmFree && character && computeSkillLevel(character).skillLevel < shopMinLevelForItem(item)
  const canBuy = isShopPurchaseItem(item) || gmFree
  const affordLocked = isShopPurchaseItem(item) && !gmFree && character && itemPriceGil(item) > normalizeGil(character.gil)
  const presentation = resolveItemPresentation(item, null)
  const starred = (state.starredCatalogItemIds || []).includes(item.id)
  const statPills = Object.entries(item.statModifiers || {}).map(([stat, value]) => `<span class="pill ${value >= 0 ? 'good' : 'bad'}">${titleCase(stat)} ${value >= 0 ? '+' : ''}${value}</span>`).join('')
  const effectPills = (item.specialEffects || []).slice(0, 3).map(effect => `<span class="pill warn">${titleCase(effect)}</span>`).join('')
  const handsLabel = weaponHandednessLabel(item)
  const offhandLabel = offhandTypeLabel(item)
  const levelPill = isShopPurchaseItem(item) && !gmFree
    ? `<span class="pill ${shopLocked ? 'warn' : 'good'}">${shopLocked ? `SL ${shopMinLevelForItem(item)}+` : 'Unlocked'}</span>`
    : ''
  const craftPill = item.source === 'profession' && !gmFree
    ? '<span class="pill">Craft only</span>'
    : ''
  const homebrewPill = item.source === 'homebrew'
    ? `<span class="pill warn">${item.listInShop && price ? 'Homebrew · Shop' : 'Homebrew · Grant only'}</span>`
    : ''
  const affordPill = affordLocked
    ? '<span class="pill warn">Too expensive</span>'
    : ''
  const cursedBadge = renderCursedBadgeHtml(presentation)
  const cursedNameClass = itemCursedNameClass(presentation)
  return `
    <article class="item-card ${itemCardClass(presentation, '')}" data-tooltip="${esc(itemTooltip(item, character))}" tabindex="0">
      <div class="item-title">
        <strong class="${cursedNameClass}">${fallbackIcon(item)} ${esc(presentation.displayName)}</strong>
        ${cursedBadge}
        <span class="pill">${esc(item.rarity || 'common')}</span>
        <button type="button" class="ghost-btn tiny item-star-btn" data-toggle-catalog-star="${esc(item.id)}" aria-label="Star item">${starred ? '⭐' : '☆'}</button>
      </div>
      <div class="item-meta">${esc(item.type || 'item')} · ${esc(item.source || 'shop')}${item.damage ? ` · ${esc(item.damage)}` : ''}${handsLabel ? ` · ${esc(handsLabel)}` : ''}${offhandLabel ? ` · ${esc(offhandLabel)}` : ''}</div>
      <p class="subtle">${esc(presentation.displayDesc || 'No description provided.')}</p>
      <div class="wrap detail-pills">
        ${statPills || '<span class="pill">No stat modifiers</span>'}
        ${effectPills}
        ${levelPill}
        ${craftPill}
        ${homebrewPill}
        ${affordPill}
        ${(item.tags || []).map(tag => `<span class="pill subtle-pill">${esc(tag)}</span>`).join('')}
        ${Number(item.enchantmentSlots || 0) ? `<span class="pill good">${item.enchantmentSlots} enchant slot${Number(item.enchantmentSlots) === 1 ? '' : 's'}</span>` : ''}
      </div>
      <div class="skill-actions">
        <span class="pill gold">${gmFree ? 'Free (GM)' : price ? formatCurrency(price) : 'Free/loot'}</span>
        <span class="wrap compact-actions">
          <button type="button" class="ghost-btn tiny" data-grant-item="${esc(item.id)}">Grant</button>
          ${canBuy ? `<button type="button" class="primary-btn tiny" data-buy-item="${esc(item.id)}" ${purchase.ok ? '' : 'disabled'}>${gmFree ? 'Take' : 'Buy'}</button>` : ''}
        </span>
      </div>
    </article>
  `
}
