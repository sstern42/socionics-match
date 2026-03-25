import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ProfileCard from '../components/feed/ProfileCard'
import { useAuth } from '../lib/AuthContext'
import { getFeedProfiles, getExistingMatches, createMatch } from '../lib/feed'
import { RELATIONS } from '../data/relations'

export default function Feed() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()

  const [profiles, setProfiles] = useState([])
  const [matchedIds, setMatchedIds] = useState(new Set())
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState(null)
  const [filterRelation, setFilterRelation] = useState('ALL')
  const [connectingId, setConnectingId] = useState(null)
  const [justConnected, setJustConnected] = useState(null)

  useEffect(() => {
    if (!session && !loading) navigate('/auth')
  }, [session, loading])

  useEffect(() => {
    if (!profile) return
    loadFeed()
  }, [profile])

  async function loadFeed() {
    setFetching(true)
    setError(null)
    try {
      const [feedData, existingMatches] = await Promise.all([
        getFeedProfiles({
          userType: profile.type,
          relationPreferences: profile.relation_preferences,
          currentUserId: profile.id,
        }),
        getExistingMatches(profile.id),
      ])
      setProfiles(feedData)
      const ids = new Set(existingMatches.flatMap(m => [m.user_a_id, m.user_b_id]))
      ids.delete(profile.id)
      setMatchedIds(ids)
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
      await createMatch({
        userAId: profile.id,
        userBId: targetProfile.id,
        relationType: targetProfile.relation,
      })
      setMatchedIds(prev => new Set([...prev, targetProfile.id]))
      setJustConnected(targetProfile.profile_data?.name ?? targetProfile.type)
      setTimeout(() => setJustConnected(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setConnectingId(null)
    }
  }

  // Unique relations present in feed for filter pills
  const feedRelations = [...new Set(profiles.map(p => p.relation).filter(Boolean))]

  const displayed = filterRelation === 'ALL'
    ? profiles
    : profiles.filter(p => p.relation === filterRelation)

  if (loading || !profile) {
    return (
      <Layout>
        <section style={centreStyle}>
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        </section>
      </Layout>
    )
  }

  return (
    <Layout>
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <p className="eyebrow">Your matches</p>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3.5rem)', marginTop: '0.4rem' }}>
            {profile.type} — <em>finding your dynamic</em>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
            Showing profiles whose type produces your selected relation{profile.relation_preferences?.length !== 1 ? 's' : ''} with <strong>{profile.type}</strong>.
          </p>
        </div>

        {/* Relation filter */}
        {feedRelations.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <button
              className={`rel-pill clickable${filterRelation === 'ALL' ? ' active' : ''}`}
              onClick={() => setFilterRelation('ALL')}
            >
              All ({profiles.length})
            </button>
            {feedRelations.map(rel => (
              <button
                key={rel}
                className={`rel-pill clickable${filterRelation === rel ? ' active' : ''}`}
                onClick={() => setFilterRelation(rel)}
              >
                {RELATIONS[rel]?.name} ({profiles.filter(p => p.relation === rel).length})
              </button>
            ))}
          </div>
        )}

        {/* Toast */}
        {justConnected && (
          <div style={{
            background: 'rgba(154,111,56,0.1)', border: '1px solid var(--accent-lt)',
            borderRadius: 4, padding: '0.75rem 1rem', marginBottom: '1.5rem',
            fontSize: '0.88rem', color: 'var(--accent)',
          }}>
            Connected with {justConnected}. Messaging coming soon.
          </div>
        )}

        {error && (
          <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{error}</p>
        )}

        {/* Feed */}
        {fetching ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '4rem 0' }}>Finding matches…</p>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p className="eyebrow" style={{ marginBottom: '1rem' }}>No matches yet</p>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '2rem', marginBottom: '1rem' }}>
              The community is <em>growing</em>
            </h2>
            <p style={{ color: 'var(--muted)', maxWidth: 400, margin: '0 auto 1.5rem' }}>
              No profiles match your selected dynamics yet. Try adding more relation types to your preferences, or check back as more users join.
            </p>
            <button className="btn-ghost" onClick={() => navigate('/profile/setup')}>
              Update preferences
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {displayed.map(p => (
              <ProfileCard
                key={p.id}
                profile={p}
                onConnect={handleConnect}
                alreadyMatched={matchedIds.has(p.id)}
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
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
