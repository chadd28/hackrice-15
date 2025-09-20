import { Router } from 'express';
import { testTTS, generateIntroduction, askQuestion } from '../controllers/ttsController';
const router = Router();
// Define the TTS test route
router.get('/test', testTTS);
// Define the introduction generation route
router.post('/introduction', generateIntroduction);
// Define the question TTS route
router.post('/question', askQuestion);
export default router;
