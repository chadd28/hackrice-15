/**
 * Video Service
 * 
 * This service handles all video and audio recording functionality,
 * including MediaRecorder setup, video recording, and audio extraction.
 */

/**
 * Configuration options for video recording
 */
interface VideoRecordingConfig {
  video: boolean;
  audio: boolean;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
}

/**
 * Recording result containing video data and metadata
 */
interface RecordingResult {
  videoBlob: Blob;
  duration: number;
  size: number;
}

/**
 * Audio extraction result
 */
interface AudioResult {
  audioBlob: Blob;
  size: number;
}

export const videoService = {
  /**
   * Initialize webcam and get media stream
   */
  async initializeCamera(config: VideoRecordingConfig = { video: true, audio: true }): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(config);
      console.log('Camera initialized successfully');
      return stream;
    } catch (error) {
      console.error('Failed to initialize camera:', error);
      throw new Error('Camera access denied or not available');
    }
  },

  /**
   * Create dual MediaRecorders for video and audio
   */
  createDualRecorders(
    stream: MediaStream,
    onDataAvailable: (videoEvent: BlobEvent, audioEvent: BlobEvent) => void,
    onStop: (videoResult: RecordingResult, audioResult: AudioResult) => void
  ): { videoRecorder: MediaRecorder; audioRecorder: MediaRecorder } {
    let videoChunks: Blob[] = [];
    let audioChunks: Blob[] = [];
    let startTime: number;

    // Create video-only stream
    const videoStream = new MediaStream(stream.getVideoTracks());
    const videoRecorder = new MediaRecorder(videoStream, {
      mimeType: 'video/webm;codecs=vp9'
    });

    // Create audio-only stream with optimized settings for STT
    const audioStream = new MediaStream(stream.getAudioTracks());
    const audioRecorder = new MediaRecorder(audioStream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 64000 // Lower bitrate for smaller file size while maintaining quality for STT
    });

    // Video recorder events
    videoRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        videoChunks.push(event.data);
      }
    };

    // Audio recorder events
    audioRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        onDataAvailable(
          new BlobEvent('dataavailable', { data: new Blob(videoChunks) }),
          event
        );
      }
    };

    let recordersToStop = 2;
    const handleStop = () => {
      recordersToStop--;
      if (recordersToStop === 0) {
        const duration = Date.now() - startTime;
        const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        
        const videoResult: RecordingResult = {
          videoBlob,
          duration,
          size: videoBlob.size
        };

        const audioResult: AudioResult = {
          audioBlob,
          size: audioBlob.size
        };

        console.log('Recording stopped:', {
          videoDuration: `${duration}ms`,
          videoSize: `${videoBlob.size} bytes (${(videoBlob.size / 1024 / 1024).toFixed(2)} MB)`,
          audioSize: `${audioBlob.size} bytes (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB)`
        });

        onStop(videoResult, audioResult);
        videoChunks = [];
        audioChunks = [];
      }
    };

    videoRecorder.onstart = () => {
      startTime = Date.now();
      videoChunks = [];
      console.log('Video recording started');
    };

    audioRecorder.onstart = () => {
      audioChunks = [];
      console.log('Audio recording started');
    };

    videoRecorder.onstop = handleStop;
    audioRecorder.onstop = handleStop;

    videoRecorder.onerror = (event) => {
      console.error('Video MediaRecorder error:', event);
    };

    audioRecorder.onerror = (event) => {
      console.error('Audio MediaRecorder error:', event);
    };

    return { videoRecorder, audioRecorder };
  },

  /**
   * Create and configure MediaRecorder (legacy single recorder)
   */
  createMediaRecorder(
    stream: MediaStream,
    onDataAvailable: (event: BlobEvent) => void,
    onStop: (result: RecordingResult) => void
  ): MediaRecorder {
    let recordedChunks: Blob[] = [];
    let startTime: number;

    const mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
        onDataAvailable(event);
      }
    };

    mediaRecorder.onstart = () => {
      startTime = Date.now();
      recordedChunks = [];
      console.log('Recording started');
    };

    mediaRecorder.onstop = () => {
      const duration = Date.now() - startTime;
      const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
      
      const result: RecordingResult = {
        videoBlob,
        duration,
        size: videoBlob.size
      };

      console.log('Recording stopped:', {
        duration: `${duration}ms`,
        size: `${videoBlob.size} bytes`
      });

      onStop(result);
      recordedChunks = [];
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
    };

    return mediaRecorder;
  },

  /**
   * This method is deprecated - use createDualRecorders instead for direct audio recording
   * @deprecated
   */
  async extractAudioFromVideo(_videoBlob: Blob): Promise<AudioResult> {
    throw new Error('extractAudioFromVideo is deprecated. Use dual recording approach instead.');
  },

  /**
   * Convert blob to base64 string
   */
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  /**
   * Format duration from milliseconds to MM:SS
   */
  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Check if MediaRecorder is supported
   */
  isMediaRecorderSupported(): boolean {
    return typeof MediaRecorder !== 'undefined';
  },

  /**
   * Get supported MIME types for MediaRecorder
   */
  getSupportedMimeTypes(): string[] {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    
    return types.filter(type => MediaRecorder.isTypeSupported(type));
  },

  /**
   * Stop all tracks in a media stream
   */
  stopMediaStream(stream: MediaStream): void {
    stream.getTracks().forEach(track => {
      track.stop();
      console.log(`Stopped ${track.kind} track`);
    });
  },

  /**
   * Check if webcam permission is granted
   */
  async checkCameraPermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state === 'granted';
    } catch (error) {
      console.warn('Could not check camera permission:', error);
      return false;
    }
  },

  /**
   * Check if microphone permission is granted
   */
  async checkMicrophonePermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state === 'granted';
    } catch (error) {
      console.warn('Could not check microphone permission:', error);
      return false;
    }
  },

  /**
   * Format seconds to MM:SS format (for timer display)
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Validate video blob before processing
   */
  validateVideoBlob(blob: Blob): boolean {
    if (!blob || blob.size === 0) {
      console.error('Invalid video blob: empty or null');
      return false;
    }
    
    if (!blob.type.includes('video')) {
      console.error('Invalid blob type:', blob.type);
      return false;
    }
    
    return true;
  },

  /**
   * Get recording constraints based on device capabilities
   */
  async getOptimalConstraints(): Promise<MediaStreamConstraints> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some(device => device.kind === 'videoinput');
      const hasAudioInput = devices.some(device => device.kind === 'audioinput');
      
      return {
        video: hasVideoInput ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        } : false,
        audio: hasAudioInput ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 16000, max: 48000 } // Prefer 16kHz for STT optimization
        } : false
      };
    } catch (error) {
      console.error('Error getting optimal constraints:', error);
      return { video: true, audio: true };
    }
  },
};

export type { VideoRecordingConfig, RecordingResult, AudioResult };
