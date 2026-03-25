export const TYPES = [
  'ILE', 'SEI', 'ESE', 'LII',
  'EIE', 'LSI', 'SLE', 'IEI',
  'SEE', 'ILI', 'LIE', 'ESI',
  'LSE', 'EII', 'IEE', 'SLI'
]

export const RELATIONS = {
  DUAL:           { name: 'Dual',           description: 'Full complementarity. Each type\'s strengths meet the other\'s blind spots.' },
  ACTIVITY:       { name: 'Activity',       description: 'Energising and stimulating. Can become unstable at close range.' },
  MIRROR:         { name: 'Mirror',         description: 'Intellectually aligned but prone to mutual criticism.' },
  IDENTITY:       { name: 'Identity',       description: 'Same type. Comfortable but no complementarity.' },
  KINDRED:        { name: 'Kindred',        description: 'Similar outlook, minor functional differences.' },
  SEMI_DUAL:      { name: 'Semi-Dual',      description: 'Partial complementarity. Comfortable but incomplete.' },
  BUSINESS:       { name: 'Business',       description: 'Productive collaboration, limited personal depth.' },
  QUASI_IDENTITY: { name: 'Quasi-Identity', description: 'Appear similar, optimise for opposite ends.' },
  CONFLICT:       { name: 'Conflict',       description: 'Fundamental incompatibility. Draining for both.' },
  SUPER_EGO:      { name: 'Super-Ego',      description: 'Mutual respect at distance, friction up close.' },
  CONTRARY:       { name: 'Contrary',       description: 'Alternate views on the same problems.' },
  BENEFACTOR:     { name: 'Benefactor',     description: 'One-directional support; giver benefits more than receiver.' },
  BENEFICIARY:    { name: 'Beneficiary',    description: 'Receiving end of Benefactor relation.' },
  SUPERVISOR:     { name: 'Supervisor',     description: 'One type monitors the other\'s weak points.' },
  SUPERVISEE:     { name: 'Supervisee',     description: 'Receiving end of Supervision relation.' },
  ILLUSIONARY:    { name: 'Illusionary',    description: 'Initial attraction gives way to mutual misreading.' },
}

