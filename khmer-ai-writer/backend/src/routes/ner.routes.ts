import { Router } from 'express';
import optionalAuth from '../middleware/optional-auth';
import { khmerNerController } from '../controllers/ner.controller';

const router = Router();

router.post('/extract', optionalAuth, (req, res) => khmerNerController.extract(req, res));

export default router;
