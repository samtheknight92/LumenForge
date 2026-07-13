#!/usr/bin/env node
/**
 * Verify every relative ES module import in js/ resolves to an existing file.
 * Run: node scripts/verify-js-imports.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { listJsModules } from './lib/js-import.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const jsDir = path.join(root, 'js')
const importRe = /from\s+['"](\.\/[^'"]+\.js)['"]/g

const failures = []
for (const file of listJsModules()) {
  const abs = path.join(jsDir, file)
  const src = fs.readFileSync(abs, 'utf8')
  importRe.lastIndex = 0
  let match
  while ((match = importRe.exec(src))) {
    const target = match[1]
    const resolved = path.normalize(path.join(jsDir, path.dirname(file), target.replace(/^\.\//, '')))
    if (!fs.existsSync(resolved)) {
      failures.push(`${file} → ${target} (resolved: ${path.relative(root, resolved)})`)
    }
  }
}

if (failures.length) {
  console.error('Broken JS imports:')
  for (const line of failures) console.error(`  ✗ ${line}`)
  process.exit(1)
}

console.log(`verify-js-imports: ok (${listJsModules().length} modules, all imports resolve)`)
