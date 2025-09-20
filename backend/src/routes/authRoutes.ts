import { Router } from 'express';
import { register, login, validateToken } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/validate', authMiddleware, validateToken);

export default router;
