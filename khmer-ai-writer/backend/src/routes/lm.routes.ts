import { Router } from 'express';
import optionalAuth from '../middleware/optional-auth';
import { khmerLmController } from '../controllers/lm.controller';

const router = Router();

router.post('/suggest', optionalAuth, (req, res) => khmerLmController.suggest(req, res));

export default router;
