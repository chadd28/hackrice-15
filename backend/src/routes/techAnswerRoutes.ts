import { Router } from "express";
import { techAnswer } from "../controllers/techAnswerController";

const router = Router();
router.post("/tech-answer", techAnswer);   // POST /api/tech-answer
export default router;
