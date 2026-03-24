import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import NotFound from './pages/NotFound'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
