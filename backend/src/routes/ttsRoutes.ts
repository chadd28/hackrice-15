import { Router } from 'express';
import { testTTS } from '../controllers/ttsController';

const router = Router();

// Define the TTS test route
router.get('/test', testTTS);

export default router;
