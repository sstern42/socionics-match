import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications'

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Matches the quadra/toast colour palette used elsewhere in the app
const TYPE_META = {
  new_message:    { label: 'message',    colour: '#9a6f38' },
  new_connection: { label: 'connection', colour: '#4caf50' },
  founder_post:   { label: 'update',     colour: '#185FA5' },
}

// ── Sub-components ───────────────────────────────────────────────────────────

function BellIcon() {
  return (
    <svg
      width="17" height="17"
      viewBox="0 0 20 20"
      fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M10 2.5a5.5 5.5 0 0 1 5.5 5.5v3l1.5 2H3l1.5-2V8A5.5 5.5 0 0 1 10 2.5z"/>
      <path d="M8.5 16.5a1.5 1.5 0 0 0 3 0"/>
    </svg>
  )
}

function NotificationRow({ notif, onRowClick }) {
  const isUnread = !notif.read_at
  const meta = TYPE_META[notif.type] ?? { label: notif.type, colour: 'var(--accent)' }
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={() => onRowClick(notif)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
        width: '100%', textAlign: 'left',
        padding: '0.8rem 1rem',
        background: hovered
          ? 'var(--surface)'
          : isUnread ? `${meta.colour}09` : 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: notif.action_url ? 'pointer' : 'default',
        transition: 'background 0.12s',
      }}
    >
      {/* Unread indicator dot */}
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        marginTop: '0.4rem',
        background: isUnread ? meta.colour : 'transparent',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Type label + timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
          <span style={{
            fontSize: '0.6rem', letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 600,
            color: meta.colour,
          }}>
            {meta.label}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--muted)', marginLeft: 'auto', flexShrink: 0 }}>
            {timeAgo(notif.created_at)}
          </span>
        </div>

        {/* Title */}
        <p style={{
          fontSize: '0.82rem',
          color: 'var(--text)',
          fontWeight: isUnread ? 500 : 400,
          lineHeight: 1.4, margin: 0,
        }}>
          {notif.title}
        </p>

        {/* Body preview */}
        {notif.body && (
          <p style={{
            fontSize: '0.74rem', color: 'var(--muted)',
            lineHeight: 1.45, marginTop: '0.15rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {notif.body}
          </p>
        )}
      </div>
    </button>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * NotificationBell — drop-in nav icon with inline dropdown panel.
 *
 * Place in Layout.jsx desktop nav alongside IconUpdates / IconNetwork / IconHelp.
 * Receives `userId` (profile.id — internal users.id, not auth.uid()).
 */
export default function NotificationBell({ userId }) {
  const navigate   = useNavigate()
  const [open, setOpen] = useState(false)
  const panelRef   = useRef(null)
  const buttonRef  = useRef(null)

  const { notifications, unreadCount, loading, markOneRead, markAllRead } =
    useNotifications(userId)

  // Close on outside click
  useEffect(() => {
    function handleDown(e) {
      if (
        panelRef.current  && !panelRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleDown)
    return () => document.removeEventListener('mousedown', handleDown)
  }, [])

  async function handleRowClick(notif) {
    await markOneRead(notif.id)
    setOpen(false)
    if (notif.action_url) navigate(notif.action_url)
  }

  async function handleMarkAll() {
    await markAllRead()
  }

  return (
    <div style={{ position: 'relative' }}>

      {/* Bell button */}
      <button
        ref={buttonRef}
        type="button"
        title="Notifications"
        aria-label="Notifications"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center',
          position: 'relative',
          background: 'none', border: 'none', cursor: 'pointer',
          color: open ? 'var(--accent)' : 'var(--muted)',
          padding: '0.25rem',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.color = 'var(--accent)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.color = 'var(--muted)' }}
      >
        <BellIcon />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -1, right: -1,
            minWidth: 14, height: 14, paddingInline: '2px',
            background: 'var(--accent)', color: '#fff',
            borderRadius: 7, fontSize: '0.5rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1, border: '1.5px solid var(--bg)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
            width: 320, maxHeight: 460,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            zIndex: 200,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.7rem 1rem',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: '0.68rem', letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500,
            }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.72rem', color: 'var(--accent)',
                  letterSpacing: '0.02em', padding: 0,
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', textAlign: 'center', padding: '1.5rem' }}>
                Loading…
              </p>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.95rem', color: 'var(--muted)', margin: 0 }}>
                  You're all caught up.
                </p>
              </div>
            ) : (
              notifications.map(n => (
                <NotificationRow key={n.id} notif={n} onRowClick={handleRowClick} />
              ))
            )}
          </div>

          {/* Footer — only when there's content */}
          {notifications.length > 0 && (
            <div style={{
              padding: '0.5rem 1rem',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
                Last 50 notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
