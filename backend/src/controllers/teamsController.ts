// Teams controller
// Spec: 04-bingo-teams.md
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Create team (spec 04 - "A user can create a team and becomes team leader")
export const createTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: 'Team name is required' });
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Create team
      const [teamResult] = await connection.query(
        'INSERT INTO teams (name, leader_user_id) VALUES (?, ?)',
        [name, req.user.userId]
      );

      const teamId = (teamResult as any).insertId;

      // Add leader as member
      await connection.query(
        'INSERT INTO team_memberships (team_id, user_id, role) VALUES (?, ?, ?)',
        [teamId, req.user.userId, 'leader']
      );

      await connection.commit();

      res.status(201).json({
        message: 'Team created successfully',
        teamId
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Set team resolution (spec 04 - "Team leader sets one team resolution text")
export const setTeamResolution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { teamId } = req.params;
    const { resolutionText } = req.body;

    if (!resolutionText || resolutionText.trim().length === 0) {
      res.status(400).json({ error: 'Team resolution text is required' });
      return;
    }

    // Verify team leader (spec 04 - "Only team leader: set team resolution")
    const [teams] = await pool.query(
      'SELECT id FROM teams WHERE id = ? AND leader_user_id = ?',
      [teamId, req.user.userId]
    );

    if (!Array.isArray(teams) || teams.length === 0) {
      res.status(403).json({ error: 'Only team leader can set team resolution' });
      return;
    }

    await pool.query(
      'UPDATE teams SET team_resolution_text = ? WHERE id = ?',
      [resolutionText, teamId]
    );

    res.status(200).json({ message: 'Team resolution set successfully' });
  } catch (error) {
    console.error('Set team resolution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create invitation (spec 04 - "Team leader can invite users")
export const createInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { teamId } = req.params;
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Verify team leader
    const [teams] = await pool.query(
      'SELECT id FROM teams WHERE id = ? AND leader_user_id = ?',
      [teamId, req.user.userId]
    );

    if (!Array.isArray(teams) || teams.length === 0) {
      res.status(403).json({ error: 'Only team leader can invite users' });
      return;
    }

    // Generate invite code
    const inviteCode = uuidv4();

    await pool.query(
      'INSERT INTO team_invitations (team_id, invited_email, invite_code) VALUES (?, ?, ?)',
      [teamId, email, inviteCode]
    );

    res.status(201).json({
      message: 'Invitation created successfully',
      inviteCode
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Join team with invite code (spec 04 - "Invited users can accept/join the team")
export const joinTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { inviteCode } = req.body;

    if (!inviteCode) {
      res.status(400).json({ error: 'Invite code is required' });
      return;
    }

    // Get user email
    const [users] = await pool.query(
      'SELECT email FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!Array.isArray(users) || users.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userEmail = (users[0] as any).email;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Find pending invitation
      const [invitations] = await connection.query(
        'SELECT team_id FROM team_invitations WHERE invite_code = ? AND invited_email = ? AND status = ?',
        [inviteCode, userEmail, 'pending']
      );

      if (!Array.isArray(invitations) || invitations.length === 0) {
        res.status(404).json({ error: 'Invalid or expired invitation' });
        await connection.rollback();
        return;
      }

      const teamId = (invitations[0] as any).team_id;

      // Check if already a member
      const [existing] = await connection.query(
        'SELECT id FROM team_memberships WHERE team_id = ? AND user_id = ?',
        [teamId, req.user.userId]
      );

      if (Array.isArray(existing) && existing.length > 0) {
        res.status(400).json({ error: 'Already a team member' });
        await connection.rollback();
        return;
      }

      // Add as member
      await connection.query(
        'INSERT INTO team_memberships (team_id, user_id, role) VALUES (?, ?, ?)',
        [teamId, req.user.userId, 'member']
      );

      // Mark invitation as accepted
      await connection.query(
        'UPDATE team_invitations SET status = ? WHERE invite_code = ?',
        ['accepted', inviteCode]
      );

      await connection.commit();

      res.status(200).json({
        message: 'Successfully joined team',
        teamId
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get teams for current user
export const getMyTeams = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const [teams] = await pool.query(
      `SELECT t.*, tm.role 
       FROM teams t 
       JOIN team_memberships tm ON t.id = tm.team_id 
       WHERE tm.user_id = ? 
       ORDER BY t.created_at DESC`,
      [req.user.userId]
    );

    res.status(200).json({ teams });
  } catch (error) {
    console.error('Get my teams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get team details
export const getTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { teamId } = req.params;

    // Verify membership
    const [memberships] = await pool.query(
      'SELECT role FROM team_memberships WHERE team_id = ? AND user_id = ?',
      [teamId, req.user.userId]
    );

    if (!Array.isArray(memberships) || memberships.length === 0) {
      res.status(403).json({ error: 'Not a team member' });
      return;
    }

    const [teams] = await pool.query(
      'SELECT * FROM teams WHERE id = ?',
      [teamId]
    );

    if (!Array.isArray(teams) || teams.length === 0) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    // Get team members
    const [members] = await pool.query(
      `SELECT u.id, u.username, tm.role, tm.joined_at 
       FROM team_memberships tm 
       JOIN users u ON tm.user_id = u.id 
       WHERE tm.team_id = ?`,
      [teamId]
    );

    res.status(200).json({
      team: teams[0],
      members,
      myRole: (memberships[0] as any).role
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
