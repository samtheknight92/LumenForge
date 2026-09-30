#!/usr/bin/env node
/**
 * Browser smoke tests — boots the real app in headless Chromium and clicks through
 * the flows the Node checks cannot reach: tabs, character creation, save/load,
 * combat toasts, feedback, folders, export/import and unreadable-save protection.
 *
 * Needs Playwright with Chromium: `npm install` then `npx playwright install chromium`.
 * Run: npm run test:ui
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    // Fall back to a globally installed copy (npm i -g playwright).
    const globalRoot = path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', '/')
    return createRequire(globalRoot)('playwright')
  }
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png'
}

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    const file = path.join(root, urlPath === '/' ? 'index.html' : urlPath)
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end()
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)))
}

const { chromium } = await loadPlaywright()
const server = await startServer()
const baseUrl = `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch()
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumenforge-smoke-'))
let failures = 0

/** Fresh browser context per test so localStorage never leaks between cases. */
async function test(name, fn) {
  const context = await browser.newContext({ acceptDownloads: true })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('dialog', dialog => dialog.accept(dialog.type() === 'prompt' ? 'Boss Room' : undefined))
  try {
    await fn(page, context)
    assert.deepEqual(errors, [], 'page threw errors')
    console.log(`✓ ${name}`)
  } catch (error) {
    failures++
    console.log(`✗ ${name}\n    ${error.message.split('\n').join('\n    ')}`)
  } finally {
    await context.close()
  }
}

async function open(page) {
  await page.goto(baseUrl)
  await page.locator('#new-race option').first().waitFor({ state: 'attached' })
}

async function createCharacter(page, name = 'Smoke Tester') {
  await page.fill('#new-name', name)
  await page.selectOption('#new-race', 'elf')
  await page.click('#create-character')
  await assertText(page, '#current-name', name)
}

async function assertText(page, selector, expected) {
  await page.locator(selector).filter({ hasText: expected }).waitFor({ timeout: 3000 })
}

const savedCharacters = page => page.evaluate(() =>
  JSON.parse(localStorage.getItem('lumenforge_save_v3') || '{"characters":[]}').characters.map(c => c.name))

await test('every tab renders without errors', async page => {
  await open(page)
  await createCharacter(page)
  for (const tab of await page.locator('#tabbar [data-tab]').evaluateAll(els => els.map(el => el.dataset.tab))) {
    await page.click(`#tabbar [data-tab="${tab}"]`)
    await page.locator(`#tabbar [data-tab="${tab}"][aria-selected="true"]`).waitFor()
    const text = (await page.locator('#app-content').innerText()).trim()
    assert.ok(text.length > 20, `tab "${tab}" rendered almost nothing`)
  }
})

await test('created character survives a reload', async page => {
  await open(page)
  await createCharacter(page, 'Persisted Pip')
  await page.evaluate(() => window.LumenForge.helpers.saveNow())
  await page.reload()
  await assertText(page, '#current-name', 'Persisted Pip')
  assert.deepEqual(await savedCharacters(page), ['Persisted Pip'])
})

await test('play tab: stat tiles, basic attack toast and Process Turn', async page => {
  await open(page)
  await createCharacter(page)
  await page.click('#tabbar [data-tab="play"]')
  assert.equal(await page.locator('#app-content .play-stat').count(), 6, 'play tab is missing its stat tiles')
  await page.locator('#app-content button', { hasText: 'Basic Attack' }).first().click()
  await page.locator('#toast.show').waitFor()
  assert.match(await page.locator('#toast').innerText(), /\d/, 'attack toast has no roll numbers')
  await page.locator('#app-content [data-process-turn]').first().click()
})

