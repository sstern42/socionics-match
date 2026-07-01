import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { useUnreadCount, markMessagesRead } from '../lib/useUnreadCount'
import { useNotifications } from '../hooks/useNotifications'
import { getRoomLastVisited } from './Rooms'
import ReferralPanel from '../components/profile/ReferralPanel'

const FREE_DAILY_AI_LIMIT = 10
const BOARD_ACTIVITY_WINDOW_DAYS = 7
const UPDATES_LAST_VISITED_KEY = 'socion_updates_last_visited'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function DashboardCard({ eyebrow, title, children, to, cta = 'Open →', onClick }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--card-bg)' }}>
      <div>
        <p style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.3rem' }}>{eyebrow}</p>
        <p style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text)' }}>{title}</p>
      </div>
      <div style={{ fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.6, flex: 1 }}>{children}</div>
      {to && (
        <Link to={to} onClick={onClick} style={{ fontSize: '0.82rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
          {cta}
        </Link>
      )}
    </div>
  )
}

export default function HomeDashboard() {
  const { session, profile, isPremium } = useAuth()
  const unread = useUnreadCount(profile?.id)
  const { notifications } = useNotifications(profile?.id)

  const [roomActivity, setRoomActivity] = useState(0)
  const [boardActivity, setBoardActivity] = useState(0)
  const [aiUsedToday, setAiUsedToday] = useState(0)
  const [updatesActivity, setUpdatesActivity] = useState(0)

  useEffect(() => {
    if (!profile?.id) return
    let cancelled = false
    async function load() {
      const { data: rooms } = await supabase.from('rooms').select('id')
      if (!rooms?.length) return
      const lastVisited = getRoomLastVisited()
      let query = supabase
        .from('room_messages')
        .select('id', { count: 'exact', head: true })
        .in('room_id', rooms.map(r => r.id))
        .neq('sender_id', profile.id)
        .is('deleted_at', null)
      if (lastVisited) query = query.gt('created_at', lastVisited)
      const { count } = await query
      if (!cancelled) setRoomActivity(count ?? 0)
    }
    load()
    return () => { cancelled = true }
  }, [profile?.id])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const since = new Date(Date.now() - BOARD_ACTIVITY_WINDOW_DAYS * 86400000).toISOString()
      const { count } = await supabase
        .from('board_posts')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gt('created_at', since)
      if (!cancelled) setBoardActivity(count ?? 0)
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const lastVisited = localStorage.getItem(UPDATES_LAST_VISITED_KEY)
      let query = supabase.from('founder_posts').select('id', { count: 'exact', head: true })
      if (lastVisited) query = query.gt('created_at', lastVisited)
      const { count } = await query
      if (!cancelled) setUpdatesActivity(count ?? 0)
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!session?.user?.id || isPremium) return
    function loadAiUsage() {
      const today = new Date().toISOString().slice(0, 10)
      supabase
        .from('ai_message_counts')
        .select('count')
        .eq('user_id', session.user.id)
        .eq('date', today)
        .maybeSingle()
        .then(({ data }) => setAiUsedToday(data?.count ?? 0))
    }
    loadAiUsage()
    window.addEventListener('focus', loadAiUsage)
    return () => window.removeEventListener('focus', loadAiUsage)
  }, [session?.user?.id, isPremium])

  const confidence = profile?.type_confidence
  const peakConfidence = confidence ? Math.max(...Object.values(confidence)) : 1
  const uncertainType = peakConfidence > 0 && peakConfidence < 0.6

  const rawName = profile?.profile_data?.anonymous ? null : profile?.profile_data?.name
  const firstName = rawName ? rawName.split(',')[0].trim().split(' ')[0] : null

  const recentNotifications = notifications.slice(0, 3)

  return (
    <Layout hideFooter>
      <section style={{ maxWidth: 880, margin: '0 auto', padding: 'clamp(2rem,5vw,3rem) 1.5rem 5rem' }}>
        <p className="eyebrow">Socion</p>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.8rem,4.5vw,2.6rem)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          Welcome back{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem', maxWidth: 560 }}>
          Here's what's new across Socion since you last checked in.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
          <Link to="/feed" className="btn-primary">View your matches</Link>
          <Link to="/ask" className="btn-ghost">Ask the AI</Link>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <DashboardCard
            eyebrow="Your type"
            title={uncertainType ? 'Not fully confirmed' : `${profile?.type} — confirmed`}
            to={uncertainType ? '/typing' : '/ask'}
            cta={uncertainType ? 'Get professionally typed →' : 'Ask the AI →'}
          >
            {uncertainType
              ? "Your self-typing result wasn't highly confident. Ask the AI or book a professional typist to confirm it."
              : 'Explore your type further — ask the AI about your relations, dynamics, and compatibility.'}
          </DashboardCard>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
          <DashboardCard
            eyebrow="Messages"
            title={unread > 0 ? `${unread} unread` : 'All caught up'}
            to="/messages"
            cta="Open messages →"
            onClick={markMessagesRead}
          >
            {unread > 0
              ? `You have ${unread} unread message${unread === 1 ? '' : 's'} waiting for a reply.`
              : 'No new messages right now.'}
          </DashboardCard>

          <DashboardCard
            eyebrow="Quadra Rooms"
            title={roomActivity > 0 ? `${roomActivity} new message${roomActivity === 1 ? '' : 's'}` : 'Quiet right now'}
            to="/rooms"
            cta="Join the conversation →"
          >
            {roomActivity > 0
              ? 'Your quadra room and the Socion global chat have been active since your last visit.'
              : 'Drop into your quadra room or the Socion global chat.'}
          </DashboardCard>

          <DashboardCard
            eyebrow="Boards"
            title={boardActivity > 0 ? `${boardActivity} new post${boardActivity === 1 ? '' : 's'} this week` : 'Discussion boards'}
            to="/boards"
            cta="Browse boards →"
          >
            {boardActivity > 0
              ? 'See what the community has been discussing this week.'
              : 'Start or join a discussion about type theory, relationships, and more.'}
          </DashboardCard>

          <DashboardCard
            eyebrow="Ask the AI"
            title={isPremium ? 'Unlimited questions' : `${aiUsedToday}/${FREE_DAILY_AI_LIMIT} today`}
            to="/ask"
            cta="Ask something →"
          >
            {isPremium
              ? 'Ask about your type, your matches, or any relation dynamic.'
              : `You've used ${aiUsedToday} of ${FREE_DAILY_AI_LIMIT} free questions today.`}
          </DashboardCard>

          <DashboardCard
            eyebrow="Founder Updates"
            title={updatesActivity > 0 ? `${updatesActivity} new update${updatesActivity === 1 ? '' : 's'}` : 'No new updates'}
            to="/updates"
            cta="Read updates →"
          >
            {updatesActivity > 0
              ? "See what's new from the team since you last checked in."
              : "You're caught up on news from the team."}
          </DashboardCard>

          <DashboardCard
            eyebrow="Notifications"
            title={recentNotifications.length > 0 ? 'Recent activity' : "You're all caught up"}
          >
            {recentNotifications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentNotifications.map(n => {
                  const row = (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ color: n.read_at ? 'var(--muted)' : 'var(--text)' }}>{n.title}</span>
                      <span style={{ flexShrink: 0, fontSize: '0.72rem' }}>{timeAgo(n.created_at)}</span>
                    </div>
                  )
                  return n.action_url ? (
                    <Link key={n.id} to={n.action_url} style={{ textDecoration: 'none' }}>{row}</Link>
                  ) : (
                    <div key={n.id}>{row}</div>
                  )
                })}
              </div>
            ) : (
              'Nothing new to report.'
            )}
          </DashboardCard>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <ReferralPanel profile={profile} isPremium={isPremium} />
        </div>
      </section>
    </Layout>
  )
}
