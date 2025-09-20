import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Mic, ArrowLeft, Square, RefreshCw, Brain, Target } from 'lucide-react';
import { sttService } from '../services/sttService';
import { videoService } from '../services/videoService';
import technicalEvaluationService from '../services/technicalEvaluationService';
import type { TechnicalQuestion, TechnicalEvaluationResult } from '../services/technicalEvaluationService';

/**
 * Technical Question Test Page - Practice technical interviews with AI evaluation
 * Features: Random question selection, speech recording, semantic evaluation
 */
function TechnicalQuestionTestPage(): React.ReactElement {
  const navigate = useNavigate();
  
  // System state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Question state
  const [currentQuestion, setCurrentQuestion] = useState<TechnicalQuestion | null>(null);
  const [allQuestions, setAllQuestions] = useState<TechnicalQuestion[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Answer and evaluation state
  const [transcription, setTranscription] = useState<string>('');
  const [evaluation, setEvaluation] = useState<TechnicalEvaluationResult | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  
  // Video refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const stopRecordingRef = useRef<(() => void) | null>(null);

  /**
   * Initialize the technical evaluation system
   */
  useEffect(() => {
    initializeSystem();
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const initializeSystem = async () => {
    try {
      setIsLoading(true);
      console.log('🔧 Initializing technical evaluation system...');

      // Initialize technical evaluation service
      const initResult = await technicalEvaluationService.initialize();
      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initialize technical evaluation');
      }

      // Get all questions
      const questionsResult = await technicalEvaluationService.getAllQuestions();
      if (!questionsResult.success || !questionsResult.questions) {
        throw new Error(questionsResult.error || 'Failed to load questions');
      }

      const questions = questionsResult.questions;
      setAllQuestions(questions);

      // Extract unique roles
      const roles = [...new Set(questions.map(q => q.role))];
      setAvailableRoles(roles);

      // Initialize video
      const stream = await videoService.initializeCamera({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      console.log(`✅ System initialized with ${questions.length} questions across ${roles.length} roles`);

      // Load first random question
      loadRandomQuestion(questions);

    } catch (error) {
      console.error('❌ Failed to initialize system:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize system');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load a random question based on selected role or all questions
   */
  const loadRandomQuestion = (questions?: TechnicalQuestion[]) => {
    const questionPool = questions || allQuestions;
    const filteredQuestions = selectedRole 
      ? questionPool.filter(q => q.role === selectedRole)
      : questionPool;

    if (filteredQuestions.length === 0) return;

    const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
    const question = filteredQuestions[randomIndex];
    
    setCurrentQuestion(question);
    setTranscription('');
    setEvaluation(null);
    setShowEvaluation(false);
    
    console.log(`🎯 Loaded question ${question.id}: ${question.role}`);
  };

  /**
   * Handle role filter change
   */
  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    loadRandomQuestion();
  };

  /**
   * Start recording user's answer
   */
  const startRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingTime(0);
      setTranscription('');
      setEvaluation(null);
      setShowEvaluation(false);

      // Start live speech-to-text
      const { stopRecording } = await sttService.recordAndTranscribeLive(
        (message, type) => {
          console.log(`STT Status: ${message} (${type})`);
        },
        (transcript, _isFinal) => {
          setTranscription(transcript);
        },
        { languageCode: 'en-US' }
      );

      // Store stop function for later use
      stopRecordingRef.current = stopRecording;

      // Start recording timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      console.log('🎙️ Started recording...');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setError('Failed to start recording. Please check microphone permissions.');
      setIsRecording(false);
    }
  };

  /**
   * Stop recording and evaluate the answer
   */
  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);

      // Stop timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Stop speech-to-text
      if (stopRecordingRef.current) {
        stopRecordingRef.current();
        stopRecordingRef.current = null;
      }

      console.log('🎙️ Recording stopped, transcription:', transcription);

      // Evaluate the answer if we have transcription and current question
      if (transcription.trim() && currentQuestion) {
        console.log('⚡ Evaluating answer...');
        
        const evaluationResult = await technicalEvaluationService.evaluateAnswer(
          currentQuestion.id,
          transcription.trim()
        );

        if (evaluationResult.success && evaluationResult.evaluation) {
          setEvaluation(evaluationResult.evaluation);
          setShowEvaluation(true);
          console.log('✅ Evaluation completed');
        } else {
          throw new Error(evaluationResult.error || 'Evaluation failed');
        }
      } else {
        setError('No speech detected. Please try speaking your answer again.');
      }

    } catch (error) {
      console.error('❌ Failed to process recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Format time as MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Get score color and emoji (updated for 1-10 scale)
   */
  const getScoreDisplay = (score: number) => {
    if (score >= 8.5) return { color: 'text-green-400', emoji: '🎉', label: 'Excellent!' };
    if (score >= 7) return { color: 'text-blue-400', emoji: '✅', label: 'Good' };
    if (score >= 5) return { color: 'text-yellow-400', emoji: '⚠️', label: 'Partial' };
    return { color: 'text-red-400', emoji: '❌', label: 'Needs Improvement' };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white text-lg">Initializing Technical Evaluation System...</p>
          <p className="text-slate-400 text-sm mt-2">Loading questions and AI models...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-4">System Error</h1>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Technical Question Practice</h1>
              <p className="text-slate-400">AI-powered technical interview simulation</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Brain className="h-6 w-6 text-blue-400" />
            <span className="text-sm text-slate-400">Semantic Evaluation</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Video and Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Video Feed */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Video Feed
            </h3>
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-48 bg-black rounded-lg object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>

          {/* Role Filter */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Question Filter</h3>
            <select
              value={selectedRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="">All Roles ({allQuestions.length} questions)</option>
              {availableRoles.map(role => {
                const count = allQuestions.filter(q => q.role === role).length;
                return (
                  <option key={role} value={role}>
                    {role} ({count} questions)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Recording Controls */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Mic className="h-5 w-5 mr-2" />
              Recording Controls
            </h3>
            
            {!isRecording && !isProcessing && (
              <button
                onClick={startRecording}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center"
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Recording Answer
              </button>
            )}

            {isRecording && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-red-400 font-semibold">🔴 Recording...</span>
                  <span className="text-white font-mono">{formatTime(recordingTime)}</span>
                </div>
                <button
                  onClick={stopRecording}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  <Square className="h-5 w-5 mr-2" />
                  Stop Recording
                </button>
              </div>
            )}

            {isProcessing && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-slate-400">Evaluating your answer...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Question and Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Question */}
          {currentQuestion && (
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <Target className="h-6 w-6 mr-2 text-blue-400" />
                  Technical Question
                </h2>
                <button
                  onClick={() => loadRandomQuestion()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  New Question
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                    ID: {currentQuestion.id}
                  </span>
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm">
                    {currentQuestion.role}
                  </span>
                </div>
                
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-lg leading-relaxed">{currentQuestion.question}</p>
                </div>
                
                <div className="text-sm text-slate-400">
                  <strong>Keywords to consider:</strong> {currentQuestion.keywords.join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Live Transcription */}
          {transcription && (
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Mic className="h-5 w-5 mr-2 text-blue-400" />
                Your Answer {isRecording && <span className="ml-2 text-red-400">(Live)</span>}
              </h3>
              <div className="bg-slate-700 rounded-lg p-4 min-h-[100px]">
                <p className="text-white leading-relaxed">
                  {transcription || <span className="text-slate-400 italic">Your speech will appear here...</span>}
                </p>
              </div>
            </div>
          )}

          {/* Evaluation Results */}
          {showEvaluation && evaluation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 rounded-lg p-6"
            >
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <Brain className="h-6 w-6 mr-2 text-purple-400" />
                AI Evaluation Results
              </h3>

              {/* Score Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <div className={`text-2xl font-bold ${getScoreDisplay(evaluation.score).color}`}>
                    {evaluation.score}/10
                  </div>
                  <div className="text-sm text-slate-400">Overall Score</div>
                </div>
                
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {(evaluation.similarity * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-400">Semantic Match</div>
                </div>
                
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {evaluation.keywordMatches.length}/{currentQuestion?.keywords.length || 0}
                  </div>
                  <div className="text-sm text-slate-400">Keywords Found</div>
                </div>
                
                <div className="bg-slate-700 rounded-lg p-4 text-center">
                  <div className="text-2xl">
                    {evaluation.isCorrect ? '✅' : '❌'}
                  </div>
                  <div className="text-sm text-slate-400">
                    {evaluation.isCorrect ? 'Correct' : 'Needs Work'}
                  </div>
                </div>
              </div>

              {/* Detailed Feedback */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">📝 Detailed Feedback:</h4>
                  <div className="bg-slate-700 rounded-lg p-4">
                    <p className="leading-relaxed">{evaluation.feedback}</p>
                  </div>
                </div>

                {evaluation.keywordMatches.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">🔑 Keywords You Mentioned:</h4>
                    <div className="flex flex-wrap gap-2">
                      {evaluation.keywordMatches.map((keyword, index) => (
                        <span
                          key={index}
                          className="bg-green-600 text-white px-3 py-1 rounded-full text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {evaluation.suggestions && evaluation.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">💡 Suggestions for Improvement:</h4>
                    <ul className="bg-slate-700 rounded-lg p-4 space-y-2">
                      {evaluation.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-400 mr-2">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TechnicalQuestionTestPage;