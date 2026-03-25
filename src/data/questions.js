// 12 forced-choice questions, 3 per axis
// axis: 'EI' | 'NS' | 'TF' | 'JP'
// aScore: +1 toward E/N/T/J, bScore: -1 toward I/S/F/P

export const QUESTIONS = [
  // E / I
  {
    id: 'q1', axis: 'EI',
    text: 'After a demanding week, you are more likely to…',
    a: 'Call friends, make plans, and recharge through company',
    b: 'Stay home, decompress alone, and recover in quiet',
  },
  {
    id: 'q2', axis: 'EI',
    text: 'In a new group of people…',
    a: 'You naturally start conversations and introduce yourself',
    b: 'You wait to be drawn out, preferring to observe first',
  },
  {
    id: 'q3', axis: 'EI',
    text: 'Your energy levels…',
    a: 'Rise when you are around people and activity',
    b: 'Deplete faster in social settings than when you are alone',
  },

  // N / S
  {
    id: 'q4', axis: 'NS',
    text: 'When solving a problem, you tend to…',
    a: 'Look for patterns, connections, and what the problem implies beyond itself',
    b: 'Focus on concrete details and what has worked reliably before',
  },
  {
    id: 'q5', axis: 'NS',
    text: 'You are more drawn to…',
    a: 'Possibilities and what could be',
    b: 'Facts and what actually is',
  },
  {
    id: 'q6', axis: 'NS',
    text: 'Your memory tends to retain…',
    a: 'Impressions, meanings, and conceptual associations',
    b: 'Specific details, sequences, and sensory experiences',
  },

  // T / F
  {
    id: 'q7', axis: 'TF',
    text: 'When a friend comes to you with a problem…',
    a: 'You naturally move toward finding a solution or identifying the cause',
    b: 'You naturally move toward making them feel heard and understood',
  },
  {
    id: 'q8', axis: 'TF',
    text: 'In a disagreement, what bothers you more?',
    a: 'Faulty reasoning or an internally inconsistent position',
    b: 'Someone feeling dismissed or hurt in the exchange',
  },
  {
    id: 'q9', axis: 'TF',
    text: 'When making a significant decision…',
    a: 'You lead with analysis and apply values as a final check',
    b: 'You lead with values and apply logic as a final check',
  },

  // J / P (Rational / Irrational)
  {
    id: 'q10', axis: 'JP',
    text: 'Your natural working mode is…',
    a: 'Having a clear goal and working toward it deliberately',
    b: 'Responding to what emerges and adapting as you go',
  },
  {
    id: 'q11', axis: 'JP',
    text: 'Unresolved open loops — things left undecided or unfinished…',
    a: 'Bother you. You prefer things concluded.',
    b: 'Do not trouble you much. You are comfortable with things staying open.',
  },
  {
    id: 'q12', axis: 'JP',
    text: 'You work best…',
    a: 'When you have set a clear goal and know the criteria for success',
    b: 'When you are free to explore without a predetermined destination',
  },
]
