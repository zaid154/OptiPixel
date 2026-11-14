import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import compressRoutes from './routes/compressRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import folderBatchRoutes from './routes/folderBatchRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend
app.use(cors({
  origin: '*',
  exposedHeaders: ['X-Original-Size', 'X-Compressed-Size', 'X-Saved-Percent', 'X-Image-Width', 'X-Image-Height', 'X-Session-Image-Id', 'Content-Disposition']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/compress', compressRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/batch-folder', folderBatchRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    engines: {
      image: 'Sharp libvips 8.15.3',
      video: 'FFmpeg 9.0.1'
    },
    features: ['images', 'videos', 'batch', 'target-size', 'sse-progress'],
    timestamp: new Date().toISOString()
  });
});

// Non-blocking MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/optipixel';
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000
})
  .then((conn) => {
    console.log('🍃 MongoDB connected successfully!');
    console.log(`📦 Connected Database: ${conn.connection.name} (${conn.connection.host})`);
  })
  .catch((err) => console.warn('⚠️ MongoDB connection warning (Operating in offline mode):', err.message));

app.listen(PORT, () => {
  console.log(`🚀 OptiPixel Server running on http://localhost:${PORT}`);
});
