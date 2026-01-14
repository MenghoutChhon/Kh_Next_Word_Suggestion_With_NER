import { Router } from 'express';
import { getDashboardStats, getUsageStats } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', getDashboardStats);

// GET /api/dashboard/usage - Get usage statistics
router.get('/usage', getUsageStats);

export default router;