import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { RELATIONS, MATRIX } from '../data/relations'
import { countryFlag, COUNTRIES } from '../data/countries'
import { createMatch } from '../lib/feed'
import { sendMessage } from '../lib/messages'
import { logProfileView, getProfileViews, getProfileViewCount } from '../lib/profileViews'
import DynamicsTab from '../components/profile/DynamicsTab'
import SIWebview from '../components/SIWebview'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function UserProfile() {
  const { userId } = useParams()
  const { profile, loading, isPremium } = useAuth()
  const navigate = useNavigate()

  const [other, setOther]           = useState(null)
  const [fetching, setFetching]     = useState(true)
  const [copied, setCopied]         = useState(false)
  const [lightbox, setLightbox]     = useState(null)
  const [webviewUrl, setWebviewUrl] = useState(null)

  // Own-profile tab state
  const [activeTab, setActiveTab]   = useState('profile') // 'profile' | 'views'
  const [views, setViews]           = useState([])
  const [viewCount, setViewCount]   = useState(null)
  const [viewsLoading, setViewsLoading] = useState(false)

  // Connection state
  const [existingMatchId, setExistingMatchId] = useState(null)
  const [checkingMatch, setCheckingMatch]     = useState(false)
  const [connectPrompt, setConnectPrompt]     = useState(false)
  const [connectMessage, setConnectMessage]   = useState('')
  const [connecting, setConnecting]           = useState(false)
  const [connectError, setConnectError]       = useState(null)
  const [justConnected, setJustConnected]     = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('users')
      .select('id, type, profile_data, avatar_url, photos, verified_by')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => { setOther(data); setFetching(false) })
  }, [userId])

  // Log view — fires once per mount for non-self profiles
  useEffect(() => {
    if (!profile?.id || !userId || profile.id === userId) return
    logProfileView(profile.id, userId)
  }, [profile?.id, userId])

  useEffect(() => {
    if (!profile?.id || !userId || profile.id === userId) return
    setCheckingMatch(true)
    supabase
      .from('matches')
      .select('id')
      .or(`and(user_a_id.eq.${profile.id},user_b_id.eq.${userId}),and(user_a_id.eq.${userId},user_b_id.eq.${profile.id})`)
      .is('unmatched_at', null)
      .maybeSingle()
      .then(({ data }) => {
        setExistingMatchId(data?.id ?? null)
        setCheckingMatch(false)
      })
      .catch(() => setCheckingMatch(false))
  }, [profile?.id, userId])

  // Fetch view data when own-profile Views tab is opened
  useEffect(() => {
    if (!other || !profile?.id || other.id !== profile.id || activeTab !== 'views') return
    setViewsLoading(true)
    if (isPremium) {
      getProfileViews(profile.id)
        .then(rows => { setViews(rows); setViewsLoading(false) })
        .catch(() => setViewsLoading(false))
    } else {
      getProfileViewCount(profile.id)
        .then(n => { setViewCount(n); setViewsLoading(false) })
        .catch(() => setViewsLoading(false))
    }
  }, [activeTab, other?.id, profile?.id, isPremium])

  async function handleConnectSubmit() {
    if (!profile || !other || !connectMessage.trim()) return
    setConnecting(true)
    setConnectError(null)
    try {
      const sharedPurpose = (profile.purpose ?? []).find(p => (other.purpose ?? []).includes(p))
        ?? (profile.purpose ?? [])[0]
        ?? 'dating'
      const newMatch = await createMatch({
        userAId: profile.id,
        userBId: other.id,
        relationType: MATRIX[profile.type]?.[other.type] ?? 'IDENTITY',
        purpose: sharedPurpose,
      })
      await sendMessage({ matchId: newMatch.id, senderId: profile.id, content: connectMessage.trim() })
      setExistingMatchId(newMatch.id)
      setConnectPrompt(false)
      setConnectMessage('')
      setJustConnected(true)
      window.umami?.track('profile-page-connect', { relation: MATRIX[profile.type]?.[other.type] })
    } catch (err) {
      setConnectError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  if (loading || fetching) {
    return <Layout><div style={centreStyle}><p style={{ color: 'var(--muted)' }}>Loading…</p></div></Layout>
  }

  if (!other) {
    return (
      <Layout>
        <div style={centreStyle}>
          <p style={{ color: 'var(--muted)' }}>Profile not found.</p>
          <button className="btn-ghost" onClick={() => navigate(-1)}>Go back</button>
        </div>
      </Layout>
    )
  }

  const isSelf     = profile?.id === other.id
  const isAnon     = !isSelf && (other.profile_data?.anonymous ?? false)
  const name       = isAnon ? 'Anonymous' : (other.profile_data?.name ?? other.type)
  const flag       = isAnon ? null : countryFlag(other.profile_data?.country)
  const dob        = other.profile_data?.dob
  const age        = dob && !isAnon ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null
  const gender     = isAnon ? null : other.profile_data?.gender
  const genderEmoji = { Man: '👨', Woman: '👩', 'Non-binary': '🧑' }[gender]
  const discordHandle = isAnon ? null : other.profile_data?.discord_handle
  const bio        = other.profile_data?.bio
  const city       = isAnon ? null : other.profile_data?.city
  const countryCode = isAnon ? null : other.profile_data?.country
  const countryName = countryCode ? (COUNTRIES.find(c => c.code === countryCode)?.name ?? null) : null

  const galleryPhotos = isAnon ? [] : [other.avatar_url, ...(other.photos ?? [])].filter(Boolean)

  const myType    = profile?.type
  const relation  = !isSelf && myType ? MATRIX[other.type]?.[myType] : null
  const relInfo   = relation ? RELATIONS[relation] : null

  const canConnect = !isSelf && !isAnon && profile && !checkingMatch
  const isConnected = !!existingMatchId || justConnected

  function handleCopyDiscord() {
    if (!discordHandle) return
    navigator.clipboard.writeText(discordHandle).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      window.umami?.track('profile-discord-copied')
    })
  }

  // ── Views tab content ────────────────────────────────────────────────────

  function ViewsTab() {
    const _isPremium = false // TEMP: remove before shipping to prod
    if (viewsLoading) {
      return <p style={{ color: 'var(--muted)', fontSize: '0.88rem', textAlign: 'center', padding: '2rem 0' }}>Loading…</p>
    }

    // Premium: full viewer list
    if (_isPremium) {
      if (views.length === 0) {
        return (
          <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
            <p style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '1.05rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>No views yet.</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Views show up here when members open your profile.</p>
          </div>
        )
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {views.map((row, i) => {
            const viewer    = row.viewer
            const isViewerAnon = viewer?.profile_data?.anonymous ?? false
            const viewerName  = isViewerAnon ? 'Anonymous' : (viewer?.profile_data?.name ?? viewer?.type ?? '?')
            const viewerType  = viewer?.type ?? '?'
            // Relation: what relation does the profile owner have with this viewer
            // MATRIX[viewer.type][myType] = relation from myType's (profile owner's) perspective
            const viewerRelKey = myType && viewer?.type ? MATRIX[viewer.type]?.[myType] : null
            const viewerRelInfo = viewerRelKey ? RELATIONS[viewerRelKey] : null

            return (
              <button
                key={`${row.viewer_id}-${i}`}
                type="button"
                onClick={() => !isViewerAnon && navigate(`/profile/${viewer?.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.85rem 0',
                  borderBottom: i < views.length - 1 ? '1px solid var(--border)' : 'none',
                  background: 'none', border: 'none',
                  cursor: isViewerAnon ? 'default' : 'pointer',
                  textAlign: 'left', width: '100%',
                }}
              >
                {/* Avatar */}
                <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {viewer?.avatar_url && !isViewerAnon
                    ? <img src={viewer.avatar_url} alt={viewerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: 'var(--serif)', fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1 }}>{isViewerAnon ? '🕵️' : (viewerName[0]?.toUpperCase() ?? '?')}</span>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{viewerName}</span>
                    <span style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500, color: 'var(--accent)', background: 'rgba(154,111,56,0.08)', border: '1px solid var(--accent-lt)', padding: '0.1rem 0.4rem', borderRadius: 2, flexShrink: 0 }}>
                      {viewerType}
                    </span>
                    {viewer?.verified_by && !isViewerAnon && (
                      <span title={`Verified by ${viewer.verified_by}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 11, height: 11, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '0.4rem', fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>✓</span>
                    )}
                  </div>
                  {viewerRelInfo && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>{viewerRelInfo.name}</span>
                  )}
                </div>

                {/* Time */}
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0 }}>{timeAgo(row.viewed_at)}</span>
              </button>
            )
          })}
        </div>
      )
    }

    // Free: count tease
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: '3rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1 }}>
          {viewCount ?? '—'}
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          {viewCount === 1 ? 'person viewed' : 'people viewed'} your profile in the last 7 days.
        </p>
        <div style={{ background: 'rgba(154,111,56,0.06)', border: '1px solid var(--accent-lt)', borderRadius: 8, padding: '1.25rem 1.5rem', maxWidth: 340, width: '100%', textAlign: 'left' }}>
          <p style={{ fontSize: '0.88rem', fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--text)', marginBottom: '0.5rem' }}>
            See who's been looking.
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
            Premium unlocks the full viewer list — name, type, relation, and when they visited.
          </p>
          <Link
            to="/premium"
            onClick={() => window.umami?.track('profile-views-upgrade-clicked')}
            className="btn-primary"
            style={{ textDecoration: 'none', fontSize: '0.78rem', padding: '0.5rem 1.1rem', display: 'inline-block' }}
          >
            Unlock with Premium
          </Link>
        </div>
      </div>
    )
  }

  // ── Tab bar (own profile only) ──────────────────────────────────────────

  const tabStyle = (active) => ({
    padding: '0.65rem 1.25rem',
    fontSize: '0.78rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: active ? 'var(--accent)' : 'var(--muted)',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    marginBottom: '-1px',
    transition: 'color 0.15s',
    whiteSpace: 'nowrap',
  })

  return (
    <Layout>
      <section style={{ maxWidth: 480, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,3 5,7 9,11"/></svg>
          Back
        </button>

        {isSelf && (
          <div style={{ background: 'rgba(154,111,56,0.06)', border: '1px solid var(--accent-lt)', borderRadius: 4, padding: '0.6rem 0.9rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>This is how your profile looks to others.</p>
            <button type="button" onClick={() => navigate('/profile/edit')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--accent)', whiteSpace: 'nowrap', padding: 0 }}>Edit →</button>
          </div>
        )}

        {justConnected && (
          <div style={{ background: 'rgba(154,111,56,0.1)', border: '1px solid var(--accent-lt)', borderRadius: 4, padding: '0.6rem 0.9rem', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--accent)' }}>
              Connected with {name}. <button type="button" onClick={() => navigate(`/messages?match=${existingMatchId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline', fontSize: 'inherit', padding: 0 }}>Go to messages →</button>
            </p>
          </div>
        )}

        {/* Tab bar — own profile only */}
        {isSelf && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
            <button style={tabStyle(activeTab === 'profile')} onClick={() => setActiveTab('profile')}>Profile</button>
            <button
              style={tabStyle(activeTab === 'views')}
              onClick={() => { setActiveTab('views'); window.umami?.track('profile-views-tab-opened') }}
            >
              Views
              {!isPremium && <span aria-hidden="true" style={{ marginLeft: '0.35rem', fontSize: '0.75rem', verticalAlign: 'middle' }}>&#128274;</span>}
            </button>
            <button
              style={tabStyle(activeTab === 'dynamics')}
              onClick={() => { setActiveTab('dynamics'); window.umami?.track('profile-dynamics-tab-opened') }}
            >
              Dynamics
              {!isPremium && <span aria-hidden="true" style={{ marginLeft: '0.35rem', fontSize: '0.75rem', verticalAlign: 'middle' }}>&#128274;</span>}
            </button>
          </div>
        )}

        {/* Views tab */}
        {isSelf && activeTab === 'views' && <ViewsTab />}

        {/* Dynamics tab */}
        {isSelf && activeTab === 'dynamics' && (
          <DynamicsTab userId={profile?.id} myType={profile?.type} isPremium={isPremium} />
        )}

        {/* Profile tab (always shown for non-self; shown when tab = 'profile' for self) */}
        {(!isSelf || activeTab === 'profile') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {other.avatar_url && !isAnon
                  ? <img src={other.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', color: 'var(--muted)', lineHeight: 1 }}>{isAnon ? '🕵️' : (other.profile_data?.name?.[0]?.toUpperCase() ?? '?')}</span>
                }
              </div>
              <div>
                <h1 style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', fontWeight: 500, lineHeight: 1.2 }}>
                  {name}{age ? `, ${age}` : ''}{genderEmoji ? ` ${genderEmoji}` : ''}
                </h1>
                {(flag || countryName || city) && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                    {flag ? `${flag} ` : ''}{[countryName, city].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>

            {/* Type badge — opens SI webview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setWebviewUrl(`https://socionicsinsight.com/types/${other.type.toLowerCase()}/`)
                  window.umami?.track('profile-type-link-clicked', { type: other.type })
                }}
                style={{ fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, color: 'var(--accent)', background: 'rgba(154,111,56,0.08)', border: '1px solid var(--accent-lt)', padding: '0.3rem 0.75rem', borderRadius: 3, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {other.type}
                {other.verified_by && !isAnon && (
                  <span title={`Verified by ${other.verified_by}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '0.45rem', fontWeight: 700, lineHeight: 1 }}>✓</span>
                )}
              </button>
              {other.verified_by && !isAnon && (
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>Verified by {other.verified_by}</span>
              )}
            </div>

            {/* Relation with viewer */}
            {relInfo && myType && !isSelf && (
              <div style={{ background: 'rgba(154,111,56,0.06)', border: '1px solid var(--accent-lt)', borderRadius: 4, padding: '0.75rem 1rem' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, marginBottom: '0.3rem' }}>
                  Your relation · {relInfo.name}
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>{relInfo.description}</p>
              </div>
            )}

            {/* Connect / Message button */}
            {canConnect && (
              <div>
                {isConnected ? (
                  <button type="button" className="btn-ghost" onClick={() => navigate(`/messages?match=${existingMatchId}`)} style={{ width: '100%' }}>
                    Message {name} →
                  </button>
                ) : (
                  <button type="button" className="btn-primary" onClick={() => { setConnectPrompt(true); setConnectError(null) }} style={{ width: '100%' }}>
                    Connect with {name}
                  </button>
                )}
              </div>
            )}

            {/* Photo gallery */}
            {galleryPhotos.length > 0 && (
              <div>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>Photos</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                  {galleryPhotos.map((url, i) => (
                    <button key={i} type="button" onClick={() => { setLightbox(url); window.umami?.track('profile-photo-opened') }} style={{ padding: 0, border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', cursor: 'zoom-in', background: 'var(--surface)', aspectRatio: '1 / 1' }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Discord handle */}
            {discordHandle && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '0.85rem 1rem' }}>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>Discord</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
                  <code style={{ fontFamily: 'var(--mono, monospace)', fontSize: '0.9rem', color: 'var(--text)', wordBreak: 'break-all' }}>{discordHandle}</code>
                  <button type="button" onClick={handleCopyDiscord} style={{ background: copied ? 'var(--accent)' : 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '0.3rem 0.75rem', fontSize: '0.72rem', color: copied ? '#fff' : 'var(--muted)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>Find them on Discord to continue the conversation there.</p>
              </div>
            )}

            {/* Bio */}
            {bio && (
              <div>
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>Bio</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.75, fontWeight: 300, whiteSpace: 'pre-wrap' }}>{bio}</p>
              </div>
            )}

            {!discordHandle && !isSelf && (
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                This member hasn't added a Discord handle yet. You can ask them to add one in your conversation — they'll find it under Profile → Details.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Connect modal */}
      {connectPrompt && (
        <div onClick={() => !connecting && (setConnectPrompt(false), setConnectMessage(''))} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.75rem', width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.4rem' }}>Connecting with {name}</p>
              <p style={{ fontSize: '0.95rem', fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>
                {other.profile_data?.connection_question || 'Introduce yourself — what brings you to Socion?'}
              </p>
            </div>
            <textarea className="input-standalone" placeholder="Write your message…" value={connectMessage} onChange={e => setConnectMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && e.ctrlKey && connectMessage.trim().length >= 10 && handleConnectSubmit()} rows={4} autoFocus disabled={connecting} style={{ resize: 'none', fontFamily: 'var(--sans)', lineHeight: 1.6 }} />
            {connectMessage.trim().length < 10 && (
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: 0, textAlign: 'right' }}>
                {10 - connectMessage.trim().length} more character{10 - connectMessage.trim().length !== 1 ? 's' : ''} to unlock Send
              </p>
            )}
            {connectError && <p style={{ fontSize: '0.82rem', color: '#c0392b', margin: 0 }}>{connectError}</p>}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-ghost" onClick={() => { setConnectPrompt(false); setConnectMessage('') }} disabled={connecting}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleConnectSubmit} disabled={connecting || connectMessage.trim().length < 10} style={{ opacity: (connecting || connectMessage.trim().length < 10) ? 0.5 : 1 }}>
                {connecting ? 'Connecting…' : 'Send & connect'}
              </button>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center', margin: 0 }}>Ctrl + Enter to send</p>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 6 }} onClick={e => e.stopPropagation()} />
          <button type="button" onClick={() => setLightbox(null)} style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      )}

      {/* SI Webview */}
      <SIWebview url={webviewUrl} onClose={() => setWebviewUrl(null)} />

    </Layout>
  )
}

const centreStyle = {
  minHeight: 'calc(100vh - 72px)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  gap: '1.5rem', padding: '2rem', textAlign: 'center',
}
