import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Cached embedding data structure
 */
export interface CachedEmbedding {
  id: string;
  questionId?: number;  // Add question ID for reference answer embeddings
  text: string;
  embedding: number[];
  textHash: string;
  createdAt: number;
  model: string;
}

/**
 * Cache metadata structure
 */
export interface CacheMetadata {
  version: string;
  model: string;
  createdAt: number;
  lastUpdated: number;
  embeddingCount: number;
  questionIds: number[];  // Track which questions have cached embeddings
}

/**
 * Production-quality embedding cache for persistent storage
 * Stores embeddings to disk to avoid re-computation on service restart
 */
export class EmbeddingCache {
  private cacheDir: string;
  private cacheFile: string;
  private metadataFile: string;
  private cache: Map<string, CachedEmbedding> = new Map();
  private isLoaded: boolean = false;
  private readonly currentVersion = '1.0.0';
  private readonly model = 'embed-english-v3.0';

  constructor(cacheDirectory?: string) {
    this.cacheDir = cacheDirectory || path.join(process.cwd(), 'cache', 'embeddings');
    this.cacheFile = path.join(this.cacheDir, 'embeddings.json');
    this.metadataFile = path.join(this.cacheDir, 'metadata.json');
  }

  /**
   * Initialize the cache by loading existing data
   */
  async initialize(): Promise<void> {
    try {
      console.log('🗄️ Initializing embedding cache...');
      
      // Ensure cache directory exists
      await this.ensureCacheDirectory();
      
      // Load existing cache
      await this.loadCache();
      
      this.isLoaded = true;
      console.log(`✅ Embedding cache initialized with ${this.cache.size} cached embeddings`);
      
    } catch (error) {
      console.error('❌ Failed to initialize embedding cache:', error);
      // Don't throw error - cache is optional, service can work without it
      console.warn('⚠️ Cache initialization failed, continuing without cache');
    }
  }

  /**
   * Store an embedding in the cache
   */
  async storeEmbedding(id: string, text: string, embedding: number[]): Promise<void> {
    if (!text || !embedding || embedding.length === 0) {
      throw new Error('Invalid text or embedding data');
    }

    const textHash = this.hashText(text);
    const cachedEmbedding: CachedEmbedding = {
      id,
      text,
      embedding,
      textHash,
      createdAt: Date.now(),
      model: this.model
    };

    this.cache.set(id, cachedEmbedding);

    // Persist to disk (async, don't block)
    this.persistCache().catch(error => {
      console.error('Warning: Failed to persist cache to disk:', error);
    });
  }

  /**
   * Store multiple embeddings in batch
   */
  async storeBatchEmbeddings(embeddings: { id: string, text: string, embedding: number[] }[]): Promise<void> {
    const validEmbeddings = embeddings.filter(item => 
      item.id && item.text && item.embedding && item.embedding.length > 0
    );

    if (validEmbeddings.length === 0) {
      return;
    }

    for (const item of validEmbeddings) {
      const textHash = this.hashText(item.text);
      const cachedEmbedding: CachedEmbedding = {
        id: item.id,
        text: item.text,
        embedding: item.embedding,
        textHash,
        createdAt: Date.now(),
        model: this.model
      };

      this.cache.set(item.id, cachedEmbedding);
    }

    console.log(`💾 Stored ${validEmbeddings.length} embeddings in cache`);

    // Persist to disk
    await this.persistCache();
  }

  /**
   * Retrieve an embedding from the cache
   */
  getEmbedding(id: string): number[] | null {
    const cached = this.cache.get(id);
    return cached?.embedding || null;
  }

  /**
   * Check if an embedding exists in cache and is valid
   */
  hasEmbedding(id: string, text?: string): boolean {
    const cached = this.cache.get(id);
    if (!cached) {
      return false;
    }

    // If text is provided, verify it matches (in case content changed)
    if (text) {
      const textHash = this.hashText(text);
      return cached.textHash === textHash;
    }

    return true;
  }

  /**
   * Get multiple embeddings in batch
   */
  getBatchEmbeddings(ids: string[]): Map<string, number[]> {
    const results = new Map<string, number[]>();
    
    for (const id of ids) {
      const embedding = this.getEmbedding(id);
      if (embedding) {
        results.set(id, embedding);
      }
    }
    
    return results;
  }

  /**
   * Remove an embedding from cache
   */
  removeEmbedding(id: string): boolean {
    return this.cache.delete(id);
  }

