import { useState } from 'react'
import Layout from '../components/Layout'
import EntryChoice from '../components/onboarding/EntryChoice'
import TypeSelector from '../components/onboarding/TypeSelector'
import QuestionScreen from '../components/onboarding/QuestionScreen'
import ResultScreen from '../components/onboarding/ResultScreen'
import { QUESTIONS } from '../data/questions'
import { computeTypeDistribution } from '../data/scoring'

// Steps: 'entry' | 'questionnaire' | 'result' | 'selector' | 'done'

export default function Onboarding() {
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
      // All questions answered — compute result
      const computed = computeTypeDistribution(newAnswers)
      setResult(computed)
      setStep('result')
    }
  }

  function handleConfirm(type, distribution) {
    // TODO Phase 2: write to Supabase here
    setResult({ ...result, confirmedType: type, distribution })
    setStep('done')
  }

  return (
    <Layout>
      <section style={{
        minHeight: 'calc(100vh - 72px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
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

        {step === 'done' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <p className="eyebrow fade-up-1">Type confirmed</p>
            <h1 className="fade-up-2" style={{ fontSize: 'clamp(2rem,6vw,5rem)' }}>
              <em>{result?.confirmedType}</em>
            </h1>
            <p className="fade-up-3" style={{ color: 'var(--muted)', maxWidth: 420 }}>
              Profile creation and matching are coming in the next phase.
              Your type has been recorded.
            </p>
          </div>
        )}

      </section>
    </Layout>
  )
}
