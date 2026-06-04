import { useAuth } from './lib/AuthContext'

export default function BootGate({ children }) {
  const { session } = useAuth()

  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1.25rem',
        background: 'var(--bg)', color: 'var(--text)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <span style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.02em',
          color: 'var(--accent)',
        }}>
          Socion
        </span>
        <span aria-label="Loading" style={{
          width: 24, height: 24, borderRadius: '50%',
          border: '2px solid rgba(154,111,56,0.25)', borderTopColor: 'var(--accent)',
          animation: 'bootSpin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  return children
}
