import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import SocionicsChat from '../components/SocionicsChat'

const navigate = useNavigate()
export default function AskPage() {
  const [userType, setUserType] = useState(null)

  useEffect(() => {
    async function fetchType() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('users')
        .select('type')
        .eq('auth_id', user.id)
        .single()

      if (data?.type) setUserType(data.type)
    }
    fetchType()
  }, [])

  return (
    <div
      style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '24px 16px',
        height: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:'0.82rem', letterSpacing:'0.06em', textTransform:'uppercase', padding:0, display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'12px' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,3 5,7 9,11"/></svg>
        Back
      </button>
      <SocionicsChat userType={userType} />
    </div>
  )
}
