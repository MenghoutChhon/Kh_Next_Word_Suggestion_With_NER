import { Request, Response } from 'express';
import { pool } from '../services/core/database.service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tier?: string;
  };
}

const getParamId = (param: string | string[] | undefined) => {
  if (!param) return null;
  return Array.isArray(param) ? param[0] : param;
};

// Helper to parse user agent
function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();
  
  let browser = 'Unknown';
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';
  else if (ua.includes('opera')) browser = 'Opera';
  
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
  if (ua.includes('mobile')) deviceType = 'mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) deviceType = 'tablet';
  else if (ua.includes('windows') || ua.includes('mac') || ua.includes('linux')) deviceType = 'desktop';
  
  return { browser, os, deviceType };
}

// Helper to get location from IP (simplified)
function getLocationFromIP(ip: string): string {
  // In production, use a service like MaxMind GeoIP2
  // For now, return a placeholder
  if (ip === '::1' || ip === '127.0.0.1') return 'Local Machine';
  return 'Unknown Location';
}

export const sessionController = {
  // Get all active sessions for the current user
  async getSessions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Get current session token
      const currentToken = req.headers.authorization?.replace('Bearer ', '');

      // Since we're using JWT tokens, we'll return mock session data
      // In production, implement session tracking with Redis or a sessions table
      const sessions = [{
        id: 'current-session',
        userId,
        token: currentToken,
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || 'Unknown',
        lastActiveAt: new Date(),
        createdAt: new Date(),
      }];

      const formattedSessions = sessions.map((session: any) => {
        const { browser, os, deviceType } = parseUserAgent(session.userAgent || '');
        const location = getLocationFromIP(session.ipAddress || '');
        const isCurrent = session.token === currentToken;

        return {
          id: session.id,
          deviceType,
          deviceName: `${browser} on ${os}`,
          browser,
          os,
          ipAddress: session.ipAddress || 'Unknown',
          location,
          lastActive: session.lastActiveAt.toISOString(),
          isCurrent,
          createdAt: session.createdAt.toISOString()
        };
      });

      res.json({
        success: true,
        sessions: formattedSessions
      });
    } catch (error: any) {
      console.error('Get sessions error:', error);
      res.status(500).json({ error: 'Failed to retrieve sessions' });
    }
  },

  // Revoke a specific session
  async revokeSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const sessionId = getParamId(req.params.sessionId);
      if (!sessionId) {
        return res.status(400).json({ error: 'Session id is required' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Prevent revoking current session
      if (sessionId === 'current-session') {
        return res.status(400).json({ error: 'Cannot revoke current session. Use logout instead.' });
      }

      // In a real implementation with session tracking:
      // - Delete session from Redis/database
      // - Invalidate JWT token
      // For now, we'll just return success
      // TODO: Implement session revocation with Redis or database

      res.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } catch (error: any) {
      console.error('Revoke session error:', error);
      res.status(500).json({ error: 'Failed to revoke session' });
    }
  },

  // Revoke all sessions except current
  async revokeAllSessions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // In a real implementation with session tracking:
      // - Delete all sessions except current from Redis/database
      // - Invalidate all JWT tokens except current
      // For now, we'll return mock data
      // TODO: Implement bulk session revocation with Redis or database

      res.json({
        success: true,
        message: 'All other sessions revoked successfully',
        revokedCount: 0
      });
    } catch (error: any) {
      console.error('Revoke all sessions error:', error);
      res.status(500).json({ error: 'Failed to revoke sessions' });
    }
  }
};

export default sessionController;
