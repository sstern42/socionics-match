import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ProfileCard from '../components/feed/ProfileCard'
import { useAuth } from '../lib/AuthContext'
import { getFeedProfiles, getExistingMatches, createMatch } from '../lib/feed'
import { sendMessage } from '../lib/messages'
import { RELATIONS } from '../data/relations'
import { supabase } from '../lib/supabase'

const BANNER_KEY = 'socion_announcement_dismissed_v'
const FOUNDER_FEED_KEY = 'socion_founder_feed_override'

export default function Feed() {
  const { session, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [announcement, setAnnouncement] = useState(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [memberCount, setMemberCount] = useState(null)
  const [shareState, setShareState] = useState('idle') // idle | copied

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
      .select('announcement, announcement_active, users')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data?.announcement_active && data?.announcement) {
          setAnnouncement(data.announcement)
          setBannerDismissed(localStorage.getItem(announcementKey(data.announcement)) === 'true')
        }
        if (data?.users) setMemberCount(data.users)
      })
  }, [])

  function dismissBanner() {
    if (!announcement) return
    localStorage.setItem(announcementKey(announcement), 'true')
    setBannerDismissed(true)
    window.umami?.track('announcement-dismissed')
  }

  function handleShare() {
    const url = 'https://socion.app'
    const text = `Match by Socionics type, not algorithm — ${memberCount ? memberCount + ' members' : 'growing fast'}`
    window.umami?.track('feed-share-clicked', { method: navigator.share ? 'native' : 'clipboard' })
    if (navigator.share) {
      navigator.share({ title: 'Socion', text, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareState('copied')
        setTimeout(() => setShareState('idle'), 2500)
      })
    }
  }


  const [profiles, setProfiles] = useState([])

  const [matchedMap, setMatchedMap] = useState({})
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState(null)
  const [filterRelation, setFilterRelation] = useState('ALL')
  const [showFilters, setShowFilters] = useState(false)
  const [filterLocation, setFilterLocation] = useState('anywhere')
  const [activeOnly, setActiveOnly] = useState(false)
  const [activeToday, setActiveToday] = useState(false)
  const [onlineNow, setOnlineNow] = useState(false)
  const [withPhotos, setWithPhotos] = useState(false)
  const [excludeAnon, setExcludeAnon] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [connectingId, setConnectingId] = useState(null)
  const [connectPrompt, setConnectPrompt] = useState(null) // { targetProfile }
  const [connectMessage, setConnectMessage] = useState('')
  const [connectError, setConnectError] = useState(null)
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

  function handleConnect(targetProfile) {
    setConnectPrompt({ targetProfile })
    setConnectMessage('')
    setConnectError(null)
  }

  async function handleConnectSubmit() {
    if (!profile || !connectPrompt) return
    const { targetProfile } = connectPrompt
    setConnectingId(targetProfile.id)
    setConnectError(null)
    try {
      const sharedPurpose = (profile.purpose ?? []).find(p => (targetProfile.purpose ?? []).includes(p))
        ?? (profile.purpose ?? [])[0]
        ?? 'dating'
      const newMatch = await createMatch({
        userAId: profile.id,
        userBId: targetProfile.id,
        relationType: targetProfile.relation,
        purpose: sharedPurpose.toLowerCase(),
      })
      await sendMessage({
        matchId: newMatch.id,
        senderId: profile.id,
        content: connectMessage.trim(),
      })
      setMatchedMap(prev => ({ ...prev, [targetProfile.id]: newMatch.id }))
      const isAnon = targetProfile.profile_data?.anonymous ?? false
      const displayName = isAnon ? 'Anonymous' : (targetProfile.profile_data?.name ?? targetProfile.type)
      setJustConnected(displayName)
      setTimeout(() => setJustConnected(null), 3000)
      setConnectPrompt(null)
      setConnectMessage('')
    } catch (err) {
      setConnectError(err.message)
    } finally {
      setConnectingId(null)
    }
  }

  if (loading || retrying) {
    return (
      <Layout noScroll hideFooter>
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

  const oneWeekAgo = new Date(Date.now() - 7 * 86400000)
  const oneDayAgo = new Date(Date.now() - 86400000)
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60000)
  const feedDisplayRelations = [...new Set(profiles.map(p => p.displayRelation ?? p.relation).filter(Boolean))]
  const displayed = profiles
    .filter(p => onlineNow ? (p.last_active && new Date(p.last_active) > fifteenMinsAgo && !p.profile_data?.hide_activity) : true)
    .filter(p => activeToday ? (p.last_active && new Date(p.last_active) > oneDayAgo && !p.profile_data?.hide_activity) : true)
    .filter(p => activeOnly ? (p.last_active && new Date(p.last_active) > oneWeekAgo && !p.profile_data?.hide_activity) : true)
    .filter(p => withPhotos ? !!p.avatar_url : true)
    .filter(p => excludeAnon ? !p.profile_data?.anonymous : true)
    .filter(p => verifiedOnly ? !!p.verified_by : true)
    .filter(p => filterRelation === 'ALL' ? true : (p.displayRelation ?? p.relation) === filterRelation)
    .filter(p => {
      if (filterLocation === 'anywhere') return true
      const myCountry = profile?.profile_data?.country
      const myCity = profile?.profile_data?.city?.toLowerCase().trim()
      if (filterLocation === 'same_country') return p.profile_data?.country === myCountry
      if (filterLocation === 'same_city') return myCity && p.profile_data?.city?.toLowerCase().trim() === myCity && p.profile_data?.country === myCountry
      return true
    })

  return (
    <Layout noScroll hideFooter>
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
            {(() => {
              const activeCount = [withPhotos, excludeAnon, activeOnly, activeToday, onlineNow, verifiedOnly, filterLocation !== 'anywhere'].filter(Boolean).length
              return (
                <>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.6rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`rel-pill clickable${showFilters || activeCount > 0 ? ' active' : ''}`}
                      onClick={() => setShowFilters(v => !v)}
                      style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                      Filters
                      {activeCount > 0 && (
                        <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.6rem', fontWeight: 600, padding: '0.05rem 0.35rem', borderRadius: 10, lineHeight: 1.6 }}>{activeCount}</span>
                      )}
                    </button>
                    {activeCount > 0 && (
                      <button
                        type="button"
                        onClick={() => { setWithPhotos(false); setExcludeAnon(false); setActiveOnly(false); setActiveToday(false); setOnlineNow(false); setFilterLocation('anywhere'); setVerifiedOnly(false) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: 'var(--muted)', padding: 0, textDecoration: 'underline' }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {showFilters && (
                    <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>Profile</p>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button type="button" className={`rel-pill clickable${withPhotos ? ' active' : ''}`} onClick={() => setWithPhotos(v => !v)} style={{ fontSize: '0.7rem' }}>
                            {withPhotos ? '✓ ' : ''}With photos
                          </button>
                          <button type="button" className={`rel-pill clickable${excludeAnon ? ' active' : ''}`} onClick={() => setExcludeAnon(v => !v)} style={{ fontSize: '0.7rem' }}>
                            {excludeAnon ? '✓ ' : ''}Known users only
                          </button>
                          <button type="button" className={`rel-pill clickable${verifiedOnly ? ' active' : ''}`} onClick={() => setVerifiedOnly(v => !v)} style={{ fontSize: '0.7rem' }}>
                            {verifiedOnly ? '✓ ' : ''}Verified types only
                          </button>
                        </div>
                      </div>
                      <div style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>Activity</p>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button type="button" className={`rel-pill clickable${activeOnly ? ' active' : ''}`} onClick={() => { setActiveOnly(v => !v); setActiveToday(false); setOnlineNow(false) }} style={{ fontSize: '0.7rem' }}>
                            {activeOnly ? '✓ ' : ''}This week
                          </button>
                          <button type="button" className={`rel-pill clickable${activeToday ? ' active' : ''}`} onClick={() => { setActiveToday(v => !v); setActiveOnly(false); setOnlineNow(false) }} style={{ fontSize: '0.7rem' }}>
                            {activeToday ? '✓ ' : ''}Today
                          </button>
                          <button type="button" className={`rel-pill clickable${onlineNow ? ' active' : ''}`} onClick={() => { setOnlineNow(v => !v); setActiveOnly(false); setActiveToday(false) }} style={{ fontSize: '0.7rem' }}>
                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#4caf50', marginRight: '0.3rem', verticalAlign: 'middle', marginBottom: 1 }} />
                            {onlineNow ? '✓ ' : ''}Online now
                          </button>
                        </div>
                      </div>
                      <div style={{ padding: '0.65rem 0.85rem' }}>
                        <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>Location</p>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button type="button" className={`rel-pill clickable${filterLocation === 'anywhere' ? ' active' : ''}`} onClick={() => setFilterLocation('anywhere')} style={{ fontSize: '0.7rem' }}>🌍 Anywhere</button>
                          <button type="button" className={`rel-pill clickable${filterLocation === 'same_country' ? ' active' : ''}`} onClick={() => setFilterLocation('same_country')} style={{ fontSize: '0.7rem' }}>{filterLocation === 'same_country' ? '✓ ' : ''}Same country</button>
                          <button type="button" className={`rel-pill clickable${filterLocation === 'same_city' ? ' active' : ''}`} onClick={() => setFilterLocation('same_city')} style={{ fontSize: '0.7rem' }}>{filterLocation === 'same_city' ? '✓ ' : ''}Same city</button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
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
            {displayed.map((p, i) => (
              <>
                <ProfileCard
                  key={p.id}
                  profile={p}
                  onConnect={handleConnect}
                  alreadyMatched={p.id in matchedMap}
                  matchId={matchedMap[p.id] ?? null}
                  connecting={connectingId === p.id}
                />
                {i === 4 && (
                  <div key="share-nudge" style={{
                    border: '1px solid var(--accent)',
                    borderRadius: 6,
                    padding: '1.5rem',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.85rem',
                    background: 'rgba(154,111,56,0.06)',
                  }}>
                    <p style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, margin: 0 }}>
                      Spread the word
                    </p>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.6, margin: 0, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
                      Know someone who'd be into this?
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                      {memberCount ? `${memberCount} members and growing.` : 'Growing every day.'} Spread the word and help us find the missing types.
                    </p>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="btn-primary"
                      style={{ fontSize: '0.78rem', padding: '0.45rem 1rem', alignSelf: 'flex-start', whiteSpace: 'nowrap' }}
                    >
                      {shareState === 'copied' ? '✓ Link copied' : navigator.share ? 'Share Socion →' : 'Copy link'}
                    </button>
                  </div>
                )}

                {i === 9 && (
                  <div key="discord-nudge" style={{
                    border: '1px solid var(--accent)',
                    borderRadius: 6,
                    padding: '1.5rem',
                    display: 'flex', flexDirection: 'column', gap: '0.85rem',
                    background: 'rgba(154,111,56,0.06)',
                  }}>
                    <p style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, margin: 0 }}>
                      Community
                    </p>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.6, margin: 0, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
                      Chat beyond the app
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                      Join the Socion Discord to discuss types, dynamics, and everything Socionics with the community.
                    </p>
                    <a
                      href="https://discord.gg/328KxsDKdr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      onClick={() => window.umami?.track('feed-discord-clicked')}
                      style={{ fontSize: '0.78rem', padding: '0.45rem 1rem', alignSelf: 'flex-start', whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block' }}
                    >
                      Join Discord →
                    </a>
                  </div>
                )}

                {i === 14 && (
                  <div key="kofi-nudge" style={{
                    border: '1px solid var(--accent)',
                    borderRadius: 6,
                    padding: '1.5rem',
                    display: 'flex', flexDirection: 'column', gap: '0.85rem',
                    background: 'rgba(154,111,56,0.06)',
                  }}>
                    <p style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, margin: 0 }}>
                      Support Socion
                    </p>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.6, margin: 0, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
                      Socion is free and will stay that way
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                      No algorithm, no premium tier. If it's been useful, a one-time tip helps cover the running costs.
                    </p>
                    <a
                      href="https://ko-fi.com/socion"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                      onClick={() => window.umami?.track('feed-kofi-clicked')}
                      style={{ fontSize: '0.78rem', padding: '0.45rem 1rem', alignSelf: 'flex-start', whiteSpace: 'nowrap', textDecoration: 'none', display: 'inline-block' }}
                    >
                      Support ☕ →
                    </a>
                  </div>
                )}
              </>
            ))}
          </div>
        )}
      </section>

      {connectPrompt && (() => {
        const { targetProfile } = connectPrompt
        const isAnon = targetProfile.profile_data?.anonymous ?? false
        const targetName = isAnon ? 'Anonymous' : (targetProfile.profile_data?.name ?? targetProfile.type)
        const question = targetProfile.profile_data?.connection_question
        const label = question || 'Introduce yourself — what brings you to Socion?'
        const isConnecting = connectingId === targetProfile.id
        return (
          <div
            onClick={() => !isConnecting && (setConnectPrompt(null), setConnectMessage(''))}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.75rem', width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.4rem' }}>
                  Connecting with {targetName}
                </p>
                <p style={{ fontSize: '0.95rem', fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>
                  {label}
                </p>
              </div>
              <textarea
                className="input-standalone"
                placeholder="Write your message…"
                value={connectMessage}
                onChange={e => setConnectMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && connectMessage.trim().length >= 10 && handleConnectSubmit()}
                rows={4}
                autoFocus
                disabled={isConnecting}
                style={{ resize: 'none', fontFamily: 'var(--sans)', lineHeight: 1.6 }}
              />
              {connectMessage.trim().length < 10 && (
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: 0, textAlign: 'right' }}>
                  {10 - connectMessage.trim().length} more character{10 - connectMessage.trim().length !== 1 ? 's' : ''} to unlock Send
                </p>
              )}
              {connectError && <p style={{ fontSize: '0.82rem', color: '#c0392b', margin: 0 }}>{connectError}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => { setConnectPrompt(null); setConnectMessage('') }}
                  disabled={isConnecting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConnectSubmit}
                  disabled={isConnecting || connectMessage.trim().length < 10}
                  style={{ opacity: (isConnecting || connectMessage.trim().length < 10) ? 0.5 : 1 }}
                >
                  {isConnecting ? 'Connecting…' : 'Send & connect'}
                </button>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center', margin: 0 }}>
                Ctrl + Enter to send
              </p>
            </div>
          </div>
        )
      })()}
    </Layout>
  )
}

const centreStyle = {
  minHeight: 'calc(100vh - 72px)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  gap: '1.5rem', padding: '2rem', textAlign: 'center',
}
