import express from 'express';
import { DuplicateController } from '../controllers/duplicateController.js';
import { MediaStreamController } from '../controllers/mediaStreamController.js';

const router = express.Router();

router.post('/scan', DuplicateController.startScan);
router.post('/stop', DuplicateController.stopScan);
router.post('/recluster', DuplicateController.recluster);
router.get('/groups', DuplicateController.getGroups);
router.post('/selection', DuplicateController.updateSelection);
router.get('/progress', DuplicateController.getProgress);
router.get('/progress-stream', DuplicateController.streamProgress);
router.post('/action', DuplicateController.takeAction);
router.post('/restore', DuplicateController.restore);
router.get('/history', DuplicateController.getHistory);
router.get('/thumbnail', MediaStreamController.getThumbnail);
router.get('/stream', MediaStreamController.getMediaStream);
router.get('/pixel-diff', DuplicateController.getPixelDiff);
router.get('/pixel-compare', DuplicateController.getPixelCompare);

export default router;
