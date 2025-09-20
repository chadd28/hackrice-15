/**
 * Frontend service for technical question evaluation
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export interface TechnicalQuestion {
  id: number;
  role: string;
  question: string;
  reference_answer: string;
  keywords: string[];
}

export interface TechnicalEvaluationResult {
  questionId: number;
  similarity: number;
  score: number;
  feedback: string;
  isCorrect: boolean;
  keywordMatches: string[];
  suggestions: string[];
}

export interface EvaluationConfig {
  excellentThreshold?: number;
  goodThreshold?: number;
  partialThreshold?: number;
  keywordWeight?: number;
  semanticWeight?: number;
}

export interface EvaluationSummary {
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
  averageSimilarity: number;
}

/**
 * Technical evaluation service
 */
class TechnicalEvaluationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/technical`;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Initialize the technical evaluator
   */
  async initialize(): Promise<{
    success: boolean;
    questionCount?: number;
    embeddingDimension?: number;
    config?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/initialize`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to initialize technical evaluator');
      }

      return {
        success: true,
        questionCount: result.data?.questionCount,
        embeddingDimension: result.data?.embeddingDimension,
        config: result.data?.config
      };

    } catch (error) {
      console.error('Failed to initialize technical evaluator:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Evaluate a single technical answer
   */
  async evaluateAnswer(
    questionId: number, 
    userAnswer: string, 
    config?: EvaluationConfig
  ): Promise<{
    success: boolean;
    evaluation?: TechnicalEvaluationResult;
    error?: string;
  }> {
    try {
      if (!userAnswer || userAnswer.trim().length === 0) {
        throw new Error('User answer cannot be empty');
      }

      const response = await fetch(`${this.baseUrl}/evaluate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          questionId,
          userAnswer: userAnswer.trim(),
          config
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to evaluate answer');
      }

      return {
        success: true,
        evaluation: result.data?.evaluation
      };

    } catch (error) {
      console.error('Failed to evaluate technical answer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Evaluate multiple technical answers in batch
   */
  async evaluateBatch(
    evaluations: { questionId: number; userAnswer: string }[],
    config?: EvaluationConfig
  ): Promise<{
    success: boolean;
    evaluations?: TechnicalEvaluationResult[];
    summary?: EvaluationSummary;
    error?: string;
  }> {
    try {
      if (!evaluations || evaluations.length === 0) {
        throw new Error('No evaluations provided');
      }

      const response = await fetch(`${this.baseUrl}/evaluate-batch`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          evaluations,
          config
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to evaluate answers');
      }

      return {
        success: true,
        evaluations: result.data?.evaluations,
        summary: result.data?.summary
      };

    } catch (error) {
      console.error('Failed to evaluate technical answers in batch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get a technical question by ID
   */
  async getQuestion(questionId: number): Promise<{
    success: boolean;
    question?: TechnicalQuestion;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/questions/${questionId}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to get question');
      }

      return {
        success: true,
        question: result.data
      };

    } catch (error) {
      console.error('Failed to get technical question:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all technical questions or filter by role
   */
  async getAllQuestions(role?: string): Promise<{
    success: boolean;
    questions?: TechnicalQuestion[];
    total?: number;
    error?: string;
  }> {
    try {
      const url = role 
        ? `${this.baseUrl}/questions?role=${encodeURIComponent(role)}`
        : `${this.baseUrl}/questions`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to get questions');
      }

      return {
        success: true,
        questions: result.data?.questions,
        total: result.data?.total
      };

    } catch (error) {
      console.error('Failed to get technical questions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get evaluator status
   */
  async getStatus(): Promise<{
    success: boolean;
    status?: {
      isInitialized: boolean;
      questionCount: number;
      embeddingDimension?: number;
      config: any;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to get status');
      }

      return {
        success: true,
        status: result.data
      };

    } catch (error) {
      console.error('Failed to get evaluator status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    success: boolean;
    status?: string;
    questionCount?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Health check failed');
      }

      return {
        success: true,
        status: result.data?.status,
        questionCount: result.data?.questionCount
      };

    } catch (error) {
      console.error('Health check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Create and export singleton instance
const technicalEvaluationService = new TechnicalEvaluationService();
export default technicalEvaluationService;