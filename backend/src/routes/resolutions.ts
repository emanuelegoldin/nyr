// Personal resolutions routes
import express from 'express';
import {
  createResolution,
  listResolutions,
  getResolution,
  updateResolution,
  deleteResolution
} from '../controllers/resolutionsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticate, createResolution);
router.get('/', authenticate, listResolutions);
router.get('/:id', authenticate, getResolution);
router.put('/:id', authenticate, updateResolution);
router.delete('/:id', authenticate, deleteResolution);

export default router;
