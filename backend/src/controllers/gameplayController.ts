// Bingo gameplay controller
// Spec: 06-bingo-gameplay.md
import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Update cell state (spec 06 - "mark completed / revert to to-complete")
export const updateCellState = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { cellId } = req.params;
    const { state } = req.body;

    // Validate state
    if (!['to_complete', 'completed'].includes(state)) {
      res.status(400).json({ error: 'Invalid state. Must be "to_complete" or "completed"' });
      return;
    }

    // Get cell and verify ownership
    const [cells] = await pool.query(
      `SELECT c.*, bc.user_id, bc.team_id 
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

    // Verify ownership (spec 06 - "Only the card owner can change their card's cell states")
    if (cell.user_id !== req.user.userId) {
      res.status(403).json({ error: 'You can only update your own card' });
      return;
    }

    // Prevent marking empty cells as completed (spec 06 - "empty cells cannot be checked")
    if (cell.is_empty && state === 'completed') {
      res.status(400).json({ error: 'Empty cells cannot be marked as completed' });
      return;
    }

    // Update state
    await pool.query(
      'UPDATE bingo_card_cells SET state = ? WHERE id = ?',
      [state, cellId]
    );

    res.status(200).json({ message: 'Cell state updated successfully' });
  } catch (error) {
    console.error('Update cell state error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
