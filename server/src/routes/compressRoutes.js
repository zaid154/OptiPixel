import express from 'express';
import multer from 'multer';
import { CompressController } from '../controllers/compressController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.post('/single', upload.single('image'), CompressController.compressSingle);
router.post('/target-size', upload.single('image'), CompressController.compressTargetSize);
router.post('/batch', upload.array('images', 50), CompressController.compressBatch);

export default router;
