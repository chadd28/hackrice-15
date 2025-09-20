import { apiPost, apiGet } from './apiUtils';

/**
 * Multi-Modal Sentiment Analysis Service
 * 
 * Frontend service for capturing and analyzing multiple data streams:
 * - Audio recording and processing
 * - Video frame capture for facial analysis
 * - Text transcription and sentiment analysis
 * 
 * Provides real-time feedback on interview performance
 */

// Simplified type definitions for bullet point format
export interface InterviewPresenceResult {
  passion: string[];
  eyeContact: string[];
  gestures: string[];
  smile: string[];
  engagement: string[];
}

export interface MultiModalAnalysisResult {
  strengths: string[];
  areasForImprovement: string[];
  suggestions: string[];
  presentationStrengths: string[];
  presentationWeaknesses: string[];
  timestamp: string;
}

export interface AnalysisRequest {
  audioContent?: string;
  imageData?: string;
  transcriptText?: string;
}

/**
 * Captures video frame from video element for facial analysis
 */
export const captureVideoFrame = (videoElement: HTMLVideoElement): string | null => {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      console.error('Failed to get canvas context');
      return null;
    }

    // Set canvas dimensions to match video
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    
    // Draw current video frame to canvas
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to base64 image data
    const imageData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    return imageData;
  } catch (error) {
    console.error('Error capturing video frame:', error);
    return null;
  }
};

/**
 * Converts audio blob to base64 string
 */
export const audioToBase64 = (audioBlob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1]; // Remove data:audio/webm;base64, prefix
      resolve(base64);
    };
    
    reader.onerror = (error) => {
      console.error('Error converting audio to base64:', error);
      reject(error);
    };
    
    reader.readAsDataURL(audioBlob);
  });
};

/**
 * Performs multi-modal sentiment analysis
 */
export const analyzeMultiModal = async (
  request: AnalysisRequest
): Promise<MultiModalAnalysisResult> => {
  try {
    console.log('Starting multi-modal analysis...', {
      hasAudio: !!request.audioContent,
      hasImage: !!request.imageData,
      hasText: !!request.transcriptText
    });

    const response = await apiPost('/api/multi-modal/analyze', request, {
      requireAuth: true
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `HTTP ${response.status}: ${response.statusText}` 
      }));
      throw new Error(errorData.message || 'Multi-modal analysis failed');
    }

    const data = await response.json();
    console.log('Multi-modal analysis completed:', data);
    
    return data.analysis;
  } catch (error) {
    console.error('Multi-modal analysis error:', error);
    throw error;
  }
};

/**
 * Tests the multi-modal analysis system setup
 */
export const testMultiModalSetup = async (): Promise<{
  systemReady: boolean;
  apiKeysConfigured: Record<string, boolean>;
  features: Record<string, boolean>;
}> => {
  try {
    const response = await apiGet('/api/multi-modal/test');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Multi-modal setup test error:', error);
    throw error;
  }
};

/**
 * Real-time analysis manager for continuous monitoring
 */
export class RealTimeAnalyzer {
  private videoElement: HTMLVideoElement | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private analysisInterval: number | null = null;
  private onAnalysis: ((result: MultiModalAnalysisResult) => void) | null = null;
  
  /**
   * Initialize the real-time analyzer
   */
  constructor(
    videoElement: HTMLVideoElement,
    onAnalysisCallback: (result: MultiModalAnalysisResult) => void
  ) {
    this.videoElement = videoElement;
    this.onAnalysis = onAnalysisCallback;
  }

  /**
   * Start real-time analysis
   */
  async startAnalysis(intervalSeconds: number = 10): Promise<void> {
    try {
      // Get user media for audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });

      // Setup media recorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.processAnalysis();
      };

      // Start periodic analysis
      this.analysisInterval = window.setInterval(() => {
        this.captureAndAnalyze();
      }, intervalSeconds * 1000);

      console.log(`Real-time analysis started (interval: ${intervalSeconds}s)`);
    } catch (error) {
      console.error('Failed to start real-time analysis:', error);
      throw error;
    }
  }

  /**
   * Capture current state and perform analysis
   */
  private async captureAndAnalyze(): Promise<void> {
    try {
      // Start recording audio chunk
      if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
        this.audioChunks = [];
        this.mediaRecorder.start();
        
        // Record for 3 seconds
        setTimeout(() => {
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error during capture and analyze:', error);
    }
  }

  /**
   * Process captured data and perform analysis
   */
  private async processAnalysis(): Promise<void> {
    try {
      if (!this.videoElement || !this.onAnalysis) return;

      // Capture video frame
      const imageData = captureVideoFrame(this.videoElement);
      
      // Process audio
      let audioContent: string | undefined;
      if (this.audioChunks.length > 0) {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        audioContent = await audioToBase64(audioBlob);
      }

      // Perform analysis if we have data
      if (imageData || audioContent) {
        const analysisRequest: AnalysisRequest = {
          audioContent,
          imageData: imageData || undefined,
          // Note: transcriptText would come from STT service integration
        };

        const result = await analyzeMultiModal(analysisRequest);
        this.onAnalysis(result);
      }
    } catch (error) {
      console.error('Error processing analysis:', error);
    }
  }

  /**
   * Stop real-time analysis
   */
  stopAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }

    // Stop media streams
    if (this.mediaRecorder && this.mediaRecorder.stream) {
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    console.log('Real-time analysis stopped');
  }
}

/**
 * Export all functions and classes
 */
export default {
  analyzeMultiModal,
  testMultiModalSetup,
  captureVideoFrame,
  audioToBase64,
  RealTimeAnalyzer
};