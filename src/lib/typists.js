// src/lib/typists.js
// Single source of truth for all typist data.
// When uncle_sam (or any future typist) onboards, add an entry here.
// slug must be URL-safe and match their Socion username (lowercase).

export const TYPISTS = {
  spencer: {
    slug:            'spencer',
    displayName:     'Spencer',
    type:            'ILE',
    typeLabel:       'ILE-ENTp',
    role:            'Founder',
    verifiedBy:      'Spencer',
    avatarUrl:       'https://hetjmvwhyibsxrkkgury.supabase.co/storage/v1/object/public/avatars/00bbbfed-a5ce-497c-a667-8cb86b72ba83/avatar.jpg',
    dob:             '1982-05-24',
    flag:            '🇬🇧',
    studyingSince:   2004,
    bio:             'Founder of Socion and Socionics Insight. Written reports based on a 12-question questionnaire — async, considered, and reasoned.',
    credibilityLine: 'Spencer has delivered typing reports to clients across Socionics Insight and Socion.',
    linkedin:        'https://www.linkedin.com/in/spencerstern/',
    links: [
      { label: 'socionicsinsight.com', href: 'https://socionicsinsight.com' },
      { label: 'spencerstern.com',     href: 'https://spencerstern.com' },
    ],
    method:          'Questionnaire → written report (async)',
    outputTypes:     ['Written report'],
    reportLength:    '3,500–5,000 words',
    availability:    'active',
    currency:        'USD',
    contact:         'spencer@socion.app',
    paymentNote:     "Payment is taken by Stripe. Straight after, you'll be taken to the questionnaire to complete in your own time. The clock on your turnaround starts once you submit it — not at payment.",
    testimonial:     { quote: 'The results were very helpful to me. It provided a clue to deepening my understanding.', name: 'Yotaka' },
    tiers: [
      {
        key:        'standard',
        name:       'Standard',
        price:      '$29',
        turnaround: '5 days',
        href:       'https://buy.stripe.com/fZu14m91Pfwl163fIudIA00',
        highlight:  false,
      },
      {
        key:        'express',
        name:       'Express',
        price:      '$49',
        turnaround: '48 hours',
        href:       'https://buy.stripe.com/bJefZg7XL4RH6qnbsedIA01',
        highlight:  true,
      },
    ],
    steps: [
      ['01', 'Pay',     'Choose Standard or Express. Payment is handled securely by Stripe.'],
      ['02', 'Answer',  "You're taken straight to a short questionnaire — twelve questions about how you think and relate. Answer in your own words."],
      ['03', 'Receive', 'Your written report lands by email within the timeframe you chose. It confirms your type, explains the reasoning, and your Socion profile is updated to match.'],
    ],
    whatYouGet: [
      'A written report confirming your type, with the reasoning behind it',
      'A clear read on your function stack and what it means for how you relate',
      'Practical guidance on the relations that fit you, for the Socion feed',
      'Your Socion type updated to match, so your matches are built on solid ground',
    ],
  },

  'uncle-sam': {
    slug:            'uncle-sam',
    displayName:     'Uncle Sam',
    type:            'SLE',
    typeLabel:       'SLE-ESTp',    // confirm subtype with him
    role:            'Typist',
    verifiedBy:      'Uncle Sam',
    avatarUrl:       'https://hetjmvwhyibsxrkkgury.supabase.co/storage/v1/object/public/avatars/5b62646f-7ee7-40ff-8aec-48ff56684a21/avatar.jpg',
    dob:             '1993-03-22',
    flag:            '🇺🇸',
    studyingSince:   null,          // confirm with him
    bio:             'B.S. Applied Psychology. Socionics and MBTI practitioner specialising in voice-based typing sessions — calm, thorough, and willing to discuss nuance rather than just hand you a label.',
    credibilityLine: '422 clients typed. 4.50 rating across verified reviews on Typology Testing.',
    linkedin:        null,
    links:           [],
    method:          'Voice call',
    outputTypes:     ['Voice session'],
    reportLength:    null,
    availability:    'paused',
    currency:        'USD',
    contact:         'uncle.sam@socion.app', // forwarding to: ustypologyservice@gmail.com
    paymentNote:     "Payment is taken by Stripe. Straight after, you'll be taken to a booking page to schedule your session with Uncle Sam.",
    testimonial:     { quote: 'Uncle Sam was very calm and considerate when it came to explaining my type to me. He allowed me to feel comfortable enough to ask questions freely and express my concerns or disagreements.', name: 'Luna, Typology Testing' },
    tiers: [],       // Stripe links and pricing TBC
    steps: [
      ['01', 'Pay',      'Choose your session tier. Payment is handled securely by Stripe.'],
      ['02', 'Schedule', "After payment you'll be taken to a booking page to pick a time that works for you."],
      ['03', 'Session',  "Join a voice call with Uncle Sam. He'll walk you through his read on your type, explain the reasoning, and your Socion profile is updated to match."],
    ],
    whatYouGet: [
      'A live voice session walking through your type and the reasoning behind it',
      'A clear read on your function stack and what it means for how you relate',
      'Practical guidance on the relations that fit you, for the Socion feed',
      'Your Socion type updated to match, so your matches are built on solid ground',
    ],
  },
}

// Ordered list for the marketplace grid
export const TYPIST_LIST = Object.values(TYPISTS)

// Helpers

export function calcAge(dob) {
  if (!dob) return null
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function yearsExperience(studyingSince) {
  if (!studyingSince) return null
  return new Date().getFullYear() - studyingSince
}
