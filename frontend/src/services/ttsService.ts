const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/tts`;

/**
 * Response interface for TTS API calls
 */
interface TTSResponse {
  message: string;
  audioContent: string;
  introText?: string;
}

/**
 * Text-to-Speech Service
 * 
 * This service handles all text-to-speech functionality by calling backend endpoints
 * that interface with Google's Text-to-Speech API. The backend keeps API keys secure
 * and provides a clean interface for audio generation.
 */
export const ttsService = {
  /**
   * Generate Introduction Audio
   * 
   * Creates a personalized interview introduction with the interviewer's details.
   * This is typically used at the start of an interview session.
   * 
   * @param position - The job position being interviewed for (e.g., "Software Engineer")
   * @param company - The company name (e.g., "Google")
   * @param interviewerName - The interviewer's name (e.g., "John Doe")
   * @returns Promise<TTSResponse> - Contains base64 audio content and introduction text
   * 
   * @example
   * ```typescript
   * const intro = await ttsService.generateIntroduction(
   *   "Software Engineer", 
   *   "Google", 
   *   "Sarah Wilson"
   * );
   * console.log(intro.introText); // Generated introduction text
   * await ttsService.playAudio(intro.audioContent); // Play the audio
   * ```
   */
  generateIntroduction: async (position: string, company: string, interviewerName: string): Promise<TTSResponse> => {
    const res = await fetch(`${API_URL}/introduction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position, company, interviewerName }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'TTS generation failed');
    }

    const data = await res.json();
    return data;
  },

  /**
   * Test TTS Configuration
   * 
   * Verifies that the backend TTS service is properly configured and accessible.
   * Useful for debugging connection issues or API key problems.
   * 
   * @returns Promise<TTSResponse> - Contains test audio content with a sample message
   * 
   * @example
   * ```typescript
   * try {
   *   const test = await ttsService.testTTS();
   *   console.log("TTS service is working:", test.message);
   *   await ttsService.playAudio(test.audioContent);
   * } catch (error) {
   *   console.error("TTS service error:", error.message);
   * }
   * ```
   */
  testTTS: async (): Promise<TTSResponse> => {
    const res = await fetch(`${API_URL}/test`, {
      method: 'GET',
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'TTS test failed');
    }

    const data = await res.json();
    return data;
  },

  askQuestion: async (question: string): Promise<TTSResponse> => {
    const res = await fetch(`${API_URL}/question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Question TTS generation failed');
    }

    const data = await res.json();
    return data;
  },

  // Helper function to play audio from base64 content
  playAudio: (audioContent: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // Convert base64 to blob
        const audioData = atob(audioContent);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const view = new Uint8Array(arrayBuffer);
        
        for (let i = 0; i < audioData.length; i++) {
          view[i] = audioData.charCodeAt(i);
        }
        
        const blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };
        
        audio.play();
      } catch (error) {
        reject(error);
      }
    });
  }
};
