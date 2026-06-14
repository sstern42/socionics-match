import { useState, useRef, useCallback } from 'react'
import { RELATIONS } from '../../data/relations'
import { countryFlag } from '../../data/countries'
import FlagImage from '../FlagImage'

const SWIPE_THRESHOLD = 100
const ROTATION_FACTOR = 0.06
const FLY_DISTANCE = 700

const RELATION_COLOURS = {
  DUAL:      { bg: 'rgba(154,111,56,0.10)', border: 'var(--accent)',    text: 'var(--accent)' },
  ACTIVITY:  { bg: 'rgba(154,111,56,0.07)', border: 'var(--accent-lt)', text: 'var(--accent)' },
  MIRROR:    { bg: 'rgba(154,111,56,0.05)', border: 'var(--accent-lt)', text: 'var(--accent)' },
  SEMI_DUAL: { bg: 'rgba(154,111,56,0.05)', border: 'var(--accent-lt)', text: 'var(--accent)' },
}
const NEUTRAL = { bg: 'rgba(100,100,100,0.05)', border: 'var(--border)', text: 'var(--muted)' }
const getColours = (rel) => RELATION_COLOURS[rel] ?? NEUTRAL

export default function SwipeCard({ profile, onSwipe, onSkip, isTop, zIndex = 1, stackTransform = 'none', blockRightSwipe = false, onBlockedRightSwipe }) {
  const [dragX, setDragX]       = useState(0)
  const [dragY, setDragY]       = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isFlying, setIsFlying] = useState(false)
  const startRef = useRef(null)

  const { profile_data, type, displayRelation, relation, avatar_url, verified_by, is_founding_member, plan_status } = profile
  const relKey   = displayRelation ?? relation
  const relInfo  = RELATIONS[relKey]
  const colours  = getColours(relKey)
  const isAnon   = profile_data?.anonymous ?? false

  const displayName = isAnon ? 'Anonymous' : (profile_data?.name ?? type)
  const genderEmoji = { Man: '👨', Woman: '👩', 'Non-binary': '🧑' }[profile_data?.gender]
  const flag = isAnon ? null : countryFlag(profile_data?.country)

  const memberBadge = !isAnon && (
    is_founding_member
      ? <span title="Founding member" style={{ fontSize: '0.75rem', color: 'var(--accent)', marginLeft: '0.25rem', verticalAlign: 'middle', lineHeight: 1 }}>✦</span>
      : (plan_status === 'active' || plan_status === 'past_due')
        ? <span title="Premium subscriber" style={{ fontSize: '0.75rem', color: 'var(--accent)', marginLeft: '0.25rem', verticalAlign: 'middle', lineHeight: 1 }}>★</span>
        : null
  )

  const stampProgress = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1)
  const likeOpacity   = dragX > 0 ? stampProgress : 0
  const passOpacity   = dragX < 0 ? stampProgress : 0

  const handlePointerDown = useCallback((e) => {
    if (!isTop) return
    e.currentTarget.setPointerCapture(e.pointerId)
    startRef.current = { x: e.clientX - dragX, y: e.clientY - dragY }
    setIsDragging(true)
  }, [isTop, dragX, dragY])

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !startRef.current) return
    setDragX(e.clientX - startRef.current.x)
    setDragY(e.clientY - startRef.current.y)
  }, [isDragging])

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    startRef.current = null
    if (Math.abs(dragX) >= SWIPE_THRESHOLD) {
      const direction = dragX > 0 ? 'right' : 'left'
      if (direction === 'right' && blockRightSwipe) {
        setDragX(0); setDragY(0); onBlockedRightSwipe?.(); return
      }
      setIsFlying(true)
      setDragX(dragX > 0 ? FLY_DISTANCE : -FLY_DISTANCE)
      setTimeout(() => onSwipe(direction), 320)
    } else {
      setDragX(0); setDragY(0)
    }
  }, [isDragging, dragX, onSwipe, blockRightSwipe, onBlockedRightSwipe])

  const transform = isTop
    ? `translateX(${dragX}px) translateY(${dragY}px) rotate(${dragX * ROTATION_FACTOR}deg)`
    : stackTransform

  const transition = isTop && (isDragging || isFlying)
    ? 'none'
    : 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)'

  return (
    <div
      style={{ position:'absolute',inset:0,zIndex,transform,transition,cursor:isTop?(isDragging?'grabbing':'grab'):'default',touchAction:'none',userSelect:'none',willChange:isTop?'transform':'auto' }}
      onPointerDown={isTop ? handlePointerDown : undefined}
      onPointerMove={isTop ? handlePointerMove : undefined}
      onPointerUp={isTop ? handlePointerUp : undefined}
      onPointerCancel={isTop ? handlePointerUp : undefined}
    >
      <div style={{
        background:   'var(--card-bg)',
        border:       `1px solid ${colours.border}`,
        borderRadius: 12,
        height:       '100%',
        display:      'flex',
        flexDirection: 'column',
        overflow:     'hidden',
        position:     'relative',
        boxShadow:    isTop ? '0 8px 32px rgba(0,0,0,0.10)' : '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div aria-hidden="true" style={{ position:'absolute',top:24,left:20,zIndex:10,opacity:likeOpacity,border:'3px solid #4caf50',borderRadius:6,padding:'3px 12px',transform:'rotate(-16deg)',pointerEvents:'none',transition:'opacity 0.05s' }}>
          <span style={{ color:'#4caf50',fontWeight:700,fontSize:'1.4rem',letterSpacing:'0.12em',fontFamily:'var(--sans)' }}>LIKE</span>
        </div>
        <div aria-hidden="true" style={{ position:'absolute',top:24,right:20,zIndex:10,opacity:passOpacity,border:'3px solid #e53935',borderRadius:6,padding:'3px 12px',transform:'rotate(16deg)',pointerEvents:'none',transition:'opacity 0.05s' }}>
          <span style={{ color:'#e53935',fontWeight:700,fontSize:'1.4rem',letterSpacing:'0.12em',fontFamily:'var(--sans)' }}>PASS</span>
        </div>

        {avatar_url && !isAnon ? (
          <div style={{ height:220,flexShrink:0,overflow:'hidden',background:'var(--surface)' }}>
            <img src={avatar_url} alt={displayName} draggable={false} style={{ width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none' }} />
          </div>
        ) : (
          <div style={{ height:130,flexShrink:0,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <span style={{ fontFamily:'var(--serif)',fontSize:'3.5rem',color:'var(--accent-lt)',lineHeight:1 }}>{isAnon ? '🕵️' : (profile_data?.name?.[0]?.toUpperCase() ?? '?')}</span>
          </div>
        )}

        <div style={{ flex:1,padding:'1rem 1.1rem',display:'flex',flexDirection:'column',gap:'0.65rem',overflowY:'auto',minHeight:0 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'0.5rem' }}>
            <div style={{ minWidth:0 }}>
              <h3 style={{ fontFamily:'var(--serif)',fontSize:'1.2rem',fontWeight:500,margin:0,lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                {displayName}{genderEmoji && !isAnon ? ` ${genderEmoji}` : ''}{memberBadge}
              </h3>
              {(flag || (profile_data?.city && !isAnon)) && (
                <p style={{ fontSize:'0.78rem',color:'var(--muted)',marginTop:'0.15rem' }}>
                  {flag && <FlagImage code={flag} style={{ marginRight: profile_data?.city && !isAnon ? '0.3rem' : 0 }} />}
                  {profile_data?.city && !isAnon ? profile_data.city : ''}
                </p>
              )}
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:'0.25rem',flexShrink:0,fontSize:'0.7rem',letterSpacing:'0.08em',textTransform:'uppercase',fontWeight:500,color:colours.text,background:colours.bg,border:`1px solid ${colours.border}`,padding:'0.22rem 0.55rem',borderRadius:3 }}>
              {type}
              {verified_by && !isAnon && <span style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',width:11,height:11,borderRadius:'50%',background:'var(--accent)',color:'#fff',fontSize:'0.42rem',fontWeight:700,lineHeight:1 }}>✓</span>}
            </div>
          </div>

          {relInfo && (
            <div style={{ background:colours.bg,border:`1px solid ${colours.border}`,borderRadius:4,padding:'0.5rem 0.75rem',flexShrink:0 }}>
              <p style={{ fontSize:'0.68rem',letterSpacing:'0.12em',textTransform:'uppercase',color:colours.text,fontWeight:500,margin:0 }}>{relInfo.name}</p>
              <p style={{ fontSize:'0.74rem',color:'var(--muted)',marginTop:'0.18rem',lineHeight:1.5,margin:'0.18rem 0 0' }}>{relInfo.description}</p>
            </div>
          )}

          <p style={{ fontSize:'0.84rem',lineHeight:1.65,fontWeight:300,margin:0,fontStyle:profile_data?.bio?'normal':'italic',color:profile_data?.bio?'var(--text)':'var(--border)',whiteSpace:'pre-wrap' }}>
            {profile_data?.bio ? (profile_data.bio.length > 160 ? profile_data.bio.slice(0,160)+'…' : profile_data.bio) : 'No bio yet.'}
          </p>
        </div>

        {isTop && (
          <div
            onPointerDown={e => e.stopPropagation()}
            style={{ display:'flex',gap:'0.5rem',padding:'0.75rem 1.1rem',borderTop:'1px solid var(--border)',background:'var(--card-bg)',flexShrink:0 }}
          >
            <button type="button" onClick={() => onSwipe('left')} style={{ flex:1,border:'1px solid #e53935',borderRadius:4,background:'transparent',color:'#e53935',padding:'0.55rem',cursor:'pointer',fontSize:'0.78rem',fontFamily:'var(--sans)',fontWeight:500,letterSpacing:'0.06em',textTransform:'uppercase' }}>✕  Pass</button>
            <button type="button" onClick={() => onSkip?.()} title="Show again later this session" style={{ flex:'0 0 auto',border:'1px solid var(--border)',borderRadius:4,background:'transparent',color:'var(--muted)',padding:'0.55rem 0.85rem',cursor:'pointer',fontSize:'0.78rem',fontFamily:'var(--sans)',fontWeight:500,letterSpacing:'0.04em' }}>↩</button>
            <button type="button" onClick={() => { if (blockRightSwipe) { onBlockedRightSwipe?.(); return } onSwipe('right') }} style={{ flex:1,border:'1px solid #4caf50',borderRadius:4,background:'transparent',color:'#4caf50',padding:'0.55rem',cursor:'pointer',fontSize:'0.78rem',fontFamily:'var(--sans)',fontWeight:500,letterSpacing:'0.06em',textTransform:'uppercase' }}>♥  Like</button>
          </div>
        )}
      </div>
    </div>
  )
}
