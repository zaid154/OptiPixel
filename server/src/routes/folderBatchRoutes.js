import express from 'express';
import { FolderBatchController } from '../controllers/folderBatchController.js';

const router = express.Router();

router.get('/browse', FolderBatchController.browseDirectory);
router.get('/check-dest', FolderBatchController.checkDestination);
router.post('/scan', FolderBatchController.scanDirectory);
router.post('/start', FolderBatchController.startBatch);
router.get('/progress/:batchId', FolderBatchController.streamProgress);
router.post('/pause/:batchId', FolderBatchController.pauseBatch);
router.post('/resume/:batchId', FolderBatchController.resumeBatch);
router.post('/cancel/:batchId', FolderBatchController.cancelBatch);
router.post('/retry/:batchId', FolderBatchController.retryFailed);
router.post('/copy-fallback/:batchId', FolderBatchController.copyFallback);
router.get('/active', FolderBatchController.getActive);

export default router;
