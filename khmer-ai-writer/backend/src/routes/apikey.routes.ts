import { Router } from 'express';
import apiKeyController from '../controllers/apikey.controller';
import auth from '../middleware/auth';

const router = Router();

/**
 * API Key Routes
 * All routes require authentication
 */

// Create new API key
router.post('/create', auth, apiKeyController.createApiKey);

// List user's API keys
router.get('/list', auth, apiKeyController.listApiKeys);

// Get API key statistics
router.get('/:keyId/stats', auth, apiKeyController.getApiKeyStats);

// Regenerate API key
router.post('/:keyId/regenerate', auth, apiKeyController.regenerateApiKey);

// Deactivate API key
router.post('/:keyId/deactivate', auth, apiKeyController.deactivateApiKey);

// Delete API key
router.delete('/:keyId', auth, apiKeyController.deleteApiKey);

// Validate API key (public endpoint for API consumers)
router.post('/validate', apiKeyController.validateApiKey);

export default router;
