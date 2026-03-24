const TYPES = ['ILE','SEI','ESE','LII','EIE','LSI','SLE','IEI','SEE','ILI','LIE','ESI','LSE','EII','SLI','IEE']

export default function Layout({ children }) {
  return (
    <>
      <div className="type-grid" aria-hidden="true">
        {TYPES.map(t => <span key={t}>{t}</span>)}
      </div>
      <div className="page">
        <header className="site-header">
          <a className="wordmark" href="https://socionicsinsight.com">
            Socionics<span>Insight</span>
          </a>
          <nav>
            <a href="https://socionicsinsight.com">Reference site &rarr;</a>
          </nav>
        </header>

        <main style={{ flex: 1 }}>
          {children}
        </main>

        <footer className="site-footer">
          <p>&copy; {new Date().getFullYear()} <a href="https://socionicsinsight.com">socionicsinsight.com</a></p>
          <a href="https://socionicsinsight.com">Socionics reference &rarr;</a>
        </footer>
      </div>
    </>
  )
}
