import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import EntryChoice from '../components/onboarding/EntryChoice'
import TypeSelector from '../components/onboarding/TypeSelector'
import QuestionScreen from '../components/onboarding/QuestionScreen'
import ResultScreen from '../components/onboarding/ResultScreen'
import PurposePicker from '../components/profile/PurposePicker'
import { QUESTIONS } from '../data/questions'
import { computeTypeDistribution } from '../data/scoring'
import { useAuth } from '../lib/AuthContext'

export default function Onboarding() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [step, setStep] = useState(() => searchParams.get('know') === '1' ? 'selector' : 'purpose')
  const [purposes, setPurposes] = useState([])

  // If user returns via magic link with session + saved onboarding data, skip to profile setup
  useEffect(() => {
    if (session && localStorage.getItem('socion_type')) {
      navigate('/profile/setup', { replace: true })
    }
  }, [session])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)

  function handlePurposeNext() {
    localStorage.setItem('socion_purpose', JSON.stringify(purposes))
    window.umami?.track('onboarding-started', { purposes: purposes.join(',') })
    setStep('entry')
  }

  function handleAnswer(questionId, choice) {
    const newAnswers = { ...answers, [questionId]: choice }
    setAnswers(newAnswers)
    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex(questionIndex + 1)
    } else {
      const computed = computeTypeDistribution(newAnswers)
      setResult(computed)
      window.umami?.track('assessment-completed', { topType: Object.entries(computed).sort((a,b) => b[1]-a[1])[0]?.[0] ?? '' })
      setStep('result')
    }
  }

  function handleConfirm(type, distribution, rawAnswers) {
    sessionStorage.setItem('socion_type', type)
    sessionStorage.setItem('socion_confidence', JSON.stringify(distribution))
    sessionStorage.setItem('socion_answers', JSON.stringify(rawAnswers ?? {}))
    localStorage.setItem('socion_type', type)
    localStorage.setItem('socion_confidence', JSON.stringify(distribution))
    localStorage.setItem('socion_answers', JSON.stringify(rawAnswers ?? {}))
    if (session) {
      navigate('/profile/setup')
    } else {
      navigate('/auth')
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
            onKnowType={() => setStep('selector')}
            onFindType={() => setStep('questionnaire')}
          />
        )}
        {step === 'questionnaire' && (
          <QuestionScreen
            questionIndex={questionIndex}
            answers={answers}
            onAnswer={handleAnswer}
          />
        )}
        {step === 'result' && result && (
          <ResultScreen
            distribution={result.distribution}
            primaryType={result.primaryType}
            onConfirm={(type, distribution) => handleConfirm(type, distribution, answers)}
            onOverride={() => setStep('selector')}
          />
        )}
        {step === 'selector' && (
          <TypeSelector onConfirm={(type, distribution) => handleConfirm(type, distribution, {})} />
        )}
      </section>
    </Layout>
  )
}
