import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import MatchList from '../components/messages/MatchList'
import Conversation from '../components/messages/Conversation'
import { useAuth } from '../lib/AuthContext'
import { getMatches } from '../lib/messages'
import { supabase } from '../lib/supabase'

export default function Messages() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [matches, setMatches] = useState([])
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [mobileShowConvo, setMobileShowConvo] = useState(false)

  useEffect(() => {
    if (!session && !loading) navigate('/auth')
  }, [session, loading])

  useEffect(() => {
    if (!profile) return
    getMatches(profile.id).then(async data => {
      setMatches(data)
      // Auto-select from query param e.g. /messages?match=uuid
      const matchId = searchParams.get('match')
      if (matchId) {
        const m = data.find(m => m.id === matchId)
        if (m) { setSelectedMatch(m); setMobileShowConvo(true) }
      } else if (data.length > 0) {
        setSelectedMatch(data[0])
      }
      setFetching(false)
    })
  }, [profile])

  function handleSelect(match) {
    setSelectedMatch(match)
    setMobileShowConvo(true)
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        </div>
      </Layout>
    )
  }

  if (!loading && session && !profile) {
    navigate('/onboarding', { replace: true })
    return null
  }

  return (
    <Layout>
      <div style={{
        maxWidth: 900, margin: '0 auto',
        height: 'calc(100vh - 72px)',
        display: 'flex', flexDirection: 'column',
        padding: '0 1.5rem',
      }}>
        <div className="messages-grid" style={{
          flex: 1, display: 'grid',
          gridTemplateColumns: '260px 1fr',
          border: '1px solid var(--border)',
          borderTop: 'none',
          background: '#fff',
          overflow: 'hidden',
        }}>
          {/* Sidebar */}
          <div style={{
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
          }} className={mobileShowConvo ? 'messages-sidebar hidden-mobile' : 'messages-sidebar'}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <p className="eyebrow">Connections</p>
            </div>
            {fetching
              ? <p style={{ padding: '1.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>Loading…</p>
              : <MatchList matches={matches} selectedId={selectedMatch?.id} onSelect={handleSelect} />
            }
          </div>

          {/* Conversation panel */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {mobileShowConvo && (
              <button
                onClick={() => setMobileShowConvo(false)}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', padding: '0.75rem 1rem', textAlign: 'left', cursor: 'pointer', fontSize: '0.82rem', borderBottom: '1px solid var(--border)' }}
                className="back-btn show-mobile"
              >
                ← Back
              </button>
            )}
            {selectedMatch ? (
              <Conversation
                match={selectedMatch}
                currentUserId={profile.id}
                hasFeedback={(() => {
                  const isA = selectedMatch.user_a_id === profile.id
                  const fb = isA ? selectedMatch.feedback_a : selectedMatch.feedback_b
                  return !!fb
                })()}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--muted)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.1rem' }}>
                  Select a connection to start messaging.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
