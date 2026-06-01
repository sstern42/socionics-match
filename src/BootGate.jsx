import { useAuth } from './lib/AuthContext'

// Paints immediately while the auth session is still resolving (session ===
// undefined). On slow cellular the Supabase round-trip that initialises auth
// can take several seconds; without this the whole app is white until it lands.
// We gate ONLY on session (the cheap auth-init step), not full `loading` —
// profile can finish loading behind the rendered app, and pages that need it
// already guard on their own loading state. So logged-out and homepage paints
// are not held back waiting for a profile fetch.
export default function BootGate({ children }) {
  const { session } = useAuth()

  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1.25rem',
        background: '#f7f4ef', color: '#1e1b16',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <span style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.02em',
          color: '#9a6f38',
        }}>
          Socion
        </span>
        <span aria-label="Loading" style={{
          width: 24, height: 24, borderRadius: '50%',
          border: '2px solid rgba(154,111,56,0.25)', borderTopColor: '#9a6f38',
          animation: 'bootSpin 0.8s linear infinite',
        }} />
        <style>{`@keyframes bootSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return children
}
