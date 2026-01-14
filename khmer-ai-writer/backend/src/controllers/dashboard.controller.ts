import { Request, Response } from 'express';
import { pool } from '../services/core/database.service';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userTier = (req as any).user?.tier;

    // Get generation activity over time (last 30 days) from usage history
    const activityQuery = `
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as generations
      FROM user_usage_history
      WHERE user_id = $1 
        AND usage_type = 'api_call'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const activity = await pool.query(activityQuery, [userId]);

    const totalsQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_generations,
        COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN amount ELSE 0 END), 0) as generations_week
      FROM user_usage_history
      WHERE user_id = $1 AND usage_type = 'api_call'
    `;
    const totals = await pool.query(totalsQuery, [userId]);
    
    // Get API key usage (for premium/business users)
    let apiKeyStats = null;
    if (userTier === 'premium' || userTier === 'business') {
      const apiKeyQuery = `
        SELECT 
          COUNT(*) as total_keys,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_keys,
          SUM(requests_used_hour) as total_requests_today
        FROM api_keys 
        WHERE user_id = $1
      `;
      
      const apiResult = await pool.query(apiKeyQuery, [userId]);
      apiKeyStats = apiResult.rows[0];
    }
    
    let teamMembers = 1;
    if (userTier && userTier !== 'free') {
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
    const totalsRow = totals.rows[0] || {};

    res.json({
      overview: {
        totalGenerations: parseInt(totalsRow.total_generations) || 0,
        generationsThisWeek: parseInt(totalsRow.generations_week) || 0,
        avgQuality: 0,
        tokensUsed: parseInt(totalsRow.total_generations) || 0,
        teamMembers,
      },
      activity: activity.rows,
      apiKeyStats,
      userTier,
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

export const getUsageStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [userId];
    
    if (startDate && endDate) {
      dateFilter = 'AND created_at BETWEEN $2 AND $3';
      params.push(startDate as string, endDate as string);
    } else {
      dateFilter = 'AND created_at >= NOW() - INTERVAL \'30 days\'';
    }
    
    const usageQuery = `
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(amount), 0) as generations
      FROM user_usage_history
      WHERE user_id = $1 
        AND usage_type = 'api_call'
        ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    const result = await pool.query(usageQuery, params);
    
    res.json({
      usage: result.rows,
      summary: {
        totalGenerations: result.rows.reduce((sum, day) => sum + parseInt(day.generations), 0),
      }
    });
    
  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }
};

export default { getDashboardStats, getUsageStats };
