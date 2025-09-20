import { Router } from 'express';
import { uploadText, uploadUrl, uploadFile, getSession, updateSession, uploadMiddleware } from '../controllers/uploadController';
import { generateQuestions } from '../controllers/geminiController';

const router = Router();

/**
 * Upload routes for different content types
 */

// Text upload endpoint
router.post('/upload/text', uploadText);

// URL upload endpoint  
router.post('/upload/url', uploadUrl);

// File upload endpoint with multer middleware for PDF processing
router.post('/upload/file', uploadMiddleware, uploadFile);

/**
 * Question generation route
 */
router.post('/generate-questions', generateQuestions);

/**
 * Session management routes
 */

// Get session data
router.get('/session/:sessionId', getSession);

// Update session data
router.put('/session/:sessionId', updateSession);

export default router;