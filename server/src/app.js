import express from 'express';
import cors from 'cors';
import compressRoutes from './routes/compressRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import folderBatchRoutes from './routes/folderBatchRoutes.js';
import duplicateRoutes from './routes/duplicateRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

app.use(cors({
  origin: '*',
  exposedHeaders: [
    'X-Original-Size',
    'X-Compressed-Size',
    'X-Saved-Percent',
    'X-Image-Width',
    'X-Image-Height',
    'X-Session-Image-Id',
    'Content-Disposition'
  ]
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    engines: {
      image: 'Sharp libvips',
      video: 'FFmpeg'
    },
    features: ['images', 'videos', 'batch', 'target-size', 'sse-progress', 'duplicate-finder'],
    timestamp: new Date().toISOString()
  });
});

app.use('/api/compress', compressRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/batch-folder', folderBatchRoutes);
app.use('/api/duplicates', duplicateRoutes);
app.use('/api/history', historyRoutes);

app.use('/api', notFound);
app.use(errorHandler);

export default app;
