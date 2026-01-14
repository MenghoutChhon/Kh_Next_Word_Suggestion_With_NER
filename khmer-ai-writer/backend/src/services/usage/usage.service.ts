import { pool } from '../core/database.service';

export interface UsageMetrics {
  apiCallsUsed: number;
  apiCallsLimit: number;
  storageUsed: number;
  storageLimit: number;
  reportsGenerated: number;
  usageResetAt: Date;
}

export interface TeamUsageMetrics {
  teamId: string;
  apiCallsTotal: number;
  apiCallsThisMonth: number;
  storageTotal: number;
  reportsGenerated: number;
  activeMembers: number;
  lastActivityAt: Date;
}

export interface MemberUsageMetrics {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  apiCallsCount: number;
  storageUsed: number;
  reportsCount: number;
  lastActivityAt: Date | null;
}

export class UsageService {
  /**
   * Get user usage metrics
   */
  async getUserUsage(userId: string): Promise<UsageMetrics> {
    const query = `
      SELECT 
        api_calls_used, api_calls_limit,
        storage_used, storage_limit,
        reports_generated, usage_reset_at
      FROM users
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    const row = result.rows[0];
    
    if (!row) {
      throw new Error('User not found');
    }
    
    return {
      apiCallsUsed: row.api_calls_used || 0,
      apiCallsLimit: row.api_calls_limit || 100,
      storageUsed: row.storage_used || 0,
      storageLimit: row.storage_limit || 1073741824,
      reportsGenerated: row.reports_generated || 0,
      usageResetAt: row.usage_reset_at
    };
  }

  /**
   * Track user usage
   */
  async trackUsage(
    userId: string, 
    usageType: 'api_call' | 'report' | 'storage',
    amount: number = 1,
    metadata: any = {}
  ): Promise<boolean> {
    const query = 'SELECT track_user_usage($1, $2, $3, $4)';
    const result = await pool.query(query, [
      userId,
      usageType,
      amount,
      JSON.stringify(metadata)
    ]);
    
    return result.rows[0].track_user_usage;
  }

  /**
   * Check if user can perform action
   */
  async canPerformAction(userId: string, actionType: 'api_call'): Promise<boolean> {
    const query = `
      SELECT 
        CASE 
          WHEN $2 = 'api_call' THEN 
            (api_calls_limit = -1 OR api_calls_used < api_calls_limit)
          ELSE false
        END as can_perform
      FROM users
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [userId, actionType]);
    return result.rows[0]?.can_perform || false;
  }

  /**
   * Get team usage metrics
   */
  async getTeamUsage(teamId: string): Promise<TeamUsageMetrics | null> {
    const query = `
      SELECT 
        team_id, api_calls_total, api_calls_this_month,
        storage_total, reports_generated,
        active_members, last_activity_at
      FROM team_usage
      WHERE team_id = $1
    `;
    
    const result = await pool.query(query, [teamId]);
    const row = result.rows[0];
    
    if (!row) {
      return null;
    }
    
    return {
      teamId: row.team_id,
      apiCallsTotal: row.api_calls_total || 0,
      apiCallsThisMonth: row.api_calls_this_month || 0,
      storageTotal: row.storage_total || 0,
      reportsGenerated: row.reports_generated || 0,
      activeMembers: row.active_members || 0,
      lastActivityAt: row.last_activity_at
    };
  }

  /**
   * Get team member usage breakdown
   */
  async getTeamMemberUsage(teamId: string): Promise<MemberUsageMetrics[]> {
    const query = `
      SELECT 
        tmu.user_id, u.email, u.full_name,
        tm.role,
        tmu.api_calls_count,
        tmu.storage_used, tmu.reports_count,
        tmu.last_activity_at
      FROM team_member_usage tmu
      JOIN users u ON tmu.user_id = u.id
      LEFT JOIN team_members tm ON tm.team_id = tmu.team_id AND tm.user_id = tmu.user_id
      WHERE tmu.team_id = $1
      ORDER BY tmu.api_calls_count DESC
    `;
    
    const result = await pool.query(query, [teamId]);
    
    return result.rows.map(row => ({
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      role: row.role || 'member',
      apiCallsCount: row.api_calls_count || 0,
      storageUsed: row.storage_used || 0,
      reportsCount: row.reports_count || 0,
      lastActivityAt: row.last_activity_at
    }));
  }

  /**
   * Track team member usage
   */
  async trackTeamMemberUsage(
    teamId: string,
    userId: string,
    usageType: 'api_call' | 'report',
    amount: number = 1
  ): Promise<void> {
    const query = 'SELECT track_team_member_usage($1, $2, $3, $4)';
    await pool.query(query, [teamId, userId, usageType, amount]);
  }

  /**
   * Get usage history
   */
  async getUsageHistory(
    userId: string, 
    limit: number = 50,
    usageType?: string
  ): Promise<any[]> {
    let query = `
      SELECT usage_type, amount, metadata, created_at
      FROM user_usage_history
      WHERE user_id = $1
    `;
    
    const params: any[] = [userId];
    
    if (usageType) {
      query += ' AND usage_type = $2';
      params.push(usageType);
      query += ' ORDER BY created_at DESC LIMIT $3';
      params.push(limit);
    } else {
      query += ' ORDER BY created_at DESC LIMIT $2';
      params.push(limit);
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Update tier limits when user upgrades/downgrades
   */
  async updateTierLimits(userId: string, tier: string): Promise<void> {
    const limits = this.getTierLimits(tier);
    
    const query = `
      UPDATE users 
      SET api_calls_limit = $2,
          storage_limit = $3
      WHERE id = $1
    `;
    
    await pool.query(query, [
      userId,
      limits.apiCallsLimit,
      limits.storageLimit
    ]);
  }

  /**
   * Get tier-specific limits
   */
  getTierLimits(tier: string) {
    const limits = {
      free: {
        apiCallsLimit: 100,
        storageLimit: 1073741824 // 1GB
      },
      premium: {
        apiCallsLimit: 1000,
        storageLimit: 10737418240 // 10GB
      },
      business: {
        apiCallsLimit: -1, // unlimited
        storageLimit: 107374182400 // 100GB
      }
    };
    
    return limits[tier as keyof typeof limits] || limits.free;
  }

  /**
   * Reset monthly usage (called by cron job)
   */
  async resetMonthlyUsage(): Promise<void> {
    await pool.query('SELECT reset_monthly_usage()');
  }

  /**
   * Get usage percentage
   */
  getUsagePercentage(used: number, limit: number): number {
    if (limit === -1) return 0; // unlimited
    if (limit === 0) return 100;
    return Math.min(Math.round((used / limit) * 100), 100);
  }

  /**
   * Format storage size in bytes to human-readable format
   */
  formatStorageSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = Number(bytes) || 0;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

export const usageService = new UsageService();
