import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import EntryChoice from '../components/onboarding/EntryChoice'
import TypeSelector from '../components/onboarding/TypeSelector'
import QuestionScreen from '../components/onboarding/QuestionScreen'
import ResultScreen from '../components/onboarding/ResultScreen'
import { QUESTIONS } from '../data/questions'
import { computeTypeDistribution } from '../data/scoring'
import { useAuth } from '../lib/AuthContext'

export default function Onboarding() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('entry')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)

  function handleAnswer(questionId, choice) {
    const newAnswers = { ...answers, [questionId]: choice }
    setAnswers(newAnswers)
    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex(questionIndex + 1)
    } else {
      const computed = computeTypeDistribution(newAnswers)
      setResult(computed)
      setStep('result')
    }
  }

  function handleConfirm(type, distribution) {
    // Persist to sessionStorage so ProfileSetup can read it
    sessionStorage.setItem('socion_type', type)
    sessionStorage.setItem('socion_confidence', JSON.stringify(distribution))

    if (session) {
      // Already signed in — go straight to profile setup
      navigate('/profile/setup')
    } else {
      // Need to create account first
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
            onConfirm={handleConfirm}
            onOverride={() => setStep('selector')}
          />
        )}
        {step === 'selector' && (
          <TypeSelector onConfirm={handleConfirm} />
        )}
      </section>
    </Layout>
  )
}
