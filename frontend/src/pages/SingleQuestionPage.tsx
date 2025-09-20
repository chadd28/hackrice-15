import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mic, ArrowLeft, Square } from 'lucide-react';
import { ttsService } from '../services/ttsService';
import { sttService } from '../services/sttService';
import { videoService } from '../services/videoService';
import { behavGraderService, type GraderFeedback } from '../services/behavGraderService';
import { captureVideoFrame, audioToBase64 } from '../services/multiModalService';

function SingleQuestionPage(): React.ReactElement {
  const [isRecording, setIsRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlayingIntro, setIsPlayingIntro] = useState(false);
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);
  const [isReadyToAnswer, setIsReadyToAnswer] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [graderFeedback, setGraderFeedback] = useState<GraderFeedback | null>(null);
  const [showTranscription, setShowTranscription] = useState(false);
  
  const audioChunks = useRef<Blob[]>([]);
  const audioRecorder = useRef<MediaRecorder | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunkedRecordingRef = useRef<{ stopRecording: () => void } | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Initialize webcam and video recorder
  useEffect(() => {
    const initWebcam = async () => {
      try {
        // Initialize camera using videoService
        const mediaStream = await videoService.initializeCamera({
          video: true,
          audio: true
        });
        
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
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

      } catch (err) {
        console.error('Error accessing webcam:', err);
      }
    };

    initWebcam();

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

  const handleStartAnswer = async () => {
    if (videoRecorderRef.current && videoRecorderRef.current.state === 'inactive') {
      setHasStarted(true);
      setIsPlayingIntro(true);
      
      try {
        // Generate and play introduction
        console.log('Generating introduction...');
        const introResponse = await ttsService.generateIntroduction(
          'Software Engineer Intern',
          'Google',
          'John Doe'
        );
        
        console.log('Playing introduction audio...');
        await ttsService.playAudio(introResponse.audioContent);
        console.log('Introduction completed');
        
        // Now play the behavioral question
        setIsPlayingIntro(false);
        setIsPlayingQuestion(true);
        
        console.log('Generating question audio...');
        const questionResponse = await ttsService.askQuestion(sampleQuestion);
        
        console.log('Playing question audio...');
        await ttsService.playAudio(questionResponse.audioContent);
        console.log('Question completed, starting recording...');
        
      } catch (error) {
        console.error('Error playing introduction or question:', error);
        // Continue with recording even if TTS fails
      }

      // Start recording after introduction and question
      setIsPlayingQuestion(false);
      setIsReadyToAnswer(true);
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      setIsRecording(true);
      setRecordingTime(0);
      setTranscription(''); // Reset previous transcription
      setShowTranscription(false); // Hide transcription during recording
      
      // Check MediaRecorder state before starting
      console.log('Video recorder state:', videoRecorderRef.current?.state);
      
      // Start video recording
      if (videoRecorderRef.current && videoRecorderRef.current.state === 'inactive') {
        videoRecorderRef.current.start();
        console.log('Started video recording');
      }

      // Start timer immediately
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop recording after 3 minutes (180 seconds)
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
            // Only log important status changes, not every update
            if (type === 'error' || type === 'info') {
              console.log(`Live transcription status: ${message} (${type})`);
            }
            setIsTranscribing(type === 'loading');
          },
          (transcript, isFinal) => {
            // Only log final transcripts to reduce console spam
            if (isFinal) {
              console.log(`Final transcript:`, transcript);
            }
            // Show live transcription as it happens
            setTranscription(transcript);
            setShowTranscription(true);
          },
          {
            languageCode: 'en-US',
          }
        );

        // Store the stop function
        chunkedRecordingRef.current = liveResult;
        console.log('🎯 Live transcription setup complete');
        
        // Start multi-modal analysis
        console.log('🎯 About to start multi-modal analysis...');
        await startMultiModalAnalysis();
        console.log('🎯 Multi-modal analysis start completed');
      } catch (error) {
        console.error('Error setting up live transcription:', error);
        setIsRecording(false);
        setIsReadyToAnswer(false);
      }
      
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      setIsReadyToAnswer(false);
    }
  };

  const handleStopAnswer = async () => {
    setIsRecording(false);
    setIsReadyToAnswer(false);
    
    // Stop video recording
    if (videoRecorderRef.current && videoRecorderRef.current.state === 'recording') {
      videoRecorderRef.current.stop();
      console.log('Stopped video recording');
    }
    
    // Stop live transcription
    if (chunkedRecordingRef.current) {
      chunkedRecordingRef.current.stopRecording();
      console.log('Stopped live transcription');
    }
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Capture video frame for multimodal analysis
    let videoAnalysisPromise = null;
    if (videoRef.current) {
      try {
        console.log('Capturing video frame for analysis...');
        console.log('Video element dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
        console.log('Video element readyState:', videoRef.current.readyState);
        console.log('Video element currentTime:', videoRef.current.currentTime);
        
        const frameData = captureVideoFrame(videoRef.current);
        if (frameData) {
          console.log('Captured frame data length:', frameData.length);
          console.log('Frame data preview:', frameData.substring(0, 100) + '...');
          
          // Send frame for multimodal analysis
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
          videoAnalysisPromise = fetch(`${backendUrl}/api/multi-modal/analyze`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageData: frameData,
              transcriptText: transcription || ''
            })
          }).then(async res => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            }
            return res.json();
          });
          console.log('Video frame sent for analysis');
        } else {
          console.error('Failed to capture video frame - no data returned');
        }
      } catch (videoErr) {
        console.error('Failed to capture video frame:', videoErr);
      }
    } else {
      console.error('Video element not available for frame capture');
    }

    // Send transcription to grader (transcription is already available)
    if (transcription && transcription.trim()) {
      try {
        console.log('Sending transcript to grader:', transcription);
        
        // Prepare audio and video data for multi-modal analysis
        let audioBase64 = '';
        let imageData = '';
        
        if (audioChunks.current.length > 0) {
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
          audioBase64 = await audioToBase64(audioBlob);
        }
        
        if (videoRef.current) {
          imageData = captureVideoFrame(videoRef.current) || '';
        }
        
        // Wait for both grading and video analysis to complete
        const [gradeResp, videoAnalysis] = await Promise.allSettled([
          behavGraderService.gradeBehavioral(
            sampleQuestion, 
            transcription,
            audioBase64,
            imageData
          ),
          videoAnalysisPromise || Promise.resolve(null)
        ]);
        
        console.log('Grader response:', gradeResp);
<<<<<<< HEAD
        if (videoAnalysis.status === 'fulfilled' && videoAnalysis.value) {
          console.log('Video analysis response:', videoAnalysis.value);
        } else if (videoAnalysis.status === 'rejected') {
          console.error('Video analysis failed:', videoAnalysis.reason);
        }
        
        // Combine results if both are available
        let combinedFeedback: GraderFeedback | null = null;
        if (gradeResp.status === 'fulfilled') {
          combinedFeedback = gradeResp.value.feedback || null;
          
          // Add presentation analysis if available
          if (videoAnalysis.status === 'fulfilled' && videoAnalysis.value?.analysis && combinedFeedback) {
=======
        
        // Wait for video analysis to complete if it was started
        let videoAnalysis = null;
        if (videoAnalysisPromise) {
          try {
            videoAnalysis = { status: 'fulfilled', value: await videoAnalysisPromise };
            console.log('Video analysis response:', videoAnalysis.value);
          } catch (videoErr) {
            videoAnalysis = { status: 'rejected', reason: videoErr };
            console.error('Video analysis failed:', videoAnalysis.reason);
          }
        }
        
        // Combine results if both are available
        let combinedFeedback = null;
        if (gradeResp.success) {
          combinedFeedback = gradeResp.feedback || null;
          
          // Add presentation analysis if available
          if (videoAnalysis && videoAnalysis.status === 'fulfilled' && videoAnalysis.value?.analysis) {
>>>>>>> c91411b (Add files)
            const analysis = videoAnalysis.value.analysis;
            combinedFeedback = {
              ...combinedFeedback,
              presentationStrengths: analysis.presentationStrengths || [],
              presentationWeaknesses: analysis.presentationWeaknesses || [],
              suggestions: [
                ...(combinedFeedback.suggestions || []),
                ...(analysis.suggestions || [])
              ]
            } as GraderFeedback;
          }
        }
        
        setGraderFeedback(combinedFeedback);
      } catch (gErr) {
        console.error('Behavioral grading failed:', gErr);
      }
    } else {
      console.log('No transcription available for grading');
    }
  };

  // Multi-modal analysis functions
  const startMultiModalAnalysis = async () => {
    if (!stream || !videoRef.current) {
      console.warn('Cannot start audio recording: missing stream or video element');
      return;
    }
    
    try {
      console.log('🎯 Starting audio recording for analysis');
      
      // Setup audio recording for analysis
      const audioStream = new MediaStream(stream.getAudioTracks());
      audioRecorder.current = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm'
      });
      
      audioChunks.current = [];
      audioRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
          console.log('🎵 Audio chunk captured:', event.data.size, 'bytes');
        }
      };
      
      audioRecorder.current.start();
      console.log('🎵 Audio recording started');
    } catch (error) {
      console.error('❌ Failed to start audio recording:', error);
    }
  };

  const stopMultiModalAnalysis = async () => {
    if (!audioRecorder.current) {
      console.warn('🎯 Cannot stop audio recording: missing audio recorder');
      return;
    }
    
    try {
      console.log('🎯 Stopping audio recording...');
      
      // Stop audio recording
      if (audioRecorder.current.state === 'recording') {
        audioRecorder.current.stop();
        console.log('🎵 Audio recording stopped');
      }
      
      // Wait a bit for the final data to be available
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('❌ Failed to stop audio recording:', error);
    }
  };

  const sampleQuestion = "Tell me about a time when you had to work with a difficult team member. How did you handle the situation and what was the outcome?";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 font-sans text-white">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Behavioral Question Practice
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isRecording ? 'bg-red-500/20 text-red-300' : 'bg-slate-700 text-slate-300'
            }`}>
              {isRecording ? <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> : <Mic className="w-4 h-4" />}
              {isRecording ? 'Recording' : 'Ready'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-100px)] bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[calc(100vh-140px)]">
          
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
                <p className="text-slate-400 text-sm">Ready to ask your question</p>
              </div>
            </div>

            {/* Question Display */}
            <div className="flex-1 flex flex-col">
              {!hasStarted ? (
                <div className="bg-slate-700/50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-medium text-white mb-4">Behavioral Question:</h3>
                  <p className="text-slate-200 leading-relaxed text-lg">
                    {sampleQuestion}
                  </p>
                </div>
              ) : hasStarted && !isPlayingIntro && !isPlayingQuestion && !isRecording && !isReadyToAnswer ? (
                <div className="bg-slate-700/50 rounded-lg p-6 mb-6 flex-1 overflow-hidden">
                  {graderFeedback ? (
                    <div className="h-full flex flex-col">
                      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">AI</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Interview Feedback</h3>
                          <p className="text-slate-400 text-sm">Analysis of your response</p>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-600/50 rounded-lg">
                          <span className="text-slate-300 font-medium">Overall Score:</span>
                          <span className="text-xl font-bold text-green-400">
                            {graderFeedback.score ? `${graderFeedback.score}/10` : 'None'}
                          </span>
                        </div>
                        
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <h4 className="text-green-300 font-medium mb-2">✅ Strengths</h4>
                          {graderFeedback.strengths ? (
                            Array.isArray(graderFeedback.strengths) ? (
                              graderFeedback.strengths.length > 0 ? (
                                <ul className="text-slate-200 text-sm space-y-1">
                                  {graderFeedback.strengths.map((strength, index) => (
                                    <li key={index}>• {strength}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-slate-400 text-sm italic">None</p>
                              )
                            ) : (
                              graderFeedback.strengths.trim() ? (
                                <p className="text-slate-200 text-sm">{graderFeedback.strengths}</p>
                              ) : (
                                <p className="text-slate-400 text-sm italic">None</p>
                              )
                            )
                          ) : (
                            <p className="text-slate-400 text-sm italic">None</p>
                          )}
                        </div>
                        
                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                          <h4 className="text-orange-300 font-medium mb-2">⚠️ Areas for Improvement</h4>
                          {graderFeedback.areasForImprovement || graderFeedback.weaknesses ? (
                            (() => {
                              const improvements = graderFeedback.areasForImprovement || graderFeedback.weaknesses;
                              return Array.isArray(improvements) ? (
                                improvements.length > 0 ? (
                                  <ul className="text-slate-200 text-sm space-y-1">
                                    {improvements.map((improvement, index) => (
                                      <li key={index}>• {improvement}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-slate-400 text-sm italic">None</p>
                                )
                              ) : (
                                improvements && improvements.trim() ? (
                                  <p className="text-slate-200 text-sm">{improvements}</p>
                                ) : (
                                  <p className="text-slate-400 text-sm italic">None</p>
                                )
                              );
                            })()
                          ) : (
                            <p className="text-slate-400 text-sm italic">None</p>
                          )}
                        </div>

                        {/* Presentation Strengths Section */}
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                          <h4 className="text-emerald-300 font-medium mb-2">🎯 Presentation Strengths</h4>
                          {graderFeedback.presentationStrengths ? (
                            Array.isArray(graderFeedback.presentationStrengths) ? (
                              graderFeedback.presentationStrengths.length > 0 ? (
                                <ul className="text-slate-200 text-sm space-y-1">
                                  {graderFeedback.presentationStrengths.map((strength, index) => (
                                    <li key={index}>• {strength}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-slate-400 text-sm italic">No presentation strengths identified</p>
                              )
                            ) : (
                              graderFeedback.presentationStrengths.trim() ? (
                                <p className="text-slate-200 text-sm">{graderFeedback.presentationStrengths}</p>
                              ) : (
                                <p className="text-slate-400 text-sm italic">No presentation strengths identified</p>
                              )
                            )
                          ) : (
                            <p className="text-slate-400 text-sm italic">No presentation strengths identified</p>
                          )}
                        </div>

                        {/* Presentation Weaknesses Section */}
                        {graderFeedback.presentationWeaknesses && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <h4 className="text-amber-300 font-medium mb-2">📹 Presentation Areas for Improvement</h4>
                            {Array.isArray(graderFeedback.presentationWeaknesses) ? (
                              graderFeedback.presentationWeaknesses.length > 0 ? (
                                <ul className="text-slate-200 text-sm space-y-1">
                                  {graderFeedback.presentationWeaknesses.map((weakness, index) => (
                                    <li key={index}>• {weakness}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-slate-400 text-sm italic">None</p>
                              )
                            ) : (
                              graderFeedback.presentationWeaknesses.trim() ? (
                                <p className="text-slate-200 text-sm">{graderFeedback.presentationWeaknesses}</p>
                              ) : (
                                <p className="text-slate-400 text-sm italic">None</p>
                              )
                            )}
                          </div>
                        )}
                        
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <h4 className="text-blue-300 font-medium mb-2">💡 Suggestions</h4>
                          {graderFeedback.suggestions ? (
                            Array.isArray(graderFeedback.suggestions) ? (
                              graderFeedback.suggestions.length > 0 ? (
                                <ul className="text-slate-200 text-sm space-y-1">
                                  {graderFeedback.suggestions.map((suggestion, index) => (
                                    <li key={index}>• {suggestion}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-slate-400 text-sm italic">None</p>
                              )
                            ) : (
                              graderFeedback.suggestions.trim() ? (
                                <p className="text-slate-200 text-sm">{graderFeedback.suggestions}</p>
                              ) : (
                                <p className="text-slate-400 text-sm italic">None</p>
                              )
                            )
                          ) : (
                            <p className="text-slate-400 text-sm italic">None</p>
                          )}
                        </div>
                        
                        {graderFeedback.raw && !graderFeedback.strengths && (
                          <div className="p-3 bg-slate-600/50 rounded-lg">
                            <h4 className="text-slate-300 font-medium mb-2">📝 AI Feedback</h4>
                            <p className="text-slate-200 text-sm whitespace-pre-wrap">
                              {graderFeedback.raw.trim() || 'None'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-purple-300 text-lg mb-2">🤖 AI is analyzing your response...</p>
                      <p className="text-slate-400 text-sm text-center">This may take a few moments</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-700/50 rounded-lg p-6 mb-6 flex flex-col items-center justify-center min-h-[200px]">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold">AI</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    {isPlayingIntro && (
                      <p className="text-blue-300 text-lg">🎵 Playing introduction...</p>
                    )}
                    {isPlayingQuestion && (
                      <p className="text-purple-300 text-lg">🎤 Asking question...</p>
                    )}
                    {isReadyToAnswer && (
                      <p className="text-green-300 text-lg">Your turn to answer!</p>
                    )}
                  </div>
                </div>
              )}

              {/* Question Controls */}
              <div className="space-y-4">
                {!hasStarted ? (
                  <button
                    onClick={handleStartAnswer}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 py-3 rounded-lg text-white font-medium transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Mic className="w-5 h-5" />
                    Start Question
                  </button>
                ) : hasStarted && !isPlayingIntro && !isPlayingQuestion && !isRecording && !isReadyToAnswer ? (
                  null
                ) : (
                  <div className="space-y-3">
                    {isPlayingIntro ? (
                      <div className="w-full bg-blue-500/20 py-3 rounded-lg text-center">
                        <p className="text-blue-300 text-sm">
                          🎵 Playing introduction...
                        </p>
                        <p className="text-blue-400 text-xs mt-1">
                          Question will follow
                        </p>
                      </div>
                    ) : isPlayingQuestion ? (
                      <div className="w-full bg-purple-500/20 py-3 rounded-lg text-center">
                        <p className="text-purple-300 text-sm">
                          🎤 Playing question...
                        </p>
                        <p className="text-purple-400 text-xs mt-1">
                          Recording will start after question
                        </p>
                      </div>
                    ) : (
                      <div className="w-full bg-slate-700/50 py-3 rounded-lg text-center">
                        <p className="text-slate-300 text-sm">
                          Recording will automatically stop after 3 minutes
                        </p>
                        {isRecording && (
                          <p className="text-slate-400 text-xs mt-1">
                            Time remaining: {videoService.formatTime(180 - recordingTime)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {isRecording && (
                      <button
                        onClick={handleStopAnswer}
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 py-3 rounded-lg text-white font-medium transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <Square className="w-5 h-5" />
                        Stop Recording Early
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
              <h4 className="text-sm font-medium text-slate-300 mb-2">💡 Tips for Success:</h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Use the STAR method (Situation, Task, Action, Result)</li>
                <li>• Be specific and provide concrete examples</li>
                <li>• You have 3 minutes to answer - recording stops automatically</li>
                <li>• Aim for 1-2 minutes per response for best practice</li>
              </ul>
            </div>
          </motion.div>

          {/* Recording Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Your Response</h2>
                  <p className="text-slate-400 text-sm">Record your answer here</p>
                </div>
              </div>
              
              {/* Recording indicator */}
              {isRecording && (
                <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-300 text-sm font-medium">REC</span>
                </div>
              )}
            </div>

            {/* Video Preview */}
            <div className="flex-1 bg-slate-900 rounded-lg overflow-hidden relative min-h-[400px] max-h-[400px]">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Overlay when not started */}
              {!hasStarted && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">Click "Start Question" to begin</p>
                  </div>
                </div>
              )}

              {/* Recording timer */}
              {isRecording && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-mono">
                  {videoService.formatTime(recordingTime)}
                </div>
              )}
            </div>

            {/* Recording Status */}
            <div className="mt-4 p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Status:</span>
                <span className={`font-medium ${
                  isRecording ? 'text-red-400' : 
                  hasStarted ? 'text-yellow-400' : 'text-slate-400'
                }`}>
                  {isRecording ? 'Recording in progress...' : 
                   hasStarted ? 'Recording stopped' : 'Ready to record'}
                </span>
              </div>
              
              {/* Transcription Section - Show during and after recording */}
              {hasStarted && (
                <div className="mt-3">
                  <div className="border-t border-slate-600 pt-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-300">
                        {isRecording ? 'Audio Recording:' : 'Your Response:'}
                      </span>
                      {isTranscribing && (
                        <span className="text-blue-400 text-xs">
                          {isRecording ? 'Recording audio with live transcription...' : 'Processing final transcript...'}
                        </span>
                      )}
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 min-h-[60px] max-h-[200px] overflow-y-auto">
                      {isRecording ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                          Recording audio... (Transcription will appear when finished)
                        </div>
                      ) : isTranscribing && !showTranscription ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          Processing your response...
                        </div>
                      ) : showTranscription && transcription ? (
                        <div className="text-slate-200 text-sm leading-relaxed">
                          <p>"{transcription}"</p>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm italic">
                          {hasStarted ? 'Your transcribed response will appear here after recording' : 'Start recording to capture your response'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
        </div>
      </main>
    </div>
  );
}

export default SingleQuestionPage;
