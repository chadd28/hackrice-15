const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/stt`;

/**
 * Response interface for STT API calls
 */
interface STTResponse {
  message: string;
  transcript: string;
  confidence?: number;
  results?: any[];
}

/**
 * Audio configuration options for speech recognition
 */
interface AudioConfig {
  encoding?: string;
  sampleRateHertz?: number;
  languageCode?: string;
  audioChannelCount?: number;
  enableAutomaticPunctuation?: boolean;
  maxAlternatives?: number;
  profanityFilter?: boolean;
}

/**
 * Speech-to-Text Service
 * 
 * This service handles all speech-to-text functionality by calling backend endpoints
 * that interface with Google's Speech-to-Text API. The backend keeps API keys secure
 * and provides a clean interface for audio transcription.
 */
export const sttService = {
  /**
   * Transcribe Audio Content
   * 
   * Converts base64-encoded audio data to text using Google's Speech-to-Text API.
   * This is the core transcription function that processes pre-recorded audio.
   * 
   * @param audioContent - Base64-encoded audio data (without data URI prefix)
   * @param config - Optional audio configuration (encoding, sample rate, language)
   * @returns Promise<STTResponse> - Contains transcript, confidence score, and raw results
   * 
   * @example
   * ```typescript
   * const base64Audio = "UklGRnoGAABXQVZFZm10IBAAAAABAAEA...";
   * const result = await sttService.transcribeAudio(base64Audio, {
   *   encoding: 'WEBM_OPUS',
   *   sampleRateHertz: 48000,
   *   languageCode: 'en-US'
   * });
   * console.log(result.transcript); // "Hello, this is the transcribed text"
   * console.log(result.confidence); // 0.95 (confidence score)
   * ```
   */
  transcribeAudio: async (audioContent: string, config?: AudioConfig): Promise<STTResponse> => {
    const res = await fetch(`${API_URL}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioContent, config }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'STT transcription failed');
    }

    const data = await res.json();
    return data;
  },

  /**
   * Transcribe Audio Chunk
   * 
   * Converts a single 30-second audio chunk to text using Google's Speech-to-Text API.
   * Used for real-time chunked transcription.
   * 
   * @param audioContent - Base64-encoded audio data (without data URI prefix)
   * @param chunkIndex - Index of the chunk for tracking
   * @param config - Optional audio configuration (encoding, sample rate, language)
   * @returns Promise<STTResponse> - Contains transcript, confidence score, and chunk info
   */
  transcribeChunk: async (audioContent: string, chunkIndex: number, config?: AudioConfig): Promise<STTResponse> => {
    const res = await fetch(`${API_URL}/transcribe-chunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioContent, chunkIndex, config }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Chunk transcription failed');
    }

    const data = await res.json();
    return data;
  },

  /**
   * Test STT Configuration
   * 
   * Verifies that the backend STT service is properly configured and accessible.
   * Useful for debugging connection issues or API key problems.
   * 
   * @returns Promise<any> - Contains configuration status and API details
   * 
   * @example
   * ```typescript
   * try {
   *   const test = await sttService.testSTT();
   *   console.log("STT service is working:", test.message);
   *   console.log("API key present:", test.apiKeyPresent);
   * } catch (error) {
   *   console.error("STT service error:", error.message);
   * }
   * ```
   */
  testSTT: async (): Promise<any> => {
    const res = await fetch(`${API_URL}/test`, {
      method: 'GET',
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'STT test failed');
    }

    const data = await res.json();
    return data;
  },

  /**
   * Convert Blob to Base64
   * 
   * Utility function that converts an audio Blob (from MediaRecorder) to a base64 string
   * suitable for sending to the transcription API. Removes the data URI prefix.
   * 
   * @param blob - Audio blob from MediaRecorder or file input
   * @returns Promise<string> - Base64-encoded audio data (without data URI prefix)
   * 
   * @example
   * ```typescript
   * const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
   * const base64Audio = await sttService.blobToBase64(audioBlob);
   * console.log(base64Audio); // "UklGRnoGAABXQVZFZm10IBAAAAABAAEA..."
   * ```
   */
  blobToBase64: (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = (err) => reject(err);
    });
  },

  // Helper function to record audio and transcribe
  recordAndTranscribe: async (
    onStatusUpdate?: (message: string, type: 'info' | 'recording' | 'loading' | 'success' | 'error' | 'warning') => void,
    config?: AudioConfig
  ): Promise<STTResponse> => {
    return new Promise(async (resolve, reject) => {
      try {
        onStatusUpdate?.('Requesting microphone access...', 'info');
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          try {
            onStatusUpdate?.('Processing audio...', 'loading');
            
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
            
            // Log audio file size before processing
            console.log(`Audio file size: ${audioBlob.size} bytes (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB)`);
            
            const base64Audio = await sttService.blobToBase64(audioBlob);
            
            const defaultConfig: AudioConfig = {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 16000, // Reduced from 48000 to 16000 for smaller file size
              languageCode: 'en-US',
            };

            const audioConfig = config || defaultConfig;
            const result = await sttService.transcribeAudio(base64Audio, audioConfig);
            
            // Clean up stream
            stream.getTracks().forEach(track => track.stop());
            
            if (result.transcript) {
              onStatusUpdate?.('Transcription successful!', 'success');
            } else {
              onStatusUpdate?.(result.message || 'No speech detected', 'warning');
            }
            
            resolve(result);
          } catch (error) {
            stream.getTracks().forEach(track => track.stop());
            onStatusUpdate?.(`Error: ${(error as Error).message}`, 'error');
            reject(error);
          }
        };

        // Start recording
        onStatusUpdate?.('Recording... Click stop when done', 'recording');
        mediaRecorder.start();

        // Return control functions
        const stopRecording = () => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        };

        // Auto-stop after 30 seconds (optional safety)
        const autoStopTimeout = setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            stopRecording();
            onStatusUpdate?.('Recording stopped automatically after 30 seconds', 'warning');
          }
        }, 30000);

        // Expose stop function for manual control
        (resolve as any).stopRecording = () => {
          clearTimeout(autoStopTimeout);
          stopRecording();
        };

      } catch (error) {
        onStatusUpdate?.(`Error accessing microphone: ${(error as Error).message}`, 'error');
        reject(error);
      }
    });
  },

  // Helper function for live transcription using Web Speech API
  recordAndTranscribeLive: async (
    onStatusUpdate?: (message: string, type: 'info' | 'recording' | 'loading' | 'success' | 'error' | 'warning') => void,
    onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void,
    config?: AudioConfig
  ): Promise<{ stopRecording: () => void }> => {
    return new Promise((resolve, reject) => {
      // Check if browser supports Web Speech API
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Browser does not support speech recognition'));
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      // Configure speech recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = config?.languageCode || 'en-US';
      recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let isRecording = true;

      recognition.onstart = () => {
        console.log('Live speech recognition started');
        onStatusUpdate?.('Recording... (live transcription active)', 'recording');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            console.log('Final transcript chunk:', transcript);
            onTranscriptUpdate?.(finalTranscript.trim(), true);
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Show interim results
        if (interimTranscript) {
          const combinedTranscript = finalTranscript + interimTranscript;
          onTranscriptUpdate?.(combinedTranscript.trim(), false);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        onStatusUpdate?.(`Speech recognition error: ${event.error}`, 'error');
        
        if (event.error === 'no-speech') {
          onStatusUpdate?.('No speech detected, continuing...', 'warning');
        } else {
          reject(new Error(`Speech recognition error: ${event.error}`));
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        if (isRecording) {
          // Restart if we're still supposed to be recording (handles auto-restart)
          try {
            recognition.start();
          } catch (error) {
            console.log('Recognition restart failed:', error);
          }
        } else {
          onStatusUpdate?.('Recording complete!', 'success');
        }
      };

      const stopRecording = () => {
        console.log('Stop live recording called');
        isRecording = false;
        try {
          recognition.stop();
        } catch (error) {
          console.log('Error stopping recognition:', error);
        }
      };

      try {
        recognition.start();
        onStatusUpdate?.('Starting live transcription...', 'info');
        resolve({ stopRecording });
      } catch (error) {
        reject(error);
      }
    });
  },

  // ...existing code...
  recordAndTranscribeChunked: async (
    onStatusUpdate?: (message: string, type: 'info' | 'recording' | 'loading' | 'success' | 'error' | 'warning') => void,
    onTranscriptUpdate?: (transcript: string, chunkIndex: number) => void,
    config?: AudioConfig
  ): Promise<{ fullTranscript: string; stopRecording: () => void }> => {
    onStatusUpdate?.('Requesting microphone access...', 'info');
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    let chunkIndex = 0;
    let fullTranscript = '';
    let isRecording = true;
    let recordingStartTime = Date.now();
    let allAudioChunks: Blob[] = []; // Store all audio data

    const defaultConfig: AudioConfig = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
    };

    const audioConfig = config || defaultConfig;

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        // Always store the audio chunk
        allAudioChunks.push(event.data);
        
        if (isRecording) {
          const currentChunkIndex = chunkIndex++;
          const chunkDuration = (Date.now() - recordingStartTime) / 1000;
          console.log(`Processing chunk ${currentChunkIndex}, size: ${event.data.size} bytes, duration: ${chunkDuration.toFixed(1)}s`);
          
          // Reset timer for next chunk
          recordingStartTime = Date.now();
          
          try {
            onStatusUpdate?.(`Processing chunk ${currentChunkIndex}...`, 'loading');
            
            const base64Audio = await sttService.blobToBase64(event.data);
            console.log(`Chunk ${currentChunkIndex} base64 length: ${base64Audio.length} characters`);
            
            const result = await sttService.transcribeChunk(base64Audio, currentChunkIndex, audioConfig);
            
            if (result.transcript) {
              // Add space if there's already text
              const separator = fullTranscript ? ' ' : '';
              fullTranscript += separator + result.transcript;
              
              console.log(`Chunk ${currentChunkIndex} transcript:`, result.transcript);
              onTranscriptUpdate?.(fullTranscript, currentChunkIndex);
              onStatusUpdate?.(isRecording ? 'Recording... (real-time transcription active)' : 'Processing final chunks...', 'recording');
            } else {
              console.log(`No speech detected in chunk ${currentChunkIndex}`);
            }
          } catch (error) {
            console.error(`Error transcribing chunk ${currentChunkIndex}:`, error);
            onStatusUpdate?.(`Error processing chunk ${currentChunkIndex}`, 'warning');
          }
        }
      }
    };

    mediaRecorder.onstart = () => {
      console.log('Chunked recording started');
      recordingStartTime = Date.now();
      onStatusUpdate?.('Recording... (real-time transcription active)', 'recording');
    };

    mediaRecorder.onstop = async () => {
      console.log('Chunked recording stopped, final transcript:', fullTranscript);
      
      // If no chunks were processed during recording (short recording), process the entire audio
      if (chunkIndex === 0 && allAudioChunks.length > 0) {
        console.log('No chunks were processed during recording, processing entire audio as single chunk...');
        try {
          onStatusUpdate?.('Processing final audio...', 'loading');
          
          const completeAudioBlob = new Blob(allAudioChunks, { type: 'audio/webm;codecs=opus' });
          const base64Audio = await sttService.blobToBase64(completeAudioBlob);
          console.log(`Complete audio base64 length: ${base64Audio.length} characters`);
          
          const result = await sttService.transcribeChunk(base64Audio, 0, audioConfig);
          
          if (result.transcript) {
            fullTranscript = result.transcript;
            console.log(`Final transcript from complete audio:`, result.transcript);
            onTranscriptUpdate?.(fullTranscript, 0);
          }
        } catch (error) {
          console.error('Error transcribing final audio:', error);
        }
      }
      
      stream.getTracks().forEach(track => track.stop());
      onStatusUpdate?.('Recording complete!', 'success');
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      stream.getTracks().forEach(track => track.stop());
      onStatusUpdate?.(`Recording error: ${(event as any).error?.message || 'Unknown error'}`, 'error');
      throw new Error('Recording failed');
    };

    // Return stop function
    const stopRecording = () => {
      console.log('Stop recording called');
      isRecording = false;
      if (mediaRecorder.state !== 'inactive') {
        // Request final data before stopping
        mediaRecorder.requestData();
        mediaRecorder.stop();
      }
    };

    // Start recording with 5-second chunks instead of 10 seconds
    console.log('Starting MediaRecorder with 5-second chunks...');
    mediaRecorder.start(5000); // Request data every 5 seconds

    // Return the control object immediately
    return { fullTranscript: '', stopRecording };
  },
};
