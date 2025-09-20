import { Router } from 'express';
import { transcribeAudio, testSTT } from '../controllers/sttController';

const router = Router();

// Define the STT test route
router.get('/test', testSTT);

// Define the transcription route
router.post('/transcribe', transcribeAudio);

export default router;
