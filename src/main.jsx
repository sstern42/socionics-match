import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './lib/AuthContext.jsx'
import { ThemeProvider } from './lib/ThemeContext.jsx'
import BootGate from './BootGate.jsx'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('App crashed during render:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          padding: '2rem', gap: '1rem', fontFamily: "'DM Sans', system-ui, sans-serif",
          background: 'var(--bg)', color: 'var(--text)',
        }}>
          <p style={{ fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)' }}>Socion</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.75rem', fontWeight: 500, margin: 0 }}>
            Something went wrong loading the app
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', maxWidth: 360, lineHeight: 1.6 }}>
            This can happen on a flaky connection. Try reloading — if you're on mobile data and it keeps failing, switching to Wi-Fi often helps.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 2,
              padding: '0.75rem 2rem', fontSize: '0.82rem', fontWeight: 500,
              letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BootGate>
            <App />
          </BootGate>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
