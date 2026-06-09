import { useState, useEffect, useRef, useCallback } from 'react'

const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY
const GIPHY_SEARCH = 'https://api.giphy.com/v1/gifs/search'
const GIPHY_TRENDING = 'https://api.giphy.com/v1/gifs/trending'
const LIMIT = 24

export default function GifPicker({ onSelect, onClose }) {
  const [query, setQuery]       = useState('')
  const [gifs, setGifs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const containerRef            = useRef(null)
  const inputRef                = useRef(null)
  const debounceTimer           = useRef(null)

  // Focus search on open
  useEffect(() => { inputRef.current?.focus() }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const fetchGifs = useCallback(async (q) => {
    setLoading(true)
    setError(null)
    try {
      const url = q
        ? `${GIPHY_SEARCH}?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=${LIMIT}&rating=pg-13`
        : `${GIPHY_TRENDING}?api_key=${GIPHY_KEY}&limit=${LIMIT}&rating=pg-13`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const { data } = await res.json()
      setGifs(data)
    } catch {
      setError('Could not load GIFs.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load trending on mount
  useEffect(() => { fetchGifs('') }, [fetchGifs])

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => fetchGifs(query), 400)
    return () => clearTimeout(debounceTimer.current)
  }, [query, fetchGifs])

  function handleSelect(gif) {
    // Use downsized for a balance of quality and size
    const url = gif.images?.fixed_width?.url ?? gif.images?.downsized?.url
    if (url) onSelect(url)
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: '0.5rem',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        maxHeight: 340,
      }}
    >
      {/* Search bar */}
      <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search GIFs…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '0.4rem 0.65rem',
            fontSize: '0.82rem',
            color: 'var(--text)',
            outline: 'none',
            fontFamily: 'var(--sans)',
            boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* GIF grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
            <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(154,111,56,0.25)', borderTopColor: 'var(--accent)', animation: 'bootSpin 0.8s linear infinite', display: 'inline-block' }} />
          </div>
        ) : error ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>{error}</p>
        ) : gifs.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>No GIFs found.</p>
        ) : (
          <div style={{ columns: 3, gap: '0.35rem' }}>
            {gifs.map(gif => (
              <div
                key={gif.id}
                onClick={() => handleSelect(gif)}
                style={{
                  breakInside: 'avoid',
                  marginBottom: '0.35rem',
                  borderRadius: 3,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid transparent',
                  transition: 'border-color 0.15s, opacity 0.15s',
                  lineHeight: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
              >
                <img
                  src={gif.images?.fixed_width_small?.url ?? gif.images?.downsized_small?.url}
                  alt={gif.title}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Giphy attribution — required by terms */}
      <div style={{ padding: '0.3rem 0.75rem', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <img
          src="https://developers.giphy.com/branch/master/static/header-logo-8974b8ae658f704a5b48a2d039b8ad93.gif"
          alt="Powered by GIPHY"
          style={{ height: 12, opacity: 0.7 }}
        />
      </div>
    </div>
  )
}