await test('bottom bar: HP minus and Full refill', async page => {
  await open(page)
  await createCharacter(page)
  const hp = () => page.locator('#action-bar .action-bar-meter-hp .action-bar-meter-value').innerText()
  const full = await hp()
  await page.click('#action-bar [data-adjust-resource="hp"][data-amount="-1"]')
  await page.waitForFunction(before => document.querySelector('#action-bar .action-bar-meter-hp .action-bar-meter-value').innerText !== before, full)
  await page.click('#action-bar [data-full-resource="hp"]')
  await page.waitForFunction(expected => document.querySelector('#action-bar .action-bar-meter-hp .action-bar-meter-value').innerText === expected, full)
  assert.ok(await page.locator('#action-bar [data-full-resource="hp"]').isDisabled(), 'Full stays clickable at max HP')
})

await test('notes tab: pages, quests and glossary search', async page => {
  await open(page)
  await createCharacter(page)
  await page.click('#tabbar [data-tab="notes"]')
  const pagesBefore = await page.locator('[data-set-note-page]').count()
  await page.click('[data-add-note-page]')
  await page.waitForFunction(n => document.querySelectorAll('[data-set-note-page]').length === n + 1, pagesBefore)
  await page.click('[data-add-quest]')
  await page.locator('.quest-row').first().waitFor()
  await page.fill('#glossary-search', 'burn')
  await page.waitForFunction(() => /burn/i.test(document.querySelector('.glossary-results')?.innerText || '') &&
    document.querySelectorAll('.glossary-entry').length > 0)
})

await test('shop tab: search, star, page and buy', async page => {
  await open(page)
  await createCharacter(page)
  await page.click('#tabbar [data-tab="shop"]')
  await page.locator('#app-content .item-card').first().waitFor()
  await page.click('[data-item-page-next]')
  await assertText(page, '.catalogue-summary', 'Page 2/')
  await page.fill('#item-search', 'apple')
  await page.waitForFunction(() => {
    const names = [...document.querySelectorAll('.item-card strong')].map(el => el.innerText)
    return names.some(name => /apple/i.test(name)) && names.length < 20
  })
  const star = page.locator('.item-card [data-toggle-catalog-star]').first()
  await star.click()
  await page.waitForFunction(() => document.querySelector('.item-card [data-toggle-catalog-star]').innerText.includes('⭐'))
  const gilBefore = await page.locator('#coin-pill').innerText()
  await page.locator('.item-card [data-buy-item]:not([disabled])').first().click()
  await page.waitForFunction(before => document.querySelector('#coin-pill').innerText !== before, gilBefore)
})

await test('craft tab: filters and recipe stars', async page => {
  await open(page)
  await createCharacter(page)
  await page.click('#tabbar [data-tab="craft"]')
  if (await page.locator('#craft-learned-only').isChecked()) await page.click('#craft-learned-only')
  await page.locator('#app-content .item-card').first().waitFor()
  await page.locator('.item-card [data-toggle-recipe-star]').first().click()
  await page.waitForFunction(() => document.querySelector('.item-card [data-toggle-recipe-star]').innerText.includes('⭐'))
  await page.click('#craft-starred-only')
  await page.waitForFunction(() => document.querySelectorAll('.item-card').length === 1)
})

await test('stats tab: upgrade, refund and resource editor', async page => {
  await open(page)
  await createCharacter(page)
  await page.click('#tabbar [data-tab="stats"]')
  const lumens = () => page.locator('#lumens-pill').innerText()
  const start = await lumens()
  await page.locator('[data-upgrade-stat="accuracy"]').click()
  await page.waitForFunction(before => document.querySelector('#lumens-pill').innerText !== before, start)
  await page.locator('[data-refund-stat="accuracy"]').click()
  await page.waitForFunction(before => document.querySelector('#lumens-pill').innerText === before, start)
  await page.locator('[data-adjust-resource="lumens"][data-amount="5"]').click()
  await page.waitForFunction(before => Number(document.querySelector('#lumens-pill').innerText) === Number(before) + 5, start)
  const gil = await page.locator('#coin-pill').innerText()
  await page.locator('[data-coin="100"]').click()
  await page.waitForFunction(before => document.querySelector('#coin-pill').innerText !== before, gil)
})

