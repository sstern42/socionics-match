import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ProfileCard from '../components/feed/ProfileCard'
import { useAuth } from '../lib/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'
import { MATRIX } from '../data/relations'
import { supabase } from '../lib/supabase'
import { getExistingMatches } from '../lib/feed'

export default function Saved() {
  usePageTitle('Saved')
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [matchedMap, setMatchedMap] = useState({})
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!loading && !session) navigate('/auth')
  }, [session, loading])

  useEffect(() => {
    if (!loading && session) load()
  }, [loading, session])

  async function load() {
    if (!profile?.id) return
    setFetching(true)
    setError(null)
    try {
      const [{ data, error }, existingMatches] = await Promise.all([
        supabase.rpc('get_saved_profiles'),
        getExistingMatches(profile.id),
      ])
      if (error) throw error
      setProfiles(data ?? [])
      const map = {}
      for (const m of existingMatches) {
        const otherId = m.user_a_id === profile.id ? m.user_b_id : m.user_a_id
        map[otherId] = m.id
      }
      setMatchedMap(map)
    } catch (err) {
      setError('Could not load saved profiles.')
      console.error(err)
    } finally {
      setFetching(false)
    }
  }

  const handleToggleSave = useCallback((savedUserId, nowSaved) => {
    if (!nowSaved) setProfiles(prev => prev.filter(p => p.id !== savedUserId))
  }, [])

  function enrichedProfile(p) {
    const relation = profile?.type && p.type
      ? MATRIX[p.type]?.[profile.type] ?? null
      : null
    return { ...p, relation }
  }

  return (
    <Layout hideFooter>
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 1.5rem', width: '100%' }}>
        <p className="eyebrow">Bookmarked</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem,5vw,3.5rem)', marginTop: '0.4rem', marginBottom: '0.5rem' }}>
          Saved profiles
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '2.5rem' }}>
          Profiles you've bookmarked from the feed.
        </p>

        {fetching && (
          <p style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>Loading…</p>
        )}

        {error && !fetching && (
          <div style={{ background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 4, padding: '0.75rem 1rem' }}>
            <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</p>
            <button type="button" className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.78rem' }} onClick={load}>Try again</button>
          </div>
        )}

        {!fetching && !error && profiles.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p className="eyebrow" style={{ marginBottom: '1rem' }}>Nothing here yet</p>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: '2rem', marginBottom: '1rem' }}>
              Bookmark profiles from <em>the feed</em>
            </h2>
            <p style={{ color: 'var(--muted)', maxWidth: 380, margin: '0 auto 1.5rem', fontSize: '0.88rem', lineHeight: 1.7 }}>
              Tap the bookmark on any profile card to save it here for later.
            </p>
            <button type="button" className="btn-ghost" onClick={() => navigate('/feed')}>
              Back to feed
            </button>
          </div>
        )}

        {!fetching && !error && profiles.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {profiles.map(p => (
              <ProfileCard
                key={p.id}
                profile={enrichedProfile(p)}
                isSaved={true}
                onToggleSave={handleToggleSave}
                onConnect={() => navigate('/feed')}
                alreadyMatched={p.id in matchedMap}
                matchId={matchedMap[p.id] ?? null}
                connecting={false}
              />
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}
