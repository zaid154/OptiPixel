import mongoose from 'mongoose';
import dns from 'dns';

// Fix Windows Node.js SRV lookup issues for MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

export async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGO_URI || 'mongodb://localhost:27017/optipixel';

  const tryConnect = async () => {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000
      });
      console.log('🍃 MongoDB connected successfully!');
      console.log(`📦 Database: ${conn.connection.name} (${conn.connection.host})`);
      return conn;
    } catch (err) {
      console.warn('⚠️ MongoDB connection warning (will retry in 5s):', err.message);
      setTimeout(tryConnect, 5000);
      return null;
    }
  };

  return await tryConnect();
}
