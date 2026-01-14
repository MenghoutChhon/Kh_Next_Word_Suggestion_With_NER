import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { pool } from '../services/core/database.service';

export interface JwtPayload {
  sub: string;
  role?: string;
  organizationId?: string;
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't fail if no token
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for token in header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

      // Fetch user
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.sub]);
      const user = result.rows[0];

      if (user) {
        (req as any).user = {
          id: user.id,
          userId: user.id,
          sub: user.id,
          email: user.email,
          role: user.role,
          tier: user.tier,
        };
      }
    } catch (jwtError) {
      // Invalid token, but don't fail - just continue without user
      console.log('Invalid token in optional auth, continuing without user');
    }

    next();
  } catch (error) {
    // Any other error, just continue without user
    next();
  }
};

export default optionalAuth;
