// Personal resolutions controller
// Spec: 03-personal-resolutions.md
import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Create resolution (spec 03)
export const createResolution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { text } = req.body;

    // Validation (spec 03 - "Resolution text must be non-empty")
    if (!text || text.trim().length === 0) {
      res.status(400).json({ error: 'Resolution text cannot be empty' });
      return;
    }

    if (text.length > 500) {
      res.status(400).json({ error: 'Resolution text is too long (max 500 characters)' });
      return;
    }

    const [result] = await pool.query(
      'INSERT INTO personal_resolutions (user_id, text) VALUES (?, ?)',
      [req.user.userId, text]
    );

    const resolutionId = (result as any).insertId;

    res.status(201).json({
      message: 'Resolution created successfully',
      resolutionId
    });
  } catch (error) {
    console.error('Create resolution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// List own resolutions (spec 03)
export const listResolutions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const [resolutions] = await pool.query(
      'SELECT id, text, created_at, updated_at FROM personal_resolutions WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );

    res.status(200).json({ resolutions });
  } catch (error) {
    console.error('List resolutions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single resolution (spec 03)
export const getResolution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;

    const [resolutions] = await pool.query(
      'SELECT id, text, created_at, updated_at FROM personal_resolutions WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (!Array.isArray(resolutions) || resolutions.length === 0) {
      res.status(404).json({ error: 'Resolution not found' });
      return;
    }

    res.status(200).json({ resolution: resolutions[0] });
  } catch (error) {
    console.error('Get resolution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update resolution (spec 03 - "Only the resolution owner can create/update/delete their own resolutions")
export const updateResolution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      res.status(400).json({ error: 'Resolution text cannot be empty' });
      return;
    }

    if (text.length > 500) {
      res.status(400).json({ error: 'Resolution text is too long (max 500 characters)' });
      return;
    }

    // Verify ownership before update
    const [resolutions] = await pool.query(
      'SELECT id FROM personal_resolutions WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (!Array.isArray(resolutions) || resolutions.length === 0) {
      res.status(404).json({ error: 'Resolution not found or unauthorized' });
      return;
    }

    await pool.query(
      'UPDATE personal_resolutions SET text = ? WHERE id = ?',
      [text, id]
    );

    res.status(200).json({ message: 'Resolution updated successfully' });
  } catch (error) {
    console.error('Update resolution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete resolution (spec 03)
export const deleteResolution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;

    // Verify ownership before delete
    const [resolutions] = await pool.query(
      'SELECT id FROM personal_resolutions WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (!Array.isArray(resolutions) || resolutions.length === 0) {
      res.status(404).json({ error: 'Resolution not found or unauthorized' });
      return;
    }

    await pool.query(
      'DELETE FROM personal_resolutions WHERE id = ?',
      [id]
    );

    res.status(200).json({ message: 'Resolution deleted successfully' });
  } catch (error) {
    console.error('Delete resolution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
