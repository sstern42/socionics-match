import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { supabase } from '../lib/supabase'
import { signOut } from '../lib/auth'
import { useUnreadCount, markMessagesRead } from '../lib/useUnreadCount'
import IOSInstallBanner from './IOSInstallBanner'
import { ENTRIES as CHANGELOG_ENTRIES } from '../pages/Changelog'
import { getRoomLastVisited } from '../pages/Rooms'

const TYPES = ['ILE','SEI','ESE','LII','EIE','LSI','SLE','IEI','SEE','ILI','LIE','ESI','LSE','EII','SLI','IEE']

// ── Three-way theme toggle ────────────────────────────────────────────
function ThemeToggle() {
  const { preference, setTheme } = useTheme()
  const opts = [
    { value: 'system', icon: '⬡', label: 'System' },
    { value: 'light',  icon: '☀',  label: 'Light' },
    { value: 'dark',   icon: '☽',  label: 'Dark' },
  ]
  return (
    <div className="theme-toggle" title="Colour theme" aria-label="Colour theme">
      {opts.map(o => (
        <button
          key={o.value}
          type="button"
          className={`theme-toggle-option${preference === o.value ? ' active' : ''}`}
          onClick={() => setTheme(o.value)}
          title={o.label}
          aria-label={o.label}
        >
          {o.icon}
        </button>
      ))}
    </div>
  )
}

