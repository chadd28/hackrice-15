import { Router } from 'express';
import { gradeBehavioral } from '../controllers/behavGraderController';
const router = Router();
router.post('/grade', gradeBehavioral);
export default router;
