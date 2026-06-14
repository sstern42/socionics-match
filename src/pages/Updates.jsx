import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']
const PAGE_SIZE = 5

const POST_TYPE_META = {
  milestone: { label: 'Milestone', colour: '#2ecc71'      },
  data:      { label: 'Data',      colour: '#185FA5'      },
  feature:   { label: 'Feature',   colour: '#BA7517'      },
  note:      { label: 'Note',      colour: 'var(--muted)' },
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

export default function Updates() {
  const { session, loading: authLoading, profile } = useAuth()
  const navigate = useNavigate()
  const isFounder = profile?.profile_data?.role === 'founder'

  useEffect(() => {
    if (!authLoading && !session) navigate('/auth', { replace: true })
  }, [session, authLoading])

  const [posts, setPosts]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [loadingMore, setLoadingMore]   = useState(false)
  const [hasMore, setHasMore]           = useState(false)
  const [error, setError]               = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  // Compose state — founder only
  const [content, setContent]     = useState('')
  const [postType, setPostType]   = useState('note')
  const [posting, setPosting]     = useState(false)
  const [postError, setPostError] = useState(null)

  // Mark as read on mount
  useEffect(() => {
    localStorage.setItem('socion_updates_last_visited', new Date().toISOString())
    window.dispatchEvent(new Event('socion-updates-visited'))
  }, [])

  useEffect(() => {
    loadPosts()

    const postsChannel = supabase
      .channel('founder-posts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'founder_posts' }, async (payload) => {
        setPosts(prev => {
          if (prev.some(p => p.id === payload.new.id)) return prev
          return prev
        })
        const { data } = await supabase
          .from('founder_posts')
          .select('*, reactions:founder_post_reactions(user_id, emoji)')
          .eq('id', payload.new.id)
          .single()
        if (data) setPosts(prev => prev.some(p => p.id === data.id) ? prev : [data, ...prev])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'founder_posts' }, (payload) => {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id))
      })
      .subscribe()

    const reactionsChannel = supabase
      .channel('founder-post-reactions-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'founder_post_reactions' }, ({ new: r }) => {
        setPosts(prev => prev.map(p => {
          if (p.id !== r.post_id) return p
          const existing = p.reactions ?? []
          if (existing.some(x => x.user_id === r.user_id && x.emoji === r.emoji)) return p
          return { ...p, reactions: [...existing, { user_id: r.user_id, emoji: r.emoji }] }
        }))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'founder_post_reactions' }, ({ old: r }) => {
        setPosts(prev => prev.map(p => {
          if (p.id !== r.post_id) return p
          return { ...p, reactions: (p.reactions ?? []).filter(x => !(x.user_id === r.user_id && x.emoji === r.emoji)) }
        }))
      })
      .subscribe()

    return () => {
      postsChannel.unsubscribe()
      reactionsChannel.unsubscribe()
    }
  }, [])

  async function loadPosts() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('founder_posts')
        .select('*, reactions:founder_post_reactions(user_id, emoji)')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)
      if (error) throw error
      setPosts(data ?? [])
      setHasMore((data ?? []).length === PAGE_SIZE)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore || posts.length === 0) return
    setLoadingMore(true)
    try {
      const cursor = posts[posts.length - 1].created_at
      const { data, error } = await supabase
        .from('founder_posts')
        .select('*, reactions:founder_post_reactions(user_id, emoji)')
        .order('created_at', { ascending: false })
        .lt('created_at', cursor)
        .limit(PAGE_SIZE)
      if (error) throw error
      setPosts(prev => [...prev, ...(data ?? [])])
      setHasMore((data ?? []).length === PAGE_SIZE)
    } catch (err) {
      console.error('load more failed', err)
    } finally {
      setLoadingMore(false)
    }
  }

  async function handlePost() {
    if (!content.trim() || posting) return
    setPosting(true)
    setPostError(null)
    try {
      const { data, error } = await supabase
        .from('founder_posts')
        .insert({ content: content.trim(), post_type: postType })
        .select('*, reactions:founder_post_reactions(user_id, emoji)')
        .single()
      if (error) throw error
      setPosts(prev => [data, ...prev])
      setContent('')
      setPostType('note')
      window.umami?.track('founder-post-created', { post_type: postType })
    } catch (err) {
      setPostError(err.message)
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    setDeleteConfirmId(null)
    try {
      await supabase.from('founder_posts').delete().eq('id', postId)
    } catch (err) {
      console.error('Delete failed:', err)
      loadPosts()
    }
  }

  async function toggleReaction(postId, emoji) {
    if (!profile?.id) return
    const post = posts.find(p => p.id === postId)
    if (!post) return
    const reactions = post.reactions ?? []
    const hasReacted = reactions.some(r => r.user_id === profile.id && r.emoji === emoji)
    const snapshot = reactions

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const updated = hasReacted
        ? (p.reactions ?? []).filter(r => !(r.user_id === profile.id && r.emoji === emoji))
        : [...(p.reactions ?? []), { user_id: profile.id, emoji }]
      return { ...p, reactions: updated }
    }))

    try {
      if (hasReacted) {
        await supabase.from('founder_post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', profile.id)
          .eq('emoji', emoji)
      } else {
        await supabase.from('founder_post_reactions')
          .upsert(
            { post_id: postId, user_id: profile.id, emoji },
            { onConflict: 'post_id,user_id,emoji', ignoreDuplicates: true }
          )
      }
      window.umami?.track('founder-post-reaction', { emoji, action: hasReacted ? 'remove' : 'add' })
    } catch {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: snapshot } : p))
    }
  }

  return (
    <Layout noScroll hideFooter>
      <section style={{ maxWidth: 560, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3rem)', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          Updates from <em>Spencer</em>
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
          Milestones, data, feature launches, and what's happening behind the scenes.
        </p>
        <p style={{ fontSize: '0.82rem', marginBottom: '2.5rem' }}>
          <Link to="/changelog" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Full changelog →</Link>
        </p>

        {/* Founder compose box */}
        {isFounder && (
          <div style={{
            border: '1px solid var(--accent-lt)', borderRadius: 8,
            padding: '1.25rem', marginBottom: '2.5rem',
            background: 'rgba(154,111,56,0.04)',
          }}>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, marginBottom: '0.75rem' }}>
              New post
            </p>
            <textarea
              className="input-standalone"
              placeholder="What's happening with Socion..."
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handlePost()}
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6, marginBottom: '0.75rem' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                value={postType}
                onChange={e => setPostType(e.target.value)}
                style={{
                  fontFamily: 'var(--sans)', fontSize: '0.82rem',
                  padding: '0.4rem 0.75rem',
                  border: '1px solid var(--border)', borderRadius: 3,
                  background: 'var(--card-bg)', color: 'var(--text)', cursor: 'pointer',
                }}
              >
                {Object.entries(POST_TYPE_META).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn-primary"
                onClick={handlePost}
                disabled={posting || !content.trim()}
                style={{ fontSize: '0.78rem', padding: '0.5rem 1.25rem', opacity: (posting || !content.trim()) ? 0.5 : 1 }}
              >
                {posting ? 'Posting…' : 'Post'}
              </button>
              {postError && <p style={{ fontSize: '0.78rem', color: '#c0392b', margin: 0 }}>{postError}</p>}
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Ctrl + Enter to post</p>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', textAlign: 'center', padding: '3rem 0' }}>Loading…</p>
        ) : error ? (
          <p style={{ color: '#c0392b', fontSize: '0.85rem' }}>{error}</p>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--muted)' }}>
              First update coming soon.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {posts.map((post, i) => {
              const meta = POST_TYPE_META[post.post_type] ?? POST_TYPE_META.note

              const groups = {}
              for (const r of post.reactions ?? []) {
                if (!groups[r.emoji]) groups[r.emoji] = []
                groups[r.emoji].push(r.user_id)
              }

              return (
                <div
                  key={post.id}
                  style={{
                    padding: '1.5rem 0',
                    borderBottom: i < posts.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                    <span style={{
                      fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                      fontWeight: 600, color: meta.colour,
                      border: `1px solid ${meta.colour}55`,
                      padding: '0.12rem 0.5rem', borderRadius: 2, flexShrink: 0,
                    }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      {timeAgo(post.created_at)}
                    </span>

                    {isFounder && (
                      deleteConfirmId === post.id ? (
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button type="button" onClick={() => handleDelete(post.id)} style={{ background: '#c0392b', border: 'none', borderRadius: 3, padding: '0.15rem 0.5rem', fontSize: '0.68rem', color: '#fff', cursor: 'pointer' }}>Delete</button>
                          <button type="button" onClick={() => setDeleteConfirmId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.68rem', padding: '0.15rem' }}>Cancel</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setDeleteConfirmId(post.id)} aria-label="Delete post" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem', padding: '0.1rem 0.35rem', lineHeight: 1, opacity: 0.4, transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
                          ×
                        </button>
                      )
                    )}
                  </div>

                  <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.75, fontWeight: 300, whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                    {post.content}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {REACTIONS.map(emoji => {
                      const users = groups[emoji] ?? []
                      const iReacted = users.includes(profile?.id)
                      return (
                        <button key={emoji} type="button" onClick={() => toggleReaction(post.id, emoji)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: iReacted ? 'rgba(154,111,56,0.1)' : 'var(--surface)', border: `1px solid ${iReacted ? 'var(--accent-lt)' : 'var(--border)'}`, borderRadius: 20, padding: '0.2rem 0.55rem', cursor: 'pointer', fontSize: '0.88rem', lineHeight: 1.5, transition: 'all 0.15s' }}>
                          <span>{emoji}</span>
                          {users.length > 0 && <span style={{ fontSize: '0.7rem', color: iReacted ? 'var(--accent)' : 'var(--muted)', fontWeight: 500 }}>{users.length}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {hasMore && !loading && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={loadMore}
              disabled={loadingMore}
              style={{ padding: '0.6rem 1.5rem', fontSize: '0.82rem', opacity: loadingMore ? 0.6 : 1 }}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}

        {!hasMore && posts.length > PAGE_SIZE && !loading && (
          <p style={{ textAlign: 'center', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.92rem', color: 'var(--muted)', marginTop: '2.5rem' }}>
            That's the beginning of the feed.
          </p>
        )}
      </section>
    </Layout>
  )
}
