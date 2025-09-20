import { ProcessedContent } from '../types/interview.types';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export interface TechnicalQuestion {
  id: number;
  role: string;
  question: string;
  keywords: string[];
}

export interface SelectTechnicalQuestionsResponse {
  success: boolean;
  selected: TechnicalQuestion[];
  sessionId: string;
  fallback?: boolean;
  error?: string;
}

/**
 * Service for selecting technical questions based on job description
 */
class TechnicalQuestionsService {
  
  /**
   * Select two technical questions tailored to the job description
   * @param processedContent Array of processed content from the interview setup
   * @param sessionId Session ID for tracking
   * @returns Promise with selected technical questions
   */
  async selectTechnicalQuestions(
    processedContent: ProcessedContent[], 
    sessionId: string
  ): Promise<SelectTechnicalQuestionsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interview/select-technical-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({
          processedContent        // contains job description text
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SelectTechnicalQuestionsResponse = await response.json();
      return data;
      
    } catch (error) {
      console.error('Error selecting technical questions:', error);
      throw new Error(`Failed to select technical questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const technicalQuestionsService = new TechnicalQuestionsService();
export default technicalQuestionsService;
