import React from 'react'
import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import SampleLandingPage from './pages/SampleLandingPage'
import TestTTSPage from './pages/TestTTSPage'

function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/sample-landing" element={<SampleLandingPage />} />
      <Route path="/test-tts" element={<TestTTSPage />} />
    </Routes>
  )
}

export default App
