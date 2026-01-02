// Profile routes
import express from 'express';
import { getOwnProfile, updateOwnProfile, updatePrivacySettings, getUserProfile } from '../controllers/profileController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/me', authenticate, getOwnProfile);
router.put('/me', authenticate, updateOwnProfile);
router.put('/me/privacy', authenticate, updatePrivacySettings);
router.get('/:userId', authenticate, getUserProfile);

export default router;
