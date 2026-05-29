import { RELATIONS, MATRIX } from '../../data/relations'

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

// The feed displays cards using displayRelation (other->me), which inverts asymmetric keys.
// To align stored prefs with displayed labels, we save the inverse key for asymmetric relations.
// e.g. SEI clicks "Benefactor" (label) → saves BENEFICIARY (key) → getMatchingTypes finds EII
//      EII displayRelation = BENEFACTOR → EII card appears under Benefactor pill ✓
// The bracket hint uses the same inverse so the shown type matches the feed result.
const ASYMMETRIC_INVERSE = {
  BENEFACTOR:  'BENEFICIARY',
  BENEFICIARY: 'BENEFACTOR',
  SUPERVISOR:  'SUPERVISEE',
  SUPERVISEE:  'SUPERVISOR',
}

export default function RelationPicker({ selected, onChange, userType }) {
  // For asymmetric relations, the stored key is the inverse of the label key
  // so that getMatchingTypes returns types that displayRelation shows with the label.
  function storedKey(rel) {
    return ASYMMETRIC_INVERSE[rel] ?? rel
  }

  function toggle(rel) {
    const key = storedKey(rel)
    if (selected.includes(key)) {
      onChange(selected.filter(r => r !== key))
    } else {
      onChange([...selected, key])
    }
  }

  function toggleGroup(rels) {
    const keys = rels.map(storedKey)
    const allSelected = keys.every(k => selected.includes(k))
    if (allSelected) {
      onChange(selected.filter(r => !keys.includes(r)))
    } else {
      const toAdd = keys.filter(k => !selected.includes(k))
      onChange([...selected, ...toAdd])
    }
  }

  // A button is selected if its stored key is in the current selection
  function isSelected(rel) {
    return selected.includes(storedKey(rel))
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
              {group.relations.every(r => isSelected(r)) ? 'deselect all' : 'select all'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
            {group.relations.map(rel => {
              const sel = isSelected(rel)
              const info = RELATIONS[rel]

              // Bracket: inverse lookup → type that will appear in feed under this label
              const lookupRel = ASYMMETRIC_INVERSE[rel] ?? rel
              const partnerType = userType
                ? Object.entries(MATRIX[userType] ?? {}).find(([, r]) => r === lookupRel)?.[0]
                : null

              return (
                <button
                  key={rel}
                  onClick={() => toggle(rel)}
                  title={info.description}
                  style={{
                    padding: '0.75rem 1rem',
                    border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 4,
                    background: sel ? 'rgba(154,111,56,0.08)' : '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: sel ? 500 : 300, color: sel ? 'var(--accent)' : 'var(--text)', fontSize: '0.88rem', letterSpacing: '0.04em' }}>
                    {info.name}
                    {partnerType && (
                      <span style={{ fontWeight: 300, color: 'var(--muted)', marginLeft: '0.3em' }}>({partnerType})</span>
                    )}
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
