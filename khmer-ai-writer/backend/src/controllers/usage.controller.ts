import { Request, Response } from 'express';
import { usageService } from '../services/usage/usage.service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    tier: string;
    email: string;
  };
}

export class UsageController {
  /**
   * Get current user's usage metrics
   */
  async getUserUsage(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id || req.user!.userId;
      
      const usage = await usageService.getUserUsage(userId);
      
      // Calculate percentages
      const apiCallsPercentage = usageService.getUsagePercentage(
        usage.apiCallsUsed,
        usage.apiCallsLimit
      );
      const storagePercentage = usageService.getUsagePercentage(
        usage.storageUsed,
        usage.storageLimit
      );
      
      return res.json({
        success: true,
        usage: {
          apiCallsUsed: usage.apiCallsUsed,
          apiCallsLimit: usage.apiCallsLimit,
          storageUsed: usage.storageUsed,
          storageLimit: usage.storageLimit,
          reportsGenerated: usage.reportsGenerated,
          usageResetAt: usage.usageResetAt,
          generationsUsed: usage.apiCallsUsed,
          generationsLimit: usage.apiCallsLimit,
          generationsPercentage: apiCallsPercentage,
          apiCallsPercentage,
          storagePercentage,
          storageUsedFormatted: usageService.formatStorageSize(usage.storageUsed),
          storageLimitFormatted: usageService.formatStorageSize(usage.storageLimit)
        }
      });
    } catch (error: any) {
      console.error('Get user usage error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get usage metrics'
      });
    }
  }

  /**
   * Get usage history
   */
  async getUsageHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id || req.user!.userId;
      const { limit = 50, type } = req.query;
      
      const history = await usageService.getUsageHistory(
        userId,
        parseInt(limit as string),
        type as string
      );
      
      return res.json({
        success: true,
        history,
        count: history.length
      });
    } catch (error: any) {
      console.error('Get usage history error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get usage history'
      });
    }
  }

  /**
   * Get team usage metrics
   */
  async getTeamUsage(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id || req.user!.userId;
      const userTier = req.user!.tier;
      
      if (userTier === 'free') {
        return res.status(403).json({
          success: false,
          message: 'Team usage requires Premium or Business plan'
        });
      }
      
      // Resolve team from ownership or membership
      const teamQuery = await require('../services/core/database.service').pool.query(
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
      
      const teamId = teamQuery.rows[0]?.id;
      
      if (!teamId) {
        return res.status(404).json({
          success: false,
          message: 'No team found'
        });
      }
      
      const usage = await usageService.getTeamUsage(teamId);
      const memberUsage = await usageService.getTeamMemberUsage(teamId);
      
      return res.json({
        success: true,
        usage,
        members: memberUsage,
        summary: {
          totalGenerations: usage?.apiCallsTotal || 0,
          totalMembers: usage?.activeMembers || 0,
          avgGenerationsPerMember: usage?.activeMembers 
            ? Math.round((usage.apiCallsTotal || 0) / usage.activeMembers) 
            : 0,
          topContributor: memberUsage[0] || null
        }
      });
    } catch (error: any) {
      console.error('Get team usage error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get team usage metrics'
      });
    }
  }

  /**
   * Track usage (internal use by other controllers)
   */
  async trackUsage(
    userId: string,
    usageType: 'api_call' | 'report' | 'storage',
    amount: number = 1,
    metadata: any = {}
  ): Promise<boolean> {
    try {
      return await usageService.trackUsage(userId, usageType, amount, metadata);
    } catch (error) {
      console.error('Track usage error:', error);
      return false;
    }
  }

  /**
   * Track team member usage (internal use)
   */
  async trackTeamMemberUsage(
    teamId: string,
    userId: string,
    usageType: 'api_call' | 'report',
    amount: number = 1
  ): Promise<void> {
    try {
      await usageService.trackTeamMemberUsage(teamId, userId, usageType, amount);
    } catch (error) {
      console.error('Track team member usage error:', error);
    }
  }

  /**
   * Check if user can perform action
   */
  async checkLimit(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id || req.user!.userId;
      const { actionType } = req.query;
      
      if (!actionType || !['api_call'].includes(actionType as string)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action type'
        });
      }
      
      const canPerform = await usageService.canPerformAction(
        userId,
        actionType as 'api_call'
      );
      
      const usage = await usageService.getUserUsage(userId);
      
      return res.json({
        success: true,
        canPerform,
        usage: { used: usage.apiCallsUsed, limit: usage.apiCallsLimit }
      });
    } catch (error: any) {
      console.error('Check limit error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check limit'
      });
    }
  }

  /**
   * Get tier limits
   */
  async getTierLimits(req: AuthRequest, res: Response) {
    try {
      const { tier } = req.query;
      
      if (!tier || !['free', 'premium', 'business'].includes(tier as string)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tier'
        });
      }
      
      const limits = usageService.getTierLimits(tier as string);
      
      return res.json({
        success: true,
        tier,
        limits: {
          ...limits,
          storageLimitFormatted: usageService.formatStorageSize(limits.storageLimit)
        }
      });
    } catch (error: any) {
      console.error('Get tier limits error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get tier limits'
      });
    }
  }
}

export default new UsageController();
