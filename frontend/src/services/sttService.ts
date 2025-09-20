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
            const base64Audio = await sttService.blobToBase64(audioBlob);
            
            const defaultConfig: AudioConfig = {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 48000,
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
  }
};
