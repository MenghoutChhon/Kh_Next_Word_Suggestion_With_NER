import { Request, Response } from 'express';
import { apiKeyService } from '../services/api/apikey.service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    tier: string;
  };
}

const getParamId = (idParam: string | string[] | undefined) => {
  if (!idParam) return null;
  return Array.isArray(idParam) ? idParam[0] : idParam;
};

class ApiKeyController {
  
  /**
   * Create new API key
   */
  async createApiKey(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { name, tierRequired, rateLimit, expiresInDays } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'API key name is required'
        });
      }

      const result = await apiKeyService.createApiKey({
        userId,
        name,
        tierRequired,
        rateLimit,
        expiresInDays
      });

      if (!result.success || !result.apiKey) {
        return res.status(400).json(result);
      }

      // Return in format expected by frontend
      return res.status(201).json({
        success: true,
        apiKey: result.apiKey,
        key: result.apiKey.key,  // Full key returned only once
        message: result.message
      });

    } catch (error: any) {
      console.error('Error creating API key:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create API key'
      });
    }
  }

  /**
   * List user's API keys
   */
  async listApiKeys(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const apiKeys = await apiKeyService.getUserApiKeys(userId);

      // Return keys with prefix only (never return full keys)
      const maskedKeys = apiKeys.map((key: any) => ({
        id: key.id,
        name: key.name,
        key_prefix: key.key_prefix || 'N/A',
        status: key.status || 'active',
        scopes: key.scopes || [],
        rate_limit_per_hour: key.rate_limit_per_hour,
        requests_used_hour: key.requests_used_hour || 0,
        last_used_at: key.last_used_at,
        created_at: key.created_at,
        expires_at: key.expires_at
      }));

      return res.status(200).json({
        success: true,
        apiKeys: maskedKeys
      });

    } catch (error: any) {
      console.error('Error listing API keys:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to list API keys'
      });
    }
  }

  /**
   * Get API key statistics
   */
  async getApiKeyStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const keyId = getParamId(req.params.keyId);
      if (!keyId) {
        return res.status(400).json({
          success: false,
          message: 'API key id is required'
        });
      }
      const stats = await apiKeyService.getApiKeyStats(keyId, userId);

      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'API key not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      console.error('Error fetching API key stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch API key statistics'
      });
    }
  }

  /**
   * Regenerate API key
   */
  async regenerateApiKey(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const keyId = getParamId(req.params.keyId);
      if (!keyId) {
        return res.status(400).json({
          success: false,
          message: 'API key id is required'
        });
      }

      const result = await apiKeyService.regenerateApiKey(keyId, userId);

      return res.status(result.success ? 200 : 400).json(result);

    } catch (error: any) {
      console.error('Error regenerating API key:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to regenerate API key'
      });
    }
  }

  /**
   * Deactivate API key
   */
  async deactivateApiKey(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const keyId = getParamId(req.params.keyId);
      if (!keyId) {
        return res.status(400).json({
          success: false,
          message: 'API key id is required'
        });
      }
      const result = await apiKeyService.deactivateApiKey(keyId, userId);

      return res.status(result.success ? 200 : 400).json(result);

    } catch (error: any) {
      console.error('Error deactivating API key:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to deactivate API key'
      });
    }
  }

  /**
   * Delete API key
   */
  async deleteApiKey(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const keyId = getParamId(req.params.keyId);
      if (!keyId) {
        return res.status(400).json({
          success: false,
          message: 'API key id is required'
        });
      }

      const result = await apiKeyService.deleteApiKey(keyId, userId);

      return res.status(result.success ? 200 : 400).json(result);

    } catch (error: any) {
      console.error('Error deleting API key:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete API key'
      });
    }
  }

  /**
   * Validate API key (for external API consumers)
   */
  async validateApiKey(req: Request, res: Response) {
    try {
      const { apiKey } = req.body;

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: 'API key is required'
        });
      }

      const result = await apiKeyService.validateApiKey(apiKey);

      return res.status(result.valid ? 200 : 401).json(result);

    } catch (error: any) {
      console.error('Error validating API key:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate API key'
      });
    }
  }
}

export default new ApiKeyController();
