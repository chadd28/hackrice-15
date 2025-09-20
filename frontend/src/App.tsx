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
import InterviewSetupPage from './pages/InterviewSetupPage'
import InterviewPage from './pages/InterviewPage'
import InterviewFeedbackPage from './pages/InterviewFeedbackPage'
import JobBriefTester from './pages/JobBriefTester'
import TechnicalQuestionTestPage from './pages/TechnicalQuestionTestPage'

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
      <Route path="/practice/technical" element={<TechnicalQuestionTestPage />} />
      <Route path="/speech-to-text" element={<SpeechToTextPage />} />
      <Route path="/interview/setup" element={<InterviewSetupPage />} />
      <Route path="/interview/session" element={<InterviewPage />} />
      <Route path="/interview/feedback" element={<InterviewFeedbackPage />} />
      <Route path="/job-brief-tester" element={<JobBriefTester />} />
    </Routes>
  )
}

export default App
