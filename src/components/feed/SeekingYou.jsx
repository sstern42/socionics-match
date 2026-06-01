import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getTypesSeekingMe, RELATIONS, getQuadra } from '../../data/relations'

// "Who's looking for you" — premium panel.
// Pure matrix derivation, no query: for the user's type, the types that (from
// THEIR perspective) see the user as one of the strong, sought-after dynamics.
// This is the inverse lookup — getTypesSeekingMe reads getRelation(them, me) —
// so asymmetric relations (Benefactor/Beneficiary, Supervisor/Supervisee)
// resolve from the seeker's side, never reversed.
//
// We surface the relations a member is most likely to be actively sought for:
// Dual, Activity, Mirror, Semi-Dual (the complementary band), plus Benefactor
// (types who receive from this user — i.e. are drawn to them). Kept deliberately
// to the "who'd want you" relations rather than all 15, so it reads as a
// genuine insight, not a dump of the matrix row.
const SOUGHT_RELATIONS = ['DUAL', 'ACTIVITY', 'MIRROR', 'SEMI_DUAL', 'BENEFICIARY']

const QUADRA_COLOURS = {
  Alpha: '#BA7517', Beta: '#791F1F', Gamma: '#0F6E56', Delta: '#185FA5',
}

export default function SeekingYou({ userType, isPremium, onExploreRelation }) {
  const [open, setOpen] = useState(false)

  if (!userType) return null

  const seekers = getTypesSeekingMe(userType, SOUGHT_RELATIONS)
  if (seekers.length === 0) return null

  // Order: complementary band first (Dual → Activity → Mirror → Semi-Dual),
  // then Beneficiary, so the strongest fits read first.
  const order = { DUAL: 0, ACTIVITY: 1, MIRROR: 2, SEMI_DUAL: 3, BENEFICIARY: 4 }
  const sorted = [...seekers].sort((a, b) => (order[a.theySeeMeAs] ?? 9) - (order[b.theySeeMeAs] ?? 9))

  function toggle() {
    const next = !open
    if (isPremium) window.umami?.track('seeking-you-toggled', { open: next, type: userType })
    else if (next) window.umami?.track('seeking-you-teaser-opened', { type: userType })
    setOpen(next)
  }

  return (
    <div style={{ border: '1px solid var(--accent-lt)', borderRadius: 8, marginBottom: '1.5rem', overflow: 'hidden', background: 'rgba(154,111,56,0.04)' }}>
      <button
        type="button"
        onClick={toggle}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', textAlign: 'left' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 600 }}>
            Who's looking for you
          </span>
          {!isPremium && <span aria-hidden="true" style={{ fontSize: '0.85rem', lineHeight: 1 }}>🔒</span>}
        </span>
        <span style={{ color: 'var(--accent)', fontSize: '0.7rem', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 1.1rem 1.1rem' }}>
          {isPremium ? (
            <>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '0.85rem' }}>
                By the intertype matrix, these types are the ones most likely to be seeking <strong style={{ color: 'var(--accent)', fontWeight: 600 }}>{userType}</strong> — they see you as a strong dynamic from their side. Tap one to filter your feed for it.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sorted.map(({ type, theySeeMeAs, iSeeThemAs }) => {
                  const theirRel = RELATIONS[theySeeMeAs]
                  const myRel = RELATIONS[iSeeThemAs]
                  const q = getQuadra(type)
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { window.umami?.track('seeking-you-relation-clicked', { type, relation: iSeeThemAs }); onExploreRelation?.(iSeeThemAs) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', textAlign: 'left', background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '0.6rem 0.75rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-lt)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', color: QUADRA_COLOURS[q] ?? 'var(--accent)', width: 38, flexShrink: 0 }}>{type}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text)' }}>
                          They see you as their <strong style={{ fontWeight: 600 }}>{theirRel?.name ?? theySeeMeAs}</strong>
                        </span>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                          You see them as your {myRel?.name ?? iSeeThemAs}
                        </span>
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent)', flexShrink: 0, whiteSpace: 'nowrap' }}>Filter →</span>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            // Free teaser — blurred list + unlock CTA, matching the compatibility-breakdown pattern
            <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden' }}>
              <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', filter: 'blur(5px)', opacity: 0.55, userSelect: 'none', pointerEvents: 'none' }}>
                {sorted.slice(0, 4).map(({ type, theySeeMeAs }) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '0.6rem 0.75rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, width: 38 }}>{type}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>They see you as their {RELATIONS[theySeeMeAs]?.name ?? theySeeMeAs}</span>
                  </div>
                ))}
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.5rem', padding: '1rem', background: 'linear-gradient(to bottom, rgba(247,244,239,0.4), rgba(247,244,239,0.85))' }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
                  See which types are seeking <em>you</em>
                </p>
                <p style={{ fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.5, margin: 0, maxWidth: 320 }}>
                  Premium reveals the types most likely to be looking for {userType} by the matrix — and filters your feed to them in one tap.
                </p>
                <Link
                  to="/premium"
                  onClick={() => window.umami?.track('seeking-you-teaser-cta', { type: userType })}
                  style={{ marginTop: '0.15rem', background: 'var(--accent)', color: '#fff', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 500, padding: '0.45rem 1rem', borderRadius: 4 }}
                >
                  Unlock with Premium
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
