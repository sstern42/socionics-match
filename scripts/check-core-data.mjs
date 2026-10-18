// Verifies every piece of Socionics data the app ships against socionics-core,
// the canonical source (data/types.json, data/relations.json, data/groups.json).
// Run with `npm run check:core-data`. Exits non-zero on any mismatch.
//
// Covers: TYPES, MATRIX (256 cells, asymmetric roles oriented as A's role toward B),
// QUADRAS, Model A stacks in compatibility.js, the Reinin table, book nicknames,
// and the Benefactor/Supervisor pair lists in the chat-socionics prompt.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const core = (f) => JSON.parse(fs.readFileSync(path.join(root, 'node_modules/socionics-core/data', f), 'utf8'))
const types  = core('types.json')
const rels   = core('relations.json').byType
const groups = core('groups.json')

const { TYPES, MATRIX, QUADRAS, getQuadra } = await import(path.join(root, 'src/data/relations.js'))
const { TYPE_FUNCTIONS } = await import(path.join(root, 'src/data/compatibility.js'))
const { BOOKS } = await import(path.join(root, 'src/data/books.js')).catch(() => ({}))
const reinin = JSON.parse(fs.readFileSync(path.join(root, 'src/data/reinin-dichotomies.json'), 'utf8'))

const problems = []
const fail = (msg) => problems.push(msg)
const coreTypes = Object.keys(types)

// Types
if (TYPES.length !== 16 || coreTypes.some(t => !TYPES.includes(t))) fail(`TYPES: ${TYPES.join(' ')}`)

// Matrix. Core byType[A].benefactor = B means B is A's benefactor, so A's role toward B is BENEFICIARY.
const coreKeyToAppRole = {
  identity: 'IDENTITY', dual: 'DUAL', activation: 'ACTIVITY', mirror: 'MIRROR', kindred: 'KINDRED',
  semidual: 'SEMI_DUAL', business: 'BUSINESS', quasiIdentity: 'QUASI_IDENTITY',
  benefactor: 'BENEFICIARY', beneficiary: 'BENEFACTOR', supervisor: 'SUPERVISEE', supervisee: 'SUPERVISOR',
  superEgo: 'SUPER_EGO', extinguishment: 'CONTRARY', mirage: 'ILLUSIONARY', conflict: 'CONFLICT',
}
let cells = 0
for (const A of coreTypes) {
  for (const [key, B] of Object.entries(rels[A])) {
    cells++
    const expected = coreKeyToAppRole[key]
    if (!expected) fail(`unknown core relation key ${key}`)
    if (MATRIX[A]?.[B] !== expected) fail(`MATRIX[${A}][${B}] = ${MATRIX[A]?.[B]}, core says ${expected}`)
  }
}
if (cells !== 256) fail(`core relations: expected 256 cells, saw ${cells}`)

// Quadras
for (const [q, g] of Object.entries(groups.quadras)) {
  const app = QUADRAS[q]
  if (!app || [...g.types].sort().join() !== [...app].sort().join()) fail(`QUADRAS.${q}: app ${app} core ${g.types}`)
}
for (const t of coreTypes) if (getQuadra(t) !== types[t].quadra) fail(`getQuadra(${t}) = ${getQuadra(t)}, core ${types[t].quadra}`)

// Model A stacks
for (const t of coreTypes) {
  const coreStack = [...types[t].functions].sort((a, b) => a.position - b.position).map(f => f.code)
  if (coreStack.join() !== (TYPE_FUNCTIONS[t] ?? []).join()) fail(`TYPE_FUNCTIONS.${t}: app ${TYPE_FUNCTIONS[t]} core ${coreStack}`)
}

// Reinin table: every type's listed trait must be the pole core gives it
for (const [slug, d] of Object.entries(reinin.dichotomies ?? {})) {
  for (const [t, pole] of Object.entries(d.types ?? {})) {
    const coreDich = types[t]?.dichotomies ?? {}
    const match = Object.values(coreDich).some(v => String(v).toLowerCase() === String(pole).toLowerCase())
    if (!match) fail(`reinin ${slug}: ${t} = ${pole}, not found in core dichotomies for ${t}`)
  }
}

// Book nicknames
if (BOOKS) {
  for (const [t, b] of Object.entries(BOOKS)) {
    const nick = b?.nickname ?? b?.name
    if (nick && types[t] && nick !== types[t].name) fail(`books ${t}: ${nick} vs core ${types[t].name}`)
  }
}

// chat-socionics prompt: the two asymmetric pair lists
const prompt = fs.readFileSync(path.join(root, 'supabase/functions/chat-socionics/index.ts'), 'utf8')
const order = ['ILE','SEI','ESE','LII','EIE','LSI','SLE','IEI','SEE','ILI','LIE','ESI','LSE','EII','IEE','SLI']
const expectBen = '**Benefactor:** ' + order.map(a => `${a}→${rels[a].beneficiary}`).join(', ')
const expectSup = '**Supervisor:** ' + order.map(a => `${a}→${rels[a].supervisee}`).join(', ')
if (!prompt.includes(expectBen)) fail('chat-socionics Benefactor line does not match core')
if (!prompt.includes(expectSup)) fail('chat-socionics Supervisor line does not match core')

if (problems.length) {
  console.error(`check-core-data: ${problems.length} problem(s)`)
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
console.log('check-core-data: TYPES, 256 MATRIX cells, quadras, 16 Model A stacks, Reinin table, books and chat prompt pair lists all match socionics-core ' + JSON.parse(fs.readFileSync(path.join(root,'node_modules/socionics-core/package.json'))).version)
