function withUtm(url) {
  if (!url) return url
  try {
    const u = new URL(url)
    u.searchParams.set('utm_source', 'socion.app')
    u.searchParams.set('utm_medium', 'webview')
    return u.toString()
  } catch {
    return url
  }
}

export default function SIWebview({ url, onClose }) {
  if (!url) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card-bg)',
          borderRadius: '12px 12px 0 0',
          height: '85vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
            socionicsinsight.com
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.1rem', color: 'var(--muted)', padding: '0.25rem 0.5rem',
              lineHeight: 1, flexShrink: 0,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <iframe
          src={withUtm(url)}
          title="Socionics Insight"
          style={{ flex: 1, border: 'none', width: '100%' }}
          loading="lazy"
        />
      </div>
    </div>
  )
}
