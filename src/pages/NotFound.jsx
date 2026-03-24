import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

export default function NotFound() {
  return (
    <Layout>
      <section style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', textAlign: 'center', padding: '2rem' }}>
        <p className="eyebrow">404</p>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,4rem)' }}>Page not found.</h1>
        <Link to="/" className="btn-ghost">Back to Socion</Link>
      </section>
    </Layout>
  )
}
