import { Router } from 'express';
import { createBilling, getBillingHistory } from '../controllers/billing.controller';
import auth from '../middleware/auth';

const router = Router();

router.post('/charge', auth, createBilling);
router.get('/', auth, getBillingHistory);

export default router;