import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getTypesSeekingMe, RELATIONS, getQuadra } from '../../data/relations'

// "Who's looking for you" — premium panel. Pure matrix derivation, no query.
//
// Intertype relations are asymmetric, so for any member there are two distinct
// directions worth surfacing, and we show BOTH, clearly separated, so the
// reader never has to derive which side is which:
//
//   THEY SEEK YOU  — types drawn to pursue you. This is the symmetric strong
//     band (Dual/Activity/Mirror/Semi-Dual, mutual) plus the types who see you
//     as their Benefactor: they receive from you, so they're the invested,
//     pursuing side.
//   YOU'D SEEK THEM — types who see you as their Beneficiary: you receive from
//     them, so you're the drawn-in side. These are your benefactors, the strong
//     matches worth pursuing.
//
// getTypesSeekingMe reads getRelation(other, me) — the OTHER party's view of you
// — so theySeeMeAs is exactly the feed's displayRelation, and the Filter button
// targets theySeeMeAs (never iSeeThemAs) so asymmetric rows land on real results.

const SEEK_YOU_RELATIONS = ['DUAL', 'ACTIVITY', 'MIRROR', 'SEMI_DUAL', 'BENEFACTOR']
const YOU_SEEK_RELATIONS = ['BENEFICIARY']

const SEEK_YOU_ORDER = { DUAL: 0, ACTIVITY: 1, MIRROR: 2, SEMI_DUAL: 3, BENEFACTOR: 4 }

const QUADRA_COLOURS = {
  Alpha: '#BA7517', Beta: '#791F1F', Gamma: '#0F6E56', Delta: '#185FA5',
}

function Row({ entry, onExploreRelation }) {
  const { type, theySeeMeAs, iSeeThemAs } = entry
  const theirRel = RELATIONS[theySeeMeAs]
  const myRel = RELATIONS[iSeeThemAs]
  const q = getQuadra(type)
  return (
    <button
      type="button"
      onClick={() => { window.umami?.track('seeking-you-relation-clicked', { type, relation: theySeeMeAs }); onExploreRelation?.(theySeeMeAs) }}
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
      <span style={{ fontSize: '0.7rem', color: 'var(--accent)', flexShrink: 0, whiteSpace: 'nowrap' }}>Filter &rarr;</span>
    </button>
  )
}

export default function SeekingYou({ userType, isPremium, onExploreRelation }) {
  const [open, setOpen] = useState(false)

  if (!userType) return null

  const seekYou = getTypesSeekingMe(userType, SEEK_YOU_RELATIONS)
    .sort((a, b) => (SEEK_YOU_ORDER[a.theySeeMeAs] ?? 9) - (SEEK_YOU_ORDER[b.theySeeMeAs] ?? 9))
  const youSeek = getTypesSeekingMe(userType, YOU_SEEK_RELATIONS)

  if (seekYou.length === 0 && youSeek.length === 0) return null

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
            Your strongest matches
          </span>
          {!isPremium && <span aria-hidden="true" style={{ fontSize: '0.85rem', lineHeight: 1 }}>&#128274;</span>}
        </span>
        <span style={{ color: 'var(--accent)', fontSize: '0.7rem', flexShrink: 0 }}>{open ? '\u25B2' : '\u25BC'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 1.1rem 1.1rem' }}>
          {isPremium ? (
            <>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
                By the intertype matrix, computed for <strong style={{ color: 'var(--accent)', fontWeight: 600 }}>{userType}</strong>. Because relations are asymmetric, these split two ways. Tap any row to filter your feed to it.
              </p>

              {seekYou.length > 0 && (
                <div style={{ marginBottom: youSeek.length > 0 ? '1.1rem' : 0 }}>
                  <p style={sectionLabel}>Most likely to be seeking you</p>
                  <p style={sectionHint}>Mutual strong fits, plus types who benefit from you &mdash; the more invested, pursuing side.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {seekYou.map(e => <Row key={e.type} entry={e} onExploreRelation={onExploreRelation} />)}
                  </div>
                </div>
              )}

              {youSeek.length > 0 && (
                <div>
                  <p style={sectionLabel}>Worth seeking out yourself</p>
                  <p style={sectionHint}>Your benefactors &mdash; you're the more drawn-in side here, so the first move is usually yours.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {youSeek.map(e => <Row key={e.type} entry={e} onExploreRelation={onExploreRelation} />)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden' }}>
              <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', filter: 'blur(5px)', opacity: 0.55, userSelect: 'none', pointerEvents: 'none' }}>
                {seekYou.slice(0, 4).map(({ type, theySeeMeAs }) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '0.6rem 0.75rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, width: 38 }}>{type}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>They see you as their {RELATIONS[theySeeMeAs]?.name ?? theySeeMeAs}</span>
                  </div>
                ))}
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '0.5rem', padding: '1rem', background: 'linear-gradient(to bottom, rgba(247,244,239,0.4), rgba(247,244,239,0.85))' }}>
                <p style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
                  See your strongest matches for <em>{userType}</em>
                </p>
                <p style={{ fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.5, margin: 0, maxWidth: 320 }}>
                  Premium reveals which types are most likely to be seeking you, which are worth seeking out yourself, and filters your feed to them in one tap.
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

const sectionLabel = { fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 600, marginBottom: '0.25rem' }
const sectionHint = { fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '0.6rem' }
