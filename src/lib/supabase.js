import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail soft, not hard. A module-level `throw` here runs before React mounts
// (supabase is imported via AuthContext → App), so a missing/blocked env var
// would blank the whole page with no fallback. Log loudly instead and let the
// app boot; downstream calls will surface a recoverable error in the UI.
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '')
export { supabaseUrl, supabaseKey }
