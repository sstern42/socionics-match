import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import ProfileCard from '../components/feed/ProfileCard'
import MiniProfileCard from '../components/feed/MiniProfileCard'
import FeedAd from '../components/feed/FeedAd'
import SwipeDeck from '../components/feed/SwipeDeck'
import MatchModal from '../components/feed/MatchModal'
import SeekingYou from '../components/feed/SeekingYou'
import SIWebview from '../components/SIWebview'
import { useAuth } from '../lib/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { getFeedProfiles, getExistingMatches, createMatch } from '../lib/feed'
import { sendMessage } from '../lib/messages'
import { hasLapsedReferralPremium } from '../lib/premium'
import { RELATIONS, MATRIX, QUADRAS, getQuadra } from '../data/relations'
import { supabase } from '../lib/supabase'

const BANNER_KEY = 'socion_announcement_dismissed_v'
const FOUNDER_FEED_KEY = 'socion_founder_feed_override'
const AD_DISMISSED_KEY = 'socion_feed_ad_dismissed'
const FEED_MODE_KEY = 'socion_feed_mode'
const PAGE_SIZE = 20

const FEED_LOADER_STEPS = [
  'Reading your type preferences…',
  'Computing intertype relations…',
  'Finding your dynamics…',
  'Almost there…',
]

function FeedLoader() {
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 85) { clearInterval(progressInterval); return p }
        return p + 2
      })
    }, 55)
    const stepInterval = setInterval(() => {
      setStep(s => Math.min(s + 1, FEED_LOADER_STEPS.length - 1))
    }, 700)
    return () => {
      clearInterval(progressInterval)
      clearInterval(stepInterval)
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '4rem 2rem' }}>
      <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.05rem', color: 'var(--text)', transition: 'opacity 0.3s' }}>
        {FEED_LOADER_STEPS[step]}
      </p>
      <div style={{ width: 220, height: 2, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'var(--accent)',
          borderRadius: 2,
          transition: 'width 0.08s linear',
        }} />
      </div>
    </div>
  )
}

function FeedFreshness({ updatedAt, onRefresh, refreshing }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const elapsed = Date.now() - updatedAt
  const mins = Math.floor(elapsed / 60_000)
  const label = mins < 1 ? 'just now' : mins === 1 ? '1 min ago' : `${mins} min ago`

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      title="Refresh feed"
      style={{
        background: 'none', border: 'none', cursor: refreshing ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '0.3rem',
        fontSize: '0.78rem', color: 'var(--muted)', padding: 0,
        opacity: refreshing ? 0.5 : 1, transition: 'opacity 0.15s',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
        }}
      >↻</span>
      {label}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </button>
  )
}

