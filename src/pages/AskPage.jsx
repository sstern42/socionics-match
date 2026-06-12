import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import SocionicsChat from '../components/SocionicsChat'

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
      <SocionicsChat userType={userType} />
    </div>
  )
}
