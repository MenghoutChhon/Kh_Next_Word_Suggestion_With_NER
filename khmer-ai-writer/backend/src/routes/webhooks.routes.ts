import { Router } from 'express';
import { handleWebhook } from '../controllers/webhooks.controller';

const router = Router();

router.post('/', handleWebhook);

export default router;