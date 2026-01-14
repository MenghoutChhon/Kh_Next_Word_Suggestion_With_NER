import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import auth from '../middleware/auth';

const router = Router();

/**
 * Payment Routes
 * All routes require authentication
 */

// Process payment for subscription upgrade (bind to preserve `this`)
router.post('/process', auth, paymentController.processPayment.bind(paymentController));

// Get billing history
router.get('/billing-history', auth, paymentController.getBillingHistory.bind(paymentController));

// Get current subscription
router.get('/subscription', auth, paymentController.getSubscription.bind(paymentController));

// Cancel subscription
router.post('/cancel-subscription', auth, paymentController.cancelSubscription.bind(paymentController));

// Upgrade tier
router.post('/upgrade-tier', auth, paymentController.upgradeTier.bind(paymentController));

// Get subscription plans and pricing
router.get('/plans', paymentController.getPlans.bind(paymentController));

export default router;
