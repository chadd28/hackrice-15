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
import ProtectedRoute from './components/ProtectedRoute'
import TechnicalQuestionTestPage from './pages/TechnicalQuestionTestPage'
import JobBriefTester from './pages/JobBriefTester'

function App(): React.ReactElement {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/sample-landing" element={<SampleLandingPage />} />
      <Route path="/test-tts" element={<TestTTSPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/practice/single" 
        element={
          <ProtectedRoute>
            <SingleQuestionPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/practice/technical" 
        element={
          <ProtectedRoute>
            <TechnicalQuestionTestPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/speech-to-text" 
        element={
          <ProtectedRoute>
            <SpeechToTextPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/interview/setup" 
        element={
          <ProtectedRoute>
            <InterviewSetupPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/interview/page" 
        element={
          <ProtectedRoute>
            <InterviewPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/interview" 
        element={
          <ProtectedRoute>
            <InterviewPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/interview/feedback" 
        element={
          <ProtectedRoute>
            <InterviewFeedbackPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/job-brief-tester" 
        element={
          <ProtectedRoute>
            <JobBriefTester />
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

export default App