export default function Feed() {
  usePageTitle('Browse Matches')
  const { session, profile, loading, refreshProfile, isPremium } = useAuth()
  const navigate = useNavigate()

  const [announcement, setAnnouncement] = useState(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [memberCount, setMemberCount] = useState(null)
  const [shareState, setShareState] = useState('idle')
  const [webviewUrl, setWebviewUrl] = useState(null)
  const [dismissedAds, setDismissedAds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(AD_DISMISSED_KEY) || '{}') }
    catch { return {} }
  })

  const [swipeMode, setSwipeMode] = useState(() => localStorage.getItem(FEED_MODE_KEY) === 'swipe')
  const [matchData, setMatchData] = useState(null)

  // Swipe mode — add body class so preamble hides and on mobile deck covers viewport
  useEffect(() => {
    if (swipeMode) {
      document.body.classList.add('swipe-mode-active')
    } else {
      document.body.classList.remove('swipe-mode-active')
    }
    return () => document.body.classList.remove('swipe-mode-active')
  }, [swipeMode])

  function toggleFeedMode() {
    const next = !swipeMode
    setSwipeMode(next)
    localStorage.setItem(FEED_MODE_KEY, next ? 'swipe' : 'browse')
    window.umami?.track('feed-mode-toggled', { mode: next ? 'swipe' : 'browse' })
  }

  function dismissAd(adId) {
    const next = { ...dismissedAds, [adId]: true }
    setDismissedAds(next)
    try { localStorage.setItem(AD_DISMISSED_KEY, JSON.stringify(next)) } catch {}
  }

  function announcementKey(text) {
    try { return BANNER_KEY + btoa(encodeURIComponent(text)).slice(0, 8) }
    catch { return BANNER_KEY + text.length }
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

  const [extraProfiles, setExtraProfiles] = useState([])
  const [savedIds, setSavedIds] = useState(new Set())
  const [matchedMap, setMatchedMap] = useState({})
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [feedExhausted, setFeedExhausted] = useState(false)
  const [feedTotal, setFeedTotal] = useState(null)
  const [relationCounts, setRelationCounts] = useState({})
  const [filterRelation, setFilterRelation] = useState('ALL')
  const [filterQuadra, setFilterQuadra] = useState('ALL')
  const [showRelations, setShowRelations] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterPurpose, setFilterPurpose] = useState('ALL')
  const [filterLocation, setFilterLocation] = useState('anywhere')
  const [activeOnly, setActiveOnly] = useState(false)
  const [activeToday, setActiveToday] = useState(false)
  const [onlineNow, setOnlineNow] = useState(false)
  const [withPhotos, setWithPhotos] = useState(false)
  const [withBio, setWithBio] = useState(false)
  const [excludeAnon, setExcludeAnon] = useState(true)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [connectingId, setConnectingId] = useState(null)
  const [connectPrompt, setConnectPrompt] = useState(null)
  const [connectMessage, setConnectMessage] = useState('')
  const [connectError, setConnectError] = useState(null)
  const [capModal, setCapModal] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retried, setRetried] = useState(false)
  const [newMembersAvailable, setNewMembersAvailable] = useState(false)

  const offsetRef = useRef(0)
  // Tracks cards swiped this session so they don't reappear if profiles refresh mid-session
  const swipedIdsRef = useRef(new Set())
  const queryClient = useQueryClient()

  const feedQueryKey = ['feed', profile?.id, JSON.stringify(profile?.relation_preferences), JSON.stringify(profile?.purpose), isPremium]

  const { isFetching: fetching, error: feedError, dataUpdatedAt, refetch: refetchFeed } = useQuery({
    queryKey: feedQueryKey,
    queryFn: async () => {
      offsetRef.current = 0
      const [feedResult, existingMatches, savedResult] = await Promise.all([
        getFeedProfiles({
          userType: profile.type,
          relationPreferences: profile.relation_preferences ?? [],
          userPurpose: localStorage.getItem(FOUNDER_FEED_KEY) === 'true' ? [] : (profile.purpose ?? []),
          currentUserId: profile.id,
          isPremium,
          limit: PAGE_SIZE,
          offset: 0,
        }),
        getExistingMatches(profile.id),
        supabase.rpc('get_saved_profile_ids'),
      ])
      const map = {}
      for (const m of existingMatches) {
        const otherId = m.user_a_id === profile.id ? m.user_b_id : m.user_a_id
        map[otherId] = m.id
      }
      return {
        profiles: feedResult.profiles,
        hasMore: feedResult.hasMore,
        total: feedResult.total,
        matchedMap: map,
        savedIds: new Set((savedResult.data ?? []).map(r => r.saved_user_id)),
        relationCounts: feedResult.relationCounts ?? {},
      }
    },
    enabled: !!profile && !loading,
    staleTime: 5 * 60 * 1000,
  })

  const error = feedError?.message ?? null

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

  useEffect(() => {
    function handleNewMember() { setNewMembersAvailable(true) }
    window.addEventListener('socion-new-member', handleNewMember)
    return () => window.removeEventListener('socion-new-member', handleNewMember)
  }, [])

  useEffect(() => {
    if (!profile?.id) return
    const channel = supabase
      .channel(`matches:incoming:${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
        filter: `user_b_id=eq.${profile.id}`,
      }, async (payload) => {
        const matchRow = payload.new
        const otherId = matchRow.user_a_id
        if (otherId in matchedMap) return
        const { data: otherProfile } = await supabase
          .from('users')
          .select('id, type, profile_data, avatar_url, verified_by')
          .eq('id', otherId)
          .maybeSingle()
        if (!otherProfile) return
        setMatchedMap(prev => ({ ...prev, [otherId]: matchRow.id }))
        setMatchData({
          profile: otherProfile,
          relationType: matchRow.relation_type,
          matchId: matchRow.id,
        })
        window.umami?.track('swipe-match-modal-shown-incoming', { relationType: matchRow.relation_type })
      })
      .subscribe()
    return () => channel.unsubscribe()
  }, [profile?.id])

  const { data: feedData } = useQuery({ queryKey: feedQueryKey, enabled: false })

  // Derive profiles directly from cache so cache hits render without a flash
  const profiles = [...(feedData?.profiles ?? []), ...extraProfiles]

  // Sync secondary state from feedData (matchedMap, savedIds, hasMore)
  const prevFeedData = useRef(null)
  useEffect(() => {
    if (!feedData || feedData === prevFeedData.current) return
    prevFeedData.current = feedData
    setHasMore(feedData.hasMore)
    setFeedTotal(feedData.total ?? null)
    setMatchedMap(prev => ({ ...feedData.matchedMap, ...prev }))
    setSavedIds(feedData.savedIds)
    if (feedData.relationCounts) setRelationCounts(feedData.relationCounts)
    setExtraProfiles([])
    offsetRef.current = PAGE_SIZE
    setFeedExhausted(false)
    // Seed swipedIdsRef from DB history for cross-device sync (additive — keeps current session swipes)
    if (feedData.allSwipedIds) {
      feedData.allSwipedIds.forEach(id => swipedIdsRef.current.add(id))
    }
  }, [feedData])

  function loadFeed() {
    setFeedExhausted(false)
    setNewMembersAvailable(false)
    queryClient.invalidateQueries({ queryKey: feedQueryKey })
  }

  async function loadMore(limit = PAGE_SIZE) {
    if (!profile || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const feedResult = await getFeedProfiles({
        userType: profile.type,
        relationPreferences: profile.relation_preferences ?? [],
        userPurpose: localStorage.getItem(FOUNDER_FEED_KEY) === 'true' ? [] : (profile.purpose ?? []),
        currentUserId: profile.id,
        isPremium,
        limit,
        offset: offsetRef.current,
      })
      setExtraProfiles(prev => [...prev, ...feedResult.profiles])
      setHasMore(feedResult.hasMore)
      setFeedTotal(feedResult.total ?? null)
      if (!feedResult.hasMore) setFeedExhausted(true)
      offsetRef.current += limit
      window.umami?.track('feed-load-more', { offset: offsetRef.current, limit })
    } catch (err) {
      console.error('feed load-more failed', err)
    } finally {
      setLoadingMore(false)
    }
  }

  function handleToggleSave(userId, nowSaved) {
    setSavedIds(prev => {
      const next = new Set(prev)
      nowSaved ? next.add(userId) : next.delete(userId)
      return next
    })
  }

  function handleConnect(targetProfile) {
    if (!isPremium && Object.keys(matchedMap).length >= 3) {
      window.umami?.track('connection-cap-hit')
      setCapModal(true)
      return
    }
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
      setConnectPrompt(null)
      setConnectMessage('')
      navigate('/messages')
    } catch (err) {
      const isCapBlocked = err.code === '42501' || /row-level security|connection cap reached/i.test(err.message ?? '')
      setConnectError(
        isCapBlocked
          ? "This person has reached their connection limit right now, so you can't connect just yet. Try again later!"
          : err.message
      )
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
  const oneDayAgo  = new Date(Date.now() - 86400000)
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60000)
  const connectionCount = Object.keys(matchedMap).length
  const feedDisplayRelations = Object.keys(relationCounts).length > 0
    ? Object.keys(relationCounts)
    : [...new Set(profiles.map(p => p.displayRelation ?? p.relation).filter(Boolean))]
  const displayed = profiles
    .filter(p => onlineNow    ? (p.last_active && new Date(p.last_active) > fifteenMinsAgo && !p.profile_data?.hide_activity) : true)
    .filter(p => activeToday  ? (p.last_active && new Date(p.last_active) > oneDayAgo      && !p.profile_data?.hide_activity) : true)
    .filter(p => activeOnly   ? (p.last_active && new Date(p.last_active) > oneWeekAgo     && !p.profile_data?.hide_activity) : true)
    .filter(p => withPhotos   ? !!p.avatar_url : true)
    .filter(p => withBio      ? !!p.profile_data?.bio?.trim() : true)
    .filter(p => excludeAnon  ? !p.profile_data?.anonymous : true)
    .filter(p => verifiedOnly ? !!p.verified_by : true)
    .filter(p => filterRelation === 'ALL' ? true : (p.displayRelation ?? p.relation) === filterRelation)
    .filter(p => filterQuadra === 'ALL' ? true : getQuadra(p.type) === filterQuadra)
    .filter(p => filterPurpose === 'ALL' ? true : (p.purpose ?? []).includes(filterPurpose))
    .filter(p => {
      if (filterLocation === 'anywhere') return true
      const myCountry = profile?.profile_data?.country
      const myCity    = profile?.profile_data?.city?.toLowerCase().trim()
      if (filterLocation === 'same_country') return p.profile_data?.country === myCountry
      if (filterLocation === 'same_city')    return myCity && p.profile_data?.city?.toLowerCase().trim() === myCity && p.profile_data?.country === myCountry
      return true
    })

  const activityStats = (() => {
    let online = 0, today = 0
    for (const p of displayed) {
      if (!p.last_active || p.profile_data?.hide_activity) continue
      const diff = Date.now() - new Date(p.last_active).getTime()
      if (diff < 15 * 60 * 1000) online++
      else if (diff < 24 * 60 * 60 * 1000) today++
    }
    return { online, today }
  })()

  return (
    <Layout noScroll hideFooter>
      <div className="feed-layout" style={{ maxWidth: 1240, margin: '0 auto', width: '100%' }}>

        {/* Desktop-only persistent sidebar — compact profile widget, room for future widgets */}
        <aside className="feed-sidebar">
          <MiniProfileCard
            profile={profile}
            isPremium={isPremium}
            connectionCount={connectionCount}
            savedCount={savedIds.size}
            previewOpen={showCard}
            onTogglePreview={() => setShowCard(c => !c)}
          />
          {showCard && (
            <div style={{ marginTop: '0.75rem' }}>
              <ProfileCard
                profile={{ ...profile, profile_data: profile.profile_data, relation: null, displayRelation: null }}
                onConnect={() => {}}
                alreadyMatched={false}
                matchId={null}
                connecting={false}
              />
            </div>
          )}
        </aside>

      <section className="feed-main" style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' }}>

        {/* Header */}
        {/* Browse / Swipe toggle — always visible */}
        <div className="feed-mode-toggle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          {swipeMode && (
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>
              ← pass &nbsp;·&nbsp; like → &nbsp;·&nbsp; ↩ skip
            </p>
          )}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => { setSwipeMode(false); localStorage.setItem(FEED_MODE_KEY, 'browse') }}
              style={{
                padding: '0.45rem 0.9rem', border: 'none', cursor: 'pointer',
                fontSize: '0.72rem', fontFamily: 'var(--sans)', fontWeight: 500,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                background: !swipeMode ? 'var(--accent)' : 'transparent',
                color:      !swipeMode ? '#fff' : 'var(--muted)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              Browse
            </button>
            <button
              type="button"
              onClick={() => { setSwipeMode(true); localStorage.setItem(FEED_MODE_KEY, 'swipe') }}
              style={{
                padding: '0.45rem 0.9rem', border: 'none', cursor: 'pointer',
                fontSize: '0.72rem', fontFamily: 'var(--sans)', fontWeight: 500,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                background: swipeMode ? 'var(--accent)' : 'transparent',
                color:      swipeMode ? '#fff' : 'var(--muted)',
                transition: 'background 0.15s, color 0.15s',
                borderLeft: '1px solid var(--border)',
              }}
            >
              Swipe
            </button>
          </div>
        </div>

        <div className="feed-header" style={{ marginBottom: '2.5rem' }}>
          <p className="eyebrow">Your matches</p>
          <div style={{ marginTop: '0.4rem' }}>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3.5rem)' }}>
              {profile?.type} — <em>finding your dynamic</em>
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {activityStats && activityStats.online > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf50', display: 'inline-block', flexShrink: 0 }} />
                {activityStats.online} online now
              </span>
            )}
            {activityStats && activityStats.today > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f5a623', display: 'inline-block', flexShrink: 0 }} />
                {activityStats.today} active today
              </span>
            )}
            {dataUpdatedAt > 0 && (
              <>
                {(activityStats?.online > 0 || activityStats?.today > 0) && (
                  <span style={{ width: 1, height: 12, background: 'var(--border)', flexShrink: 0 }} />
                )}
                <FeedFreshness updatedAt={dataUpdatedAt} onRefresh={loadFeed} refreshing={fetching} />
              </>
            )}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
            Showing profiles whose type produces your selected relation{profile?.relation_preferences?.length !== 1 ? 's' : ''} with <strong>{profile?.type}</strong>.
          </p>
          {swipeMode && (
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
              Swipe through profiles — if someone likes you back, you'll be notified. Browse mode visibility is unaffected.
            </p>
          )}
          {!isPremium && (
            <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
              <strong style={{ color: connectionCount >= 3 ? 'var(--accent)' : 'var(--text)', fontWeight: 500 }}>{connectionCount} of 3</strong> connections
              {' · '}
              <Link to="/premium" onClick={() => window.umami?.track('connection-counter-upgrade-clicked')} style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                Unlock unlimited
              </Link>
            </p>
          )}
          <div className="feed-card-toggle">
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
                  profile={{ ...profile, profile_data: profile.profile_data, relation: null, displayRelation: null }}
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
        </div>

        {/* Banners + SeekingYou — hidden in mobile swipe mode */}
        <div className="feed-preamble">

        {/* Announcement banner */}
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
            <button type="button" onClick={dismissBanner} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem', flexShrink: 0, padding: '0 0.25rem', lineHeight: 1 }} aria-label="Dismiss">×</button>
          </div>
        )}

        {/* Free-tier quadra notice */}
        {!isPremium && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
            background: 'rgba(154,111,56,0.07)', border: '1px solid var(--accent-lt)',
            borderRadius: 4, padding: '0.75rem 1rem', marginBottom: '1.5rem',
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.6 }}>
              Showing same-quadra matches.{' '}
              <Link
                to="/premium"
                onClick={() => window.umami?.track('feed-quadra-upgrade-clicked')}
                style={{ color: 'var(--accent)', textDecoration: 'underline' }}
              >
                Upgrade to Premium
              </Link>
              {' '}to see all 16 relation types.
            </p>
          </div>
        )}

        {/* New members refresh banner */}
        {newMembersAvailable && (
          <div
            onClick={() => { setNewMembersAvailable(false); loadFeed(); window.umami?.track('feed-refresh-banner-clicked') }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
              background: 'rgba(154,111,56,0.07)', border: '1px solid var(--accent-lt)',
              borderRadius: 4, padding: '0.6rem 1rem', marginBottom: '1.5rem',
              cursor: 'pointer',
            }}
          >
            <p style={{ fontSize: '0.82rem', color: 'var(--accent)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>↻</span> new members just joined — refresh your feed
            </p>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setNewMembersAvailable(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem', flexShrink: 0, padding: 0, lineHeight: 1 }}
              aria-label="Dismiss"
            >×</button>
          </div>
        )}

        {/* Who's looking for you */}
        <SeekingYou
          userType={profile?.type}
          isPremium={isPremium}
          onExploreRelation={(rel) => {
            setSwipeMode(false)
            localStorage.setItem(FEED_MODE_KEY, 'browse')
            setFilterRelation(rel)
          }}
        />

        </div>{/* end feed-preamble */}

        {/* SWIPE / BROWSE MODE — keyed so content crossfades on toggle */}
        <div key={swipeMode ? 'swipe' : 'browse'} className="feed-content-enter">
        {swipeMode ? (
          fetching || dataUpdatedAt === 0 ? (
            <FeedLoader />
          ) : error ? (
            <div style={{ background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 4, padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
              <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Something went wrong loading the feed:</p>
              <p style={{ color: '#c0392b', fontSize: '0.78rem', fontFamily: 'monospace' }}>{error}</p>
              <button type="button" className="btn-ghost" style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', fontSize: '0.78rem' }} onClick={loadFeed}>Try again</button>
            </div>
          ) : (
            <div className="swipe-deck-container">
              <SwipeDeck
                profiles={profiles}
                currentUserId={profile.id}
                userType={profile.type}
                blockRightSwipe={!isPremium && connectionCount >= 3}
                onBlockedRightSwipe={() => { window.umami?.track('connection-cap-hit', { mode: 'swipe' }); setCapModal(true) }}
                initialSwiped={swipedIdsRef.current}
                onSwipeComplete={(id) => { swipedIdsRef.current.add(id) }}
                onReset={() => {
                  swipedIdsRef.current = new Set()
                  loadFeed()
                  window.umami?.track('swipe-deck-reset')
                }}
                onMatch={(data) => {
                  setMatchData(data)
                  setMatchedMap(prev => (data.profile.id in prev) ? prev : ({ ...prev, [data.profile.id]: data.matchId }))
                  window.umami?.track('swipe-match-modal-shown', { relationType: data.relationType })
                }}
              />
            </div>
          )
        ) : (
        /* BROWSE MODE */
        <>
          {feedDisplayRelations.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`rel-pill clickable${filterRelation !== 'ALL' || showRelations ? ' active' : ''}`}
                  onClick={() => setShowRelations(v => !v)}
                  style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.8"/><line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="5" x2="8" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Relations
                  {filterRelation !== 'ALL' && (
                    <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.6rem', fontWeight: 600, padding: '0.05rem 0.35rem', borderRadius: 10, lineHeight: 1.6 }}>
                      {RELATIONS[filterRelation]?.name}
                    </span>
                  )}
                  <span style={{ color: 'var(--muted)', fontSize: '0.65rem' }}>{showRelations ? '▲' : '▼'}</span>
                </button>
                {filterRelation !== 'ALL' && (
                  <button type="button" onClick={() => setFilterRelation('ALL')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: 'var(--muted)', padding: 0, textDecoration: 'underline' }}>Clear</button>
                )}
                {(() => {
                  const activeCount = [withPhotos, withBio, !excludeAnon, activeOnly, activeToday, onlineNow, verifiedOnly, filterLocation !== 'anywhere', filterPurpose !== 'ALL'].filter(Boolean).length
                  return (
                    <>
                      <span style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0, margin: '0 0.1rem' }} />
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
                        <button type="button" onClick={() => { setWithPhotos(false); setWithBio(false); setExcludeAnon(true); setActiveOnly(false); setActiveToday(false); setOnlineNow(false); setFilterLocation('anywhere'); setVerifiedOnly(false); setFilterPurpose('ALL') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: 'var(--muted)', padding: 0, textDecoration: 'underline' }}>Clear</button>
                      )}
                      <span style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0, margin: '0 0.1rem' }} />
                      {[['Alpha','#BA7517'],['Beta','#791F1F'],['Gamma','#0F6E56'],['Delta','#185FA5']].map(([q, hex]) => {
                        const active = filterQuadra === q
                        return (
                          <button key={q} type="button" onClick={() => setFilterQuadra(active ? 'ALL' : q)}
                            style={{ fontSize: '0.68rem', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.5rem', borderRadius: 20, border: `1px solid ${active ? hex : hex+'55'}`, background: active ? `${hex}22` : 'none', color: active ? hex : 'var(--muted)', cursor: 'pointer', transition: 'all 0.15s', fontWeight: active ? 600 : 400 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: hex, flexShrink: 0, opacity: active ? 1 : 0.5 }} />
                            {q}
                          </button>
                        )
                      })}
                      {filterQuadra !== 'ALL' && (
                        <button type="button" onClick={() => setFilterQuadra('ALL')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: 'var(--muted)', padding: 0, textDecoration: 'underline' }}>Clear</button>
                      )}
                    </>
                  )
                })()}
              </div>
              {showRelations && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.65rem 0.85rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" className={`rel-pill clickable${filterRelation === 'ALL' ? ' active' : ''}`} onClick={() => { setFilterRelation('ALL'); setShowRelations(false) }}>All ({Object.values(relationCounts).reduce((a, b) => a + b, 0) || profiles.length})</button>
                    {feedDisplayRelations.map(rel => {
                      const count = relationCounts[rel] ?? profiles.filter(p => (p.displayRelation ?? p.relation) === rel).length
                      const ALL_TYPES = ['ILE','SEI','ESE','LII','EIE','LSI','SLE','IEI','SEE','ILI','LIE','ESI','LSE','EII','SLI','IEE']
                      const counterType = profile?.type
                        ? ALL_TYPES.find(t => MATRIX[t]?.[profile.type] === rel) ?? null
                        : null
                      return (
                        <button type="button" key={rel} className={`rel-pill clickable${filterRelation === rel ? ' active' : ''}`} onClick={() => { setFilterRelation(rel); setShowRelations(false) }}>
                          <span>{RELATIONS[rel]?.name} ({count})</span>
                          {counterType && (
                            <span style={{ opacity: 0.6, fontSize: '0.62rem', marginLeft: '0.3rem' }}>· {counterType}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {showFilters && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>Profile</p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button type="button" className={`rel-pill clickable${withPhotos ? ' active' : ''}`} onClick={() => setWithPhotos(v => !v)} style={{ fontSize: '0.7rem' }}>{withPhotos ? '✓ ' : ''}With photos</button>
                      <button type="button" className={`rel-pill clickable${withBio ? ' active' : ''}`} onClick={() => setWithBio(v => !v)} style={{ fontSize: '0.7rem' }}>{withBio ? '✓ ' : ''}With bio</button>
                      <button type="button" className={`rel-pill clickable${excludeAnon ? ' active' : ''}`} onClick={() => setExcludeAnon(v => !v)} style={{ fontSize: '0.7rem' }}>{excludeAnon ? '✓ ' : ''}Non-anonymous</button>
                      <button type="button" className={`rel-pill clickable${verifiedOnly ? ' active' : ''}`} onClick={() => setVerifiedOnly(v => !v)} style={{ fontSize: '0.7rem' }}>{verifiedOnly ? '✓ ' : ''}Verified types only</button>
                    </div>
                  </div>
                  <div style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>Purpose</p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {[['ALL', 'Any'], ['dating', 'Dating'], ['friendship', 'Friendship'], ['networking', 'Networking'], ['team', 'Team building']].map(([val, label]) => (
                        <button key={val} type="button" className={`rel-pill clickable${filterPurpose === val ? ' active' : ''}`} onClick={() => setFilterPurpose(val)} style={{ fontSize: '0.7rem' }}>{filterPurpose === val && val !== 'ALL' ? '✓ ' : ''}{label}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>Activity</p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button type="button" className={`rel-pill clickable${activeOnly ? ' active' : ''}`} onClick={() => { setActiveOnly(v => !v); setActiveToday(false); setOnlineNow(false) }} style={{ fontSize: '0.7rem' }}>{activeOnly ? '✓ ' : ''}This week</button>
                      <button type="button" className={`rel-pill clickable${activeToday ? ' active' : ''}`} onClick={() => { setActiveToday(v => !v); setActiveOnly(false); setOnlineNow(false) }} style={{ fontSize: '0.7rem' }}>{activeToday ? '✓ ' : ''}Today</button>
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
            </div>
          )}



          {error && (
            <div style={{ background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 4, padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
              <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Something went wrong loading the feed:</p>
              <p style={{ color: '#c0392b', fontSize: '0.78rem', fontFamily: 'monospace' }}>{error}</p>
              <button type="button" className="btn-ghost" style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', fontSize: '0.78rem' }} onClick={loadFeed}>Try again</button>
            </div>
          )}

          {fetching || dataUpdatedAt === 0 ? (
            <FeedLoader />
          ) : displayed.length === 0 && !error ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              {filterRelation !== 'ALL' && hasMore ? (
                <>
                  <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>No {RELATIONS[filterRelation]?.name} profiles in the current page.</p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button type="button" className="btn-ghost" onClick={() => loadMore()} disabled={loadingMore} style={{ padding: '0.6rem 1.5rem', fontSize: '0.82rem' }}>
                      {loadingMore ? 'Loading…' : `Load more (+${feedTotal !== null ? Math.min(PAGE_SIZE, feedTotal - offsetRef.current) : PAGE_SIZE})`}
                    </button>
                    {feedTotal !== null && feedTotal - offsetRef.current > 0 && (
                      <button type="button" className="btn-ghost" onClick={() => loadMore(feedTotal - offsetRef.current)} disabled={loadingMore} style={{ padding: '0.6rem 1.5rem', fontSize: '0.82rem' }}>
                        {loadingMore ? 'Loading…' : `Load all remaining (${feedTotal - offsetRef.current})`}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="eyebrow" style={{ marginBottom: '1rem' }}>No matches yet</p>
                  <h2 style={{ fontFamily: 'var(--serif)', fontSize: '2rem', marginBottom: '1rem' }}>The community is <em>growing</em></h2>
                  <p style={{ color: 'var(--muted)', maxWidth: 400, margin: '0 auto 0.75rem' }}>No profiles match your selected dynamics yet.</p>
                  <p style={{ color: 'var(--muted)', fontSize: '0.82rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
                    Selected relations: <strong>{profile?.relation_preferences?.join(', ') || 'none'}</strong>
                  </p>
                  <button type="button" className="btn-ghost" onClick={() => navigate('/profile/edit')}>Update preferences</button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Badge key */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
                padding: '0.65rem 0.9rem',
                border: '1px solid var(--border)',
                borderRadius: 4,
                marginBottom: '1.25rem',
                background: 'var(--card-bg)',
              }}>
                <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 500, flexShrink: 0 }}>
                  Profile badges
                </span>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                    <span style={{ color: 'var(--accent)', fontSize: '0.85rem', lineHeight: 1 }}>✦</span>
                    Founding member
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                    <span style={{ color: 'var(--accent)', fontSize: '0.85rem', lineHeight: 1 }}>★</span>
                    Premium subscriber
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 13, height: 13, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '0.45rem', fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>✓</span>
                    Verified type
                  </span>
                </div>
              </div>

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
                      isSaved={savedIds.has(p.id)}
                      onToggleSave={handleToggleSave}
                    />
                    {i === 4 && !dismissedAds.share && (
                      <FeedAd id="share" eyebrow="Spread the word" headline="Know someone who'd be into this?" body={`Socion works better with more types in the pool — ${memberCount ? memberCount + ' members so far,' : 'growing every day,'} but the rarer types are harder to find. If you know someone who's into personality theory, send them the link.`} ctaLabel={shareState === 'copied' ? '✓ Link copied' : navigator.share ? 'Share Socion →' : 'Copy link'} onClick={handleShare} onDismiss={() => dismissAd('share')} />
                    )}
                    {i === 6 && !isPremium && !dismissedAds.premium && (
                      <FeedAd id="premium" eyebrow="Socion Premium" headline="Unlock the full experience" body="Filter by any of the 16 relation types, see who viewed your profile, get full compatibility breakdowns, and unlimited AI. $14.99 / year — less than a coffee." ctaLabel="See Premium →" onClick={() => { window.umami?.track('feed-premium-clicked'); navigate('/premium') }} onDismiss={() => dismissAd('premium')} />
                    )}
                    {i === 7 && !dismissedAds['get-typed'] && (
                      <FeedAd id="get-typed" eyebrow="Get typed" headline="Working hypothesis or final answer?" body="Most people spend years second-guessing their type. Socion's typing marketplace connects you with experienced typists who analyse your cognitive functions, rule out lookalikes, and deliver a written report you can build on. Your verified badge updates automatically." ctaLabel="Book a session →" onClick={() => { window.umami?.track('feed-get-typed-clicked'); navigate('/typing') }} onDismiss={() => dismissAd('get-typed')} />
                    )}
                    {i === 9 && !dismissedAds.discord && (
                      <FeedAd id="discord" eyebrow="Community" headline="The conversation goes deeper on Discord" body="The Socion Discord is where members go beyond profiles — discussing dynamics, debating typings, and asking the questions that don't fit in a bio. Active, free, and worth five seconds to join." ctaLabel="Join Discord →" onClick={() => { window.umami?.track('feed-discord-clicked'); window.open('https://discord.gg/328KxsDKdr', '_blank', 'noopener,noreferrer') }} onDismiss={() => dismissAd('discord')} />
                    )}
                    {i === 11 && !dismissedAds.ask && (
                      <FeedAd id="ask" eyebrow="Socionics AI" headline="Ask anything about your type" body="Not sure how a relation actually plays out day-to-day? Curious what your leading function looks like under stress? The Socion AI knows the model inside-out — ask it anything." ctaLabel="Open AI chat →" onClick={() => { window.umami?.track('feed-ask-clicked'); navigate('/ask') }} onDismiss={() => dismissAd('ask')} />
                    )}
                    {i === 12 && !dismissedAds['si-type'] && profile?.type && (
                      <FeedAd id="si-type" eyebrow="Deep dive" headline={`The ${profile.type} — in full`} body={`Your type has a specific cognitive architecture: a leading function, a creative function, a blind spot, and a shadow. The full ${profile.type} profile on Socionics Insight covers all of it — including how others experience you and which dynamics tend to run best.`} ctaLabel={`Read about ${profile.type} →`} onClick={() => { window.umami?.track('feed-si-type-clicked', { type: profile.type }); setWebviewUrl(`https://socionicsinsight.com/types/${profile.type.toLowerCase()}/`) }} onDismiss={() => dismissAd('si-type')} />
                    )}
                    {i === 14 && !dismissedAds.support && (
                      <FeedAd id="support" eyebrow="Support Socion" headline="Keep Socion independent" body="Socion is built and maintained by one person, without investors or ads. The core will always be free. If it's helped you find connections or finally make sense of your dynamics, there are a few ways to help keep it running." ctaLabel="Support Socion →" onClick={() => { window.umami?.track('feed-support-clicked'); navigate('/support') }} onDismiss={() => dismissAd('support')} />
                    )}
                    {i === 17 && !dismissedAds.boards && (
                      <FeedAd id="boards" eyebrow="Community" headline="Join the conversation on the boards" body="The Socion boards are where members discuss dynamics, debate typings, and dig into the theory beyond a single profile. Start a thread or jump into an existing one." ctaLabel="Browse boards →" onClick={() => { window.umami?.track('feed-boards-clicked'); navigate('/boards') }} onDismiss={() => dismissAd('boards')} />
                    )}
                  </>
                ))}
              </div>

              {(feedExhausted || !hasMore || (feedTotal !== null && feedTotal - offsetRef.current <= 0)) ? (
                <div style={{ textAlign: 'center', marginTop: '2.5rem', paddingBottom: '1rem' }}>
                  <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1rem', color: 'var(--muted)' }}>
                    You've seen everyone — check back as the community grows.
                  </p>
                </div>
              ) : hasMore && (
                <div style={{ textAlign: 'center', marginTop: '2.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => loadMore()}
                    disabled={loadingMore}
                    style={{ padding: '0.6rem 1.5rem', fontSize: '0.82rem', opacity: loadingMore ? 0.6 : 1 }}
                  >
                    {loadingMore ? 'Loading…' : `Load more (+${feedTotal !== null ? Math.min(PAGE_SIZE, feedTotal - offsetRef.current) : PAGE_SIZE})`}
                  </button>
                  {feedTotal !== null && feedTotal - offsetRef.current > 0 && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => loadMore(feedTotal - offsetRef.current)}
                      disabled={loadingMore}
                      style={{ padding: '0.6rem 1.5rem', fontSize: '0.82rem', opacity: loadingMore ? 0.6 : 1 }}
                    >
                      {loadingMore ? 'Loading…' : `Load all remaining (${feedTotal - offsetRef.current})`}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </>
        )}
        </div>{/* end feed-content-enter */}
      </section>
      </div>{/* end feed-layout */}

      <SIWebview url={webviewUrl} onClose={() => setWebviewUrl(null)} />

      <MatchModal
        matchData={matchData}
        currentProfile={profile}
        onDismiss={() => setMatchData(null)}
      />

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
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.4rem' }}>Connecting with {targetName}</p>
                <p style={{ fontSize: '0.95rem', fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{label}</p>
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
                <button type="button" className="btn-ghost" onClick={() => { setConnectPrompt(null); setConnectMessage('') }} disabled={isConnecting}>Cancel</button>
                <button type="button" className="btn-primary" onClick={handleConnectSubmit} disabled={isConnecting || connectMessage.trim().length < 10} style={{ opacity: (isConnecting || connectMessage.trim().length < 10) ? 0.5 : 1 }}>
                  {isConnecting ? 'Connecting…' : 'Send & connect'}
                </button>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center', margin: 0 }}>Ctrl + Enter to send</p>
            </div>
          </div>
        )
      })()}

      {capModal && (
        <div
          onClick={() => setCapModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.75rem', width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {hasLapsedReferralPremium(profile) ? (
              <>
                <div>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.4rem' }}>Your referral premium has ended</p>
                  <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 500, margin: 0, color: 'var(--text)' }}>You're over the free tier limit</h2>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                  Your premium trial from referrals has ended, and you've got more than the free tier's 3 active connections. Refer another friend for 30 more days, upgrade to Premium, or end an existing connection to free up a slot.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <Link to="/settings" onClick={() => window.umami?.track('connection-cap-refer-clicked')} className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
                    Refer a friend
                  </Link>
                  <Link to="/premium" onClick={() => window.umami?.track('connection-cap-upgrade-clicked')} className="btn-ghost" style={{ textAlign: 'center', textDecoration: 'none' }}>
                    Upgrade to Premium
                  </Link>
                  <button type="button" className="btn-ghost" onClick={() => { window.umami?.track('connection-cap-manage-clicked'); navigate('/messages') }}>
                    Manage existing connections
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.4rem' }}>Free tier limit</p>
                  <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 500, margin: 0, color: 'var(--text)' }}>You've reached your free tier limits</h2>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                  The free tier includes up to 3 active connections. Upgrade to Premium for unlimited connections, or end an existing connection to free up a slot.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <Link to="/premium" onClick={() => window.umami?.track('connection-cap-upgrade-clicked')} className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
                    Upgrade to Premium
                  </Link>
                  <button type="button" className="btn-ghost" onClick={() => { window.umami?.track('connection-cap-manage-clicked'); navigate('/messages') }}>
                    Manage existing connections
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}

const centreStyle = {
  minHeight: 'calc(100vh - 72px)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  gap: '1.5rem', padding: '2rem', textAlign: 'center',
}
