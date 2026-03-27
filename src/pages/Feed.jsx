import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ProfileCard from '../components/feed/ProfileCard'
import { useAuth } from '../lib/AuthContext'
import { getFeedProfiles, getExistingMatches, createMatch } from '../lib/feed'
import { RELATIONS } from '../data/relations'
import { supabase } from '../lib/supabase'

const BANNER_KEY = 'socion_announcement_dismissed_v'
const FOUNDER_FEED_KEY = 'socion_founder_feed_override'

export default function Feed() {
  const { session, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [announcement, setAnnouncement] = useState(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  function announcementKey(text) {
    try {
      return BANNER_KEY + btoa(encodeURIComponent(text)).slice(0, 8)
    } catch {
      return BANNER_KEY + text.length
    }
  }

  useEffect(() => {
    supabase
      .from('stats')
      .select('announcement, announcement_active')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data?.announcement_active && data?.announcement) {
          setAnnouncement(data.announcement)
          setBannerDismissed(localStorage.getItem(announcementKey(data.announcement)) === 'true')
        }
      })
  }, [])

  function dismissBanner() {
    if (!announcement) return
    localStorage.setItem(announcementKey(announcement), 'true')
    setBannerDismissed(true)
  }

  const [profiles, setProfiles] = useState([])
  const [matchedMap, setMatchedMap] = useState({})
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState(null)
  const [filterRelation, setFilterRelation] = useState('ALL')
  const [activeOnly, setActiveOnly] = useState(false)
  const [withPhotos, setWithPhotos] = useState(false)
  const [connectingId, setConnectingId] = useState(null)
  const [justConnected, setJustConnected] = useState(null)
  const [showCard, setShowCard] = useState(false)

  const [retrying, setRetrying] = useState(false)
  const [retried, setRetried] = useState(false)

  useEffect(() => {
    if (!loading && !session) navigate('/auth')
  }, [session, loading])

  useEffect(() => {
    if (!loading && session && !profile && !retried && !retrying) {
      setRetrying(true)
      setRetried(true)
      refreshProfile().finally(() => setRetrying(false))
    }
  }, [loading, session, profile, retried, retrying])

  // Run loadFeed when profile is available.
  // Using profile?.id + loading covers both:
  // - profile arriving after mount (id changes)
  // - profile already in context when mounted (runs immediately on mount)
  // Redirect to /auth if magic link has expired — preserves hash so Auth can show the message
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('error=access_denied') || hash.includes('error_code=otp_expired')) {
      navigate('/auth' + hash, { replace: true })
    }
  }, [])

  const hasFetched = useRef(false)
  useEffect(() => {
    if (!loading && profile && !hasFetched.current) {
      hasFetched.current = true
      loadFeed()
    }
  }, [profile?.id, loading])

  async function loadFeed() {
    if (!profile) return
    setFetching(true)
    setError(null)
    try {
      const [feedData, existingMatches] = await Promise.all([
        getFeedProfiles({
          userType: profile.type,
          relationPreferences: profile.relation_preferences ?? [],
          userPurpose: localStorage.getItem(FOUNDER_FEED_KEY) === 'true' ? [] : (profile.purpose ?? []),
          currentUserId: profile.id,
        }),
        getExistingMatches(profile.id),
      ])
      setProfiles(feedData)

      const map = {}
      for (const m of existingMatches) {
        const otherId = m.user_a_id === profile.id ? m.user_b_id : m.user_a_id
        map[otherId] = m.id
      }
      setMatchedMap(map)
    } catch (err) {
      setError(err.message)
    } finally {
      setFetching(false)
    }
  }

  async function handleConnect(targetProfile) {
    if (!profile) return
    setConnectingId(targetProfile.id)
    try {
      const newMatch = await createMatch({
        userAId: profile.id,
        userBId: targetProfile.id,
        relationType: targetProfile.relation,
      })
      setMatchedMap(prev => ({ ...prev, [targetProfile.id]: newMatch.id }))
      setJustConnected(targetProfile.profile_data?.name ?? targetProfile.type)
      setTimeout(() => setJustConnected(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setConnectingId(null)
    }
  }

  if (loading || retrying) {
    return (
      <Layout>
        <section style={centreStyle}>
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        </section>
      </Layout>
    )
  }

  if (!loading && !retrying && session && !profile) {
    navigate('/onboarding', { replace: true })
    return null
  }

  // Pills show displayRelation (what they are to you); filter still uses relation (your role)
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000)
  const feedDisplayRelations = [...new Set(profiles.map(p => p.displayRelation ?? p.relation).filter(Boolean))]
  const displayed = profiles
    .filter(p => activeOnly ? (p.last_active && new Date(p.last_active) > oneWeekAgo) : true)
    .filter(p => withPhotos ? !!p.avatar_url : true)
    .filter(p => filterRelation === 'ALL' ? true : (p.displayRelation ?? p.relation) === filterRelation)

  return (
    <Layout>
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2.5rem' }}>
          <p className="eyebrow">Your matches</p>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3.5rem)', marginTop: '0.4rem' }}>
            {profile?.type} — <em>finding your dynamic</em>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
            Showing profiles whose type produces your selected relation{profile?.relation_preferences?.length !== 1 ? 's' : ''} with <strong>{profile?.type}</strong>.
          </p>
          <button
            type="button"
            onClick={() => setShowCard(c => !c)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.75rem', padding: 0 }}
          >
            {showCard ? 'Hide your card ↑' : 'How you appear to others ↓'}
          </button>
          {showCard && (
            <div style={{ marginTop: '1rem', maxWidth: 340 }}>
              <ProfileCard
                profile={{
                  ...profile,
                  profile_data: profile.profile_data,
                  relation: null,
                  displayRelation: null,
                }}
                onConnect={() => {}}
                alreadyMatched={false}
                matchId={null}
                connecting={false}
              />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => navigate('/profile/edit')}
                style={{ marginTop: '0.75rem', width: '100%', padding: '0.6rem', fontSize: '0.78rem' }}
              >
                Edit profile →
              </button>
            </div>
          )}
        </div>

        {announcement && !bannerDismissed && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
            background: 'rgba(154,111,56,0.07)', border: '1px solid var(--accent-lt)',
            borderRadius: 4, padding: '0.75rem 1rem', marginBottom: '1.5rem',
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.6 }}>
              👋 {announcement.split(/(https?:\/\/[^\s]+|discord\.gg\/[^\s]+)/g).map((part, i) =>
                /^https?:\/\/|^discord\.gg\//.test(part)
                  ? <a key={i} href={part.startsWith('http') ? part : `https://${part}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{part}</a>
                  : part
              )}
            </p>
            <button
              type="button"
              onClick={dismissBanner}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem', flexShrink: 0, padding: '0 0.25rem', lineHeight: 1 }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {feedDisplayRelations.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
            {/* Relation filter row */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className={`rel-pill clickable${filterRelation === 'ALL' ? ' active' : ''}`} onClick={() => setFilterRelation('ALL')}>
                All ({profiles.length})
              </button>
              {feedDisplayRelations.map(rel => (
                <button type="button" key={rel} className={`rel-pill clickable${filterRelation === rel ? ' active' : ''}`} onClick={() => setFilterRelation(rel)}>
                  {RELATIONS[rel]?.name} ({profiles.filter(p => (p.displayRelation ?? p.relation) === rel).length})
                </button>
              ))}
            </div>
            {/* Attribute toggle row */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`rel-pill clickable${withPhotos ? ' active' : ''}`}
                onClick={() => setWithPhotos(v => !v)}
                style={{ fontSize: '0.7rem' }}
              >
                {withPhotos ? '✓ ' : ''}With photos
              </button>
              <button
                type="button"
                className={`rel-pill clickable${activeOnly ? ' active' : ''}`}
                onClick={() => setActiveOnly(v => !v)}
                style={{ fontSize: '0.7rem' }}
              >
                {activeOnly ? '✓ ' : ''}Active this week
              </button>
            </div>
          </div>
        )}

        {justConnected && (
          <div style={{ background: 'rgba(154,111,56,0.1)', border: '1px solid var(--accent-lt)', borderRadius: 4, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.88rem', color: 'var(--accent)' }}>
            Connected with {justConnected}. Click Message → to start a conversation.
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 4, padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
            <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Something went wrong loading the feed:</p>
            <p style={{ color: '#c0392b', fontSize: '0.78rem', fontFamily: 'monospace' }}>{error}</p>
            <button type="button" className="btn-ghost" style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', fontSize: '0.78rem' }} onClick={loadFeed}>Try again</button>
          </div>
        )}

        {fetching ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '4rem 0' }}>Finding matches…</p>
        ) : displayed.length === 0 && !error ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p className="eyebrow" style={{ marginBottom: '1rem' }}>No matches yet</p>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '2rem', marginBottom: '1rem' }}>The community is <em>growing</em></h2>
            <p style={{ color: 'var(--muted)', maxWidth: 400, margin: '0 auto 0.75rem' }}>No profiles match your selected dynamics yet.</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
              Selected relations: <strong>{profile?.relation_preferences?.join(', ') || 'none'}</strong>
            </p>
            <button type="button" className="btn-ghost" onClick={() => navigate('/profile/edit')}>Update preferences</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {displayed.map(p => (
              <ProfileCard
                key={p.id}
                profile={p}
                onConnect={handleConnect}
                alreadyMatched={p.id in matchedMap}
                matchId={matchedMap[p.id] ?? null}
                connecting={connectingId === p.id}
              />
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}

const centreStyle = {
  minHeight: 'calc(100vh - 72px)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  gap: '1.5rem', padding: '2rem', textAlign: 'center',
}
