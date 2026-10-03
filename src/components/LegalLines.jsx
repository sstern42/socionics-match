import { OPERATOR_SHORT, POSTAL_ADDRESS, CONTACT_EMAIL } from '../config/legal'

// Copyright and operator details for places the site footer doesn't reach:
// every page hides the footer at mobile widths, so this goes in the logged-out
// mobile menu and on Settings instead.
export default function LegalLines({ style }) {
  return (
    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.6, ...style }}>
      <p>&copy; {new Date().getFullYear()} {OPERATOR_SHORT}. All rights reserved.</p>
      <p>
        {POSTAL_ADDRESS} · <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--muted)' }}>{CONTACT_EMAIL}</a>
      </p>
    </div>
  )
}
