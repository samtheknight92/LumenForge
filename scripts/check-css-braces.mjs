// Catches a missing or extra "}" in a stylesheet, which silently switches off every rule after it.
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const files = ['styles.css', ...readdirSync(join(root, 'styles')).filter(f => f.endsWith('.css')).map(f => `styles/${f}`)]
let failed = false
for (const file of files) {
  const text = readFileSync(join(root, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""')
  let depth = 0
  let line = 1
  for (const ch of text) {
    if (ch === '\n') line++
    if (ch === '{') depth++
    if (ch === '}') depth--
    if (depth < 0) { console.error(`${file}: extra "}" near line ${line}`); failed = true; break }
  }
  if (depth > 0) { console.error(`${file}: ${depth} unclosed "{"`); failed = true }
}
if (failed) process.exit(1)
console.log(`check-css-braces: ok (${files.length} files)`)
