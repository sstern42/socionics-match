import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import Auth from './pages/Auth'
import ProfileSetup from './pages/ProfileSetup'
import ProfileEdit from './pages/ProfileEdit'
import Feedback from './pages/Feedback'
import Privacy from './pages/Privacy'
import Feed from './pages/Feed'
import Messages from './pages/Messages'
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
        <Route path="/feedback/:matchId" element={<Feedback />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
