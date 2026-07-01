import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import Layout from '../components/Layout'
import SocionicsChat from '../components/SocionicsChat'
import { usePageTitle } from '../hooks/usePageTitle'

export default function AskPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialQuestion = searchParams.get('q') || null
  const { session, loading, isPremium } = useAuth()

  useEffect(() => {
    if (!loading && !session) navigate('/auth', { replace: true })
  }, [session, loading])
  const [userType, setUserType] = useState(null)
  const [userId, setUserId] = useState(null)
  const [typeLoading, setTypeLoading] = useState(true)

  usePageTitle('Socionics AI')

  useEffect(() => {
    async function fetchType() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('users')
          .select('id, type')
          .eq('auth_id', user.id)
          .single()
        if (data?.type) setUserType(data.type)
        if (data?.id) setUserId(data.id)
      } finally {
        setTypeLoading(false)
      }
    }
    fetchType()
  }, [])

  if (loading || !session || typeLoading) return null
  
  return (
    <Layout noScroll hideFooter>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 720,
        width: '100%',
        margin: '0 auto',
        padding: '1.5rem 1.5rem',
        minHeight: 0,
        boxSizing: 'border-box',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: '0.78rem', letterSpacing: '0.06em',
            textTransform: 'uppercase', padding: 0,
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            marginBottom: '1rem', alignSelf: 'flex-start',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,3 5,7 9,11"/>
          </svg>
          Back
        </button>
        <div style={{ flex: 1, minHeight: 0 }}>
          <SocionicsChat userType={userType} userId={userId} isPremium={isPremium} initialQuestion={initialQuestion} />
        </div>
      </div>
    </Layout>
  )
}
