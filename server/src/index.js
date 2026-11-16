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
  console.log(`🚀 OptiPixel Server running on http://localhost:${PORT}`);
  
  // Auto-resume any active running batch if server was restarted midway
  try {
    const { activeBatches } = await import('./services/folderBatch/folderBatchState.js');
    const { runBatchWorker } = await import('./services/folderBatch/folderBatchWorker.js');
    for (const [batchId, batch] of activeBatches.entries()) {
      if (batch && batch.status === 'running' && !batch.isCancelled) {
        console.log(`⚡ Auto-resuming batch [${batchId}] from ${batch.stats?.processed || 0}/${batch.stats?.totalFiles}`);
        runBatchWorker(batchId).catch((err) => console.error('Batch resume error:', err));
      }
    }
  } catch (err) {
    console.warn('Batch auto-resume check failed:', err.message);
  }
});

export { app, httpServer, io };
