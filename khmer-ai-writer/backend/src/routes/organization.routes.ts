import { Router } from 'express';
import { createOrganization, getOrganization } from '../controllers/organization.controller';
import auth from '../middleware/auth';

const router = Router();

router.post('/', auth, createOrganization);
router.get('/:id', auth, getOrganization);

export default router;