// Bingo game controller
// Spec: 05-bingo-card-generation.md, 06-bingo-gameplay.md
import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Start bingo game (spec 04 - "Leader cannot start until all required member-provided resolutions exist")
export const startBingoGame = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { teamId } = req.params;

    // Verify team leader
    const [teams] = await pool.query(
      'SELECT id, status, team_resolution_text FROM teams WHERE id = ? AND leader_user_id = ?',
      [teamId, req.user.userId]
    );

    if (!Array.isArray(teams) || teams.length === 0) {
      res.status(403).json({ error: 'Only team leader can start the game' });
      return;
    }

    const team = teams[0] as any;

    if (team.status === 'started') {
      res.status(400).json({ error: 'Game already started' });
      return;
    }

    if (!team.team_resolution_text) {
      res.status(400).json({ error: 'Team resolution must be set before starting' });
      return;
    }

    // Get all team members
    const [members] = await pool.query(
      'SELECT user_id FROM team_memberships WHERE team_id = ?',
      [teamId]
    );

    if (!Array.isArray(members) || members.length < 2) {
      res.status(400).json({ error: 'Need at least 2 team members to start' });
      return;
    }

    const memberIds = (members as any[]).map(m => m.user_id);

    // Check if all members created resolutions for all other members (spec 04)
    // For each member, they should have created N-1 resolutions (one for each other member)
    for (const memberId of memberIds) {
      const expectedCount = memberIds.filter(id => id !== memberId).length;
      
      const [providedResolutions] = await pool.query(
        'SELECT COUNT(*) as count FROM team_provided_resolutions WHERE team_id = ? AND from_user_id = ?',
        [teamId, memberId]
      );

      const actualCount = (providedResolutions as any[])[0].count;
      
      if (actualCount < expectedCount) {
        res.status(400).json({
          error: 'All team members must create resolutions for all other members before starting',
          details: `Member ${memberId} has only created ${actualCount} of ${expectedCount} required resolutions`
        });
        return;
      }
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Generate bingo card for each member (spec 05)
      for (const memberId of memberIds) {
        await generateBingoCard(connection, parseInt(teamId), memberId, team.team_resolution_text);
      }

      // Update team status to started
      await connection.query(
        'UPDATE teams SET status = ? WHERE id = ?',
        ['started', teamId]
      );

      await connection.commit();

      res.status(200).json({ message: 'Bingo game started successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Start bingo game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate bingo card for a user (spec 05)
async function generateBingoCard(connection: any, teamId: number, userId: number, teamResolution: string): Promise<void> {
  const gridSize = 5;
  
  // Create card
  const [cardResult] = await connection.query(
    'INSERT INTO bingo_cards (team_id, user_id, grid_size) VALUES (?, ?, ?)',
    [teamId, userId, gridSize]
  );
  
  const cardId = cardResult.insertId;

  // Get member-provided resolutions for this user
  const [providedResolutions] = await connection.query(
    'SELECT id, text FROM team_provided_resolutions WHERE team_id = ? AND to_user_id = ?',
    [teamId, userId]
  );

  // Get personal resolutions as fallback
  const [personalResolutions] = await connection.query(
    'SELECT id, text FROM personal_resolutions WHERE user_id = ?',
    [userId]
  );

  // Build resolution pool (spec 05 - prioritize team-provided, then personal)
  const resolutionPool: Array<{ text: string; sourceType: string; sourceId: number | null }> = [];
  
  if (Array.isArray(providedResolutions)) {
    providedResolutions.forEach((r: any) => {
      resolutionPool.push({ text: r.text, sourceType: 'team_provided', sourceId: r.id });
    });
  }
  
  if (Array.isArray(personalResolutions)) {
    personalResolutions.forEach((r: any) => {
      resolutionPool.push({ text: r.text, sourceType: 'personal', sourceId: r.id });
    });
  }

  // Shuffle resolution pool
  for (let i = resolutionPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resolutionPool[i], resolutionPool[j]] = [resolutionPool[j], resolutionPool[i]];
  }

  const totalCells = gridSize * gridSize;
  const centerRow = Math.floor(gridSize / 2);
  const centerCol = Math.floor(gridSize / 2);
  let resolutionIndex = 0;

  // Fill cells (spec 05)
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      let cellData: any = {
        card_id: cardId,
        row_num: row,
        col_num: col
      };

      // Center cell is joker (spec 05)
      if (row === centerRow && col === centerCol) {
        cellData.resolution_text = teamResolution;
        cellData.is_joker = true;
        cellData.source_type = 'team_resolution';
        cellData.source_resolution_id = null;
      } else {
        // Fill with resolutions from pool or empty
        if (resolutionIndex < resolutionPool.length) {
          const resolution = resolutionPool[resolutionIndex];
          cellData.resolution_text = resolution.text;
          cellData.is_empty = false;
          cellData.source_type = resolution.sourceType;
          cellData.source_resolution_id = resolution.sourceId;
          resolutionIndex++;
        } else {
          // Fill with "empty" if not enough resolutions (spec 05)
          cellData.resolution_text = '[Empty]';
          cellData.is_empty = true;
          cellData.source_type = null;
          cellData.source_resolution_id = null;
        }
      }

      await connection.query(
        `INSERT INTO bingo_card_cells 
         (card_id, row_num, col_num, resolution_text, is_joker, is_empty, source_type, source_resolution_id, state) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cellData.card_id,
          cellData.row_num,
          cellData.col_num,
          cellData.resolution_text,
          cellData.is_joker || false,
          cellData.is_empty || false,
          cellData.source_type,
          cellData.source_resolution_id,
          'to_complete'
        ]
      );
    }
  }
}

// Get my bingo card (spec 06, 08)
export const getMyBingoCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { teamId } = req.params;

    // Verify team membership
    const [memberships] = await pool.query(
      'SELECT id FROM team_memberships WHERE team_id = ? AND user_id = ?',
      [teamId, req.user.userId]
    );

    if (!Array.isArray(memberships) || memberships.length === 0) {
      res.status(403).json({ error: 'Not a team member' });
      return;
    }

    // Get card
    const [cards] = await pool.query(
      'SELECT * FROM bingo_cards WHERE team_id = ? AND user_id = ?',
      [teamId, req.user.userId]
    );

    if (!Array.isArray(cards) || cards.length === 0) {
      res.status(404).json({ error: 'Bingo card not found. Game may not have started yet.' });
      return;
    }

    const card = cards[0] as any;

    // Get cells
    const [cells] = await pool.query(
      'SELECT * FROM bingo_card_cells WHERE card_id = ? ORDER BY row_num, col_num',
      [card.id]
    );

    res.status(200).json({
      card: {
        id: card.id,
        teamId: card.team_id,
        userId: card.user_id,
        gridSize: card.grid_size,
        cells
      }
    });
  } catch (error) {
    console.error('Get my bingo card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get another user's bingo card (spec 08 - "A team member can view the bingo cards of other members")
export const getUserBingoCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { teamId, userId } = req.params;

    // Verify team membership
    const [memberships] = await pool.query(
      'SELECT id FROM team_memberships WHERE team_id = ? AND user_id = ?',
      [teamId, req.user.userId]
    );

    if (!Array.isArray(memberships) || memberships.length === 0) {
      res.status(403).json({ error: 'Not a team member' });
      return;
    }

    // Get card
    const [cards] = await pool.query(
      'SELECT * FROM bingo_cards WHERE team_id = ? AND user_id = ?',
      [teamId, userId]
    );

    if (!Array.isArray(cards) || cards.length === 0) {
      res.status(404).json({ error: 'Bingo card not found' });
      return;
    }

    const card = cards[0] as any;

    // Get cells
    const [cells] = await pool.query(
      'SELECT * FROM bingo_card_cells WHERE card_id = ? ORDER BY row_num, col_num',
      [card.id]
    );

    res.status(200).json({
      card: {
        id: card.id,
        teamId: card.team_id,
        userId: card.user_id,
        gridSize: card.grid_size,
        cells
      }
    });
  } catch (error) {
    console.error('Get user bingo card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all cards for a team (spec 08)
export const getTeamBingoCards = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { teamId } = req.params;

    // Verify team membership
    const [memberships] = await pool.query(
      'SELECT id FROM team_memberships WHERE team_id = ? AND user_id = ?',
      [teamId, req.user.userId]
    );

    if (!Array.isArray(memberships) || memberships.length === 0) {
      res.status(403).json({ error: 'Not a team member' });
      return;
    }

    // Get all cards with user info
    const [cards] = await pool.query(
      `SELECT bc.*, u.username 
       FROM bingo_cards bc 
       JOIN users u ON bc.user_id = u.id 
       WHERE bc.team_id = ?`,
      [teamId]
    );

    res.status(200).json({ cards });
  } catch (error) {
    console.error('Get team bingo cards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
