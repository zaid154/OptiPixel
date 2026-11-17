import express from 'express';
import { DuplicateController } from '../controllers/duplicateController.js';
import { PriorityController } from '../controllers/priorityController.js';
import { MediaStreamController } from '../controllers/mediaStreamController.js';
import { OrganizerController } from '../controllers/organizerController.js';

const router = express.Router();

router.post('/scan', DuplicateController.startScan);
router.post('/stop', DuplicateController.stopScan);
router.post('/clear', DuplicateController.clearResults);
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
router.post('/pixel-diff', DuplicateController.getPixelDiff);
router.post('/pixel-compare', DuplicateController.getPixelCompare);
router.post('/route-file', DuplicateController.routeFile);

// Master Folder Priority & Smart Consolidation Routes
router.post('/priority/preview', PriorityController.previewPriority);
router.post('/priority/apply', PriorityController.applyPriority);
router.post('/priority/auto-all/preview', PriorityController.previewAutoAll);
router.post('/priority/auto-all/execute', PriorityController.executeAutoAll);
router.post('/consolidate/execute', PriorityController.executeConsolidation);
router.post('/consolidate/rollback', PriorityController.rollbackConsolidation);
router.get('/consolidate/history', PriorityController.getHistory);

// Whole-Library Smart Media Organizer Routes
router.post('/organize/preview', OrganizerController.planOrganize);
router.post('/organize/execute', OrganizerController.executeOrganize);

export default router;