// Matrix sourced from socionics.com/rel/relcht.htm — validated for symmetry and completeness.
// Row = type A, column = type B, value = relation from A's perspective.
export const MATRIX = {
  ILE: { ILE:'IDENTITY', SEI:'DUAL', ESE:'ACTIVITY', LII:'MIRROR', EIE:'BENEFACTOR', LSI:'SUPERVISOR', SLE:'KINDRED', IEI:'ILLUSIONARY', SEE:'SUPER_EGO', ILI:'CONTRARY', LIE:'QUASI_IDENTITY', ESI:'CONFLICT', LSE:'BENEFICIARY', EII:'SUPERVISEE', IEE:'BUSINESS', SLI:'SEMI_DUAL' },
  SEI: { ILE:'DUAL', SEI:'IDENTITY', ESE:'MIRROR', LII:'ACTIVITY', EIE:'SUPERVISOR', LSI:'BENEFACTOR', SLE:'ILLUSIONARY', IEI:'KINDRED', SEE:'CONTRARY', ILI:'SUPER_EGO', LIE:'CONFLICT', ESI:'QUASI_IDENTITY', LSE:'SUPERVISEE', EII:'BENEFICIARY', IEE:'SEMI_DUAL', SLI:'BUSINESS' },
  ESE: { ILE:'ACTIVITY', SEI:'MIRROR', ESE:'IDENTITY', LII:'DUAL', EIE:'BUSINESS', LSI:'SEMI_DUAL', SLE:'BENEFICIARY', IEI:'SUPERVISEE', SEE:'QUASI_IDENTITY', ILI:'CONFLICT', LIE:'SUPER_EGO', ESI:'CONTRARY', LSE:'KINDRED', EII:'ILLUSIONARY', IEE:'BENEFACTOR', SLI:'SUPERVISOR' },
  LII: { ILE:'MIRROR', SEI:'ACTIVITY', ESE:'DUAL', LII:'IDENTITY', EIE:'SEMI_DUAL', LSI:'BUSINESS', SLE:'SUPERVISEE', IEI:'BENEFICIARY', SEE:'CONFLICT', ILI:'QUASI_IDENTITY', LIE:'CONTRARY', ESI:'SUPER_EGO', LSE:'ILLUSIONARY', EII:'KINDRED', IEE:'SUPERVISOR', SLI:'BENEFACTOR' },
  EIE: { ILE:'BENEFICIARY', SEI:'SUPERVISEE', ESE:'BUSINESS', LII:'SEMI_DUAL', EIE:'IDENTITY', LSI:'DUAL', SLE:'ACTIVITY', IEI:'MIRROR', SEE:'BENEFACTOR', ILI:'SUPERVISOR', LIE:'KINDRED', ESI:'ILLUSIONARY', LSE:'SUPER_EGO', EII:'CONTRARY', IEE:'QUASI_IDENTITY', SLI:'CONFLICT' },
  LSI: { ILE:'SUPERVISEE', SEI:'BENEFICIARY', ESE:'SEMI_DUAL', LII:'BUSINESS', EIE:'DUAL', LSI:'IDENTITY', SLE:'MIRROR', IEI:'ACTIVITY', SEE:'SUPERVISOR', ILI:'BENEFACTOR', LIE:'ILLUSIONARY', ESI:'KINDRED', LSE:'CONTRARY', EII:'SUPER_EGO', IEE:'CONFLICT', SLI:'QUASI_IDENTITY' },
  SLE: { ILE:'KINDRED', SEI:'ILLUSIONARY', ESE:'BENEFACTOR', LII:'SUPERVISOR', EIE:'ACTIVITY', LSI:'MIRROR', SLE:'IDENTITY', IEI:'DUAL', SEE:'BUSINESS', ILI:'SEMI_DUAL', LIE:'BENEFICIARY', ESI:'SUPERVISEE', LSE:'QUASI_IDENTITY', EII:'CONFLICT', IEE:'SUPER_EGO', SLI:'CONTRARY' },
  IEI: { ILE:'ILLUSIONARY', SEI:'KINDRED', ESE:'SUPERVISOR', LII:'BENEFACTOR', EIE:'MIRROR', LSI:'ACTIVITY', SLE:'DUAL', IEI:'IDENTITY', SEE:'SEMI_DUAL', ILI:'BUSINESS', LIE:'SUPERVISEE', ESI:'BENEFICIARY', LSE:'CONFLICT', EII:'QUASI_IDENTITY', IEE:'CONTRARY', SLI:'SUPER_EGO' },
  SEE: { ILE:'SUPER_EGO', SEI:'CONTRARY', ESE:'QUASI_IDENTITY', LII:'CONFLICT', EIE:'BENEFICIARY', LSI:'SUPERVISEE', SLE:'BUSINESS', IEI:'SEMI_DUAL', SEE:'IDENTITY', ILI:'DUAL', LIE:'ACTIVITY', ESI:'MIRROR', LSE:'BENEFACTOR', EII:'SUPERVISOR', IEE:'KINDRED', SLI:'ILLUSIONARY' },
  ILI: { ILE:'CONTRARY', SEI:'SUPER_EGO', ESE:'CONFLICT', LII:'QUASI_IDENTITY', EIE:'SUPERVISEE', LSI:'BENEFICIARY', SLE:'SEMI_DUAL', IEI:'BUSINESS', SEE:'DUAL', ILI:'IDENTITY', LIE:'MIRROR', ESI:'ACTIVITY', LSE:'SUPERVISOR', EII:'BENEFACTOR', IEE:'ILLUSIONARY', SLI:'KINDRED' },
  LIE: { ILE:'QUASI_IDENTITY', SEI:'CONFLICT', ESE:'SUPER_EGO', LII:'CONTRARY', EIE:'KINDRED', LSI:'ILLUSIONARY', SLE:'BENEFACTOR', IEI:'SUPERVISOR', SEE:'ACTIVITY', ILI:'MIRROR', LIE:'IDENTITY', ESI:'DUAL', LSE:'BUSINESS', EII:'SEMI_DUAL', IEE:'BENEFICIARY', SLI:'SUPERVISEE' },
  ESI: { ILE:'CONFLICT', SEI:'QUASI_IDENTITY', ESE:'CONTRARY', LII:'SUPER_EGO', EIE:'ILLUSIONARY', LSI:'KINDRED', SLE:'SUPERVISOR', IEI:'BENEFACTOR', SEE:'MIRROR', ILI:'ACTIVITY', LIE:'DUAL', ESI:'IDENTITY', LSE:'SEMI_DUAL', EII:'BUSINESS', IEE:'SUPERVISEE', SLI:'BENEFICIARY' },
  LSE: { ILE:'BENEFACTOR', SEI:'SUPERVISOR', ESE:'KINDRED', LII:'ILLUSIONARY', EIE:'SUPER_EGO', LSI:'CONTRARY', SLE:'QUASI_IDENTITY', IEI:'CONFLICT', SEE:'BENEFICIARY', ILI:'SUPERVISEE', LIE:'BUSINESS', ESI:'SEMI_DUAL', LSE:'IDENTITY', EII:'DUAL', IEE:'ACTIVITY', SLI:'MIRROR' },
  EII: { ILE:'SUPERVISOR', SEI:'BENEFACTOR', ESE:'ILLUSIONARY', LII:'KINDRED', EIE:'CONTRARY', LSI:'SUPER_EGO', SLE:'CONFLICT', IEI:'QUASI_IDENTITY', SEE:'SUPERVISEE', ILI:'BENEFICIARY', LIE:'SEMI_DUAL', ESI:'BUSINESS', LSE:'DUAL', EII:'IDENTITY', IEE:'MIRROR', SLI:'ACTIVITY' },
  IEE: { ILE:'BUSINESS', SEI:'SEMI_DUAL', ESE:'BENEFICIARY', LII:'SUPERVISEE', EIE:'QUASI_IDENTITY', LSI:'CONFLICT', SLE:'SUPER_EGO', IEI:'CONTRARY', SEE:'KINDRED', ILI:'ILLUSIONARY', LIE:'BENEFACTOR', ESI:'SUPERVISOR', LSE:'ACTIVITY', EII:'MIRROR', IEE:'IDENTITY', SLI:'DUAL' },
  SLI: { ILE:'SEMI_DUAL', SEI:'BUSINESS', ESE:'SUPERVISEE', LII:'BENEFICIARY', EIE:'CONFLICT', LSI:'QUASI_IDENTITY', SLE:'CONTRARY', IEI:'SUPER_EGO', SEE:'ILLUSIONARY', ILI:'KINDRED', LIE:'SUPERVISOR', ESI:'BENEFACTOR', LSE:'MIRROR', EII:'ACTIVITY', IEE:'DUAL', SLI:'IDENTITY' },
}

export function getRelation(typeA, typeB) {
  return MATRIX[typeA]?.[typeB] ?? null
}

export function getMatchingTypes(userType, wantedRelations) {
  return TYPES.filter(t => {
    const rel = getRelation(userType, t)
    return rel && wantedRelations.includes(rel)
  })
}
