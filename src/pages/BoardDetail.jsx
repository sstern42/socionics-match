import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { getBoardBySlug, getBoardPosts, createBoardPost } from '../lib/boards'

function authorName(author) {
  if (!author) return 'Unknown'
  if (author.profile_data?.anonymous) return 'Anonymous'
  return author.profile_data?.name ?? author.type ?? 'Unknown'
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function BoardDetail() {
  const { slug } = useParams()
  const { session, loading: authLoading, profile } = useAuth()
  const navigate = useNavigate()

  const [board, setBoard] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)
  const [composing, setComposing] = useState(false)

  usePageTitle(board?.name ?? 'Board')

  useEffect(() => {
    if (!authLoading && !session) navigate('/auth', { replace: true })
  }, [session, authLoading])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getBoardBySlug(slug)
      .then(async b => {
        if (cancelled) return
        if (!b) { setError('Board not found.'); return }
        setBoard(b)
        const p = await getBoardPosts(b.id)
        if (!cancelled) setPosts(p)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  async function handlePost() {
    if (!title.trim() || !content.trim() || posting || !board || !profile?.id) return
    setPosting(true)
    setPostError(null)
    try {
      const post = await createBoardPost({ boardId: board.id, authorId: profile.id, title, content })
      setPosts(prev => [post, ...prev])
      setTitle('')
      setContent('')
      setComposing(false)
    } catch (err) {
      setPostError(err.message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <Layout>
      <section style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
        <p style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>
          <Link to="/boards" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← All boards</Link>
        </p>

        {board && (
          <>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', marginBottom: '0.5rem' }}>
              {board.name}
            </h1>
            {board.description && (
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
                {board.description}
              </p>
            )}
          </>
        )}

        {board && (
          composing ? (
            <div style={{
              border: '1px solid var(--accent-lt)', borderRadius: 8,
              padding: '1.25rem', marginBottom: '2.5rem',
              background: 'rgba(154,111,56,0.04)',
            }}>
              <input
                className="input-standalone"
                placeholder="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
                style={{ marginBottom: '0.75rem' }}
              />
              <textarea
                className="input-standalone"
                placeholder="What do you want to say?"
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={4}
                maxLength={5000}
                style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6, marginBottom: '0.75rem' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handlePost}
                  disabled={posting || !title.trim() || !content.trim()}
                  style={{ fontSize: '0.78rem', padding: '0.5rem 1.25rem', opacity: (posting || !title.trim() || !content.trim()) ? 0.5 : 1 }}
                >
                  {posting ? 'Posting…' : 'Post'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setComposing(false)} style={{ fontSize: '0.78rem', padding: '0.5rem 1.25rem' }}>
                  Cancel
                </button>
                {postError && <p style={{ fontSize: '0.78rem', color: '#c0392b', margin: 0 }}>{postError}</p>}
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setComposing(true)}
              style={{ fontSize: '0.82rem', padding: '0.6rem 1.4rem', marginBottom: '2.5rem' }}
            >
              New post
            </button>
          )
        )}

        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', textAlign: 'center', padding: '3rem 0' }}>Loading…</p>
        ) : error ? (
          <p style={{ color: '#c0392b', fontSize: '0.85rem' }}>{error}</p>
        ) : posts.length === 0 ? (
          <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--muted)', textAlign: 'center', padding: '4rem 0' }}>
            No posts yet — be the first.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {posts.map((post, i) => (
              <Link
                key={post.id}
                to={`/boards/${slug}/${post.id}`}
                style={{
                  display: 'block', textDecoration: 'none', color: 'var(--text)',
                  padding: '1.25rem 0',
                  borderBottom: i < posts.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  {post.pinned && (
                    <span style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 600 }}>
                      Pinned
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                    {authorName(post.author)} · {timeAgo(post.created_at)}
                  </span>
                </div>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', marginBottom: '0.3rem' }}>
                  {post.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {post.content}
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
                  {post.comments?.length ?? 0} {post.comments?.length === 1 ? 'comment' : 'comments'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}
