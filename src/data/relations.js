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

export const MATRIX = {
  ILE: { ILE:'IDENTITY', SEI:'DUAL', ESE:'ACTIVITY', LII:'MIRROR', EIE:'BUSINESS', LSI:'CONTRARY', SLE:'QUASI_IDENTITY', IEI:'ILLUSIONARY', SEE:'CONFLICT', ILI:'SUPER_EGO', LIE:'KINDRED', ESI:'SEMI_DUAL', LSE:'BENEFICIARY', EII:'SUPERVISOR', IEE:'SUPERVISEE', SLI:'BENEFACTOR' },
  SEI: { ILE:'DUAL', SEI:'IDENTITY', ESE:'MIRROR', LII:'ACTIVITY', EIE:'ILLUSIONARY', LSI:'BUSINESS', SLE:'CONTRARY', IEI:'QUASI_IDENTITY', SEE:'SUPER_EGO', ILI:'CONFLICT', LIE:'SEMI_DUAL', ESI:'KINDRED', LSE:'BENEFACTOR', EII:'BENEFICIARY', IEE:'SUPERVISOR', SLI:'SUPERVISEE' },
  ESE: { ILE:'ACTIVITY', SEI:'MIRROR', ESE:'IDENTITY', LII:'DUAL', EIE:'KINDRED', LSI:'SEMI_DUAL', SLE:'ILLUSIONARY', IEI:'BUSINESS', SEE:'SUPERVISEE', ILI:'BENEFACTOR', LIE:'CONFLICT', ESI:'SUPER_EGO', LSE:'QUASI_IDENTITY', EII:'CONTRARY', IEE:'BENEFICIARY', SLI:'SUPERVISOR' },
  LII: { ILE:'MIRROR', SEI:'ACTIVITY', ESE:'DUAL', LII:'IDENTITY', EIE:'SEMI_DUAL', LSI:'KINDRED', SLE:'BUSINESS', IEI:'CONTRARY', SEE:'BENEFACTOR', ILI:'SUPERVISEE', LIE:'SUPER_EGO', ESI:'CONFLICT', LSE:'CONTRARY', EII:'QUASI_IDENTITY', IEE:'SUPERVISOR', SLI:'ILLUSIONARY' },
  EIE: { ILE:'BUSINESS', SEI:'ILLUSIONARY', ESE:'KINDRED', LII:'SEMI_DUAL', EIE:'IDENTITY', LSI:'DUAL', SLE:'ACTIVITY', IEI:'MIRROR', SEE:'CONFLICT', ILI:'SUPER_EGO', LIE:'SUPERVISEE', ESI:'BENEFACTOR', LSE:'QUASI_IDENTITY', EII:'CONTRARY', IEE:'BENEFICIARY', SLI:'SUPERVISOR' },
  LSI: { ILE:'CONTRARY', SEI:'BUSINESS', ESE:'SEMI_DUAL', LII:'KINDRED', EIE:'DUAL', LSI:'IDENTITY', SLE:'MIRROR', IEI:'ACTIVITY', SEE:'SUPERVISOR', ILI:'SUPERVISEE', LIE:'BENEFACTOR', ESI:'BENEFICIARY', LSE:'ILLUSIONARY', EII:'QUASI_IDENTITY', IEE:'CONFLICT', SLI:'SUPER_EGO' },
  SLE: { ILE:'QUASI_IDENTITY', SEI:'CONTRARY', ESE:'ILLUSIONARY', LII:'BUSINESS', EIE:'ACTIVITY', LSI:'MIRROR', SLE:'IDENTITY', IEI:'DUAL', SEE:'KINDRED', ILI:'SEMI_DUAL', LIE:'BENEFICIARY', ESI:'SUPERVISOR', LSE:'SUPER_EGO', EII:'CONFLICT', IEE:'QUASI_IDENTITY', SLI:'BENEFACTOR' },
  IEI: { ILE:'ILLUSIONARY', SEI:'QUASI_IDENTITY', ESE:'BUSINESS', LII:'CONTRARY', EIE:'MIRROR', LSI:'ACTIVITY', SLE:'DUAL', IEI:'IDENTITY', SEE:'SEMI_DUAL', ILI:'KINDRED', LIE:'SUPERVISOR', ESI:'BENEFACTOR', LSE:'CONFLICT', EII:'SUPER_EGO', IEE:'SUPERVISEE', SLI:'BENEFICIARY' },
  SEE: { ILE:'CONFLICT', SEI:'SUPER_EGO', ESE:'SUPERVISEE', LII:'BENEFACTOR', EIE:'CONFLICT', LSI:'SUPERVISOR', SLE:'KINDRED', IEI:'SEMI_DUAL', SEE:'IDENTITY', ILI:'DUAL', LIE:'ACTIVITY', ESI:'MIRROR', LSE:'ILLUSIONARY', EII:'BUSINESS', IEE:'CONTRARY', SLI:'QUASI_IDENTITY' },
  ILI: { ILE:'SUPER_EGO', SEI:'CONFLICT', ESE:'BENEFACTOR', LII:'SUPERVISEE', EIE:'SUPER_EGO', LSI:'SUPERVISEE', SLE:'SEMI_DUAL', IEI:'KINDRED', SEE:'DUAL', ILI:'IDENTITY', LIE:'MIRROR', ESI:'ACTIVITY', LSE:'BUSINESS', EII:'ILLUSIONARY', IEE:'QUASI_IDENTITY', SLI:'CONTRARY' },
  LIE: { ILE:'KINDRED', SEI:'SEMI_DUAL', ESE:'CONFLICT', LII:'SUPER_EGO', EIE:'SUPERVISEE', LSI:'BENEFACTOR', SLE:'BENEFICIARY', IEI:'SUPERVISOR', SEE:'ACTIVITY', ILI:'MIRROR', LIE:'IDENTITY', ESI:'DUAL', LSE:'CONTRARY', EII:'ILLUSIONARY', IEE:'QUASI_IDENTITY', SLI:'BUSINESS' },
  ESI: { ILE:'SEMI_DUAL', SEI:'KINDRED', ESE:'SUPER_EGO', LII:'CONFLICT', EIE:'BENEFACTOR', LSI:'BENEFICIARY', SLE:'SUPERVISOR', IEI:'BENEFACTOR', SEE:'MIRROR', ILI:'ACTIVITY', LIE:'DUAL', ESI:'IDENTITY', LSE:'QUASI_IDENTITY', EII:'ILLUSIONARY', IEE:'BUSINESS', SLI:'CONTRARY' },
  LSE: { ILE:'BENEFICIARY', SEI:'BENEFACTOR', ESE:'QUASI_IDENTITY', LII:'CONTRARY', EIE:'QUASI_IDENTITY', LSI:'ILLUSIONARY', SLE:'SUPER_EGO', IEI:'CONFLICT', SEE:'ILLUSIONARY', ILI:'BUSINESS', LIE:'CONTRARY', ESI:'QUASI_IDENTITY', LSE:'IDENTITY', EII:'DUAL', IEE:'ACTIVITY', SLI:'MIRROR' },
  EII: { ILE:'SUPERVISOR', SEI:'BENEFICIARY', ESE:'CONTRARY', LII:'QUASI_IDENTITY', EIE:'CONTRARY', LSI:'QUASI_IDENTITY', SLE:'CONFLICT', IEI:'SUPER_EGO', SEE:'BUSINESS', ILI:'ILLUSIONARY', LIE:'ILLUSIONARY', ESI:'ILLUSIONARY', LSE:'DUAL', EII:'IDENTITY', IEE:'MIRROR', SLI:'ACTIVITY' },
  IEE: { ILE:'SUPERVISEE', SEI:'SUPERVISOR', ESE:'BENEFICIARY', LII:'SUPERVISOR', EIE:'BENEFICIARY', LSI:'CONFLICT', SLE:'QUASI_IDENTITY', IEI:'SUPERVISEE', SEE:'CONTRARY', ILI:'QUASI_IDENTITY', LIE:'QUASI_IDENTITY', ESI:'BUSINESS', LSE:'ACTIVITY', EII:'MIRROR', IEE:'IDENTITY', SLI:'DUAL' },
  SLI: { ILE:'BENEFACTOR', SEI:'SUPERVISEE', ESE:'SUPERVISOR', LII:'ILLUSIONARY', EIE:'SUPERVISOR', LSI:'SUPER_EGO', SLE:'BENEFACTOR', IEI:'BENEFICIARY', SEE:'QUASI_IDENTITY', ILI:'CONTRARY', LIE:'BUSINESS', ESI:'CONTRARY', LSE:'MIRROR', EII:'ACTIVITY', IEE:'DUAL', SLI:'IDENTITY' },
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
