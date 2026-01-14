import { Router } from 'express';
import userController from '../controllers/user.controller';
import auth from '../middleware/auth';

const router = Router();

// All routes require authentication
router.get('/metrics', auth, userController.getMetrics.bind(userController));
router.get('/profile', auth, userController.getProfile.bind(userController));
router.put('/profile', auth, userController.updateProfile.bind(userController));
router.put('/password', auth, userController.updatePassword.bind(userController));
router.delete('/account', auth, userController.deleteAccount.bind(userController));
router.get('/activity', auth, userController.getActivityLog.bind(userController));
router.get('/preferences', auth, userController.getPreferences.bind(userController));
router.put('/preferences', auth, userController.updatePreferences.bind(userController));

export default router;
