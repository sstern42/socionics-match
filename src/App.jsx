import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Support from './pages/Support'
import Help from './pages/Help'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import Auth from './pages/Auth'
import ProfileSetup from './pages/ProfileSetup'
import ProfileEdit from './pages/ProfileEdit'
import ProfileDynamics from './pages/ProfileDynamics'
import ProfileNotifications from './pages/ProfileNotifications'
import Feedback from './pages/Feedback'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Admin from './pages/Admin'
import Changelog from './pages/Changelog'
import Network from './pages/Network'
import Feed from './pages/Feed'
import Messages from './pages/Messages'
import Typing from './pages/Typing'
import NotFound from './pages/NotFound'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile/setup" element={<ProfileSetup />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/profile/dynamics" element={<ProfileDynamics />} />
        <Route path="/profile/notifications" element={<ProfileNotifications />} />
        <Route path="/feedback/:matchId" element={<Feedback />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/support" element={<Support />} />
        <Route path="/help" element={<Help />} />
        <Route path="/network" element={<Network />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/typing" element={<Typing />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
