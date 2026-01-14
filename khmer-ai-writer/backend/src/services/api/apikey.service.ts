import crypto from 'crypto';
import { pool } from '../core/database.service';

/**
 * API Key Service
 * Manages API keys for Premium and Business tier users
 */

interface CreateApiKeyRequest {
  userId: string;
  name: string;
  tierRequired?: 'premium' | 'business';
  rateLimit?: number;
  expiresInDays?: number;
}

interface ApiKeyInfo {
  id: string;
  key: string;
  name: string;
  tierRequired: string;
  rateLimit: number;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
}

class ApiKeyService {

  /**
   * Generate a new API key
   */
  async createApiKey(request: CreateApiKeyRequest): Promise<{ success: boolean; apiKey?: ApiKeyInfo; message: string }> {
    try {
      // Check user tier
      const userTier = await this.getUserTier(request.userId);
      
      if (userTier === 'free') {
        return {
          success: false,
          message: 'API keys are only available for Premium and Business tier users'
        };
      }

      // Check API key limit
      const existingKeys = await this.getUserApiKeys(request.userId);
      const maxKeys = userTier === 'premium' ? 3 : 10; // Premium: 3 keys, Business: 10 keys

      if (existingKeys.length >= maxKeys) {
        return {
          success: false,
          message: `You have reached the maximum number of API keys (${maxKeys}) for your tier`
        };
      }

      // Generate secure API key
      const apiKey = this.generateSecureKey();
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const keyPrefix = apiKey.substring(0, 12);
      const id = crypto.randomUUID();
      const expiresAt = request.expiresInDays 
        ? new Date(Date.now() + request.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const query = `
        INSERT INTO api_keys (
          id, user_id, key_hash, key_prefix, name, scopes, 
          rate_limit_per_hour, status, created_at, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), $8)
        RETURNING *
      `;

      const result = await pool.query(query, [
        id,
        request.userId,
        keyHash,
        keyPrefix,
        request.name,
        ['lm:suggest', 'ner:extract'],
        request.rateLimit || (userTier === 'premium' ? 100 : 1000),
        expiresAt
      ]);

      // Log audit
      await this.logAudit(request.userId, 'api_key_created', {
        description: `API key "${request.name}" created`,
        apiKeyId: id,
        rateLimit: request.rateLimit || (userTier === 'premium' ? 100 : 1000),
        expiresAt
      });

      return {
        success: true,
        apiKey: {
          ...result.rows[0],
          key: apiKey  // Return the unhashed key only on creation
        },
        message: 'API key created successfully'
      };

    } catch (error: any) {
      console.error('Error creating API key:', error);
      return {
        success: false,
        message: error.message || 'Failed to create API key'
      };
    }
  }

  /**
   * Generate a cryptographically secure API key
   */
  private generateSecureKey(): string {
    const prefix = 'pk'; // project key
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${prefix}_${randomBytes}`;
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<{ valid: boolean; userId?: string; message?: string }> {
    try {
      // Hash the provided API key
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      
      const query = `
        SELECT ak.*, u.tier as user_tier
        FROM api_keys ak
        JOIN users u ON ak.user_id = u.id
        WHERE ak.key_hash = $1 AND ak.status = 'active'
      `;

      const result = await pool.query(query, [keyHash]);

      if (result.rows.length === 0) {
        return {
          valid: false,
          message: 'Invalid API key'
        };
      }

      const keyData = result.rows[0];

      // Check expiry
      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        await this.deactivateApiKey(keyData.id, keyData.user_id);
        return {
          valid: false,
          message: 'API key has expired'
        };
      }

      // Check rate limit
      const rateLimitExceeded = await this.checkRateLimit(keyData.id, keyData.rate_limit);
      if (rateLimitExceeded) {
        return {
          valid: false,
          message: 'Rate limit exceeded'
        };
      }

      // Update usage
      await this.updateApiKeyUsage(keyData.id);

      return {
        valid: true,
        userId: keyData.userId
      };

    } catch (error: any) {
      console.error('Error validating API key:', error);
      return {
        valid: false,
        message: 'API key validation failed'
      };
    }
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(apiKeyId: string, rateLimit: number): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const query = `
      SELECT requests_used_hour, last_used_at
      FROM api_keys
      WHERE id = $1
    `;

    const result = await pool.query(query, [apiKeyId]);
    const keyData = result.rows[0];

    if (!keyData.last_used_at || new Date(keyData.last_used_at) < oneHourAgo) {
      // Reset counter if more than 1 hour has passed
      await pool.query(`UPDATE api_keys SET requests_used_hour = 0 WHERE id = $1`, [apiKeyId]);
      return false;
    }

    return keyData.usage_count >= rateLimit;
  }

  /**
   * Update API key usage
   */
  private async updateApiKeyUsage(apiKeyId: string): Promise<void> {
    await pool.query(
      `UPDATE api_keys 
       SET requests_used_hour = requests_used_hour + 1, last_used_at = NOW() 
       WHERE id = $1`,
      [apiKeyId]
    );
  }

  /**
   * Get user's API keys
   */
  async getUserApiKeys(userId: string): Promise<ApiKeyInfo[]> {
    const query = `
      SELECT * FROM api_keys
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Deactivate API key
   */
  async deactivateApiKey(apiKeyId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await pool.query(
        `UPDATE api_keys SET status = 'revoked' WHERE id = $1 AND user_id = $2 RETURNING id`,
        [apiKeyId, userId]
      );

      if (result.rowCount === 0) {
        return {
          success: false,
          message: 'API key not found or unauthorized'
        };
      }

      return {
        success: true,
        message: 'API key deactivated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to deactivate API key'
      };
    }
  }

  /**
   * Delete API key
   */
  async deleteApiKey(apiKeyId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await pool.query(
        `DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id`,
        [apiKeyId, userId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'API key not found or unauthorized'
        };
      }

      await this.logAudit(userId, 'api_key_deleted', {
        description: 'API key deleted',
        apiKeyId
      });

      return {
        success: true,
        message: 'API key deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete API key'
      };
    }
  }

