// Authentication controller
// Spec: 01-authentication.md
import { Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { generateToken } from '../utils/jwt';
import { sendVerificationEmail } from '../utils/email';
import config from '../config';
import { AuthRequest } from '../middleware/auth';

// Register new user (spec 01)
export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  // Validation
  if (!username || !email || !password) {
    res.status(400).json({ error: 'Username, email, and password are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long' });
    return;
  }

  try {
    // Check uniqueness (spec 01)
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      res.status(409).json({ error: 'Email or username already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in non-verified state (spec 01)
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const userId = (result as any).insertId;

    // Create default user profile
    await pool.query(
      'INSERT INTO user_profiles (user_id, privacy_settings) VALUES (?, ?)',
      [userId, JSON.stringify({ first_name: 'private', last_name: 'private', bio: 'private', avatar_url: 'public' })]
    );

    // Generate verification token (spec 01)
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + config.emailVerificationExpiration);

    await pool.query(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );

    // Send verification email (spec 01)
    try {
      await sendVerificationEmail(email, token);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue registration even if email fails
    }

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      userId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify email (spec 01)
export const verifyEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  try {
    // Find valid token (spec 01 - token must expire)
    const [tokens] = await pool.query(
      'SELECT user_id FROM email_verification_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (!Array.isArray(tokens) || tokens.length === 0) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    const { user_id } = tokens[0] as any;

    // Mark user as verified (spec 01)
    await pool.query(
      'UPDATE users SET email_verified_at = NOW() WHERE id = ?',
      [user_id]
    );

    // Delete used token
    await pool.query(
      'DELETE FROM email_verification_tokens WHERE token = ?',
      [token]
    );

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login (spec 01)
export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    res.status(400).json({ error: 'Email/username and password are required' });
    return;
  }

  try {
    // Find user (spec 01)
    const [users] = await pool.query(
      'SELECT id, username, email, password_hash, email_verified_at FROM users WHERE email = ? OR username = ?',
      [emailOrUsername, emailOrUsername]
    );

    if (!Array.isArray(users) || users.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = users[0] as any;

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check email verification (implementation choice: require verification)
    if (!user.email_verified_at) {
      res.status(403).json({ error: 'Please verify your email before logging in' });
      return;
    }

    // Generate JWT token (spec 01)
    const token = generateToken({ userId: user.id, email: user.email });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user profile
export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const [users] = await pool.query(
      'SELECT id, username, email, email_verified_at, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!Array.isArray(users) || users.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user: users[0] });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
