import { parentPort } from 'worker_threads';
import {
  computePartialHash,
  computeFullHash,
  computeImagePerceptualData
} from '../services/duplicate/hashingService.js';
import { RawPixelService } from '../services/duplicate/rawPixelService.js';

if (parentPort) {
  parentPort.on('message', async (task) => {
    const { taskId, type, filePath, fileSize } = task;
    try {
      let result = null;
      if (type === 'partial_hash') {
        result = await computePartialHash(filePath, fileSize);
      } else if (type === 'full_hash') {
        result = await computeFullHash(filePath);
      } else if (type === 'perceptual_image') {
        result = await computeImagePerceptualData(filePath);
      } else if (type === 'raw_pixel') {
        result = await RawPixelService.computePixelHash(filePath);
      } else {
        throw new Error(`Unknown worker task type: ${type}`);
      }
      parentPort.postMessage({ taskId, success: true, result });
    } catch (err) {
      parentPort.postMessage({ taskId, success: false, error: err.message });
    }
  });
}
