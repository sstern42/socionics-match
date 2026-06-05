// src/lib/typists.js
// Single source of truth for all typist data.
// When uncle_sam (or any future typist) onboards, add an entry here.
// slug must be URL-safe and match their Socion username (lowercase).

export const TYPISTS = {
  spencer: {
    slug:            'spencer',
    displayName:     'Spencer',
    type:            'ILE',         // base type — used for MATRIX relation lookup
    typeLabel:       'ILE-ENTp',    // display label
    role:            'Founder',
    verifiedBy:      'Spencer',     // value stored in profile.verified_by
    avatarUrl:       'https://hetjmvwhyibsxrkkgury.supabase.co/storage/v1/object/public/avatars/00bbbfed-a5ce-497c-a667-8cb86b72ba83/avatar.jpg',
    birthYear:       1982,
    flag:            '🇬🇧',           // literal emoji — reliable cross-platform
    studyingSince:   2004,          // year — experience calculated dynamically
    bio:             'Founder of Socion and Socionics Insight. Written reports based on a 12-question questionnaire — async, considered, and reasoned. Classical Model A throughout.',
    credibilityLine: 'Spencer has delivered typing reports to clients across Socionics Insight and Socion.',
    linkedin:        'https://www.linkedin.com/in/spencerstern/',
    links: [
      { label: 'socionicsinsight.com', href: 'https://socionicsinsight.com' },
      { label: 'spencerstern.com',     href: 'https://spencerstern.com' },
    ],
    method:          'Questionnaire → written report (async)',
    outputTypes:     ['Written report'],
    reportLength:    '3,500–5,000 words',
    availability:    'active',      // 'active' | 'paused' | 'full'
    currency:        'USD',
    contact:         'hello@socion.app',
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
}

// Ordered list for the marketplace grid
export const TYPIST_LIST = Object.values(TYPISTS)

// Helpers

export function yearsExperience(studyingSince) {
  if (!studyingSince) return null
  return new Date().getFullYear() - studyingSince
}
