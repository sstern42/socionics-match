import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import EntryChoice from '../components/onboarding/EntryChoice'
import TypeSelector from '../components/onboarding/TypeSelector'
import PurposePicker from '../components/profile/PurposePicker'
import { useAuth } from '../lib/AuthContext'
import { usePageMeta } from '../hooks/usePageMeta'

export default function Onboarding() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  usePageMeta('Get Started | Socion™', "Tell us what you're looking for, find your Socionics type, and create your free profile — takes about two minutes.")

  const knowsType = searchParams.get('know') === '1'
  const [step, setStep] = useState('purpose')
  const [purposes, setPurposes] = useState([])
  // 'know' = user's own confirmed type, used as-is.
  // 'find' = a starting guess only — flags a follow-up chat right after
  // signup (via the socion_wants_chat flag) that can overwrite it, per
  // issue #866's "placeholder-then-promote" onboarding flow.
  const [entryMode, setEntryMode] = useState(knowsType ? 'know' : null)

  // If user returns via magic link with session + saved onboarding data, skip to profile setup
  useEffect(() => {
    if (session && localStorage.getItem('socion_type')) {
      navigate('/profile/setup', { replace: true })
    }
  }, [session, navigate])

  function handlePurposeNext() {
    localStorage.setItem('socion_purpose', JSON.stringify(purposes))
    window.umami?.track('onboarding-started', { purposes: purposes.join(',') })
    setStep(knowsType ? 'selector' : 'entry')
  }

  function handleConfirm(type, distribution) {
    sessionStorage.setItem('socion_type', type)
    sessionStorage.setItem('socion_confidence', JSON.stringify(distribution))
    localStorage.setItem('socion_type', type)
    localStorage.setItem('socion_confidence', JSON.stringify(distribution))
    // Explicitly set/clear rather than only setting — otherwise a stale '1'
    // from an earlier abandoned "I don't know yet" attempt in this browser
    // could wrongly force a later "I know my type" confirm into the chat.
    if (entryMode === 'find') {
      sessionStorage.setItem('socion_wants_chat', '1')
      localStorage.setItem('socion_wants_chat', '1')
    } else {
      sessionStorage.removeItem('socion_wants_chat')
      localStorage.removeItem('socion_wants_chat')
    }
    if (session) {
      navigate('/profile/setup')
    } else {
      navigate(`/auth?type=${encodeURIComponent(type)}`)
    }
  }

  return (
    <Layout>
      <section style={{
        minHeight: 'calc(100vh - 72px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '4rem 1.5rem',
      }}>
        {step === 'purpose' && (
          <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p className="eyebrow">Step 1 of 4</p>
              <h1 style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
                What are you <em>looking for?</em>
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '0.75rem' }}>
                Select everything that applies. You can change this later.
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.4rem', opacity: 0.75 }}>
                You'll sign in with Google or email at the end to save your profile.
              </p>
            </div>
            <PurposePicker selected={purposes} onChange={setPurposes} />
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handlePurposeNext}
                disabled={purposes.length === 0}
                style={{ opacity: purposes.length === 0 ? 0.5 : 1 }}
              >
                Next — find your type
              </button>
            </div>
          </div>
        )}

        {step === 'entry' && (
          <EntryChoice
            onKnowType={() => { setEntryMode('know'); setStep('selector') }}
            onFindType={() => { setEntryMode('find'); setStep('selector') }}
          />
        )}
        {step === 'selector' && entryMode === 'find' && (
          <TypeSelector
            onConfirm={handleConfirm}
            eyebrow="Starting guess"
            title={<>Take your best <em>guess</em></>}
            description="You don't need to get this right — it's just a starting point. Right after you sign up, a short typing chat will give you a real preliminary read and can update it."
            confirmLabel="Continue"
          />
        )}
        {step === 'selector' && entryMode !== 'find' && (
          <TypeSelector onConfirm={handleConfirm} />
        )}
      </section>
    </Layout>
  )
}
