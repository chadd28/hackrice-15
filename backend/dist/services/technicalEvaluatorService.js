import { getCohereService, CohereEmbeddingService } from './cohereEmbeddingService';
import { getEmbeddingCache } from './embeddingCache';
import technicalQuestions from '../data/technicalQuestions.json';
import { GoogleGenerativeAI } from '@google/generative-ai';
/**
 * Production-quality technical question evaluator using Cohere embeddings
 * Pre-computes reference answer embeddings and evaluates user answers semantically
 */
export class TechnicalQuestionEvaluator {
    constructor() {
        this.questionsWithEmbeddings = new Map();
        this.isInitialized = false;
        this.defaultConfig = {
            excellentThreshold: 0.85,
            goodThreshold: 0.70,
            partialThreshold: 0.50,
            keywordWeight: 0.3,
            semanticWeight: 0.7
        };
        this.cohereService = getCohereService();
        this.embeddingCache = getEmbeddingCache();
        // Initialize Gemini client
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is required');
        }
        this.geminiClient = new GoogleGenerativeAI(apiKey);
    }
    /**
     * Initialize the evaluator by pre-computing all reference answer embeddings
     */
    async initialize() {
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
        }
        catch (error) {
            console.error('❌ Failed to initialize Technical Question Evaluator:', error);
            throw new Error(`Evaluator initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Load and validate technical questions from JSON data
     */
    loadTechnicalQuestions() {
        try {
            if (!Array.isArray(technicalQuestions)) {
                throw new Error('Technical questions data is not an array');
            }
            const validQuestions = [];
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
        }
        catch (error) {
            console.error('❌ Error loading technical questions:', error);
            throw new Error(`Failed to load technical questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Pre-compute embeddings for all reference answers (with caching)
     */
    async precomputeReferenceEmbeddings(questions) {
        try {
            console.log('⚡ Pre-computing embeddings for reference answers...');
            const startTime = Date.now();
            // Check cache for existing embeddings using question IDs
            const questionsNeedingEmbeddings = [];
            const cachedEmbeddings = new Map();
            for (const question of questions) {
                // Check if embedding is already cached by question ID
                const cachedEmbedding = await this.embeddingCache.getQuestionEmbedding(question.id);
                if (cachedEmbedding) {
                    // Verify the cached text matches current reference answer
                    if (cachedEmbedding.text === question.reference_answer) {
                        cachedEmbeddings.set(question.id, cachedEmbedding.embedding);
                        console.log(`✅ Using cached embedding for question ${question.id}`);
                    }
                    else {
                        console.log(`⚠️ Reference answer changed for question ${question.id}, will regenerate embedding`);
                        questionsNeedingEmbeddings.push(question);
                    }
                }
                else {
                    questionsNeedingEmbeddings.push(question);
                }
            }
            console.log(`📊 Cache status: ${cachedEmbeddings.size} cached, ${questionsNeedingEmbeddings.length} need computation`);
            // Generate embeddings for questions that need them
            if (questionsNeedingEmbeddings.length > 0) {
                console.log(`🔄 Generating embeddings for ${questionsNeedingEmbeddings.length} reference answers...`);
                const embeddingsToCache = [];
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
                    }
                    catch (error) {
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
        }
        catch (error) {
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
    async evaluateAnswer(questionId, userAnswer, config) {
        if (!this.isInitialized) {
            throw new Error('Evaluator not initialized. Call initialize() first.');
        }
        // Validate inputs
        if (!userAnswer || userAnswer.trim().length < 5) {
            return {
                questionId,
                similarity: 0,
                score: 1, // Minimum score on 1-10 scale
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
            const userEmbedding = await this.cohereService.generateEmbedding(userAnswer.trim(), 'search_query' // User answer is a query against the reference document
            );
            // Calculate semantic similarity
            const semanticSimilarity = CohereEmbeddingService.cosineSimilarity(question.embedding, userEmbedding);
            // Calculate keyword match score
            const keywordScore = this.calculateKeywordMatch(userAnswer, question.keywords);
            // Combine semantic and keyword scores
            const combinedScore = (semanticSimilarity * evaluationConfig.semanticWeight +
                keywordScore.score * evaluationConfig.keywordWeight);
            // Convert to 1-10 score
            const finalScore = Math.max(1, Math.min(10, Math.round(combinedScore * 9) + 1));
            // Generate feedback and determine correctness
            const { feedback, isCorrect, suggestions } = await this.generateFeedback(combinedScore, semanticSimilarity, keywordScore, evaluationConfig, question, userAnswer);
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
        }
        catch (error) {
            console.error(`❌ Error evaluating answer for question ${questionId}:`, error);
            throw new Error(`Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Calculate keyword matching score
     */
    calculateKeywordMatch(userAnswer, keywords) {
        if (!keywords || keywords.length === 0) {
            return { score: 0, matches: [] };
        }
        const answerLower = userAnswer.toLowerCase();
        const matches = [];
        for (const keyword of keywords) {
            if (answerLower.includes(keyword.toLowerCase())) {
                matches.push(keyword);
            }
        }
        const score = matches.length / keywords.length;
        return { score, matches };
    }
    /**
     * Generate AI-powered suggestions using Gemini
     */
    async generateAISuggestions(userAnswer, question, combinedScore, keywordMatches) {
        try {
            const model = this.geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const prompt = `
You are an expert technical interviewer providing constructive feedback. 

QUESTION: ${question.question}
REFERENCE ANSWER: ${question.reference_answer}
USER'S ANSWER: ${userAnswer}
SCORE: ${(combinedScore * 100).toFixed(1)}%
KEYWORDS FOUND: ${keywordMatches.join(', ') || 'None'}
MISSING KEYWORDS: ${question.keywords.filter(k => !keywordMatches.includes(k)).join(', ') || 'None'}

Please provide 2-4 specific, actionable suggestions to improve this answer. Focus on:
- Technical accuracy and completeness
- Missing key concepts or terminology
- Areas for more detailed explanation
- Better structure or clarity

Format as a JSON array of strings. Each suggestion should be concise (max 50 words) and actionable.
Example: ["Add more details about X concept", "Explain the relationship between Y and Z", "Include practical examples"]

Return only the JSON array, no other text.`;
            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();
            // Parse the JSON response
            const suggestions = JSON.parse(responseText);
            // Validate that it's an array of strings
            if (!Array.isArray(suggestions) || !suggestions.every(s => typeof s === 'string')) {
                throw new Error('Invalid response format from Gemini');
            }
            return suggestions.slice(0, 4); // Limit to 4 suggestions max
        }
        catch (error) {
            console.error('Error generating AI suggestions:', error);
            // Fallback to a basic suggestion
            return ['Consider providing more detailed explanation of the key concepts'];
        }
    }
    /**
     * Generate detailed feedback based on evaluation results
     */
    async generateFeedback(combinedScore, semanticSimilarity, keywordScore, config, question, userAnswer) {
        let feedback;
        let isCorrect;
        if (combinedScore >= config.excellentThreshold) {
            feedback = '🎯 Excellent answer! You demonstrate a strong understanding of the concept with clear explanations.';
            isCorrect = true;
        }
        else if (combinedScore >= config.goodThreshold) {
            feedback = '👍 Good answer! You covered the main concepts well but could add more detail or clarity.';
            isCorrect = true;
        }
        else if (combinedScore >= config.partialThreshold) {
            feedback = '⚠️ Partially correct. Your answer touches on relevant concepts but misses key details.';
            isCorrect = false;
        }
        else {
            feedback = '❌ The answer appears to be off-topic or missing key concepts. Please review the question carefully.';
            isCorrect = false;
        }
        // Generate AI-powered suggestions
        const suggestions = await this.generateAISuggestions(userAnswer, question, combinedScore, keywordScore.matches);
        return { feedback, isCorrect, suggestions };
    }
    /**
     * Evaluate multiple answers in batch
     */
    async evaluateBatch(evaluations, config) {
        const results = [];
        for (const item of evaluations) {
            try {
                const result = await this.evaluateAnswer(item.questionId, item.userAnswer, config);
                results.push(result);
            }
            catch (error) {
                console.error(`Error evaluating question ${item.questionId}:`, error);
                // Add error result
                results.push({
                    questionId: item.questionId,
                    similarity: 0,
                    score: 1, // Minimum score on 1-10 scale
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
    getQuestion(questionId) {
        return this.questionsWithEmbeddings.get(questionId);
    }
    /**
     * Get all available technical questions (without embeddings for security)
     */
    getAllQuestions() {
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
    getQuestionsByRole(role) {
        return this.getAllQuestions().filter(q => q.role.toLowerCase().includes(role.toLowerCase()));
    }
    /**
     * Get evaluator status and statistics
     */
    getStatus() {
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
let evaluatorInstance = null;
export function getTechnicalEvaluator() {
    if (!evaluatorInstance) {
        evaluatorInstance = new TechnicalQuestionEvaluator();
    }
    return evaluatorInstance;
}
export default TechnicalQuestionEvaluator;
