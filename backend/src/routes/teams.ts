// Teams routes
import express from 'express';
import {
  createTeam,
  setTeamResolution,
  createInvitation,
  joinTeam,
  getMyTeams,
  getTeam
} from '../controllers/teamsController';
import {
  createTeamProvidedResolution,
  getResolutionsToCreate,
  getResolutionsForMe
} from '../controllers/teamResolutionsController';
import {
  startBingoGame,
  getMyBingoCard,
  getUserBingoCard,
  getTeamBingoCards
} from '../controllers/bingoGameController';
import { updateCellState } from '../controllers/gameplayController';
import {
  submitProof,
  getCellProofs,
  approveProof,
  declineProof,
  upload
} from '../controllers/proofsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Team management
router.post('/', authenticate, createTeam);
router.get('/', authenticate, getMyTeams);
router.get('/:teamId', authenticate, getTeam);
router.put('/:teamId/resolution', authenticate, setTeamResolution);

// Invitations
router.post('/:teamId/invitations', authenticate, createInvitation);
router.post('/join', authenticate, joinTeam);

// Team-provided resolutions
router.post('/:teamId/provided-resolutions', authenticate, createTeamProvidedResolution);
router.get('/:teamId/provided-resolutions/to-create', authenticate, getResolutionsToCreate);
router.get('/:teamId/provided-resolutions/for-me', authenticate, getResolutionsForMe);

// Bingo game
router.post('/:teamId/start-bingo', authenticate, startBingoGame);
router.get('/:teamId/my-card', authenticate, getMyBingoCard);
router.get('/:teamId/cards', authenticate, getTeamBingoCards);
router.get('/:teamId/cards/:userId', authenticate, getUserBingoCard);

// Gameplay
router.put('/cells/:cellId/state', authenticate, updateCellState);

// Proofs
router.post('/cells/:cellId/proofs', authenticate, upload.single('proof'), submitProof);
router.get('/cells/:cellId/proofs', authenticate, getCellProofs);
router.put('/proofs/:proofId/approve', authenticate, approveProof);
router.put('/proofs/:proofId/decline', authenticate, declineProof);

export default router;
