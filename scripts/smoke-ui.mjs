#!/usr/bin/env node
/**
 * Browser smoke tests — boots the real app in headless Chromium and clicks through
 * the flows the Node checks cannot reach: tabs, character creation, save/load,
 * combat toasts, folders, export/import and unreadable-save protection.
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

await test('play tab: basic attack toast, HP buttons and Process Turn', async page => {
  await open(page)
  await createCharacter(page)
  await page.click('#tabbar [data-tab="play"]')
  const hpBefore = await page.locator('#hp-pill').innerText()
  await page.locator('#app-content button', { hasText: /^−1$/ }).first().click()
  await page.waitForFunction(before => document.querySelector('#hp-pill').innerText !== before, hpBefore)
  await page.locator('#app-content button', { hasText: 'Basic Attack' }).first().click()
  await page.locator('#toast.show').waitFor()
  assert.match(await page.locator('#toast').innerText(), /\d/, 'attack toast has no roll numbers')
  await page.locator('#app-content [data-process-turn]').first().click()
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
