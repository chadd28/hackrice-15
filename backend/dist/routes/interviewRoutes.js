import { Router } from 'express';
import { uploadText, uploadUrl, uploadFile, getSession, updateSession, uploadMiddleware } from '../controllers/uploadController';
import { generateQuestions } from '../controllers/geminiController';
<<<<<<< HEAD
import { selectTechnicalQuestions } from '../controllers/technicalSelectorController';
=======
>>>>>>> fb71cdf (Add multi modal video analysis)
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
<<<<<<< HEAD
// Select two technical questions tailored to the provided job description
router.post('/select-technical-questions', selectTechnicalQuestions);
=======
>>>>>>> fb71cdf (Add multi modal video analysis)
/**
 * Session management routes
 */
// Get session data
router.get('/session/:sessionId', getSession);
// Update session data
router.put('/session/:sessionId', updateSession);
export default router;