  /**
   * Regenerate API key
   */
  async regenerateApiKey(apiKeyId: string, userId: string): Promise<{ success: boolean; apiKey?: string; message: string }> {
    try {
      const newKey = this.generateSecureKey();

      const keyHash = crypto.createHash('sha256').update(newKey).digest('hex');
      const keyPrefix = newKey.substring(0, 12);
      
      const result = await pool.query(
        `UPDATE api_keys 
         SET key_hash = $1, key_prefix = $2, requests_used_hour = 0, last_used_at = NULL 
         WHERE id = $3 AND user_id = $4
         RETURNING *`,
        [keyHash, keyPrefix, apiKeyId, userId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'API key not found or unauthorized'
        };
      }

      await this.logAudit(userId, 'api_key_regenerated', {
        description: 'API key regenerated',
        apiKeyId
      });

      return {
        success: true,
        apiKey: newKey,
        message: 'API key regenerated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to regenerate API key'
      };
    }
  }

  /**
   * Get user tier
   */
  private async getUserTier(userId: string): Promise<string> {
    const result = await pool.query(`SELECT tier FROM users WHERE id = $1`, [userId]);
    return result.rows[0]?.tier || 'free';
  }

  /**
   * Log audit event
   */
  private async logAudit(userId: string, action: string, metadata: Record<string, any> = {}): Promise<void> {
    try {
      const { description, ...changes } = metadata || {};

      const changesPayload = Object.keys(changes).length > 0 ? changes : null;

      await pool.query(
        `INSERT INTO audit_logs (id, user_id, action, description, changes, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT DO NOTHING`,
        [
          crypto.randomUUID(),
          userId,
          action,
          description || `API key event: ${action}`,
          changesPayload ? JSON.stringify(changesPayload) : null
        ]
      );
    } catch (error) {
      // Audit logging is non-critical, just log the error
      console.error('Audit log error:', error);
    }
  }

  /**
   * Get API key statistics
   */
  async getApiKeyStats(apiKeyId: string, userId: string): Promise<any> {
    const query = `
      SELECT 
        id, name, requests_used_hour as usage_count, last_used_at, rate_limit_per_hour as rate_limit, 
        created_at, expires_at, status
      FROM api_keys
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pool.query(query, [apiKeyId, userId]);
    return result.rows[0] || null;
  }
}

export const apiKeyService = new ApiKeyService();
export default apiKeyService;
