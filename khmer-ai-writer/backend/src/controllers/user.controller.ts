import { Request, Response } from 'express';
import { pool } from '../services/core/database.service';
import { emailService } from '../services/core/email.service';
import { usageService } from '../services/usage/usage.service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    tier: string;
  };
}

class UserController {
  
  /**
   * Get user metrics including subscription usage
   */
  async getMetrics(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id || req.user!.userId;

      // Get user with subscription data from users table
      // Keep query compatible with demo schema (no deleted_at column)
      const userQuery = `
        SELECT id, email, full_name, tier
        FROM users
        WHERE id = $1
      `;
      const userResult = await pool.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = userResult.rows[0];

      // Get API key usage
      const apiKeyQuery = `
        SELECT 
          COUNT(*) as total_keys,
          COALESCE(SUM(CASE WHEN last_used_at IS NOT NULL THEN 1 ELSE 0 END), 0) as total_api_calls
        FROM api_keys
        WHERE user_id = $1 AND status = 'active'
      `;
      const apiKeyStats = await pool.query(apiKeyQuery, [userId]);

      const usage = await usageService.getUserUsage(userId);

      // Determine limits based on tier
      const tier = user.tier || 'free';
      const baseLimits = usageService.getTierLimits(tier);
      const reportsLimitByTier = {
        free: 5,
        premium: 20,
        business: -1
      };
      const tierLimits = {
        ...baseLimits,
        reportsLimit: reportsLimitByTier[tier as keyof typeof reportsLimitByTier] ?? 5
      };

      let teamMembers = 1;
      if (user.tier !== 'free') {
        const teamIdResult = await pool.query(
          `
          SELECT t.id
          FROM teams t
          WHERE t.owner_id = $1
          UNION
          SELECT tm.team_id
          FROM team_members tm
          WHERE tm.user_id = $1
          LIMIT 1
          `,
          [userId]
        );

        const teamId = teamIdResult.rows[0]?.id;
        if (teamId) {
          const teamCountResult = await pool.query(
            `
            SELECT t.owner_id,
                   COUNT(tm.id) as member_count,
                   SUM(CASE WHEN tm.user_id = t.owner_id THEN 1 ELSE 0 END) as owner_in_members
            FROM teams t
            LEFT JOIN team_members tm ON tm.team_id = t.id
            WHERE t.id = $1
            GROUP BY t.owner_id
            `,
            [teamId]
          );

          const countRow = teamCountResult.rows[0];
          const memberCount = parseInt(countRow?.member_count || '0');
          const ownerInMembers = parseInt(countRow?.owner_in_members || '0');
          teamMembers = memberCount + (ownerInMembers > 0 ? 0 : 1);
        }
      }

      const metrics = {
        generationsUsed: usage.apiCallsUsed,
        generationsLimit: usage.apiCallsLimit,
        storageUsed: 0, // TODO: Calculate actual storage
        storageLimit: tierLimits.storageLimit,
        apiCallsUsed: usage.apiCallsUsed,
        apiCallsLimit: tierLimits.apiCallsLimit,
        reportsGenerated: 0,
        reportsLimit: tierLimits.reportsLimit,
        threatsDetected: 0,
        totalScans: 0,
        teamMembers,
        tier: tier,
        subscriptionStatus: (user as any).subscription_status || 'active',
        subscriptionEnd: (user as any).subscription_end_date || null
      };

      return res.status(200).json({
        success: true,
        metrics
      });

    } catch (error: any) {
      console.error('Error fetching user metrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user metrics'
      });
    }
  }

  /**
   * Get user profile
   */
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      const query = `
        SELECT id, email, full_name, tier, role, created_at, updated_at
        FROM users
        WHERE id = $1
      `;
      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        user: result.rows[0]
      });

    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user profile'
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { name, email } = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (name) {
        updates.push(`full_name = $${paramIndex++}`);
        values.push(name);
      }

      if (email) {
        updates.push(`email = $${paramIndex++}`);
        values.push(email);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      values.push(userId);
      const query = `
        UPDATE users
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING id, email, full_name as name, tier
      `;

      const result = await pool.query(query, values);

      return res.status(200).json({
        success: true,
        user: result.rows[0]
      });

    } catch (error: any) {
      console.error('Error updating user profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update user profile'
      });
    }
  }

  /**
   * Update user password
   */
  async updatePassword(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      // Verify current password
      const bcrypt = require('bcryptjs');
      const userQuery = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const isValid = await bcrypt.compare(currentPassword, userQuery.rows[0].password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      // Update password
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );

      // Send confirmation email
      const userDataQuery = 'SELECT email, full_name FROM users WHERE id = $1';
      const userData = await pool.query(userDataQuery, [userId]);
      if (userData.rows[0]) {
        await emailService.sendPasswordChangeConfirmation(
          userData.rows[0].email,
          userData.rows[0].full_name || 'User'
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });

    } catch (error: any) {
      console.error('Error updating password:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id || req.user!.userId;
      const { password, confirmDelete } = req.body;

      if (!password || confirmDelete !== 'DELETE') {
        return res.status(400).json({
          success: false,
          message: 'Password confirmation and DELETE confirmation required'
        });
      }

      // Verify password
      const bcrypt = require('bcryptjs');
      const userQuery = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const isValid = await bcrypt.compare(password, userQuery.rows[0].password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Password is incorrect'
        });
      }

      // Get user data before deletion
      const userDataQuery = 'SELECT email, full_name FROM users WHERE id = $1';
      const userData = await pool.query(userDataQuery, [userId]);
      const userEmail = userData.rows[0]?.email;
      const userName = userData.rows[0]?.full_name || 'User';

      // Clean up references that don't have CASCADE
      await pool.query('UPDATE reports SET generated_by = NULL WHERE generated_by = $1', [userId]);
      await pool.query('UPDATE team_members SET invited_by = NULL WHERE invited_by = $1', [userId]);
      await pool.query('UPDATE tier_changes SET changed_by = NULL WHERE changed_by = $1', [userId]);
      
      // Delete owned teams (will cascade to team_members)
      await pool.query('DELETE FROM teams WHERE owner_id = $1', [userId]);

      // Delete user (CASCADE will delete related data: api_keys, subscriptions, etc.)
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);

      // Send confirmation email
      if (userEmail) {
        try {
          await emailService.sendAccountDeletionConfirmation(userEmail, userName);
        } catch (emailError) {
          console.error('Failed to send deletion confirmation email:', emailError);
          // Don't fail the deletion if email fails
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting account:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    }
  }

  /**
   * Get user activity log
   */
  async getActivityLog(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 50;

      const usageQuery = `
        SELECT usage_type, amount, metadata, created_at
        FROM user_usage_history
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      const usageRows = await pool.query(usageQuery, [userId, limit]);

      // Get payment history as activity
      const paymentsQuery = `
        SELECT 
          'payment' as type,
          description,
          amount,
          status,
          created_at
        FROM payment_history
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      const payments = await pool.query(paymentsQuery, [userId, limit]);

      // Combine and sort
      const activities = [
        ...usageRows.rows.map(u => ({
          type: u.usage_type,
          description: u.usage_type === 'api_call' ? 'Generation request' : u.usage_type,
          amount: u.amount,
          metadata: u.metadata,
          timestamp: u.created_at
        })),
        ...payments.rows.map(p => ({
          type: 'payment',
          description: p.description || `Payment of $${p.amount}`,
          status: p.status,
          timestamp: p.created_at
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, limit);

      return res.status(200).json({
        success: true,
        activities
      });

    } catch (error: any) {
      console.error('Error fetching activity log:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch activity log'
      });
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;

      const query = `
        SELECT privacy_settings, notification_settings
        FROM users
        WHERE id = $1
      `;
      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const preferences = {
        privacy: result.rows[0].privacy_settings || {
          shareAnalytics: true,
          emailNotifications: true,
          securityAlerts: true,
          marketingEmails: false,
          dataRetention: '1year'
        },
        notifications: result.rows[0].notification_settings || {
          generationComplete: true,
          nerComplete: true,
          usageDigest: true,
          systemUpdates: true,
          securityAlerts: true
        }
      };

      return res.status(200).json({
        success: true,
        preferences
      });

    } catch (error: any) {
      console.error('Error fetching preferences:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch preferences'
      });
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { privacy, notifications } = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (privacy) {
        updates.push(`privacy_settings = $${paramIndex++}`);
        values.push(JSON.stringify(privacy));
      }

      if (notifications) {
        updates.push(`notification_settings = $${paramIndex++}`);
        values.push(JSON.stringify(notifications));
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No preferences to update'
        });
      }

      values.push(userId);
      const query = `
        UPDATE users
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING privacy_settings, notification_settings
      `;

      const result = await pool.query(query, values);

      return res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
        preferences: {
          privacy: result.rows[0].privacy_settings,
          notifications: result.rows[0].notification_settings
        }
      });

    } catch (error: any) {
      console.error('Error updating preferences:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update preferences'
      });
    }
  }
}

export default new UserController();
