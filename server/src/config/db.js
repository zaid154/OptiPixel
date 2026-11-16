import mongoose from 'mongoose';

export async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGO_URI || 'mongodb://localhost:27017/optipixel';
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('🍃 MongoDB connected successfully!');
    console.log(`📦 Database: ${conn.connection.name} (${conn.connection.host})`);
    return conn;
  } catch (err) {
    console.warn('⚠️ MongoDB connection warning (operating in offline fallback mode):', err.message);
    return null;
  }
}
