// Fails if the "email helpers" block differs between the edge functions that
// carry a copy of it. Each function holds its own copy (rather than importing
// a shared module) so it can be deployed from the Supabase dashboard editor,
// which only uploads the function's own folder.
import { readFileSync } from 'node:fs'

const FUNCTIONS = ['email-unsubscribe', 'notify-abandoned-signup', 'send-referral-emails', 'stripe-webhook']
const BEGIN = '// ---- BEGIN email helpers'
const END = '// ---- END email helpers'

const blocks = FUNCTIONS.map(name => {
  const path = `supabase/functions/${name}/index.ts`
  const src = readFileSync(path, 'utf8')
  const start = src.indexOf(BEGIN)
  const end = src.indexOf(END)
  if (start === -1 || end === -1 || end < start) {
    console.error(`${path}: email helpers block not found`)
    process.exit(1)
  }
  return { path, block: src.slice(start, end) }
})

const [reference, ...rest] = blocks
const differing = rest.filter(b => b.block !== reference.block)
if (differing.length) {
  console.error(`Email helpers block differs from ${reference.path} in:`)
  for (const b of differing) console.error(`  ${b.path}`)
  console.error('Make the same change in every copy.')
  process.exit(1)
}
console.log(`Email helpers block identical in ${blocks.length} functions.`)
