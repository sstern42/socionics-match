import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { RELATIONS, MATRIX } from '../data/relations'
import { countryFlag } from '../data/countries'

export default function UserProfile() {
  const { userId } = useParams()
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const [other, setOther] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('users')
      .select('id, type, profile_data, avatar_url, verified_by')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setOther(data)
        setFetching(false)
      })
  }, [userId])

  if (loading || fetching) {
    return (
      <Layout>
        <div style={centreStyle}>
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        </div>
      </Layout>
    )
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

  const isAnon = other.profile_data?.anonymous ?? false
  const name = isAnon ? 'Anonymous' : (other.profile_data?.name ?? other.type)
  const flag = isAnon ? null : countryFlag(other.profile_data?.country)
  const dob = other.profile_data?.dob
  const age = dob && !isAnon
    ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null
  const gender = isAnon ? null : other.profile_data?.gender
  const genderEmoji = { Man: '👨', Woman: '👩', 'Non-binary': '🧑' }[gender]
  const discordHandle = isAnon ? null : other.profile_data?.discord_handle
  const bio = other.profile_data?.bio
  const city = isAnon ? null : other.profile_data?.city

  // Relation from this viewer's perspective
  const myType = profile?.type
  const relation = myType ? MATRIX[myType]?.[other.type] : null
  const relInfo = relation ? RELATIONS[relation] : null

  function handleCopyDiscord() {
    if (!discordHandle) return
    navigator.clipboard.writeText(discordHandle).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      window.umami?.track('profile-discord-copied')
    })
  }

  return (
    <Layout>
      <section style={{ maxWidth: 480, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.82rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '2rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,3 5,7 9,11"/>
          </svg>
          Back
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {other.avatar_url && !isAnon
                ? <img src={other.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', color: 'var(--muted)', lineHeight: 1 }}>
                    {isAnon ? '🕵️' : (other.profile_data?.name?.[0]?.toUpperCase() ?? '?')}
                  </span>
              }
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', fontWeight: 500, lineHeight: 1.2 }}>
                {name}{age ? `, ${age}` : ''}{genderEmoji ? ` ${genderEmoji}` : ''}
              </h1>
              {(flag || city) && (
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                  {flag}{flag && city ? ' ' : ''}{city ?? ''}
                </p>
              )}
            </div>
          </div>

          {/* Type badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a
              href={`https://socionicsinsight.com/types/${other.type.toLowerCase()}/`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, color: 'var(--accent)', background: 'rgba(154,111,56,0.08)', border: '1px solid var(--accent-lt)', padding: '0.3rem 0.75rem', borderRadius: 3, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={() => window.umami?.track('profile-type-link-clicked', { type: other.type })}
            >
              {other.type}
              {other.verified_by && !isAnon && (
                <span title={`Verified by ${other.verified_by}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '0.45rem', fontWeight: 700, lineHeight: 1 }}>✓</span>
              )}
            </a>
            {other.verified_by && !isAnon && (
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                Verified by {other.verified_by}
              </span>
            )}
          </div>

          {/* Relation with viewer */}
          {relInfo && myType && (
            <div style={{ background: 'rgba(154,111,56,0.06)', border: '1px solid var(--accent-lt)', borderRadius: 4, padding: '0.75rem 1rem' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, marginBottom: '0.3rem' }}>
                Your relation · {relInfo.name}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                {relInfo.description}
              </p>
            </div>
          )}

          {/* Discord handle */}
          {discordHandle && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '0.85rem 1rem' }}>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                Discord
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
                <code style={{ fontFamily: 'var(--mono, monospace)', fontSize: '0.9rem', color: 'var(--text)', wordBreak: 'break-all' }}>
                  {discordHandle}
                </code>
                <button
                  type="button"
                  onClick={handleCopyDiscord}
                  style={{ background: copied ? 'var(--accent)' : 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '0.3rem 0.75rem', fontSize: '0.72rem', color: copied ? '#fff' : 'var(--muted)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                Find them on Discord to continue the conversation there.
              </p>
            </div>
          )}

          {/* Bio — pre-wrap preserves line breaks */}
          {bio && (
            <div>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>Bio</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.75, fontWeight: 300, whiteSpace: 'pre-wrap' }}>{bio}</p>
            </div>
          )}

          {/* No discord handle nudge */}
          {!discordHandle && (
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              This member hasn't added a Discord handle yet. You can ask them to add one in your conversation — they'll find it under Profile → Details.
            </p>
          )}
        </div>
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
