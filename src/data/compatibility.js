// compatibility.js — Model A compatibility breakdown for premium users
//
// Sourced from socionicsinsight.com type pages (function stacks) and
// relation pages (taglines, strengths, friction, advice).
// Called by Conversation.jsx to render the inline premium breakdown panel.

// ─── Model A position names ───────────────────────────────────────────────────

const POSITION_NAMES = {
  1: 'Leading',
  2: 'Creative',
  3: 'Role',
  4: 'Vulnerable',
  5: 'Suggestive',
  6: 'Mobilising',
  7: 'Ignoring',
  8: 'Demonstrative',
}

// What it means when your leading function occupies that position in the other
// person's Model A stack.
const POSITION_MEANING = {
  1: 'You share the same leading function — the same strength, the same lens on the world.',
  2: "Meets their creative function — your strength activates their most expressive mode.",
  3: "Falls on their role function — they work hard in this area; your ease here can feel pressuring.",
  4: "Lands on their most sensitive point — they feel exposed here. Handle with care.",
  5: "Speaks directly to their deepest need — you provide what they require most without effort.",
  6: "Energises their mobilising function — you're activating and invigorating to them.",
  7: "Is largely filtered out — they're aware of it but it doesn't hold their attention.",
  8: "Resonates in the background — present but not at the forefront of conscious engagement.",
}

// ─── Function stacks for all 16 types ────────────────────────────────────────
// Positions 1–8 (Leading → Demonstrative)
// Sourced from socionicsinsight.com type pages

export const TYPE_FUNCTIONS = {
  ILE: ['Ne', 'Ti', 'Se', 'Fi', 'Si', 'Fe', 'Ni', 'Te'],
  SEI: ['Si', 'Fe', 'Ni', 'Te', 'Ne', 'Ti', 'Se', 'Fi'],
  ESE: ['Fe', 'Si', 'Te', 'Ni', 'Ti', 'Ne', 'Fi', 'Se'],
  LII: ['Ti', 'Ne', 'Fi', 'Se', 'Fe', 'Si', 'Te', 'Ni'],
  EIE: ['Fe', 'Ni', 'Te', 'Si', 'Ti', 'Se', 'Fi', 'Ne'],
  LSI: ['Ti', 'Se', 'Fi', 'Ne', 'Fe', 'Ni', 'Te', 'Si'],
  SLE: ['Se', 'Ti', 'Ne', 'Fi', 'Ni', 'Fe', 'Si', 'Te'],
  IEI: ['Ni', 'Fe', 'Si', 'Te', 'Se', 'Ti', 'Ne', 'Fi'],
  SEE: ['Se', 'Fi', 'Ne', 'Ti', 'Ni', 'Te', 'Si', 'Fe'],
  ILI: ['Ni', 'Te', 'Si', 'Fe', 'Se', 'Fi', 'Ne', 'Ti'],
  LIE: ['Te', 'Ni', 'Fe', 'Si', 'Fi', 'Se', 'Ti', 'Ne'],
  ESI: ['Fi', 'Se', 'Ti', 'Ne', 'Te', 'Ni', 'Fe', 'Si'],
  LSE: ['Te', 'Si', 'Fe', 'Ni', 'Fi', 'Ne', 'Ti', 'Se'],
  EII: ['Fi', 'Ne', 'Ti', 'Se', 'Te', 'Si', 'Fe', 'Ni'],
  IEE: ['Ne', 'Fi', 'Se', 'Ti', 'Si', 'Te', 'Ni', 'Fe'],
  SLI: ['Si', 'Te', 'Ni', 'Fe', 'Ne', 'Fi', 'Se', 'Ti'],
}

// ─── Relation content keyed by app relation key ───────────────────────────────
// 16 keys matching RELATIONS in src/data/relations.js
// Content distilled from socionicsinsight.com/relations/ pages