await test('character tab: equip gear; play tab: add and remove effects and weather', async page => {
  await open(page)
  await createCharacter(page)
  await page.click('#tabbar [data-tab="shop"]')
  await page.fill('#item-search', 'dagger')
  await assertText(page, '.item-card strong', 'Bronze Dagger')
  await page.locator('.item-card', { hasText: 'Bronze Dagger' }).locator('[data-buy-item]').click()
  await page.locator('#toast', { hasText: 'Bronze Dagger bought' }).waitFor()
  await page.click('#tabbar [data-tab="character"]')
  await page.locator('#app-content [data-equip-item]').first().click()
  await page.locator('#app-content [data-unequip]').first().waitFor()
  await page.click('#tabbar [data-tab="play"]')
  await page.click('#app-content [data-add-effect]')
  await page.locator('#app-content [data-remove-effect]').first().waitFor()
  await page.click('#app-content [data-add-weather]')
  await page.locator('#app-content [data-remove-weather]').first().waitFor()
  await page.locator('#app-content [data-remove-effect]').first().click()
  await page.waitForFunction(() => !document.querySelector('#app-content [data-remove-effect]'))
})

await test('skills tab: switch tree, learn, refund and search', async page => {
  await open(page)
  await createCharacter(page)
  await page.click('#tabbar [data-tab="skills"]')
  await page.locator('[data-skill-category]').nth(1).click()
  await page.locator('[data-skill-category].active, [data-skill-category][aria-selected="true"]').first().waitFor()
  const start = await page.locator('#lumens-pill').innerText()
  await page.locator('[data-learn-skill]:not([disabled])').first().click()
  await page.waitForFunction(before => document.querySelector('#lumens-pill').innerText !== before, start)
  await page.locator('[data-refund-skill]').first().click()
  await page.waitForFunction(before => document.querySelector('#lumens-pill').innerText === before, start)
  await page.fill('#skill-search', 'fire')
  await page.waitForFunction(() => document.querySelectorAll('[data-learn-skill], [data-refund-skill]').length > 0 &&
    /fire/i.test(document.querySelector('#app-content').innerText))
})

await test('homebrew tab: create a custom item and open each editor', async page => {
  await open(page)
  await createCharacter(page)
  await page.click('#tabbar [data-tab="homebrew"]')
  for (const opener of ['data-homebrew-skill-new', 'data-homebrew-race-new']) {
    await page.locator(`[${opener}]`).first().click()
    await page.locator('#app-content form').first().waitFor()
    await page.locator('[data-homebrew-cancel]').first().click()
  }
  await page.locator('[data-homebrew-new]').first().click()
  await page.fill('#homebrew-form [name="hb-name"]', 'Smoke Blade')
  await page.fill('#homebrew-form [name="hb-desc"]', 'A test blade.')
  await page.click('#homebrew-form button[type="submit"]')
  await assertText(page, '#app-content', 'Smoke Blade')
  await page.reload()
  await page.click('#tabbar [data-tab="homebrew"]')
  await assertText(page, '#app-content', 'Smoke Blade')
})

await test('gm tools: activate GM mode, spawn a premade and build a monster', async page => {
  await open(page)
  await createCharacter(page)
  await page.click('#tabbar [data-tab="gm"]')
  await page.locator('#app-content [data-toggle-gm-mode]').first().click()
  await page.locator('#app-content [data-spawn-premade]').first().waitFor()
  const count = () => page.evaluate(() => window.LumenForge.state.characters.length)
  const before = await count()
  await page.locator('#app-content [data-spawn-premade]').first().click()
  await page.waitForFunction(n => window.LumenForge.state.characters.length > n, before)
  const afterSpawn = await count()
  await page.click('#tabbar [data-tab="gm"]')
  await page.locator('#app-content [data-randomise-gm-monster]').first().click()
  await page.locator('#app-content [data-save-gm-monster]').first().click()
  await page.waitForFunction(n => window.LumenForge.state.characters.length > n, afterSpawn)
})

