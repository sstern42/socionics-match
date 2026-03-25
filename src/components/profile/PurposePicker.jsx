const PURPOSES = [
  {
    key: 'dating',
    name: 'Dating',
    description: 'Find someone whose type creates natural complementarity.',
  },
  {
    key: 'friendship',
    name: 'Friendship',
    description: 'Meet people whose type creates natural rapport and easy energy.',
  },
  {
    key: 'networking',
    name: 'Networking',
    description: 'Find collaborators whose type complements yours professionally.',
  },
  {
    key: 'team',
    name: 'Team building',
    description: 'Assemble groups with intentional type diversity or complementarity.',
  },
]

export default function PurposePicker({ selected, onChange }) {
  function toggle(key) {
    if (selected.includes(key)) {
      onChange(selected.filter(p => p !== key))
    } else {
      onChange([...selected, key])
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
      {PURPOSES.map(p => {
        const isSelected = selected.includes(p.key)
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => toggle(p.key)}
            style={{
              padding: '1rem 1.25rem',
              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 4,
              background: isSelected ? 'rgba(154,111,56,0.08)' : '#fff',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontWeight: isSelected ? 500 : 400, color: isSelected ? 'var(--accent)' : 'var(--text)', fontSize: '0.95rem', marginBottom: '0.3rem' }}>
              {p.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              {p.description}
            </div>
          </button>
        )
      })}
    </div>
  )
}
