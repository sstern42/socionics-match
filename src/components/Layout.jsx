import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { supabase } from '../lib/supabase'
import { signOut } from '../lib/auth'
import { useUnreadCount, markMessagesRead } from '../lib/useUnreadCount'
import IOSInstallBanner from './IOSInstallBanner'
import AnnouncementBanner from './AnnouncementBanner'
import NotificationBell from './NotificationBell'
import { useNotifications } from '../hooks/useNotifications'
import { createNotification } from '../lib/notifications'
import { ENTRIES as CHANGELOG_ENTRIES } from '../pages/Changelog'
import { getRoomLastVisited } from '../pages/Rooms'

const TYPES = ['ILE','SEI','ESE','LII','EIE','LSI','SLE','IEI','SEE','ILI','LIE','ESI','LSE','EII','IEE','SLI']

const TYPE_QUADRA = {
  ILE: 'alpha', SEI: 'alpha', ESE: 'alpha', LII: 'alpha',
  SLE: 'beta',  IEI: 'beta',  EIE: 'beta',  LSI: 'beta',
  SEE: 'gamma', ILI: 'gamma', LIE: 'gamma', ESI: 'gamma',
  LSE: 'delta', EII: 'delta', IEE: 'delta', SLI: 'delta',
}
const QUADRA_COLOURS = {
  alpha: '#2E8FBE',
  beta:  '#BA7517',
  gamma: '#0F6E56',
  delta: '#185FA5',
}
const DUAL_MAP = {
  ILE: 'SEI', SEI: 'ILE', ESE: 'LII', LII: 'ESE',
  EIE: 'LSI', LSI: 'EIE', SLE: 'IEI', IEI: 'SLE',
  SEE: 'ILI', ILI: 'SEE', LIE: 'ESI', ESI: 'LIE',
  LSE: 'EII', EII: 'LSE', IEE: 'SLI', SLI: 'IEE',
}

const UPDATES_LAST_VISITED_KEY = 'socion_updates_last_visited'

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

// ── Shared nav icon SVGs ──────────────────────────────────────────────
const IconBookmark = ({ filled }) => filled ? (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M4 2h8a1 1 0 0 1 1 1v11l-5-3-5 3V3a1 1 0 0 1 1-1z"/>
  </svg>
) : (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4 2h8a1 1 0 0 1 1 1v11l-5-3-5 3V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
)

const IconUpdates = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="10" cy="12" r="1.75" fill="currentColor" stroke="none"/>
    <path d="M6.5 9.5a5 5 0 0 1 7 0"/>
    <path d="M4 7a8 8 0 0 1 12 0"/>
  </svg>
)

const IconNetwork = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="10" cy="10" r="2.5"/>
    <circle cx="3"  cy="4"  r="1.75"/>
    <circle cx="17" cy="4"  r="1.75"/>
    <circle cx="3"  cy="16" r="1.75"/>
    <circle cx="17" cy="16" r="1.75"/>
    <line x1="5.25"  y1="5.25"  x2="7.75"  y2="7.75"/>
    <line x1="14.75" y1="5.25"  x2="12.25" y2="7.75"/>
    <line x1="5.25"  y1="14.75" x2="7.75"  y2="12.25"/>
    <line x1="14.75" y1="14.75" x2="12.25" y2="12.25"/>
  </svg>
)

const IconStats = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" y1="18" x2="18" y2="18"/>
    <rect x="3" y="11" width="3" height="7" rx="0.5"/>
    <rect x="8.5" y="6" width="3" height="12" rx="0.5"/>
    <rect x="14" y="2" width="3" height="16" rx="0.5"/>
  </svg>
)

const IconHelp = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="10" cy="10" r="8"/>
    <path d="M7.5 7.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/>
    <circle cx="10" cy="15" r="0.75" fill="currentColor" stroke="none"/>
  </svg>
)

const IconBot = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="14" height="10" rx="2"/>
    <path d="M7 11h.01M13 11h.01"/>
    <path d="M8 14.5h4"/>
    <path d="M10 7V4"/>
    <circle cx="10" cy="3" r="1"/>
  </svg>
)

