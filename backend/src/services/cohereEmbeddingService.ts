import { CohereClientV2 } from 'cohere-ai';

/**
 * Production-quality Cohere embedding service
 * Handles text embedding generation with error handling, retry logic, and performance monitoring
 */
export class CohereEmbeddingService {
  private client: CohereClientV2;
  private isInitialized: boolean = false;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // 1 second

  constructor(apiKey?: string) {
    if (!apiKey) {
      throw new Error('Cohere API key is required');
    }
    
    this.client = new CohereClientV2({
      token: apiKey,
    });
  }

  /**
   * Initialize the service and validate API connectivity
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Cohere embedding service...');
      
      // Test API connectivity with a simple embedding request
      await this.generateEmbedding('test connectivity');
      
      this.isInitialized = true;
      console.log('✅ Cohere embedding service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Cohere embedding service:', error);
      throw new Error(`Cohere initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embedding for a single text
   * @param text - Text to embed
   * @param inputType - Type of input for optimization
   * @returns Promise<number[]> - Embedding vector
   */
  async generateEmbedding(
    text: string, 
    inputType: 'search_document' | 'search_query' | 'classification' | 'clustering' = 'search_document'
  ): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const cleanText = text.trim().replace(/\s+/g, ' ');
    
    return this.executeWithRetry(async () => {
      const startTime = Date.now();
      
      try {
        const response = await this.client.embed({
          texts: [cleanText],
          model: 'embed-english-v3.0', // Latest high-quality embedding model
          inputType: inputType,
          embeddingTypes: ['float']
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        if (!response.embeddings?.float || response.embeddings.float.length === 0) {
          throw new Error('No embeddings returned from Cohere API');
        }

        const embedding = response.embeddings.float[0];
        if (!embedding || embedding.length === 0) {
          throw new Error('Invalid embedding format received');
        }

        console.log(`⚡ Generated embedding for text (${cleanText.substring(0, 50)}...) in ${duration}ms, vector size: ${embedding.length}`);
        
        return embedding;

      } catch (error) {
        console.error('❌ Cohere API error:', error);
        
        if (error instanceof Error) {
          if (error.message.includes('rate limit')) {
            throw new Error('Rate limit exceeded. Please try again later.');
          } else if (error.message.includes('unauthorized')) {
            throw new Error('Invalid Cohere API key');
          } else if (error.message.includes('quota')) {
            throw new Error('API quota exceeded');
          }
        }
        
        throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to embed
   * @param inputType - Type of input for optimization
   * @returns Promise<number[][]> - Array of embedding vectors
   */
  async generateBatchEmbeddings(
    texts: string[], 
    inputType: 'search_document' | 'search_query' | 'classification' | 'clustering' = 'search_document'
  ): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Filter out empty texts
    const validTexts = texts
      .map(text => text?.trim().replace(/\s+/g, ' '))
      .filter(text => text && text.length > 0);

    if (validTexts.length === 0) {
      throw new Error('No valid texts provided');
    }

    return this.executeWithRetry(async () => {
      const startTime = Date.now();
      
      try {
        // Cohere API supports batch processing
        const response = await this.client.embed({
          texts: validTexts,
          model: 'embed-english-v3.0',
          inputType: inputType,
          embeddingTypes: ['float']
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        if (!response.embeddings?.float || response.embeddings.float.length !== validTexts.length) {
          throw new Error('Mismatch between input texts and returned embeddings');
        }

        const embeddings = response.embeddings.float.map((embedding: number[]) => {
          if (!embedding || embedding.length === 0) {
            throw new Error('Invalid embedding format in batch response');
          }
          return embedding;
        });

        console.log(`⚡ Generated ${embeddings.length} embeddings in ${duration}ms (avg: ${(duration / embeddings.length).toFixed(1)}ms per embedding)`);
        
        return embeddings;

      } catch (error) {
        console.error('❌ Batch embedding error:', error);
        throw new Error(`Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * @param embedding1 - First embedding vector
   * @param embedding2 - Second embedding vector
   * @returns number - Cosine similarity score (0-1)
   */
  static cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (!embedding1 || !embedding2) {
      throw new Error('Both embeddings must be provided');
    }

    if (embedding1.length !== embedding2.length) {
      throw new Error(`Embedding dimensions must match: ${embedding1.length} vs ${embedding2.length}`);
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0; // Handle zero vectors
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    
    // Clamp to [0, 1] range and handle floating point precision
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Find the most similar embedding from a collection
   * @param queryEmbedding - Query embedding vector
   * @param candidateEmbeddings - Array of candidate embedding vectors
   * @param threshold - Minimum similarity threshold
   * @returns Best match with index and similarity score
   */
  static findMostSimilar(
    queryEmbedding: number[], 
    candidateEmbeddings: number[][], 
    threshold: number = 0.5
  ): { index: number, similarity: number } | null {
    if (!queryEmbedding || candidateEmbeddings.length === 0) {
      return null;
    }

    let bestMatch = { index: -1, similarity: 0 };

    for (let i = 0; i < candidateEmbeddings.length; i++) {
      try {
        const similarity = this.cosineSimilarity(queryEmbedding, candidateEmbeddings[i]);
        if (similarity > bestMatch.similarity) {
          bestMatch = { index: i, similarity };
        }
      } catch (error) {
        console.warn(`Warning: Could not calculate similarity for embedding ${i}:`, error);
        continue;
      }
    }

    return bestMatch.similarity >= threshold ? bestMatch : null;
  }

  /**
   * Execute function with retry logic
   * @param fn - Function to execute
   * @returns Promise with result
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === this.maxRetries) {
          break;
        }

        // Don't retry on certain errors
        if (lastError.message.includes('unauthorized') || 
            lastError.message.includes('Invalid') ||
            lastError.message.includes('quota')) {
          break;
        }

        console.warn(`⚠️ Attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`, lastError.message);
        await this.delay(this.retryDelay * attempt); // Exponential backoff
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Utility method for delays
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service status and configuration
   */
  getStatus(): { isInitialized: boolean, model: string, maxRetries: number } {
    return {
      isInitialized: this.isInitialized,
      model: 'embed-english-v3.0',
      maxRetries: this.maxRetries
    };
  }
}

// Create and export singleton instance
let cohereService: CohereEmbeddingService | null = null;

export function getCohereService(): CohereEmbeddingService {
  if (!cohereService) {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error('COHERE_API_KEY environment variable is required');
    }
    cohereService = new CohereEmbeddingService(apiKey);
  }
  return cohereService;
}

export default CohereEmbeddingService;