import React from 'react'
import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import TestTTSPage from './pages/TestTTSPage'
import SpeechToTextPage from './pages/SpeechToTextPage'

function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
  <Route path="/test-tts" element={<TestTTSPage />} />
  <Route path="/speech-to-text" element={<SpeechToTextPage />} />
    </Routes>
  )
}

export default App
