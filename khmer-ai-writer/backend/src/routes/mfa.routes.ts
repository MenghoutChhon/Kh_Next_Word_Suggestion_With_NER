import { Router } from 'express';
import mfaController from '../controllers/mfa.controller';
import auth from '../middleware/auth';

const router = Router();

/**
 * MFA (Multi-Factor Authentication) Routes
 * All routes require authentication
 */

// Setup MFA - returns secret and QR code
router.post('/setup', auth, mfaController.setupMFA.bind(mfaController));

// Verify and enable MFA
router.post('/verify', auth, mfaController.verifyAndEnableMFA.bind(mfaController));

// Verify MFA code during login (no auth required - pre-login)
router.post('/verify-code', mfaController.verifyMFACode.bind(mfaController));

// Disable MFA
router.post('/disable', auth, mfaController.disableMFA.bind(mfaController));

// Regenerate backup codes
router.post('/regenerate-backup-codes', auth, mfaController.regenerateBackupCodes.bind(mfaController));

// Get MFA status
router.get('/status', auth, mfaController.getMFAStatus.bind(mfaController));

export default router;
