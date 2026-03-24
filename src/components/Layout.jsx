import { Link } from 'react-router-dom'

const TYPES = ['ILE','SEI','ESE','LII','EIE','LSI','SLE','IEI','SEE','ILI','LIE','ESI','LSE','EII','SLI','IEE']

export default function Layout({ children }) {
  return (
    <>
      <div className="type-grid" aria-hidden="true">
        {TYPES.map(t => <span key={t}>{t}</span>)}
      </div>
      <div className="page">
        <header className="site-header">
          <Link className="wordmark" to="/">Socion</Link>
        </header>

        <main style={{ flex: 1 }}>
          {children}
        </main>

        <footer className="site-footer">
          <p>&copy; {new Date().getFullYear()} Spencer Stern</p>
          <a href="https://socionicsinsight.com">Socionics reference &rarr;</a>
        </footer>
      </div>
    </>
  )
}
