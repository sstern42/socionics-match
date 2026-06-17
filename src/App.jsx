import { lazy, Suspense, Component } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import FeedbackButton from './components/FeedbackButton'
import './App.css'

const CHUNK_ERROR_PATTERN = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|error loading dynamically imported module/i

class ChunkErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError(error) {
    return { hasError: true, isChunkError: CHUNK_ERROR_PATTERN.test(error?.message || '') }
  }

  componentDidCatch(error) {
    if (CHUNK_ERROR_PATTERN.test(error?.message || '')) {
      // A new deploy shipped new chunk hashes while this tab had an old page open.
      // Reload once to pick up the latest build instead of surfacing a crash.
      const key = 'chunk-error-reload'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) return null
      throw new Error('chunk-error-boundary-rethrow')
    }
    return this.props.children
  }
}

const Support = lazy(() => import('./pages/Support'))
const Help = lazy(() => import('./pages/Help'))
const Home = lazy(() => import('./pages/Home'))
const ReferralLink = lazy(() => import('./pages/ReferralLink'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Auth = lazy(() => import('./pages/Auth'))
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'))
const ProfileEdit = lazy(() => import('./pages/ProfileEdit'))
const ProfileDynamics = lazy(() => import('./pages/ProfileDynamics'))
const ProfileNotifications = lazy(() => import('./pages/ProfileNotifications'))
const Feedback = lazy(() => import('./pages/Feedback'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Admin = lazy(() => import('./pages/Admin'))
const Changelog = lazy(() => import('./pages/Changelog'))
const Updates = lazy(() => import('./pages/Updates'))
const Stats = lazy(() => import('./pages/Stats'))
const Network = lazy(() => import('./pages/Network'))
const Feed = lazy(() => import('./pages/Feed'))
const Messages = lazy(() => import('./pages/Messages'))
const Rooms = lazy(() => import('./pages/Rooms'))
const Typing = lazy(() => import('./pages/Typing'))
const TypistProfile = lazy(() => import('./pages/TypistProfile'))
const Premium = lazy(() => import('./pages/Premium'))
const PremiumWelcome = lazy(() => import('./pages/PremiumWelcome'))
const Saved = lazy(() => import('./pages/Saved'))
const Settings = lazy(() => import('./pages/Settings'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const About = lazy(() => import('./pages/About'))
const NotFound = lazy(() => import('./pages/NotFound'))
const AskPage = lazy(() => import('./pages/AskPage'))

function AppRoutes() {
  const location = useLocation()
  return (
    <div key={location.key} className="page-transition-wrapper">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/r/:code" element={<ReferralLink />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile/setup" element={<ProfileSetup />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/profile/dynamics" element={<ProfileDynamics />} />
        <Route path="/profile/notifications" element={<ProfileNotifications />} />
        <Route path="/profile/:userId" element={<UserProfile />} />
        <Route path="/feedback/:matchId" element={<Feedback />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/updates" element={<Updates />} />
        <Route path="/support" element={<Support />} />
        <Route path="/help" element={<Help />} />
        <Route path="/ask" element={<AskPage />} />
        <Route path="/network" element={<Network />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/typing" element={<Typing />} />
        <Route path="/typing/:slug" element={<TypistProfile />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/premium/welcome" element={<PremiumWelcome />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}

export default function App() {
  // A successful render means the current chunks loaded fine, so clear the
  // one-shot reload flag in case a future deploy needs to trigger it again.
  sessionStorage.removeItem('chunk-error-reload')
  return (
    <BrowserRouter>
      <ChunkErrorBoundary>
        <Suspense fallback={null}>
          <AppRoutes />
        </Suspense>
      </ChunkErrorBoundary>
      <FeedbackButton />
    </BrowserRouter>
  )
}
