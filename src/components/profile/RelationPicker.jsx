import { RELATIONS, MATRIX } from '../../data/relations'

// Group relations by broad compatibility tier for UX clarity
const RELATION_GROUPS = [
  {
    label: 'Complementary',
    key: 'complementary',
    relations: ['DUAL', 'SEMI_DUAL', 'ACTIVITY', 'MIRROR'],
  },
  {
    label: 'Compatible',
    key: 'compatible',
    relations: ['KINDRED', 'BUSINESS', 'BENEFACTOR', 'BENEFICIARY'],
  },
  {
    label: 'Challenging',
    key: 'challenging',
    relations: ['QUASI_IDENTITY', 'ILLUSIONARY', 'CONTRARY', 'SUPERVISOR', 'SUPERVISEE'],
  },
  {
    label: 'Difficult',
    key: 'difficult',
    relations: ['SUPER_EGO', 'CONFLICT', 'IDENTITY'],
  },
]

// For asymmetric relations, the MATRIX value describes your role (e.g. BENEFACTOR = you benefit them).
// To show who fills that role *toward you*, we look up the inverse relation.
const PARTNER_RELATION_LOOKUP = {
  BENEFACTOR:  'BENEFICIARY',
  BENEFICIARY: 'BENEFACTOR',
  SUPERVISOR:  'SUPERVISEE',
  SUPERVISEE:  'SUPERVISOR',
}

export default function RelationPicker({ selected, onChange, userType }) {
  function toggle(rel) {
    if (selected.includes(rel)) {
      onChange(selected.filter(r => r !== rel))
    } else {
      onChange([...selected, rel])
    }
  }

  function toggleGroup(rels) {
    const allSelected = rels.every(r => selected.includes(r))
    if (allSelected) {
      onChange(selected.filter(r => !rels.includes(r)))
    } else {
      const toAdd = rels.filter(r => !selected.includes(r))
      onChange([...selected, ...toAdd])
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {RELATION_GROUPS.map(group => (
        <div key={group.key}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              {group.label}
            </span>
            <button
              onClick={() => toggleGroup(group.relations)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-lt)', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline', letterSpacing: '0.06em' }}
            >
              {group.relations.every(r => selected.includes(r)) ? 'deselect all' : 'select all'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
            {group.relations.map(rel => {
              const isSelected = selected.includes(rel)
              const info = RELATIONS[rel]
              return (
                <button
                  key={rel}
                  onClick={() => toggle(rel)}
                  title={info.description}
                  style={{
                    padding: '0.75rem 1rem',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 4,
                    background: isSelected ? 'rgba(154,111,56,0.08)' : '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: isSelected ? 500 : 300, color: isSelected ? 'var(--accent)' : 'var(--text)', fontSize: '0.88rem', letterSpacing: '0.04em' }}>
                    {info.name}
                    {userType && (() => {
                      const lookupRel = PARTNER_RELATION_LOOKUP[rel] ?? rel
                      const partnerType = Object.entries(MATRIX[userType] ?? {}).find(([, r]) => r === lookupRel)?.[0]
                      return partnerType ? <span style={{ fontWeight: 300, color: 'var(--muted)', marginLeft: '0.3em' }}>({partnerType})</span> : null
                    })()}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>
                    {info.description}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {selected.length > 0 && (
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center' }}>
          {selected.length} relation{selected.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}
