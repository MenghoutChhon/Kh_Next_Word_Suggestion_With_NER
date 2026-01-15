import { Router } from 'express';
import authRoutes from './auth.routes';
import organizationRoutes from './organization.routes';
import teamRoutes from './team.routes';
import webhooksRoutes from './webhooks.routes';
import billingRoutes from './billing.routes';
import dashboardRoutes from './dashboard.routes';

// New service routes
import paymentRoutes from './payment.routes';
import apikeyRoutes from './apikey.routes';
import userRoutes from './user.routes';
import usageRoutes from './usage.routes';
import mfaRoutes from './mfa.routes';
import sessionRoutes from './session.routes';
import documentRoutes from './document.routes';
import auditRoutes from './audit.routes';
import mlRoutes from './ml.routes';
import lmRoutes from './lm.routes';
import nerRoutes from './ner.routes';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'Khmer AI Writer API',
    version: '1.0.0',
    ready: true
  });
});

router.use('/auth', authRoutes);
router.use('/orgs', organizationRoutes);
router.use('/teams', teamRoutes);
router.use('/team', teamRoutes); // Alias
router.use('/webhooks', webhooksRoutes);
router.use('/billing', billingRoutes);
router.use('/dashboard', dashboardRoutes);

// New service routes
router.use('/payment', paymentRoutes);
router.use('/apikey', apikeyRoutes);
router.use('/api-keys', apikeyRoutes); // Alias for frontend compatibility
router.use('/users', userRoutes);
router.use('/user', userRoutes); // Alias
router.use('/usage', usageRoutes);
router.use('/mfa', mfaRoutes);
router.use('/sessions', sessionRoutes);
router.use('/documents', documentRoutes);
router.use('/audit', auditRoutes);
router.use('/ml', mlRoutes);
router.use('/lm', lmRoutes);
router.use('/ner', nerRoutes);

export default router;
