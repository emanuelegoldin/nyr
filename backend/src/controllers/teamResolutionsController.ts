// Team-provided resolutions controller
// Spec: 04-bingo-teams.md
import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Create resolution for another team member (spec 04 - "each member can create a resolution for each other member")
export const createTeamProvidedResolution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { teamId } = req.params;
    const { toUserId, text } = req.body;

    if (!toUserId || !text || text.trim().length === 0) {
      res.status(400).json({ error: 'Recipient user ID and resolution text are required' });
      return;
    }

    // Verify team membership
    const [memberships] = await pool.query(
      'SELECT id FROM team_memberships WHERE team_id = ? AND user_id = ?',
      [teamId, req.user.userId]
    );

    if (!Array.isArray(memberships) || memberships.length === 0) {
      res.status(403).json({ error: 'Not a team member' });
      return;
    }

    // Verify recipient is also a team member
    const [recipientMemberships] = await pool.query(
      'SELECT id FROM team_memberships WHERE team_id = ? AND user_id = ?',
      [teamId, toUserId]
    );

    if (!Array.isArray(recipientMemberships) || recipientMemberships.length === 0) {
      res.status(400).json({ error: 'Recipient is not a team member' });
      return;
    }

    // Prevent creating resolution for oneself
    if (req.user.userId === parseInt(toUserId)) {
      res.status(400).json({ error: 'Cannot create resolution for yourself' });
      return;
    }

    // Check if resolution already exists
    const [existing] = await pool.query(
      'SELECT id FROM team_provided_resolutions WHERE team_id = ? AND from_user_id = ? AND to_user_id = ?',
      [teamId, req.user.userId, toUserId]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      // Update existing
      await pool.query(
        'UPDATE team_provided_resolutions SET text = ? WHERE id = ?',
        [text, (existing[0] as any).id]
      );

      res.status(200).json({ message: 'Team resolution updated successfully' });
    } else {
      // Create new
      const [result] = await pool.query(
        'INSERT INTO team_provided_resolutions (team_id, from_user_id, to_user_id, text) VALUES (?, ?, ?, ?)',
        [teamId, req.user.userId, toUserId, text]
      );

      res.status(201).json({
        message: 'Team resolution created successfully',
        resolutionId: (result as any).insertId
      });
    }
  } catch (error) {
    console.error('Create team provided resolution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get resolutions I need to create for team members
export const getResolutionsToCreate = async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Get all team members except self
    const [members] = await pool.query(
      `SELECT u.id, u.username 
       FROM team_memberships tm 
       JOIN users u ON tm.user_id = u.id 
       WHERE tm.team_id = ? AND u.id != ?`,
      [teamId, req.user.userId]
    );

    // Get resolutions already created
    const [createdResolutions] = await pool.query(
      `SELECT to_user_id, text, id 
       FROM team_provided_resolutions 
       WHERE team_id = ? AND from_user_id = ?`,
      [teamId, req.user.userId]
    );

    const createdMap = new Map();
    if (Array.isArray(createdResolutions)) {
      createdResolutions.forEach((r: any) => {
        createdMap.set(r.to_user_id, { text: r.text, id: r.id });
      });
    }

    const membersWithStatus = (members as any[]).map((member: any) => ({
      userId: member.id,
      username: member.username,
      resolutionProvided: createdMap.has(member.id),
      resolutionText: createdMap.get(member.id)?.text || null,
      resolutionId: createdMap.get(member.id)?.id || null
    }));

    res.status(200).json({ members: membersWithStatus });
  } catch (error) {
    console.error('Get resolutions to create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get resolutions created for me
export const getResolutionsForMe = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const [resolutions] = await pool.query(
      `SELECT tpr.*, u.username as from_username 
       FROM team_provided_resolutions tpr 
       JOIN users u ON tpr.from_user_id = u.id 
       WHERE tpr.team_id = ? AND tpr.to_user_id = ?`,
      [teamId, req.user.userId]
    );

    res.status(200).json({ resolutions });
  } catch (error) {
    console.error('Get resolutions for me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