const RELATION_DATA = {
  DUAL: {
    tagline: 'The most complementary of all intertype relations — each partner naturally supplies what the other most needs.',
    summary: 'Dual partners share quadra values but opposite cognitive profiles. Each type\'s strengths correspond directly to the other\'s deepest needs.',
    strengths: [
      'Natural, effortless division of psychological labour — neither competes for the same role.',
      'Each partner is freed to develop through their strengths rather than compensating for weakness.',
      'Shared quadra values mean disagreements, when they arise, tend toward the same underlying good.',
    ],
    friction: [
      'The ease of the relation can lead to quiet over-reliance — each partner gradually stops exercising what the other provides.',
      'The absence of friction can be mistaken for a lack of chemistry by those accustomed to more tension.',
      'Long-term co-dependency risk: the relationship can work so well internally that neither invests much outside it.',
    ],
    advice: 'The structure is enabling, not self-sustaining — bring the same conscious attention a dual relation requires.',
  },

  ACTIVITY: {
    tagline: 'A stimulating and sociable relation that energises both partners — until it doesn\'t.',
    summary: 'Activation pairs share quadra values and an attractive vibe but the same E/I orientation — creating genuine energy but also competition for the same social role.',
    strengths: [
      'Highly energising — each partner amplifies the other\'s enthusiasm and appetite for activity.',
      'Shared quadra values mean early interactions feel warm and natural.',
      'Common in strong friendships and productive professional contexts.',
    ],
    friction: [
      'Both partners occupy the same extravert/introvert position — neither naturally takes the complementary role.',
      'At close range, the similarity in social rhythm creates competition rather than complementarity.',
      'Neither fully covers the other\'s blind spots the way a dual would.',
    ],
    advice: 'Activity thrives in bursts — professional collaboration and shared social activity — rather than continuous close proximity.',
  },

  MIRROR: {
    tagline: 'Two sides of the same intellectual coin — stimulating in debate, draining over time.',
    summary: 'Mirror partners share quadra values and tackle problems with similar priorities, but arrive at conclusions via opposite routes — each leading where the other creates.',
    strengths: [
      'Generate new lines of thought — each can complete what the other starts or spot the gap in a half-formed argument.',
      'Shared quadra values mean no basic-level translation is required.',
      'Intellectually productive in contexts with defined boundaries.',
    ],
    friction: [
      'Each partner\'s leading function meets the other\'s creative — mutual expertise becomes mutual criticism.',
      'The criticism is precise and hard to dismiss, which makes it more draining than from less-aligned types.',
      'Romance style difference creates a structural incompatibility in close relationships.',
    ],
    advice: 'Mirror relationships thrive in intellectual or professional contexts with natural limits — less suited to domestic closeness where the criticism loop has nowhere to go.',
  },

  SEMI_DUAL: {
    tagline: 'The chemistry of duality with half the depth — compelling in bursts, incomplete by design.',
    summary: 'Semi-dual pairs share an attractive vibe and compatible rhythm that mimics duality in early contact, but the functional complement is only partial.',
    strengths: [
      'Genuine attraction and energy, especially in the early stages.',
      'Compatible social rhythm means neither constantly adjusts their pace.',
      'Real moments of complementarity that feel profound when they occur.',
    ],
    friction: [
      'Only a partial functional fit — the full mutual coverage of duality never quite materialises.',
      'Over time both partners notice what\'s missing, producing a low-level sense of incompleteness.',
      'The early chemistry can raise expectations the relation structurally cannot meet.',
    ],
    advice: 'Semi-dual works best in contexts that play to the genuine complementarity without demanding coverage of the gaps.',
  },

  IDENTITY: {
    tagline: 'The most familiar of all relations — and, over time, one of the most frustrating.',
    summary: 'Identity partners process the world through identical functions in the same order, share the same values, and understand each other immediately — but produce no complementarity.',
    strengths: [
      'Immediate comprehension — no translation required, no explaining why something matters.',
      'Natural sounding boards who can reflect each other\'s problems back with structural precision.',
      'Comfortable shared vocabulary and social register.',
    ],
    friction: [
      'No complementarity: neither covers the other\'s blind spots; both struggle in the same areas simultaneously.',
      'Competition for the same psychological territory and social role creates underlying friction.',
      'Mirrors both partners\' weaknesses back at them rather than compensating.',
    ],
    advice: 'Identity works best at a distance — as a peer community or occasional contact rather than close partnership.',
  },

  KINDRED: {
    tagline: 'A naturally agreeable relation built on shared orientation and compatible social instincts.',
    summary: 'Kindred partners share the same E/I orientation and rational/irrational suffix, creating compatible social rhythms and broadly similar decision-making styles.',
    strengths: [
      'Easy cooperation — shared orientation means neither constantly adjusts their social pace.',
      'Can follow each other\'s reasoning without difficulty, even when specific interests diverge.',
      'Comfortable and low-maintenance; rarely competitive.',
    ],
    friction: [
      'Shared two-letter similarity can create an illusion of deeper like-mindedness than actually exists.',
      'No quadra alignment means the deeper value landscape diverges — what matters most differs.',
      'Depth is structurally limited; the relation rarely goes beyond comfortable cooperation.',
    ],
    advice: 'Kindred is reliable but not transformative — good for stable collaborations that don\'t need to go deep.',
  },

  BUSINESS: {
    tagline: 'A competent, cooperative relation that runs smoothly on the surface and rarely goes deeper.',
    summary: 'Business pairs share a monoverted orientation and rhythmic social flow, making them broadly compatible in day-to-day operation, though personal depth is limited.',
    strengths: [
      'Practically functional — broadly compatible in how they operate, neither constantly adjusting.',
      'Cooperative rather than competitive; tasks tend to divide naturally.',
      'Reliable and low-friction in professional and practical contexts.',
    ],
    friction: [
      'Personal depth is structurally limited — conversations tend to stay at the level of tasks and activity.',
      'Neither challenges nor develops the other in ways that generate growth.',
      'Can feel like an efficient working relationship that never quite becomes a real friendship.',
    ],
    advice: 'Business is best suited to contexts where practical cooperation is the goal rather than close personal connection.',
  },

  QUASI_IDENTITY: {
    tagline: 'Two people reading the same text in opposite directions — the content is identical, the experience is not.',
    summary: 'Quasi-identity pairs share the same E/I and two middle letters, creating a genuine sense of likeness that gradually reveals irreconcilable differences in approach.',
    strengths: [
      'Genuine intellectual kinship in early contact — easy to follow each other\'s reasoning.',
      'Shared E/I orientation means compatible social rhythm.',
      'Can feel like a close match until the divergence surfaces.',
    ],
    friction: [
      'The rational/irrational split creates fundamental incompatibility in planning and decision-making.',
      'What looks like shared values reveals different underlying emphases on closer inspection.',
      'The initial likeness makes the eventual frustration more disorienting.',
    ],
    advice: 'The divergence is most visible in planning contexts — naming it early is better than assuming the initial likeness will hold.',
  },

  CONTRARY: {
    tagline: 'An intellectually attractive opening that gradually reveals two irreconcilable perspectives on the same world.',
    summary: 'Contrary (Extinguishment) pairs share hetroverted orientation and functional vocabulary, producing easy early contact that eventually reveals a fundamental divergence in how they interpret the same information.',
    strengths: [
      'Early interactions feel stimulating — each recognises the other\'s thinking and can follow it closely.',
      'Shared functional vocabulary creates genuine intellectual kinship.',
      'Works well in bounded contexts — collaborative research, creative projects.',
    ],
    friction: [
      'The same information produces opposite conclusions — disagreements compound rather than resolve.',
      'Confidence in one\'s own interpretation grows in proportion to time with this person, not inversely.',
      'At close range the divergence becomes exhausting rather than stimulating.',
    ],
    advice: 'Works best in collaborations with a clear common task and natural exit — not continuous close contact.',
  },

  ILLUSIONARY: {
    tagline: 'An attractive, goal-oriented relation built on a deceptive resemblance — partners cooperate well until the illusion thins.',
    summary: 'Illusionary (Mirage) pairs are drawn together by an attractive vibe and rhythmic compatibility that suggests more complementarity than actually exists.',
    strengths: [
      'One of the more functional cross-quadra relations — attractive vibe and rhythmic flow make early interactions easy.',
      'Goal-oriented cooperation works well; partners can achieve practical outcomes together.',
      'Neither competes for the same social role.',
    ],
    friction: [
      'The initial resemblance is deceptive — what looked like complementarity gradually reveals as parallel processing of different values.',
      'Partners begin to feel misread despite good intent.',
      'The gap between perceived and actual fit becomes more apparent over time.',
    ],
    advice: 'Mirage produces functional cross-quadra collaboration — focus on task-oriented contexts where the practical cooperation shines and value divergence stays dormant.',
  },

  SUPER_EGO: {
    tagline: 'A relation of mutual fascination and fundamental incompatibility — each partner is the other\'s idealised other.',
    summary: 'Super-ego partners represent precisely what the other most lacks and aspires to — generating genuine admiration at distance that turns to pressure at proximity.',
    strengths: [
      'Genuine mutual fascination — neither is performing; the admiration is real and rooted in seeing a way of being they cannot access alone.',
      'Each partner can learn from the other in ways no other relation makes available.',
      'Mutual respect at distance, often expressed as long-term appreciation.',
    ],
    friction: [
      'Up close, each partner\'s leading function lands on the other\'s most vulnerable position — what generates admiration at distance generates pressure at proximity.',
      'Long-term close contact tends to become draining for both.',
      'The very qualities that attract also challenge most deeply.',
    ],
    advice: 'Super-ego is best experienced at arm\'s length — it\'s a relation of aspiration and appreciation, not intimate partnership.',
  },

  CONFLICT: {
    tagline: 'The polar-opposite relation — every dichotomy flipped, every instinct misaligned.',
    summary: 'Conflict partners have entirely opposite dichotomies. An initial pull of opposites gives way to fundamental irreconcilability as proximity and time increase.',
    strengths: [
      'The initial encounter can feel genuinely interesting — each appears interestingly different.',
      'Early contact sometimes produces real insight precisely because the other represents the full opposite perspective.',
      'Distance-regulated contact occasionally works in bounded, defined interactions.',
    ],
    friction: [
      'Every instinct is misaligned — what one finds obviously right, the other finds obviously wrong.',
      'Energy drain is mutual and increases with proximity and time.',
      'Neither partner\'s efforts to adapt reduce the fundamental misalignment.',
    ],
    advice: 'Define limits early, keep interactions bounded, and don\'t mistake the initial interest for compatibility.',
  },

  BENEFACTOR: {
    tagline: 'You naturally give to this person — without quite understanding why they keep coming back.',
    summary: 'As benefactor, what you produce naturally is received by the beneficiary as genuine, valued support — often without conscious effort on your part.',
    strengths: [
      'What you produce naturally is received as genuine development by the beneficiary.',
      'Easy to inhabit — you don\'t need to try to be helpful; it happens by default.',
      'The dynamic often creates real growth in the person you\'re connected with.',
    ],
    friction: [
      'The investment is asymmetric — the beneficiary is typically more engaged with this connection than you are.',
      'Their consistent interest in you can feel puzzling; the pull isn\'t fully accounted for.',
      'You may feel drained if they become heavily reliant on the interaction.',
    ],
    advice: 'Give what you naturally give without over-engineering the relationship — the asymmetry is structural, not a problem to fix.',
  },

  BENEFICIARY: {
    tagline: 'You receive from this person — drawn in more deeply than you can fully account for.',
    summary: 'As beneficiary, the benefactor\'s natural output speaks to something you genuinely value — you receive real support and often find yourself more invested in the connection than they are.',
    strengths: [
      'You receive genuine developmental support from this person — their strength meets something you value.',
      'The interaction feels inspiring and elevating on your side.',
      'Benefactors often provide exactly the kind of input that helps you grow.',
    ],
    friction: [
      'The investment is asymmetric — you are typically more engaged with this connection than they are.',
      'This asymmetry can become uncomfortable if left unacknowledged.',
      'May create a quiet dependency on input from this person.',
    ],
    advice: 'Value what you receive while staying aware of the asymmetry — the benefactor\'s lower investment is structural, not personal disinterest.',
  },

  SUPERVISOR: {
    tagline: 'You have a clear view of this person\'s most sensitive area — without having chosen the role.',
    summary: 'As supervisor, your leading function addresses the supervisee\'s most vulnerable position. You see their weak point clearly and respond to it, often automatically.',
    strengths: [
      'You naturally notice the areas where the supervisee is most vulnerable — this can be genuinely protective.',
      'The dynamic can work well in formal roles where supervision is appropriate.',
      'You are rarely surprised by their struggles in the vulnerable area.',
    ],
    friction: [
      'The supervision role arrives without being chosen — it can feel like a perpetual low-level responsibility.',
      'The supervisee may experience your attention to their weak point as pressure, even when unintended.',
      'The structural power asymmetry makes genuine peer-level connection difficult.',
    ],
    advice: 'Be conscious of how much attention you direct toward their vulnerabilities — well-intentioned oversight can feel controlling on the receiving end.',
  },

  SUPERVISEE: {
    tagline: 'This person has a clear view of your most sensitive area — whether or not they act on it.',
    summary: 'As supervisee, the supervisor\'s leading function directly addresses your most vulnerable position — creating a dynamic of persistent low-level awareness of your weak point.',
    strengths: [
      'When the supervisor is supportive, the dynamic can provide useful guidance toward your development areas.',
      'The supervisor often genuinely means well.',
      'In formal contexts where the role difference is appropriate, the dynamic can work cleanly.',
    ],
    friction: [
      'Your most vulnerable area is consistently in this person\'s sightline — even benign attention can feel like scrutiny.',
      'The structural power asymmetry resists genuine peer-level connection.',
      'Prolonged close contact tends to be tiring for the supervisee.',
    ],
    advice: 'You don\'t have to resolve the asymmetry — work with the supervisory dynamic for what it is rather than trying to convert it into peer connection.',
  },
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Compute the full premium compatibility breakdown for a given type pair.
 *
 * @param {string} myType      - Current user's Socionics type code (e.g. 'SEI')
 * @param {string} otherType   - Other person's type code (e.g. 'LSI')
 * @param {string} relationKey - Relation key from the app's RELATIONS object (e.g. 'BENEFICIARY')
 * @returns {object|null}      - Breakdown data, or null if types/relation not recognised
 */
export function getCompatibilityBreakdown(myType, otherType, relationKey) {
  const myFunctions = TYPE_FUNCTIONS[myType]
  const otherFunctions = TYPE_FUNCTIONS[otherType]
  const relData = RELATION_DATA[relationKey]

  if (!myFunctions || !otherFunctions || !relData) return null

  const myLeading    = myFunctions[0]
  const myCreative   = myFunctions[1]
  const otherLeading = otherFunctions[0]

  // Where does each function sit in the other person's stack? (1-indexed position)
  const myLeadingPos    = otherFunctions.indexOf(myLeading) + 1
  const myCreativePos   = otherFunctions.indexOf(myCreative) + 1
  const otherLeadingPos = myFunctions.indexOf(otherLeading) + 1

  return {
    ...relData,
    functions: {
      myLeading,
      myLeadingPos,
      myLeadingPosName: POSITION_NAMES[myLeadingPos] ?? `Position ${myLeadingPos}`,
      myLeadingMeaning: POSITION_MEANING[myLeadingPos] ?? '',
      myCreative,
      myCreativePos,
      myCreativePosName: POSITION_NAMES[myCreativePos] ?? `Position ${myCreativePos}`,
      myCreativeMeaning: POSITION_MEANING[myCreativePos] ?? '',
      otherLeading,
      otherLeadingPos,
      otherLeadingPosName: POSITION_NAMES[otherLeadingPos] ?? `Position ${otherLeadingPos}`,
    },
  }
}
