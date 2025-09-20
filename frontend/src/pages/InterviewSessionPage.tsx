import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RotateCcw, CheckCircle, Clock, Mic, MicOff, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { Question, GeneratedQuestions } from '../types/interview.types';
import interviewService from '../services/interviewService';
import MultiModalDashboard from '../components/MultiModalDashboard';
import { RealTimeAnalyzer, MultiModalAnalysisResult, testMultiModalSetup } from '../services/multiModalService';

/**
 * Interview Session Page - Manages the actual interview process
 * Stores questions and presents them one by one
 * Logs questions to console for testing purposes
 */
const InterviewSessionPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Interview state
  const [questions, setQuestions] = useState<GeneratedQuestions>({ technical: [], behavioral: [] });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentCategory, setCurrentCategory] = useState<'technical' | 'behavioral'>('technical');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Current question management
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  
  // Interview session state
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // Multi-modal analysis state
  const [analysisResults, setAnalysisResults] = useState<MultiModalAnalysisResult[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<MultiModalAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisDashboard, setShowAnalysisDashboard] = useState(false);
  const [realTimeAnalyzer, setRealTimeAnalyzer] = useState<RealTimeAnalyzer | null>(null);
  const [multiModalReady, setMultiModalReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /**
   * Load questions from the session
   */
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        
        // Get session data from the interview service
        const session = await interviewService.getSession();
        
        if (!session || !session.questions) {
          throw new Error('No questions found in session. Please go back and setup the interview.');
        }

        const loadedQuestions = session.questions;
        setQuestions(loadedQuestions);
        
        // Ensure arrays exist before accessing them
        const technicalQuestions = loadedQuestions.technical || [];
        const behavioralQuestions = loadedQuestions.behavioral || [];
        
        // Log all questions to console for testing
        console.group('🎯 Generated Interview Questions');
        console.log('📋 Session ID:', interviewService.getSessionId());
        console.log('📊 Total Questions:', {
          technical: technicalQuestions.length,
          behavioral: behavioralQuestions.length,
          total: technicalQuestions.length + behavioralQuestions.length
        });
        
        console.group('🔧 Technical Questions');
        technicalQuestions.forEach((q: Question, index: number) => {
          console.log(`${index + 1}. [${q.difficulty.toUpperCase()}] ${q.question}`);
          console.log(`   Tags: ${q.tags.join(', ')}`);
          console.log(`   Context: ${q.context}`);
          console.log('---');
        });
        console.groupEnd();
        
        console.group('🤝 Behavioral Questions');
        behavioralQuestions.forEach((q: Question, index: number) => {
          console.log(`${index + 1}. [${q.difficulty.toUpperCase()}] ${q.question}`);
          console.log(`   Tags: ${q.tags.join(', ')}`);
          console.log(`   Context: ${q.context}`);
          console.log('---');
        });
        console.groupEnd();
        console.groupEnd();

        // Set the first question
        if (technicalQuestions.length > 0) {
          setCurrentQuestion(technicalQuestions[0]);
          setCurrentCategory('technical');
          setCurrentQuestionIndex(0);
        } else if (behavioralQuestions.length > 0) {
          setCurrentQuestion(behavioralQuestions[0]);
          setCurrentCategory('behavioral');
          setCurrentQuestionIndex(0);
        }
        
        // Set session start time
        setSessionStartTime(new Date());
        
        // Initialize multi-modal analysis
        initializeMultiModalAnalysis();
        
      } catch (err) {
        console.error('Failed to load questions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load interview questions');
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, []);

  /**
   * Initialize multi-modal analysis system
   */
  const initializeMultiModalAnalysis = async () => {
    try {
      // Test system setup
      const setup = await testMultiModalSetup();
      setMultiModalReady(setup.systemReady);
      
      if (setup.systemReady) {
        console.log('✅ Multi-modal analysis system ready');
      } else {
        console.warn('⚠️ Multi-modal analysis system not fully configured:', setup);
      }
    } catch (error) {
      console.error('Failed to initialize multi-modal analysis:', error);
      setMultiModalReady(false);
    }
  };

  /**
   * Start real-time analysis when recording begins
   */
  const startRealTimeAnalysis = async () => {
    if (!videoRef.current || realTimeAnalyzer) return;

    try {
      const analyzer = new RealTimeAnalyzer(
        videoRef.current,
        (result: MultiModalAnalysisResult) => {
          console.log('📊 Real-time analysis result:', result);
          setCurrentAnalysis(result);
          setAnalysisResults(prev => [...prev, result]);
        }
      );

      await analyzer.startAnalysis(15); // Analyze every 15 seconds
      setRealTimeAnalyzer(analyzer);
      setIsAnalyzing(true);
      
      console.log('🚀 Real-time analysis started');
    } catch (error) {
      console.error('Failed to start real-time analysis:', error);
    }
  };

  /**
   * Stop real-time analysis
   */
  const stopRealTimeAnalysis = () => {
    if (realTimeAnalyzer) {
      realTimeAnalyzer.stopAnalysis();
      setRealTimeAnalyzer(null);
      setIsAnalyzing(false);
      console.log('🛑 Real-time analysis stopped');
    }
  };

  /**
   * Get current questions array based on category
   */
  const getCurrentQuestions = (): Question[] => {
    return currentCategory === 'technical' ? (questions.technical || []) : questions.behavioral;
  };

  /**
   * Move to next question
   */
  const goToNextQuestion = () => {
    const currentQuestions = getCurrentQuestions();
    
    if (currentQuestionIndex < currentQuestions.length - 1) {
      // Next question in current category
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(currentQuestions[nextIndex]);
      
      console.log(`📍 Moving to next ${currentCategory} question:`, currentQuestions[nextIndex].question);
    } else if (currentCategory === 'technical' && questions.behavioral.length > 0) {
      // Switch to behavioral questions
      setCurrentCategory('behavioral');
      setCurrentQuestionIndex(0);
      setCurrentQuestion(questions.behavioral[0]);
      
      console.log('🔄 Switching to behavioral questions');
      console.log('📍 First behavioral question:', questions.behavioral[0].question);
    } else {
      // Interview completed
      console.log('🎉 Interview completed! All questions answered.');
      handleCompleteInterview();
    }
  };

  /**
   * Move to previous question
   */
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      // Previous question in current category
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      const currentQuestions = getCurrentQuestions();
      setCurrentQuestion(currentQuestions[prevIndex]);
      
      console.log(`📍 Moving to previous ${currentCategory} question:`, currentQuestions[prevIndex].question);
    } else if (currentCategory === 'behavioral' && (questions.technical || []).length > 0) {
      // Switch back to technical questions
      setCurrentCategory('technical');
      const technicalQuestions = questions.technical || [];
      const lastTechnicalIndex = technicalQuestions.length - 1;
      setCurrentQuestionIndex(lastTechnicalIndex);
      setCurrentQuestion(technicalQuestions[lastTechnicalIndex]);
      
      console.log('🔄 Switching back to technical questions');
      console.log('📍 Last technical question:', technicalQuestions[lastTechnicalIndex].question);
    }
  };

  /**
   * Mark current question as answered
   */
  const markQuestionAnswered = () => {
    if (currentQuestion) {
      setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id]));
      console.log(`✅ Marked question as answered: ${currentQuestion.question}`);
    }
  };

  /**
   * Toggle recording state and multi-modal analysis
   */
  const toggleRecording = async () => {
    if (!isRecording) {
      // Start recording and analysis
      setIsRecording(true);
      console.log('🎤 Started recording');
      
      if (multiModalReady) {
        await startRealTimeAnalysis();
      }
    } else {
      // Stop recording and analysis
      setIsRecording(false);
      console.log('⏹️ Stopped recording');
      
      stopRealTimeAnalysis();
    }
  };

  /**
   * Complete the interview
   */
  const handleCompleteInterview = () => {
    const endTime = new Date();
    const duration = sessionStartTime ? Math.round((endTime.getTime() - sessionStartTime.getTime()) / 1000 / 60) : 0;
    
    console.log('🎯 Interview Session Summary:');
    console.log('⏱️ Duration:', `${duration} minutes`);
    console.log('✅ Questions Answered:', answeredQuestions.size);
    console.log('📊 Total Questions:', (questions.technical || []).length + questions.behavioral.length);
    
    // Navigate to completion page or dashboard
    navigate('/dashboard', { 
      state: { 
        interviewCompleted: true,
        duration,
        questionsAnswered: answeredQuestions.size
      }
    });
  };

  /**
   * Switch between question categories
   */
  const switchCategory = (category: 'technical' | 'behavioral') => {
    if (category === currentCategory) return;
    
    setCurrentCategory(category);
    setCurrentQuestionIndex(0);
    
    const targetQuestions = category === 'technical' ? (questions.technical || []) : questions.behavioral;
    if (targetQuestions && targetQuestions.length > 0) {
      setCurrentQuestion(targetQuestions[0]);
      console.log(`🔄 Switched to ${category} questions:`, targetQuestions[0].question);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your personalized interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Interview Setup Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/interview/setup')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Back to Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = (questions.technical || []).length + questions.behavioral.length;
  const progressPercentage = totalQuestions > 0 ? 
    ((currentCategory === 'technical' ? currentQuestionIndex : (questions.technical || []).length + currentQuestionIndex) / totalQuestions) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4" />
                End Interview
              </button>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                {sessionStartTime && (
                  <span>Started {sessionStartTime.toLocaleTimeString()}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Multi-modal Analysis Toggle */}
              {multiModalReady && (
                <button
                  onClick={() => setShowAnalysisDashboard(!showAnalysisDashboard)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium ${
                    showAnalysisDashboard 
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Analysis
                  {showAnalysisDashboard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}

              {/* Recording Indicator */}
              <button
                onClick={toggleRecording}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium ${
                  isRecording 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isRecording ? 'Stop Recording' : 'Start Recording'}
                {isAnalyzing && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </button>

              {/* Progress */}
              <div className="text-sm text-gray-500">
                Question {Math.floor(progressPercentage / 100 * totalQuestions) + 1} of {totalQuestions}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Multi-Modal Analysis Dashboard */}
        {showAnalysisDashboard && (
          <div className="mb-8">
            <MultiModalDashboard 
              analysis={currentAnalysis}
              isAnalyzing={isAnalyzing}
              className="bg-white rounded-lg shadow-sm border p-6"
            />
          </div>
        )}

        {/* Hidden Video Element for Multi-Modal Analysis */}
        {multiModalReady && (
          <video
            ref={videoRef}
            autoPlay
            muted
            className="hidden"
            onLoadedMetadata={async () => {
              // Setup camera stream
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                  video: true, 
                  audio: false 
                });
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                }
              } catch (error) {
                console.error('Failed to access camera:', error);
              }
            }}
          />
        )}
        {/* Category Selector */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => switchCategory('technical')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                currentCategory === 'technical'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Technical ({(questions.technical || []).length})
            </button>
            <button
              onClick={() => switchCategory('behavioral')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                currentCategory === 'behavioral'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Behavioral ({questions.behavioral.length})
            </button>
          </div>
        </div>

        {/* Current Question */}
        {currentQuestion && (
          <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
                {currentCategory === 'technical' ? '🔧' : '🤝'} {currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)}
                <span className="px-2 py-0.5 bg-blue-200 rounded text-xs">
                  {currentQuestion.difficulty.toUpperCase()}
                </span>
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-900 leading-relaxed">
                {currentQuestion.question}
              </h2>
              
              {currentQuestion.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {currentQuestion.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Question Context */}
            {currentQuestion.context && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600">
                  <strong>Context:</strong> {currentQuestion.context}
                </p>
              </div>
            )}

            {/* Answer Section */}
            <div className="text-center">
              <p className="text-gray-600 mb-6">
                Take your time to think about this question. When ready, you can speak your answer or use the recording feature.
              </p>
              
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={markQuestionAnswered}
                  disabled={answeredQuestions.has(currentQuestion.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    answeredQuestions.has(currentQuestion.id)
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {answeredQuestions.has(currentQuestion.id) ? 'Answered' : 'Mark as Answered'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0 && currentCategory === 'technical'}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Question
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              <RotateCcw className="w-4 h-4" />
              Restart
            </button>

            <button
              onClick={goToNextQuestion}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {(currentCategory === 'technical' && currentQuestionIndex === (questions.technical || []).length - 1 && questions.behavioral.length === 0) ||
               (currentCategory === 'behavioral' && currentQuestionIndex === questions.behavioral.length - 1)
                ? 'Complete Interview'
                : 'Next Question'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSessionPage;