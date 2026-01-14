import { Router } from 'express';
import { login, register, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { emailValidator, passwordValidator } from '../utils/validators';
import { validateRequest } from '../middleware/validation';

const router = Router();

router.post('/register', [emailValidator, passwordValidator], validateRequest, register);
router.post('/login', [emailValidator, passwordValidator], validateRequest, login);
router.post('/forgot-password', [emailValidator], validateRequest, forgotPassword);
router.post('/reset-password', resetPassword);

export default router;