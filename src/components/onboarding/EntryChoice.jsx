import { TYPES } from '../../data/relations'

export default function EntryChoice({ onKnowType, onFindType }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem', textAlign: 'center', padding: '2rem' }}>
      <div>
        <p className="eyebrow fade-up-1" style={{ marginBottom: '1rem' }}>Step 2 of 4</p>
        <h1 className="fade-up-2" style={{ fontSize: 'clamp(2rem,5vw,4rem)' }}>
          Do you know your<br /><em>Socionics type?</em>
        </h1>
        <p className="fade-up-3" style={{ color: 'var(--muted)', maxWidth: 460, margin: '1.25rem auto 0' }}>
          If you already know your type from the community, skip straight to it.
          Otherwise we will work through a short questionnaire together.
        </p>
      </div>

      <div className="fade-up-4" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn-primary" onClick={onKnowType}>I know my type</button>
        <button className="btn-ghost" onClick={onFindType}>Help me find my type</button>
      </div>
    </div>
  )
}
