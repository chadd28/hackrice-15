import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mic, ArrowLeft, Square } from 'lucide-react';
import { ttsService } from '../services/ttsService';

function SingleQuestionPage(): React.ReactElement {
  const [isRecording, setIsRecording] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlayingIntro, setIsPlayingIntro] = useState(false);
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingDataRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Initialize webcam and media recorder
  useEffect(() => {
    const initWebcam = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        // Initialize MediaRecorder
        const mediaRecorder = new MediaRecorder(mediaStream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordingDataRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          console.log('Recording stopped, data collected');
          recordingDataRef.current = []; // Reset for next recording
        };

      } catch (err) {
        console.error('Error accessing webcam:', err);
      }
    };

    initWebcam();

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleStartAnswer = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
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
      setIsRecording(true);
      setRecordingTime(0);
      mediaRecorderRef.current.start();
      
      // Start timer
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
      
      console.log('Started recording');
    }
  };

  const handleStopAnswer = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setIsRecording(false);
      mediaRecorderRef.current.stop();
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      console.log('Stopped recording');
    }
  };

  // Format timer display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
          
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
            <div className="flex-1 flex flex-col justify-center">
              {!hasStarted || (!isPlayingIntro && !isPlayingQuestion && !isRecording) ? (
                <div className="bg-slate-700/50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-medium text-white mb-4">Behavioral Question:</h3>
                  <p className="text-slate-200 leading-relaxed text-lg">
                    {sampleQuestion}
                  </p>
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
                    {isRecording && (
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
                            Time remaining: {formatTime(180 - recordingTime)}
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
            <div className="flex-1 bg-slate-900 rounded-lg overflow-hidden relative">
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
                  {formatTime(recordingTime)}
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
              
              {hasStarted && !isRecording && (
                <div className="mt-3">
                  <button className="w-full bg-green-600 hover:bg-green-700 py-2 rounded text-white text-sm transition-colors">
                    Get AI Feedback
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default SingleQuestionPage;
