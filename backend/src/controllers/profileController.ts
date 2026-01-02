// User profile controller
// Spec: 02-user-profile-and-privacy.md
import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get own profile (spec 02)
export const getOwnProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const [profiles] = await pool.query(
      `SELECT up.*, u.username, u.email 
       FROM user_profiles up 
       JOIN users u ON up.user_id = u.id 
       WHERE up.user_id = ?`,
      [req.user.userId]
    );

    if (!Array.isArray(profiles) || profiles.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const profile = profiles[0] as any;
    res.status(200).json({ profile });
  } catch (error) {
    console.error('Get own profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update own profile (spec 02 - "Only the profile owner can edit their profile")
export const updateOwnProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { first_name, last_name, bio, avatar_url } = req.body;

    await pool.query(
      `UPDATE user_profiles 
       SET first_name = ?, last_name = ?, bio = ?, avatar_url = ? 
       WHERE user_id = ?`,
      [first_name, last_name, bio, avatar_url, req.user.userId]
    );

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update privacy settings (spec 02 - "User can mark profile fields as public or private")
export const updatePrivacySettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { privacy_settings } = req.body;

    // Validate privacy settings structure
    const validFields = ['first_name', 'last_name', 'bio', 'avatar_url'];
    const settings = privacy_settings || {};
    
    for (const key of Object.keys(settings)) {
      if (!validFields.includes(key)) {
        res.status(400).json({ error: `Invalid field: ${key}` });
        return;
      }
      if (!['public', 'private'].includes(settings[key])) {
        res.status(400).json({ error: `Invalid value for ${key}: must be 'public' or 'private'` });
        return;
      }
    }

    await pool.query(
      'UPDATE user_profiles SET privacy_settings = ? WHERE user_id = ?',
      [JSON.stringify(settings), req.user.userId]
    );

    res.status(200).json({ message: 'Privacy settings updated successfully' });
  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get another user's profile (spec 02 - "When viewing another user's profile, only public fields are shown")
export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const [profiles] = await pool.query(
      `SELECT up.*, u.username 
       FROM user_profiles up 
       JOIN users u ON up.user_id = u.id 
       WHERE up.user_id = ?`,
      [userId]
    );

    if (!Array.isArray(profiles) || profiles.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const profile = profiles[0] as any;
    const privacySettings = JSON.parse(profile.privacy_settings || '{}');

    // Filter out private fields
    const publicProfile: any = {
      user_id: profile.user_id,
      username: profile.username
    };

    if (privacySettings.first_name !== 'private') {
      publicProfile.first_name = profile.first_name;
    }
    if (privacySettings.last_name !== 'private') {
      publicProfile.last_name = profile.last_name;
    }
    if (privacySettings.bio !== 'private') {
      publicProfile.bio = profile.bio;
    }
    if (privacySettings.avatar_url !== 'private') {
      publicProfile.avatar_url = profile.avatar_url;
    }

    res.status(200).json({ profile: publicProfile });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
