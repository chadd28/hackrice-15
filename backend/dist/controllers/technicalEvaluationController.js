import { getTechnicalEvaluator } from '../services/technicalEvaluatorService';
/**
 * Controller for technical question evaluation using Cohere embeddings
 */
/**
 * Initialize the technical evaluator
 * POST /api/technical/initialize
 */
export const initializeEvaluator = async (req, res) => {
    try {
        const evaluator = getTechnicalEvaluator();
        console.log('🚀 Initializing technical evaluator...');
        await evaluator.initialize();
        const status = evaluator.getStatus();
        res.json({
            success: true,
            message: 'Technical evaluator initialized successfully',
            data: {
                questionCount: status.questionCount,
                embeddingDimension: status.embeddingDimension,
                config: status.config
            }
        });
    }
    catch (error) {
        console.error('❌ Failed to initialize technical evaluator:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize technical evaluator',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
/**
 * Evaluate a single technical answer
 * POST /api/technical/evaluate
 */
export const evaluateTechnicalAnswer = async (req, res) => {
    try {
        const { questionId, userAnswer, config } = req.body;
        // Validation
        if (!questionId || typeof questionId !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'Question ID is required and must be a number',
                error: 'Invalid questionId'
            });
        }
        if (!userAnswer || typeof userAnswer !== 'string' || userAnswer.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'User answer is required and must be a non-empty string',
                error: 'Invalid userAnswer'
            });
        }
        const evaluator = getTechnicalEvaluator();
        // Check if evaluator is initialized
        if (!evaluator.getStatus().isInitialized) {
            return res.status(503).json({
                success: false,
                message: 'Technical evaluator not initialized. Please initialize first.',
                error: 'Service not ready'
            });
        }
        // Evaluate the answer
        const result = await evaluator.evaluateAnswer(questionId, userAnswer.trim(), config);
        res.json({
            success: true,
            message: 'Answer evaluated successfully',
            data: {
                evaluation: result,
                questionId,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('❌ Technical answer evaluation failed:', error);
        if (error instanceof Error && error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
                error: error.message
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to evaluate technical answer',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
/**
 * Evaluate multiple technical answers in batch
 * POST /api/technical/evaluate-batch
 */
export const evaluateBatchTechnicalAnswers = async (req, res) => {
    try {
        const { evaluations, config } = req.body;
        // Validation
        if (!Array.isArray(evaluations) || evaluations.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Evaluations array is required and must not be empty',
                error: 'Invalid evaluations'
            });
        }
        // Validate each evaluation item
        for (let i = 0; i < evaluations.length; i++) {
            const item = evaluations[i];
            if (!item.questionId || typeof item.questionId !== 'number') {
                return res.status(400).json({
                    success: false,
                    message: `Invalid questionId at index ${i}`,
                    error: 'Invalid evaluation item'
                });
            }
            if (!item.userAnswer || typeof item.userAnswer !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: `Invalid userAnswer at index ${i}`,
                    error: 'Invalid evaluation item'
                });
            }
        }
        const evaluator = getTechnicalEvaluator();
        // Check if evaluator is initialized
        if (!evaluator.getStatus().isInitialized) {
            return res.status(503).json({
                success: false,
                message: 'Technical evaluator not initialized. Please initialize first.',
                error: 'Service not ready'
            });
        }
        // Evaluate all answers
        const results = await evaluator.evaluateBatch(evaluations, config);
        // Calculate summary statistics
        const summary = {
            totalQuestions: results.length,
            correctAnswers: results.filter(r => r.isCorrect).length,
            averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
            averageSimilarity: results.reduce((sum, r) => sum + r.similarity, 0) / results.length
        };
        res.json({
            success: true,
            message: 'Batch evaluation completed successfully',
            data: {
                evaluations: results,
                summary,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('❌ Batch technical evaluation failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to evaluate technical answers in batch',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
/**
 * Get a technical question by ID
 * GET /api/technical/questions/:id
 */
export const getTechnicalQuestion = async (req, res) => {
    try {
        const questionId = parseInt(req.params.id);
        if (isNaN(questionId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid question ID',
                error: 'Question ID must be a number'
            });
        }
        const evaluator = getTechnicalEvaluator();
        const question = evaluator.getQuestion(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
                error: `No question found with ID ${questionId}`
            });
        }
        // Return question without embedding for security
        const { embedding, ...questionData } = question;
        res.json({
            success: true,
            message: 'Question retrieved successfully',
            data: questionData
        });
    }
    catch (error) {
        console.error('❌ Failed to get technical question:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve technical question',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
/**
 * Get all technical questions
 * GET /api/technical/questions
 */
export const getAllTechnicalQuestions = async (req, res) => {
    try {
        const { role } = req.query;
        const evaluator = getTechnicalEvaluator();
        let questions;
        if (role && typeof role === 'string') {
            questions = evaluator.getQuestionsByRole(role);
        }
        else {
            questions = evaluator.getAllQuestions();
        }
        res.json({
            success: true,
            message: 'Questions retrieved successfully',
            data: {
                questions,
                total: questions.length,
                role: role || 'all'
            }
        });
    }
    catch (error) {
        console.error('❌ Failed to get technical questions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve technical questions',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
/**
 * Get evaluator status and statistics
 * GET /api/technical/status
 */
export const getEvaluatorStatus = async (req, res) => {
    try {
        const evaluator = getTechnicalEvaluator();
        const status = evaluator.getStatus();
        res.json({
            success: true,
            message: 'Evaluator status retrieved successfully',
            data: {
                ...status,
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('❌ Failed to get evaluator status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve evaluator status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
/**
 * Health check endpoint
 * GET /api/technical/health
 */
export const healthCheck = async (req, res) => {
    try {
        const evaluator = getTechnicalEvaluator();
        const status = evaluator.getStatus();
        res.json({
            success: true,
            message: 'Technical evaluation service is healthy',
            data: {
                service: 'technical-evaluation',
                status: status.isInitialized ? 'ready' : 'initializing',
                questionCount: status.questionCount,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(503).json({
            success: false,
            message: 'Technical evaluation service is unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
