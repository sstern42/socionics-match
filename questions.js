import { useState } from 'react'
import { TYPES } from '../../data/relations'

const TYPE_DESCRIPTIONS = {
  ILE: 'Intuitive Logical Extravert', LII: 'Logical Intuitive Introvert',
  LIE: 'Logical Intuitive Extravert', ILI: 'Intuitive Logical Introvert',
  EIE: 'Ethical Intuitive Extravert', IEI: 'Intuitive Ethical Introvert',
  IEE: 'Intuitive Ethical Extravert', EII: 'Ethical Intuitive Introvert',
  LSE: 'Logical Sensory Extravert',  SLE: 'Sensory Logical Extravert',
  SLI: 'Sensory Logical Introvert',  LSI: 'Logical Sensory Introvert',
  ESE: 'Ethical Sensory Extravert',  SEE: 'Sensory Ethical Extravert',
  SEI: 'Sensory Ethical Introvert',  ESI: 'Ethical Sensory Introvert',
}

export default function TypeSelector({ onConfirm }) {
  const [selected, setSelected] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', textAlign: 'center', padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <div>
        <p className="eyebrow">Fast track</p>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(1.75rem,4vw,3rem)', marginTop: '0.5rem' }}>
          Select your <em>type</em>
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '0.75rem' }}>
          Your type as determined by the community or your own study.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', width: '100%' }}>
        {TYPES.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setSelected(type)}
            style={{
              padding: '0.85rem 0.5rem',
              border: `1px solid ${selected === type ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 4,
              background: selected === type ? 'rgba(154,111,56,0.08)' : '#fff',
              color: selected === type ? 'var(--accent)' : 'var(--text)',
              fontFamily: 'var(--sans)',
              fontSize: '0.85rem',
              fontWeight: selected === type ? 500 : 300,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {type}
            <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--muted)', marginTop: '0.2rem', letterSpacing: '0.02em' }}>
              {TYPE_DESCRIPTIONS[type]}
            </span>
          </button>
        ))}
      </div>

      <div style={{ minHeight: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        {selected ? (
          <>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
              Selected: <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>{selected} — {TYPE_DESCRIPTIONS[selected]}</strong>
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => onConfirm(selected, { [selected]: 1.0 })}
            >
              Confirm {selected}
            </button>
          </>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>
            Select a type above to continue
          </p>
        )}
      </div>
    </div>
  )
}
