import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  getUserAuditLogs,
  getResourceAuditLogs,
  getAllAuditLogs
} from '../controllers/audit.controller';

const router = Router();

router.get('/user', auth, getUserAuditLogs);
router.get('/resource/:resource_type/:resource_id', auth, getResourceAuditLogs);
router.get('/all', auth, getAllAuditLogs);

export default router;
