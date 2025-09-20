import { getCohereService, CohereEmbeddingService } from './cohereEmbeddingService';
import { getEmbeddingCache, EmbeddingCache } from './embeddingCache';
import technicalQuestions from '../data/technicalQuestions.json';

/**
 * Technical question with embedding data
 */
export interface TechnicalQuestionWithEmbedding {
  id: number;
  role: string;
  question: string;
  reference_answer: string;
  keywords: string[];
  embedding?: number[];
}

/**
 * Evaluation result for a technical answer
 */
export interface TechnicalEvaluationResult {
  questionId: number;
  similarity: number;
  score: number;
  feedback: string;
  isCorrect: boolean;
  keywordMatches: string[];
  suggestions: string[];
}

/**
 * Configuration for evaluation thresholds
 */
export interface EvaluationConfig {
  excellentThreshold: number;
  goodThreshold: number;
  partialThreshold: number;
  keywordWeight: number;
  semanticWeight: number;
}

/**
 * Production-quality technical question evaluator using Cohere embeddings
 * Pre-computes reference answer embeddings and evaluates user answers semantically
 */
export class TechnicalQuestionEvaluator {
  private cohereService: CohereEmbeddingService;
  private embeddingCache: EmbeddingCache;
  private questionsWithEmbeddings: Map<number, TechnicalQuestionWithEmbedding> = new Map();
  private isInitialized: boolean = false;
  private readonly defaultConfig: EvaluationConfig = {
    excellentThreshold: 0.85,
    goodThreshold: 0.70,
    partialThreshold: 0.50,
    keywordWeight: 0.3,
    semanticWeight: 0.7
  };

  constructor() {
    this.cohereService = getCohereService();
    this.embeddingCache = getEmbeddingCache();
  }

