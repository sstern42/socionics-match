import { QUESTIONS } from '../../data/questions'

export default function QuestionScreen({ questionIndex, answers, onAnswer }) {
  const q = QUESTIONS[questionIndex]
  const total = QUESTIONS.length
  const progress = ((questionIndex) / total) * 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem', padding: '2rem', maxWidth: 580, margin: '0 auto', width: '100%' }}>
      {/* Progress */}
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span className="eyebrow">Question {questionIndex + 1} of {total}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 2, background: 'var(--border)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Question */}
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.4rem,3.5vw,2.2rem)', fontWeight: 500, lineHeight: 1.3, textAlign: 'center' }}>
        {q.text}
      </h2>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        {['a', 'b'].map(opt => (
          <button
            key={opt}
            onClick={() => onAnswer(q.id, opt)}
            style={{
              padding: '1.25rem 1.5rem',
              border: `1px solid ${answers[q.id] === opt ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 4,
              background: answers[q.id] === opt ? 'rgba(154,111,56,0.08)' : '#fff',
              color: answers[q.id] === opt ? 'var(--accent)' : 'var(--text)',
              fontFamily: 'var(--sans)',
              fontSize: '0.95rem',
              fontWeight: 300,
              lineHeight: 1.6,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontWeight: 500, marginRight: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.72rem', color: 'var(--accent-lt)' }}>
              {opt.toUpperCase()}
            </span>
            {q[opt]}
          </button>
        ))}
      </div>
    </div>
  )
}
