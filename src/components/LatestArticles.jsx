import { useState } from 'react'
import SIWebview from './SIWebview'
import { useSIArticles, formatArticleDate } from '../lib/siArticles'

/**
 * Latest posts from socionicsinsight.com, opened in the in-app webview.
 * Renders nothing while loading or if the feed can't be fetched, so a
 * feed outage never leaves an empty box on the dashboard.
 */
export default function LatestArticles({ limit = 5, source = 'dashboard' }) {
  const { data: articles } = useSIArticles(limit)
  const [webviewUrl, setWebviewUrl] = useState(null)

  if (!articles?.length) return null

  function open(article) {
    window.umami?.track('si-article-click', { source, title: article.title })
    setWebviewUrl(article.link)
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1.5rem', background: 'var(--card-bg)' }}>
      <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.3rem' }}>Socionics Insight</p>
      <p style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.75rem' }}>Latest articles</p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {articles.map((a, i) => (
          <li key={a.link} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => open(a)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '0.65rem 0', color: 'inherit', font: 'inherit' }}
            >
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 500, lineHeight: 1.4 }}>{a.title}</span>
                {a.date && <span style={{ flexShrink: 0, fontSize: '0.72rem', color: 'var(--muted)' }}>{formatArticleDate(a.date)}</span>}
              </span>
              {i === 0 && a.summary && (
                <span style={{ display: 'block', marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.55 }}>{a.summary}</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => { window.umami?.track('si-click', { source: `${source}-articles` }); setWebviewUrl('https://socionicsinsight.com') }}
        style={{ marginTop: '0.5rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 500 }}
      >
        More on Socionics Insight →
      </button>

      <SIWebview url={webviewUrl} onClose={() => setWebviewUrl(null)} />
    </div>
  )
}
