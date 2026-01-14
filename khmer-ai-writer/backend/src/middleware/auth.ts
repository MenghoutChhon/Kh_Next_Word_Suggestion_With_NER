import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';
import { pool } from '../services/core/database.service';

export interface JwtPayload {
  sub: string;
  role?: string;
  organizationId?: string;
}

const getUserFromApiKey = async (apiKey: string) => {
  if (!apiKey) return null;
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const result = await pool.query(
    'SELECT * FROM api_keys WHERE key_hash = $1 AND status = $2',
    [keyHash, 'active']
  );
  const apiKeyRecord = result.rows[0];

  if (!apiKeyRecord) return null;

  if (apiKeyRecord.expires_at && new Date() > apiKeyRecord.expires_at) {
    return null;
  }

  await pool.query(
    'UPDATE api_keys SET last_used_at = $1 WHERE id = $2',
    [new Date(), apiKeyRecord.id]
  );

  return {
    id: apiKeyRecord.user_id,
    sub: apiKeyRecord.user_id,
    email: '',
    role: 'api',
    apiKeyId: apiKeyRecord.id,
    scopes: apiKeyRecord.scopes,
  };
};

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for token in header first
    const authHeader = req.headers.authorization;
    let token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    const apiKeyHeader = (req.headers['x-api-key'] as string | undefined)?.trim();
    
    // Fallback to query parameter (for direct downloads with IDM compatibility)
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token && !apiKeyHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;

        // Fetch user
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.sub]);
        const user = result.rows[0];

        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }

        (req as any).user = {
          id: user.id,
          userId: user.id,
          sub: user.id,
          email: user.email,
          role: user.role,
          tier: user.tier,
        };

        return next();
      } catch (error) {
        // Fall through to API key auth if provided
      }
    }

    const apiKeyCandidate = apiKeyHeader || token;
    if (apiKeyCandidate) {
      const apiUser = await getUserFromApiKey(apiKeyCandidate);
      if (apiUser) {
        (req as any).user = apiUser;
        return next();
      }
    }

    return res.status(401).json({ error: 'Invalid token' });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
    const bearerToken = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
    const apiKey = apiKeyHeader || bearerToken;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const apiUser = await getUserFromApiKey(apiKey);
    if (!apiUser) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    (req as any).user = apiUser;
    return next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Backward compatibility
export const auth = authenticate;

export default authenticate;
