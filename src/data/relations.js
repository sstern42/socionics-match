export const TYPES = [
  'ILE', 'SEI', 'ESE', 'LII',
  'EIE', 'LSI', 'SLE', 'IEI',
  'SEE', 'ILI', 'LIE', 'ESI',
  'LSE', 'EII', 'IEE', 'SLI'
]

export const RELATIONS = {
  DUAL:           { name: 'Dual',           description: 'Full complementarity. Each type\'s strengths meet the other\'s blind spots.',          siSlug: 'dual' },
  ACTIVITY:       { name: 'Activity',       description: 'Energising and stimulating. Can become unstable at close range.',                        siSlug: 'activation' },
  MIRROR:         { name: 'Mirror',         description: 'Intellectually aligned but prone to mutual criticism.',                                  siSlug: 'mirror' },
  IDENTITY:       { name: 'Identity',       description: 'Same type. Comfortable but no complementarity.',                                         siSlug: 'identity' },
  KINDRED:        { name: 'Kindred',        description: 'Similar outlook, minor functional differences.',                                         siSlug: 'kindred' },
  SEMI_DUAL:      { name: 'Semi-Dual',      description: 'Partial complementarity. Comfortable but incomplete.',                                   siSlug: 'semi-dual' },
  BUSINESS:       { name: 'Business',       description: 'Productive collaboration, limited personal depth.',                                      siSlug: 'business' },
  QUASI_IDENTITY: { name: 'Quasi-Identity', description: 'Appear similar, optimise for opposite ends.',                                            siSlug: 'quasi-identity' },
  CONFLICT:       { name: 'Conflict',       description: 'Fundamental incompatibility. Draining for both.',                                        siSlug: 'conflict' },
  SUPER_EGO:      { name: 'Super-Ego',      description: 'Mutual respect at distance, friction up close.',                                         siSlug: 'super-ego' },
  CONTRARY:       { name: 'Contrary',       description: 'Alternate views on the same problems.',                                                  siSlug: 'extinguishment' },
  BENEFACTOR:     { name: 'Benefactor',     description: 'You give to this person — your strength meets their need.',                              siSlug: 'benefaction' },
  BENEFICIARY:    { name: 'Beneficiary',    description: 'This person gives to you — their strength meets your need.',                             siSlug: 'benefaction' },
  SUPERVISOR:     { name: 'Supervisor',     description: 'You have a clear view of this person\'s most sensitive area.',                           siSlug: 'supervision' },
  SUPERVISEE:     { name: 'Supervisee',     description: 'This person has a clear view of your most sensitive area.',                              siSlug: 'supervision' },
  ILLUSIONARY:    { name: 'Illusionary',    description: 'Initial attraction gives way to mutual misreading.',                                     siSlug: 'mirage' },
}

