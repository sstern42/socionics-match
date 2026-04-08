import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

export default function Typing() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()

  const [notes, setNotes]           = useState('')
  const [discord, setDiscord]         = useState('')
  const [status, setStatus]         = useState('idle') // idle | submitting | success | error | exists
  const [errorMsg, setErrorMsg]     = useState('')

  useEffect(() => {
    if (!loading && !session) navigate('/auth')
  }, [session, loading])

  useEffect(() => {
    if (!loading && session && !profile) navigate('/auth')
  }, [loading, session, profile])

  // Check for existing pending request
  useEffect(() => {
    if (!profile?.id) return
    async function checkExisting() {
      const { data } = await supabase
        .from('typing_requests')
        .select('id, status')
        .eq('user_id', profile.id)
        .in('status', ['pending', 'scheduled'])
        .maybeSingle()
      if (data) setStatus('exists')
    }
    checkExisting()
  }, [profile?.id])

  async function handleSubmit() {
    if (status === 'submitting') return
    if (!discord.trim()) {
      setErrorMsg('Please enter your Discord username so the typist can reach you.')
      return
    }
    setStatus('submitting')
    setErrorMsg('')

    const { error } = await supabase
      .from('typing_requests')
      .insert({ user_id: profile.id, notes: notes.trim() || null, discord_handle: discord.trim() || null })

    if (error) {
      setErrorMsg('Something went wrong. Please try again.')
      setStatus('error')
      return
    }

    window.umami?.track('typing-request-submitted')
    setStatus('success')
  }

  const containerStyle = {
    maxWidth: 520,
    margin: '0 auto',
    padding: '3rem 1.5rem',
  }

  const headingStyle = {
    fontSize: '1.8rem',
    fontWeight: 400,
    marginBottom: '0.5rem',
    color: 'var(--fg)',
  }

  const subStyle = {
    fontSize: '0.88rem',
    color: 'var(--muted)',
    marginBottom: '2rem',
    lineHeight: 1.6,
  }

  const cardStyle = {
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '1.5rem',
    marginBottom: '1.5rem',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.78rem',
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    marginBottom: '0.5rem',
  }

  const textareaStyle = {
    width: '100%',
    minHeight: 100,
    padding: '0.75rem',
    border: '1px solid var(--border)',
    borderRadius: 4,
    fontSize: '0.88rem',
    fontFamily: 'var(--serif)',
    color: 'var(--fg)',
    background: 'var(--bg)',
    resize: 'vertical',
    boxSizing: 'border-box',
  }

  const btnStyle = {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '0.75rem 1.5rem',
    fontSize: '0.82rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
    opacity: status === 'submitting' ? 0.6 : 1,
    width: '100%',
  }

  if (loading || !profile) return null

  return (
    <Layout>
      <div style={containerStyle}>
        <h1 style={headingStyle}>Get typed</h1>
        <p style={subStyle}>
          Not sure of your type, or want it confirmed by an expert? Book a one-to-one typing session
          with our resident typist via Discord voice call. A verified badge will be added to your profile on completion.
        </p>

        {/* What to expect */}
        <div style={cardStyle}>
          <p style={{ ...labelStyle, marginBottom: '1rem' }}>What to expect</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              ['Format', 'Discord voice call — fluent English required'],
              ['Duration', '1–2 hours'],
              ['Price', '$20 / £17'],
              ['Outcome', 'Verified badge on your profile'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '1rem', fontSize: '0.86rem' }}>
                <span style={{ color: 'var(--muted)', minWidth: 80 }}>{k}</span>
                <span style={{ color: 'var(--fg)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {status === 'success' ? (
          <div style={{ ...cardStyle, borderColor: 'var(--accent)', textAlign: 'center', padding: '2rem' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Request submitted ✓</p>
            <p style={{ fontSize: '0.86rem', color: 'var(--muted)' }}>
              You'll be contacted shortly to schedule your session.
            </p>
          </div>
        ) : status === 'exists' ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '2rem' }}>
            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>You already have a request in progress</p>
            <p style={{ fontSize: '0.86rem', color: 'var(--muted)' }}>
              You'll be contacted to schedule your session if you haven't been already.
            </p>
          </div>
        ) : (
          <div style={cardStyle}>
            <label style={labelStyle} htmlFor="typing-discord">
              Your Discord username <span style={{ color: "crimson" }}>*</span>
            </label>
            <input
              id="typing-discord"
              type="text"
              style={{ ...textareaStyle, minHeight: 'unset', padding: '0.6rem 0.75rem' }}
              placeholder="e.g. username or username#1234"
              required
              value={discord}
              onChange={e => setDiscord(e.target.value)}
              maxLength={100}
            />
            <label style={{ ...labelStyle, marginTop: '1rem' }} htmlFor="typing-notes">
              Anything to add? <span style={{ fontWeight: 300 }}>(optional)</span>
            </label>
            <textarea
              id="typing-notes"
              style={textareaStyle}
              placeholder="e.g. I've previously tested as INTJ on MBTI... I'm torn between ILI and LII..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={500}
            />
            {errorMsg && (
              <p style={{ fontSize: '0.82rem', color: 'crimson', marginTop: '0.5rem' }}>{errorMsg}</p>
            )}
            <button
              style={{ ...btnStyle, marginTop: '1rem' }}
              onClick={handleSubmit}
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'Submitting...' : 'Request a typing — $20 / £17'}
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.75rem', textAlign: 'center' }}>
              Payment is arranged after your session is confirmed.
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}
