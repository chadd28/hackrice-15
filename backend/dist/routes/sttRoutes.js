import { Router } from 'express';
import { transcribeAudio, transcribeChunk, testSTT } from '../controllers/sttController';
const router = Router();
// Define the STT test route
router.get('/test', testSTT);
// Define the transcription route for full audio
router.post('/transcribe', transcribeAudio);
// Define the chunk transcription route for 30-second chunks
router.post('/transcribe-chunk', transcribeChunk);
export default router;