await test('feedback form sends to Web3Forms and falls back on failure', async page => {
  const posts = []
  let fail = false
  await page.route('https://api.web3forms.com/submit', route => {
    posts.push(JSON.parse(route.request().postData()))
    return route.fulfill({ status: fail ? 500 : 200, contentType: 'application/json', body: JSON.stringify({ success: !fail }) })
  })
  await open(page)
  await page.click('#open-feedback')
  await page.selectOption('#feedback-dialog select[name="kind"]', 'idea')
  await page.fill('#feedback-dialog textarea', 'Add a dice tray')
  await page.fill('#feedback-dialog input[name="email"]', 'player@example.com')
  await page.click('[data-feedback-send="submit"]')
  await assertText(page, '#toast', 'Thanks! Your feedback was sent.')
  assert.equal(posts.length, 1)
  assert.equal(posts[0].access_key, 'a2188469-57f5-4dc3-81c7-e84bbf76f983')
  assert.equal(posts[0].subject, 'LumenForge Idea: Add a dice tray')
  assert.equal(posts[0].email, 'player@example.com')
  assert.equal(posts[0].name, 'LumenForge player')
  assert.match(posts[0].message, /^Add a dice tray\n\n---\nApp: LumenForge/)
  assert.equal(await page.locator('#feedback-dialog').isVisible(), false)

  fail = true
  await page.click('#open-feedback')
  await page.fill('#feedback-dialog textarea', 'Second try')
  await page.click('[data-feedback-send="submit"]')
  await assertText(page, '#toast', 'Could not send right now')
  assert.equal(posts[1].email, 'lumenforge.feedback@gmail.com')
  assert.equal(await page.locator('#feedback-dialog').isVisible(), true)
  assert.equal(await page.inputValue('#feedback-dialog textarea'), 'Second try')
})

await test('folder can be created and persists', async page => {
  await open(page)
  await createCharacter(page)
  await page.click('[data-create-character-folder]')
  await assertText(page, '#character-list', 'Boss Room')
  await page.evaluate(() => window.LumenForge.helpers.saveNow())
  await page.reload()
  await assertText(page, '#character-list', 'Boss Room')
})

await test('export then import restores characters in a fresh browser', async (page, context) => {
  await open(page)
  await createCharacter(page, 'Exported Esk')
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-all')])
  const file = path.join(tmpDir, 'save.json')
  await download.saveAs(file)
  assert.ok(JSON.parse(fs.readFileSync(file, 'utf8')).characters.some(c => c.name === 'Exported Esk'))

  const fresh = await context.newPage()
  fresh.on('dialog', dialog => dialog.accept())
  await open(fresh)
  await fresh.evaluate(() => { localStorage.clear() })
  await fresh.reload()
  await fresh.setInputFiles('#import-save', file)
  await assertText(fresh, '#character-list', 'Exported Esk')
})

await test('unreadable save is kept, not overwritten', async (page, context) => {
  await context.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    localStorage.setItem('lumenforge_save_v3', '{"version":3,"characters":"broken')
  })
  await open(page)
  await page.locator('#toast a[download]').waitFor()
  await page.evaluate(() => window.LumenForge.helpers.saveNow())
  assert.equal(
    await page.evaluate(() => localStorage.getItem('lumenforge_save_v3_unreadable')),
    '{"version":3,"characters":"broken'
  )
})

await browser.close()
server.close()
fs.rmSync(tmpDir, { recursive: true, force: true })

if (failures) {
  console.log(`\nsmoke-ui: ${failures} failed`)
  process.exit(1)
}
console.log('\nsmoke-ui: ok')
