import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { storeReferralCode, storeReferrerName, lookupReferrerName } from '../lib/referral'

// /r/:code — stores the referral code and sends the visitor into the normal
// signup flow. Existing accounts visiting this link get no attribution: the
// code is only ever consumed at account-creation time (see ProfileSetup.jsx).
export default function ReferralLink() {
  const { code } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (code) {
      storeReferralCode(code)
      // Best-effort: powers the "You were invited by X" onboarding banner.
      // Looked up now (pre-signup) since the RPC has no auth context to
      // attribute the lookup to later.
      lookupReferrerName(code).then(name => { if (name) storeReferrerName(name) })
    }
    navigate('/', { replace: true })
  }, [code])

  return null
}
