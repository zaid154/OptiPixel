import './config/env.js';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*' }
});
app.set('io', io);

io.on('connection', (socket) => {
  socket.emit('connected', { status: 'ok', id: socket.id });
});

await connectDB();

httpServer.listen(PORT, async () => {
  console.log(`OptiPixel Server running on http://localhost:${PORT}`);
  
  // Standby Guard: Keep restored batches in PAUSED state so boot never hogs CPU/GPU/RAM
  try {
    const { activeBatches, persistFolderBatch } = await import('./services/folderBatch/folderBatchState.js');
    for (const [batchId, batch] of activeBatches.entries()) {
      if (batch && (batch.status === 'running' || batch.status === 'paused')) {
        batch.status = 'paused';
        batch.isPaused = true;
        persistFolderBatch(batch);
        console.log(`Batch [${batchId}] initialized in standby (paused).`);
      }
    }
  } catch (err) {
    console.warn('Batch standby check warning:', err.message);
  }
});

export { app, httpServer, io };
