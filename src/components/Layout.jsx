import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { signOut } from '../lib/auth'
import { useUnreadCount } from '../lib/useUnreadCount'
import IOSInstallBanner from './IOSInstallBanner'

const TYPES = ['ILE','SEI','ESE','LII','EIE','LSI','SLE','IEI','SEE','ILI','LIE','ESI','LSE','EII','SLI','IEE']

export default function Layout({ children, hideFooter = false, noScroll = false }) {
  const { session, profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const unread = useUnreadCount(profile?.id)

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Socion` : 'Socion'
    return () => { document.title = 'Socion' }
  }, [unread])

  async function handleSignOut() {
    navigate('/', { replace: true })
    await signOut()
  }

  function closeMenu() { setMenuOpen(false) }

  const isActive = (to) => location.pathname === to

  return (
    <>
      <div className="type-grid" aria-hidden="true">
        {TYPES.map(t => <span key={t}>{t}</span>)}
      </div>
      <div className="page" style={noScroll ? { height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } : undefined}>
        <header className="site-header">
          <Link className="wordmark" to="/" onClick={closeMenu}>Socion</Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }} className="nav-desktop">
            {session && profile ? (
              <>
                <Link to="/feed" style={navStyle(isActive('/feed'))}>Matches</Link>
                <Link to="/messages" style={navStyle(isActive('/messages'))}>
                  Messages{unread > 0 && (
                    <span style={{ marginLeft: '0.4rem', background: 'var(--accent)', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem', verticalAlign: 'middle', lineHeight: 1.4 }}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </Link>
                <Link to="/profile/edit" style={navStyle(isActive('/profile/edit'))}>Profile</Link>
                {profile?.profile_data?.role === 'founder' && (
                  <Link to="/admin" style={navStyle(isActive('/admin'))}>Admin</Link>
                )}
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
                <Link to="/messages" onClick={closeMenu} style={mobileNavStyle(isActive('/messages'))}>
                  Messages{unread > 0 && (
                    <span style={{ marginLeft: '0.4rem', background: 'var(--accent)', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem', verticalAlign: 'middle', lineHeight: 1.4 }}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </Link>
                <Link to="/profile/edit" onClick={closeMenu} style={mobileNavStyle(isActive('/profile/edit'))}>Profile</Link>
                {profile?.profile_data?.role === 'founder' && (
                  <Link to="/admin" onClick={closeMenu} style={mobileNavStyle(isActive('/admin'))}>Admin</Link>
                )}
                <button onClick={() => { closeMenu(); handleSignOut() }} style={{ ...mobileNavStyle(false), textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={closeMenu} style={mobileNavStyle(false)}>Sign in</Link>
            )}
          </nav>
        )}

        <IOSInstallBanner />

        <KofiWidget />

        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>

        {!hideFooter && (
        <footer className="site-footer">
          <div>
            <p>&copy; {new Date().getFullYear()} <a href="https://socion.app" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Socion.app</a>. All rights reserved.</p>
            <p style={{ marginTop: '0.2rem' }}>Created by <a href="https://spencerstern.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Spencer Stern</a></p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="https://socionicsinsight.com">Socionics reference &rarr;</a>
            <a href="https://github.com/sstern42/socionics-match" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>GitHub</a>
            <Link to="/privacy" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>Privacy</Link>
            <Link to="/terms" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>Terms</Link>
            <Link to="/changelog" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', position: 'relative' }}
              onClick={() => localStorage.setItem('socion_changelog_seen', '28 March 2026')}
            >
              What's new
              {localStorage.getItem('socion_changelog_seen') !== '28 March 2026' && (
                <span style={{ position: 'absolute', top: -3, right: -7, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              )}
            </Link>
          </div>
        </footer>
        )}
      </div>
    </>
  )
}

function KofiWidget() {
  useEffect(() => {
    if (document.getElementById('kofi-script')) return
    const script = document.createElement('script')
    script.id = 'kofi-script'
    script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js'
    script.onload = () => {
      window.kofiWidgetOverlay?.draw('socion', {
        'type': 'floating-chat',
        'floating-chat.donateButton.text': 'Support',
        'floating-chat.donateButton.background-color': '#9a6f38',
        'floating-chat.donateButton.text-color': '#ffffff',
      })
    }
    document.body.appendChild(script)
  }, [])
  return null
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
