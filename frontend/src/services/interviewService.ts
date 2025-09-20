import { 
  UploadData, 
  UploadResponse, 
  ProcessedContent, 
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  InterviewSession 
} from '../types/interview.types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/**
 * Service class for handling interview setup uploads and question generation
 * Supports PDF uploads, text input, and URL processing
 */
class InterviewService {
  private sessionId: string;

  constructor() {
    // Generate or retrieve session ID for this interview setup
    this.sessionId = localStorage.getItem('interview-session-id') || this.generateSessionId();
    localStorage.setItem('interview-session-id', this.sessionId);
  }

  /**
   * Generate a unique session ID for tracking this interview setup
   */
  private generateSessionId(): string {
    return `interview_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get headers for API requests with session tracking
   */
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'x-session-id': this.sessionId,
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Get headers for file upload requests
   */
  private getFileHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'x-session-id': this.sessionId,
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Upload and process a PDF file
   * @param file - The PDF file to upload
   * @param type - Type of content (resume, jobDescription, etc.)
   */
  async uploadFile(file: File, type: string): Promise<UploadResponse> {
    try {
      // Validate file type
      if (file.type !== 'application/pdf') {
        throw new Error('Only PDF files are supported');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch(`${API_BASE_URL}/api/interview/upload/file`, {
        method: 'POST',
        headers: this.getFileHeaders(),
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'File upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        message: 'File upload failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process text input directly
   * @param text - The text content to process
   * @param type - Type of content (resume, jobDescription, etc.)
   */
  async uploadText(text: string, type: string): Promise<UploadResponse> {
    try {
      // Validate text content
      if (!text.trim()) {
        throw new Error('Text content cannot be empty');
      }

      if (text.length > 50000) {
        throw new Error('Text content is too long (max 50,000 characters)');
      }

      const response = await fetch(`${API_BASE_URL}/api/interview/upload/text`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          text: text.trim(),
          type
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Text processing failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Text upload error:', error);
      return {
        success: false,
        message: 'Text processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process content from a URL
   * @param url - The URL to scrape content from
   * @param type - Type of content (resume, jobDescription, etc.)
   */
  async uploadUrl(url: string, type: string): Promise<UploadResponse> {
    try {
      // Validate URL format
      try {
        new URL(url);
      } catch {
        throw new Error('Please enter a valid URL');
      }

      const response = await fetch(`${API_BASE_URL}/api/interview/upload/url`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          url,
          type
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'URL processing failed');
      }

      return await response.json();
    } catch (error) {
      console.error('URL upload error:', error);
      return {
        success: false,
        message: 'URL processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generic upload method that handles all three upload types
   * @param uploadData - The upload data with method and content
   * @param type - Type of content being uploaded
   */
  async upload(uploadData: UploadData, type: string): Promise<UploadResponse> {
    switch (uploadData.method) {
      case 'file':
        if (!uploadData.file) {
          return {
            success: false,
            message: 'No file provided',
            error: 'File is required for file upload method'
          };
        }
        return this.uploadFile(uploadData.file, type);

      case 'text':
        if (!uploadData.content) {
          return {
            success: false,
            message: 'No text provided',
            error: 'Text content is required for text input method'
          };
        }
        return this.uploadText(uploadData.content, type);

      case 'url':
        if (!uploadData.url) {
          return {
            success: false,
            message: 'No URL provided',
            error: 'URL is required for URL input method'
          };
        }
        return this.uploadUrl(uploadData.url, type);

      default:
        return {
          success: false,
          message: 'Invalid upload method',
          error: 'Upload method must be file, text, or url'
        };
    }
  }

  /**
   * Generate interview questions based on all uploaded content
   * @param processedContent - Array of all processed content
   */
  async generateQuestions(processedContent: ProcessedContent[]): Promise<GenerateQuestionsResponse> {
    try {
      if (processedContent.length === 0) {
        throw new Error('No content provided for question generation');
      }

      const request: GenerateQuestionsRequest = {
        sessionId: this.sessionId,
        processedContent
      };

      const response = await fetch(`${API_BASE_URL}/api/interview/generate-questions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Question generation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Question generation error:', error);
      return {
        success: false,
        questions: { technical: [], behavioral: [] },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get the current interview session
   */
  async getSession(): Promise<InterviewSession | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interview/session/${this.sessionId}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Session doesn't exist yet
        }
        throw new Error('Failed to fetch session');
      }

      return await response.json();
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  /**
   * Save the current session state
   * @param sessionData - The session data to save
   */
  async saveSession(sessionData: Partial<InterviewSession>): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interview/session/${this.sessionId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(sessionData)
      });

      return response.ok;
    } catch (error) {
      console.error('Save session error:', error);
      return false;
    }
  }

  /**
   * Clear the current session and start fresh
   */
  clearSession(): void {
    this.sessionId = this.generateSessionId();
    localStorage.setItem('interview-session-id', this.sessionId);
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Export a singleton instance
export const interviewService = new InterviewService();
export default interviewService;