const Divider = () => (
  <span style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} aria-hidden="true" />
)

const GPT_URL = 'https://chatgpt.com/g/g-Vy0WioxfC-socionics-world'

export default function Layout({ children, hideFooter = false, noScroll = false }) {
  const { session, profile, isPremium } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const unread = useUnreadCount(profile?.id)
  const [roomUnread, setRoomUnread] = useState(() => !getRoomLastVisited())
  const [updatesUnread, setUpdatesUnread] = useState(false)
  const [toasts, setToasts] = useState([])
  const { notifications, unreadCount: notifUnreadCount, loading: notifLoading, markOneRead, markAllRead } = useNotifications(profile?.id)

  // ── Room unread ───────────────────────────────────────────────────────────
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
        if (payload.new?.sender_id !== profile.id) {
          if (window.location.pathname !== '/rooms') {
            setRoomUnread(true)
            const quadra = TYPE_QUADRA[profile.type] ?? 'alpha'
            const colour = QUADRA_COLOURS[quadra] ?? '#9a6f38'
            const label = quadra.charAt(0).toUpperCase() + quadra.slice(1)
            pushToastRef.current({
              id: nextToastId(),
              kind: 'room',
              colour,
              label,
            })
          }
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

  // ── Updates unread ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    const lastVisited = localStorage.getItem(UPDATES_LAST_VISITED_KEY)
    let query = supabase.from('founder_posts').select('id', { count: 'exact', head: true })
    if (lastVisited) query = query.gt('created_at', lastVisited)
    query.then(({ count }) => { if (count > 0) setUpdatesUnread(true) })
  }, [session])

  useEffect(() => {
    function handleUpdatesVisited() { setUpdatesUnread(false) }
    window.addEventListener('socion-updates-visited', handleUpdatesVisited)
    return () => window.removeEventListener('socion-updates-visited', handleUpdatesVisited)
  }, [])

  // ── Misc ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Socion` : 'Socion'
    return () => { document.title = 'Socion' }
  }, [unread])

  useEffect(() => {
    setMenuOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  async function handleSignOut() {
    navigate('/', { replace: true })
    await signOut()
  }

  function closeMenu() { setMenuOpen(false); setProfileOpen(false) }

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const pushToastRef  = useRef(null)
  const profileIdRef  = useRef(profile?.id)
  const toastIdRef    = useRef(0)
  const nextToastId   = () => `t-${++toastIdRef.current}`

  function pushToast(toast) {
    if (toast.kind === 'message') {
      setToasts(prev => {
        const existing = prev.find(t => t.kind === 'message' && t.matchId === toast.matchId)
        if (existing) {
          return prev.map(t =>
            t.id === existing.id
              ? { ...t, preview: toast.preview, count: (t.count ?? 1) + 1 }
              : t
          )
        }
        return [...prev.slice(-3), { ...toast, count: 1 }]
      })
      return
    }
    if (toast.kind === 'founder_post') {
      setToasts(prev => {
        if (prev.some(t => t.id === toast.id)) return prev
        return [...prev.slice(-3), toast]
      })
      return
    }
    setToasts(prev => [...prev.slice(-3), toast])
  }

  pushToastRef.current = pushToast
  profileIdRef.current = profile?.id

  // Join toast
  useEffect(() => {
    if (!session) return
    const channel = supabase
      .channel('join-toasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (payload) => {
        const record = payload.new
        if (!record?.type) return
        if (profileIdRef.current && record.id === profileIdRef.current) return
        const isAnon = record.profile_data?.anonymous === true
        const name   = isAnon ? null : (record.profile_data?.name ?? null)
        const quadra = TYPE_QUADRA[record.type]
        const colour = quadra ? QUADRA_COLOURS[quadra] : '#9a6f38'
        const isDual = profile?.type && DUAL_MAP[profile.type] === record.type
        const toastId = nextToastId()
        pushToastRef.current({ id: toastId, kind: isDual ? 'dual' : 'join', type: record.type, name, colour })
        window.dispatchEvent(new CustomEvent('socion-new-member'))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session, profile?.id, profile?.type])

  // Message toast
  useEffect(() => {
    if (!session || !profile?.id) return
    const channel = supabase
      .channel('message-toasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new
        if (msg.sender_id === profileIdRef.current) return
        const onMessages = window.location.pathname === '/messages'
        const activeMatch = new URLSearchParams(window.location.search).get('match')
        if (onMessages && activeMatch === msg.match_id) return
        const { data: sender } = await supabase
          .from('users').select('type, profile_data').eq('id', msg.sender_id).maybeSingle()
        const isAnon = sender?.profile_data?.anonymous === true
        const name   = isAnon ? null : (sender?.profile_data?.name ?? null)
        const type   = sender?.type
        const quadra = TYPE_QUADRA[type]
        const colour = quadra ? QUADRA_COLOURS[quadra] : '#9a6f38'
        const preview = msg.content?.length > 45 ? msg.content.slice(0, 45) + '…' : msg.content
        pushToastRef.current({ id: nextToastId(), kind: 'message', name, type, colour, preview, matchId: msg.match_id })
        createNotification({
          userId: profileIdRef.current,
          type: 'new_message',
          title: name ? `Message from ${name}` : 'New message',
          body: preview,
          actionUrl: `/messages?match=${msg.match_id}`,
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session, profile?.id])

  // Connection toast
  useEffect(() => {
    if (!session || !profile?.id) return
    const channel = supabase
      .channel('connection-toasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, async (payload) => {
        const match = payload.new
        const otherId = match.user_a_id === profile.id ? match.user_b_id : match.user_a_id
        if (!otherId || otherId === profile.id) return
        const { data: other } = await supabase
          .from('users').select('type, profile_data').eq('id', otherId).maybeSingle()
        const isAnon = other?.profile_data?.anonymous === true
        const name   = isAnon ? null : (other?.profile_data?.name ?? null)
        const type   = other?.type
        const quadra = TYPE_QUADRA[type]
        const colour = quadra ? QUADRA_COLOURS[quadra] : '#9a6f38'
        pushToastRef.current({ id: nextToastId(), kind: 'connection', name, type, colour, matchId: match.id })
        createNotification({
          userId: profileIdRef.current,
          type: 'new_connection',
          title: name ? `${name} connected with you` : 'New connection',
          body: type ?? null,
          actionUrl: `/messages?match=${match.id}`,
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session, profile?.id])

  // Founder post toast + updates unread
  useEffect(() => {
    if (!session || !profile?.id) return
    const channel = supabase
      .channel('founder-posts-toast')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'founder_posts' }, (payload) => {
        setUpdatesUnread(true)
        if (window.location.pathname !== '/updates') {
          const preview = payload.new.content?.length > 60
            ? payload.new.content.slice(0, 60) + '…'
            : payload.new.content
          pushToastRef.current({
            id: nextToastId(),
            kind: 'founder_post',
            preview,
            colour: '#9a6f38',
          })
          createNotification({
            userId: profileIdRef.current,
            type: 'founder_post',
            title: 'New update from Spencer',
            body: preview,
            actionUrl: '/updates',
          })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session, profile?.id])

  const isActive = (to) => location.pathname === to
  const hasNewChangelog = localStorage.getItem('socion_changelog_seen') !== CHANGELOG_ENTRIES[0].date

  return (
    <>
      <div className="type-grid" aria-hidden="true">
        {TYPES.map(t => <span key={t}>{t}</span>)}
      </div>
      <div className="page" style={noScroll ? { height: '100dvh', overflow: 'clip', display: 'flex', flexDirection: 'column' } : undefined}>
        <header className="site-header" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg)' }}>
          <Link className="wordmark" to="/" onClick={closeMenu}>
            Socion™{' '}
            {isPremium ? (
              <span style={{
                fontSize: '0.5em', fontFamily: 'var(--serif)', fontWeight: 400,
                fontStyle: 'italic', letterSpacing: '0.04em',
                color: 'var(--accent)', verticalAlign: 'middle',
              }}>Premium</span>
            ) : null}
          </Link>

          {session && profile && (
            <div className="nav-burger-bell">
              <NotificationBell notifications={notifications} unreadCount={notifUnreadCount} loading={notifLoading} markOneRead={markOneRead} markAllRead={markAllRead} />
            </div>
          )}

          {/* ── Desktop nav ──────────────────────────────────────────────── */}
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }} className="nav-desktop">
            {session && profile ? (
              <>
                {/* Group 1: Discovery */}
                <Link to="/feed" style={navStyle(isActive('/feed'))}>Matches</Link>
                <Link
                  to="/saved"
                  title="Saved profiles"
                  aria-label="Saved profiles"
                  style={{ ...navStyle(isActive('/saved')), display: 'inline-flex', alignItems: 'center' }}
                >
                  <IconBookmark filled={isActive('/saved')} />
                </Link>

                <Divider />

                {/* Group 2: Social */}
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

                <Divider />

                {/* Group 3: Personal */}
                <Link to={`/profile/${profile.id}`} style={navStyle(isActive(`/profile/${profile.id}`))}>Profile</Link>

                <Divider />

                {/* Group 4: Services */}
                <Link to="/typing" style={navStyle(isActive('/typing'))}>Get typed</Link>
                {profile?.profile_data?.role === 'founder' && (
                  <Link to="/admin" style={navStyle(isActive('/admin'))}>Admin</Link>
                )}
                <button onClick={handleSignOut} style={signOutStyle}>Sign out</button>

                <Divider />

                {/* Icon group: utility */}
                <NotificationBell notifications={notifications} unreadCount={notifUnreadCount} loading={notifLoading} markOneRead={markOneRead} markAllRead={markAllRead} />

                <Link to="/updates" title="Founder updates" aria-label="Founder updates"
                  style={{ ...navStyle(isActive('/updates')), display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                  <IconUpdates />
                  {updatesUnread && !isActive('/updates') && (
                    <span style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'block', flexShrink: 0 }} />
                  )}
                </Link>
                <Link to="/network" title="Network" aria-label="Network"
                  style={{ ...navStyle(isActive('/network')), display: 'inline-flex', alignItems: 'center' }}>
                  <IconNetwork />
                </Link>
                <Link to="/stats" title="Stats" aria-label="Stats"
                  style={{ ...navStyle(isActive('/stats')), display: 'inline-flex', alignItems: 'center' }}>
                  <IconStats />
                </Link>
                <Link to="/help" title="Help & FAQ" aria-label="Help & FAQ"
                  style={{ ...navStyle(isActive('/help')), display: 'inline-flex', alignItems: 'center' }}>
                  <IconHelp />
                </Link>
                <a href={GPT_URL} target="_blank" rel="noopener noreferrer"
                  title="Socionics World AI" aria-label="Socionics World AI"
                  data-umami-event="gpt-click" data-umami-event-source="nav-desktop"
                  style={{ ...navStyle(false), display: 'inline-flex', alignItems: 'center' }}>
                  <IconBot />
                </a>
              </>
            ) : (
              <>
                <Link to="/auth" style={navStyle(false)}>Sign in</Link>
                <Link to="/typing" style={navStyle(isActive('/typing'))}>Get typed</Link>
                <Link to="/about" style={navStyle(isActive('/about'))}>About</Link>

                <Divider />

                <Link to="/network" title="Network" aria-label="Network"
                  style={{ ...navStyle(isActive('/network')), display: 'inline-flex', alignItems: 'center' }}>
                  <IconNetwork />
                </Link>
                <Link to="/stats" title="Stats" aria-label="Stats"
                  style={{ ...navStyle(isActive('/stats')), display: 'inline-flex', alignItems: 'center' }}>
                  <IconStats />
                </Link>
                <Link to="/help" title="Help & FAQ" aria-label="Help & FAQ"
                  style={{ ...navStyle(isActive('/help')), display: 'inline-flex', alignItems: 'center' }}>
                  <IconHelp />
                </Link>
                <a href={GPT_URL} target="_blank" rel="noopener noreferrer"
                  title="Socionics World AI" aria-label="Socionics World AI"
                  data-umami-event="gpt-click" data-umami-event-source="nav-desktop"
                  style={{ ...navStyle(false), display: 'inline-flex', alignItems: 'center' }}>
                  <IconBot />
                </a>
              </>
            )}
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
                {/* ── Discovery ───────────────────────────────────────── */}
                <Link to="/feed" onClick={closeMenu} style={mobileNavStyle(isActive('/feed'))}>
                  Matches
                </Link>
                <Link to="/saved" onClick={closeMenu} style={{ ...mobileNavStyle(isActive('/saved')), display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IconBookmark filled={isActive('/saved')} />
                  Saved
                </Link>

                {/* ── Social ──────────────────────────────────────────── */}
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

                {/* ── Services ─────────────────────────────────────────── */}
                <Link to="/typing" onClick={closeMenu} style={mobileNavStyle(isActive('/typing'))}>Get typed</Link>
                {profile?.profile_data?.role === 'founder' && (
                  <Link to="/admin" onClick={closeMenu} style={mobileNavStyle(isActive('/admin'))}>Admin</Link>
                )}

                {/* ── Footer links ─────────────────────────────────────── */}
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
                    <Link
                      to="/updates"
                      onClick={closeMenu}
                      style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      Updates
                      {updatesUnread && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
                      )}
                    </Link>
                    <Link to="/network" onClick={closeMenu} style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0' }}>
                      Network
                    </Link>
                    <Link to="/stats" onClick={closeMenu} style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0' }}>
                      Stats
                    </Link>
                    <Link to="/support" onClick={closeMenu} style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0' }}>
                      Support ☕
                    </Link>
                    <Link to="/help" onClick={closeMenu} style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0' }}>
                      Help
                    </Link>
                    <a href="https://discord.gg/328KxsDKdr" target="_blank" rel="noopener noreferrer" onClick={closeMenu}
                      data-umami-event="discord-click" data-umami-event-source="nav-mobile"
                      style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0' }}>
                      Discord
                    </a>
                    <a href={GPT_URL} target="_blank" rel="noopener noreferrer" onClick={closeMenu}
                      data-umami-event="gpt-click" data-umami-event-source="nav-mobile"
                      style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <IconBot /> AI
                    </a>
                    <Link to="/about" onClick={closeMenu} style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', padding: '0.4rem 0' }}>About</Link>
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
                <Link to="/typing" onClick={closeMenu} style={mobileNavStyle(isActive('/typing'))}>Get typed</Link>
                <Link to="/about" onClick={closeMenu} style={mobileNavStyle(isActive('/about'))}>About</Link>
                <Link to="/network" onClick={closeMenu} style={mobileNavStyle(isActive('/network'))}>Network</Link>
                <Link to="/stats" onClick={closeMenu} style={mobileNavStyle(isActive('/stats'))}>Stats</Link>
                <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>Theme</span>
                  <ThemeToggle />
                </div>
              </>
            )}
          </nav>
        )}

        <IOSInstallBanner />
        <AnnouncementBanner />

        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: noScroll ? 'auto' : undefined }}>
          {children}
        </main>

        <footer className={`site-footer${hideFooter ? ' footer-desktop-only' : ''}`}>
          <div>
            <p>&copy; {new Date().getFullYear()} <a href="https://socion.app" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Socion.app</a>. All rights reserved. Created by <a href="https://spencerstern.com" target="_blank" rel="noopener noreferrer" data-umami-event="spencerstern-click" data-umami-event-source="footer" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Spencer Stern ↗</a></p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="https://socionicsinsight.com" target="_blank" rel="noopener noreferrer" data-umami-event="si-click" data-umami-event-source="footer" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>socionicsinsight.com ↗</a>
            <a href="https://github.com/sstern42/socionics-match" target="_blank" rel="noopener noreferrer" data-umami-event="github-click" data-umami-event-source="footer" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>Open source ↗</a>
            <a href="https://discord.gg/328KxsDKdr" target="_blank" rel="noopener noreferrer" data-umami-event="discord-click" data-umami-event-source="footer" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>Discord ↗</a>
            <a href={GPT_URL} target="_blank" rel="noopener noreferrer"
              data-umami-event="gpt-click" data-umami-event-source="footer"
              style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <IconBot /> AI ↗
            </a>
            <Link to="/support" style={{ fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none', border: '1px solid var(--accent)', borderRadius: 3, padding: '0.2rem 0.6rem' }}>Support Socion ☕</Link>
            <Link to="/premium" style={{ fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none', border: '1px solid var(--accent)', borderRadius: 3, padding: '0.2rem 0.6rem' }}>Premium ✦</Link>
            <Link to="/stats" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>Stats</Link>
            <Link to="/about" style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'none' }}>About</Link>
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

      {/* Live toasts */}
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      {toasts.map((toast, i) => {
        const TOAST_H = 68
        const bottomPx = 160 + i * TOAST_H

        const isClickable = toast.kind === 'message' || toast.kind === 'connection' || toast.kind === 'room' || toast.kind === 'founder_post'
        const onClick = isClickable ? () => {
          setToasts(prev => prev.filter(t => t.id !== toast.id))
          if (toast.kind === 'founder_post') navigate('/updates')
          else if (toast.kind === 'room') navigate('/rooms')
          else if (toast.matchId) navigate(`/messages?match=${toast.matchId}`)
        } : undefined

        const heading = (() => {
          if (toast.kind === 'message')      return 'new dm received'
          if (toast.kind === 'room')         return 'new room message'
          if (toast.kind === 'connection')   return 'new connection'
          if (toast.kind === 'dual')         return 'your dual just joined ✦'
          if (toast.kind === 'join')         return 'new member'
          if (toast.kind === 'founder_post') return 'new from spencer'
          return ''
        })()

        const body = (() => {
          if (toast.kind === 'message') {
            const countBadge = (toast.count ?? 1) > 1 ? ` +${(toast.count ?? 1) - 1}` : ''
            return (toast.name ? `${toast.name}: ${toast.preview}` : toast.preview) + countBadge
          }
          if (toast.kind === 'room')         return `${toast.label} quadra`
          if (toast.kind === 'connection')   return toast.name ?? 'someone'
          if (toast.kind === 'dual')         return toast.name ?? null
          if (toast.kind === 'join')         return toast.name ?? null
          if (toast.kind === 'founder_post') return toast.preview ?? null
          return null
        })()

        return (
          <div
            key={toast.id}
            onClick={onClick}
            style={{
              position: 'fixed',
              bottom: bottomPx,
              left: '2rem',
              zIndex: 300,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${toast.colour}`,
              borderRadius: 6,
              padding: '0.6rem 0.85rem 0.6rem 0.75rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'flex-start', gap: '0.55rem',
              animation: 'toast-in 0.2s ease',
              width: 240,
              cursor: isClickable ? 'pointer' : 'default',
            }}
          >
            {toast.type && (
              <span style={{
                fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                fontWeight: 600, color: toast.colour,
                background: `${toast.colour}18`,
                border: `1px solid ${toast.colour}55`,
                padding: '0.12rem 0.38rem', borderRadius: 2, flexShrink: 0,
                marginTop: '0.1rem',
              }}>
                {toast.type}
              </span>
            )}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <span style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, color: toast.colour, lineHeight: 1 }}>
                {heading}
              </span>
              {body && (
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {body}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setToasts(prev => prev.filter(t => t.id !== toast.id)) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.85rem', padding: 0, flexShrink: 0, lineHeight: 1, opacity: 0.6, marginTop: '0.05rem' }}
              aria-label="Dismiss"
            >×</button>
          </div>
        )
      })}
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
