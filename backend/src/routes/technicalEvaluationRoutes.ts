import { Router } from 'express';
import {
  initializeEvaluator,
  evaluateTechnicalAnswer,
  evaluateBatchTechnicalAnswers,
  getTechnicalQuestion,
  getAllTechnicalQuestions,
  getEvaluatorStatus,
  healthCheck
} from '../controllers/technicalEvaluationController';

const router = Router();

/**
 * Technical Question Evaluation Routes
 * Base path: /api/technical
 */

// Health check
router.get('/health', healthCheck);

// Evaluator management
router.post('/initialize', initializeEvaluator);
router.get('/status', getEvaluatorStatus);

// Question management
router.get('/questions', getAllTechnicalQuestions);
router.get('/questions/:id', getTechnicalQuestion);

// Answer evaluation
router.post('/evaluate', evaluateTechnicalAnswer);
router.post('/evaluate-batch', evaluateBatchTechnicalAnswers);

export default router;