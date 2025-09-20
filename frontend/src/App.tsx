import React from 'react'
import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import TestTTSPage from './pages/TestTTSPage'

function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/test-tts" element={<TestTTSPage />} />
    </Routes>
  )
}

export default App
