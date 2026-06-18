import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  getBoardPost,
  getBoardComments,
  createBoardComment,
  softDeleteBoardPost,
  setPostPinned,
  addPostReaction,
  removePostReaction,
  addCommentReaction,
  removeCommentReaction,
} from '../lib/boards'

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

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

export default function BoardPost() {
  const { slug, postId } = useParams()
  const { session, loading: authLoading, profile } = useAuth()
  const navigate = useNavigate()
  const isFounder = profile?.profile_data?.role === 'founder'

  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [commentText, setCommentText] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [commentError, setCommentError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  usePageTitle(post?.title ?? 'Post')

  useEffect(() => {
    if (!authLoading && !session) navigate('/auth', { replace: true })
  }, [session, authLoading])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([getBoardPost(postId), getBoardComments(postId)])
      .then(([p, c]) => {
        if (cancelled) return
        if (!p) { setError('Post not found.'); return }
        setPost(p)
        setComments(c)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [postId])

  async function handleComment() {
    if (!commentText.trim() || commenting || !profile?.id) return
    setCommenting(true)
    setCommentError(null)
    try {
      const comment = await createBoardComment({ postId, authorId: profile.id, content: commentText })
      setComments(prev => [...prev, comment])
      setCommentText('')
    } catch (err) {
      setCommentError(err.message)
    } finally {
      setCommenting(false)
    }
  }

  async function handleDeletePost() {
    setDeleteConfirm(false)
    try {
      await softDeleteBoardPost(postId)
      navigate(`/boards/${slug}`)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleTogglePin() {
    if (!post) return
    const nextPinned = !post.pinned
    setPost(prev => ({ ...prev, pinned: nextPinned }))
    try {
      await setPostPinned(postId, nextPinned)
    } catch (err) {
      setPost(prev => ({ ...prev, pinned: !nextPinned }))
      setError(err.message)
    }
  }

  async function toggleCommentReaction(commentId, emoji) {
    if (!profile?.id) return
    const comment = comments.find(c => c.id === commentId)
    if (!comment) return
    const reactions = comment.reactions ?? []
    const hasReacted = reactions.some(r => r.user_id === profile.id && r.emoji === emoji)
    const snapshot = reactions

    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c
      const updated = hasReacted
        ? reactions.filter(r => !(r.user_id === profile.id && r.emoji === emoji))
        : [...reactions, { user_id: profile.id, emoji }]
      return { ...c, reactions: updated }
    }))

    try {
      if (hasReacted) {
        await removeCommentReaction({ commentId, userId: profile.id, emoji })
      } else {
        await addCommentReaction({ commentId, userId: profile.id, emoji })
      }
    } catch {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, reactions: snapshot } : c))
    }
  }

  async function toggleReaction(emoji) {
    if (!profile?.id || !post) return
    const reactions = post.reactions ?? []
    const hasReacted = reactions.some(r => r.user_id === profile.id && r.emoji === emoji)
    const snapshot = reactions

    setPost(prev => ({
      ...prev,
      reactions: hasReacted
        ? reactions.filter(r => !(r.user_id === profile.id && r.emoji === emoji))
        : [...reactions, { user_id: profile.id, emoji }],
    }))

    try {
      if (hasReacted) {
        await removePostReaction({ postId, userId: profile.id, emoji })
      } else {
        await addPostReaction({ postId, userId: profile.id, emoji })
      }
    } catch {
      setPost(prev => ({ ...prev, reactions: snapshot }))
    }
  }

  const isMine = post?.author_id === profile?.id
  const groups = {}
  for (const r of post?.reactions ?? []) {
    if (!groups[r.emoji]) groups[r.emoji] = []
    groups[r.emoji].push(r.user_id)
  }

  return (
    <Layout>
      <section style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
        <p style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>
          <Link to={`/boards/${slug}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Back to board</Link>
        </p>

        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', textAlign: 'center', padding: '3rem 0' }}>Loading…</p>
        ) : error ? (
          <p style={{ color: '#c0392b', fontSize: '0.85rem' }}>{error}</p>
        ) : post && (
          <>
            <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {post.pinned && (
                  <span style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 600 }}>
                    Pinned
                  </span>
                )}
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  {authorName(post.author)} · {timeAgo(post.created_at)}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isFounder && (
                    <button
                      type="button"
                      onClick={handleTogglePin}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '0.1rem 0.5rem', fontSize: '0.68rem', color: 'var(--muted)', cursor: 'pointer' }}
                    >
                      {post.pinned ? 'Unpin' : 'Pin'}
                    </button>
                  )}
                  {isMine && (
                    deleteConfirm ? (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button type="button" onClick={handleDeletePost} style={{ background: '#c0392b', border: 'none', borderRadius: 3, padding: '0.15rem 0.5rem', fontSize: '0.68rem', color: '#fff', cursor: 'pointer' }}>Delete</button>
                        <button type="button" onClick={() => setDeleteConfirm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.68rem' }}>Cancel</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setDeleteConfirm(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.72rem' }}>Delete</button>
                    )
                  )}
                </div>
              </div>
              <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.6rem,4vw,2.2rem)', marginBottom: '0.9rem' }}>
                {post.title}
              </h1>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: '1.1rem' }}>
                {post.content}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                {REACTIONS.map(emoji => {
                  const users = groups[emoji] ?? []
                  const iReacted = users.includes(profile?.id)
                  return (
                    <button key={emoji} type="button" onClick={() => toggleReaction(emoji)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: iReacted ? 'rgba(154,111,56,0.1)' : 'var(--surface)', border: `1px solid ${iReacted ? 'var(--accent-lt)' : 'var(--border)'}`, borderRadius: 20, padding: '0.2rem 0.55rem', cursor: 'pointer', fontSize: '0.88rem', lineHeight: 1.5 }}>
                      <span>{emoji}</span>
                      {users.length > 0 && <span style={{ fontSize: '0.7rem', color: iReacted ? 'var(--accent)' : 'var(--muted)', fontWeight: 500 }}>{users.length}</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', marginBottom: '1rem' }}>
              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
            </h2>

            <div style={{ marginBottom: '2rem' }}>
              <textarea
                className="input-standalone"
                placeholder="Add a comment…"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                rows={2}
                maxLength={2000}
                style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6, marginBottom: '0.6rem' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleComment}
                  disabled={commenting || !commentText.trim()}
                  style={{ fontSize: '0.78rem', padding: '0.45rem 1.1rem', opacity: (commenting || !commentText.trim()) ? 0.5 : 1 }}
                >
                  {commenting ? 'Posting…' : 'Comment'}
                </button>
                {commentError && <p style={{ fontSize: '0.78rem', color: '#c0392b', margin: 0 }}>{commentError}</p>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {comments.map((c, i) => {
                const commentGroups = {}
                for (const r of c.reactions ?? []) {
                  if (!commentGroups[r.emoji]) commentGroups[r.emoji] = []
                  commentGroups[r.emoji].push(r.user_id)
                }
                return (
                  <div key={c.id} style={{ padding: '1rem 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                      {authorName(c.author)} · {timeAgo(c.created_at)}
                    </p>
                    <p style={{ fontSize: '0.9rem', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: c.deleted_at ? 0 : '0.5rem' }}>
                      {c.deleted_at ? <em style={{ color: 'var(--muted)' }}>Comment deleted</em> : c.content}
                    </p>
                    {!c.deleted_at && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {REACTIONS.map(emoji => {
                          const users = commentGroups[emoji] ?? []
                          const iReacted = users.includes(profile?.id)
                          return (
                            <button key={emoji} type="button" onClick={() => toggleCommentReaction(c.id, emoji)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: iReacted ? 'rgba(154,111,56,0.1)' : 'var(--surface)', border: `1px solid ${iReacted ? 'var(--accent-lt)' : 'var(--border)'}`, borderRadius: 20, padding: '0.1rem 0.45rem', cursor: 'pointer', fontSize: '0.78rem', lineHeight: 1.5 }}>
                              <span>{emoji}</span>
                              {users.length > 0 && <span style={{ fontSize: '0.62rem', color: iReacted ? 'var(--accent)' : 'var(--muted)', fontWeight: 500 }}>{users.length}</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>
    </Layout>
  )
}
