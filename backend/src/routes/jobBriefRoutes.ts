import { Router } from 'express';
import { jobBrief } from '../controllers/jobBriefController';

const router = Router();

router.post("/job-brief", jobBrief);

export default router;