// Matrix: row = type A, column = type B, value = relation FROM A's perspective.
// BENEFACTOR = you give to them; BENEFICIARY = they give to you.
// SUPERVISOR = you monitor their weak point; SUPERVISEE = they monitor yours.
// Verified symmetrical across all 256 pairs.
export const MATRIX = {
  ILE: { ILE:'IDENTITY', SEI:'DUAL', ESE:'ACTIVITY', LII:'MIRROR', EIE:'BENEFICIARY', LSI:'SUPERVISOR', SLE:'BUSINESS', IEI:'ILLUSIONARY', SEE:'SUPER_EGO', ILI:'CONTRARY', LIE:'QUASI_IDENTITY', ESI:'CONFLICT', LSE:'BENEFACTOR', EII:'SUPERVISEE', IEE:'KINDRED', SLI:'SEMI_DUAL' },
  SEI: { ILE:'DUAL', SEI:'IDENTITY', ESE:'MIRROR', LII:'ACTIVITY', EIE:'SUPERVISOR', LSI:'BENEFICIARY', SLE:'ILLUSIONARY', IEI:'BUSINESS', SEE:'CONTRARY', ILI:'SUPER_EGO', LIE:'CONFLICT', ESI:'QUASI_IDENTITY', LSE:'SUPERVISEE', EII:'BENEFACTOR', IEE:'SEMI_DUAL', SLI:'KINDRED' },
  ESE: { ILE:'ACTIVITY', SEI:'MIRROR', ESE:'IDENTITY', LII:'DUAL', EIE:'KINDRED', LSI:'SEMI_DUAL', SLE:'BENEFACTOR', IEI:'SUPERVISEE', SEE:'QUASI_IDENTITY', ILI:'CONFLICT', LIE:'SUPER_EGO', ESI:'CONTRARY', LSE:'BUSINESS', EII:'ILLUSIONARY', IEE:'BENEFICIARY', SLI:'SUPERVISOR' },
  LII: { ILE:'MIRROR', SEI:'ACTIVITY', ESE:'DUAL', LII:'IDENTITY', EIE:'SEMI_DUAL', LSI:'KINDRED', SLE:'SUPERVISEE', IEI:'BENEFACTOR', SEE:'CONFLICT', ILI:'QUASI_IDENTITY', LIE:'CONTRARY', ESI:'SUPER_EGO', LSE:'ILLUSIONARY', EII:'BUSINESS', IEE:'SUPERVISOR', SLI:'BENEFICIARY' },
  EIE: { ILE:'BENEFACTOR', SEI:'SUPERVISEE', ESE:'KINDRED', LII:'SEMI_DUAL', EIE:'IDENTITY', LSI:'DUAL', SLE:'ACTIVITY', IEI:'MIRROR', SEE:'BENEFICIARY', ILI:'SUPERVISOR', LIE:'BUSINESS', ESI:'ILLUSIONARY', LSE:'SUPER_EGO', EII:'CONTRARY', IEE:'QUASI_IDENTITY', SLI:'CONFLICT' },
  LSI: { ILE:'SUPERVISEE', SEI:'BENEFACTOR', ESE:'SEMI_DUAL', LII:'KINDRED', EIE:'DUAL', LSI:'IDENTITY', SLE:'MIRROR', IEI:'ACTIVITY', SEE:'SUPERVISOR', ILI:'BENEFICIARY', LIE:'ILLUSIONARY', ESI:'BUSINESS', LSE:'CONTRARY', EII:'SUPER_EGO', IEE:'CONFLICT', SLI:'QUASI_IDENTITY' },
  SLE: { ILE:'BUSINESS', SEI:'ILLUSIONARY', ESE:'BENEFICIARY', LII:'SUPERVISOR', EIE:'ACTIVITY', LSI:'MIRROR', SLE:'IDENTITY', IEI:'DUAL', SEE:'KINDRED', ILI:'SEMI_DUAL', LIE:'BENEFACTOR', ESI:'SUPERVISEE', LSE:'QUASI_IDENTITY', EII:'CONFLICT', IEE:'SUPER_EGO', SLI:'CONTRARY' },
  IEI: { ILE:'ILLUSIONARY', SEI:'BUSINESS', ESE:'SUPERVISOR', LII:'BENEFICIARY', EIE:'MIRROR', LSI:'ACTIVITY', SLE:'DUAL', IEI:'IDENTITY', SEE:'SEMI_DUAL', ILI:'KINDRED', LIE:'SUPERVISEE', ESI:'BENEFACTOR', LSE:'CONFLICT', EII:'QUASI_IDENTITY', IEE:'CONTRARY', SLI:'SUPER_EGO' },
  SEE: { ILE:'SUPER_EGO', SEI:'CONTRARY', ESE:'QUASI_IDENTITY', LII:'CONFLICT', EIE:'BENEFACTOR', LSI:'SUPERVISEE', SLE:'KINDRED', IEI:'SEMI_DUAL', SEE:'IDENTITY', ILI:'DUAL', LIE:'ACTIVITY', ESI:'MIRROR', LSE:'BENEFICIARY', EII:'SUPERVISOR', IEE:'BUSINESS', SLI:'ILLUSIONARY' },
  ILI: { ILE:'CONTRARY', SEI:'SUPER_EGO', ESE:'CONFLICT', LII:'QUASI_IDENTITY', EIE:'SUPERVISEE', LSI:'BENEFACTOR', SLE:'SEMI_DUAL', IEI:'KINDRED', SEE:'DUAL', ILI:'IDENTITY', LIE:'MIRROR', ESI:'ACTIVITY', LSE:'SUPERVISOR', EII:'BENEFICIARY', IEE:'ILLUSIONARY', SLI:'BUSINESS' },
  LIE: { ILE:'QUASI_IDENTITY', SEI:'CONFLICT', ESE:'SUPER_EGO', LII:'CONTRARY', EIE:'BUSINESS', LSI:'ILLUSIONARY', SLE:'BENEFICIARY', IEI:'SUPERVISOR', SEE:'ACTIVITY', ILI:'MIRROR', LIE:'IDENTITY', ESI:'DUAL', LSE:'KINDRED', EII:'SEMI_DUAL', IEE:'BENEFACTOR', SLI:'SUPERVISEE' },
  ESI: { ILE:'CONFLICT', SEI:'QUASI_IDENTITY', ESE:'CONTRARY', LII:'SUPER_EGO', EIE:'ILLUSIONARY', LSI:'BUSINESS', SLE:'SUPERVISOR', IEI:'BENEFICIARY', SEE:'MIRROR', ILI:'ACTIVITY', LIE:'DUAL', ESI:'IDENTITY', LSE:'SEMI_DUAL', EII:'KINDRED', IEE:'SUPERVISEE', SLI:'BENEFACTOR' },
  LSE: { ILE:'BENEFICIARY', SEI:'SUPERVISOR', ESE:'BUSINESS', LII:'ILLUSIONARY', EIE:'SUPER_EGO', LSI:'CONTRARY', SLE:'QUASI_IDENTITY', IEI:'CONFLICT', SEE:'BENEFACTOR', ILI:'SUPERVISEE', LIE:'KINDRED', ESI:'SEMI_DUAL', LSE:'IDENTITY', EII:'DUAL', IEE:'ACTIVITY', SLI:'MIRROR' },
  EII: { ILE:'SUPERVISOR', SEI:'BENEFICIARY', ESE:'ILLUSIONARY', LII:'BUSINESS', EIE:'CONTRARY', LSI:'SUPER_EGO', SLE:'CONFLICT', IEI:'QUASI_IDENTITY', SEE:'SUPERVISEE', ILI:'BENEFACTOR', LIE:'SEMI_DUAL', ESI:'KINDRED', LSE:'DUAL', EII:'IDENTITY', IEE:'MIRROR', SLI:'ACTIVITY' },
  IEE: { ILE:'KINDRED', SEI:'SEMI_DUAL', ESE:'BENEFACTOR', LII:'SUPERVISEE', EIE:'QUASI_IDENTITY', LSI:'CONFLICT', SLE:'SUPER_EGO', IEI:'CONTRARY', SEE:'BUSINESS', ILI:'ILLUSIONARY', LIE:'BENEFICIARY', ESI:'SUPERVISOR', LSE:'ACTIVITY', EII:'MIRROR', IEE:'IDENTITY', SLI:'DUAL' },
  SLI: { ILE:'SEMI_DUAL', SEI:'KINDRED', ESE:'SUPERVISEE', LII:'BENEFACTOR', EIE:'CONFLICT', LSI:'QUASI_IDENTITY', SLE:'CONTRARY', IEI:'SUPER_EGO', SEE:'ILLUSIONARY', ILI:'BUSINESS', LIE:'SUPERVISOR', ESI:'BENEFICIARY', LSE:'MIRROR', EII:'ACTIVITY', IEE:'DUAL', SLI:'IDENTITY' },
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

// ============================================================================
// Quadras
// ============================================================================
export const QUADRAS = {
  Alpha: ['ILE', 'SEI', 'ESE', 'LII'],
  Beta:  ['EIE', 'LSI', 'SLE', 'IEI'],
  Gamma: ['SEE', 'ILI', 'LIE', 'ESI'],
  Delta: ['LSE', 'EII', 'IEE', 'SLI'],
}

export const TYPE_QUADRA = Object.fromEntries(
  Object.entries(QUADRAS).flatMap(([quadra, types]) => types.map(t => [t, quadra]))
)

export function getQuadra(type) {
  return TYPE_QUADRA[type] ?? null
}

export function sameQuadraTypes(type) {
  const quadra = getQuadra(type)
  return quadra ? QUADRAS[quadra] : []
}
