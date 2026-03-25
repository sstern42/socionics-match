import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { signOut } from '../lib/auth'

const TYPES = ['ILE','SEI','ESE','LII','EIE','LSI','SLE','IEI','SEE','ILI','LIE','ESI','LSE','EII','SLI','IEE']

export default function Layout({ children }) {
  const { session, profile } = useAuth()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    window.location.href = '/'
  }

  const navLink = (to, label) => (
    <Link
      to={to}
      style={{
        fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase',
        color: location.pathname === to ? 'var(--accent)' : 'var(--muted)',
        textDecoration: 'none', transition: 'color 0.2s',
      }}
    >
      {label}
    </Link>
  )

  return (
    <>
      <div className="type-grid" aria-hidden="true">
        {TYPES.map(t => <span key={t}>{t}</span>)}
      </div>
      <div className="page">
        <header className="site-header">
          <Link className="wordmark" to="/">Socion</Link>
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {session && profile ? (
              <>
                {navLink('/feed', 'Matches')}
                {navLink('/messages', 'Messages')}
                {navLink('/profile/edit', 'Profile')}
                <button
                  onClick={handleSignOut}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', transition: 'color 0.2s' }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/auth" style={{ fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', textDecoration: 'none' }}>
                Sign in
              </Link>
            )}
          </nav>
        </header>

        <main style={{ flex: 1 }}>
          {children}
        </main>

        <footer className="site-footer">
          <p>&copy; {new Date().getFullYear()} Spencer Stern</p>
          <a href="https://socionicsinsight.com">Socionics reference &rarr;</a>
        </footer>
      </div>
    </>
  )
}
