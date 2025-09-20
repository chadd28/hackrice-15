import { Router } from 'express';
import { gradeBehavioral, summarizeInterview } from '../controllers/behavGraderController';

const router = Router();

router.post('/grade', gradeBehavioral);
router.post('/summarize', summarizeInterview);

export default router;
