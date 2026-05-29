import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import MatchList from '../components/messages/MatchList'
import Conversation from '../components/messages/Conversation'
import { useAuth } from '../lib/AuthContext'
import { getMatches } from '../lib/messages'
import { supabase } from '../lib/supabase'
import { markMessagesRead, markMatchRead } from '../lib/useUnreadCount'
import { archiveMatch, unarchiveMatch, getArchivedMatchIds } from '../lib/archive'
import NotificationPrompt from '../components/messages/NotificationPrompt'
import PushModal from '../components/messages/PushModal'

export default function Messages() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [matches, setMatches] = useState([])
  const [archivedIds, setArchivedIds] = useState(new Set())
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [mobileShowConvo, setMobileShowConvo] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    if (!session && !loading) navigate('/auth')
  }, [session, loading])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.classList.add('messages-page')
    return () => {
      document.body.style.overflow = ''
      document.body.classList.remove('messages-page')
    }
  }, [])

  useEffect(() => {
    markMessagesRead()
  }, [])

  // Load matches + archived IDs together
  useEffect(() => {
    if (!profile) return
    Promise.all([
      getMatches(profile.id),
      getArchivedMatchIds(profile.id),
    ]).then(([data, archived]) => {
      setMatches(data)
      setArchivedIds(archived)

      const matchId = searchParams.get('match')
      if (matchId) {
        const m = data.find(m => m.id === matchId)
        if (m) {
          // Deep-linked match — show even if archived
          if (archived.has(m.id)) setShowArchived(true)
          markMatchRead(m.id)
          setSelectedMatch(m)
          setMobileShowConvo(true)
        }
      } else {
        // Auto-select first active (non-archived) match
        const first = data.find(m => !archived.has(m.id))
        if (first) { markMatchRead(first.id); setSelectedMatch(first) }
      }
      setFetching(false)
    })
  }, [profile])

  // Realtime: keep archivedIds in sync when DB changes
  // (covers auto-unarchive from the trigger + changes on other devices)
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`archive:${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_match_settings',
        filter: `user_id=eq.${profile.id}`,
      }, payload => {
        if (payload.eventType === 'DELETE') {
          const matchId = payload.old?.match_id
          if (matchId) setArchivedIds(prev => { const s = new Set(prev); s.delete(matchId); return s })
        } else {
          const matchId = payload.new?.match_id
          if (matchId) setArchivedIds(prev => new Set([...prev, matchId]))
        }
      })
      .subscribe()
    return () => channel.unsubscribe()
  }, [profile])

  function handleSelect(match) {
    markMatchRead(match.id)
    setSelectedMatch(match)
    setMobileShowConvo(true)
  }

  async function handleArchive() {
    if (!selectedMatch || !profile) return
    try {
      await archiveMatch(profile.id, selectedMatch.id)
      window.umami?.track('match-archived')
      setShowArchived(true)        // expand archived section so match is still reachable on desktop
      setMobileShowConvo(false)    // back to list on mobile
    } catch (err) {
      console.error('Archive failed:', err)
    }
  }

  async function handleUnarchive() {
    if (!selectedMatch || !profile) return
    try {
      await unarchiveMatch(profile.id, selectedMatch.id)
      window.umami?.track('match-unarchived')
    } catch (err) {
      console.error('Unarchive failed:', err)
    }
  }

  const activeMatches   = matches.filter(m => !archivedIds.has(m.id))
  const archivedMatches = matches.filter(m =>  archivedIds.has(m.id))

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
    <Layout hideFooter noScroll>
      <PushModal userId={profile?.id} />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <div
          style={{ maxWidth: 900, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', padding: '0 1.5rem', minHeight: 0, boxSizing: 'border-box' }}
          className="messages-outer"
        >
          <div className="messages-grid" style={{
            flex: 1, display: 'grid',
            gridTemplateColumns: '260px 1fr',
            border: '1px solid var(--border)',
            borderTop: 'none',
            background: '#fff',
            overflow: 'hidden',
            minHeight: 0,
          }}>

            {/* Sidebar */}
            <div
              style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
              className={`messages-sidebar${mobileShowConvo ? ' hidden-mobile' : ''}`}
            >
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <p className="eyebrow">Connections</p>
              </div>

              <NotificationPrompt userId={profile?.id} />

              {/* Active matches */}
              <div style={{ flex: 1 }}>
                {fetching
                  ? <p style={{ padding: '1.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>Loading…</p>
                  : activeMatches.length === 0 && archivedMatches.length === 0
                    ? <p style={{ padding: '1.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>No connections yet.</p>
                    : <MatchList
                        matches={activeMatches}
                        selectedId={selectedMatch?.id}
                        onSelect={handleSelect}
                        currentUserId={profile.id}
                      />
                }
              </div>

              {/* Archived section */}
              {!fetching && archivedMatches.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                  <button
                    onClick={() => setShowArchived(o => !o)}
                    style={{
                      width: '100%', textAlign: 'left', background: 'none', border: 'none',
                      cursor: 'pointer', padding: '0.75rem 1.25rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                      Archived ({archivedMatches.length})
                    </span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.62rem' }}>
                      {showArchived ? '▲' : '▼'}
                    </span>
                  </button>
                  {showArchived && (
                    <MatchList
                      matches={archivedMatches}
                      selectedId={selectedMatch?.id}
                      onSelect={handleSelect}
                      currentUserId={profile.id}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Conversation panel */}
            <div
              className={`messages-convo${!mobileShowConvo ? ' hidden-mobile' : ''}`}
              style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {selectedMatch ? (
                <Conversation
                  match={selectedMatch}
                  currentUserId={profile.id}
                  onBack={() => setMobileShowConvo(false)}
                  hasFeedback={(() => {
                    const isA = selectedMatch.user_a_id === profile.id
                    const fb = isA ? selectedMatch.feedback_a : selectedMatch.feedback_b
                    return !!fb
                  })()}
                  isArchived={archivedIds.has(selectedMatch.id)}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
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
      </div>
    </Layout>
  )
}
