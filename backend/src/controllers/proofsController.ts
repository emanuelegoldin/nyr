// Proof submission and approval controller
// Spec: 07-proof-and-approval.md
import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import config from '../config';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = config.uploadsDir;
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Accept images only
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Submit proof for a cell (spec 07 - "A user can attach proof to a specific resolution cell")
export const submitProof = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { cellId } = req.params;

    // Get cell and verify ownership
    const [cells] = await pool.query(
      `SELECT c.*, bc.user_id 
       FROM bingo_card_cells c 
       JOIN bingo_cards bc ON c.card_id = bc.id 
       WHERE c.id = ?`,
      [cellId]
    );

    if (!Array.isArray(cells) || cells.length === 0) {
      res.status(404).json({ error: 'Cell not found' });
      return;
    }

    const cell = cells[0] as any;

    // Verify ownership (spec 07 - "Only the card owner can upload proof")
    if (cell.user_id !== req.user.userId) {
      res.status(403).json({ error: 'You can only submit proof for your own card' });
      return;
    }

    // Create proof record
    await pool.query(
      'INSERT INTO proofs (cell_id, file_path, file_type, status) VALUES (?, ?, ?, ?)',
      [cellId, req.file.path, req.file.mimetype, 'pending']
    );

    res.status(201).json({
      message: 'Proof submitted successfully',
      filePath: req.file.path
    });
  } catch (error) {
    console.error('Submit proof error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get proofs for a cell
export const getCellProofs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { cellId } = req.params;

    // Verify team membership for the cell
    const [cells] = await pool.query(
      `SELECT c.*, bc.team_id 
       FROM bingo_card_cells c 
       JOIN bingo_cards bc ON c.card_id = bc.id 
       WHERE c.id = ?`,
      [cellId]
    );

    if (!Array.isArray(cells) || cells.length === 0) {
      res.status(404).json({ error: 'Cell not found' });
      return;
    }

    const cell = cells[0] as any;

    const [memberships] = await pool.query(
      'SELECT id FROM team_memberships WHERE team_id = ? AND user_id = ?',
      [cell.team_id, req.user.userId]
    );

    if (!Array.isArray(memberships) || memberships.length === 0) {
      res.status(403).json({ error: 'Not a team member' });
      return;
    }

    // Get proofs
    const [proofs] = await pool.query(
      `SELECT p.*, u.username as reviewed_by_username 
       FROM proofs p 
       LEFT JOIN users u ON p.reviewed_by_user_id = u.id 
       WHERE p.cell_id = ? 
       ORDER BY p.uploaded_at DESC`,
      [cellId]
    );

    res.status(200).json({ proofs });
  } catch (error) {
    console.error('Get cell proofs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve proof (spec 07 - "A reviewer can approve")
export const approveProof = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { proofId } = req.params;

    // Get proof and verify team membership
    const [proofs] = await pool.query(
      `SELECT p.*, bc.user_id as card_owner_id, bc.team_id 
       FROM proofs p 
       JOIN bingo_card_cells c ON p.cell_id = c.id 
       JOIN bingo_cards bc ON c.card_id = bc.id 
       WHERE p.id = ?`,
      [proofId]
    );

    if (!Array.isArray(proofs) || proofs.length === 0) {
      res.status(404).json({ error: 'Proof not found' });
      return;
    }

    const proof = proofs[0] as any;

    // Verify team membership (spec 07 - "Only team members can approve/decline")
    const [memberships] = await pool.query(
      'SELECT id FROM team_memberships WHERE team_id = ? AND user_id = ?',
      [proof.team_id, req.user.userId]
    );

    if (!Array.isArray(memberships) || memberships.length === 0) {
      res.status(403).json({ error: 'Not a team member' });
      return;
    }

    // Prevent reviewing own proof
    if (proof.card_owner_id === req.user.userId) {
      res.status(400).json({ error: 'Cannot review your own proof' });
      return;
    }

    // Update proof status
    await pool.query(
      'UPDATE proofs SET status = ?, reviewed_at = NOW(), reviewed_by_user_id = ? WHERE id = ?',
      ['approved', req.user.userId, proofId]
    );

    res.status(200).json({ message: 'Proof approved successfully' });
  } catch (error) {
    console.error('Approve proof error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Decline proof (spec 07 - "Decline requires a comment")
export const declineProof = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { proofId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim().length === 0) {
      res.status(400).json({ error: 'Comment is required when declining proof' });
      return;
    }

    // Get proof and verify team membership
    const [proofs] = await pool.query(
      `SELECT p.*, bc.user_id as card_owner_id, bc.team_id 
       FROM proofs p 
       JOIN bingo_card_cells c ON p.cell_id = c.id 
       JOIN bingo_cards bc ON c.card_id = bc.id 
       WHERE p.id = ?`,
      [proofId]
    );

    if (!Array.isArray(proofs) || proofs.length === 0) {
      res.status(404).json({ error: 'Proof not found' });
      return;
    }

    const proof = proofs[0] as any;

    // Verify team membership
    const [memberships] = await pool.query(
      'SELECT id FROM team_memberships WHERE team_id = ? AND user_id = ?',
      [proof.team_id, req.user.userId]
    );

    if (!Array.isArray(memberships) || memberships.length === 0) {
      res.status(403).json({ error: 'Not a team member' });
      return;
    }

    // Prevent reviewing own proof
    if (proof.card_owner_id === req.user.userId) {
      res.status(400).json({ error: 'Cannot review your own proof' });
      return;
    }

    // Update proof status with comment
    await pool.query(
      'UPDATE proofs SET status = ?, reviewed_at = NOW(), reviewed_by_user_id = ?, review_comment = ? WHERE id = ?',
      ['declined', req.user.userId, comment, proofId]
    );

    res.status(200).json({ message: 'Proof declined successfully' });
  } catch (error) {
    console.error('Decline proof error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
