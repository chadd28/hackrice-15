import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Mic, ArrowLeft, Square, CheckCircle } from 'lucide-react';
import { GeneratedQuestions } from '../types/interview.types';
import interviewService from '../services/interviewService';
import { ttsService } from '../services/ttsService';
import { sttService } from '../services/sttService';
import { videoService } from '../services/videoService';
import { behavGraderService } from '../services/behavGraderService';

/**
 * Interview Page - Manages a complete behavioral interview session
 * Flows through: Introduction -> Question 1 -> Answer 1 -> Question 2 -> Answer 2 -> Complete
 */
function InterviewPage(): React.ReactElement {
  const navigate = useNavigate();
  
  // Interview flow state
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlayingIntro, setIsPlayingIntro] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Questions and current state
  const [questions, setQuestions] = useState<GeneratedQuestions>({ technical: [], behavioral: [] });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Recording and transcription
  const [transcription, setTranscription] = useState<string>('');
  const [showTranscription, setShowTranscription] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  
  // Store feedback data for all questions
  const [feedbackData, setFeedbackData] = useState<Array<{
    questionIndex: number;
    question: string;
    answer: string;
    feedback: any;
  }>>([]);
  
  // Session management
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  
  // Refs for recording
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunkedRecordingRef = useRef<{ stopRecording: () => void } | null>(null);
  const initializationRef = useRef<boolean>(false);
  const introPlayedRef = useRef<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Initialize webcam and load questions
  useEffect(() => {
    // Prevent multiple initializations (handles React Strict Mode)
    if (initializationRef.current) {
      return;
    }
    initializationRef.current = true;

    const initializeInterview = async () => {
      try {
        // Load questions first
        await loadQuestions();

        // Initialize camera using videoService
        const mediaStream = await videoService.initializeCamera({
          video: true,
          audio: true
        });
        
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // Ensure video plays
          try {
            await videoRef.current.play();
          } catch (playError) {
            console.log('Video autoplay prevented, user interaction required');
          }
        }

        // Create video-only recorder for visual recording
        const videoStream = new MediaStream(mediaStream.getVideoTracks());
        const videoRecorder = new MediaRecorder(videoStream, {
          mimeType: 'video/webm;codecs=vp9'
        });

        videoRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            console.log('Video chunk recorded:', event.data.size, 'bytes');
          }
        };

        videoRecorder.onstop = () => {
          console.log('Video recording stopped');
        };

        videoRecorderRef.current = videoRecorder;

        // Auto-start interview after everything is loaded
        setTimeout(() => {
          handleStartInterview();
        }, 1000);

      } catch (err) {
        console.error('Error initializing interview:', err);
        setError('Failed to initialize camera or load questions');
      }
    };

    initializeInterview();

    // Cleanup function
    return () => {
      if (stream) {
        videoService.stopMediaStream(stream);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (chunkedRecordingRef.current) {
        chunkedRecordingRef.current.stopRecording();
      }
    };
  }, []);

  /**
   * Load questions from the session
   */
  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      
      const session = await interviewService.getSession();
      
      if (!session || !session.questions) {
        throw new Error('No questions found in session. Please go back and setup the interview.');
      }

      const loadedQuestions = session.questions;
      setQuestions(loadedQuestions);
      
      // Log questions for debugging
      console.group('🎯 Interview Questions Loaded');
      console.log('📋 Session ID:', interviewService.getSessionId());
      console.log('📊 Behavioral Questions Available:', loadedQuestions.behavioral.length);
      
      // We only use the first 2 behavioral questions
      const questionsToUse = loadedQuestions.behavioral.slice(0, 2);
      questionsToUse.forEach((q, index) => {
        console.log(`${index + 1}. [${q.difficulty.toUpperCase()}] ${q.question}`);
        console.log(`   Tags: ${q.tags.join(', ')}`);
      });
      console.groupEnd();
      
      setSessionStartTime(new Date());
      
    } catch (err) {
      console.error('Failed to load questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load interview questions');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start the complete interview flow
   */
  const handleStartInterview = async () => {
    // Prevent multiple calls using both state and ref guards
    if (hasStarted || isPlayingIntro || introPlayedRef.current) {
      console.log('⚠️ Interview already started or intro already playing');
      return;
    }

    if (videoRecorderRef.current && videoRecorderRef.current.state === 'inactive') {
      setHasStarted(true);
      setIsPlayingIntro(true);
      introPlayedRef.current = true;
      
      try {
        // Generate and play introduction
        console.log('🎬 Starting interview with introduction...');
        const introResponse = await ttsService.generateIntroduction(
          'Software Engineer', // Could come from session data
          'Your Target Company',
          'AI Interviewer'
        );
        
        console.log('🔊 Playing introduction audio...');
        await ttsService.playAudio(introResponse.audioContent);
        console.log('✅ Introduction completed');
        
        // Introduction complete - show button to start first question
        setIsPlayingIntro(false);
        setIntroComplete(true);
        
      } catch (error) {
        console.error('❌ Error playing introduction:', error);
        // Even if intro fails, move to ready state
        setIsPlayingIntro(false);
        setIntroComplete(true);
      }
    }
  };

  /**
   * Play the current behavioral question
   */
  const playCurrentQuestion = async () => {
    console.log('🎯 Playing question', currentQuestionIndex + 1);

    // Since backend always sends exactly 2 questions, just check if we have questions
    if (!questions.behavioral || questions.behavioral.length === 0) {
      console.log('❌ No behavioral questions available');
      return;
    }

    const currentQuestion = questions.behavioral[currentQuestionIndex];
    if (!currentQuestion) {
      console.log('❌ Current question is undefined at index:', currentQuestionIndex);
      return;
    }

    try {
      setIsPlayingQuestion(true);
      
      console.log(`🎤 Playing question ${currentQuestionIndex + 1}: ${currentQuestion.question}`);
      const questionResponse = await ttsService.askQuestion(currentQuestion.question);
      
      console.log('🔊 Playing question audio...');
      await ttsService.playAudio(questionResponse.audioContent);
      console.log('✅ Question completed, auto-starting recording...');
      
      // Auto-start recording after question completes (like SingleQuestionPage)
      setIsPlayingQuestion(false);
      setTimeout(() => {
        startRecording();
      }, 500); // Small delay for smooth transition
      
    } catch (error) {
      console.error('❌ Error playing question:', error);
      setIsPlayingQuestion(false);
      // Note: Error fallback - could show error state or retry option
    }
  };

  /**
   * Start recording answer
   */
  const startRecording = async () => {
    try {
      console.log('🎥 Starting recording...');
      setIsRecording(true);
      setRecordingTime(0);
      setTranscription('');
      setShowTranscription(false);

      
      // Start video recording
      if (videoRecorderRef.current && videoRecorderRef.current.state === 'inactive') {
        videoRecorderRef.current.start();
        console.log('📹 Video recording started');
      }

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop recording after 3 minutes
          if (newTime >= 180) {
            handleStopAnswer();
          }
          return newTime;
        });
      }, 1000);

      // Start live audio transcription
      try {
        const liveResult = await sttService.recordAndTranscribeLive(
          (message, type) => {
            if (type === 'error' || type === 'info') {
              console.log(`🎙️ Transcription status: ${message} (${type})`);
            }
            // Note: isTranscribing state removed for cleaner code
          },
          (transcript, isFinal) => {
            if (isFinal) {
              console.log(`📝 Final transcript:`, transcript);
            }
            setTranscription(transcript);
            setShowTranscription(true);
          },
          {
            languageCode: 'en-US',
          }
        );

        chunkedRecordingRef.current = liveResult;
        console.log('🎙️ Live transcription setup complete');
      } catch (error) {
        console.error('❌ Error setting up live transcription:', error);
        setIsRecording(false);
      }
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setIsRecording(false);
    }
  };

  /**
   * Stop recording and process answer
   */
  const handleStopAnswer = async () => {
    setIsRecording(false);
    
    // Stop video recording
    if (videoRecorderRef.current && videoRecorderRef.current.state === 'recording') {
      videoRecorderRef.current.stop();
      console.log('⏹️ Video recording stopped');
    }
    
    // Stop live transcription
    if (chunkedRecordingRef.current) {
      chunkedRecordingRef.current.stopRecording();
      console.log('⏹️ Live transcription stopped');
    }
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const currentQuestion = questions.behavioral[currentQuestionIndex];
    if (currentQuestion) {
      // Mark question as answered
      setAnsweredQuestions(prev => new Set([...prev, currentQuestion.id]));
    }

    // Store feedback data - do this synchronously to ensure it's captured
    let feedbackResult = null;
    
    // Grade the answer in background and log to console (don't show UI feedback)
    if (transcription && transcription.trim() && currentQuestion) {
      try {
        console.log('📊 Sending transcript to grader...');
        const gradeResp = await behavGraderService.gradeBehavioral(currentQuestion.question, transcription);
        console.log('✅ Grader response received:', gradeResp);
        feedbackResult = gradeResp.feedback || null;
        
        // Log feedback to console but don't show in UI
        console.group(`🎯 Question ${currentQuestionIndex + 1} Feedback`);
        console.log('Question:', currentQuestion.question);
        console.log('Answer:', transcription);
        console.log('Score:', gradeResp.feedback?.score || 'N/A');
        console.log('Strengths:', gradeResp.feedback?.strengths || 'N/A');
        console.log('Suggestions:', gradeResp.feedback?.suggestions || 'N/A');
        console.groupEnd();
        
      } catch (gErr) {
        console.error('❌ Behavioral grading failed:', gErr);
        feedbackResult = null;
      }
    } else {
      console.log('⚠️ No transcription available for grading');
    }

    // Store the question data with feedback (if any)
    if (currentQuestion) {
      setFeedbackData(prev => {
        const newData = [...prev, {
          questionIndex: currentQuestionIndex,
          question: currentQuestion.question,
          answer: transcription || '',
          feedback: feedbackResult
        }];
        console.log('📋 Updated feedback data:', newData);
        return newData;
      });
    }

    // Move to next question or complete interview automatically
    if (currentQuestionIndex < 1) {
      console.log(`➡️ Auto-moving to question ${currentQuestionIndex + 2}`);
      setTimeout(() => {
        handleNextQuestion();
      }, 1000); // Reduced delay since feedback is now processed synchronously
    } else {
      console.log('🎉 Interview completed!');
      setTimeout(() => {
        handleCompleteInterview();
      }, 1000); // Reduced delay
    }
  };

  /**
   * Move to next question
   */
  const handleNextQuestion = async () => {
    console.log(`➡️ Moving to question ${currentQuestionIndex + 2}`);
    setCurrentQuestionIndex(prev => prev + 1);

    setTranscription('');
    setShowTranscription(false);
    
    // Reset states
    setIsPlayingQuestion(false);
    setIsRecording(false);
    
    // Auto-start the next question after a small delay
    setTimeout(() => {
      playCurrentQuestion();
    }, 500);
  };

  /**
   * Complete the interview and navigate to results
   */
  const handleCompleteInterview = () => {
    const endTime = new Date();
    const duration = sessionStartTime ? Math.round((endTime.getTime() - sessionStartTime.getTime()) / 1000 / 60) : 0;
    
    console.log('🎯 Interview Session Summary:');
    console.log('⏱️ Duration:', `${duration} minutes`);
    console.log('✅ Questions Answered:', answeredQuestions.size);
    console.log('📊 Total Questions Asked:', totalQuestionsToAsk);
    console.log('📋 Feedback Data:', feedbackData);
    
    // Navigate to feedback page with all collected data
    navigate('/interview/feedback', { 
      state: { 
        duration,
        questionsAnswered: answeredQuestions.size,
        totalQuestions: totalQuestionsToAsk,
        feedbackData,
        completedAt: endTime.toISOString()
      }
    });
  };

  /**
   * Format recording time as MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white">Loading your behavioral interview...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-6">
            <h2 className="text-red-300 font-semibold mb-2">Interview Setup Error</h2>
            <p className="text-red-200 mb-4">{error}</p>
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

  // Get current question (always exactly 2 questions from backend)
  const totalQuestionsToAsk = 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 font-sans text-white">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              End Interview
            </button>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Behavioral Interview Practice
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isRecording ? 'bg-red-500/20 text-red-300' : 'bg-slate-700 text-slate-300'
            }`}>
              {isRecording ? <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> : <Mic className="w-4 h-4" />}
              {isRecording ? `Recording ${formatTime(recordingTime)}` : 'Ready'}
            </div>
            {sessionStartTime && (
              <div className="text-sm text-slate-400">
                Started {sessionStartTime.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-7xl mx-auto mt-4">
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${totalQuestionsToAsk > 0 ? 
                  (currentQuestionIndex / totalQuestionsToAsk) * 100 : 0}%` 
              }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>Question {currentQuestionIndex + 1} of {totalQuestionsToAsk}</span>
            <span>Behavioral Interview</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-140px)]">
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[calc(100vh-200px)]">
          
            {/* Interviewer Side */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">AI</span>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">AI Interviewer</h2>
                  <p className="text-slate-400 text-sm">
                    {isPlayingIntro ? 'Playing introduction...' :
                     isPlayingQuestion ? 'Asking question...' :
                     isRecording ? 'Listening to your answer...' :
                     hasStarted ? 'Ready for next step' :
                     'Ready to begin interview'}
                  </p>
                </div>
              </div>

              {/* Content Display */}
              <div className="flex-1 flex flex-col">
                {!hasStarted ? (
                  // Pre-interview loading
                  <div className="bg-slate-700/50 rounded-lg p-6 mb-6 flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-pulse mb-4">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <Mic className="w-8 h-8 text-blue-400" />
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Preparing Your Interview</h3>
                      <p className="text-slate-400 text-sm">Setting up camera and microphone...</p>
                    </div>
                  </div>
                ) : isPlayingIntro ? (
                  // Playing introduction
                  <div className="bg-slate-700/50 rounded-lg p-6 mb-6 flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-pulse mb-4">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Welcome to Your Interview</h3>
                      <p className="text-slate-400 text-sm">Playing introduction...</p>
                    </div>
                  </div>
                ) : introComplete && !isPlayingQuestion && !isRecording ? (
                  // Ready to start next question
                  <div className="bg-slate-700/50 rounded-lg p-6 mb-6 flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-4">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{currentQuestionIndex + 1}</span>
                          </div>
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Ready for Question {currentQuestionIndex + 1}</h3>
                      <p className="text-slate-400 text-sm">Click the button below to hear the question</p>
                    </div>
                  </div>
                ) : isPlayingQuestion ? (
                  // Playing question
                  <div className="bg-slate-700/50 rounded-lg p-6 mb-6 flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-pulse mb-4">
                        <div className="w-16 h-16 bg-purple-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <div className="w-8 h-8 bg-purple-500 rounded-full"></div>
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Behavioral Question {currentQuestionIndex + 1}</h3>
                      <p className="text-slate-400 text-sm">Listen carefully to the question...</p>
                    </div>
                  </div>
                ) : isRecording ? (
                  // Recording answer
                  <div className="bg-slate-700/50 rounded-lg p-6 mb-6 flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-4">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Recording Your Answer</h3>
                      <p className="text-slate-400 text-sm">Take your time and speak clearly...</p>
                      <div className="text-red-300 text-sm mt-2">
                        {formatTime(recordingTime)} / 03:00
                      </div>
                    </div>
                  </div>
                ) : (
                  // Interview processing or complete
                  <div className="bg-slate-700/50 rounded-lg p-6 mb-6 flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-4">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        {currentQuestionIndex >= 1 ? 'Interview Complete!' : 'Processing...'}
                      </h3>
                      <p className="text-slate-400">
                        {currentQuestionIndex >= 1 ? 'Preparing your detailed feedback...' : 'Please wait...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {introComplete && !isPlayingQuestion && !isRecording ? (
                    <button
                      onClick={playCurrentQuestion}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      Start Question {currentQuestionIndex + 1}
                    </button>
                  ) : isRecording ? (
                    <button
                      onClick={handleStopAnswer}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Square className="w-4 h-4" />
                      Stop Recording
                    </button>
                  ) : null}
                </div>
              </div>
            </motion.div>

            {/* Candidate Side */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Your Response</h2>
                  <p className="text-slate-400 text-sm">Camera and microphone ready</p>
                </div>
              </div>

              {/* Video Feed */}
              <div className="bg-slate-900 rounded-lg mb-6 aspect-video flex items-center justify-center overflow-hidden relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{
                    transform: 'scaleX(-1)', // Mirror the video like a selfie camera
                  }}
                  onLoadedMetadata={() => {
                    // Ensure video starts playing when metadata is loaded
                    if (videoRef.current) {
                      videoRef.current.play().catch(e => console.log('Video autoplay prevented:', e));
                    }
                  }}
                />
                {/* Fallback if video doesn't load */}
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                    <div className="text-center">
                      <Camera className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">Loading camera...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Transcription */}
              {showTranscription && transcription && (
                <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-300 text-sm font-medium">Live Transcription</span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed">
                    {transcription}
                  </p>
                </div>
              )}

              {/* Recording Info */}
              {isRecording && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center mb-4">
                  <div className="text-red-300 font-medium mb-1">Recording in Progress</div>
                  <div className="text-red-200 text-sm">
                    Time: {formatTime(recordingTime)} / 03:00
                  </div>
                  <div className="text-red-200 text-xs mt-2">
                    Recording will auto-stop at 3 minutes
                  </div>
                </div>
              )}

              {/* Tips */}
              {!isRecording && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-blue-300 font-medium mb-2">💡 Interview Tips</h4>
                  <ul className="text-slate-200 text-sm space-y-1">
                    <li>• Use the STAR method (Situation, Task, Action, Result)</li>
                    <li>• Be specific with examples and metrics</li>
                    <li>• Speak clearly and at a moderate pace</li>
                    <li>• Take a moment to think before starting</li>
                    <li>• Make eye contact with the camera</li>
                  </ul>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default InterviewPage;
