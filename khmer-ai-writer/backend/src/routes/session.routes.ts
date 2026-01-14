import express from 'express';
import { sessionController } from '../controllers/session.controller';
import { auth } from '../middleware/auth';

const router = express.Router();

// All session routes require authentication
router.use(auth);

// Get all active sessions for current user
router.get('/', sessionController.getSessions);

// Revoke a specific session
router.delete('/:sessionId', sessionController.revokeSession);

// Revoke all sessions except current
router.post('/revoke-all', sessionController.revokeAllSessions);

export default router;