export default function Layout({ children, hideFooter = false, noScroll = false }) {
  const { session, profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const unread = useUnreadCount(profile?.id)
  const [roomUnread, setRoomUnread] = useState(() => !getRoomLastVisited())

  useEffect(() => {
    if (!profile?.room_id) return
    const lastVisited = getRoomLastVisited()
    if (!lastVisited) { setRoomUnread(true); return }
    supabase
      .from('room_messages')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', profile.room_id)
      .neq('sender_id', profile.id)
      .is('deleted_at', null)
      .gt('created_at', lastVisited)
      .then(({ count }) => { if (count > 0) setRoomUnread(true) })
  }, [profile?.room_id])

  useEffect(() => {
    if (!profile?.room_id || !profile?.id) return
    const channel = supabase
      .channel(`room-unread:${profile.room_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_messages',
        filter: `room_id=eq.${profile.room_id}`,
      }, payload => {
        if (payload.new?.sender_id !== profile.id && window.location.pathname !== '/rooms') {
          setRoomUnread(true)
        }
      })
      .subscribe()
    return () => channel.unsubscribe()
  }, [profile?.room_id, profile?.id])

  useEffect(() => {
    function handleRoomVisited() { setRoomUnread(false) }
    window.addEventListener('socion-room-visited', handleRoomVisited)
    return () => window.removeEventListener('socion-room-visited', handleRoomVisited)
  }, [])

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Socion` : 'Socion'
    return () => { document.title = 'Socion' }
  }, [unread])

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  async function handleSignOut() {
    navigate('/', { replace: true })
    await signOut()
  }

  function closeMenu() { setMenuOpen(false); setProfileOpen(false) }

  const isActive = (to) => location.pathname === to
  const hasNewChangelog = localStorage.getItem('socion_changelog_seen') !== CHANGELOG_ENTRIES[0].date

  return (
    <>
      <div className="type-grid" aria-hidden="true">
        {TYPES.map(t => <span key={t}>{t}</span>)}
      </div>
      <div className="page" style={noScroll ? { height: '100dvh', overflow: 'clip', display: 'flex', flexDirection: 'column' } : undefined}>
        <header className="site-header" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg)' }}>
          <Link className="wordmark" to="/" onClick={closeMenu}>Socion™ <span style={{ fontSize: '0.55em', fontFamily: 'var(--sans)', fontWeight: 500, letterSpacing: '0.08em', color: 'var(--muted)', verticalAlign: 'middle', textTransform: 'uppercase' }}>Beta</span></Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }} className="nav-desktop">
            {session && profile ? (
              <>
                <Link to="/feed" style={navStyle(isActive('/feed'))}>Matches</Link>
                <Link to="/messages" onClick={markMessagesRead} style={navStyle(isActive('/messages'))}>
                  Messages{unread > 0 && (
                    <span style={{ marginLeft: '0.4rem', background: 'var(--accent)', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem', verticalAlign: 'middle', lineHeight: 1.4 }}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </Link>
                <Link to="/rooms" style={{ ...navStyle(isActive('/rooms')), display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  Rooms
                  {roomUnread && !isActive('/rooms') && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'inline-block' }} />
                  )}
                </Link>
                <Link to={`/profile/${profile.id}`} style={navStyle(isActive(`/profile/${profile.id}`))}>Profile</Link>
                <Link to="/typing" style={navStyle(isActive('/typing'))}>Get typed</Link>
                {profile?.profile_data?.role === 'founder' && (
                  <Link to="/admin" style={navStyle(isActive('/admin'))}>Admin</Link>
                )}
                <button onClick={handleSignOut} style={signOutStyle}>Sign out</button>
              </>
            ) : (
              <Link to="/auth" style={navStyle(false)}>Sign in</Link>
            )}
            <Link to="/network" style={{ ...navStyle(isActive('/network')), fontSize: '0.72rem', letterSpacing: '0.06em' }}>Network</Link>
            <ThemeToggle />
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

        {/* ── Mobile dropdown menu ─────────────────────────────────────────── */}
        {menuOpen && (
          <nav style={{
            position: 'absolute', top: 72, left: 0, right: 0, zIndex: 100,
            background: 'var(--bg)', borderBottom: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column',
          }} className="nav-mobile-open">

            {session && profile ? (
              <>
                {/* ── Primary nav ─────────────────────────────────────── */}
                <Link to="/feed" onClick={closeMenu} style={mobileNavStyle(isActive('/feed'))}>
                  Matches
                </Link>

                <Link to="/messages" onClick={() => { closeMenu(); markMessagesRead() }} style={mobileNavStyle(isActive('/messages'))}>
                  Messages
                  {unread > 0 && (
                    <span style={{ marginLeft: '0.4rem', background: 'var(--accent)', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.45rem', verticalAlign: 'middle', lineHeight: 1.4 }}>
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </Link>

                <Link to="/rooms" onClick={closeMenu} style={{ ...mobileNavStyle(isActive('/rooms')), display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Rooms
                  {roomUnread && !isActive('/rooms') && (
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
                  )}
                </Link>

                {/* ── Profile submenu ──────────────────────────────────── */}
                <button
                  type="button"
                  onClick={() => setProfileOpen(o => !o)}
                  style={{
                    ...mobileNavStyle(isActive(`/profile/${profile.id}`) || isActive('/profile/edit') || isActive('/settings')),
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                  }}
                >
                  <span>Profile</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted)', transition: 'transform 0.15s', display: 'inline-block', transform: profileOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                </button>

                {profileOpen && (
                  <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    {profile?.id && (
                      <Link to={`/profile/${profile.id}`} onClick={closeMenu} style={{ ...mobileSubNavStyle(isActive(`/profile/${profile.id}`)), color: 'var(--accent)', fontWeight: 500 }}>
                        View profile
                      </Link>
                    )}
                    <Link to="/profile/edit" onClick={closeMenu} style={mobileSubNavStyle(isActive('/profile/edit'))}>
                      Edit details
                    </Link>
                    <Link to="/profile/dynamics" onClick={closeMenu} style={mobileSubNavStyle(isActive('/profile/dynamics'))}>
                      Dynamics
                    </Link>
                    <Link to="/profile/notifications" onClick={closeMenu} style={mobileSubNavStyle(isActive('/profile/notifications'))}>
                      Notifications
                    </Link>
                    <Link to="/settings" onClick={closeMenu} style={mobileSubNavStyle(isActive('/settings'))}>
                      Settings
                    </Link>
                  </div>
                )}

                {/* ── Secondary nav ────────────────────────────────────── */}
                <Link to="/typing" onClick={closeMenu} style={mobileNavStyle(isActive('/typing'))}>Get typed</Link>
                <Link to="/network" onClick={closeMenu} style={mobileNavStyle(isActive('/network'))}>Network</Link>
                {profile?.profile_data?.role === 'founder' && (
                  <Link to="/admin" onClick={closeMenu} style={mobileNavStyle(isActive('/admin'))}>Admin</Link>
                )}

                {/* ── Footer links section ─────────────────────────────── */}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', padding: '0.75rem 1.5rem', gap: '0 1.5rem' }}>
                    <Link
                      to="/premium"
                      onClick={closeMenu}
                      style={{ fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none', padding: '0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      Premium ✦
                    </Link>
                    <Link
                      to="/changelog"
                      onClick={() => { closeMenu(); localStorage.setItem('socion_changelog_seen', CHANGELOG_ENTRIES[0].date) }}
                      style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0', position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      What's new
                      {hasNewChangelog && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
                      )}
                    </Link>
                    <Link to="/support" onClick={closeMenu} style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0' }}>
                      Support ☕
                    </Link>
                    <Link to="/help" onClick={closeMenu} style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0' }}>
                      Help
                    </Link>
                    <a href="https://discord.gg/328KxsDKdr" target="_blank" rel="noopener noreferrer" onClick={closeMenu} style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0' }}>
                      Discord
                    </a>
                    <Link to="/privacy" onClick={closeMenu} style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0' }}>Privacy</Link>
                    <Link to="/terms" onClick={closeMenu} style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0' }}>Terms</Link>
                  </div>
                </div>

                {/* ── Theme + Sign out ─────────────────────────────────── */}
                <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>Theme</span>
                  <ThemeToggle />
                </div>

                <button
                  onClick={() => { closeMenu(); handleSignOut() }}
                  style={{
                    ...mobileNavStyle(false),
                    textAlign: 'left', background: 'none', border: 'none',
                    cursor: 'pointer', width: '100%',
                    color: 'var(--muted)', borderTop: '1px solid var(--border)',
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" onClick={closeMenu} style={mobileNavStyle(false)}>Sign in</Link>
                <Link to="/network" onClick={closeMenu} style={mobileNavStyle(isActive('/network'))}>Network</Link>
                <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>Theme</span>
                  <ThemeToggle />
                </div>
              </>
            )}
          </nav>
        )}

        <IOSInstallBanner />

        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: noScroll ? 'auto' : undefined }}>
          {children}
        </main>

        {/* Help button */}
        <Link
          to="/help"
          onClick={() => window.umami?.track('help-button-clicked', { from: location.pathname })}
          title="Help & FAQ"
          style={{
            position: 'fixed', bottom: '5rem', right: '1.25rem', zIndex: 200,
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', fontSize: '1rem', fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            lineHeight: 1,
          }}
          aria-label="Help & FAQ"
        >
          ?
        </Link>

        <footer className={`site-footer${hideFooter ? ' footer-desktop-only' : ''}`}>
          <div>
            <p>&copy; {new Date().getFullYear()} <a href="https://socion.app" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Socion.app</a>. All rights reserved. Created by <a href="https://spencerstern.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Spencer Stern</a></p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="https://socionicsinsight.com">Socionics reference &rarr;</a>
            <a href="https://github.com/sstern42/socionics-match" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>GitHub</a>
            <a href="https://discord.gg/328KxsDKdr" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>Discord</a>
            <Link to="/support" style={{ fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none', border: '1px solid var(--accent)', borderRadius: 3, padding: '0.2rem 0.6rem' }}>Support Socion ☕</Link>
            <Link to="/premium" style={{ fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none', border: '1px solid var(--accent)', borderRadius: 3, padding: '0.2rem 0.6rem' }}>Premium ✦</Link>
            <Link to="/privacy" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>Privacy</Link>
            <Link to="/terms" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>Terms</Link>
            <Link to="/changelog" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', position: 'relative' }}
              onClick={() => localStorage.setItem('socion_changelog_seen', CHANGELOG_ENTRIES[0].date)}
            >
              What's new
              {localStorage.getItem('socion_changelog_seen') !== CHANGELOG_ENTRIES[0].date && (
                <span style={{ position: 'absolute', top: -3, right: -7, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              )}
            </Link>
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
  color: active ? 'var(--accent)' : 'var(--text)',
  textDecoration: 'none',
  borderBottom: '1px solid var(--border)',
})

const mobileSubNavStyle = (active) => ({
  display: 'block',
  padding: '0.7rem 1.5rem 0.7rem 2.25rem',
  fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase',
  color: active ? 'var(--accent)' : 'var(--muted)',
  textDecoration: 'none',
  borderBottom: '1px solid var(--border)',
})
