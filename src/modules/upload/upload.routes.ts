import { Router } from 'express';
import { uploadFile, uploadMiddleware, deleteFile } from './upload.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router: Router = Router();

router.post('/', protect, uploadMiddleware, uploadFile);
router.delete('/', protect, deleteFile);

export default router;
