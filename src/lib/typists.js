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
    discordUrl:      null,
    links: [
      { label: 'socionicsinsight.com', href: 'https://socionicsinsight.com' },
      { label: 'spencerstern.com',     href: 'https://spencerstern.com' },
    ],
    method:          'Questionnaire → written report (async)',
    outputTypes:     ['Written report'],
    reportLength:    '3,500–5,000 words',
    availability:    'active',
    bookingReady:    true,
    currency:        'USD',
    contact:         'spencer@socion.app',
    paymentNote:     "Payment is taken by Stripe. Straight after, you'll be taken to the questionnaire to complete in your own time. The clock on your turnaround starts once you submit it — not at payment.",
    referralNote:    null,
    tiersLabel:      null,
    testimonial:     { quote: 'The results were very helpful to me. It provided a clue to deepening my understanding.', name: 'Yotaka' },
    tiers: [
      {
        key:            'standard',
        name:           'Standard',
        price:          '$29',
        wasPrice:       '$49',
        turnaround:     '5 days',
        turnaroundLabel:'Delivered within 5 days of questionnaire completion',
        description:    null,
        href:           'https://buy.stripe.com/fZu14m91Pfwl163fIudIA00',
        highlight:      false,
      },
      {
        key:            'express',
        name:           'Express',
        price:          '$49',
        wasPrice:       '$79',
        turnaround:     '48 hours',
        turnaroundLabel:'Delivered within 48 hours of questionnaire completion',
        description:    null,
        href:           'https://buy.stripe.com/bJefZg7XL4RH6qnbsedIA01',
        highlight:      true,
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
    typeLabel:       'SLE-ESTp',
    role:            'Typist',
    verifiedBy:      'Uncle Sam',
    avatarUrl:       'https://hetjmvwhyibsxrkkgury.supabase.co/storage/v1/object/public/avatars/5b62646f-7ee7-40ff-8aec-48ff56684a21/avatar.jpg',
    dob:             '1993-03-22',
    flag:            '🇺🇸',
    studyingSince:   2023,
    bio:             'B.S. Applied Psychology, Socionics/MBTI Practitioner, 10 Page write ups comprising: Rationale for determination, information about your type, Romance Style for compatibility, Self Development suggestions, and more! Accurate Socionics/MBTI type determination',
    credibilityLine: '422+ clients typed.',
    linkedin:        null,
    discordUrl:      'https://discord.gg/dont-talk-about-type-club',
    links:           [],
    method:          'Voice typing with written report',
    outputTypes:     ['Voice session', 'Written report'],
    reportLength:    null,
    availability:    'active',
    bookingReady:    true,
    currency:        'USD',
    contact:         'uncle.sam@socion.app', // forwarding to: ustypologyservice@gmail.com
    paymentNote:     "Payment is taken by Stripe. After payment you'll be taken to a booking page to schedule your session with Uncle Sam.",
    referralNote:    "Refer a friend and get $10 back — if someone you refer books any session, you'll receive a $10 discount or refund on your next booking. Applies to all tiers.",
    tiersLabel:      'Choose your session',
    testimonial:     { quote: 'Uncle Sam was very calm and considerate when it came to explaining my type to me. He allowed me to feel comfortable enough to ask questions freely and express my concerns or disagreements.', name: 'Luna, Typology Testing' },
    tiers: [
      {
        key:            'type-discovery',
        name:           'Type Discovery',
        price:          '$39.99',
        turnaround:     '60 min',
        turnaroundLabel:'Session duration: 60 min',
        description:    'A focused Q&A session to determine which of the 16 personality types best fits you. Thorough, standardised typing process — ideal if you mainly want to know your type.',
        href:           'https://buy.stripe.com/5kQeVf9T5bMvbI9dLc6AM01',
        highlight:      false,
      },
      {
        key:            'complete-report',
        name:           'Complete Type Report',
        price:          '$59.99',
        turnaround:     '90 min',
        turnaroundLabel:'Session duration: 90 min',
        description:    'Includes a personalised written report covering why you were typed a certain way, helpful reference links, famous and historical examples, romance style and compatibility, strengths and weaknesses, and self-development and career suggestions.',
        href:           'https://buy.stripe.com/14AfZj9T59En5jLfTk6AM02',
        highlight:      true,
      },
      {
        key:            'subtype-deep-dive',
        name:           'Subtype Deep Dive',
        price:          '$79.99',
        turnaround:     '120 min',
        turnaroundLabel:'Session duration: 120 min',
        description:    'An in-depth session covering both your core type and subtype. Includes the written report, extra time for questions and clarification, and a deeper breakdown of your type and the theory.',
        href:           'https://buy.stripe.com/bJefZje9lg2LeUl6iK6AM03',
        highlight:      false,
      },
    ],
    steps: [
      ['01', 'Pay',      'Choose your session tier. Payment is handled securely by Stripe.'],
      ['02', 'Schedule', "After payment you'll be taken to a booking page to pick a time that works for you."],
      ['03', 'Session',  "Join a voice call with Uncle Sam. He'll walk you through his read on your type, explain the reasoning, and your Socion profile is updated to match."],
    ],
    whatYouGet: [], // tier descriptions serve this purpose
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
