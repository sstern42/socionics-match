import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import MentionTextarea from '../components/boards/MentionTextarea'
import { useAuth } from '../lib/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  getBoardPost,
  getBoardComments,
  createBoardComment,
  softDeleteBoardPost,
  softDeleteBoardComment,
  editBoardPost,
  editBoardComment,
  setPostPinned,
  addPostReaction,
  removePostReaction,
  addCommentReaction,
  removeCommentReaction,
  incrementBoardPostView,
  reportBoardContent,
} from '../lib/boards'

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

function authorName(author) {
  if (!author) return 'Unknown'
  if (author.profile_data?.anonymous) return 'Anonymous'
  return author.profile_data?.name ?? author.type ?? 'Unknown'
}

function authorLabel(author) {
  const name = authorName(author)
  if (!author || author.profile_data?.anonymous) return name
  const type = author.type
  return type && type !== name ? `${name} · ${type}` : name
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
  const [commentMentionedIds, setCommentMentionedIds] = useState([])
  const [commenting, setCommenting] = useState(false)
  const [commentError, setCommentError] = useState(null)
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyMentionedIds, setReplyMentionedIds] = useState([])
  const [replying, setReplying] = useState(false)
  const [replyError, setReplyError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [commentDeleteConfirmId, setCommentDeleteConfirmId] = useState(null)

  const [editingPost, setEditingPost] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editPostError, setEditPostError] = useState(null)

  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [editCommentError, setEditCommentError] = useState(null)

  const [reportTarget, setReportTarget] = useState(null) // { type: 'post'|'comment', id }
  const [reportReason, setReportReason] = useState('spam')
  const [reportNotes, setReportNotes] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState(null)
  const [reportedIds, setReportedIds] = useState(new Set())

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
        incrementBoardPostView(postId).catch(() => {})
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
      const comment = await createBoardComment({ postId, authorId: profile.id, content: commentText, mentionedUserIds: commentMentionedIds })
      setComments(prev => [...prev, comment])
      setCommentText('')
      setCommentMentionedIds([])
    } catch (err) {
      setCommentError(err.message)
    } finally {
      setCommenting(false)
    }
  }

  function startReply(commentId) {
    setReplyTo(commentId)
    setReplyText('')
    setReplyMentionedIds([])
    setReplyError(null)
  }

  async function handleReply() {
    if (!replyText.trim() || replying || !profile?.id || !replyTo) return
    setReplying(true)
    setReplyError(null)
    try {
      const comment = await createBoardComment({ postId, authorId: profile.id, content: replyText, parentCommentId: replyTo, mentionedUserIds: replyMentionedIds })
      setComments(prev => [...prev, comment])
      setReplyTo(null)
      setReplyText('')
      setReplyMentionedIds([])
    } catch (err) {
      setReplyError(err.message)
    } finally {
      setReplying(false)
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

  async function handleDeleteComment(commentId) {
    const now = new Date().toISOString()
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, deleted_at: now } : c))
    setCommentDeleteConfirmId(null)
    try {
      await softDeleteBoardComment(commentId)
    } catch (err) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, deleted_at: null } : c))
      setError(err.message)
    }
  }

  function startEditPost() {
    setEditTitle(post.title)
    setEditContent(post.content)
    setEditPostError(null)
    setEditingPost(true)
  }

  async function handleEditPostSave() {
    if (!editTitle.trim() || !editContent.trim()) return
    try {
      await editBoardPost({ postId, title: editTitle, content: editContent })
      setPost(prev => ({ ...prev, title: editTitle.trim(), content: editContent.trim(), edited_at: new Date().toISOString() }))
      setEditingPost(false)
    } catch (err) {
      setEditPostError(err.message)
    }
  }

  function startEditComment(comment) {
    setEditingCommentId(comment.id)
    setEditCommentText(comment.content)
    setEditCommentError(null)
  }

  async function handleEditCommentSave(commentId) {
    if (!editCommentText.trim()) return
    try {
      await editBoardComment({ commentId, content: editCommentText })
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editCommentText.trim(), edited_at: new Date().toISOString() } : c))
      setEditingCommentId(null)
    } catch (err) {
      setEditCommentError(err.message)
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

  function openReportModal(type, id) {
    setReportTarget({ type, id })
    setReportReason('spam')
    setReportNotes('')
    setReportError(null)
  }

  async function handleSubmitReport() {
    if (!reportTarget || !profile?.id || reportSubmitting) return
    setReportSubmitting(true)
    setReportError(null)
    try {
      await reportBoardContent({
        postId: reportTarget.type === 'post' ? reportTarget.id : null,
        commentId: reportTarget.type === 'comment' ? reportTarget.id : null,
        reporterId: profile.id,
        reason: reportNotes.trim() ? `${reportReason}: ${reportNotes.trim()}` : reportReason,
      })
      setReportedIds(prev => new Set(prev).add(reportTarget.id))
      setReportTarget(null)
    } catch (err) {
      setReportError(err.message)
    } finally {
      setReportSubmitting(false)
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

  const topLevelComments = comments.filter(c => !c.parent_comment_id)
  const repliesByParent = {}
  for (const c of comments) {
    if (!c.parent_comment_id) continue
    if (!repliesByParent[c.parent_comment_id]) repliesByParent[c.parent_comment_id] = []
    repliesByParent[c.parent_comment_id].push(c)
  }

  function renderComment(c, { isReply = false } = {}) {
    const commentGroups = {}
    for (const r of c.reactions ?? []) {
      if (!commentGroups[r.emoji]) commentGroups[r.emoji] = []
      commentGroups[r.emoji].push(r.user_id)
    }
    const isMyComment = c.author_id === profile?.id
    return (
      <div key={c.id} style={isReply ? { padding: '0.85rem 0 0', marginLeft: '1.5rem', borderLeft: '2px solid var(--border)', paddingLeft: '0.9rem' } : { padding: '1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>
            {authorLabel(c.author)} · {timeAgo(c.created_at)}
          </p>
          {isMyComment && !c.deleted_at && editingCommentId !== c.id && (
            commentDeleteConfirmId === c.id ? (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem' }}>
                <button type="button" onClick={() => handleDeleteComment(c.id)} style={{ background: '#c0392b', border: 'none', borderRadius: 3, padding: '0.1rem 0.45rem', fontSize: '0.65rem', color: '#fff', cursor: 'pointer' }}>Delete</button>
                <button type="button" onClick={() => setCommentDeleteConfirmId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.65rem' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => startEditComment(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.7rem' }}>Edit</button>
                <button type="button" onClick={() => setCommentDeleteConfirmId(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.7rem' }}>Delete</button>
              </div>
            )
          )}
          {!isMyComment && !c.deleted_at && editingCommentId !== c.id && (
            <button
              type="button"
              onClick={() => openReportModal('comment', c.id)}
              disabled={reportedIds.has(c.id)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: reportedIds.has(c.id) ? 'default' : 'pointer', color: 'var(--muted)', fontSize: '0.7rem' }}
            >
              {reportedIds.has(c.id) ? 'Reported' : 'Report'}
            </button>
          )}
        </div>
        {editingCommentId === c.id ? (
          <div style={{ marginBottom: '0.5rem' }}>
            <textarea
              className="input-standalone"
              value={editCommentText}
              onChange={e => setEditCommentText(e.target.value)}
              rows={2}
              maxLength={2000}
              style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6, marginBottom: '0.5rem' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button type="button" className="btn-primary" onClick={() => handleEditCommentSave(c.id)} disabled={!editCommentText.trim()} style={{ fontSize: '0.72rem', padding: '0.35rem 0.9rem' }}>Save</button>
              <button type="button" className="btn-ghost" onClick={() => setEditingCommentId(null)} style={{ fontSize: '0.72rem', padding: '0.35rem 0.9rem' }}>Cancel</button>
              {editCommentError && <p style={{ fontSize: '0.72rem', color: '#c0392b', margin: 0 }}>{editCommentError}</p>}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '0.9rem', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: c.deleted_at ? 0 : '0.2rem' }}>
            {c.deleted_at ? <em style={{ color: 'var(--muted)' }}>Comment deleted</em> : c.content}
          </p>
        )}
        {!c.deleted_at && c.edited_at && editingCommentId !== c.id && (
          <p style={{ fontSize: '0.62rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>edited</p>
        )}
        {!c.deleted_at && editingCommentId !== c.id && (
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
            {!isReply && (
              <button type="button" onClick={() => startReply(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.72rem', marginLeft: '0.25rem' }}>
                Reply
              </button>
            )}
          </div>
        )}
        {!isReply && replyTo === c.id && (
          <div style={{ marginTop: '0.6rem', marginLeft: '1.5rem' }}>
            <MentionTextarea
              value={replyText}
              onChange={setReplyText}
              mentionedIds={replyMentionedIds}
              onMentionsChange={setReplyMentionedIds}
              excludeUserId={profile?.id}
              placeholder={`Reply to ${authorName(c.author)}… Type @ to mention someone`}
              rows={2}
              maxLength={2000}
              style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6, marginBottom: '0.5rem' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button type="button" className="btn-primary" onClick={handleReply} disabled={replying || !replyText.trim()} style={{ fontSize: '0.72rem', padding: '0.35rem 0.9rem', opacity: (replying || !replyText.trim()) ? 0.5 : 1 }}>
                {replying ? 'Posting…' : 'Reply'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setReplyTo(null)} style={{ fontSize: '0.72rem', padding: '0.35rem 0.9rem' }}>Cancel</button>
              {replyError && <p style={{ fontSize: '0.72rem', color: '#c0392b', margin: 0 }}>{replyError}</p>}
            </div>
          </div>
        )}
        {!isReply && (repliesByParent[c.id] ?? []).map(reply => renderComment(reply, { isReply: true }))}
      </div>
    )
  }

  return (
    <Layout hideFooter>
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
                  {authorLabel(post.author)} · {timeAgo(post.created_at)} · {post.views ?? 0} {post.views === 1 ? 'view' : 'views'}
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
                  {isMine && !editingPost && (
                    deleteConfirm ? (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button type="button" onClick={handleDeletePost} style={{ background: '#c0392b', border: 'none', borderRadius: 3, padding: '0.15rem 0.5rem', fontSize: '0.68rem', color: '#fff', cursor: 'pointer' }}>Delete</button>
                        <button type="button" onClick={() => setDeleteConfirm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.68rem' }}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <button type="button" onClick={startEditPost} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.72rem' }}>Edit</button>
                        <button type="button" onClick={() => setDeleteConfirm(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.72rem' }}>Delete</button>
                      </>
                    )
                  )}
                  {!isMine && !editingPost && (
                    <button
                      type="button"
                      onClick={() => openReportModal('post', post.id)}
                      disabled={reportedIds.has(post.id)}
                      style={{ background: 'none', border: 'none', cursor: reportedIds.has(post.id) ? 'default' : 'pointer', color: 'var(--muted)', fontSize: '0.72rem' }}
                    >
                      {reportedIds.has(post.id) ? 'Reported' : 'Report'}
                    </button>
                  )}
                </div>
              </div>
              {editingPost ? (
                <div style={{ marginBottom: '1.1rem' }}>
                  <input
                    className="input-standalone"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    maxLength={200}
                    style={{ marginBottom: '0.6rem' }}
                  />
                  <textarea
                    className="input-standalone"
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={4}
                    maxLength={5000}
                    style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6, marginBottom: '0.6rem' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button type="button" className="btn-primary" onClick={handleEditPostSave} disabled={!editTitle.trim() || !editContent.trim()} style={{ fontSize: '0.78rem', padding: '0.45rem 1.1rem' }}>Save</button>
                    <button type="button" className="btn-ghost" onClick={() => setEditingPost(false)} style={{ fontSize: '0.78rem', padding: '0.45rem 1.1rem' }}>Cancel</button>
                    {editPostError && <p style={{ fontSize: '0.78rem', color: '#c0392b', margin: 0 }}>{editPostError}</p>}
                  </div>
                </div>
              ) : (
                <>
                  <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.6rem,4vw,2.2rem)', marginBottom: '0.9rem' }}>
                    {post.title}
                  </h1>
                  <p style={{ fontSize: '0.95rem', lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: '0.3rem' }}>
                    {post.content}
                  </p>
                  {post.edited_at && (
                    <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>edited</p>
                  )}
                </>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
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
              <MentionTextarea
                value={commentText}
                onChange={setCommentText}
                mentionedIds={commentMentionedIds}
                onMentionsChange={setCommentMentionedIds}
                excludeUserId={profile?.id}
                placeholder="Add a comment… Type @ to mention someone"
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
              {topLevelComments.map((c, i) => (
                <div key={c.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  {renderComment(c)}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {reportTarget && (
        <div onClick={() => setReportTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 6, padding: '1.75rem', maxWidth: 420, width: '100%' }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', marginBottom: '0.6rem' }}>
              Report {reportTarget.type === 'post' ? 'post' : 'comment'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.1rem' }}>
              A founder will review this. The author isn't notified.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.1rem' }}>
              <select className="input-standalone" value={reportReason} onChange={e => setReportReason(e.target.value)} style={{ fontFamily: 'var(--sans)' }}>
                <option value="spam">Spam or fake profile</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="harassment">Harassment or abuse</option>
                <option value="other">Other</option>
              </select>
              <textarea className="input-standalone" placeholder="Additional details (optional)" value={reportNotes} onChange={e => setReportNotes(e.target.value)} rows={3} maxLength={500} style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6 }} />
            </div>
            {reportError && <p style={{ fontSize: '0.8rem', color: '#c0392b', marginBottom: '0.75rem' }}>{reportError}</p>}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => setReportTarget(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleSubmitReport} disabled={reportSubmitting} style={{ opacity: reportSubmitting ? 0.6 : 1 }}>
                {reportSubmitting ? 'Reporting…' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
