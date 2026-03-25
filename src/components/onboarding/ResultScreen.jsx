import { getTopTypes } from '../../data/scoring'
import { TYPES } from '../../data/relations'

const TYPE_NAMES = {
  ILE: 'Intuitive Logical Extravert', LII: 'Logical Intuitive Introvert',
  LIE: 'Logical Intuitive Extravert', ILI: 'Intuitive Logical Introvert',
  EIE: 'Ethical Intuitive Extravert', IEI: 'Intuitive Ethical Introvert',
  IEE: 'Intuitive Ethical Extravert', EII: 'Ethical Intuitive Introvert',
  LSE: 'Logical Sensory Extravert',  SLE: 'Sensory Logical Extravert',
  SLI: 'Sensory Logical Introvert',  LSI: 'Logical Sensory Introvert',
  ESE: 'Ethical Sensory Extravert',  SEE: 'Sensory Ethical Extravert',
  SEI: 'Sensory Ethical Introvert',  ESI: 'Ethical Sensory Introvert',
}

export default function ResultScreen({ distribution, primaryType, onConfirm, onOverride }) {
  const topTypes = getTopTypes(distribution, 4)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem', padding: '2rem', maxWidth: 580, margin: '0 auto', width: '100%', textAlign: 'center' }}>
      <div>
        <p className="eyebrow fade-up-1">Your result</p>
        <h1 className="fade-up-2" style={{ fontSize: 'clamp(2rem,6vw,5rem)', marginTop: '0.5rem' }}>
          <em>{primaryType}</em>
        </h1>
        <p className="fade-up-3" style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
          {TYPE_NAMES[primaryType]}
        </p>
      </div>

      {/* Confidence bars */}
      <div className="fade-up-4" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.25rem' }}>
          Type confidence
        </p>
        {topTypes.map(({ type, confidence }, i) => (
          <div key={type}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontWeight: type === primaryType ? 500 : 300, color: type === primaryType ? 'var(--accent)' : 'var(--text)', fontSize: '0.88rem', letterSpacing: '0.06em' }}>
                {type}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                {Math.round(confidence * 100)}%
              </span>
            </div>
            <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
              <div style={{
                height: '100%',
                width: `${confidence * 100}%`,
                background: i === 0 ? 'var(--accent)' : 'var(--accent-lt)',
                borderRadius: 2,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        ))}
      </div>

      <div className="fade-up-5" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        <button className="btn-primary" onClick={() => onConfirm(primaryType, distribution)}>
          Confirm — I am {primaryType}
        </button>
        <button
          onClick={onOverride}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', padding: '0.25rem' }}
        >
          This doesn't fit — let me choose my type
        </button>
      </div>
    </div>
  )
}
