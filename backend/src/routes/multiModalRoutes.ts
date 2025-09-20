import express from 'express';
import { analyzeMultiModal, testMultiModalSetup } from '../controllers/multiModalController';

/**
 * Multi-Modal Sentiment Analysis Routes
 * 
 * Provides endpoints for comprehensive sentiment analysis combining:
 * - Audio analysis (speech patterns, tone, pace)
 * - Visual analysis (facial expressions, body language)
 * - Text analysis (word choice, communication style)
 */

const router = express.Router();

/**
 * POST /api/multi-modal/analyze
 * 
 * Main endpoint for multi-modal sentiment analysis
 * 
 * Request body:
 * - audioContent?: string (base64 encoded audio)
 * - imageData?: string (base64 encoded image)
 * - transcriptText?: string (text to analyze)
 * 
 * Response:
 * - overallConfidence: number
 * - personalityTraits: object with various trait scores
 * - audioSentiment: detailed audio analysis
 * - visualSentiment: detailed visual analysis
 * - textSentiment: detailed text analysis
 * - recommendations: array of improvement suggestions
 */
router.post('/analyze', analyzeMultiModal);

/**
 * GET /api/multi-modal/test
 * 
 * Health check endpoint to verify API configuration
 * Tests availability of required Google Cloud API keys
 */
router.get('/test', testMultiModalSetup);

export default router;