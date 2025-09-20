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
 * Flows through: Introduction -> Question 1 -> Answer 1 -> Question 2 -> Answer 2 -> Complete Behavorial
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingNextQuestion, setIsLoadingNextQuestion] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  
  // Questions and current state
  const [questions, setQuestions] = useState<GeneratedQuestions>({ behavioral: [], technical: [] });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Session data from setup
  const [sessionData, setSessionData] = useState<{
    position?: string;
    company?: string;
  }>({});
  
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
  
  // Ref to track feedback data synchronously
  const feedbackDataRef = useRef<Array<{
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
        // Load questions first and get session data
        const currentSessionData = await loadQuestions();
        
        if (!currentSessionData) {
          throw new Error('Failed to load session data');
        }

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

        // Auto-start interview after everything is loaded, passing session data
        setTimeout(() => {
          handleStartInterview(currentSessionData);
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
      
      // Add hardcoded technical questions
      const technicalQuestions = [
        {
          id: 'tech_1',
          question: 'Implement a function that finds the two numbers in an array that add up to a specific target. Explain your approach and analyze the time complexity.',
          category: 'behavioral' as const, // Keep same type for simplicity
          difficulty: 'medium' as const,
          tags: ['algorithm', 'coding']
        },
        {
          id: 'tech_2',
          question: 'Design a simple URL shortener service like bit.ly. Explain your database schema, API design, and how you would handle scaling to millions of URLs.',
          category: 'behavioral' as const, // Keep same type for simplicity
          difficulty: 'hard' as const,
          tags: ['system-design', 'architecture']
        }
      ];
      
      const questionsWithTechnical = {
        behavioral: loadedQuestions.behavioral,
        technical: technicalQuestions
      };
      
      setQuestions(questionsWithTechnical);
      
      // Load session data (position and company) - store in a variable for immediate use
      const currentSessionData = {
        position: session.position || undefined,
        company: session.company || undefined
      };
      setSessionData(currentSessionData);
      
      // Log questions for debugging
      console.group('🎯 Interview Questions Loaded');
      console.log('📋 Session ID:', interviewService.getSessionId());
      console.log('🏢 Position:', session.position || 'Not specified');
      console.log('🏭 Company:', session.company || 'Not specified');
      console.log('📊 Total Questions Available:', questionsWithTechnical.behavioral.length + questionsWithTechnical.technical.length);
      
      // Log all questions
      console.log('🧠 Behavioral Questions:');
      questionsWithTechnical.behavioral.forEach((q, index) => {
        console.log(`  ${index + 1}. [${q.difficulty.toUpperCase()}] ${q.question}`);
        console.log(`     Tags: ${q.tags.join(', ')}`);
      });
      
      console.log('🔧 Technical Questions:');
      questionsWithTechnical.technical.forEach((q, index) => {
        console.log(`  ${index + 3}. [${q.difficulty.toUpperCase()}] ${q.question.substring(0, 100)}...`);
        console.log(`     Tags: ${q.tags.join(', ')}`);
      });
      console.groupEnd();
      
      setSessionStartTime(new Date());
      
      // Return session data for immediate use
      return currentSessionData;
      
    } catch (err) {
      console.error('Failed to load questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load interview questions');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start the complete interview flow
   */
  const handleStartInterview = async (currentSessionData?: { position?: string; company?: string }) => {
    // Prevent multiple calls using both state and ref guards
    if (hasStarted || isPlayingIntro || introPlayedRef.current) {
      console.log('⚠️ Interview already started or intro already playing');
      return;
    }

    // Use passed session data or fall back to state
    const dataToUse = currentSessionData || sessionData;

    if (videoRecorderRef.current && videoRecorderRef.current.state === 'inactive') {
      setHasStarted(true);
      setIsPlayingIntro(true);
      introPlayedRef.current = true;
      
      try {
        // Generate and play introduction
        console.log('🎬 Starting interview with introduction...');
        console.log(`🏢 Position: ${dataToUse.position || 'Not specified'}`);
        console.log(`🏭 Company: ${dataToUse.company || 'Not specified'}`);

        const introResponse = await ttsService.generateIntroduction(
          dataToUse.position || 'the position you are applying for',
          dataToUse.company || 'your target company',
          'Ace AI' // ai name
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
   * Play the current question (behavioral or technical)
   */
  const playCurrentQuestion = async () => {
    console.log('🎯 Playing question', currentQuestionIndex + 1);
    console.log('🔍 Debug - currentQuestionIndex:', currentQuestionIndex);

    // Simple: 0-1 = behavioral, 2-3 = technical
    let currentQuestion;
    if (currentQuestionIndex < 2) {
      currentQuestion = questions.behavioral[currentQuestionIndex];
    } else {
      currentQuestion = questions.technical[currentQuestionIndex - 2];
    }

    if (!currentQuestion) { 
      console.log('❌ Current question is undefined at index:', currentQuestionIndex);
      return;
    }

    console.log('🔍 Debug - Selected question:', {
      index: currentQuestionIndex,
      id: currentQuestion.id,
      question: currentQuestion.question.substring(0, 100) + '...'
    });

    try {
      setInterviewStarted(true);
      setIsLoadingNextQuestion(false);
      setIsProcessing(false);
      setIsPlayingQuestion(true);
      
      console.log(`🎤 Playing question ${currentQuestionIndex + 1}: ${currentQuestion.question}`);
      const questionResponse = await ttsService.askQuestion(currentQuestion.question);
      
      console.log('🔊 Playing question audio...');
      await ttsService.playAudio(questionResponse.audioContent);
      console.log('✅ Question completed, auto-starting recording...');
      
      setIsPlayingQuestion(false);
      startRecording();
      
    } catch (error) {
      console.error('❌ Error playing question:', error);
      setIsPlayingQuestion(false);
      setIsLoadingNextQuestion(false);
      setIsProcessing(false);
    }
  };

  /**
   * Play question at specific index via TTS
   */
  const playQuestionAtIndex = async (questionIndex: number) => {
    console.log('🎯 Playing question at index', questionIndex + 1);
    console.log('🔍 Debug - questionIndex:', questionIndex);

    // Simple: 0-1 = behavioral, 2-3 = technical
    let targetQuestion;
    if (questionIndex < 2) {
      targetQuestion = questions.behavioral[questionIndex];
    } else {
      targetQuestion = questions.technical[questionIndex - 2];
    }

    if (!targetQuestion) {
      console.log('❌ Target question is undefined at index:', questionIndex);
      return;
    }

    console.log('🔍 Debug - Selected question:', {
      index: questionIndex,
      id: targetQuestion.id,
      question: targetQuestion.question.substring(0, 100) + '...'
    });

    try {
      setIsLoadingNextQuestion(false);
      setIsProcessing(false);
      setIsPlayingQuestion(true);
      
      console.log(`🎤 Playing question ${questionIndex + 1}: ${targetQuestion.question}`);
      const questionResponse = await ttsService.askQuestion(targetQuestion.question);
      
      console.log('🔊 Playing question audio...');
      await ttsService.playAudio(questionResponse.audioContent);
      console.log('✅ Question completed, auto-starting recording...');
      
      setIsPlayingQuestion(false);
      startRecording();
      
    } catch (error) {
      console.error('❌ Error playing question:', error);
      setIsPlayingQuestion(false);
      setIsLoadingNextQuestion(false);
      setIsProcessing(false);
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
    setIsProcessing(true);
    
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

    // Get current question - simple logic
    let currentQuestion;
    if (currentQuestionIndex < 2) {
      currentQuestion = questions.behavioral[currentQuestionIndex];
    } else {
      currentQuestion = questions.technical[currentQuestionIndex - 2];
    }
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

    // Store the question data with feedback (if any) - use functional update to ensure latest state
    const questionData = {
      questionIndex: currentQuestionIndex,
      question: currentQuestion?.question || '',
      answer: transcription || '',
      feedback: feedbackResult
    };

    // Update both state and ref for immediate access
    feedbackDataRef.current = [...feedbackDataRef.current, questionData];

    setFeedbackData(prev => {
      const newData = [...prev, questionData];
      console.log('📋 Updated feedback data:', newData);
      console.log('📊 Total feedback items now:', newData.length);
      return newData;
    });

    console.log('📊 Current state feedback items:', feedbackData.length);
    console.log('📊 Current ref feedback items:', feedbackDataRef.current.length);

    // Move to next question or complete interview automatically
    // Now we have 4 total questions: 0,1,2,3
    if (currentQuestionIndex < 3) {
      console.log(`➡️ Auto-moving to question ${currentQuestionIndex + 2}`);
      setIsProcessing(false);
      handleNextQuestion();
    } else {
      console.log('🎉 Interview completed!');
      console.log('📊 Final ref feedback data length:', feedbackDataRef.current.length);
      console.log('📊 Final state feedback data length:', feedbackData.length);
      setTimeout(() => {
        handleCompleteInterviewWithData();
      }, 1000);
    }
  };

  /**
   * Move to next question
   */
  const handleNextQuestion = async () => {
    const nextIndex = currentQuestionIndex + 1;
    console.log(`➡️ Moving to question ${nextIndex + 1}`);

    setTranscription('');
    setShowTranscription(false);
    
    // Reset states - keep isLoadingNextQuestion true to prevent showing "Ready" state
    setIsPlayingQuestion(false);
    setIsRecording(false);
    setIsProcessing(false);
    setIsLoadingNextQuestion(true);
    
    // Update index and start next question immediately
    setCurrentQuestionIndex(nextIndex);
    setIsLoadingNextQuestion(false);
    playQuestionAtIndex(nextIndex);
  };

  /**
   * Complete the interview and navigate to results using ref data
   */
  const handleCompleteInterviewWithData = () => {
    const endTime = new Date();
    const duration = sessionStartTime ? Math.round((endTime.getTime() - sessionStartTime.getTime()) / 1000 / 60) : 0;
    
    // Use ref data which is immediately available
    const finalFeedbackData = feedbackDataRef.current;
    
    console.log('🎯 Interview Session Summary:');
    console.log('⏱️ Duration:', `${duration} minutes`);
    console.log('✅ Questions Answered:', answeredQuestions.size);
    console.log('📊 Total Questions Asked:', totalQuestionsToAsk);
    console.log('📋 Final Feedback Data (from ref):', finalFeedbackData);
    console.log('📊 Number of feedback items (from ref):', finalFeedbackData.length);
    
    // Log each feedback item for debugging
    finalFeedbackData.forEach((item, index) => {
      console.log(`Question ${index + 1}:`, {
        questionIndex: item.questionIndex,
        question: item.question.substring(0, 50) + '...',
        answerLength: item.answer.length,
        hasFeedback: !!item.feedback
      });
    });
    
    // Navigate to feedback page with all collected data from ref
    navigate('/interview/feedback', { 
      state: { 
        duration,
        questionsAnswered: answeredQuestions.size,
        totalQuestions: totalQuestionsToAsk,
        feedbackData: finalFeedbackData, // Use ref data
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
          <p className="text-white">Loading your mock interview...</p>
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

  // Get total questions (2 behavioral + 2 technical = 4)
  const totalQuestionsToAsk = 4;

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
              Ace AI Mock Interview
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
            <span>Mock Interview</span>
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
                     isProcessing ? 'Processing your response...' :
                     isLoadingNextQuestion ? 'Preparing next question...' :
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
                ) : introComplete && !interviewStarted && !isPlayingQuestion && !isRecording && !isProcessing && !isLoadingNextQuestion ? (
                  // Ready to start interview (only show once)
                  <div className="bg-slate-700/50 rounded-lg p-6 mb-6 flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-4">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <Mic className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Ready to Begin</h3>
                      <p className="text-slate-400 text-sm">Click the button below to start your mock interview</p>
                    </div>
                  </div>
                ) : isProcessing ? (
                  // Processing answer
                  <div className="bg-slate-700/50 rounded-lg p-6 mb-6 flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-pulse mb-4">
                        <div className="w-16 h-16 bg-yellow-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <div className="w-8 h-8 bg-yellow-500 rounded-full"></div>
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Processing Your Answer</h3>
                      <p className="text-slate-400 text-sm">Analyzing response and generating feedback...</p>
                    </div>
                  </div>
                ) : isLoadingNextQuestion ? (
                  // Loading next question
                  <div className="bg-slate-700/50 rounded-lg p-6 mb-6 flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-pulse mb-4">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Preparing Next Question</h3>
                      <p className="text-slate-400 text-sm">Loading next question...</p>
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
                      <h3 className="text-lg font-medium text-white mb-2">Question {currentQuestionIndex + 1}</h3>
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
                          {currentQuestionIndex >= 1 ? (
                            <CheckCircle className="w-8 h-8 text-green-500" />
                          ) : (
                            <div className="w-8 h-8 bg-yellow-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        {currentQuestionIndex >= 1 ? 'Interview Complete!' : 'Processing Final Answer...'}
                      </h3>
                      <p className="text-slate-400">
                        {currentQuestionIndex >= 1 ? 'Preparing your detailed feedback...' : 'Analyzing your response...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {introComplete && !interviewStarted && !isPlayingQuestion && !isRecording && !isProcessing && !isLoadingNextQuestion ? (
                    <button
                      onClick={playCurrentQuestion}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      Start Interview
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