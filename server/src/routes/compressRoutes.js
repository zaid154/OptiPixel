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

const batchUploadMiddleware = (req, res, next) => {
  upload.array('images', 100)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT')) {
        return res.status(400).json({
          error: 'Maximum 100 photos allowed per web ZIP archive. For full directories (10,000+ files), please use the Folder Batch tool!'
        });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
};

router.post('/batch', batchUploadMiddleware, CompressController.compressBatch);

export default router;
