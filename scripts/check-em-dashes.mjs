// Em dashes are not used in Socion copy. This ratchet counts them in user-facing
// source (non-comment lines of src/**/*.{js,jsx} and index.html) against
// scripts/em-dash-baseline.json and fails if any file's count rises. Run with
// --update after lowering a count to tighten the baseline (it only ever lowers).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = path.join(root, 'scripts/em-dash-baseline.json')
const update = process.argv.includes('--update')

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(jsx?|html)$/.test(e.name)) out.push(p)
  }
  return out
}
const files = [...walk(path.join(root, 'src')), path.join(root, 'index.html')]
const counts = {}
for (const f of files) {
  let n = 0
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const t = line.trimStart()
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue
    n += (line.match(/—/g) ?? []).length
  }
  if (n) counts[path.relative(root, f)] = n
}
const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : {}
const problems = []
for (const [f, n] of Object.entries(counts)) {
  const allowed = baseline[f] ?? 0
  if (n > allowed) problems.push(`${f}: ${n} em dash(es), baseline allows ${allowed}`)
}
if (update) {
  const next = {}
  for (const [f, n] of Object.entries(counts)) next[f] = Math.min(n, baseline[f] ?? n)
  fs.writeFileSync(baselinePath, JSON.stringify(next, null, 2) + '\n')
  console.log(`check-em-dashes: baseline written for ${Object.keys(next).length} file(s)`)
}
if (problems.length) {
  console.error('check-em-dashes: em dashes are not used in Socion copy; replace with a comma, colon or full stop')
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
const total = Object.values(counts).reduce((a, b) => a + b, 0)
console.log(`check-em-dashes: ${total} remaining across ${Object.keys(counts).length} file(s), all within baseline`)
