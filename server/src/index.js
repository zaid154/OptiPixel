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
});

export { app, httpServer, io };
