const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/tts`;

interface TTSResponse {
  message: string;
  audioContent: string;
  introText?: string;
}

export const ttsService = {
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
