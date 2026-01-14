import { Router } from 'express';
import { mlController } from '../controllers/ml.controller';
import auth from '../middleware/auth';

const router = Router();

// Protect predictions; listing models is also behind auth to avoid leaking endpoints.
router.get('/models', auth, mlController.listModels.bind(mlController));
router.post('/predict', auth, mlController.predict.bind(mlController));

export default router;
