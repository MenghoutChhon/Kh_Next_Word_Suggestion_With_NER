import { Router } from 'express';
import usageController from '../controllers/usage.controller';
import auth from '../middleware/auth';

const router = Router();

/**
 * Usage & Metrics Routes
 * All routes require authentication
 */

// Get current user's usage metrics
router.get('/user', auth, usageController.getUserUsage);

// Get usage history
router.get('/history', auth, usageController.getUsageHistory);

// Get team usage metrics (business tier only)
router.get('/team', auth, usageController.getTeamUsage);

// Check if user can perform action
router.get('/check-limit', auth, usageController.checkLimit);

// Get tier limits
router.get('/tier-limits', auth, usageController.getTierLimits);

export default router;
