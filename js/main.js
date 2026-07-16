import { loadGameData } from './core/data.js'
import { initCache, flattenSkills, itemSources } from './core/cache.js'
import { loadHomebrewStore, registerHomebrewInCache } from './homebrew/homebrew.js'
import { load, saveNow } from './core/storage.js'
import { state, activeCharacter, applyUrlState } from './core/state.js'
/** Query bump forces browsers to reload render.js (child modules ignore main.js?v=). */
import { render } from './ui/render.js?v=5.2.2-howtoplay-fix'
import { initEvents } from './core/events.js'
import { setupTooltips } from './ui/tooltips.js'
import { initUrlState, syncUrlState } from './core/url-state.js'
import { computeStats } from './character/character.js'

import { initTheme, applyTheme } from './ui/themes.js'
import { setupActionBarSkillSheet } from './combat/action-bar-sheet.js'

async function boot() {
  try {
    initTheme()
    await loadGameData()
    loadHomebrewStore()
    initCache()
    registerHomebrewInCache()
    load()
    applyUrlState()
    initEvents()
    setupTooltips()
    setupActionBarSkillSheet()
    render({ all: true })
    syncUrlState()
    initUrlState(() => render({ content: true, header: true, tabs: true, actionBar: true }))
  } catch (error) {
    console.error(error)
    const content = document.querySelector('#app-content')
    if (content) {
      content.innerHTML = `
        <div class="notice-card">
          <h2>Boot failed</h2>
          <p>The app failed to start. Check data files and console for details.</p>
        </div>
      `
    }
  }
}

window.LumenForge = {
  state,
  helpers: {
    activeCharacter,
    applyUrlState,
    computeStats,
    flattenSkills,
    itemSources,
    render,
    saveNow,
    syncUrlState
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}
