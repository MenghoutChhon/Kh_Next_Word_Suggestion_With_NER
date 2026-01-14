import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  uploadDocument,
  getUserDocuments,
  getDocument,
  updateDocument,
  deleteDocument
} from '../controllers/document.controller';

const router = Router();

router.post('/', auth, uploadDocument);
router.get('/', auth, getUserDocuments);
router.get('/:id', auth, getDocument);
router.put('/:id', auth, updateDocument);
router.delete('/:id', auth, deleteDocument);

export default router;
