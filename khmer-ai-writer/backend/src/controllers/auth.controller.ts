import { Request, Response } from 'express';
import { pool } from '../services/core/database.service';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { config } from '../config/env';
import { emailService } from '../services/core/email.service';
import { usageService } from '../services/usage/usage.service';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    const tier = 'free';
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    const tierLimits = usageService.getTierLimits(tier);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (
        email, password_hash, full_name, tier,
        api_calls_limit, storage_limit, usage_reset_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, email, full_name, tier, created_at`,
      [
        email,
        passwordHash,
        name,
        tier,
        tierLimits.apiCallsLimit,
        tierLimits.storageLimit
      ]
    );
    
    const user = result.rows[0];
    
    // Generate token
    const token = jwt.sign(
      { sub: user.id, email: user.email, tier: user.tier },
      config.jwt.accessSecret,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({ 
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        tier: user.tier,
        createdAt: user.created_at
      }, 
      token, 
      message: 'Registration successful. All new accounts start on the Free plan; upgrade once you log in.'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({ error: errorMessage });
  }
};



export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { sub: user.id, email: user.email, tier: user.tier },
      config.jwt.accessSecret,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        tier: user.tier,
        createdAt: user.created_at
      }, 
      token, 
      message: 'Login successful' 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: errorMessage });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const result = await pool.query('SELECT id, email, full_name FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'If that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token (32 random bytes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in database
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    // Send email with reset link
    await emailService.sendPasswordResetEmail(
      user.email,
      user.full_name || 'User',
      resetToken
    );

    res.json({ 
      success: true, 
      message: 'If that email exists, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash the token to compare with database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid token
    const tokenResult = await pool.query(
      `SELECT rt.id, rt.user_id, u.email, u.full_name 
       FROM password_reset_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 
         AND rt.expires_at > NOW() 
         AND rt.used = FALSE`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const tokenData = tokenResult.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, tokenData.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE, used_at = NOW() WHERE id = $1',
      [tokenData.id]
    );

    // Send confirmation email
    await emailService.sendPasswordChangeConfirmation(
      tokenData.email,
      tokenData.full_name || 'User'
    );

    res.json({ 
      success: true, 
      message: 'Password has been reset successfully' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export default { register, login, getProfile, forgotPassword, resetPassword };