  /**
   * Clear all cached embeddings
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    await this.persistCache();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number,
    totalEmbeddings: number,
    oldestEntry?: number,
    newestEntry?: number,
    model: string
  } {
    const embeddings = Array.from(this.cache.values());
    const timestamps = embeddings.map(e => e.createdAt);
    
    return {
      size: this.cache.size,
      totalEmbeddings: embeddings.length,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
      model: this.model
    };
  }

  /**
   * Cleanup old cache entries (if needed in the future)
   */
  async cleanup(maxAge?: number): Promise<number> {
    if (!maxAge) {
      return 0; // No cleanup needed for now
    }

    const cutoffTime = Date.now() - maxAge;
    let removedCount = 0;

    for (const [id, cached] of this.cache.entries()) {
      if (cached.createdAt < cutoffTime) {
        this.cache.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      await this.persistCache();
      console.log(`🧹 Cleaned up ${removedCount} old cache entries`);
    }

    return removedCount;
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create cache directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load cache from disk
   */
  private async loadCache(): Promise<void> {
    try {
      // Check if cache files exist
      const cacheExists = await this.fileExists(this.cacheFile);
      const metadataExists = await this.fileExists(this.metadataFile);

      if (!cacheExists || !metadataExists) {
        console.log('📂 No existing cache found, starting fresh');
        return;
      }

      // Load metadata
      const metadataContent = await fs.readFile(this.metadataFile, 'utf-8');
      const metadata: CacheMetadata = JSON.parse(metadataContent);

      // Validate metadata
      if (metadata.model !== this.model) {
        console.log(`🔄 Cache model mismatch (${metadata.model} vs ${this.model}), invalidating cache`);
        await this.clearCache();
        return;
      }

      // Load cache data
      const cacheContent = await fs.readFile(this.cacheFile, 'utf-8');
      const cacheData: CachedEmbedding[] = JSON.parse(cacheContent);

      // Rebuild cache map
      for (const cached of cacheData) {
        if (this.isValidCachedEmbedding(cached)) {
          this.cache.set(cached.id, cached);
        }
      }

      console.log(`📚 Loaded ${this.cache.size} embeddings from cache (${metadata.embeddingCount} total in file)`);

    } catch (error) {
      console.error('⚠️ Error loading cache from disk:', error);
      console.log('🔄 Starting with empty cache');
      this.cache.clear();
    }
  }

  /**
   * Persist cache to disk
   */
  private async persistCache(): Promise<void> {
    try {
      const cacheData = Array.from(this.cache.values());
      
      // Extract unique question IDs from cached embeddings
      const questionIds = Array.from(new Set(
        cacheData
          .map(embedding => embedding.questionId)
          .filter((id): id is number => id !== undefined)
      )).sort((a, b) => a - b);

      const metadata: CacheMetadata = {
        version: this.currentVersion,
        model: this.model,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        embeddingCount: cacheData.length,
        questionIds
      };

      // Write cache data
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
      
      // Write metadata
      await fs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2));

    } catch (error) {
      console.error('❌ Failed to persist cache to disk:', error);
      throw new Error(`Cache persistence failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate cached embedding data
   */
  private isValidCachedEmbedding(cached: any): cached is CachedEmbedding {
    return (
      cached &&
      typeof cached.id === 'string' &&
      typeof cached.text === 'string' &&
      Array.isArray(cached.embedding) &&
      cached.embedding.length > 0 &&
      typeof cached.textHash === 'string' &&
      typeof cached.createdAt === 'number' &&
      typeof cached.model === 'string'
    );
  }

  /**
   * Generate hash for text content
   */
  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text.trim()).digest('hex');
  }

  /**
   * Store embedding with question ID
   */
  async storeQuestionEmbedding(
    questionId: number,
    text: string, 
    embedding: number[]
  ): Promise<void> {
    if (!this.isLoaded) {
      await this.initialize();
    }
    
    const id = `question_${questionId}`;
    const textHash = this.hashText(text);
    
    const cachedEmbedding: CachedEmbedding = {
      id,
      questionId,
      text,
      embedding,
      textHash,
      createdAt: Date.now(),
      model: this.model
    };

    this.cache.set(id, cachedEmbedding);
    await this.persistCache();
    
    console.log(`Cached embedding for question ${questionId}`);
  }

  /**
   * Get embedding by question ID
   */
  async getQuestionEmbedding(questionId: number): Promise<CachedEmbedding | null> {
    if (!this.isLoaded) {
      await this.initialize();
    }
    const id = `question_${questionId}`;
    return this.cache.get(id) || null;
  }

  /**
   * Check if question embedding is cached
   */
  async hasQuestionEmbedding(questionId: number): Promise<boolean> {
    if (!this.isLoaded) {
      await this.initialize();
    }
    const id = `question_${questionId}`;
    return this.cache.has(id);
  }

  /**
   * Get all cached question IDs
   */
  async getCachedQuestionIds(): Promise<number[]> {
    if (!this.isLoaded) {
      await this.initialize();
    }
    const questionIds = Array.from(this.cache.values())
      .map(embedding => embedding.questionId)
      .filter((id): id is number => id !== undefined);
    
    return Array.from(new Set(questionIds)).sort((a, b) => a - b);
  }

  /**
   * Store multiple question embeddings efficiently
   */
  async storeQuestionEmbeddings(
    embeddings: { questionId: number; text: string; embedding: number[] }[]
  ): Promise<void> {
    if (!this.isLoaded) {
      await this.initialize();
    }
    
    for (const { questionId, text, embedding } of embeddings) {
      const id = `question_${questionId}`;
      const textHash = this.hashText(text);
      
      const cachedEmbedding: CachedEmbedding = {
        id,
        questionId,
        text,
        embedding,
        textHash,
        createdAt: Date.now(),
        model: this.model
      };

      this.cache.set(id, cachedEmbedding);
    }
    
    await this.persistCache();
    console.log(`Cached embeddings for ${embeddings.length} questions`);
  }

  /**
   * Get cache status
   */
  getStatus(): { 
    isLoaded: boolean, 
    cacheDir: string, 
    stats: {
      size: number,
      totalEmbeddings: number,
      oldestEntry?: number,
      newestEntry?: number,
      model: string
    }
  } {
    return {
      isLoaded: this.isLoaded,
      cacheDir: this.cacheDir,
      stats: this.getStats()
    };
  }
}

// Create and export singleton instance
let cacheInstance: EmbeddingCache | null = null;

export function getEmbeddingCache(): EmbeddingCache {
  if (!cacheInstance) {
    cacheInstance = new EmbeddingCache();
  }
  return cacheInstance;
}

export default EmbeddingCache;