  /**
   * Initialize the evaluator by pre-computing all reference answer embeddings
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Technical Question Evaluator...');
      
      // Initialize cache first
      await this.embeddingCache.initialize();
      
      // Initialize Cohere service
      await this.cohereService.initialize();
      
      // Load and validate technical questions
      const questions = this.loadTechnicalQuestions();
      console.log(`📚 Loaded ${questions.length} technical questions`);
      
      // Pre-compute embeddings for all reference answers (with caching)
      await this.precomputeReferenceEmbeddings(questions);
      
      this.isInitialized = true;
      console.log('✅ Technical Question Evaluator initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Technical Question Evaluator:', error);
      throw new Error(`Evaluator initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load and validate technical questions from JSON data
   */
  private loadTechnicalQuestions(): TechnicalQuestionWithEmbedding[] {
    try {
      if (!Array.isArray(technicalQuestions)) {
        throw new Error('Technical questions data is not an array');
      }

      const validQuestions: TechnicalQuestionWithEmbedding[] = [];

      for (const question of technicalQuestions) {
        // Validate required fields
        if (!question.id || !question.reference_answer || !question.question) {
          console.warn(`Skipping invalid question: missing required fields`, question);
          continue;
        }

        if (typeof question.reference_answer !== 'string' || question.reference_answer.trim().length < 10) {
          console.warn(`Skipping question ${question.id}: reference answer too short`);
          continue;
        }

        validQuestions.push({
          id: question.id,
          role: question.role || 'Software Engineer',
          question: question.question,
          reference_answer: question.reference_answer,
          keywords: Array.isArray(question.keywords) ? question.keywords : []
        });
      }

      if (validQuestions.length === 0) {
        throw new Error('No valid technical questions found');
      }

      return validQuestions;

    } catch (error) {
      console.error('❌ Error loading technical questions:', error);
      throw new Error(`Failed to load technical questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pre-compute embeddings for all reference answers (with caching)
   */
  private async precomputeReferenceEmbeddings(questions: TechnicalQuestionWithEmbedding[]): Promise<void> {
    try {
      console.log('⚡ Pre-computing embeddings for reference answers...');
      const startTime = Date.now();

      // Check cache for existing embeddings using question IDs
      const questionsNeedingEmbeddings: TechnicalQuestionWithEmbedding[] = [];
      const cachedEmbeddings = new Map<number, number[]>();

      for (const question of questions) {
        // Check if embedding is already cached by question ID
        const cachedEmbedding = await this.embeddingCache.getQuestionEmbedding(question.id);
        
        if (cachedEmbedding) {
          // Verify the cached text matches current reference answer
          if (cachedEmbedding.text === question.reference_answer) {
            cachedEmbeddings.set(question.id, cachedEmbedding.embedding);
            console.log(`✅ Using cached embedding for question ${question.id}`);
          } else {
            console.log(`⚠️ Reference answer changed for question ${question.id}, will regenerate embedding`);
            questionsNeedingEmbeddings.push(question);
          }
        } else {
          questionsNeedingEmbeddings.push(question);
        }
      }

      console.log(`📊 Cache status: ${cachedEmbeddings.size} cached, ${questionsNeedingEmbeddings.length} need computation`);

      // Generate embeddings for questions that need them
      if (questionsNeedingEmbeddings.length > 0) {
        console.log(`🔄 Generating embeddings for ${questionsNeedingEmbeddings.length} reference answers...`);
        
        const embeddingsToCache: { questionId: number; text: string; embedding: number[] }[] = [];
        
        for (const question of questionsNeedingEmbeddings) {
          try {
            const embedding = await this.cohereService.generateEmbedding(question.reference_answer);
            question.embedding = embedding;
            
            // Prepare for batch caching
            embeddingsToCache.push({
              questionId: question.id,
              text: question.reference_answer,
              embedding
            });
            
            console.log(`✅ Generated embedding for question ${question.id} (${question.role})`);
            
          } catch (error) {
            console.error(`❌ Failed to generate embedding for question ${question.id}:`, error);
            throw new Error(`Failed to generate embedding for question ${question.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Batch cache all new embeddings
        if (embeddingsToCache.length > 0) {
          await this.embeddingCache.storeQuestionEmbeddings(embeddingsToCache);
        }
      }

      // Set embeddings for questions that were cached
      for (const question of questions) {
        if (!question.embedding) {
          const embedding = cachedEmbeddings.get(question.id);
          if (embedding) {
            question.embedding = embedding;
          }
        }
      }

      // Store all questions in the map for easy access
      for (const question of questions) {
        this.questionsWithEmbeddings.set(question.id, question);
      }

      const duration = Date.now() - startTime;
      const cacheHitRate = cachedEmbeddings.size / questions.length * 100;
      
      console.log(`✅ Embedding pre-computation completed in ${duration}ms`);
      console.log(`📈 Cache hit rate: ${cacheHitRate.toFixed(1)}% (${cachedEmbeddings.size}/${questions.length})`);
      
    } catch (error) {
      console.error('❌ Failed to pre-compute reference embeddings:', error);
      throw new Error(`Embedding pre-computation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Evaluate a user's answer against a specific technical question
   * @param questionId - ID of the technical question
   * @param userAnswer - User's answer text
   * @param config - Optional evaluation configuration
   * @returns Evaluation result with score and feedback
   */
  async evaluateAnswer(
    questionId: number, 
    userAnswer: string, 
    config?: Partial<EvaluationConfig>
  ): Promise<TechnicalEvaluationResult> {
    if (!this.isInitialized) {
      throw new Error('Evaluator not initialized. Call initialize() first.');
    }

    // Validate inputs
    if (!userAnswer || userAnswer.trim().length < 5) {
      return {
        questionId,
        similarity: 0,
        score: 0,
        feedback: 'Answer is too short. Please provide a more detailed explanation with at least a few sentences.',
        isCorrect: false,
        keywordMatches: [],
        suggestions: ['Provide more detail in your answer', 'Explain the concept step by step', 'Include relevant examples or use cases']
      };
    }

    const question = this.questionsWithEmbeddings.get(questionId);
    if (!question || !question.embedding) {
      throw new Error(`Question with ID ${questionId} not found or missing embedding`);
    }

    const evaluationConfig = { ...this.defaultConfig, ...config };

    try {
      // Generate embedding for user answer
      const userEmbedding = await this.cohereService.generateEmbedding(
        userAnswer.trim(),
        'search_query' // User answer is a query against the reference document
      );

      // Calculate semantic similarity
      const semanticSimilarity = CohereEmbeddingService.cosineSimilarity(
        question.embedding,
        userEmbedding
      );

      // Calculate keyword match score
      const keywordScore = this.calculateKeywordMatch(userAnswer, question.keywords);

      // Combine semantic and keyword scores
      const combinedScore = (
        semanticSimilarity * evaluationConfig.semanticWeight +
        keywordScore.score * evaluationConfig.keywordWeight
      );

      // Convert to 0-100 score
      const finalScore = Math.round(combinedScore * 100);

      // Generate feedback and determine correctness
      const { feedback, isCorrect, suggestions } = this.generateFeedback(
        combinedScore,
        semanticSimilarity,
        keywordScore,
        evaluationConfig,
        question
      );

      console.log(`📊 Question ${questionId} evaluation: semantic=${semanticSimilarity.toFixed(3)}, keyword=${keywordScore.score.toFixed(3)}, final=${finalScore}`);

      return {
        questionId,
        similarity: semanticSimilarity,
        score: finalScore,
        feedback,
        isCorrect,
        keywordMatches: keywordScore.matches,
        suggestions
      };

    } catch (error) {
      console.error(`❌ Error evaluating answer for question ${questionId}:`, error);
      throw new Error(`Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate keyword matching score
   */
  private calculateKeywordMatch(userAnswer: string, keywords: string[]): { score: number, matches: string[] } {
    if (!keywords || keywords.length === 0) {
      return { score: 0, matches: [] };
    }

    const answerLower = userAnswer.toLowerCase();
    const matches: string[] = [];

    for (const keyword of keywords) {
      if (answerLower.includes(keyword.toLowerCase())) {
        matches.push(keyword);
      }
    }

    const score = matches.length / keywords.length;
    return { score, matches };
  }

  /**
   * Generate detailed feedback based on evaluation results
   */
  private generateFeedback(
    combinedScore: number,
    semanticSimilarity: number,
    keywordScore: { score: number, matches: string[] },
    config: EvaluationConfig,
    question: TechnicalQuestionWithEmbedding
  ): { feedback: string, isCorrect: boolean, suggestions: string[] } {
    const suggestions: string[] = [];
    let feedback: string;
    let isCorrect: boolean;

    if (combinedScore >= config.excellentThreshold) {
      feedback = '🎯 Excellent answer! You demonstrate a strong understanding of the concept with clear explanations.';
      isCorrect = true;
      
      if (keywordScore.matches.length < question.keywords.length) {
        suggestions.push('Consider mentioning these key terms: ' + 
          question.keywords.filter(k => !keywordScore.matches.includes(k)).join(', '));
      }
      
    } else if (combinedScore >= config.goodThreshold) {
      feedback = '👍 Good answer! You covered the main concepts well but could add more detail or clarity.';
      isCorrect = true;
      
      suggestions.push('Expand on your explanation with more specific details');
      if (keywordScore.score < 0.5) {
        suggestions.push('Include these important concepts: ' + question.keywords.slice(0, 3).join(', '));
      }
      
    } else if (combinedScore >= config.partialThreshold) {
      feedback = '⚠️ Partially correct. Your answer touches on relevant concepts but misses key details.';
      isCorrect = false;
      
      suggestions.push('Review the core concepts and provide more comprehensive explanation');
      suggestions.push('Include these key terms: ' + question.keywords.slice(0, 3).join(', '));
      if (semanticSimilarity < 0.4) {
        suggestions.push('Your answer may be addressing a different aspect of the question');
      }
      
    } else {
      feedback = '❌ The answer appears to be off-topic or missing key concepts. Please review the question carefully.';
      isCorrect = false;
      
      suggestions.push('Read the question carefully and focus on the main concept being asked');
      suggestions.push('Key concepts to address: ' + question.keywords.slice(0, 5).join(', '));
      suggestions.push('Consider reviewing the fundamentals of this topic');
    }

    // Add specific suggestions based on semantic vs keyword performance
    if (semanticSimilarity > 0.7 && keywordScore.score < 0.3) {
      suggestions.push('Your explanation is conceptually sound but could benefit from using more technical terminology');
    } else if (semanticSimilarity < 0.5 && keywordScore.score > 0.5) {
      suggestions.push('You mentioned relevant keywords but the overall explanation needs better structure and clarity');
    }

    return { feedback, isCorrect, suggestions };
  }

  /**
   * Evaluate multiple answers in batch
   */
  async evaluateBatch(
    evaluations: { questionId: number, userAnswer: string }[],
    config?: Partial<EvaluationConfig>
  ): Promise<TechnicalEvaluationResult[]> {
    const results: TechnicalEvaluationResult[] = [];
    
    for (const item of evaluations) {
      try {
        const result = await this.evaluateAnswer(item.questionId, item.userAnswer, config);
        results.push(result);
      } catch (error) {
        console.error(`Error evaluating question ${item.questionId}:`, error);
        // Add error result
        results.push({
          questionId: item.questionId,
          similarity: 0,
          score: 0,
          feedback: 'Evaluation failed due to technical error',
          isCorrect: false,
          keywordMatches: [],
          suggestions: ['Please try again later']
        });
      }
    }
    
    return results;
  }

  /**
   * Get a technical question by ID
   */
  getQuestion(questionId: number): TechnicalQuestionWithEmbedding | undefined {
    return this.questionsWithEmbeddings.get(questionId);
  }

  /**
   * Get all available technical questions (without embeddings for security)
   */
  getAllQuestions(): Omit<TechnicalQuestionWithEmbedding, 'embedding'>[] {
    return Array.from(this.questionsWithEmbeddings.values()).map(q => ({
      id: q.id,
      role: q.role,
      question: q.question,
      reference_answer: q.reference_answer,
      keywords: q.keywords
    }));
  }

  /**
   * Get questions filtered by role
   */
  getQuestionsByRole(role: string): Omit<TechnicalQuestionWithEmbedding, 'embedding'>[] {
    return this.getAllQuestions().filter(q => 
      q.role.toLowerCase().includes(role.toLowerCase())
    );
  }

  /**
   * Get evaluator status and statistics
   */
  getStatus(): {
    isInitialized: boolean,
    questionCount: number,
    embeddingDimension?: number,
    config: EvaluationConfig
  } {
    const firstQuestion = Array.from(this.questionsWithEmbeddings.values())[0];
    
    return {
      isInitialized: this.isInitialized,
      questionCount: this.questionsWithEmbeddings.size,
      embeddingDimension: firstQuestion?.embedding?.length,
      config: this.defaultConfig
    };
  }
}

// Create and export singleton instance
let evaluatorInstance: TechnicalQuestionEvaluator | null = null;

export function getTechnicalEvaluator(): TechnicalQuestionEvaluator {
  if (!evaluatorInstance) {
    evaluatorInstance = new TechnicalQuestionEvaluator();
  }
  return evaluatorInstance;
}

export default TechnicalQuestionEvaluator;