import { QUESTIONS } from './questions'

// Type → [EI polarity, NS polarity, TF polarity, JP polarity]
// +1 = E/N/T/J, -1 = I/S/F/P
const TYPE_POLES = {
  ILE: [ 1,  1,  1, -1],
  LII: [-1,  1,  1,  1],
  LIE: [ 1,  1,  1,  1],
  ILI: [-1,  1,  1, -1],
  EIE: [ 1,  1, -1,  1],
  IEI: [-1,  1, -1, -1],
  IEE: [ 1,  1, -1, -1],
  EII: [-1,  1, -1,  1],
  LSE: [ 1, -1,  1,  1],
  SLE: [ 1, -1,  1, -1],
  SLI: [-1, -1,  1, -1],
  LSI: [-1, -1,  1,  1],
  ESE: [ 1, -1, -1,  1],
  SEE: [ 1, -1, -1, -1],
  SEI: [-1, -1, -1, -1],
  ESI: [-1, -1, -1,  1],
}

// Score range per axis: -3 to +3 (3 questions each)
// Map score to probability of the positive pole (E/N/T/J)
function scoreToProbability(score) {
  const map = { '-3': 0.05, '-2': 0.18, '-1': 0.35, '0': 0.50, '1': 0.65, '2': 0.82, '3': 0.95 }
  return map[String(score)] ?? 0.50
}

export function computeTypeDistribution(answers) {
  // answers: { q1: 'a'|'b', q2: 'a'|'b', ... }
  // Tally axis scores
  const axisScores = { EI: 0, NS: 0, TF: 0, JP: 0 }

  QUESTIONS.forEach(q => {
    const answer = answers[q.id]
    if (!answer) return
    axisScores[q.axis] += answer === 'a' ? 1 : -1
  })

  // P(positive pole) per axis
  const pEI = scoreToProbability(axisScores.EI)  // P(E)
  const pNS = scoreToProbability(axisScores.NS)  // P(N)
  const pTF = scoreToProbability(axisScores.TF)  // P(T)
  const pJP = scoreToProbability(axisScores.JP)  // P(J)

  // Compute raw probability for each type
  const raw = {}
  Object.entries(TYPE_POLES).forEach(([type, [ei, ns, tf, jp]]) => {
    const pType =
      (ei > 0 ? pEI : 1 - pEI) *
      (ns > 0 ? pNS : 1 - pNS) *
      (tf > 0 ? pTF : 1 - pTF) *
      (jp > 0 ? pJP : 1 - pJP)
    raw[type] = pType
  })

  // Normalise to sum to 1
  const total = Object.values(raw).reduce((s, v) => s + v, 0)
  const distribution = {}
  Object.entries(raw).forEach(([type, p]) => {
    distribution[type] = Math.round((p / total) * 1000) / 1000
  })

  // Primary type = highest probability
  const primaryType = Object.entries(distribution)
    .sort(([, a], [, b]) => b - a)[0][0]

  return { distribution, primaryType, axisScores }
}

export function getTopTypes(distribution, n = 4) {
  return Object.entries(distribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([type, confidence]) => ({ type, confidence }))
}
