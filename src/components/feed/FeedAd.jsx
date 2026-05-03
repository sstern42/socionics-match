import { useEffect } from 'react'

/**
 * Generic in-feed ad card. Renders the same visual shape as the existing
 * accent-bordered nudges but accepts content as props so each slot can
 * declare itself in one line. Fires a `feed-ad-impression` umami event
 * on mount and an optional `feed-ad-dismissed` event when × is clicked.
 */
export default function FeedAd({
  id,
  eyebrow,
  headline,
  body,
  ctaLabel,
  onClick,
  onDismiss,
}) {
  useEffect(() => {
    window.umami?.track('feed-ad-impression', { ad: id })
    // intentionally empty deps — fire once per mount of this specific ad
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      key={id}
      style={{
        position: 'relative',
        border: '1px solid var(--accent)',
        borderRadius: 6,
        padding: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '0.85rem',
        background: 'rgba(154,111,56,0.06)',
      }}
    >
      {onDismiss && (
        <button
          type="button"
          onClick={() => {
            window.umami?.track('feed-ad-dismissed', { ad: id })
            onDismiss()
          }}
          aria-label="Dismiss"
          style={{
            position: 'absolute', top: 6, right: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: '1rem', lineHeight: 1,
            padding: '0.25rem 0.4rem',
          }}
        >
          ×
        </button>
      )}

      <p style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, margin: 0, paddingRight: onDismiss ? '1.5rem' : 0 }}>
        {eyebrow}
      </p>
      <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.6, margin: 0, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
        {headline}
      </p>
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
        {body}
      </p>
      <button
        type="button"
        className="btn-primary"
        onClick={onClick}
        style={{ fontSize: '0.78rem', padding: '0.45rem 1rem', alignSelf: 'flex-start', whiteSpace: 'nowrap' }}
      >
        {ctaLabel}
      </button>
    </div>
  )
}
