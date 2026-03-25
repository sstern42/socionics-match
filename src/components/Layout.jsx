import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { signOut } from '../lib/auth'

const TYPES = ['ILE','SEI','ESE','LII','EIE','LSI','SLE','IEI','SEE','ILI','LIE','ESI','LSE','EII','SLI','IEE']

export default function Layout({ children }) {
  const { session, profile } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    window.location.href = '/'
  }

  function closeMenu() { setMenuOpen(false) }

  const isActive = (to) => location.pathname === to

  return (
    <>
      <div className="type-grid" aria-hidden="true">
        {TYPES.map(t => <span key={t}>{t}</span>)}
      </div>
      <div className="page">
        <header className="site-header">
          <Link className="wordmark" to="/" onClick={closeMenu}>Socion</Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }} className="nav-desktop">
            {session && profile ? (
              <>
                <Link to="/feed" style={navStyle(isActive('/feed'))}>Matches</Link>
                <Link to="/messages" style={navStyle(isActive('/messages'))}>Messages</Link>
                <Link to="/profile/edit" style={navStyle(isActive('/profile/edit'))}>Profile</Link>
                <button onClick={handleSignOut} style={signOutStyle}>Sign out</button>
              </>
            ) : (
              <Link to="/auth" style={navStyle(false)}>Sign in</Link>
            )}
          </nav>

          {/* Mobile burger */}
          <button
            className="nav-burger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Menu"
            style={{
              display: 'none',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0.25rem', color: 'var(--muted)',
            }}
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="17" y2="6"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="14" x2="17" y2="14"/>
              </svg>
            )}
          </button>
        </header>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <nav style={{
            position: 'absolute', top: 72, left: 0, right: 0, zIndex: 100,
            background: '#fff', borderBottom: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            padding: '0.5rem 0',
          }} className="nav-mobile-open">
            {session && profile ? (
              <>
                <Link to="/feed" onClick={closeMenu} style={mobileNavStyle(isActive('/feed'))}>Matches</Link>
                <Link to="/messages" onClick={closeMenu} style={mobileNavStyle(isActive('/messages'))}>Messages</Link>
                <Link to="/profile/edit" onClick={closeMenu} style={mobileNavStyle(isActive('/profile/edit'))}>Profile</Link>
                <button onClick={() => { closeMenu(); handleSignOut() }} style={{ ...mobileNavStyle(false), textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={closeMenu} style={mobileNavStyle(false)}>Sign in</Link>
            )}
          </nav>
        )}

        <main style={{ flex: 1 }}>
          {children}
        </main>

        <footer className="site-footer">
          <p>&copy; {new Date().getFullYear()} Spencer Stern</p>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <a href="https://socionicsinsight.com">Socionics reference &rarr;</a>
            <Link to="/privacy" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>Privacy</Link>
          </div>
        </footer>
      </div>
    </>
  )
}

const navStyle = (active) => ({
  fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase',
  color: active ? 'var(--accent)' : 'var(--muted)',
  textDecoration: 'none', transition: 'color 0.2s',
})

const signOutStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--muted)', transition: 'color 0.2s',
}

const mobileNavStyle = (active) => ({
  display: 'block',
  padding: '0.85rem 1.5rem',
  fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase',
  color: active ? 'var(--accent)' : 'var(--muted)',
  textDecoration: 'none',
  borderBottom: '1px solid var(--border)',
})
