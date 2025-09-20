import React from 'react'
import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import SampleLandingPage from './pages/SampleLandingPage'
import TestTTSPage from './pages/TestTTSPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import SingleQuestionPage from './pages/SingleQuestionPage'
import SpeechToTextPage from './pages/SpeechToTextPage'
import JobBriefTester from './pages/JobBriefTester'
import TechAnswerTester from './pages/TechAnswerTester'

function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/sample-landing" element={<SampleLandingPage />} />
      <Route path="/test-tts" element={<TestTTSPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/practice/single" element={<SingleQuestionPage />} />
      <Route path="/speech-to-text" element={<SpeechToTextPage />} />
      <Route path="/jobBrief" element={<JobBriefTester />} />
      <Route path="/tech-answer" element={<TechAnswerTester />} />
    </Routes>
  )
}

export default App
