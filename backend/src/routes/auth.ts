// Authentication routes
import express from 'express';
import { register, verifyEmail, login, getCurrentUser } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);

export default router;
