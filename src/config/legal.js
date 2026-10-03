// Legal identity for Socion: the single place to change the operator's name,
// address, contact email or ICO number. Socion is run by a sole trader, who is
// not a separate legal entity, so copyright and the data controller role sit
// with Spencer Stern personally. Always lead with the name and use "trading
// as" (or "t/a" where space is tight).
//
// The edge functions can't import from src/, so the email footer line is
// duplicated as BUSINESS_IDENTITY in the email helpers block of each Resend
// sender (see supabase/functions/stripe-webhook/index.ts).
// `npm run check:email-helpers` fails if that copy drifts from EMAIL_IDENTITY
// below, so change both together.

export const OPERATOR_NAME = 'Spencer Stern'
export const TRADING_NAME = 'Stern Consulting'
export const ADDRESS_LINES = ['Unit 110172', 'PO Box 6945', 'London W1A 6US']
export const COUNTRY = 'United Kingdom'
export const CONTACT_EMAIL = 'hello@socion.app'
export const ICO_NUMBER = 'ZC239854'

// "Spencer Stern, trading as Stern Consulting": for prose.
export const OPERATOR_FULL = `${OPERATOR_NAME}, trading as ${TRADING_NAME}`
// "Spencer Stern t/a Stern Consulting": for footers and other tight spaces.
export const OPERATOR_SHORT = `${OPERATOR_NAME} t/a ${TRADING_NAME}`
// "Unit 110172, PO Box 6945, London W1A 6US, United Kingdom"
export const POSTAL_ADDRESS = [...ADDRESS_LINES, COUNTRY].join(', ')

// The footer line on every Resend email. Mirrored in the edge functions.
export const EMAIL_IDENTITY = `Socion · ${OPERATOR_SHORT} · ${POSTAL_ADDRESS}`
