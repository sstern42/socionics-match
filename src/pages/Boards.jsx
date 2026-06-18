import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { getBoards } from '../lib/boards'

export default function Boards() {
  usePageTitle('Boards')
  const { session, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authLoading && !session) navigate('/auth', { replace: true })
  }, [session, authLoading])

  useEffect(() => {
    getBoards()
      .then(setBoards)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <section style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          Boards
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '2.5rem' }}>
          Discussions open to everyone — pick a topic and dive in.
        </p>

        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', textAlign: 'center', padding: '3rem 0' }}>Loading…</p>
        ) : error ? (
          <p style={{ color: '#c0392b', fontSize: '0.85rem' }}>{error}</p>
        ) : boards.length === 0 ? (
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--muted)', textAlign: 'center', padding: '4rem 0' }}>
            No boards yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {boards.map(board => (
              <Link
                key={board.id}
                to={`/boards/${board.slug}`}
                style={{
                  display: 'block', textDecoration: 'none', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: '1.1rem 1.25rem', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-lt)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', marginBottom: '0.35rem' }}>
                  {board.name}
                </h2>
                {board.description && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                    {board.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}
