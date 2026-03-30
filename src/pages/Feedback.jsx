import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { RELATIONS } from '../data/relations'

export default function Feedback() {
  const { matchId } = useParams()
  const { profile, session, loading } = useAuth()
  const navigate = useNavigate()

  const [match, setMatch] = useState(null)

  useEffect(() => {
    if (!loading && !session) navigate('/auth')
  }, [session, loading])
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)

  useEffect(() => {
    if (!profile || !matchId) return
    supabase
      .from('matches')
      .select('id, relation_type, feedback_a, feedback_b, user_a_id, user_b_id, user_a:user_a_id(type, profile_data), user_b:user_b_id(type, profile_data)')
      .eq('id', matchId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return
        setMatch(data)
        // Check if this user already submitted feedback
        const isA = data.user_a_id === profile.id
        const existing = isA ? data.feedback_a : data.feedback_b
        if (existing) setAlreadySubmitted(true)
      })
  }, [profile, matchId])

  async function handleSubmit() {
    if (!rating || !profile || !match) return
    setSaving(true)
    setError(null)
    try {
      const isA = match.user_a_id === profile.id
      const field = isA ? 'feedback_a' : 'feedback_b'
      const { error } = await supabase
        .from('matches')
        .update({ [field]: { rating, comment: comment.trim() || null, submitted_at: new Date().toISOString() } })
        .eq('id', matchId)
      if (error) throw error
      window.umami?.track('feedback-submitted', { rating, relationType: match.relation_type })
      navigate('/messages')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || (session && !match)) {
    return (
      <Layout>
        <section style={centreStyle}>
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        </section>
      </Layout>
    )
  }

  if (!session || !match) {
    return (
      <Layout>
        <section style={centreStyle}>
          <p style={{ color: 'var(--muted)' }}>Connection not found.</p>
        </section>
      </Layout>
    )
  }

  const other = match.user_a_id === profile?.id ? match.user_b : match.user_a
  const otherName = other?.profile_data?.name ?? other?.type ?? 'this person'

  if (alreadySubmitted) {
    return (
      <Layout>
        <section style={centreStyle}>
          <p className="eyebrow">Already submitted</p>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '2rem', marginTop: '0.5rem' }}>
            You've already rated <em>this connection</em>
          </h2>
          <button className="btn-ghost" onClick={() => navigate('/messages')}>
            Back to messages
          </button>
        </section>
      </Layout>
    )
  }

  return (
    <Layout>
      <section style={centreStyle}>
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '2rem', textAlign: 'center' }}>
          <div>
            <p className="eyebrow">Connection feedback</p>
            <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
              How is your connection with <em>{otherName}</em>?
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.75rem' }}>
              Your {RELATIONS[match.relation_type]?.name?.toLowerCase() ?? match.relation_type} relation. Your rating helps validate the theory.
            </p>
          </div>

          {/* Stars */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '2.5rem', lineHeight: 1,
                  color: star <= (hovered || rating) ? 'var(--accent)' : 'var(--border)',
                  transition: 'color 0.1s',
                }}
              >
                ★
              </button>
            ))}
          </div>

          {rating > 0 && (
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '-1rem' }}>
              {['', 'Poor fit', 'Below average', 'Average', 'Good fit', 'Excellent fit'][rating]}
            </p>
          )}

          <textarea
            className="input-standalone"
            placeholder="Optional — anything you'd like to add about the dynamic?"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            style={{ resize: 'vertical', fontFamily: 'var(--sans)', lineHeight: 1.6, textAlign: 'left' }}
          />

          {error && <p style={{ fontSize: '0.82rem', color: '#c0392b' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button type="button" className="btn-ghost" onClick={() => { window.umami?.track('feedback-skipped', { relationType: match.relation_type }); navigate('/messages') }}>
              Skip
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={saving || rating === 0}
              style={{ opacity: (saving || rating === 0) ? 0.5 : 1 }}
            >
              {saving ? 'Saving…' : 'Submit'}
            </button>
          </div>
        </div>
      </section>
    </Layout>
  )
}

const centreStyle = {
  minHeight: 'calc(100vh - 72px)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  padding: '4rem 1.5rem', gap: '2rem',
}
